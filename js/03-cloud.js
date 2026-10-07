/* ============================================================
 
   职责：设置页里"云端同步"卡片的状态文字、登录/注册表单、以及
        登录/注册/退出三个动作。依赖 01-core.js 里的 sb / currentUser 等。
   本次新增：数据冲突时的弹窗询问（confirmCloudSync / isCloudDataDifferentFromLocal）
   ============================================================ */

/* ============ 更新设置页里的云端状态文字 ============ */
function updateCloudStatusText() {
  const cst = $('#cloudStatusText');
  if (!cst) return;
  if (!sb) { cst.textContent = '云端未连接（请检查网络与 CDN）'; return; }
  if (cloudStatus === 'error') { cst.textContent = '同步失败'; return; }
  if (!currentUser) { cst.textContent = '未登录'; return; }
  cst.textContent = '云端在线';
}

/* ============ 判断云端数据和本地数据是否"明显不同" ============ */
// 判断依据：笔记本 id 列表是否一致；如果一致，再看笔记总数
// 一致 → 返回 false（不弹窗）；不一致 → 返回 true（弹窗）
function isCloudDataDifferentFromLocal(cloudData) {
  if (!cloudData || typeof cloudData !== 'object') return true;

  const localNbIds = S.notebooks.map(n => n.id).sort().join(',');
  const cloudNbIds = (cloudData.notebooks || []).map(n => n.id).sort().join(',');
  if (localNbIds !== cloudNbIds) return true;

  const localNoteCount = S.notebooks.reduce((a, nb) => a + (nb.notes?.length || 0), 0);
  const cloudNoteCount = (cloudData.notebooks || []).reduce((a, nb) => a + (nb.notes || []).length, 0);
  if (localNoteCount !== cloudNoteCount) return true;

  return false;
}

