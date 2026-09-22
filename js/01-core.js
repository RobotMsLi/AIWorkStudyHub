/* ============================================================
   职责：常量 / 工具函数 / 本地存储 / Supabase 客户端 / 运行时状态
        / Markdown 渲染 / LLM 流式请求 / 分词 / FSRS / UI 通用工具
   说明：本文件中的变量都声明在全局作用域，供后续 02~07 文件引用。
   ============================================================ */

/* ============================================================
   Supabase 云端配置（把你自己的项目 URL / Anon Key 填到这里）
   ============================================================ */
const SUPABASE_URL = 'https://qhxjfiywpdjwgdsuzowq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-vGRz3J177-mEG59uTtBA_3W0WlUnf';

/* ============ 全局错误拦截 ============ */
// 本地 file:// 打开时，Supabase / fetch 会报跨域错误；这里静默吞掉，避免控制台刷屏
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
window.addEventListener('error', function(e) { if (IS_FILE_PROTOCOL) e.preventDefault(); });
window.addEventListener('unhandledrejection', function(e) { if (IS_FILE_PROTOCOL) e.preventDefault(); });

/* ============ 通用工具 ============ */
const $ = (s, r = document) => r.querySelector(s);            // 单元素查询
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s)); // 多元素查询（返回数组）

