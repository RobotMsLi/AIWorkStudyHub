
/* ============================================================
   02-ai.js
   职责：AI 提示词模板 + 所有 AI 功能
   ============================================================ */

/* ============ 提示词模板 ============ */
const AI_PROMPTS = {
  summary: `请对下面笔记总结，要求：用 3-5 条以 "- " 开头的要点；保留数学公式（$...$）；中文简洁；不输出开场白。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  expand: `请对下面笔记扩展，要求：找 3-5 个核心概念，每个给 2-3 句深入说明；保留数学公式；Markdown 格式，标题用 ###；直接输出扩展内容。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  quiz: `基于下面笔记出 5 道自测题，要求：概念理解/应用/辨析题混合；每题 4 个选项和正确答案；附解析；Markdown 格式。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  cards: `基于下面笔记生成闪卡，只输出严格 JSON 数组，格式：[{"front":"...","back":"..."},...]，5-8 张，考察理解不要简单填空。注意：如果内容包含数学公式，公式中的反斜杠必须转义为双反斜杠。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  mind: `把下面笔记整理成思维导图 JSON，只输出严格 JSON，格式：{"label":"根","children":[{"label":"分支","children":[{"label":"叶子","children":[]}]}]}，≤3 层，每节点≤12 字。\n\n笔记：\n\`\`\`\n{CONTENT}\n\`\`\``,
  compare: `你是一位优秀的辅导老师。请仔细阅读下面这篇笔记，找出其中容易被混淆、具有对比价值的 3-4 个核心概念（或词汇、公式、人物）。\n请严格按照以下 Markdown 格式输出，不要有任何开场白或总结：\n\n### 📊 概念对比矩阵\n\n| 概念名称 | 核心定义 | 关键区别 | 典型例子 |\n| :--- | :--- | :--- | :--- |\n| [概念A] | [一句话解释] | [它与其它概念的不同点] | [具体例子] |\n| [概念B] | [一句话解释] | [它与其它概念的不同点] | [具体例子] |\n\n### 💡 记忆口诀\n[用一句话或一个顺口溜，帮助记忆这几个概念的区别]\n\n笔记内容：\n\`\`\`\n{CONTENT}\n\`\`\``,
  chat: `你是通用型 AI 小助手，擅长学习辅导、编程、写作、翻译、日常问答。\n\n【当前笔记上下文（可能为空或不相关）】\n标题：《{TITLE}》\n\`\`\`\n{CONTENT}\n\`\`\`\n\n【回答规则】\n1. 问题与笔记相关时，优先基于笔记回答，保留数学公式\n2. 问题与笔记无关时，直接正常回答，不要强行关联笔记\n3. Markdown 格式，简洁准确；公式用 LaTeX\n4. 不确定时坦诚说明，不要编造`,

  // 结构化 JSON 自测题（用于错题本功能）
  quizJSON: '基于下面笔记出 5 道自测题。只输出严格 JSON 数组，格式如下：\n' +
    '[\n' +
    '  {\n' +
    '    "question": "题干内容",\n' +
    '    "options": ["A选项", "B选项", "C选项", "D选项"],\n' +
    '    "answer": 0,\n' +
    '    "explain": "解析内容"\n' +
    '  }\n' +
    ']\n\n' +
    '注意：\n' +
    '1. answer 是正确选项的数字索引（0 到 3），不是字母\n' +
    '2. 如果内容包含数学公式，公式中的反斜杠必须转义为双反斜杠\n' +
    '3. 不要有任何开场白或解释，只输出 JSON 数组\n\n' +
    '笔记：\n' +
    '{CONTENT}\n',

  // 费曼学习法：AI 扮学生开场
  feynmanStart: `你是一个完全不懂"{TOPIC}"的小白学生，正在听一位老师讲解这个概念。你的任务是：
1. 认真听老师讲解
2. 提出 2-3 个"我还不明白"的问题，例如：
   - "老师，我没听懂，能用更简单的话解释一下吗？"
   - "能举个生活中的例子吗？"
   - "这个概念和我之前学的 XX 有什么区别？"
3. 不要假装懂，要真实地暴露疑惑，逼老师把知识讲得更清楚

现在请先说一句开场白，然后开始听讲。`,

  // 费曼学习法：AI 给评估
  feynmanReview: `你是一位严格但有耐心的学习教练。现在你要对学生的费曼讲解给出反馈。

【学生要讲的主题】
{TOPIC}

【学生讲解的内容】
{EXPLAIN}

【你在讲解中提出的问题】
{QUESTIONS}

【学生的补充回答】
{ANSWERS}

请按以下 Markdown 格式输出评估报告（不要开场白）：

### 📊 费曼讲解评估

| 维度 | 评分（1-5） | 点评 |
| :--- | :--- | :--- |
| 语言清晰度 | X | [一句话] |
| 概念准确性 | X | [一句话] |
| 举例恰当性 | X | [一句话] |
| 逻辑连贯性 | X | [一句话] |

### ✅ 讲得好的地方
- [要点1]
- [要点2]

### ⚠️ 需要改进的地方
- [要点1]
- [要点2]

### 💡 下一步学习建议
[2-3 句具体建议]`,

  // 学习周报
  weeklyReport: `你是一位学习数据分析师。请根据下面的学习数据，生成一份【学习周报】，风格温暖、专业、有洞察力。

【数据】
{STATS}

要求（严格按以下 Markdown 格式，不要开场白）：
## 📅 本周学习周报

### 📊 数据概览
- 学习时长：X 分钟
- 新增笔记：X 篇
- 闪卡复习：X 张
- 连续学习：X 天

### 🌟 亮点
[2-3 条本周做得好的地方，要有具体数据支撑]

### ⚠️ 需要关注
[1-2 条可以改进的地方，语气温和]

### 💡 下周建议
[2-3 条具体的、可执行的建议]`,

  // AI 复习计划（Tool Calling 简化版）
  studyPlan: '你是一位学习教练。请根据学生的学习数据（错题本、闪卡情况、笔记），生成一份针对性的复习计划。\n\n' +
    '【学习数据】\n' +
    '{STATS}\n\n' +
    '请只输出严格 JSON，格式如下（不要开场白）：\n' +
    '{\n' +
    '  "summary": "一句话总结当前学习状态",\n' +
    '  "topics": [\n' +
    '    {\n' +
    '      "title": "薄弱知识点名称",\n' +
    '      "reason": "为什么它是薄弱点（引用错题数据）",\n' +
    '      "advice": "具体的学习建议",\n' +
    '      "cards": [\n' +
    '        { "front": "闪卡正面（问题）", "back": "闪卡背面（答案）" }\n' +
    '      ]\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    '要求：\n' +
    '1. topics 最多 3 个，按优先级排序\n' +
    '2. 每个 topic 生成 2-3 张闪卡\n' +
    '3. 闪卡要针对错题涉及的具体知识点\n' +
    '4. 只输出 JSON，不要任何开场白或总结'
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

/* ============ AI 自测题（结构化卡片版） ============ */
async function aiQuiz(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }

  const m = openModal('AI 自测题', '<div style="text-align:center;padding:40px 0;color:#5eead4;font-size:13px">⏳ AI 正在出题，请稍候…</div>');
  const b = $('.modal-body', m);

  try {
    const raw = await llmComplete([{ role: 'user', content: AI_PROMPTS.quizJSON.replace('{CONTENT}', c.slice(0, 6000)) }]);
    const mm = raw.match(/\[[\s\S]*\]/);
    if (!mm) throw new Error('AI 返回格式异常');

    let arr;
    try { arr = JSON.parse(mm[0]); }
    catch (e1) {
      try { arr = JSON.parse(mm[0].replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')); }
      catch (e2) { arr = JSON.parse(mm[0].replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"')); }
    }

    if (!Array.isArray(arr) || !arr.length) throw new Error('题目列表为空');

    b.innerHTML = '';
    renderQuizCards(b, arr, note);
  } catch (e) {
    b.innerHTML = `<div style="color:#fb7185;padding:20px">⚠️ 出题失败：${esc(e.message)}</div>`;
  }
}

/* ============ 自测题卡片渲染 ============ */
function renderQuizCards(container, questions, note) {
  let score = 0;
  let answered = 0;
  const total = questions.length;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;
                margin-bottom:16px;padding:10px 14px;border-radius:10px;
                background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.2);
                font-size:12.5px;color:#7f8da3">
      <span>📝 进度：<b id="quizProgress" style="color:#5eead4">0 / ${total}</b></span>
      <span>🎯 得分：<b id="quizScore" style="color:#5eead4">0</b> / ${total}</span>
    </div>
    <div id="quizList"></div>
  `;

  const list = container.querySelector('#quizList');

  questions.forEach((q, qi) => {
    const qEl = document.createElement('div');
    qEl.style.cssText = 'margin-bottom:18px;padding:16px 18px;border-radius:12px;background:rgba(148,163,184,.05);border:1px solid rgba(148,163,184,.15);';

    const opts = (q.options || []).map((opt, oi) => `
      <button class="quiz-opt" data-q="${qi}" data-o="${oi}" style="
        display:block;width:100%;text-align:left;margin-top:8px;
        padding:10px 14px;border-radius:9px;font-size:13px;
        cursor:pointer;transition:.18s;font-family:inherit;
        background:rgba(17,24,39,.72);
        border:1px solid rgba(148,163,184,.2);
        color:#c3cede;
      ">
        <span style="color:#7f8da3;font-weight:600;margin-right:8px">
          ${String.fromCharCode(65 + oi)}.
        </span>${esc(opt)}
      </button>
    `).join('');

    qEl.innerHTML = `
      <div style="font-size:13.5px;font-weight:600;color:#dbe7f5;line-height:1.7;margin-bottom:4px">
        ${qi + 1}. ${esc(q.question)}
      </div>
      <div class="quiz-options">${opts}</div>
      <div class="quiz-result" style="display:none;margin-top:12px;padding:10px 14px;border-radius:8px;font-size:12.5px;line-height:1.85"></div>
    `;
    list.appendChild(qEl);
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.quiz-opt');
    if (!btn) return;

    const qi = +btn.dataset.q;
    const oi = +btn.dataset.o;
    const q = questions[qi];
    const qEl = list.children[qi];
    if (qEl.dataset.answered === '1') return;

    qEl.dataset.answered = '1';
    answered++;

    const opts = qEl.querySelectorAll('.quiz-opt');
    const correct = +q.answer;

    opts.forEach((opt, idx) => {
      opt.style.cursor = 'default';
      if (idx === correct) {
        opt.style.background = 'rgba(45,212,191,.2)';
        opt.style.borderColor = 'rgba(45,212,191,.6)';
        opt.style.color = '#5eead4';
      } else if (idx === oi) {
        opt.style.background = 'rgba(244,63,94,.15)';
        opt.style.borderColor = 'rgba(244,63,94,.5)';
        opt.style.color = '#fb7185';
      } else {
        opt.style.opacity = '.45';
      }
    });

    const resultEl = qEl.querySelector('.quiz-result');
    resultEl.style.display = 'block';
    const isCorrect = oi === correct;

    if (isCorrect) {
      score++;
      resultEl.style.background = 'rgba(45,212,191,.08)';
      resultEl.style.borderLeft = '3px solid #2dd4bf';
      resultEl.style.color = '#7fe3d4';
      resultEl.innerHTML = `<b>✅ 答对了！</b>${q.explain ? '<br>解析：' + esc(q.explain) : ''}`;
    } else {
      S.wrongQuestions.push({
        id: uid(),
        question: q.question,
        options: q.options || [],
        correctAnswer: correct,
        chosenAnswer: oi,
        explain: q.explain || '',
        noteId: note?.id || null,
        noteTitle: note?.title || '未命名',
        createdAt: Date.now()
      });
      saveAll();

      resultEl.style.background = 'rgba(244,63,94,.08)';
      resultEl.style.borderLeft = '3px solid #fb7185';
      resultEl.style.color = '#fb7185';
      resultEl.innerHTML = `
        <b>❌ 答错了，已收入错题本</b><br>
        正确答案：${String.fromCharCode(65 + correct)}<br>
        ${q.explain ? '解析：' + esc(q.explain) : ''}
      `;
    }

    container.querySelector('#quizProgress').textContent = `${answered} / ${total}`;
    container.querySelector('#quizScore').textContent = score;

    if (answered === total) {
      const finEl = document.createElement('div');
      finEl.style.cssText = 'margin-top:16px;padding:16px;border-radius:10px;text-align:center;background:linear-gradient(135deg,rgba(45,212,191,.12),rgba(56,189,248,.08));border:1px solid rgba(45,212,191,.3);font-size:13.5px;color:#5eead4;';
      finEl.innerHTML = `🎉 全部答完！最终得分：<b>${score} / ${total}</b>`;
      container.appendChild(finEl);
    }
  });
}

/* ============ AI 生成闪卡 ============ */
async function aiGenCards(note) {
  const c = (note.content || '').trim();
  if (!c) { toast('内容为空', true); return; }
  toast('AI 生成闪卡中…');
  try {
    const raw = await llmComplete([{ role: 'user', content: AI_PROMPTS.cards.replace('{CONTENT}', c.slice(0, 6000)) }]);
    const mm = raw.match(/\[[\s\S]*\]/);
    if (!mm) throw new Error('格式异常');
    let arr;
    try { arr = JSON.parse(mm[0]); }
    catch (parseErr) {
      let fixedStr = mm[0].replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
      try { arr = JSON.parse(fixedStr); }
      catch (e2) { fixedStr = mm[0].replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"'); arr = JSON.parse(fixedStr); }
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
  box.innerHTML = '<div style="text-align:center;padding:40px 0;color:#5eead4">⏳ AI 正在分析概念关系，请稍候…</div>';
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

/* ============ 费曼学习法 ============ */
let _feynmanSession = null;

async function aiFeynman(note) {
  const topic = (note.title || '').trim() || '这段笔记的主题';
  const content = (note.content || '').trim();
  if (!content) { toast('笔记内容为空', true); return; }

  _feynmanSession = { note, topic, explain: '', questions: '', answers: '' };

  const m = openModal('🎓 费曼学习法', `
    <div id="feynmanStage1">
      <p style="margin-bottom:12px;color:#7f8da3;font-size:12.5px;line-height:1.9">
        费曼学习法：把你懂的知识讲给别人听。<br>
        现在 AI 会扮演一个"什么都不懂的学生"，请你用简单的话给它讲清楚
        <b style="color:#5eead4">《${esc(topic)}》</b>。
      </p>
      <p style="margin-bottom:8px;font-size:12px;color:#5eead4">📝 你的讲解：</p>
      <textarea id="feynmanInput" rows="6" style="
        width:100%;border-radius:10px;padding:10px 12px;font-size:13px;
        background:rgba(17,24,39,.72);color:#e6edf7;outline:none;
        border:1px solid rgba(148,163,184,.2);resize:vertical;font-family:inherit;
      " placeholder="用自己的话讲清楚这个概念……"></textarea>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary" id="feynmanNext1">讲完了 →</button>
      </div>
    </div>
    <div id="feynmanStage2" style="display:none"></div>
    <div id="feynmanStage3" style="display:none"></div>
  `);

  const input = $('#feynmanInput', m);
  input.focus();

  $('#feynmanNext1', m).onclick = async () => {
    const explain = input.value.trim();
    if (!explain) { toast('请先写下你的讲解', true); return; }
    _feynmanSession.explain = explain;

    $('#feynmanStage1', m).style.display = 'none';
    const s2 = $('#feynmanStage2', m);
    s2.style.display = 'block';
    s2.innerHTML = '<div style="color:#5eead4;font-size:13px">⏳ AI 学生正在思考……</div>';

    try {
      let full = '';
      const prompt = AI_PROMPTS.feynmanStart.replace('{TOPIC}', topic) + `\n\n【老师的讲解】\n${explain}`;
      for await (const x of llmStream([{ role: 'user', content: prompt }])) {
        full += x;
        s2.innerHTML = `
          <p style="margin-bottom:8px;font-size:12px;color:#fbbf24">🙋 AI 学生提问：</p>
          <div class="preview" style="font-size:13px;line-height:1.9;color:#c3cede">${renderMD(full)}</div>
        `;
      }
      _feynmanSession.questions = full;

      s2.innerHTML = `
        <p style="margin-bottom:8px;font-size:12px;color:#fbbf24">🙋 AI 学生提问：</p>
        <div class="preview" style="font-size:13px;line-height:1.9;color:#c3cede">${renderMD(full)}</div>
        <p style="margin:14px 0 8px;font-size:12px;color:#5eead4">✍️ 你的补充回答：</p>
        <textarea id="feynmanAnswer" rows="5" style="
          width:100%;border-radius:10px;padding:10px 12px;font-size:13px;
          background:rgba(17,24,39,.72);color:#e6edf7;outline:none;
          border:1px solid rgba(148,163,184,.2);resize:vertical;font-family:inherit;
        " placeholder="回答 AI 学生的问题……"></textarea>
        <div style="margin-top:12px">
          <button class="btn primary" id="feynmanNext2">提交回答 → 获取评估</button>
        </div>
      `;

      $('#feynmanNext2', m).onclick = async () => {
        const ans = $('#feynmanAnswer', m).value.trim();
        if (!ans) { toast('请先回答 AI 学生的问题', true); return; }
        _feynmanSession.answers = ans;

        $('#feynmanStage2', m).style.display = 'none';
        const s3 = $('#feynmanStage3', m);
        s3.style.display = 'block';
        s3.className = 'preview';
        s3.innerHTML = '<div style="color:#5eead4;font-size:13px">⏳ AI 教练正在评估……</div>';

        try {
          const reviewPrompt = AI_PROMPTS.feynmanReview
            .replace('{TOPIC}', topic)
            .replace('{EXPLAIN}', explain)
            .replace('{QUESTIONS}', _feynmanSession.questions)
            .replace('{ANSWERS}', ans);
          let review = '';
          for await (const x of llmStream([{ role: 'user', content: reviewPrompt }])) {
            review += x;
            renderMDWithMath(s3, review);
          }
        } catch (e) {
          s3.innerHTML = `<div style="color:#fb7185">⚠️ 评估失败：${esc(e.message)}</div>`;
        }
      };
    } catch (e) {
      s2.innerHTML = `<div style="color:#fb7185">⚠️ 请求失败：${esc(e.message)}</div>`;
    }
  };
}

/* ============ 学习周报 ============ */
async function aiWeeklyReport() {
  const days = [];
  const today = new Date();
  let totalMs = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const ms = S.days[k] || 0;
    totalMs += ms;
    days.push({ date: k, ms });
  }
  const totalCards = S.cards.length;
  const reviewedCards = S.cards.filter(c => (c.reps || 0) > 0).length;
  const totalNotes = S.notebooks.reduce((a, nb) => a + nb.notes.length, 0);

  const statsText = `- 过去 7 天总学习时长：${Math.round(totalMs / 60000)} 分钟
- 每天的时长（分钟）：${days.map(d => `${d.date.slice(5)}: ${Math.round(d.ms / 60000)}`).join('，')}
- 笔记本数量：${S.notebooks.length}
- 笔记总数：${totalNotes}
- 闪卡总数：${totalCards}
- 已复习过的闪卡：${reviewedCards}
- 当前连续学习天数：${S.streak}`;

  const m = openModal('📅 学习周报', '<div class="muted">AI 正在分析你的学习数据…</div>');
  const b = $('.modal-body', m);
  b.className = 'modal-body preview';

  try {
    const prompt = AI_PROMPTS.weeklyReport.replace('{STATS}', statsText);
    let full = '';
    for await (const x of llmStream([{ role: 'user', content: prompt }])) {
      full += x;
      renderMDWithMath(b, full);
      b.scrollTop = b.scrollHeight;
    }
  } catch (e) {
    b.innerHTML = `<div style="color:#7f8da3">⚠️ 请求未成功：${esc(e.message)}</div>`;
  }
}

/* ============ AI 错题分析 ============ */
async function aiWrongAnalysis() {
  if (!S.wrongQuestions.length) { toast('错题本为空', true); return; }

  const list = S.wrongQuestions.slice(-20).map((q, i) => {
    const opts = (q.options || []).map((o, idx) => `  ${String.fromCharCode(65 + idx)}. ${o}`).join('\n');
    return `题目${i + 1}：${q.question}\n${opts}\n正确答案：${String.fromCharCode(65 + q.correctAnswer)}\n我的选择：${String.fromCharCode(65 + q.chosenAnswer)}\n来源笔记：《${q.noteTitle || '未命名'}》`;
  }).join('\n\n');

  const m = openModal('🧠 AI 错题分析', '<div class="muted">AI 正在分析你的薄弱知识点…</div>');
  const b = $('.modal-body', m);
  b.className = 'modal-body preview';

  const prompt = `你是一位耐心、专业的学习分析师。下面是学生最近的错题记录，请分析他的薄弱知识点并给出学习建议。

【错题记录】
${list}

请严格按以下 Markdown 格式输出，不要开场白：

## 📊 薄弱知识点诊断

### 🎯 主要薄弱点
- [薄弱点1]：具体说明，引用错题作为证据
- [薄弱点2]：...

### 💡 学习建议
1. [具体可执行的建议]
2. ...

### 📚 推荐复习顺序
1. 先复习《[章节名]》，因为……
2. 再复习《[章节名]》，因为……`;

  try {
    let full = '';
    for await (const x of llmStream([{ role: 'user', content: prompt }])) {
      full += x;
      renderMDWithMath(b, full);
      b.scrollTop = b.scrollHeight;
    }
  } catch (e) {
    b.innerHTML = `<div style="color:#7f8da3">⚠️ 请求未成功：${esc(e.message)}</div>`;
  }
}

/* ============ AI 复习计划 ============ */
async function aiStudyPlan() {
  // 收集错题数据（最近 15 道）
  const wrongList = S.wrongQuestions.slice(-15).map((q, i) => {
    const opts = (q.options || []).map((o, idx) =>
      `  ${String.fromCharCode(65 + idx)}. ${o}`
    ).join('\n');
    return `【错题${i + 1}】${q.question}\n${opts}\n正确答案：${String.fromCharCode(65 + q.correctAnswer)}\n我的选择：${String.fromCharCode(65 + q.chosenAnswer)}\n来源笔记：《${q.noteTitle || '未命名'}》`;
  }).join('\n\n');

  const cardStats = {
    total: S.cards.length,
    due: dueCards().length,
    reviewed: S.cards.filter(c => (c.reps || 0) > 0).length
  };

  const statsText = `【错题本】共 ${S.wrongQuestions.length} 道错题
${wrongList || '（暂无错题）'}

【闪卡数据】总计 ${cardStats.total} 张 · 待复习 ${cardStats.due} 张 · 已复习 ${cardStats.reviewed} 张

【笔记数据】共 ${S.notebooks.reduce((a, nb) => a + nb.notes.length, 0)} 篇笔记`;

  // 打开弹窗
  const m = openModal('🤖 AI 复习计划', `
    <div style="text-align:center;padding:40px 0">
      <div style="color:#5eead4;font-size:13px">⏳ AI 正在分析你的学习数据…</div>
      <div style="color:#7f8da3;font-size:11.5px;margin-top:8px">（预计 5-15 秒）</div>
    </div>
  `);
  const b = $('.modal-body', m);

  try {
    const raw = await llmComplete([{ role: 'user', content: AI_PROMPTS.studyPlan.replace('{STATS}', statsText) }]);
    const mm = raw.match(/\{[\s\S]*\}/);
    if (!mm) throw new Error('AI 返回格式异常');

    let plan;
    try { plan = JSON.parse(mm[0]); }
    catch (e1) {
      try { plan = JSON.parse(mm[0].replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')); }
      catch (e2) { plan = JSON.parse(mm[0].replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"')); }
    }

    if (!plan || !Array.isArray(plan.topics)) throw new Error('计划格式异常');

    renderStudyPlan(b, plan);
  } catch (e) {
    b.innerHTML = `<div style="color:#fb7185;padding:20px">⚠️ 生成失败：${esc(e.message)}</div>`;
  }
}

function renderStudyPlan(container, plan) {
  // 顶部总结
  let html = `
    <div style="margin-bottom:16px;padding:12px 16px;border-radius:10px;
                background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.25);
                font-size:13px;color:#7fe3d4;line-height:1.8">
      📊 ${esc(plan.summary || '')}
    </div>
  `;

  // 每个薄弱点
  (plan.topics || []).forEach((t, i) => {
    html += `
      <div style="margin-bottom:16px;padding:14px 16px;border-radius:12px;
                  background:rgba(148,163,184,.05);border:1px solid rgba(148,163,184,.15)">
        <div style="font-size:14px;font-weight:600;color:#5eead4;margin-bottom:8px">
          ${i + 1}. ${esc(t.title || '')}
        </div>
        <div style="font-size:12.5px;color:#b7c3d6;margin-bottom:6px;line-height:1.8">
          <b style="color:#fbbf24">💡 原因：</b>${esc(t.reason || '')}
        </div>
        <div style="font-size:12.5px;color:#b7c3d6;margin-bottom:10px;line-height:1.8">
          <b style="color:#38bdf8">📚 建议：</b>${esc(t.advice || '')}
        </div>
        <div style="font-size:12px;color:#5eead4;margin-bottom:6px">推荐闪卡：</div>
        ${(t.cards || []).map(c => `
          <div style="padding:8px 12px;margin-bottom:6px;border-radius:8px;
                      background:rgba(0,0,0,.2);font-size:12px;color:#c3cede;line-height:1.7">
            <div><b style="color:#7f8da3">Q:</b> ${esc(c.front || '')}</div>
            <div style="color:#5eead4;margin-top:4px"><b style="color:#7f8da3">A:</b> ${esc(c.back || '')}</div>
          </div>
        `).join('')}
      </div>
    `;
  });

  // 底部按钮
  html += `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button class="btn primary" id="planExecute">✅ 一键创建所有闪卡</button>
      <button class="btn ghost" id="planClose">关闭</button>
    </div>
  `;

  container.innerHTML = html;

  // 一键创建所有闪卡
  container.querySelector('#planExecute').onclick = () => {
    let count = 0;
    (plan.topics || []).forEach(t => {
      (t.cards || []).forEach(c => {
        if (c.front && c.back) {
          S.cards.push({
            id: uid(),
            noteId: null,
            notebookId: S.activeNotebookId,
            front: String(c.front),
            back: String(c.back),
            D: 5, S: 0, reps: 0, lapses: 0,
            due: Date.now(),
            createdAt: Date.now(),
            lastReview: Date.now()
          });
          count++;
        }
      });
    });
    saveAll();
    toast(`已创建 ${count} 张闪卡 🎴`);
    renderTopStats();
    container.closest('.modal-backdrop').remove();
  };

  // 关闭
  container.querySelector('#planClose').onclick = () => {
    container.closest('.modal-backdrop').remove();
  };
}
