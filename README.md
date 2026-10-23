
# AI 学习工作台

> 一款面向个人学习者的智能学习集成平台，打通「学 → 测 → 纠 → 补」完整闭环。

![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)
![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7.svg)
![Supabase](https://img.shields.io/badge/Cloud-Supabase-3ECF8E.svg)

---

## 📖 项目简介

**AI 学习工作台**（AI Work-Study Hub）是一款集成化的智能学习工具。它把笔记管理、AI 知识加工、间隔重复记忆、错题分析、多模态解析整合在一个统一的工作台中，形成完整的学习闭环。

区别于传统的单点工具（笔记软件只解决记录、闪卡工具只解决记忆），本项目采用 **AI 驱动 + 数据闭环** 的设计理念：

```
拍照/输入 → 笔记 → AI 加工 → 自测题 → 错题本 → AI 复习计划 → 闪卡复习 → 学习周报
```

每个环节的产物都是下一个环节的输入，知识在系统中持续流动、沉淀、强化。

---

## ✨ 功能特性

### 📝 智能笔记
- 完整的 **Markdown** 编辑与实时预览
- 完整的 **LaTeX** 数学公式渲染（KaTeX）
- 600ms 防抖自动保存 + 云端同步
- 笔记本 / 笔记双层管理

### 🤖 AI 加工（9 大功能）

| 功能 | 说明 |
|---|---|
| 摘要 | 一键提取笔记核心要点 |
| 扩展 | AI 补充深入概念说明 |
| 自测题 | 生成可交互的选择题 |
| 闪卡 | 从笔记自动生成记忆卡片 |
| 思维导图 | 树状知识结构可视化 |
| 概念辨析 | 混淆概念的对比矩阵 |
| 费曼学习法 | AI 扮演学生提问，逼你把知识讲清楚 |
| 学习周报 | 基于学习数据生成个性化复盘 |
| AI 复习计划 | **Agent 工作流**：分析错题 → 决策薄弱点 → 一键生成闪卡 |

### 🎴 闪卡池（FSRS-4.5 算法）
- 基于认知科学的间隔重复算法
- 动态调整复习间隔
- 支持浏览器原生 TTS 朗读

### ❌ 错题本
- 答错自动收录，无需手动记录
- AI 分析薄弱知识点
- 一键生成针对性复习计划

### 📷 拍题解析（多模态）
- 拍照 / 上传图片
- 通义千问 VL 识别题目并分步解答
- 一键插入笔记，形成沉淀

### 🎙️ 语音输入
- 腾讯云 ASR 语音识别
- 光标处插入，支持连续录音

### 📚 知识问答（RAG）
- 支持 `.docx` / `.xlsx` / `.txt` / `.md` 上传
- 关键词检索 + AI 生成回答
- 检索失败自动降级展示原文片段

### 📊 学习统计
- 学习时长热力图（近 84 天）
- 记忆状态分布（未学习 / 学习中 / 巩固中 / 已掌握）
- 连续学习天数

### ☁️ 云端同步
- 默认**游客登录**，打开即用
- 支持邮箱注册，跨设备同步
- 数据冲突时弹窗询问用户

---

## 🛠️ 技术栈

### 前端
| 技术 | 用途 |
|---|---|
| 原生 JavaScript (ES6+) | 核心业务逻辑 |
| HTML5 / CSS3 | 页面结构与样式 |
| [marked](https://github.com/markedjs/marked) | Markdown 渲染 |
| [KaTeX](https://katex.org/) | 数学公式渲染 |
| [Mammoth](https://github.com/mwilliamson/mammoth.js) | Word 文档解析 |
| [SheetJS](https://sheetjs.com/) | Excel 文档解析 |

### 后端（Serverless）
| 技术 | 用途 |
|---|---|
| [Netlify Functions](https://docs.netlify.com/functions/overview/) | Serverless 函数 |
| [通义千问](https://help.aliyun.com/zh/dashscope/) | 文本对话 / 视觉理解 |
| [腾讯云 ASR](https://cloud.tencent.com/product/asr) | 语音识别 |

### 数据与认证
| 技术 | 用途 |
|---|---|
| [Supabase](https://supabase.com/) | 云端数据库 + 匿名/邮箱认证 |

### 架构特点
- **零构建**：原生 JS 模块化，无 Webpack / Vite
- **零 CDN 依赖**：所有第三方库本地化部署
- **Serverless**：无需维护服务器

---

## 📁 项目结构

```
AIWorkStudyHub/
├── index.html                    # 页面结构 + 封面
├── netlify.toml                  # Netlify 部署配置
├── package.json                  # 项目依赖
├── README.md                     # 本文档
│
├── css/
│   ├── style.css                 # 全局样式
│   └── lib/
│       ├── katex.min.css
│       └── fonts/                # KaTeX 字体文件
│
├── js/
│   ├── 01-core.js                # 基础设施层
│   ├── 02-ai.js                  # AI 能力层
│   ├── 03-cloud.js               # 云端认证层
│   ├── 04-views.js               # 视图渲染层
│   ├── 05-chat.js                # AI 聊天面板
│   ├── 06-cmdk.js                # 命令面板（Ctrl + K）
│   ├── 07-app.js                 # 启动入口 + 事件绑定
│   └── lib/                      # 本地化的第三方库
│
└── netlify/
    └── functions/
        └── ai-proxy.js           # Serverless 代理
```

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18
- Python ≥ 3.8（仅本地测试服务器需要）
- Netlify CLI（可选）

### 1. 克隆项目

```bash
git clone https://github.com/RobotMsLi/AIWorkStudyHub.git
cd AIWorkStudyHub
```

### 2. 配置 Supabase

**步骤 1**：注册 Supabase，创建项目。

**步骤 2**：在 SQL Editor 中执行以下语句：

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workspace"
  ON workspaces FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**步骤 3**：开启匿名登录：`Authentication` → `Providers` → 开启 `Anonymous Sign-Ins`。

**步骤 4**：复制 `Project URL` 和 `anon key`。

### 3. 配置环境变量

在项目根目录创建 `.env` 文件（不要提交到 Git）：

```env
AI_API_KEY=sk-xxxxxxxxxxxxxxxx
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-turbo
VISION_MODEL=qwen-vl-plus

TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. 本地运行

```bash
# 方式 A：Python 测试服务器（推荐）
python server.py

# 方式 B：Netlify Dev
netlify dev
```

访问：http://localhost:8000

---

## 🌐 部署到 Netlify

### 方式 A：拖拽部署（最简单）

1. 登录 Netlify
2. 点击 `Add new site` → `Deploy manually`
3. 把项目文件夹内所有内容拖入虚线框
4. 等待部署完成

> ⚠️ 注意：不要上传 `server.py`、`.env`、`本地环境搭建.txt` 等含真实 Key 的文件。

### 方式 B：GitHub 自动部署（推荐）

1. 把项目推送到 GitHub
2. Netlify → `Add new site` → `Import an existing project`
3. 选择 GitHub 仓库
4. Build command 留空，Publish directory 填 `.`
5. 点击 `Deploy site`

### 配置环境变量

Netlify 站点 → `Site configuration` → `Environment variables`：

| Key | Value |
|---|---|
| `AI_API_KEY` | 你的通义千问 API Key |
| `AI_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `AI_MODEL` | `qwen-turbo` |
| `VISION_MODEL` | `qwen-vl-plus` |
| `TENCENT_SECRET_ID` | 腾讯云 SecretId |
| `TENCENT_SECRET_KEY` | 腾讯云 SecretKey |
| `SECRETS_SCAN_ENABLED` | `false` |

**配置完成后必须重新部署**：`Deploys` → `Trigger deploy` → `Clear cache and deploy site`

### 配置 Supabase 域名白名单

回 Supabase 后台 → `Authentication` → `URL Configuration`：

| 字段 | 填写 |
|---|---|
| Site URL | `https://你的域名.netlify.app` |
| Redirect URLs | `https://你的域名.netlify.app/**` |

---

## 📖 使用指南

### 首次访问

1. 打开网址，看到**封面页**
2. 点击「进入工作台」进入主界面
3. 系统自动以**游客身份**登录，数据自动同步到云端

### 常用操作

| 操作 | 快捷键 |
|---|---|
| 打开命令面板 | `Ctrl + K` / `Cmd + K` |
| 保存笔记 | `Ctrl + S` / `Cmd + S` |
| 折叠侧栏 | `Ctrl + /` |
| 返回封面 | 点击左上角 AI Logo |

### 核心工作流

1. 写笔记 → 点「✦ 摘要」提取要点
2. 点「? 自测题」→ 答题 → 错题自动入库
3. 进「❌ 错题本」→ 点「🤖 AI 生成复习计划」→ 一键创建闪卡
4. 进「🎴 闪卡池」→ 按 FSRS 算法复习
5. 学习统计页 → 点「📅 生成学习周报」复盘

---

## 🔧 常见问题

### Q1：设置页显示"未配置 AI"，但 AI 功能正常？

这是正常现象。API Key 存放于 Netlify 环境变量，前端读不到。如需显示"在线 AI"，在 `js/04-views.js` 中将 `const hasAI = ...` 改为 `const hasAI = true;`。

### Q2：Supabase 显示"未登录"？

检查两点：1) Supabase 后台匿名登录是否开启；2) Redirect URLs 是否添加了 Netlify 域名。

### Q3：Supabase 项目被暂停了？

免费版连续 7 天无活动会自动暂停。登录 Supabase 后台重新启用即可。建议每周访问一次线上站点。

### Q4：部署时被"Secrets scanning"拦截？

添加环境变量 `SECRETS_SCAN_ENABLED=false`，并清理 `README.md`、`本地环境搭建.txt` 等文件中的真实 Key。

### Q5：拍题解析超时或失败？

检查 `VISION_MODEL` 是否为 `qwen-vl-plus`（必须全小写），以及通义千问账号是否开通了 VL 模型。

### Q6：语音输入报错？

检查腾讯云 SecretId/SecretKey 是否配置，控制台是否开通"一句话识别"服务，浏览器是否允许麦克风权限。

---

## 🎯 项目亮点

| 亮点 | 说明 |
|---|---|
| 零 CDN 依赖 | 所有第三方库本地化部署，国内网络稳定访问 |
| Serverless 代理 | API Key 前端零暴露，SSE 流式透传 |
| Agent 工作流 | AI 主动分析数据、决策薄弱点、调用工具生成闪卡 |
| 多模态集成 | 视觉模型 + 语音识别 + 语音合成 |
| JSON 三重容错 | AI 生成结构化数据成功率 95%+ |
| 智能降级 | RAG 失败时展示原文片段，功能永不断线 |

---

## 🛣️ 路线图

- [x] 智能笔记 + Markdown + LaTeX
- [x] AI 摘要 / 扩展 / 自测题 / 闪卡 / 导图 / 辨析
- [x] FSRS 间隔重复算法
- [x] 错题本 + AI 复习计划
- [x] 拍题解析（多模态）
- [x] 语音输入（腾讯云 ASR）
- [x] 闪卡朗读（浏览器 TTS）
- [x] RAG 文档问答
- [x] 学习周报
- [x] 云端同步（Supabase）
- [ ] 向量 RAG（语义检索）
- [ ] PWA 离线支持
- [ ] 移动端 App

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交修改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。你可以自由使用、修改、分发本项目，但请保留原作者信息。

---

## 👤 作者

**RobotMsLi**

- GitHub：[@RobotMsLi](https://github.com/RobotMsLi)
- 项目地址：[AIWorkStudyHub](https://github.com/RobotMsLi/AIWorkStudyHub)

---

## 🙏 致谢

感谢以下开源项目与服务：

- [marked](https://github.com/markedjs/marked) — Markdown 渲染
- [KaTeX](https://katex.org/) — 数学公式渲染
- [Supabase](https://supabase.com/) — 云端数据服务
- [Netlify](https://www.netlify.com/) — Serverless 部署
- [通义千问](https://help.aliyun.com/zh/dashscope/) — 大语言模型
- [腾讯云](https://cloud.tencent.com/) — 语音识别服务


