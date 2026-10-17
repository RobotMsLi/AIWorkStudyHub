
// Netlify Function：AI 代理 + 腾讯云语音识别（ASR）
// 环境变量：
//   AI_API_KEY / AI_BASE_URL / AI_MODEL —— AI 对话
//   TENCENT_SECRET_ID / TENCENT_SECRET_KEY —— 腾讯云 ASR

import crypto from 'crypto';

/* ============================================================
   腾讯云 TC3-HMAC-SHA256 签名
   ============================================================ */
function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}
function hmacSha256(key, str) {
  return crypto.createHmac('sha256', key).update(str, 'utf8').digest();
}
function hmacSha256Hex(key, str) {
  return crypto.createHmac('sha256', key).update(str, 'utf8').digest('hex');
}

function tencentSign(secretId, secretKey, payloadStr, host, service) {
  const algorithm = 'TC3-HMAC-SHA256';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const canonicalRequest = [
    'POST',
    '/',
    '',
    `content-type:application/json; charset=utf-8\nhost:${host}\n`,
    'content-type;host',
    sha256Hex(payloadStr)
  ].join('\n');

  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  const secretDate = hmacSha256('TC3' + secretKey, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256Hex(secretSigning, stringToSign);

  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
}

/* ============================================================
   腾讯云一句话识别
   ============================================================ */
async function handleASR(body) {
  const secretId = Netlify.env.get('TENCENT_SECRET_ID');
  const secretKey = Netlify.env.get('TENCENT_SECRET_KEY');
  if (!secretId || !secretKey) throw new Error('未配置腾讯云密钥');

  const host = 'asr.tencentcloudapi.com';
  const service = 'asr';
  const payload = {
    ProjectId: 0,
    SubServiceType: 2,
    EngSerViceType: '16k_zh',
    SourceType: 1,
    VoiceFormat: 'wav',
    Data: body.audio,
    DataLen: body.len
  };
  const payloadStr = JSON.stringify(payload);

  const authorization = tencentSign(secretId, secretKey, payloadStr, host, service);
  const timestamp = Math.floor(Date.now() / 1000);

  const res = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': host,
      'Authorization': authorization,
      'X-TC-Action': 'SentenceRecognition',
      'X-TC-Version': '2019-06-14',
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': 'ap-shanghai'
    },
    body: payloadStr
  });

  const data = await res.json();
  if (data.Response && data.Response.Result) {
    return {
      err_no: 0,
      result: [data.Response.Result],
      err_msg: 'success'
    };
  }
  return {
    err_no: -1,
    err_msg: (data.Response && data.Response.Error && data.Response.Error.Message) || '识别失败',
    result: []
  };
}

/* ============================================================
   主入口
   ============================================================ */
export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // ===== 语音识别 =====
  if (action === 'asr') {
    let body;
    try { body = await request.json(); }
    catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    try {
      const r = await handleASR(body);
      return new Response(JSON.stringify(r), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ===== AI 对话 =====
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
  const baseUrl = (Netlify.env.get('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');

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
