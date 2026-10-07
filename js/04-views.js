/* ============================================================
   职责：数据增删改 / 侧栏渲染 / 顶栏状态 / 路由 / 全部视图渲染
        （笔记、闪卡、思维导图、概念辨析、RAG、统计、设置）
   ============================================================ */

/* ============ 数据操作 ============ */
// 保存到本地并触发云同步
function saveAll() { saveLocal(); schedulePush(); }

// 新建笔记本
function createNotebook() {
  const name = prompt('笔记本名称：', '新笔记本');
  if (name === null) return;
  const nb = { id: uid(), name: name.trim() || '未命名', createdAt: Date.now(), notes: [] };
  S.notebooks.unshift(nb);
  S.activeNotebookId = nb.id;
  S.activeNoteId = null;
  currentView = 'notes';
  saveAll(); renderAll(); syncNav();
  toast(`已创建「${nb.name}」`);
}

// 删除笔记本（连带笔记和闪卡）
function deleteNotebook(id) {
  const nb = S.notebooks.find(n => n.id === id);
  if (!nb) return;
  if (!confirm(`删除「${nb.name}」及 ${nb.notes.length} 篇笔记？`)) return;
  const ids = nb.notes.map(n => n.id);
  S.notebooks = S.notebooks.filter(n => n.id !== id);
  S.cards = S.cards.filter(c => !ids.includes(c.noteId));
  normalize(); saveAll(); renderAll();
  toast('已删除');
}

// 重命名笔记本
function renameNotebook(id, v) {
  const nb = S.notebooks.find(n => n.id === id);
  if (nb) { nb.name = v; saveAll(); renderAll(); toast('已重命名'); }
}

// 新建笔记
function createNote(nbId) {
  const nb = S.notebooks.find(n => n.id === nbId);
  if (!nb) return;
  const n = { id: uid(), title: '', content: '', createdAt: Date.now(), updatedAt: Date.now() };
  nb.notes.unshift(n);
  S.activeNotebookId = nbId;
  S.activeNoteId = n.id;
  currentView = 'notes';
  saveAll(); renderAll(); syncNav();
  setTimeout(() => $('#noteTitle')?.focus(), 60);
}

// 删除笔记（连带闪卡）
function deleteNote(nbId, nid) {
  const nb = S.notebooks.find(n => n.id === nbId);
  if (!nb) return;
  const nt = nb.notes.find(n => n.id === nid);
  if (!confirm(`删除「${nt?.title || '未命名'}」？`)) return;
  nb.notes = nb.notes.filter(n => n.id !== nid);
  if (S.activeNoteId === nid) S.activeNoteId = nb.notes[0]?.id || null;
  S.cards = S.cards.filter(c => c.noteId !== nid);
  saveAll(); renderAll();
  toast('已删除');
}

// 重命名笔记
function renameNote(nbId, nid, v) {
  const nb = S.notebooks.find(n => n.id === nbId);
  if (!nb) return;
  const nt = nb.notes.find(n => n.id === nid);
  if (!nt) return;
  nt.title = v;
  nt.updatedAt = Date.now();
  saveAll(); renderAll();
  toast('已重命名');
}

// 把编辑器里的内容刷到数据里（切换视图前调用）
function flushEditor() {
  const te = $('#noteTitle'), be = $('#noteBody'), note = getActiveNote();
  if (te && be && note) {
    note.title = te.value;
    note.content = be.value;
    note.updatedAt = Date.now();
    saveLocal();
    schedulePush();
  }
}

