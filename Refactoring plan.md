# AHA — 审计修复与重构计划

**版本：** v1.0  
**日期：** 2026-06-12  
**依据：** 2026-06-12 全面代码审计报告  
**决策：** 保留 ChatView，修正产品定位表述

---

## 总览

| 轮次 | 名称 | 任务数 | 工期 | 产出 |
|:---|:---|:---|:---|:---|
| Round 1 | 阻止性修复 | 4 | 1天 | 无崩溃、无架构违规、API Key 持久化 |
| Round 2 | 产品对齐 | 7 | 1-2天 | 产品方案/架构文档更新、死代码清理、动画修复、shared/建立 |
| Round 3 | 功能补全 | 7 | 1-2天 | 偏离检测、L3归档、魔鬼代言人UI、记忆系统正确连线 |
| Round 4 | 质量补强 | 8 | 2-3天 | 测试覆盖、错误处理、ARIA、Zod验证、git merge修复、per-project路由 |

**总工期：5-8天**

---

## Round 1: 阻止性修复

> **目标：** 消除运行时崩溃和架构违规，达到可安全继续开发的状态。

### Task 1.1 — 修复 AIService 缺失 `memory` 属性

**当前问题：** `useAIChat.ts` 调用 `AIService.getInstance().memory.getCoreMemory()`，但 `AIService` 类未暴露 `memory` 字段。运行时抛出 `TypeError`。

**修改文件：**

1. `src/application/services/AIService.ts`
   - 添加 `public memory: MemorySystem` 属性
   - 在 `configure()` 中初始化：`this.memory = new MemorySystem({ graphData, coreMemory })`
   - 暴露 `getCoreMemory()` 和 `buildL2Context()` 代理方法

2. `src/presentation/hooks/useAIChat.ts`
   - 将 `AIService.getInstance().memory.getCoreMemory()` 调用包装 try/catch
   - 找不到 coreMemory 时使用 fallback 空值

**验收标准：**
- [ ] `npm run build` 通过
- [ ] `useAIChat.send()` 运行时不抛 TypeError
- [ ] `AIService.getInstance().memory` 非 undefined

---

### Task 1.2 — 修复 UndoRedoButtons 不响应状态变化

**当前问题：** `UndoRedoButtons.tsx` 使用 `useAppStore.temporal.getState()` 同步快照，不是响应式订阅。`canUndo`/`canRedo` 永不更新。

**修改文件：**

1. `src/presentation/components/ZenMode/UndoRedoButtons.tsx`
   - 使用 zustand 的响应式订阅模式：
   ```tsx
   const canUndo = useAppStore(
     (s) => (s as any)._temporal?.pastStates?.length > 0
   );
   const canRedo = useAppStore(
     (s) => (s as any)._temporal?.futureStates?.length > 0
   );
   ```
   - 或创建专门的 temporal selector

**验收标准：**
- [ ] 初始状态 undo/redo 按钮为 disabled
- [ ] 进行一次操作后 undo 按钮变为 enabled
- [ ] 点击 undo 后 redo 按钮变为 enabled
- [ ] 点击 redo 后 redo 按钮变回 disabled

---

### Task 1.3 — 修复 API Key 输入后未持久化

**当前问题：** `ProviderEditor.tsx` 中用户输入 API Key → 构造 `ProviderConfig.apiKeyRef` → 但从未调用 `credentialStore.storeKey()` 将 Key 存入系统密钥链。页面刷新后 Key 丢失。

**修改文件：**

1. `src/presentation/components/Settings/ProviderEditor.tsx`
   - 在 `handleSave` 中，`addProvider(config)` 之前调用：
   ```ts
   await credentialStore.storeKey(config.id, apiKey);
   ```
   - key 输入框的值在保存后立即清空（UI 不再持有明文）
   - 添加保存成功/失败的 toast 提示

2. `src/presentation/stores/aiSettingsStore.ts`
   - `addProvider` action 内部不再存储 key 明文
   - `apiKeyRef` 字段的值设为 provider id（作为 keychain 查找 key）

