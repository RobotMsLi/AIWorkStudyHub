
// Netlify Function：AI 代理 + 腾讯云语音识别 + 拍题解析
// 环境变量：
//   AI_API_KEY / AI_BASE_URL / AI_MODEL —— AI 对话
//   TENCENT_SECRET_ID / TENCENT_SECRET_KEY —— 腾讯云 ASR
//   VISION_MODEL —— 可选，默认 qwen-vl-plus

import crypto from 'crypto';

/* ============================================================
   腾讯云签名
   ============================================================ */
function sha256Hex(str) { return crypto.createHash('sha256').update(str, 'utf8').digest('hex'); }
function hmacSha256(key, str) { return crypto.createHmac('sha256', key).update(str, 'utf8').digest(); }
function hmacSha256Hex(key, str) { return crypto.createHmac('sha256', key).update(str, 'utf8').digest('hex'); }

function tencentSign(secretId, secretKey, payloadStr, host, service) {
  const algorithm = 'TC3-HMAC-SHA256';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalRequest = [
    'POST', '/', '',
    `content-type:application/json; charset=utf-8\nhost:${host}\n`,
    'content-type;host',
    sha256Hex(payloadStr)
  ].join('\n');
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [algorithm, timestamp, credentialScope, sha256Hex(canonicalRequest)].join('\n');
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
  const payloadStr = JSON.stringify({
    ProjectId: 0,
    SubServiceType: 2,
    EngSerViceType: '16k_zh',
    SourceType: 1,
    VoiceFormat: 'wav',
    Data: body.audio,
    DataLen: body.len
  });
  const authorization = tencentSign(secretId, secretKey, payloadStr, host, 'asr');
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
    return { err_no: 0, result: [data.Response.Result], err_msg: 'success' };
  }
  return {
    err_no: -1,
    err_msg: (data.Response && data.Response.Error && data.Response.Error.Message) || '识别失败',
    result: []
  };
}

/* ============================================================
   SSE 转发通用函数
   ============================================================ */
async function forwardSSE(payload) {
  const apiKey = Netlify.env.get('AI_API_KEY');
  const baseUrl = (Netlify.env.get('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
  if (!apiKey) throw new Error('Server missing AI_API_KEY');

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(err, { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
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

  let body;
  try { body = await request.json(); }
  catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // ===== 语音识别 =====
  if (action === 'asr') {
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

  // ===== 拍题解析 =====
  if (action === 'solve') {
    try {
      const visionModel = Netlify.env.get('VISION_MODEL') || 'qwen-vl-plus';
      const prompt = body.prompt || (
        '你是一位耐心、严谨的辅导老师。请仔细识别图片中的题目，然后：\n\n' +
        '1. **题目大意**：用一句话概括这道题\n' +
        '2. **已知条件**：列出题目给出的关键条件\n' +
        '3. **解题思路**：说明解题的整体思路\n' +
        '4. **详细步骤**：分步骤给出完整解题过程\n' +
        '5. **最终答案**：明确给出答案\n' +
        '6. **考点总结**：这道题涉及哪些知识点\n\n' +
        '要求：\n' +
        '- 使用 Markdown 格式\n' +
        '- 数学公式用 LaTeX\n' +
        '- 步骤要清晰，每一步都要有解释\n' +
        '- 如果图片中没有题目，请如实说明'
      );
      return await forwardSSE({
        model: visionModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: body.image } }
          ]
        }],
        stream: true
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // ===== AI 对话 =====
  const model = body.model || Netlify.env.get('AI_MODEL') || 'qwen-turbo';
  try {
    return await forwardSSE({
      model,
      messages: body.messages || [],
      stream: true
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }
};