// 短 ID：时间戳36进制 + 5位随机
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// 补零
const pad2 = n => String(n).padStart(2, '0');
// HTML 转义，防止 XSS
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 截断字符串
const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
// 当天 key：YYYY-MM-DD
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
// 时间戳 → MM-DD HH:mm
const fmtDate = ts => { if (!ts) return '—'; const d = new Date(ts); return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
// 时间戳 → HH:mm
const fmtTime = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
// Promise 延迟
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============ 本地存储 ============ */
const KEY = 'ai_workbench_pro_v5';

// 首次进入时生成的种子数据（三本笔记本，每本两篇笔记）
function seed() {
  const chineseId = uid(), chineseNote1 = uid(), chineseNote2 = uid();
  const mathId = uid(), mathNote1 = uid(), mathNote2 = uid();
  const engId = uid(), engNote1 = uid(), engNote2 = uid();
  return {
    notebooks: [
      { id: chineseId, name: '语文', createdAt: Date.now(), notes: [
        { id: chineseNote1, title: '《荷塘月色》赏析', createdAt: Date.now(), updatedAt: Date.now(), content: `# 《荷塘月色》赏析\n\n## 一、作者与背景\n朱自清，现代散文家、诗人。本文写于1927年，正值大革命失败，作者内心苦闷，寻求精神上的解脱。\n\n## 二、文章结构\n1. **缘由**：这几天心里颇不宁静。\n2. **去荷塘**：小煤屑路、幽僻、寂寞。\n3. **观荷塘**：荷叶、荷花、荷香、荷波。\n4. **忆江南**：采莲旧俗，惦着江南。\n5. **归家**：推门进去，什么声息也没有。\n\n## 三、修辞手法\n- **比喻**：叶子出水很高，像亭亭的舞女的裙。\n- **通感**：微风过处，送来缕缕清香，仿佛远处高楼上渺茫的歌声似的。\n- **拟人**：层层的叶子中间，零星地点缀着些白花。\n\n## 四、核心意象\n- **月色**：淡淡的、朦胧的、和谐的。\n- **荷塘**：宁静、幽美、超脱世俗。` },
        { id: chineseNote2, title: '文言文虚词整理', createdAt: Date.now(), updatedAt: Date.now(), content: `# 文言文常考虚词\n\n## 一、之\n1. **代词**：人非生而知之者。\n2. **助词**：的、取消句子独立性。\n3. **动词**：去、往。\n\n## 二、其\n1. **代词**：他的、那。\n2. **副词**：大概、难道。\n\n## 三、以\n1. **介词**：用、凭借、因为。\n2. **连词**：来、以致。\n\n## 四、于\n1. **介词**：在、从、到、对、向、比。\n\n## 五、而\n1. **连词**：并且、但是、就。\n2. **代词**：你的。` }
      ]},
      { id: mathId, name: '数学', createdAt: Date.now(), notes: [
        { id: mathNote1, title: '函数极限与连续', createdAt: Date.now(), updatedAt: Date.now(), content: `# 函数极限与连续\n\n## 一、极限的定义\n当自变量 $x$ 无限趋近于 $x_0$ 时，函数值 $f(x)$ 无限接近于常数 $A$，则称 $A$ 为极限。\n\n$$\\lim_{x \\to x_0} f(x) = A$$\n\n## 二、极限存在的充要条件\n左右极限都存在且相等。\n\n## 三、连续的定义\n函数在一点连续需满足：有定义、极限存在、极限值等于函数值。\n\n## 四、两个重要极限\n1. $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$\n2. $\\lim_{x \\to \\infty} (1 + \\frac{1}{x})^x = e$` },
        { id: mathNote2, title: '导数与微分', createdAt: Date.now(), updatedAt: Date.now(), content: `# 导数与微分\n\n## 一、导数的定义\n$$f'(x_0) = \\lim_{\\Delta x \\to 0} \\frac{f(x_0+\\Delta x) - f(x_0)}{\\Delta x}$$\n\n## 二、几何意义\n导数表示曲线在点 $(x_0, f(x_0))$ 处切线的斜率。\n\n## 三、求导法则\n1. $(u \\pm v)' = u' \\pm v'$\n2. $(uv)' = u'v + uv'$\n3. $(\\frac{u}{v})' = \\frac{u'v - uv'}{v^2}$\n\n## 四、链式法则\n$$\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$$` }
      ]},
      { id: engId, name: '英语', createdAt: Date.now(), notes: [
        { id: engNote1, title: '英语时态总结', createdAt: Date.now(), updatedAt: Date.now(), content: `# 英语时态总结\n\n## 一、一般现在时\n- 表示习惯性动作、客观真理。\n- 结构：主语 + 动词原形 / 动词+s/es\n\n## 二、一般过去时\n- 表示过去发生的动作。\n- 结构：主语 + 动词过去式\n\n## 三、现在完成时\n- 表示过去发生但对现在有影响的动作。\n- 结构：主语 + have/has + 过去分词\n\n## 四、过去完成时\n- 表示"过去的过去"。\n- 结构：主语 + had + 过去分词\n\n## 五、一般将来时\n- 表示将来要发生的动作。\n- 结构：主语 + will + 动词原形` },
        { id: engNote2, title: '词根词缀记忆法', createdAt: Date.now(), updatedAt: Date.now(), content: `# 词根词缀记忆法\n\n## 常见前缀\n- **un-**：否定，如 unhappy\n- **re-**：再次，如 review\n- **pre-**：预先，如 preview\n- **dis-**：否定，如 disagree\n\n## 常见词根\n- **spect**：看，如 inspect, respect\n- **port**：拿，如 import, export\n- **duct**：引导，如 conduct, introduce\n\n## 常见后缀\n- **-tion**：名词后缀，如 action\n- **-able**：形容词后缀，如 comfortable\n- **-ly**：副词后缀，如 quickly` }
      ]}
    ],
    activeNotebookId: mathId, activeNoteId: mathNote1,
    cards: [], docs: [], days: {}, streak: 1, lastDay: dayKey(), chat: [],
    aiConfig: { provider: '', model: 'qwen-turbo', baseUrl: '' }
  };
}

// 全局状态对象（全部数据都挂在 S 上）
let S;

// 从 localStorage 读数据
function loadLocal() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.notebooks)) return p; } } catch (e) {}
  return null;
}
// 写回 localStorage
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