**验收标准：**
- [ ] 添加供应商 → 输入 API Key → 保存
- [ ] 在 macOS Keychain Access 中搜索 `aha-ai-provider` 能看到对应条目
- [ ] 重启应用后 API Key 无需重新输入
- [ ] ProviderConfig 的 JSON 文件中不含 Key 明文

---

### Task 1.4 — 修复 AIEngine 跨层引用基础设施类型

**当前问题：** `src/domain/ai-engine/AIEngine.ts` 导入 `@infrastructure/ai/types`，违反"领域层零外部依赖"核心架构原则。

**修改文件：**

1. 新建 `src/shared/types/ai.ts`
   - 从 `src/infrastructure/ai/types.ts` 移入：
     - `AITaskType`（`'extension' | 'devils-advocate' | 'association-scan' | 'deviation-detect' | 'summary'`）
     - `ChatMessage`
     - `StreamChunk`

2. `src/infrastructure/ai/types.ts`
   - 将上述三个类型改为从 `@shared/types/ai` re-export
   - 保留仅 infrastructure 层使用的类型（`AIAdapter`, `ProviderConfig`, `ModelRef`, 等）

3. `src/domain/ai-engine/AIEngine.ts`
   - 将 `import { ... } from '@infrastructure/ai/types'` 改为 `import { ... } from '@shared/types/ai'`
   - 确认不再有任何 `@infrastructure` 或 `@presentation` 的 import

4. 检查所有文件中的 import 路径：
   ```bash
   grep -r "@infrastructure" src/domain/ && echo "VIOLATIONS FOUND"
   grep -r "@presentation" src/domain/ && echo "VIOLATIONS FOUND"
   grep -r "from 'react'" src/domain/ && echo "VIOLATIONS FOUND"
   ```

**验收标准：**
- [ ] `grep -r "@infrastructure" src/domain/` 无输出
- [ ] `grep -r "@presentation" src/domain/` 无输出
- [ ] `grep -r "from 'react'" src/domain/` 无输出
- [ ] `npm run build` 通过
- [ ] 所有现有测试通过（`npm test`）

---

## Round 2: 产品对齐

> **目标：** 文档与代码一致，清理死代码和架构冗余。

### Task 2.1 — 更新产品方案中的 ChatView 定位

**修改文件：**

1. `Product plan.md`
   - §1.2 "不是 AI聊天工具" 行 → 改为：
     ```
     | AI聊天工具（ChatGPT, Claude） | ChatView 是输入手段，节点才是持久化结果；对话不直接构成图谱 |
     ```
   - §3.2 "确认才是分支"机制 → 增加一段：
     ```
     **ChatView 中的对话也遵循此机制：**
     - Aha 模式和 Zen 模式右侧的 ChatView 用于与 AI 探讨想法
     - AI 回复中的有价值内容，用户可选择"提取为固化分支"
     - 未被提取的对话内容仅作为聊天历史保留，不进入脉络图
     ```
   - §2.2 AI的角色与态度 → 增加一行：
     ```
     | **对话模式** | ChatView 中 AI 可进行多轮对话，但所有 AI 生成内容需用户确认才能成为节点 |
     ```

2. `Architecture design.md`
   - §2.1.1 组件树 → 补充 ChatView 链：
     ```
     AhaMode
     ├── ChatView (左侧45%，AI对话输入)
     │   └── ChatMessage (消息气泡)
     ├── CardFlow (右侧55%，节点卡片流)
     ├── AIStatusBar
     └── SettingsEntry
     
     ZenMode
     ├── GraphCanvas (左侧65%)
     ├── ZenChatView (右侧35%，上下文感知对话)
     └── ...
     ```

**验收标准：**
- [ ] 产品方案不再声称"不是AI聊天工具"
- [ ] ChatView 的定位被清晰定义："输入手段，非持久化结果"
- [ ] 架构组件树与实际代码一致

---

### Task 2.2 — 删除已确认废弃的组件

**当前问题：** `QuickInput`、`NodeStack`、`QuickZenButton`、`MobileQuickInput` 均基于已废弃的 Aha 模式交互设计。保留 ChatView 后不再需要。

**修改文件：**

