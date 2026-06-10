# AHA — 创意生长工作台

> **从思考到实现的可视化创意工作台。**
> 
> 一个本地优先、AI 辅助的创意过程管理工具。像倾倒散点到永不装满的抽屉，再让 AI 帮你长出脉络、发现关联，最终修剪出一棵清晰的思考树。

---

## 技术栈

| 层级 | 技术 |
|:---|:---|
| **桌面壳** | Tauri v2 (Rust) |
| **前端** | React 18 + TypeScript + Vite |
| **样式** | Tailwind CSS v4 |
| **可视化** | @antv/g6 v5 |
| **状态** | Zustand + zundo |
| **动画** | motion (Framer Motion) |
| **AI** | ai SDK + SSE 流式 |
| **缓存** | Dexie.js (IndexedDB) |
| **测试** | Vitest + Playwright |

---

## 快速开始

### 环境要求

- Node.js ≥ 20
- Rust toolchain (tauri-cli)
- macOS / Linux / Windows

### 安装

```bash
npm install
```

### 开发

```bash
npm run dev          # 启动 Vite 开发服务器 (localhost:1420)
npm run tauri dev    # 启动 Tauri 桌面应用
```

### 构建

```bash
npm run build        # 前端生产构建
npm run tauri build  # 打包桌面应用
```

### 测试

```bash
npm test             # Vitest 单元测试
npm run test:e2e     # Playwright E2E 测试
cd src-tauri && cargo test   # Rust 测试
```

### 代码规范

```bash
npm run lint         # ESLint
npm run format       # Prettier
npm run format:check # 格式检查
```

---

## 架构概览

```
src/
├── domain/              # 纯函数领域层（零外部依赖）
│   ├── graph-engine/    # 图数据结构与操作
│   ├── ai-engine/       # AI 任务编排与提示词
│   ├── memory-system/   # 核心记忆 & L2 上下文
│   ├── deviation-detector/
│   ├── review-engine/
│   └── summary-generator/
├── application/         # 应用服务（编排领域 + 基础设施）
│   └── services/
├── infrastructure/      # 外部适配器
│   ├── ai/              # AI Gateway、Provider、Adapter
│   ├── filesystem/      # Tauri FS 封装
│   ├── git/             # Tauri Git 封装
│   ├── credentials/     # 系统钥匙串存储
│   └── cache/           # Dexie 本地缓存
├── presentation/        # React UI 层
│   ├── components/      # AhaMode / ZenMode / 通用
│   ├── stores/          # Zustand 全局状态
│   └── hooks/           # 复用逻辑
└── styles/              # Tailwind + CSS 变量主题
```

---

## 核心概念

- **Aha 模式** — 快速倾倒想法，无需整理结构。
- **Zen 模式** — 在可交互的力导向图中审视、关联、修剪想法。
- **AI 引擎** — 自动生成延伸方向、扮演魔鬼代言人、扫描关联、检测偏离。
- **Git 原生** — 每个想法都是一次 commit，完整保留思考演变历史。
- **主题与快捷键** — 支持 Light / Dark / System 主题；全局快捷键（⌘F 搜索、⌘E 导出、⌘Z 撤销等）。

---

## 安全与隐私

- **API Key** 仅存储在系统钥匙串（`tauri-plugin-keyring`），配置文件中只保存引用标识。
- **本地优先** — 所有项目数据与 Git 仓库均保存在用户本地磁盘。
- **AI 协议** — 默认使用 OpenAI 兼容协议（SSE 流式），支持绝大多数云端或本地模型；原生 Anthropic 协议单独适配。

---

## 开源协议

MIT License
