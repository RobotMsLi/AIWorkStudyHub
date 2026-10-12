
/* ============================================================
   01-core.js
   职责：常量 / 工具 / 存储 / Supabase / 状态 / Markdown / LLM 流
        / 分词 / FSRS / UI 工具 / 百度语音（ASR+TTS）/ 浏览器 TTS
   ============================================================ */

/* ============ Supabase 配置 ============ */
const SUPABASE_URL = 'https://qhxjfiywpdjwgdsuzowq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V-vGRz3J177-mEG59uTtBA_3W0WlUnf';

/* ============ 全局错误拦截 ============ */
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
window.addEventListener('error', function(e) { if (IS_FILE_PROTOCOL) e.preventDefault(); });
window.addEventListener('unhandledrejection', function(e) { if (IS_FILE_PROTOCOL) e.preventDefault(); });

/* ============ 通用工具 ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDate = ts => { if (!ts) return '—'; const d = new Date(ts); return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fmtTime = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ============ 本地存储 ============ */
const KEY = 'ai_workbench_pro_v5';

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
        { id: engNote2, title: '词根词缀记忆法', createdAt: Date.now(), updatedAt: Date.now(), content: `# 词根词缀记忆法\n\n## 常见前缀\n- **un-**：否定，如 unhappy\n- **re-**：再次，如 review\n- **pre-**：预先，如 preview\n\n## 常见词根\n- **spect**：看，如 inspect, respect\n- **port**：拿，如 import, export\n\n## 常见后缀\n- **-tion**：名词后缀，如 action\n- **-able**：形容词后缀，如 comfortable` }
      ]}
    ],
    activeNotebookId: mathId, activeNoteId: mathNote1,
    cards: [], docs: [], days: {}, streak: 1, lastDay: dayKey(), chat: [],
    wrongQuestions: [],
    aiConfig: { provider: '', model: 'qwen-turbo', baseUrl: '' }
  };
}

let S;

function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.notebooks)) return p;
    }
  } catch (e) { console.warn('读取本地数据失败', e); }
  return null;
}

function saveLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { console.warn('写入本地数据失败', e); }
}

function normalize() {
  if (!S || typeof S !== 'object') S = seed();
  if (!Array.isArray(S.notebooks)) S.notebooks = [];

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
  if (!Array.isArray(S.wrongQuestions)) S.wrongQuestions = [];
  if (!S.days || typeof S.days !== 'object' || Array.isArray(S.days)) S.days = {};
  if (!Array.isArray(S.chat)) S.chat = [];
  if (typeof S.streak !== 'number' || isNaN(S.streak)) S.streak = 1;
  if (!S.lastDay) S.lastDay = dayKey();
  if (!S.aiConfig || typeof S.aiConfig !== 'object') S.aiConfig = { provider: '', model: 'qwen-turbo', baseUrl: '' };

  if (!S.notebooks.some(n => n.id === S.activeNotebookId)) {
    S.activeNotebookId = S.notebooks[0]?.id || null;
    S.activeNoteId = null;
  }
  const nb = S.notebooks.find(n => n.id === S.activeNotebookId);
  if (nb && !nb.notes.some(n => n.id === S.activeNoteId)) {
    S.activeNoteId = nb.notes[0]?.id || null;
  }
  try { saveLocal(); } catch (e) {}
}

/* ============ Supabase 云同步 ============ */
function initSupabase() {
  if (IS_FILE_PROTOCOL) { console.warn('[Supabase] file:// 模式，跳过云端'); return false; }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.warn('[Supabase] URL/KEY 未配置'); return false; }
  if (!window.supabase) { console.warn('[Supabase] supabase-js 未加载'); return false; }
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] 客户端初始化成功');
    return true;
  } catch (e) {
    console.error('[Supabase] createClient 失败:', e);
    return false;
  }
}

let pushTimer = null;