// 数据体检：修复字段缺失 / 类型不对 / 索引越界等
function normalize() {
  if (!S || typeof S !== 'object') S = seed();
  if (!Array.isArray(S.notebooks)) S.notebooks = [];
  // 修复笔记本结构
  S.notebooks = S.notebooks.filter(nb => nb && typeof nb === 'object').map(nb => {
    if (typeof nb.id !== 'string') nb.id = uid();
    if (typeof nb.name !== 'string') nb.name = '未命名';
    if (!Array.isArray(nb.notes)) nb.notes = [];
    nb.notes = nb.notes.filter(n => n && typeof n === 'object').map(n => {
      if (typeof n.id !== 'string') n.id = uid();
      if (typeof n.title !== 'string') n.title = '';
      if (typeof n.content !== 'string') n.content = '';
      if (!n.createdAt) n.createdAt = Date.now();
      if (!n.updatedAt) n.updatedAt = Date.now();
      return n;
    });
    return nb;
  });
  if (!Array.isArray(S.cards)) S.cards = [];
  if (!Array.isArray(S.docs)) S.docs = [];
  if (!S.days || typeof S.days !== 'object' || Array.isArray(S.days)) S.days = {};
  if (!Array.isArray(S.chat)) S.chat = [];
  if (typeof S.streak !== 'number' || isNaN(S.streak)) S.streak = 1;
  if (!S.lastDay) S.lastDay = dayKey();
  if (!S.aiConfig || typeof S.aiConfig !== 'object') S.aiConfig = { provider: '', model: 'qwen-turbo', baseUrl: '' };
  // 校验激活的笔记本 / 笔记
  if (!S.notebooks.some(n => n.id === S.activeNotebookId)) { S.activeNotebookId = S.notebooks[0]?.id || null; S.activeNoteId = null; }
  const nb = S.notebooks.find(n => n.id === S.activeNotebookId);
  if (nb && !nb.notes.some(n => n.id === S.activeNoteId)) S.activeNoteId = nb.notes[0]?.id || null;
  try { saveLocal(); } catch (e) {}
}

/* ============ Supabase 客户端 ============ */
function initSupabase() {
  if (IS_FILE_PROTOCOL) { console.warn('[Supabase] file:// 模式，跳过云端初始化'); return false; }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.warn('[Supabase] URL/KEY 未配置'); return false; }
  if (!window.supabase) { console.warn('[Supabase] supabase-js 未加载（CDN 被拦截？）'); return false; }
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] 客户端初始化成功');
    return true;
  } catch (e) {
    console.error('[Supabase] createClient 失败:', e);
    return false;
  }
}

// 防抖推送定时器
let pushTimer = null;

// 推送全量数据到云
async function pushToCloud() {
  if (!currentUser || !sb || IS_FILE_PROTOCOL) return;
  setCloudStatus('syncing');
  const cloudData = JSON.parse(JSON.stringify(S)); // 深拷贝避免引用
  try {
    const { error } = await sb.from('workspaces').upsert({
      user_id: currentUser.id, data: cloudData, updated_at: new Date().toISOString()
    });
    if (error) throw error;
    setCloudStatus('synced');
  } catch (e) {
    console.warn('[Sync] push failed:', e);
    setCloudStatus('error');
  }
}

// 1.5s 防抖，避免每次输入都推
function schedulePush() {
  if (!currentUser || !sb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloud, 1500);
}

// 从云端拉取当前用户的数据
async function pullFromCloud() {
  if (!currentUser || !sb || IS_FILE_PROTOCOL) return null;
  try {
    const { data, error } = await sb.from('workspaces').select('data').eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.warn('[Sync] pull failed:', e);
    return null;
  }
}

// 更新云同步状态（触发顶栏 & 设置页刷新）
function setCloudStatus(status) {
  cloudStatus = status;
  try { renderTopStats(); } catch (e) {}
  try { updateCloudStatusText(); } catch (e) {}
}