/* ============ 侧栏 ============ */
function renderNotebooks() {
  const wrap = $('#notebookList');
  if (!wrap) return;
  wrap.innerHTML = '';

  if (!S.notebooks.length) {
    wrap.innerHTML = '<div class="empty-mini">点击 + 新建</div>';
    return;
  }

  S.notebooks.forEach(nb => {
    const ex = nb.id === S.activeNotebookId; // 是否展开
    const el = document.createElement('div');
    el.className = 'nb-item';
    el.innerHTML = `
      <div class="nb-row ${ex ? 'open' : ''}">
        <span class="nb-caret">${ex ? '▾' : '▸'}</span>
        <span class="nb-name" title="${esc(nb.name)}（双击重命名）">${esc(nb.name)}</span>
        <span class="nb-count">${nb.notes.length}</span>
        <button class="nb-edit" title="重命名">✎</button>
        <button class="nb-del" title="删除">✕</button>
      </div>
      <div class="nb-notes" style="display:${ex ? 'block' : 'none'}"></div>
    `;

    // 点击笔记本行 → 切换激活
    el.querySelector('.nb-row').addEventListener('click', e => {
      if (e.target.classList.contains('nb-del') || e.target.classList.contains('nb-edit')) return;
      if (S.activeNotebookId === nb.id) {
        if (!nb.notes.some(n => n.id === S.activeNoteId)) S.activeNoteId = nb.notes[0]?.id || null;
      } else {
        S.activeNotebookId = nb.id;
        S.activeNoteId = nb.notes[0]?.id || null;
      }
      currentView = 'notes';
      saveAll(); renderAll(); syncNav();
    });

    // 双击重命名
    const nameEl = el.querySelector('.nb-name');
    nameEl.ondblclick = e => { e.stopPropagation(); startInlineEdit(nameEl, nb.name, v => renameNotebook(nb.id, v)); };
    // 铅笔按钮
    el.querySelector('.nb-edit').onclick = e => { e.stopPropagation(); startInlineEdit(el.querySelector('.nb-name'), nb.name, v => renameNotebook(nb.id, v)); };
    // 删除按钮
    el.querySelector('.nb-del').onclick = e => { e.stopPropagation(); deleteNotebook(nb.id); };

    // 展开笔记列表
    const list = el.querySelector('.nb-notes');
    if (ex) {
      nb.notes.forEach(nt => {
        const n = document.createElement('div');
        n.className = 'note-item' + (nt.id === S.activeNoteId ? ' active' : '');
        n.setAttribute('data-id', nt.id);
        n.innerHTML = `
          <span class="note-title" title="${esc(nt.title || '未命名')}（双击重命名）">${esc(nt.title || '未命名笔记')}</span>
          <button class="note-edit" title="重命名">✎</button>
          <button class="note-del" title="删除">✕</button>
        `;
        n.onclick = e => {
          if (e.target.classList.contains('note-del') || e.target.classList.contains('note-edit')) return;
          S.activeNoteId = nt.id;
          currentView = 'notes';
          saveAll(); renderAll(); syncNav();
        };
        const tEl = n.querySelector('.note-title');
        tEl.ondblclick = e => { e.stopPropagation(); startInlineEdit(tEl, nt.title || '未命名', v => renameNote(nb.id, nt.id, v)); };
        n.querySelector('.note-edit').onclick = e => { e.stopPropagation(); startInlineEdit(n.querySelector('.note-title'), nt.title || '未命名', v => renameNote(nb.id, nt.id, v)); };
        n.querySelector('.note-del').onclick = e => { e.stopPropagation(); deleteNote(nb.id, nt.id); };
        list.appendChild(n);
      });
      // 新建笔记按钮
      const add = document.createElement('button');
      add.className = 'note-add';
      add.textContent = '+ 新建笔记';
      add.onclick = e => { e.stopPropagation(); createNote(nb.id); };
      list.appendChild(add);
    }

    wrap.appendChild(el);
  });
}

// 同步导航高亮
function syncNav() { $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === currentView)); }

/* ============ 顶部状态 ============ */
function renderTopStats() {
  // 今日学习时长
  const t = dayKey();
  const ms = S.days[t] || 0;
  const todayEl = $('#todayTime');
  if (todayEl) todayEl.textContent = ms < 60000 ? `${Math.floor(ms / 1000)} 秒` : `${Math.floor(ms / 60000)} 分钟`;

  // 待复习数
  const dueEl = $('#dueCount');
  if (dueEl) dueEl.textContent = dueCards().length;

  // AI 状态
  const aiStatusEl = $('#aiStatus'); if (aiStatusEl) aiStatusEl.classList.add('on');
  const aiDotEl = $('#aiDot'); if (aiDotEl) aiDotEl.classList.remove('off');
  const st = $('#aiStatusText'); if (st) st.textContent = '在线 AI';
  const ml = $('#aiModelLabel'); if (ml) ml.textContent = S.aiConfig.model || 'qwen-turbo';

  // 云同步状态
  const cb = $('#cloudBtn'), ct = $('#cloudText');
  if (cb && ct) {
    cb.className = 'cloud-btn';
    if (!sb) {
      ct.textContent = '云端未连接';
    } else if (!currentUser) {
      ct.textContent = '未登录';
    } else if (cloudStatus === 'error') {
      cb.classList.add('error'); ct.textContent = '同步失败';
    } else if (cloudStatus === 'syncing') {
      cb.classList.add('syncing'); ct.textContent = '同步中…';
    } else {
      cb.classList.add('on');
      ct.textContent = '云端在线';
    }
  }
}

// 时钟
function startClock() {
  const tick = () => {
    const d = new Date();
    const ct = $('#clockTime'), cd = $('#clockDate');
    if (ct) ct.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    if (cd) cd.textContent = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  tick();
  setInterval(tick, 1000);
}

// 跨天时更新连续学习天数
function checkStreak() {
  const t = dayKey();
  if (S.lastDay !== t) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.streak = S.lastDay === dayKey(y) ? (S.streak + 1) : 1;
    S.lastDay = t;
    saveLocal();
  }
}

// 计时器：每秒累计学习时长，每 20s 保存
function startTimer() {
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const t = dayKey();
    S.days[t] = (S.days[t] || 0) + 1000;
    if (t !== S.lastDay) checkStreak();
    renderTopStats();
  }, 1000);
  setInterval(() => saveLocal(), 20000);
}

