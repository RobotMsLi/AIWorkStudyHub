/* ============================================================
   职责：右侧 AI 聊天面板的渲染与发送逻辑
   ============================================================ */

// 渲染聊天记录
function renderChat() {
  const box = $('#aiChat');
  if (!box) return;
  if (!S.chat.length) {
    box.innerHTML = `
      <div class="chat-hint">
        <div class="ch-icon">✦</div>
        <p>我是你的 AI 小助手</p>
        <span>使用 ${esc(S.aiConfig.model || 'qwen-turbo')}<br>学习、编程、写作、闲聊都可以问我</span>
      </div>
    `;
    return;
  }
  box.innerHTML = S.chat.map(m => `
    <div class="msg ${m.role}" data-id="${m.id || ''}">
      <div class="bubble">${m.role === 'ai' ? renderMD(m.text) : esc(m.text).replace(/\n/g, '<br>')}</div>
      <div class="msg-time">${fmtTime(m.t)}</div>
    </div>
  `).join('');

  // 渲染 AI 消息里的数学公式
  if (window.renderMathInElement) {
    $$('.msg.ai .bubble', box).forEach(b => {
      try {
        renderMathInElement(b, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
      } catch (e) {}
    });
  }
  box.scrollTop = box.scrollHeight;
}

// 发送聊天消息
async function chatSend(msg) {
  msg = (msg || '').trim();
  if (!msg) return;

  const note = getActiveNote();
  // 先把用户消息推进去
  S.chat.push({ role: 'user', text: msg, t: Date.now(), id: uid() });
  renderChat();

  // 占位 AI 消息
  const aiMsg = { role: 'ai', text: '', t: Date.now(), id: uid() };
  S.chat.push(aiMsg);
  const box = $('#aiChat');
  const el = box.querySelector(`.msg[data-id="${aiMsg.id}"] .bubble`);
  if (el) el.classList.add('streaming');

  try {
    // 系统提示 + 最近 8 条历史
    const sys = AI_PROMPTS.chat
      .replace('{TITLE}', note?.title || '（无）')
      .replace('{CONTENT}', (note?.content || '（无）').slice(0, 4000));
    const hist = S.chat.slice(-8).filter(m => m !== aiMsg).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));

    // 流式接收
    let full = '';
    for await (const c of llmStream([{ role: 'system', content: sys }, ...hist, { role: 'user', content: msg }])) {
      full += c;
      aiMsg.text = full;
      if (el) {
        el.innerHTML = renderMD(full);
        if (window.renderMathInElement) {
          try { renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
        }
        box.scrollTop = box.scrollHeight;
      }
    }
    if (!full) aiMsg.text = '（无响应）';
  } catch (e) {
    aiMsg.text = '⚠️ 请求未成功：' + e.message;
    if (el) el.innerHTML = renderMD(aiMsg.text);
  } finally {
    if (el) el.classList.remove('streaming');
    // 只保留最近 120 条
    if (S.chat.length > 120) S.chat = S.chat.slice(-120);
    saveAll();
    renderChat();
  }
}