1. 删除以下文件：
   - `src/presentation/components/AhaMode/QuickInput.tsx`
   - `src/presentation/components/AhaMode/NodeStack.tsx`
   - `src/presentation/components/AhaMode/QuickZenButton.tsx`
   - `src/presentation/components/AhaMode/MobileQuickInput.tsx`
   - `src/presentation/hooks/useMediaQuery.ts`

2. 检查是否有其他文件 import 了这些组件，移除 import 语句

**验收标准：**
- [ ] `npm run build` 通过（无未引用 import 报错）
- [ ] `grep -r "QuickInput\|NodeStack\|QuickZenButton\|MobileQuickInput\|useMediaQuery" src/` 无输出

---

### Task 2.3 — 移除双重动画

**当前问题：** `App.tsx` 和 `AhaMode.tsx`/`ZenMode.tsx` 各包一层 `motion.div` 做 opacity 动画，导致双倍过渡。

**修改文件：**

1. `src/presentation/components/AhaMode/AhaMode.tsx`
   - 移除外层 `<motion.div initial/animate/exit>`，改为普通 `<div>`
   - 保留内部 `<motion.div layout>` 的布局动画

2. `src/presentation/components/ZenMode/ZenMode.tsx`
   - 移除外层 `<motion.div initial/animate/exit>`，改为普通 `<div>`
   - 保留内部 `<motion.div layout>` 的布局动画

3. `src/App.tsx`
   - 包装层 `AnimatePresence + motion.div key={mode}` 不变（这是唯一的模式过渡动画）

**验收标准：**
- [ ] Aha↔Zen 切换时仅有单层 opacity 过渡，无双重闪烁
- [ ] 内部 layout 动画（面板宽度变化）正常

---

### Task 2.4 — 建立 `src/shared/types/` 并在必要时迁移类型

**当前问题：** `src/shared/types/` 目录存在但为空。共享类型分散在各层。

**新建文件：**

1. `src/shared/types/ai.ts` — 详见 Task 1.4

2. `src/shared/types/index.ts` — barrel export
   ```ts
   export * from './ai';
   ```

**迁移检查：** 审计中发现以下类型可能属于 shared，评估后决定是否迁移：
- `AITaskType`, `ChatMessage`, `StreamChunk` → 已在 Task 1.4 迁移
- `GraphData`, `ThoughtNode`, `Edge` → 留在 domain/graph-engine（领域概念）
- `CoreMemory`, `L2Context` → 留在 domain/memory-system（领域概念）

**验收标准：**
- [ ] `src/shared/types/` 目录非空
- [ ] 所有跨层使用的纯数据类型在 shared 中有定义
- [ ] `npm run build` 通过

---

### Task 2.5 — 处理空的 `styles/` 目录

**修改：** 删除空目录 `src/presentation/styles/`，或在其下创建 `tokens.css` 集中管理设计 tokens（从 `global.css` 中提取 `@theme` 块）。

**建议：** 删除空目录。设计 tokens 保持在 `global.css` 的 `@theme` 块中，Tailwind 4 推荐此模式。

```bash
rmdir src/presentation/styles/ 2>/dev/null || true
```

**验收标准：**
- [ ] 无空目录在 `src/presentation/styles/` 下

---

### Task 2.6 — 清理 `tsconfig.json` 中的冗余 paths

**当前问题：** `src/tsconfig.json` 曾被错误创建（后删除），但应确认 paths 配置正确。

**修改：** 无需修改。`tsconfig.json` 已在项目根目录正确配置，paths 与 vite.config.ts 的 alias 一致。

**验收标准：**
- [ ] `npx tsc --noEmit` 通过

---

### Task 2.7 — 清理未使用的 hooks 目录中所有文件

**当前问题：** `useMediaQuery` 已确认废弃（Task 2.2 删除）。检查其余 hooks 是否被引用。

**确认清单：**
- `useAIChat.ts` → 被 `AhaMode.tsx` 引用 ✅ 保留
- `useKeyboardShortcuts.ts` → 被 `ZenMode.tsx` 引用 ✅ 保留
- `useMediaQuery.ts` → 无引用 ❌ 已在 Task 2.2 删除

