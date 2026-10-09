/* ============================================================
   职责：所有 DOM 事件绑定 + 启动初始化
   说明：本文件必须最后加载，因为它依赖前面文件里声明的函数
   本次改动：init() 中云端数据冲突时改为弹窗询问
   ============================================================ */

/* ============ 事件绑定 ============ */
function bindEvents() {
  // 侧栏折叠（桌面端）
  $('#collapseBtn').onclick = () => $('#sidebar').classList.toggle('collapsed');
  // 移动端菜单 / AI 面板
  $('#mobileMenuBtn').onclick = toggleMobileSidebar;
  $('#mobileAiBtn').onclick = toggleMobileAi;
  // 新建笔记本
  $('#addNotebook').onclick = createNotebook;
  // 顶栏状态点击 → 打开设置
  $('#aiStatus').onclick = () => { currentView = 'settings'; syncNav(); renderMain(); if (window.innerWidth <= 820) { toggleMobileAi(); } };
  $('#cloudBtn').onclick = () => { currentView = 'settings'; syncNav(); renderMain(); };
  $('#avatarBtn').onclick = () => { currentView = 'settings'; syncNav(); renderMain(); };

  // 导航切换
  $$('.nav-item').forEach(btn => btn.onclick = () => {
    if (currentView === 'notes') flushEditor();
    currentView = btn.dataset.view;
    syncNav();
    renderMain();
    // 移动端切页后自动关侧栏
    if (window.innerWidth <= 820) {
      mobileSidebarOpen = false;
      $('#sidebar').classList.remove('mobile-show');
      $('#sidebarBackdrop').classList.remove('show');
    }
  });

  // 全局搜索
  const si = $('#globalSearch');
  let st = null;
  si.oninput = () => { clearTimeout(st); st = setTimeout(() => doSearch(si.value), 220); };
  si.onkeydown = e => {
    if (e.key === 'Enter') doSearch(si.value);
    if (e.key === 'Escape') { $('#searchResults').classList.remove('show'); si.blur(); }
  };
  $('#searchBtn').onclick = () => doSearch(si.value);
  document.addEventListener('click', e => { if (!e.target.closest('.tb-search')) $('#searchResults').classList.remove('show'); });

  // AI 聊天面板发送
  const sendBtn = $('#aiSend'), inp = $('#aiInput');
  sendBtn.onclick = async () => {
    const v = inp.value;
    if (!v.trim()) return;
    inp.value = ''; inp.style.height = 'auto';
    await chatSend(v);
  };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } };
  inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
  $$('#aiQuick button').forEach(b => b.onclick = () => chatSend(b.dataset.q));
  $('#clearChat').onclick = () => {
    if (!S.chat.length) { toast('已经是空的'); return; }
    if (!confirm('清空对话？')) return;
    S.chat = []; saveAll(); renderChat();
  };

  // 命令面板
  $('#cmdkBackdrop').onclick = e => { if (e.target.id === 'cmdkBackdrop') closeCmdk(); };
  const ci = $('#cmdkInput');
  ci.oninput = () => renderCmdk(ci.value);
  ci.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdIdx = Math.min(cmdIdx + 1, cmdResults.length - 1); renderCmdk(ci.value); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdIdx = Math.max(cmdIdx - 1, 0); renderCmdk(ci.value); }
    else if (e.key === 'Enter') { const c = cmdResults[cmdIdx]; if (c) { closeCmdk(); c.run(); } }
    else if (e.key === 'Escape') closeCmdk();
  };

  // 全局快捷键
  document.addEventListener('keydown', e => {
    const cmd = e.ctrlKey || e.metaKey;
    if (cmd && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); return; }
    if (cmd && e.key === '/') { e.preventDefault(); $('#sidebar').classList.toggle('collapsed'); return; }
    if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); flushEditor(); toast('已保存'); return; }
  });

  // 页面隐藏 / 关闭前落盘
  window.addEventListener('beforeunload', () => { flushEditor(); saveLocal(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flushEditor(); saveLocal(); }
  });
}