/* ============ 路由 ============ */
function renderAll() {
  normalize();
  try { renderNotebooks(); } catch (e) { console.error('renderNotebooks 失败:', e); }
  try { renderMain(); } catch (e) { console.error('renderMain 失败:', e); }
  try { renderTopStats(); } catch (e) { console.error('renderTopStats 失败:', e); }
}
function renderMain() {
  const map = {
    notes: renderNotesView, flash: renderFlashView, mind: renderMindView,
    compare: renderCompareView, rag: renderRagView, stats: renderStatsView, settings: renderSettingsView
  };
  (map[currentView] || renderNotesView)();
}

/* ============ 笔记视图 ============ */
function renderNotesView() {
  const main = $('#main');
  try {
    const nb = getActiveNotebook();
    if (!nb) {
      main.innerHTML = `<div class="empty-state"><div class="es-icon">📚</div><h3>还没有笔记本</h3><button class="btn primary" id="esNewNb">+ 新建</button></div>`;
      $('#esNewNb').onclick = createNotebook;
      return;
    }
    const note = nb.notes.find(n => n.id === S.activeNoteId);
    if (!note) {
      main.innerHTML = `<div class="empty-state"><div class="es-icon">📝</div><h3>${esc(nb.name)}</h3><button class="btn primary" id="esNewNote">+ 新建笔记</button></div>`;
      $('#esNewNote').onclick = () => createNote(nb.id);
      return;
    }

    main.innerHTML = `
      <div class="editor">
        <div class="editor-toolbar">
          <div class="crumb">
            <span>${esc(nb.name)}</span><span class="sep">/</span>
            <span class="cur">${esc(note.title || '未命名')}</span>
          </div>
          <div class="tool-actions">
            <span class="save-badge" id="saveBadge">已保存</span>
            <button class="chip ai-active" data-ai="summary">✦ 摘要</button>
            <button class="chip" data-ai="expand">⇢ 扩展</button>
            <button class="chip" data-ai="quiz">? 自测题</button>
            <button class="chip" data-ai="mind">◈ 导图</button>
            <button class="chip" data-ai="cards">▣ 闪卡</button>
            <button class="chip danger" data-act="del">🗑 删除</button>
          </div>
        </div>
        <div class="tabs">
          <div class="tab active" data-tab="edit">编辑</div>
          <div class="tab" data-tab="preview">预览</div>
        </div>
        <input id="noteTitle" class="note-title-input" placeholder="无标题（左侧双击可重命名）" value="${esc(note.title)}">
        <textarea id="noteBody" class="note-body" placeholder="支持 Markdown 与 LaTeX 公式">${esc(note.content)}</textarea>
        <div id="notePreview" class="preview" style="display:none"></div>
      </div>
    `;

    const te = $('#noteTitle'), be = $('#noteBody'), pe = $('#notePreview');
    let timer = null;

    // 输入 → 600ms 防抖保存
    const sched = () => {
      $('#saveBadge').textContent = '编辑中…';
      $('#saveBadge').classList.add('editing');
      clearTimeout(timer);
      timer = setTimeout(() => {
        note.title = te.value;
        note.content = be.value;
        note.updatedAt = Date.now();
        saveAll();
        $('#saveBadge').textContent = '已保存';
        $('#saveBadge').classList.remove('editing');
        const it = document.querySelector(`.note-item[data-id="${note.id}"] .note-title`);
        if (it) it.textContent = note.title || '未命名笔记';
        const cr = document.querySelector('.crumb .cur');
        if (cr) cr.textContent = note.title || '未命名笔记';
      }, 600);
    };
    te.oninput = sched;
    be.oninput = sched;

    // 编辑/预览切换
    $$('.tab', main).forEach(tab => tab.onclick = () => {
      $$('.tab', main).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'preview') {
        note.content = be.value;
        renderMDWithMath(pe, note.content || '（空）');
        be.style.display = 'none';
        pe.style.display = 'block';
      } else {
        be.style.display = 'block';
        pe.style.display = 'none';
      }
    });

    // AI 工具按钮
    $$('[data-ai]', main).forEach(btn => btn.onclick = async () => {
      note.title = te.value;
      note.content = be.value;
      note.updatedAt = Date.now();
      saveAll();
      const t = btn.dataset.ai;
      if (t === 'summary') await aiSummary(note);
      else if (t === 'expand') await aiExpand(note);
      else if (t === 'quiz') await aiQuiz(note);
      else if (t === 'mind') await aiMind(note);
      else if (t === 'cards') await aiGenCards(note);
    });

    // 删除
    main.querySelector('[data-act="del"]').onclick = () => deleteNote(nb.id, note.id);
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><h3>页面渲染出错</h3><p>${esc(err.message)}</p><button class="btn primary" onclick="localStorage.clear();location.reload()">清空本地数据并刷新</button></div>`;
  }
}

/* ============ 闪卡视图 ============ */
function renderFlashView() {
  const main = $('#main'), cards = S.cards, due = dueCards();
  if (reviewing) {
    main.innerHTML = `<div class="flash-review" id="flashReview"></div>`;
    renderReviewCard();
    return;
  }
  const learned = cards.filter(c => (c.reps || 0) > 0).length;
  const avgS = cards.length ? (cards.reduce((a, c) => a + (c.S || 0), 0) / cards.length).toFixed(1) : '0';

  main.innerHTML = `
    <div class="view-head">
      <h2>闪卡池 <span style="font-size:11px;color:#7f8da3;font-weight:400">FSRS-4.5</span></h2>
      <div class="vh-actions">
        <button class="btn ghost" id="genCards">从当前笔记生成</button>
        <button class="btn primary" id="startReview">开始复习 (${due.length})</button>
      </div>
    </div>
    <div class="card-stats">
      <div><b>${cards.length}</b><span>全部</span></div>
      <div><b>${due.length}</b><span>待复习</span></div>
      <div><b>${learned}</b><span>已复习</span></div>
      <div><b>${avgS}</b><span>平均稳定度</span></div>
    </div>
    <div class="card-list">
      ${cards.length ? cards.map(c => `
        <div class="card-row">
          <div class="cr-main">
            <div class="cr-front" title="${esc(c.front)}">${esc(trunc(c.front, 58))}</div>
            <div class="cr-meta">答案：${esc(trunc(c.back, 20))} · D=${(c.D || 5).toFixed(1)} · S=${(c.S || 0).toFixed(1)}天 · ${fmtDate(c.due)}</div>
          </div>
          <button class="cr-del" data-id="${c.id}">✕</button>
        </div>
      `).join('') : '<div class="empty-mini">还没有闪卡</div>'}
    </div>
  `;

  // 从当前笔记生成
  $('#genCards').onclick = async () => {
    flushEditor();
    const n = getActiveNote();
    if (!n) { toast('请先选择笔记', true); return; }
    await aiGenCards(n);
    renderFlashView();
  };
  // 开始复习
  $('#startReview').onclick = () => {
    reviewQueue = dueCards();
    if (!reviewQueue.length) { toast('没有到期闪卡', true); return; }
    reviewIdx = 0;
    reviewing = true;
    renderFlashView();
  };
  // 删除闪卡
  $$('.cr-del', main).forEach(b => b.onclick = () => {
    S.cards = S.cards.filter(c => c.id !== b.dataset.id);
    saveAll(); renderFlashView(); renderTopStats();
    toast('已删除');
  });
}

// 复习卡片
function renderReviewCard() {
  const el = $('#flashReview');
  if (reviewIdx >= reviewQueue.length) {
    reviewing = false;
    toast('完成 🎉');
    renderFlashView();
    renderTopStats();
    return;
  }
  const card = reviewQueue[reviewIdx];
  el.innerHTML = `
    <div class="rv-progress">${reviewIdx + 1} / ${reviewQueue.length} · S=${(card.S || 0).toFixed(1)}天</div>
    <div class="rv-card" id="rvCard">
      <div class="rv-front">${esc(card.front)}</div>
      <div class="rv-back" style="display:none">
        <div class="rv-label">答 案</div>
        <div class="rv-answer">${esc(card.back)}</div>
      </div>
    </div>
    <div class="rv-actions" id="rvActions">
      <button class="btn primary" id="showAns">显示答案</button>
    </div>
  `;
  $('#showAns').onclick = () => {
    $('#rvCard').querySelector('.rv-back').style.display = 'block';
    const a = $('#rvActions');
    a.innerHTML = `
      <button class="btn danger" data-g="1">忘记</button>
      <button class="btn ghost" data-g="2">模糊</button>
      <button class="btn primary" data-g="3">记住了</button>
      <button class="btn ghost" data-g="4">太简单</button>
    `;
    $$('button', a).forEach(b => b.onclick = () => {
      Object.assign(card, fsrsUpdate(card, +b.dataset.g));
      saveAll();
      reviewIdx++;
      renderReviewCard();
    });
  };
}

/* ============ 思维导图 ============ */
// 无 AI 时本地兜底：根据标题/关键词生成简单树
function buildMindLocal(note) {
  const text = note.content || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const root = { label: note.title || '未命名', children: [] };
  const isHead = l => /^(#{1,6}\s+|[一二三四五六七八九十]+[、.]|\d+[、.]|第[一二三四五六七八九十]+[章节])/.test(l);
  const heads = lines.filter(isHead);

  if (heads.length >= 2) {
    heads.forEach(h => {
      const idx = lines.indexOf(h);
      const after = lines.slice(idx + 1, idx + 4).filter(l => !isHead(l));
      root.children.push({
        label: h.replace(/^#+\s*/, ''),
        children: after.slice(0, 3).map(a => ({ label: trunc(a.replace(/^[-•*]\s*/, ''), 14), children: [] }))
      });
    });
  } else {
    const ks = keywords(text, 5), ss = splitSentences(text);
    if (ks.length) ks.forEach(k => {
      const h = ss.filter(s => s.includes(k)).slice(0, 2).map(s => ({ label: trunc(s, 14), children: [] }));
      root.children.push({ label: k, children: h });
    });
    else ss.slice(0, 5).forEach(s => root.children.push({ label: trunc(s, 16), children: [] }));
  }
  return root;
}

function renderMindView() {
  const main = $('#main'), note = getActiveNote();
  if (!note) {
    main.innerHTML = `<div class="view-head"><h2>思维导图</h2></div><div class="empty-state"><div class="es-icon">🧠</div><h3>请先选择笔记</h3></div>`;
    return;
  }
  const root = note._aiMind || buildMindLocal(note);
  main.innerHTML = `
    <div class="view-head">
      <h2>思维导图 · ${esc(note.title || '未命名')} ${note._aiMind ? '<span style="font-size:11px;color:#5eead4">(AI)</span>' : ''}</h2>
      <div class="vh-actions">
        <button class="btn ghost" id="aiMindBtn">AI 重新生成</button>
        <button class="btn ghost" id="refreshMind">重置</button>
      </div>
    </div>
    <div class="mind-wrap"><svg id="mindSvg"></svg></div>
  `;
  drawMind($('#mindSvg'), root);
  $('#refreshMind').onclick = () => { delete note._aiMind; saveAll(); renderMindView(); };
  $('#aiMindBtn').onclick = async () => { await aiMind(note); renderMindView(); };
}

// 用 SVG 画简单的树形思维导图
function drawMind(svg, root) {
  const NH = 36, GY = 16, GX = 215, NW = 175;
  let cur = 0;
  const nodes = [], links = [];
  // 第一次遍历：给每个节点分配坐标
  (function walk(n, d) {
    n.depth = d;
    n.children = n.children || [];
    if (!n.children.length) { n.y = cur; cur += NH + GY; }
    else {
      n.children.forEach(c => walk(c, d + 1));
      n.y = (n.children[0].y + n.children[n.children.length - 1].y) / 2;
    }
    n.x = d * GX;
    nodes.push(n);
    n.children.forEach(c => links.push([n, c]));
  })(root, 0);

  const maxD = Math.max(...nodes.map(n => n.depth));
  const w = (maxD + 1) * GX + 40, h = Math.max(cur, 120);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.style.width = w + 'px'; svg.style.height = h + 'px';

  // 连线
  let html = '';
  links.forEach(([a, b]) => {
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, mx = (x1 + x2) / 2;
    html += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="rgba(45,212,191,.35)" stroke-width="1.6"/>`;
  });
  // 节点
  nodes.forEach(n => {
    const isR = n.depth === 0;
    const fill = isR ? 'url(#gR)' : (n.depth === 1 ? 'rgba(45,212,191,.15)' : 'rgba(148,163,184,.10)');
    const stroke = isR ? 'rgba(45,212,191,.85)' : (n.depth === 1 ? 'rgba(45,212,191,.4)' : 'rgba(148,163,184,.22)');
    const color = isR ? '#04202b' : '#dbe7f5';
    const w2 = isR ? 700 : (n.depth === 1 ? 600 : 400);
    html += `<g><rect x="${n.x}" y="${n.y}" rx="10" ry="10" width="${NW}" height="${NH}" fill="${fill}" stroke="${stroke}"/><text x="${n.x + 12}" y="${n.y + NH / 2 + 5}" fill="${color}" font-size="12.5" font-weight="${w2}" font-family="inherit">${esc(trunc(n.label, 13))}</text></g>`;
  });
  svg.innerHTML = `<defs><linearGradient id="gR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient></defs>` + html;
}

