// Netlify Function：前端请求 → 转发到 AI 服务商（默认通义千问兼容模式）
// 需要在 Netlify 后台配置环境变量：
//   AI_API_KEY   —— 必填，AI 服务商 API Key
//   AI_BASE_URL  —— 可选，默认 https://dashscope.aliyuncs.com/compatible-mode/v1
//   AI_MODEL     —— 可选，默认 qwen-turbo

export default async (request, context) => {
  // 仅允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 解析请求体
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 从请求中取出 messages 和 model
  const messages = payload.messages || [];
  const model = payload.model || Netlify.env.get('AI_MODEL') || 'qwen-turbo';

  // 读取环境变量
  const apiKey = Netlify.env.get('AI_API_KEY');
  const baseUrl = (Netlify.env.get('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server missing AI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 转发到上游
  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, stream: true })
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed: ' + e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 上游错误
  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 透传 SSE 流
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