async function pushToCloud() {
  if (!currentUser || !sb || IS_FILE_PROTOCOL) return;
  setCloudStatus('syncing');
  const cloudData = JSON.parse(JSON.stringify(S));
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

function schedulePush() {
  if (!currentUser || !sb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloud, 1500);
}

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

function setCloudStatus(status) {
  cloudStatus = status;
  try { renderTopStats(); } catch (e) {}
  try { updateCloudStatusText(); } catch (e) {}
}

/* ============ 运行时状态 ============ */
let currentView = 'notes';
let reviewing = false;
let reviewQueue = [];
let reviewIdx = 0;
let sb = null;
let currentUser = null;
let cloudStatus = 'idle';
let mobileSidebarOpen = false;
let mobileAiOpen = false;

const getActiveNotebook = () => S.notebooks.find(n => n.id === S.activeNotebookId) || null;
const getActiveNote = () => { const nb = getActiveNotebook(); return nb ? nb.notes.find(n => n.id === S.activeNoteId) || null : null; };
const dueCards = () => S.cards.filter(c => (c.due || 0) <= Date.now());

/* ============ 头像 ============ */
function updateAvatar() {
  const el = $('#avatarBtn');
  if (!el) return;
  if (currentUser) {
    if (currentUser.is_anonymous) {
      el.className = 'avatar logged-out';
      el.title = '匿名账号（点击登录/注册）';
    } else {
      el.className = 'avatar logged-in';
      el.title = '已登录 · ' + (currentUser.email || '');
    }
  } else {
    el.className = 'avatar logged-out';
    el.title = '未登录（点击查看设置）';
  }
}

/* ============ Markdown ============ */
if (window.marked) marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

function renderMD(t) {
  if (!t) return '';
  try { return window.marked ? marked.parse(String(t)) : esc(t).replace(/\n/g, '<br>'); }
  catch (e) { return esc(t).replace(/\n/g, '<br>'); }
}

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
async function* llmStream(messages, opts = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60000);
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
      buf = lines.pop();
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

async function llmComplete(messages) {
  let o = '';
  for await (const c of llmStream(messages)) o += c;
  return o;
}

/* ============ 分词 / 关键词 ============ */
const STOP = new Set('的了和是在我有就不人上都一也很快到说要去你会着没看好自己这那与及或对为以被从而等中并其于之此则但若因所使可能将已还更最又让把给向后前里外时地得过出来下大小多少我们他们因为所以如果这样那么可以一个什么怎么这个那个就是还是不是时候已经进行通过需要具有以及同时因此但是而且并且其中这些那些一种'.split(''));

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

function keywords(text, n = 8) {
  const f = {};
  tokenize(text).forEach(t => f[t] = (f[t] || 0) + 1);
  return Object.entries(f)
    .filter(([w, c]) => c >= 2 && w.length >= 2)
    .map(([w, c]) => [w, c * (1 + Math.min(w.length, 6) * .25)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n).map(x => x[0]);
}

function splitSentences(t) {
  return String(t || '').replace(/\r/g, '')
    .split(/(?<=[。！？!?；;\n])/)
    .map(s => s.trim())
    .filter(s => s.length > 6);
}

/* ============ FSRS ============ */
function fsrsUpdate(card, rating) {
  let D = card.D || 5, S = card.S || 1;
  const elapsed = Math.max(0, (Date.now() - (card.lastReview || Date.now())) / 86400000);
  const R = Math.exp(Math.log(.9) * elapsed / Math.max(S, .01));
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

/* ============ UI 工具 ============ */
function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, isErr ? 3200 : 2000);
}

function openModal(title, bodyHTML) {
  const m = document.createElement('div');
  m.className = 'modal-backdrop';
  m.innerHTML = `<div class="modal"><div class="modal-head"><h3>${title}</h3><button class="modal-close">✕</button></div><div class="modal-body">${bodyHTML}</div></div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  m.querySelector('.modal-close').onclick = () => m.remove();
  document.body.appendChild(m);
  return m;
}

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

/* ============================================================
   百度语音工具（ASR 语音输入）
   ============================================================ */
let _mediaRecorder = null;
let _audioChunks = [];

async function convertToWav(blob) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const targetRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();
    const pcm = rendered.getChannelData(0);
    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, pcm.length * 2, true);
    let offset = 44;
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  } catch (e) {
    console.error('音频转码失败:', e);
    throw new Error('音频格式转换失败');
  }
}

async function startVoiceRecord(onResult) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _mediaRecorder = new MediaRecorder(stream);
    _audioChunks = [];

    _mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) _audioChunks.push(e.data);
    };

    _mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(_audioChunks, { type: 'audio/webm' });
      try {
        const wavBlob = await convertToWav(blob);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result.split(',')[1];
            const res = await fetch('/.netlify/functions/ai-proxy?action=asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64, len: wavBlob.size })
            });
            const data = await res.json();
            if (data.err_no === 0 && data.result && data.result[0]) {
              onResult(data.result[0]);
            } else {
              toast('识别失败：' + (data.err_msg || '未知错误'), true);
            }
          } catch (e) {
            toast('语音识别请求失败', true);
          }
        };
        reader.readAsDataURL(wavBlob);
      } catch (e) {
        toast('音频处理失败：' + e.message, true);
      }
    };

    _mediaRecorder.start();
    return true;
  } catch (e) {
    toast('无法访问麦克风：' + e.message, true);
    return false;
  }
}

function stopVoiceRecord() {
  if (_mediaRecorder && _mediaRecorder.state === 'recording') {
    _mediaRecorder.stop();
  }
}

/* ============================================================
   浏览器原生语音朗读（用于闪卡，本地免费）
   ============================================================ */
function speakText(text, opts = {}) {
  if (!window.speechSynthesis) {
    toast('当前浏览器不支持语音朗读', true);
    return;
  }
  try { window.speechSynthesis.cancel(); } catch (e) {}
  const clean = String(text || '').replace(/[#*`_>$\\]/g, '').trim();
  if (!clean) { toast('没有可朗读的内容', true); return; }
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = opts.lang || 'zh-CN';
  u.rate = opts.rate || 1.0;
  u.pitch = 1.0;
  if (opts.onEnd) u.onend = opts.onEnd;
  window.speechSynthesis.speak(u);
}

function stopSpeak() {
  try { window.speechSynthesis.cancel(); } catch (e) {}
}