/* ============ 概念辨析视图 ============ */
function renderCompareView() {
  const main = $('#main');
  main.innerHTML = `
    <div class="view-head">
      <h2>概念辨析矩阵 <span style="font-size:11px;color:#5eead4;font-weight:400">AI 自动提取与对比</span></h2>
      <div class="vh-actions">
        <button class="btn primary" id="buildCompare">⚖️ AI 生成对比表格</button>
        <button class="btn ghost" id="clearCompare">清空</button>
      </div>
    </div>
    <div class="rag-wrap" style="padding-top:0">
      <div class="rag-answer show" id="compareResult" style="min-height:200px;color:#c3cede">
        <div class="empty-mini" style="padding:40px 0;text-align:center">点击右上角按钮，AI 会读取你左侧的笔记，提取容易混淆的概念并生成对比表格。</div>
      </div>
    </div>
  `;
  $('#buildCompare').onclick = aiCompare;
  $('#clearCompare').onclick = () => { $('#compareResult').innerHTML = `<div class="empty-mini" style="padding:40px 0;text-align:center">已清空，点击右上角重新生成。</div>`; };
}

/* ============ 知识问答 RAG ============ */
function renderRagView() {
  const main = $('#main');
  main.innerHTML = `
    <div class="view-head"><h2>知识问答 · 文档库 <span style="font-size:11px;color:#5eead4">向量检索</span></h2></div>
    <div class="rag-wrap">
      <div class="upload-zone" id="uploadZone">
        <div class="uz-icon">📚</div>
        <p>点击或拖拽上传（.txt / .md / .docx / .xlsx）</p>
        <input type="file" id="fileInput" accept=".txt,.md,.csv,.json,.docx,.xlsx" multiple hidden>
      </div>
      <div class="doc-list" id="docList"></div>
      <div class="rag-ask">
        <input id="ragQuery" placeholder="基于以上文档提问…">
        <button class="btn primary" id="ragAskBtn">提问</button>
      </div>
      <div class="rag-answer" id="ragAnswer"></div>
    </div>
  `;

  renderDocList();
  const zone = $('#uploadZone'), input = $('#fileInput');
  zone.onclick = () => input.click();
  input.onchange = e => { handleFiles(e.target.files); input.value = ''; };
  // 拖拽上传
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', e => { if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files); });

  const askBtn = $('#ragAskBtn'), askInput = $('#ragQuery');
  let asking = false;
  const ask = async () => {
    if (asking) return;
    const q = (askInput.value || '').trim();
    if (!q) { toast('请输入问题', true); return; }
    if (!S.docs || S.docs.length === 0) { toast('请先上传文档', true); return; }
    asking = true; askBtn.disabled = true; askBtn.textContent = '思考中…';
    const box = $('#ragAnswer');
    box.classList.add('show');
    box.innerHTML = '<div style="color:#5eead4">🔍 检索中…</div>';
    try {
      const r = await ragAnswer(q);
      const srcs = [...new Set(r.sources.map(s => s.doc))];
      box.innerHTML = renderMD(r.text) + (srcs.length ? `<div class="rag-source">📎 参考来源：${esc(srcs.join('、'))}</div>` : '');
      if (window.renderMathInElement) {
        try { renderMathInElement(box, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
      }
    } catch (e) {
      box.innerHTML = `<div style="color:#fb7185">⚠️ 请求未成功：${esc(e.message)}</div>`;
    } finally {
      asking = false; askBtn.disabled = false; askBtn.textContent = '提问';
    }
  };
  askBtn.onclick = ask;
  askInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ask(); } };
}