**验收标准：**
- [ ] 所有 `src/presentation/hooks/` 下的文件均有至少一个引用方

---

## Round 3: 功能补全

> **目标：** 补齐架构设计规定的关键功能缺口。

### Task 3.1 — `handleNewThoughts` 加入偏离检测

**修改文件：**

1. `src/application/services/ApplicationService.ts`
   - `handleNewThoughts` 方法中，在 `NodeManager.createNode` 之前插入：
   ```ts
   const ai = AIService.getInstance();
   if (ai.isConfigured) {
     const coreMemory = ai.memory.getCoreMemory();
     const recentTitles = ai.memory.getBuffer().map(n => n.title);
     const result = await ai.engine.detectDeviation(coreMemory, content, recentTitles);
     if (result.type === 'deviated') {
       return { nodes: [], deviation: result };
     }
   }
   ```
   - 返回类型增加 `deviation?: DeviationResult`

2. `src/presentation/components/AhaMode/AhaMode.tsx`
   - `handleSend` 中检查返回的 `deviation`：
   ```ts
   const result = await applicationService.handleNewThoughts(content, projectPath);
   if (result.deviation) {
     // 弹出偏离提示："这看起来是一个新话题..."
   }
   ```

**验收标准：**
- [ ] 输入与 L1 核心记忆偏离较大的内容时，弹出偏离询问
- [ ] 用户选择"随口说说"时，内容不创建节点
- [ ] 用户选择"与项目有关"时，正常创建节点

---

### Task 3.2 — `handlePruning` 调用 L3 记忆归档

**修改文件：**

1. `src/application/services/ApplicationService.ts`
   - `handlePruning` 方法中，在文件移动之后、git commit 之前插入：
   ```ts
   // 归档到 L3 远景记忆
   const ai = AIService.getInstance();
   await ai.memory.archiveToL3(nodeId, reason);
   ```

2. `src/domain/memory-system/MemorySystem.ts`
   - 新增 `archiveToL3(nodeId: string, reason: string)` 方法
   - 将节点状态标记为 archived，记录归档原因和时间

**验收标准：**
- [ ] 修剪节点后，MemorySystem 中该节点状态为 archived
- [ ] 归档原因和时间被正确记录

---

### Task 3.3 — AI 上下文组装改为走 MemorySystem

**当前问题：** `useAIChat.ts` 手动组装 L1/L2 上下文，绕过 MemorySystem。

**修改文件：**

1. `src/presentation/hooks/useAIChat.ts`
   - `buildSystemPrompt` 方法改为：
   ```ts
   const ai = AIService.getInstance();
   const coreMemory = ai.memory.getCoreMemory();
   const l2Context = ai.memory.buildL2Context(focusNodeId);
   return buildExtensionPrompt(coreMemory, l2Context);
   ```

2. `src/domain/memory-system/MemorySystem.ts`
   - 确保 `buildL2Context(focusNodeId)` 接受 nodeId 参数
   - 确认 `addToBuffer` 在 Aha 输入时被调用（由 ApplicationService 触发）

**验收标准：**
- [ ] AI 延展/对话的 system prompt 包含 L1 核心记忆
- [ ] user message 包含 L2 上下文（父节点、子节点、最近激活节点）
- [ ] L2 上下文随用户选中不同节点而动态变化

---

### Task 3.4 — 新增 NodeCard 上的恶魔代言人按钮

**修改文件：**

1. `src/presentation/components/ZenMode/NodeCard.tsx`
   - 在节点操作区新增按钮：`<DevilsAdvocateButton nodeId={node.id} />`
   - 图标：`ShieldAlert` (lucide-react)

2. 新建 `src/presentation/components/ZenMode/DevilsAdvocateButton.tsx`
   - 点击触发 `AIService.getInstance().engine.generateDevilsAdvocate()`
   - 流式输出到 ExtensionPanel 或内联展开区域
   - 支持 AbortController 取消

3. `src/application/services/ApplicationService.ts`
   - 新增 `triggerDevilsAdvocate(nodeId, signal?)` → AsyncIterable\<string\>

