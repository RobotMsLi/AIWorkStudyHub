AI 学习工作台

前端 AI 学习工具，包含：笔记、闪卡（FSRS）、思维导图、概念辨析、文档 RAG、学习统计。
后端只有一个 Netlify Function：`netlify/functions/ai-proxy.js`，负责转发 AI 流式请求。

目录结构
netlify-stream-test/
├── index.html        ＃页面结构
├── README.md     ＃说明文档
├── netlify.toml        # Netlify 部署配置
├── package.json      #项目依赖
├── css/
│   └── style.css        ＃全部样式
├── js/
│   ├── 01-core.js   #常量/工具/存储/云同步/状态/LLM 流/FSRS/UI工具
│   ├── 02-ai.js       #AI提示词+Al 功能
│   ├── 03-cloud.js   ＃登录/注册/退出
│   ├── 04-views.js   ＃数据操作/侧栏/路由/全部视图
│   ├── 05-chat.js     #AI 聊天面板
│   ├── 06-cmdk.js   #命令面板
│   └── 07-app.js   #事件绑定+初始化入口
└── netlify/
    └── functions/
        └── ai-proxy.js   #AI代理（流式转发）


 部署步骤

 1. 上传到 Netlify把整个 `AI Work‑Study Hub/` 文件夹拖到 Netlify 的 **Deploys** 区域即可。

### 2. 配置环境变量
在 Netlify 后台：**Site settings → Environment variables**，添加：

| Key | 说明 | 示例 |
|---|---|---|
| `AI_API_KEY` | AI 服务商 API Key（必填） | `sk-xxxxxxxx` |
| `AI_BASE_URL` | 服务商兼容地址（可选） | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `AI_MODEL` | 默认模型（可选） | `qwen-turbo` |

### 3. 重新部署
添加环境变量后，点 **Trigger deploy → Deploy site** 让变量生效。

## 本地开发

```bash
npm i -g netlify-cli
netlify dev