function renderDocList() {
  const el = $('#docList');
  if (!el) return;
  if (!S.docs.length) { el.innerHTML = '<div class="empty-mini">还没有上传文档</div>'; return; }
  el.innerHTML = S.docs.map(d => `
    <div class="doc-row">
      <span>📄</span>
      <span class="dr-name" title="${esc(d.name)}">${esc(d.name)}</span>
      <span class="dr-meta">${d.chunks.length} 片段 · ${(d.size / 1024).toFixed(1)} KB</span>
      <button class="dr-del" data-id="${d.id}">✕</button>
    </div>
  `).join('');
  $$('.dr-del', el).forEach(b => b.onclick = () => {
    S.docs = S.docs.filter(d => d.id !== b.dataset.id);
    saveAll(); renderDocList();
    toast('已删除');
  });
}

// 解析上传的文件（支持 docx / xlsx / 纯文本）
async function handleFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  toast(`开始解析 ${list.length} 个文件…`);
  for (const f of list) {
    if (f.size > 10 * 1024 * 1024) { toast(`${f.name} 超过 10MB，已跳过`, true); continue; }
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    let text = '';
    try {
      if (ext === 'docx') {
        if (!window.mammoth) throw new Error('mammoth 库未加载（请检查网络/CDN）');
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value || '';
      } else if (ext === 'xlsx' || ext === 'xls') {
        if (!window.XLSX) throw new Error('XLSX 库未加载（请检查网络/CDN）');
        const arrayBuffer = await f.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        // 读取所有工作表，而不是只读第一个
        text = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          return `【工作表: ${name}】\n${csv}`;
        }).join('\n\n');
      } else {
        // 纯文本 / Markdown / CSV / JSON
        text = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(String(e.target.result || ''));
          r.onerror = () => rej(new Error('文件读取失败'));
          r.readAsText(f, 'utf-8');
        });
      }
    } catch (err) {
      console.error('[Upload]', f.name, err);
      toast(`解析 ${f.name} 失败：${err.message}`, true);
      continue;
    }
    if (!text || !text.trim()) { toast(`${f.name} 内容为空`, true); continue; }
    S.docs.push({
      id: uid(), name: f.name, size: f.size,
      chunks: chunkText(text, 400, 80).map(t => ({ text: t, vector: null })),
      embedded: false, createdAt: Date.now()
    });
  }
  saveAll();
  renderDocList();
  toast(`已上传，共 ${S.docs.length} 个文档`);
}