/* ============ 运行时状态（跨文件共享） ============ */
let currentView = 'notes';    // 当前视图
let reviewing = false;        // 是否在闪卡复习中
let reviewQueue = [];         // 待复习闪卡队列
let reviewIdx = 0;            // 当前复习进度
let sb = null;                // Supabase 客户端
let currentUser = null;       // 当前登录用户
let cloudStatus = 'idle';     // 云同步状态：idle / syncing / synced / error
let mobileSidebarOpen = false;// 移动端侧栏是否打开
let mobileAiOpen = false;     // 移动端 AI 面板是否打开

// 当前激活的笔记本
const getActiveNotebook = () => S.notebooks.find(n => n.id === S.activeNotebookId) || null;
// 当前激活的笔记
const getActiveNote = () => { const nb = getActiveNotebook(); return nb ? nb.notes.find(n => n.id === S.activeNoteId) || null : null; };
// 到期待复习的闪卡
const dueCards = () => S.cards.filter(c => (c.due || 0) <= Date.now());

/* ============ 头像状态 ============ */
function updateAvatar() {
  const el = $('#avatarBtn');
  if (!el) return;
  if (currentUser) {
    if (currentUser.is_anonymous) {
      el.className = 'avatar logged-out';
      el.title = '游客账号（点击登录/注册）';
    } else {
      el.className = 'avatar logged-in';
      el.title = '已登录 · ' + (currentUser.email || '');
    }
  } else {
    el.className = 'avatar logged-out';
    el.title = '未登录（点击查看设置）';
  }
}