**验收标准：**
- [ ] 选中节点 → NodeCard 显示恶魔代言人按钮
- [ ] 点击 → AI 流式输出批判意见
- [ ] 可取消正在进行的批判生成

---

### Task 3.5 — ExtensionPanel 复用 AIService 单例

**当前问题：** 每次延展创建新的 MemorySystem 和 AIEngine 实例。

**修改文件：**

1. `src/presentation/components/ZenMode/ExtensionPanel.tsx`
   - 移除 `new MemorySystem()` 和 `new AIEngine()` 的局部创建
   - 改为 `const ai = AIService.getInstance()`
   - 使用 `ai.engine.generateExtensions(coreMemory, l2Context, signal)`
   - 使用 `ai.memory` 获取上下文

**验收标准：**
- [ ] ExtensionPanel 不再创建新的 MemorySystem/AIEngine
- [ ] 多次延展共享同一个记忆系统状态
- [ ] L2 上下文在多次延展间一致

---

### Task 3.6 — ReviewEngine 解析 severity 级别

**当前问题：** `ReviewEngine.generateCritique` 永远返回 `severity: 'suggestion'`。

**修改文件：**

1. `src/domain/review-engine/ReviewEngine.ts`
   - 在流式输出中解析 AI 返回的 severity 标记
   - AI prompt 中增加指令：每条批判意见加 `[SEVERITY: critical|warning|suggestion]` 前缀
   - parse 逻辑：
   ```ts
   function parseSeverity(text: string): CritiqueType {
     if (text.includes('[SEVERITY: critical]')) return 'critical';
     if (text.includes('[SEVERITY: warning]')) return 'warning';
     return 'suggestion';
   }
   ```
   - 每种 critique type 独立输出带 type 和 severity 的 chunk

2. `src/domain/ai-engine/prompts/devils-advocate.ts`
   - 更新 prompt：要求 AI 为每个批评点标注 severity
   - 格式：`[SEVERITY: critical] 核心逻辑漏洞：...`

**验收标准：**
- [ ] 恶魔代言人输出中能区分 critical / warning / suggestion
- [ ] 表示层根据 severity 显示不同的视觉样式（红/黄/蓝）

---

### Task 3.7 — ApplicationService 补齐缺失方法

**补充方法：**

1. `switchToAhaMode()` / `switchToZenMode()` — 简单的状态切换
2. `handleNodeSelection(nodeId)` — 选中节点 + 更新 L2 上下文
3. `triggerExtension(nodeId, signal?)` — 委托给 AIEngine
4. `triggerDevilsAdvocate(nodeId, signal?)` — 委托给 AIEngine
5. `cancelAIRequest()` — AbortController.abort()
6. `generateSummary()` — 委托给 AIEngine + SummaryGenerator

**文件：** `src/application/services/ApplicationService.ts`

---

## Round 4: 质量补强

> **目标：** 测试覆盖、健壮性、无障碍、性能。

### Task 4.1 — 异步 handler 加 try/catch

**修改文件：**
- `src/presentation/components/AhaMode/AhaMode.tsx` — `handleSend`
- `src/presentation/components/ZenMode/ContextMenu.tsx` — `handlePrune`, `handleMark`
- `src/presentation/components/ZenMode/ExtensionPanel.tsx` — `handleExtend`, `handleConfirm`

**模式：**
```ts
const handleSend = async (content: string) => {
  try {
    // ... 业务逻辑
  } catch (error) {
    console.error('handleSend failed:', error);
    // 显示错误通知
    useAppStore.getState().addNotification({
      type: 'error',
      message: error instanceof Error ? error.message : '操作失败',
    });
  }
};
```

---

### Task 4.2 — 模态框 ARIA + 焦点陷阱

**修改文件：**
- `ExportDialog.tsx`
- `SummaryModal.tsx`
- `AISettingsModal.tsx`

**每个模态框添加：**
- `role="dialog"` 和 `aria-modal="true"`
- `aria-labelledby` 指向标题
- 打开时聚焦第一个可聚焦元素
- Escape 键关闭
- 焦点陷阱（Tab/Shift+Tab 循环）
- 背景 `aria-hidden="true"` 在打开时