/* ============ 移动端侧栏 / AI 面板 ============ */
function toggleMobileSidebar() {
  mobileSidebarOpen = !mobileSidebarOpen;
  $('#sidebar').classList.toggle('mobile-show', mobileSidebarOpen);
  $('#sidebarBackdrop').classList.toggle('show', mobileSidebarOpen);
  if (mobileSidebarOpen) {
    mobileAiOpen = false;
    $('#aiPanel').classList.remove('mobile-show');
    $('#aiBackdrop').classList.remove('show');
  }
}
function toggleMobileAi() {
  mobileAiOpen = !mobileAiOpen;
  $('#aiPanel').classList.toggle('mobile-show', mobileAiOpen);
  $('#aiBackdrop').classList.toggle('show', mobileAiOpen);
  if (mobileAiOpen) {
    mobileSidebarOpen = false;
    $('#sidebar').classList.remove('mobile-show');
    $('#sidebarBackdrop').classList.remove('show');
  }
}
// 点击遮罩关闭
$('#sidebarBackdrop')?.addEventListener('click', () => {
  mobileSidebarOpen = false;
  $('#sidebar').classList.remove('mobile-show');
  $('#sidebarBackdrop').classList.remove('show');
});
$('#aiBackdrop')?.addEventListener('click', () => {
  mobileAiOpen = false;
  $('#aiPanel').classList.remove('mobile-show');
  $('#aiBackdrop').classList.remove('show');
});

/* ============ 初始化 ============ */
async function init() {
  // ---------- 1) 本地数据 ----------
  try {
    const local = loadLocal();
    S = local || seed();
    normalize();
    checkStreak();
    updateAvatar();
    bindEvents();
    syncNav();
    renderAll();
    renderChat();
    startClock();
    startTimer();
  } catch (e) {
    console.error('[Init] 基础初始化失败:', e);
  }

  // ---------- 2) 云端（Supabase） ----------
  if (initSupabase()) {
    try {
      // 优先用已有 session；没有就游客登录
      const { data: { session } } = await sb.auth.getSession();
      let user = session?.user;
      if (!user) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        user = data.user;
      }
      currentUser = user;
      updateAvatar();
      setCloudStatus('syncing');

      // 拉云端数据
      const cloud = await pullFromCloud();
      const cloudHasData = cloud && cloud.data && (
        (cloud.data.notebooks || []).length > 0 || (cloud.data.cards || []).length > 0
      );

      if (cloudHasData) {
        // 【新增】判断云端与本地是否"明显不同"
        const needPrompt = isCloudDataDifferentFromLocal(cloud.data);
        if (needPrompt) {
          // 数据冲突 → 弹窗询问（是 = 云端覆盖本地，否 = 本地覆盖云端）
          const useCloud = await confirmCloudSync(cloud.data);
          if (useCloud) {
            S = cloud.data;
            normalize();
            renderAll();
            renderChat();
            renderTopStats();
            toast('已使用云端数据覆盖本地');
            console.log('[Sync] 用户选择：云端覆盖本地');
          } else {
            await pushToCloud();
            toast('已使用本地数据覆盖云端');
            console.log('[Sync] 用户选择：本地覆盖云端');
          }
        } else {
          // 数据一致 → 静默使用云端（相当于合并完成）
          S = cloud.data;
          normalize();
          renderAll();
          renderChat();
          renderTopStats();
          console.log('[Sync] 云端与本地数据一致，静默使用云端');
        }
      } else {
        // 云端为空 → 直接把本地数据推上去
        await pushToCloud();
        console.log('[Sync] 云端为空，已推送本地数据');
      }
      setCloudStatus('synced');

      // 监听 auth 状态变化
      sb.auth.onAuthStateChange((event, sess) => {
        if (event === 'SIGNED_OUT') {
          if (!sess?.user) {
            currentUser = null;
            updateAvatar();
            setCloudStatus('idle');
            if (currentView === 'settings') renderSettingsView();
          }
        } else if (event === 'SIGNED_IN' && sess?.user) {
          currentUser = sess.user;
          updateAvatar();
          if (currentView === 'settings') renderSettingsView();
        }
      });
    } catch (e) {
      console.warn('[Init] 自动登录失败（请确认 Supabase 后台已开启 Anonymous Sign-ins）:', e.message);
      setCloudStatus('idle');
      currentUser = null;
      updateAvatar();
    }
  } else {
    console.warn('[Init] Supabase 未初始化，云端功能不可用');
    setCloudStatus('idle');
  }

  renderTopStats();
  if (currentView === 'settings') renderSettingsView();
}

// DOM ready 后启动
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