/* ============ 数据冲突弹窗 ============ */
// 返回 Promise<boolean>：true = 用云端覆盖本地；false = 用本地覆盖云端
function confirmCloudSync(cloudData) {
  return new Promise((resolve) => {
    // 统计数据量用于展示
    const cloudNoteCount = (cloudData?.notebooks || []).reduce((a, nb) => a + (nb.notes?.length || 0), 0);
    const localNoteCount = S.notebooks.reduce((a, nb) => a + (nb.notes?.length || 0), 0);
    const cloudCardCount = (cloudData?.cards || []).length;
    const localCardCount = S.cards.length;

    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `
      <div class="modal" style="width:min(560px,100%)">
        <div class="modal-head">
          <h3>☁️ 云端数据同步</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:14px;color:#c3cede">检测到云端已有数据，请选择要保留的版本：</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div style="padding:14px;border-radius:12px;background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.25)">
              <div style="font-size:12px;color:#5eead4;font-weight:600;margin-bottom:8px">☁️ 云端数据</div>
              <div style="font-size:11.5px;color:#7f8da3;line-height:1.9">
                笔记本：${(cloudData?.notebooks || []).length}<br>
                笔记：${cloudNoteCount}<br>
                闪卡：${cloudCardCount}
              </div>
            </div>
            <div style="padding:14px;border-radius:12px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.25)">
              <div style="font-size:12px;color:#b7c3d6;font-weight:600;margin-bottom:8px">💻 本地数据</div>
              <div style="font-size:11.5px;color:#7f8da3;line-height:1.9">
                笔记本：${S.notebooks.length}<br>
                笔记：${localNoteCount}<br>
                闪卡：${localCardCount}
              </div>
            </div>
          </div>

          <p style="font-size:11.5px;color:#7f8da3;margin-bottom:16px">
            ⚠️ 选择后另一边会被覆盖，此操作不可撤销。关闭窗口 = 保持本地不变（不覆盖云端）。
          </p>

          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn primary" id="syncUseCloud">☁️ 用云端覆盖本地</button>
            <button class="btn ghost" id="syncUseLocal">💻 用本地覆盖云端</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    let settled = false;
    const finish = (useCloud) => {
      if (settled) return;
      settled = true;
      m.remove();
      resolve(useCloud);
    };

    m.querySelector('#syncUseCloud').onclick = () => finish(true);
    m.querySelector('#syncUseLocal').onclick = () => finish(false);
    m.querySelector('.modal-close').onclick = () => finish(false);
    // 点遮罩 = 保守选本地
    m.addEventListener('click', e => { if (e.target === m) finish(false); });
  });
}

/* ============ 渲染登录/注册表单（或已登录提示） ============ */
function renderAuthPanel() {
  const el = $('#authPanel');
  if (!el) return;

  // Supabase 未初始化
  if (!sb) {
    el.innerHTML = '<div class="muted" style="color:#fb7185">⚠️ 云端服务未初始化，账号功能不可用。请检查网络与 Supabase 配置。</div>';
    return;
  }

  // 是否是游客账号
  const isAnon = !currentUser || currentUser.is_anonymous === true;

  if (isAnon) {
    el.innerHTML = `
      <div class="muted" style="margin-bottom:14px">
        当前为<b style="color:#fbbf24">游客账号</b><span class="badge-anon">本设备</span>，数据会自动同步到云端但无法跨设备访问。
        登录或注册后即可在多设备间同步笔记。
      </div>
      <div class="auth-tab-bar">
        <button class="auth-tab active" id="authTabLogin">登录</button>
        <button class="auth-tab" id="authTabSignup">注册</button>
      </div>
      <div id="authForm">
        <div class="form-row"><label>邮箱</label><input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email"></div>
        <div class="form-row"><label>密码</label><input type="password" id="authPassword" placeholder="至少 6 位" autocomplete="current-password"></div>
        <div class="form-row" id="authConfirmRow" style="display:none"><label>确认密码</label><input type="password" id="authPassword2" placeholder="再输入一次" autocomplete="new-password"></div>
        <div class="setting-actions">
          <button class="btn primary" id="authSubmit">登录</button>
          <button class="btn ghost" id="syncNowBtn">立即同步</button>
        </div>
        <div class="auth-msg" id="authMsg"></div>
      </div>
    `;

    let mode = 'login';
    const tabLogin = $('#authTabLogin'), tabSignup = $('#authTabSignup');
    const confirmRow = $('#authConfirmRow'), submitBtn = $('#authSubmit');

    tabLogin.onclick = () => {
      mode = 'login';
      tabLogin.classList.add('active'); tabSignup.classList.remove('active');
      confirmRow.style.display = 'none';
      submitBtn.textContent = '登录';
      $('#authMsg').textContent = '';
    };
    tabSignup.onclick = () => {
      mode = 'signup';
      tabSignup.classList.add('active'); tabLogin.classList.remove('active');
      confirmRow.style.display = 'flex';
      submitBtn.textContent = '注册新账号';
      $('#authMsg').textContent = '';
    };
    submitBtn.onclick = () => {
      const email = ($('#authEmail').value || '').trim();
      const pwd = $('#authPassword').value || '';
      if (mode === 'login') handleLogin(email, pwd);
      else {
        const pwd2 = $('#authPassword2').value || '';
        handleSignUp(email, pwd, pwd2);
      }
    };
    $('#authEmail').onkeydown = e => { if (e.key === 'Enter') submitBtn.click(); };
    $('#authPassword').onkeydown = e => { if (e.key === 'Enter') submitBtn.click(); };
    $('#authPassword2').onkeydown = e => { if (e.key === 'Enter') submitBtn.click(); };

    bindSyncNowButton();
  } else {
    el.innerHTML = `
      <div class="muted" style="margin-bottom:14px">
        已登录：<b style="color:#5eead4">${esc(currentUser.email || '未知邮箱')}</b>
        <span class="badge-user">云端账号</span>
        <br>你的笔记、闪卡、上传的文档都会自动同步到云端，可在任意设备登录访问。
      </div>
      <div class="setting-actions">
        <button class="btn primary" id="syncNowBtn">立即同步</button>
        <button class="btn ghost" id="authLogout">退出登录</button>
      </div>
    `;
    bindSyncNowButton();
    $('#authLogout').onclick = handleLogout;
  }
}

/* ============ 绑定"立即同步"按钮 ============ */
function bindSyncNowButton() {
  const b = $('#syncNowBtn');
  if (b) b.onclick = async () => {
    if (!currentUser) { toast('请先登录或等待游客账号登录', true); return; }
    await pushToCloud();
    toast('已同步');
  };
}

/* ============ 登录 ============ */
async function handleLogin(email, password) {
  const msg = $('#authMsg');
  const setMsg = (t, isErr) => { if (msg) { msg.textContent = t; msg.className = 'auth-msg ' + (isErr ? 'err' : 'ok'); } };
  if (!email || !password) { setMsg('请输入邮箱和密码', true); return; }
  if (!sb) { setMsg('云端未连接', true); return; }

  const submitBtn = $('#authSubmit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '登录中…'; }
  setMsg('正在登录…', false);

  try {
    await sb.auth.signOut();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error('登录返回异常');

    currentUser = data.user;
    updateAvatar();
    setCloudStatus('syncing');

    // 拉云端数据
    const cloud = await pullFromCloud();
    const cloudHasData = cloud && cloud.data && (
      (cloud.data.notebooks || []).length > 0 || (cloud.data.cards || []).length > 0
    );

    if (cloudHasData) {
      // 数据冲突 → 弹窗让用户选择
      const useCloud = await confirmCloudSync(cloud.data);
      if (useCloud) {
        S = cloud.data;
        normalize();
        renderAll();
        renderChat();
        renderTopStats();
        setMsg('登录成功，已使用云端数据覆盖本地。', false);
        toast('登录成功，已使用云端数据');
      } else {
        await pushToCloud();
        setMsg('登录成功，已使用本地数据覆盖云端。', false);
        toast('登录成功，已使用本地数据');
      }
    } else {
      // 云端为空 → 直接把本地数据推上去
      await pushToCloud();
      setMsg('登录成功，本地数据已上传到云端。', false);
      toast('登录成功，已上传本地数据');
    }
    renderSettingsView();
  } catch (e) {
    console.warn('[Auth] 登录失败:', e);
    setMsg('登录失败：' + (e.message || '未知错误'), true);
    try {
      const { data } = await sb.auth.signInAnonymously();
      if (data?.user) { currentUser = data.user; updateAvatar(); }
    } catch (_) {}
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '登录'; }
  }
}

/* ============ 注册 ============ */
async function handleSignUp(email, password, password2) {
  const msg = $('#authMsg');
  const setMsg = (t, isErr) => { if (msg) { msg.textContent = t; msg.className = 'auth-msg ' + (isErr ? 'err' : 'ok'); } };
  if (!email || !password) { setMsg('请输入邮箱和密码', true); return; }
  if (password.length < 6) { setMsg('密码至少 6 位', true); return; }
  if (password !== password2) { setMsg('两次输入的密码不一致', true); return; }
  if (!sb) { setMsg('云端未连接', true); return; }

  const submitBtn = $('#authSubmit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '注册中…'; }
  setMsg('正在创建账号…', false);

  // 注册是新账号，没有数据冲突，直接把本地数据推上去
  const localBackup = JSON.parse(JSON.stringify(S));

  try {
    await sb.auth.signOut();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;

    if (!data.session) {
      setMsg('注册成功！我们已向你的邮箱发送确认链接，请前往邮箱完成验证后再登录。', false);
      toast('请前往邮箱确认注册');
      currentUser = null;
      updateAvatar();
      setCloudStatus('idle');
      try {
        const { data: anon } = await sb.auth.signInAnonymously();
        if (anon?.user) { currentUser = anon.user; updateAvatar(); }
      } catch (_) {}
      return;
    }

    currentUser = data.user;
    updateAvatar();
    setCloudStatus('syncing');
    S = localBackup;
    saveLocal();
    await pushToCloud();
    setMsg('注册成功！已切换到新账号，本地数据已上传到云端。', false);
    toast('注册成功 🎉');
    renderSettingsView();
    renderTopStats();
  } catch (e) {
    console.warn('[Auth] 注册失败:', e);
    setMsg('注册失败：' + (e.message || '未知错误'), true);
    try {
      const { data } = await sb.auth.signInAnonymously();
      if (data?.user) { currentUser = data.user; updateAvatar(); }
    } catch (_) {}
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '注册新账号'; }
  }
}

/* ============ 退出登录 → 切回游客 ============ */
async function handleLogout() {
  if (!confirm('确定退出登录？退出后将切回游客账号，本地数据仍会保留。')) return;
  if (!sb) return;
  try {
    await sb.auth.signOut();
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    currentUser = data.user;
    updateAvatar();
    setCloudStatus('synced');
    renderSettingsView();
    renderTopStats();
    toast('已退出登录，已切换为游客模式');
  } catch (e) {
    console.warn('[Auth] 退出失败:', e);
    toast('退出失败：' + e.message, true);
  }
}