---

### Task 4.3 — OpenAICompatAdapter.generateStructured 加 Zod 验证

**修改文件：**

1. `src/infrastructure/ai/adapters/OpenAICompatAdapter.ts`
   - `generateStructured<T>` 签名改为接受 `schema: ZodSchema<T>`
   - JSON.parse 后用 `schema.parse(data)` 验证
   - 验证失败时 retry（最多 1 次）

2. `src/infrastructure/ai/adapters/AnthropicAdapter.ts`
   - 同样修改

3. `src/infrastructure/ai/AIGateway.ts`
   - `generateStructured` 签名增加 `schema: ZodSchema<T>`，透传给 adapter

**验收标准：**
- [ ] 结构化输出经过 Zod 验证后才返回
- [ ] 验证失败时有明确的错误信息
- [ ] 类型安全，返回类型直接从 Zod schema 推断

---

### Task 4.4 — 基础设施层单元测试

| 文件 | 测试文件 | 覆盖重点 |
|:---|:---|:---|
| `ProviderRegistry.ts` | `ProviderRegistry.test.ts` | CRUD、重复注册、getModel |
| `ModelRouter.ts` | `ModelRouter.test.ts` | resolve、validate、fallback |
| `AIGateway.ts` | `AIGateway.test.ts` | 路由链、错误分类、streamGenerate mock |
| `AdapterFactory.ts` | 已有 2 个测试 | 补充 Anthropic path |
| `OpenAICompatAdapter.ts` | `OpenAICompatAdapter.test.ts` | stream/structured、SSE解析、认证方式 |
| `DexieCache.ts` | `DexieCache.test.ts` | CRUD、bulk get |
| `TauriGitService.ts` | `TauriGitService.test.ts` | mock invoke 调用 |
| `TauriFileSystemService.ts` | `TauriFileSystemService.test.ts` | mock invoke 调用 |

---

### Task 4.5 — 表示层组件测试 + E2E

**组件测试（Vitest + RTL）：**
| 组件 | 覆盖 |
|:---|:---|
| ModeSwitch | 渲染、点击切换 |
| AhaMode | ChatView 渲染、CardFlow 渲染 |
| ZenMode | 画布渲染、工具栏、NodeCard |
| AISettingsModal | 打开/关闭、添加供应商 |
| ExtensionPanel | 流式输出、确认分支 |
| ContextMenu | 修剪、标记主干 |
| SearchPanel | 搜索、结果渲染 |
| UndoRedoButtons | 按钮状态 |

**E2E（Playwright）：**
| 流程 | 覆盖 |
|:---|:---|
| Aha→Zen 切换 | 模式切换动画、状态保持 |
| 添加 AI 供应商 | 完整配置流程 |
| AI 延展→确认分支 | 流式输出、节点创建 |

---

### Task 4.6 — 修复 Rust `git_merge_branch`

**当前问题：** 当前实现创建合成 merge commit 但未实际合并两棵 tree 的内容。

**修改文件：**

1. `src-tauri/src/git_commands.rs`
   - 使用 `repo.merge()` + `merge_analysis()` + `merge()` API：
   ```rust
   let annotated = repo.find_annotated_commit(merge_commit_id)?;
   let (analysis, _pref) = repo.merge_analysis(&[&annotated])?;
   if analysis.is_normal() {
       repo.merge(&[&annotated], None, None)?;
       // 处理冲突...
       let mut index = repo.index()?;
       let tree_id = index.write_tree()?;
       let tree = repo.find_tree(tree_id)?;
       // 创建 merge commit
       repo.commit(Some("HEAD"), &sig, &sig, "Merge: ...", &tree, &[&head_commit, &merge_commit])?;
   }
   ```

**验收标准：**
- [ ] `cargo test` 通过（含新的 merge 测试）
- [ ] 两个分支的文件变更正确合并到 merge commit 的 tree 中

---

### Task 4.7 — per-project 路由表

**当前问题：** ModelRoutingTable 是全局单例，所有项目共享同一路由。

**修改文件：**

