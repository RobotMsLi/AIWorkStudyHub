/* ============================================================
   06-cmdk.js
   职责：Ctrl/Cmd+K 呼出的命令面板，支持命令匹配 + 笔记搜索
   ============================================================ */

let cmdIdx = 0;       // 当前高亮的命令索引
let cmdResults = [];  // 当前过滤出的命令列表

// 打开命令面板
function openCmdk() {
  $('#cmdkBackdrop').classList.add('show');
  $('#cmdkInput').value = '';
  $('#cmdkInput').focus();
  renderCmdk('');
}

// 关闭命令面板
function closeCmdk() { $('#cmdkBackdrop').classList.remove('show'); }

// 渲染命令列表（q 为过滤字符串）
function renderCmdk(q) {
  q = q.toLowerCase().trim();

  // 内置命令
  const cmds = [
    { ico: '📝', label: '新建笔记', run: () => { const nb = getActiveNotebook(); if (!nb) { createNotebook(); return; } createNote(nb.id); } },
    { ico: '📚', label: '新建笔记本', run: createNotebook },
    { ico: '☁️', label: '立即同步', run: async () => { await pushToCloud(); toast('已同步'); } },
    { ico: '🔐', label: '账号 / 登录', run: () => { currentView = 'settings'; syncNav(); renderMain(); } },
    { ico: '🤖', label: 'AI 设置', run: () => { currentView = 'settings'; syncNav(); renderMain(); } },
    { ico: '🎴', label: '闪卡池', run: () => { currentView = 'flash'; syncNav(); renderMain(); } },
    { ico: '🧠', label: '思维导图', run: () => { currentView = 'mind'; syncNav(); renderMain(); } },
    { ico: '⚖️', label: '概念辨析', run: () => { currentView = 'compare'; syncNav(); renderMain(); } },
    { ico: '📊', label: '学习统计', run: () => { currentView = 'stats'; syncNav(); renderMain(); } }
  ];

  // 搜索笔记作为动态命令
  if (q) {
    S.notebooks.forEach(nb => nb.notes.forEach(nt => {
      if ((nt.title || '').toLowerCase().includes(q) || (nt.content || '').toLowerCase().includes(q)) {
        cmds.push({
          ico: '📄', label: nt.title || '未命名', hint: nb.name,
          run: () => {
            S.activeNotebookId = nb.id; S.activeNoteId = nt.id;
            currentView = 'notes'; saveAll(); renderAll(); syncNav();
          }
        });
      }
    }));
  }

  // 过滤
  cmdResults = q
    ? cmds.filter(c => c.label.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q))
    : cmds;
  cmdIdx = 0;

  // 渲染
  const list = $('#cmdkList');
  if (!cmdResults.length) { list.innerHTML = '<div class="cmdk-empty">无匹配</div>'; return; }
  list.innerHTML = cmdResults.map((c, i) => `
    <div class="cmdk-item ${i === cmdIdx ? 'active' : ''}" data-i="${i}">
      <span class="cmdk-ico">${c.ico}</span>
      <span>${esc(c.label)}</span>
      ${c.hint ? `<span class="cmdk-hint">${esc(c.hint)}</span>` : ''}
    </div>
  `).join('');

  // 绑定鼠标交互
  $$('.cmdk-item', list).forEach(el => {
    el.onmouseenter = () => {
      cmdIdx = +el.dataset.i;
      $$('.cmdk-item', list).forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    };
    el.onclick = () => {
      const c = cmdResults[+el.dataset.i];
      closeCmdk();
      c.run();
    };
  });
}