// 长文本切片（400 字一段，重叠 80 字）
function chunkText(text, size = 400, overlap = 80) {
  const c = []; let i = 0;
  while (i < text.length) {
    c.push(text.slice(i, i + size));
    if (i + size >= text.length) break;
    i += size - overlap;
  }
  return c;
}

// RAG：关键词检索 + AI 回答（含兜底）
async function ragAnswer(q) {
  // 是否概括类问题（这类问题即使没关键词，也取文档头部作为上下文）
  const isGeneralQuery = /总结|概括|主要|讲了什么|写了什么|内容|大意|summary|overview/i.test(q);

  // 关键词打分
  const qt = tokenize(q), sc = [];
  S.docs.forEach(doc => doc.chunks.forEach(c => {
    const ct = tokenize(c.text), set = {};
    ct.forEach(t => set[t] = (set[t] || 0) + 1);
    let s = 0;
    qt.forEach(t => { if (set[t]) s += set[t]; });
    s = s / Math.sqrt(ct.length + 1);
    if (s > 0) sc.push({ doc: doc.name, text: c.text, score: s });
  }));
  sc.sort((a, b) => b.score - a.score);
  let top = sc.slice(0, 4);

  // 兜底：没命中或概括类问题 → 取每个文档前 3 个片段
  if (!top.length || isGeneralQuery) {
    const fallback = [];
    S.docs.forEach(doc => {
      doc.chunks.slice(0, 3).forEach((c, i) => {
        fallback.push({ doc: doc.name, text: c.text, score: 99 - i });
      });
    });
    top = fallback.slice(0, 6);
    if (!top.length) {
      return { text: '未在已上传的文档中找到与问题相关的内容。请尝试更换关键词，或上传更相关的文档。', sources: [] };
    }
  }

  const ctx = top.map((s, i) => `【${i + 1}】${s.doc}\n${s.text}`).join('\n\n');
  const srcs = [...new Set(top.map(s => ({ doc: s.doc })))];
  const prompt = `你是严谨的问答助手。仅根据资料回答用户问题。资料没有答案就说"资料中无相关信息"。用 [1][2] 标注引用。\n\n资料：\n${ctx}\n\n问题：${q}`;

  try {
    let full = '';
    for await (const c of llmStream([{ role: 'user', content: prompt }])) full += c;
    if (!full || !full.trim()) throw new Error('AI 返回空内容');
    return { text: full, sources: srcs };
  } catch (e) {
    // AI 调用失败 → 直接展示检索到的片段
    console.warn('[RAG] AI 调用失败，降级展示检索片段:', e);
    const fallback = top.map((s, i) =>
      `**片段 ${i + 1}**（来自 \`${s.doc}\`）：\n> ${s.text.slice(0, 260).replace(/\n/g, ' ')}${s.text.length > 260 ? '…' : ''}`
    ).join('\n\n');
    return {
      text: `⚠️ AI 服务暂时不可用（${e.message}），已为你检索到以下相关片段，可先参考：\n\n${fallback}`,
      sources: srcs
    };
  }
}

