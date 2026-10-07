/* ============================================================
   职责：AI 提示词模板 + 6 大 AI 功能（摘要 / 扩展 / 自测题 / 闪卡 / 导图 / 概念辨析）
   ============================================================ */

/* ============ 提示词模板 ============ */
const AI_PROMPTS = {
  // 摘要
  summary: `请对下面笔记总结，要求：用 3-5 条以 "- " 开头的要点；保留数学公式（$...$）；中文简洁；不输出开场白。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  // 扩展
  expand: `请对下面笔记扩展，要求：找 3-5 个核心概念，每个给 2-3 句深入说明；保留数学公式；Markdown 格式，标题用 ###；直接输出扩展内容。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  // 自测题
  quiz: `基于下面笔记出 5 道自测题，要求：概念理解/应用/辨析题混合；每题 4 个选项和正确答案；附解析；Markdown 格式。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  // 闪卡（要求返回严格 JSON）
  cards: `基于下面笔记生成闪卡，只输出严格 JSON 数组，格式：[{"front":"...","back":"..."},...]，5-8 张，考察理解不要简单填空。注意：如果内容包含数学公式，公式中的反斜杠必须转义为双反斜杠。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  // 思维导图（返回 JSON 树）
  mind: `把下面笔记整理成思维导图 JSON，只输出严格 JSON，格式：{"label":"根","children":[{"label":"分支","children":[{"label":"叶子","children":[]}]}]}，≤3 层，每节点≤12 字。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  // 概念辨析矩阵
  compare: `你是一位优秀的辅导老师。请仔细阅读下面这篇笔记，找出其中容易被混淆、具有对比价值的 3-4 个核心概念（或词汇、公式、人物）。\n请严格按照以下 Markdown 格式输出，不要有任何开场白或总结：\n\n### 📊 概念对比矩阵\n\n| 概念名称 | 核心定义 | 关键区别 | 典型例子 |\n| :--- | :--- | :--- | :--- |\n| [概念A] | [一句话解释] | [它与其它概念的不同点] | [具体例子] |\n| [概念B] | [一句话解释] | [它与其它概念的不同点] | [具体例子] |\n\n### 💡 记忆口诀\n[用一句话或一个顺口溜，帮助记忆这几个概念的区别]\n\n笔记内容：\n\`\`\`\n{CONTENT}\n\`\`\``,
  // 通用聊天系统提示
  chat: `你是通用型 AI 小助手，擅长学习辅导、编程、写作、翻译、日常问答。\n\n【当前笔记上下文（可能为空或不相关）】\n标题：《{TITLE}》\n\`\`\`\n{CONTENT}\n\`\`\`\n\n【回答规则】\n1. 问题与笔记相关时，优先基于笔记回答，保留数学公式\n2. 问题与笔记无关时，直接正常回答，不要强行关联笔记\n3. Markdown 格式，简洁准确；公式用 LaTeX\n4. 不确定时坦诚说明，不要编造`
};

/* ============ AI 摘要 ============ */
async function aiSummary(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }
  const m = openModal('AI 摘要', '<div class="muted">AI 正在阅读…</div>');
  const b = $('.modal-body', m);
  b.className = 'modal-body preview';
  try {
    let full = '';
    for await (const x of llmStream([{ role: 'user', content: AI_PROMPTS.summary.replace('{CONTENT}', c.slice(0, 6000)) }])) {
      full += x;
      renderMDWithMath(b, full);
      b.scrollTop = b.scrollHeight;
    }
  } catch (e) {
    b.innerHTML = `<div style="color:#7f8da3">⚠️ 请求未成功：${esc(e.message)}</div>`;
  }
}

/* ============ AI 扩展 ============ */
async function aiExpand(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }
  const m = openModal('AI 扩展', '<div class="muted">生成中…</div>');
  const b = $('.modal-body', m);
  b.className = 'modal-body preview';
  try {
    let full = '';
    for await (const x of llmStream([{ role: 'user', content: AI_PROMPTS.expand.replace('{CONTENT}', c.slice(0, 6000)) }])) {
      full += x;
      renderMDWithMath(b, full);
      b.scrollTop = b.scrollHeight;
    }
  } catch (e) {
    b.innerHTML = `<div style="color:#7f8da3">⚠️ 请求未成功：${esc(e.message)}</div>`;
  }
}

