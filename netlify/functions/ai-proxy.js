// Netlify Function：前端请求 → 转发到 AI 服务商（默认通义千问兼容模式）
// 需要在 Netlify 后台配置环境变量：
//   AI_API_KEY   —— 必填，AI 服务商 API Key
//   AI_BASE_URL  —— 可选，默认 https://dashscope.aliyuncs.com/compatible-mode/v1
//   AI_MODEL     —— 可选，默认 qwen-turbo
// Netlify Function：AI 代理 + 百度语音（ASR / TTS）
// 环境变量：
//   AI_API_KEY / AI_BASE_URL / AI_MODEL —— AI 对话
//   BAIDU_API_KEY / BAIDU_SECRET_KEY —— 百度语音

let _baiduToken = null;
let _baiduTokenExpire = 0;

// 获取百度 access_token（自动缓存）
async function getBaiduToken() {
  if (_baiduToken && Date.now() < _baiduTokenExpire) return _baiduToken;
  const apiKey = Netlify.env.get('BAIDU_API_KEY');
  const secretKey = Netlify.env.get('BAIDU_SECRET_KEY');
  if (!apiKey || !secretKey) throw new Error('未配置百度语音 API Key');
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (!data.access_token) throw new Error('获取百度 token 失败：' + JSON.stringify(data));
  _baiduToken = data.access_token;
  _baiduTokenExpire = Date.now() + (data.expires_in - 3600) * 1000;
  return _baiduToken;
}

// 百度语音识别（传入 base64 WAV）
async function handleASR(body) {
  const token = await getBaiduToken();
  const res = await fetch('https://vop.baidu.com/server_api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'wav',
      rate: 16000,
      channel: 1,
      cuid: 'ai-workbench',
      token: token,
      speech: body.audio,
      len: body.len
    })
  });
  return await res.json();
}

// 百度语音合成（返回 MP3 二进制）
async function handleTTS(body) {
  const token = await getBaiduToken();
  const params = new URLSearchParams({
    tex: body.text,
    tok: token,
    cuid: 'ai-workbench',
    ctp: '1',
    lan: 'zh',
    spd: String(body.spd || 5),
    pit: String(body.pit || 5),
    vol: String(body.vol || 5),
    per: String(body.per || 0)
  });
  const res = await fetch('https://tsn.baidu.com/text2audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('audio')) {
    return { audio: await res.arrayBuffer(), isAudio: true };
  }
  const err = await res.json();
  throw new Error('TTS 失败：' + JSON.stringify(err));
}

export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // ===== 语音识别 / 合成 =====
  if (action === 'asr' || action === 'tts') {
    let body;
    try { body = await request.json(); }
    catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    try {
      if (action === 'asr') {
        const r = await handleASR(body);
        return new Response(JSON.stringify(r), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      } else {
        const r = await handleTTS(body);
        return new Response(r.audio, {
          status: 200, headers: { 'Content-Type': 'audio/mp3' }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ===== AI 对话（原有逻辑） =====
  let payload;
  try { payload = await request.json(); }
  catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  const messages = payload.messages || [];
  const model = payload.model || Netlify.env.get('AI_MODEL') || 'qwen-turbo';

const apiKey = Netlify.env.get('AI_API_KEY');
  const baseUrl = Netlify.env.get('AI_BASE_URL');
  
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: 'Server missing AI_BASE_URL' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server missing AI_API_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: true })
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed: ' + e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (!upstream.ok) {
    return new Response(await upstream.text(), {
      status: upstream.status, headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};