/* ============ 学习统计视图 ============ */
function renderStatsView() {
  const main = $('#main');
  const tn = S.notebooks.reduce((a, n) => a + n.notes.length, 0);
  const tm = Object.values(S.days).reduce((a, b) => a + b, 0);
  // 最近 84 天
  const days = []; const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push({ date: dayKey(d), ms: S.days[dayKey(d)] || 0 });
  }
  const mx = Math.max(...days.map(d => d.ms), 1);
  const lvl = ms => {
    if (!ms) return '';
    const r = ms / mx;
    if (r < .25) return 'l1';
    if (r < .5) return 'l2';
    if (r < .75) return 'l3';
    return 'l4';
  };
  // 分成 12 周
  const weeks = []; let wk = [];
  days.forEach((d, i) => { wk.push(d); if (wk.length === 7 || i === days.length - 1) { weeks.push(wk); wk = []; } });

  // 记忆状态分级
  const b = { new: 0, learn: 0, young: 0, mature: 0 };
  S.cards.forEach(c => {
    const s = c.S || 0;
    if (s === 0) b.new++;
    else if (s < 1) b.learn++;
    else if (s < 21) b.young++;
    else b.mature++;
  });

  main.innerHTML = `
    <div class="view-head"><h2>学习统计</h2></div>
    <div class="settings-wrap">
      <div class="setting-card">
        <h4>📊 总览</h4>
        <div class="stat-grid">
          <div><b>${S.notebooks.length}</b><span>笔记本</span></div>
          <div><b>${tn}</b><span>笔记</span></div>
          <div><b>${S.cards.length}</b><span>闪卡</span></div>
          <div><b>${S.docs.length}</b><span>文档</span></div>
          <div><b>${Math.round(tm / 60000)}</b><span>累计分钟</span></div>
          <div><b>${S.streak}</b><span>连续天数</span></div>
        </div>
      </div>
      <div class="setting-card">
        <h4>🔥 热力图（近 84 天）</h4>
        <div class="heatmap">
          ${weeks.map(w => `<div class="heat-col">${w.map(d => `<div class="heat-cell ${lvl(d.ms)}" title="${d.date} · ${Math.round(d.ms / 60000)}分"></div>`).join('')}</div>`).join('')}
        </div>
        <div class="heat-legend">少 <div class="heat-cell"></div><div class="heat-cell l1"></div><div class="heat-cell l2"></div><div class="heat-cell l3"></div><div class="heat-cell l4"></div> 多</div>
      </div>
      <div class="setting-card">
        <h4>🎴 记忆状态</h4>
        <div class="stat-grid">
          <div><b>${b.new}</b><span>未学习</span></div>
          <div><b>${b.learn}</b><span>学习中</span></div>
          <div><b>${b.young}</b><span>巩固中</span></div>
          <div><b>${b.mature}</b><span>已掌握</span></div>
        </div>
      </div>
    </div>
  `;
}