/* ============ AI 自测题 ============ */
async function aiQuiz(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }
  const m = openModal('AI 自测题', '<div class="muted">出题中…</div>');
  const b = $('.modal-body', m);
  b.className = 'modal-body preview';
  try {
    let full = '';
    for await (const x of llmStream([{ role: 'user', content: AI_PROMPTS.quiz.replace('{CONTENT}', c.slice(0, 6000)) }])) {
      full += x;
      renderMDWithMath(b, full);
      b.scrollTop = b.scrollHeight;
    }
  } catch (e) {
    b.innerHTML = `<div style="color:#7f8da3">⚠️ 请求未成功：${esc(e.message)}</div>`;
  }
}

/* ============ AI 生成闪卡 ============ */
async function aiGenCards(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }
  toast('AI 生成闪卡中…');
  try {
    const raw = await llmComplete([{ role: 'user', content: AI_PROMPTS.cards.replace('{CONTENT}', c.slice(0, 6000)) }]);
    // 从响应中提取 JSON 数组
    const mm = raw.match(/\[[\s\S]*\]/);
    if (!mm) throw new Error('格式异常');
    let arr;
    // 尝试三种解析策略，兼容常见的 JSON 转义问题
    try {
      arr = JSON.parse(mm[0]);
    } catch (parseErr) {
      let fixedStr = mm[0].replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
      try { arr = JSON.parse(fixedStr); }
      catch (e2) {
        fixedStr = mm[0].replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"');
        arr = JSON.parse(fixedStr);
      }
    }
    let n = 0;
    arr.forEach(it => {
      if (it.front && it.back) {
        S.cards.push({
          id: uid(), noteId: note.id, notebookId: S.activeNotebookId,
          front: String(it.front), back: String(it.back),
          D: 5, S: 0, reps: 0, lapses: 0,
          due: Date.now(), createdAt: Date.now(), lastReview: Date.now()
        });
        n++;
      }
    });
    saveAll();
    toast(`生成 ${n} 张闪卡 🎴`);
    renderTopStats();
  } catch (e) {
    toast('失败：' + e.message, true);
  }
}

/* ============ AI 生成思维导图 ============ */
async function aiMind(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }
  toast('AI 生成导图中…');
  try {
    const raw = await llmComplete([{ role: 'user', content: AI_PROMPTS.mind.replace('{CONTENT}', c.slice(0, 6000)) }]);
    const mm = raw.match(/\{[\s\S]*\}/);
    if (!mm) throw new Error('格式异常');
    note._aiMind = JSON.parse(mm[0]);
    saveAll();
    currentView = 'mind';
    syncNav();
    renderMain();
  } catch (e) {
    toast('失败：' + e.message, true);
  }
}

/* ============ AI 概念辨析 ============ */
async function aiCompare() {
  const notes = S.notebooks.flatMap(nb => nb.notes).filter(n => n.content && n.content.trim());
  if (notes.length === 0) { toast('没有可用的笔记内容', true); return; }
  const targetNote = getActiveNote() || notes[0];
  const text = targetNote.content.trim();
  const box = $('#compareResult');
  box.innerHTML = `<div style="text-align:center;padding:40px 0;color:#5eead4">⏳ AI 正在分析概念关系，请稍候…</div>`;
  try {
    let full = '';
    for await (const chunk of llmStream([{ role: 'user', content: AI_PROMPTS.compare.replace('{CONTENT}', text.slice(0, 6000)) }])) {
      full += chunk;
      renderMDWithMath(box, full);
    }
  } catch (e) {
    box.innerHTML = `<div style="color:#fb7185;padding:20px">⚠️ 生成失败：${esc(e.message)}</div>`;
  }
}