/* ============ Markdown 渲染 ============ */
if (window.marked) {
  marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
}
// 简单 Markdown → HTML
function renderMD(t) {
  if (!t) return '';
  try { return window.marked ? marked.parse(String(t)) : esc(t).replace(/\n/g, '<br>'); }
  catch (e) { return esc(t).replace(/\n/g, '<br>'); }
}
// 渲染 Markdown 并自动解析 LaTeX 公式
function renderMDWithMath(el, t) {
  el.innerHTML = renderMD(t);
  if (window.renderMathInElement) {
    try {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {}
  }
}

/* ============ 流式 LLM（走后端代理） ============ */
// 异步生成器：每次 yield 一段增量文本
async function* llmStream(messages, opts = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60000); // 60s 超时
  try {
    const res = await fetch('/.netlify/functions/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: S.aiConfig.model || 'qwen-turbo' }),
      signal: ctrl.signal
    });
    if (!res.ok) { const e = await res.text(); throw new Error(`请求失败 (${res.status}): ${e.slice(0, 200)}`); }
    if (!res.body) throw new Error('浏览器不支持流式读取');

    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // 最后一段可能不完整，留到下一轮
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const d = line.slice(5).trim();
        if (d === '[DONE]') return;
        try {
          const j = JSON.parse(d);
          if (j.choices?.[0]?.delta?.content) yield j.choices[0].delta.content;
        } catch (e) {}
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

// 一次性收集完整回答
async function llmComplete(messages) {
  let o = '';
  for await (const c of llmStream(messages)) o += c;
  return o;
}

/* ============ 简易中文分词 / 关键词 ============ */
// 停用词集合
const STOP = new Set('的了和是在我有就不人上都一也很快到说要去你会着没看好自己这那与及或对为以被从而等中并其于之此则但若因所使可能将已还更最又让把给向后前里外时地得过出来下大小多少我们他们因为所以如果这样那么可以一个什么怎么这个那个就是还是不是时候已经进行通过需要具有以及同时因此但是而且并且其中这些那些一种'.split(''));

// 分词：英文按词切，中文用 bigram（连续两字）
function tokenize(text) {
  const out = [], s = String(text || '');
  (s.match(/[A-Za-z][A-Za-z0-9_\-]{1,}/g) || []).forEach(w => out.push(w.toLowerCase()));
  (s.match(/[\u4e00-\u9fa5]+/g) || []).forEach(seg => {
    for (let i = 0; i < seg.length - 1; i++) {
      const g = seg.slice(i, i + 2);
      if (!STOP.has(g)) out.push(g);
    }
    if (seg.length === 1) out.push(seg);
  });
  return out;
}

// 提取关键词（按词频打分）
function keywords(text, n = 8) {
  const f = {};
  tokenize(text).forEach(t => f[t] = (f[t] || 0) + 1);
  return Object.entries(f)
    .filter(([w, c]) => c >= 2 && w.length >= 2)
    .map(([w, c]) => [w, c * (1 + Math.min(w.length, 6) * .25)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n).map(x => x[0]);
}

// 按中英文标点切句
function splitSentences(t) {
  return String(t || '').replace(/\r/g, '')
    .split(/(?<=[。！？!?；;\n])/)
    .map(s => s.trim())
    .filter(s => s.length > 6);
}

/* ============ FSRS-4.5 简化版 ============ */
// rating: 1=忘记 2=模糊 3=记住了 4=太简单
function fsrsUpdate(card, rating) {
  let D = card.D || 5, S = card.S || 1;
  const elapsed = Math.max(0, (Date.now() - (card.lastReview || Date.now())) / 86400000);
  const R = Math.exp(Math.log(.9) * elapsed / Math.max(S, .01)); // 可提取性
  let nD = Math.max(1, Math.min(10, D - .8 * (rating - 3)));
  let nS;
  if (rating === 1) nS = Math.max(.5, S * .3);
  else if (rating === 2) nS = Math.max(1, S * (1 + 1.2 * (11 - nD) * Math.pow(Math.max(S, .01), -.2) * (Math.exp(1 - R) - 1)));
  else if (rating === 3) nS = Math.max(S + 1, S * (1 + 2.5 * (11 - nD) * Math.pow(Math.max(S, .01), -.2) * (Math.exp(1 - R) - 1)));
  else nS = Math.max(S * 1.5, S * (1 + 3.5 * (11 - nD) * Math.pow(Math.max(S, .01), -.2) * (Math.exp(1 - R) - 1)));
  nS = Math.min(nS, 365);
  return {
    D: nD, S: nS,
    due: Date.now() + Math.max(.5, nS) * 86400000,
    lastReview: Date.now(),
    reps: (card.reps || 0) + 1,
    lapses: (card.lapses || 0) + (rating === 1 ? 1 : 0)
  };
}

/* ============ UI 通用工具 ============ */
// 底部 Toast 提示
function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, isErr ? 3200 : 2000);
}

// 通用弹窗
function openModal(title, bodyHTML) {
  const m = document.createElement('div');
  m.className = 'modal-backdrop';
  m.innerHTML = `<div class="modal"><div class="modal-head"><h3>${title}</h3><button class="modal-close">✕</button></div><div class="modal-body">${bodyHTML}</div></div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  m.querySelector('.modal-close').onclick = () => m.remove();
  document.body.appendChild(m);
  return m;
}

// 双击重命名：把 textEl 替换成 input
function startInlineEdit(textEl, val, onSave) {
  if (textEl.dataset.editing === '1') return;
  textEl.dataset.editing = '1';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rename-input';
  input.value = val;
  input.maxLength = 80;
  const parent = textEl.parentNode;
  parent.insertBefore(input, textEl);
  textEl.style.display = 'none';
  input.focus();
  input.select();
  let fin = false;
  const finish = c => {
    if (fin) return;
    fin = true;
    const v = input.value.trim();
    input.remove();
    textEl.style.display = '';
    delete textEl.dataset.editing;
    if (c && v && v !== val) onSave(v);
    else if (!c) textEl.textContent = val;
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    e.stopPropagation();
  });
  input.addEventListener('click', e => e.stopPropagation());
}