/* ============ 设置视图 ============ */
function renderSettingsView() {
  const main = $('#main'), cfg = S.aiConfig;
  main.innerHTML = `
    <div class="view-head"><h2>设置</h2></div>
    <div class="settings-wrap">
      <div class="setting-card">
        <h4>☁️ 云端同步 <span style="color:#5eead4;font-size:11px">默认匿名登录</span></h4>
        <p class="muted" style="margin-bottom:14px">当前状态：<b id="cloudStatusText" style="color:#5eead4">检测中…</b></p>
        <div id="authPanel"></div>
      </div>
      <div class="setting-card">
        <h4>🤖 AI 模型 <span style="color:#5eead4;font-size:11px">已通过云端代理连接</span></h4>
        <p class="muted" style="margin-bottom:14px">AI Key 已安全保存在云端，前端不可见。</p>
        <div class="form-row"><label>模型</label><select id="aiModel">
          <option value="qwen-turbo" ${cfg.model === 'qwen-turbo' ? 'selected' : ''}>qwen-turbo（快速）</option>
          <option value="qwen-plus" ${cfg.model === 'qwen-plus' ? 'selected' : ''}>qwen-plus（均衡）</option>
          <option value="qwen-max" ${cfg.model === 'qwen-max' ? 'selected' : ''}>qwen-max（最强）</option>
        </select></div>
        <div class="setting-actions"><button class="btn primary" id="saveAi">保存</button></div>
      </div>
      <div class="setting-card">
        <h4>💾 数据管理</h4>
        <div class="setting-actions">
          <button class="btn ghost" id="exportJson">导出 JSON</button>
          <button class="btn ghost" id="exportMd">导出 Markdown</button>
          <button class="btn ghost" id="exportAnki">导出 Anki CSV</button>
          <button class="btn danger" id="clearData">清空本地数据</button>
        </div>
      </div>
    </div>
  `;

  updateCloudStatusText();
  renderAuthPanel();

  // 切换模型
  $('#aiModel')?.addEventListener('change', e => {
    cfg.model = e.target.value;
    saveLocal(); renderTopStats();
    toast('模型已切换为 ' + e.target.value);
  });
  // 保存
  $('#saveAi')?.addEventListener('click', async () => {
    saveLocal();
    toast('设置已保存');
    renderTopStats();
  });
  // 导出 JSON
  $('#exportJson').onclick = () => {
    const b = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `ai-workbench-${dayKey()}.json`;
    a.click();
    toast('已导出');
  };
  // 导出 Markdown
  $('#exportMd').onclick = () => {
    let md = '';
    S.notebooks.forEach(nb => {
      md += `# ${nb.name}\n\n`;
      nb.notes.forEach(n => { md += `## ${n.title || '未命名'}\n\n${n.content || ''}\n\n---\n\n`; });
    });
    const b = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `notes-${dayKey()}.md`;
    a.click();
    toast('已导出');
  };
  // 导出 Anki CSV
  $('#exportAnki').onclick = () => {
    if (!S.cards.length) { toast('没有闪卡', true); return; }
    const csv = S.cards.map(c => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}"`).join('\n');
    const b = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `anki-${dayKey()}.csv`;
    a.click();
    toast('已导出');
  };
  // 清空本地
  $('#clearData').onclick = () => {
    if (!confirm('清空本地数据？云端数据不受影响。')) return;
    localStorage.removeItem(KEY);
    location.reload();
  };
}

/* ============ 全局搜索 ============ */
function doSearch(q) {
  q = (q || '').trim().toLowerCase();
  const box = $('#searchResults');
  if (!q) { box.classList.remove('show'); box.innerHTML = ''; return; }
  const rs = [];
  S.notebooks.forEach(nb => nb.notes.forEach(nt => {
    if ((nt.title || '').toLowerCase().includes(q) || (nt.content || '').toLowerCase().includes(q)) rs.push({ nb, nt });
  }));
  box.innerHTML = rs.length
    ? rs.slice(0, 20).map(r => `
        <div class="sr-item" data-nb="${r.nb.id}" data-note="${r.nt.id}">
          <div class="sr-title">${esc(r.nt.title || '未命名')}</div>
          <div class="sr-sub">${esc(r.nb.name)} · ${snippet(r.nt.content, q)}</div>
        </div>
      `).join('')
    : '<div class="sr-empty">没有找到</div>';
  box.classList.add('show');
  // 点击结果 → 跳转
  $$('.sr-item', box).forEach(el => el.onclick = () => {
    S.activeNotebookId = el.dataset.nb;
    S.activeNoteId = el.dataset.note;
    currentView = 'notes';
    saveAll(); renderAll(); syncNav();
    box.classList.remove('show');
    $('#globalSearch').value = '';
  });
}

// 搜索结果摘要片段
function snippet(t, q) {
  const s = String(t || '').replace(/\s+/g, ' ');
  const i = s.toLowerCase().indexOf(q);
  if (i < 0) return esc(s.slice(0, 60)) + (s.length > 60 ? '…' : '');
  return '…' + esc(s.slice(Math.max(0, i - 18), i + 60)) + '…';
}