1. `src/infrastructure/ai/ModelRouter.ts`
   - `setRoutingTable(projectId, routing)`
   - `getRoutingTable(projectId)`
   - `resolve(projectId, taskType)`
   - 内部维护 `Map<string, ModelRoutingTable>`

2. `src/infrastructure/ai/AIGateway.ts`
   - `streamGenerate` 和 `generateStructured` 增加 `projectId` 参数
   - 路由时传入 `projectId`

3. `src/presentation/stores/aiSettingsStore.ts`
   - `routing` 改为 `Map<projectId, ModelRoutingTable>`

**验收标准：**
- [ ] 项目 A 和项目 B 可配置不同的模型路由
- [ ] 切换项目时路由自动切换
- [ ] 向后兼容：未配置路由的项目 fallback 到全局默认路由

---

### Task 4.8 — 代码质量和一致性

**修改项：**

1. `src-tauri/src/git_commands.rs`
   - `git_switch_branch` 添加 `Force` checkout option 处理工作区变更

2. `src/infrastructure/ai/adapters/OpenAICompatAdapter.ts`
   - 实现 `query-param` 认证类型（当前注释标记为未实现）

3. `src/infrastructure/filesystem/TauriFileSystemService.ts`
   - `_projectPathFromNodePath` 路径解析加固

4. `src/application/services/ProjectService.ts`
   - `openProject` 从 `project-constitution.md` 读取项目名称（而非从第一个节点标题）

5. `src/presentation/components/Settings/ProviderEditor.tsx`
   - 添加重复 ID 检查
   - 添加模型能力配置（context window、output tokens）

6. `src/presentation/components/ZenMode/NodeCard.tsx`
   - 硬编码颜色改为 CSS 变量

---

## 执行顺序与依赖

```
Round 1 (阻塞) ──────────────────────────┐
  T1.1 ─┬─ T1.2                          │ 无依赖，可并行
  T1.3 ─┤                                 │
  T1.4 ─┘                                 │
                                          │
Round 2 (对齐) ──────────────────────────┤
  T2.1 (文档) ── 无依赖                   │
  T2.2 (删除) ── 需 Round 1 完成          │
  T2.3 (动画) ── 无依赖                   │
  T2.4 (shared) ── 依赖 T1.4              │
  T2.5 (styles) ── 无依赖                 │
  T2.6 (tsconfig) ── 无依赖               │
  T2.7 (hooks) ── 无依赖                  │
                                          │
Round 3 (功能) ──────────────────────────┤
  T3.1 ─── 依赖 T1.1 (AIService.memory)   │
  T3.2 ─── 依赖 T1.1                      │
  T3.3 ─── 依赖 T1.1 + T3.1              │
  T3.4 ─── 无依赖，可并行                 │
  T3.5 ─── 依赖 T1.1                      │
  T3.6 ─── 无依赖，可并行                 │
  T3.7 ─── 依赖 T1.1                      │
                                          │
Round 4 (质量) ──────────────────────────┘
  T4.1 ─── 依赖 Round 3 完成
  T4.2 ─── 无依赖
  T4.3 ─── 依赖 T1.4
  T4.4 ─── 无依赖（可随时开始）
  T4.5 ─── 依赖 Round 2+3 完成
  T4.6 ─── 无依赖
  T4.7 ─── 依赖 T1.4 + T3.7
  T4.8 ─── 无依赖（可随时开始）
```

---

## 验收检查清单

完成全部四轮后验证：

- [ ] `npm run build` 通过
- [ ] `npm test` 全绿
- [ ] `cargo test` 全绿（src-tauri/）
- [ ] `grep -r "@infrastructure" src/domain/` 无输出
- [ ] API Key 在系统密钥链中持久化
- [ ] Undo/Redo 按钮响应状态变化
- [ ] 偏离检测在输入时触发
- [ ] 恶魔代言人按钮可用
- [ ] 模态框有 ARIA 属性和焦点陷阱
- [ ] ChatView 定位在产品和架构文档中已更新
- [ ] 无死代码（QuickInput, NodeStack 等已删除）
- [ ] Aha↔Zen 过渡无双重视觉闪烁
- [ ] 基础设施层核心模块有测试覆盖
