# AHA — 完整实施计划

**版本：** v1.0  
**状态：** 就绪，待执行  
**关联文档：** [Product plan.md](Product%20plan.md) · [Architecture design.md](Architecture%20design.md) · [CLAUDE.md](CLAUDE.md)

---

## 总览

| 阶段 | 名称 | 周期估算 | 核心产出 |
|:---|:---|:---|:---|
| Phase 1 | 核心骨架 | 1-2周 | 可交互的空脉络图、文本输入→创建节点→图上显示 |
| Phase 2 | Git与数据 | 1周 | git2-rs 集成、节点文件读写、自动化版本管理 |
| Phase 3 | AI引擎 | 2-3周 | AI 网关、延展/恶魔代言人/关联扫描/偏离检测、L1/L2记忆 |
| Phase 4 | 完整工作流 | 1-2周 | Aha↔Zen切换、确认分支、修剪归档、主干标记、导出 |
| Phase 5 | 润色与交付 | 1-2周 | Summary、移动端PWA、性能优化、交互打磨 |
| Phase 6 | 测试与发布 | 1周 | 测试覆盖、CI/CD、文档、发布 |

**总计估算：7-11周**

---

## Phase 1: 核心骨架

> **目标：** 一个可运行的桌面应用，能输入文字、创建节点、在脉络图上看到节点，能拖拽和缩放。

### 1.1 领域层 — 核心模型

#### Task 1.1.1: 核心类型定义
- **文件：** `src/domain/graph-engine/types.ts`
- **产出：**
  - `ThoughtNode` 接口（id, title, content, createdAt, updatedAt, status, tags, position, metadata）
  - `Edge` 接口（id, sourceId, targetId, type, label, confidence）
  - `AISuggestedEdge` 接口（继承 Edge，增加 reason）
  - `Cluster` 接口（id, label, nodeIds, color）
  - `MainBranch` 接口（id, name, nodeIds, createdAt）
  - `GraphData` 接口（nodes, edges, clusters, aiSuggestions, mainBranches）
  - `EdgeType` 联合类型（'ai-suggested' | 'user-confirmed' | 'main-path'）
  - `NodeStatus` 联合类型（'active' | 'archived' | 'main-branch'）
- **验收：** 所有类型有完整 JSDoc，通过 TypeScript 编译
- **依赖：** 无

#### Task 1.1.2: 图引擎核心逻辑
- **文件：** `src/domain/graph-engine/GraphEngine.ts`
- **产出：**
  - `createNode(title, content?)` → ThoughtNode（自动生成 id、时间戳）
  - `updateNodeContent(nodeId, content)` → ThoughtNode（更新 updatedAt）
  - `removeNode(nodeId)` → void
  - `addEdge(sourceId, targetId, type)` → Edge
  - `removeEdge(edgeId)` → void
  - `markAsMainBranch(nodeId, name)` → MainBranch
  - `getMainBranches()` → MainBranch[]
  - `archiveBranch(nodeId, reason)` → void（状态改为 archived）
  - `getArchivedBranches()` → ArchivedBranch[]
  - `buildGraphData(nodes, edges)` → GraphData
  - `toG6Format(graphData)` → G6GraphData（适配 G6 v5 NodeData/EdgeData/ComboData 格式）
  - `detectMainPath(startNodeId, graphData)` → string[]（最长路径）
  - `findShortestPath(fromId, toId, graphData)` → string[]
- **验收：** 所有函数为纯函数，零外部依赖，有完整 TypeScript 类型标注
- **测试文件：** `src/domain/graph-engine/GraphEngine.test.ts`
- **依赖：** Task 1.1.1

#### Task 1.1.3: 节点管理器
- **文件：** `src/domain/graph-engine/NodeManager.ts`
- **产出：**
  - `NodeManager` 类
  - `createNode(title, content?)` → ThoughtNode（生成 id、slug、时间戳、默认 status='active'）
  - `generateSlug(title)` → string（中文转拼音或保留原文的 slug）
  - `validateNode(node)` → boolean
- **验收：** 纯逻辑，无副作用
- **测试文件：** `src/domain/graph-engine/NodeManager.test.ts`
- **依赖：** Task 1.1.1

### 1.2 基础设施层 — 文件系统

#### Task 1.2.1: Rust 文件操作命令
- **文件：** `src-tauri/src/fs_commands.rs`
- **产出：**
  - `write_node(project_path, filename, content)` → Result<String, String>
  - `read_node(project_path, filename)` → Result<String, String>
  - `read_graph_index(project_path)` → Result<String, String>
  - `write_graph_index(project_path, content)` → Result<String, String>
  - `create_project_dirs(project_path)` → Result<String, String>（创建 nodes/、archive/、exports/）
  - `delete_node(project_path, filename)` → Result<String, String>
- **验收：** 通过 `cargo test`，能正确读写文件
- **依赖：** 无（独立 Rust 模块）

#### Task 1.2.2: TypeScript 文件系统服务
- **文件：** `src/infrastructure/filesystem/TauriFileSystemService.ts`
- **产出：**
  - `TauriFileSystemService` 类，实现 `FileSystemService` 接口
  - `writeNode(nodePath, content)` → Promise\<void\>
  - `readNode(nodePath)` → Promise\<string\>
  - `deleteNode(nodePath)` → Promise\<void\>
  - `readGraphIndex(projectPath)` → Promise\<GraphIndex\>
  - `writeGraphIndex(projectPath, index)` → Promise\<void\>
  - `createProjectDirs(projectPath)` → Promise\<void\>
  - 所有方法通过 `invoke()` 调用 Rust 命令
- **验收：** 类型安全，错误处理完善
- **依赖：** Task 1.2.1

### 1.3 表示层 — UI 骨架

#### Task 1.3.1: G6 画布组件
- **文件：** `src/presentation/components/ZenMode/GraphCanvas.tsx`
- **产出：**
  - 使用 `@antv/g6` v5 初始化空画布
  - 支持力导向布局
  - 支持节点拖拽（drag-element）、画布缩放（zoom-canvas）、画布平移（drag-canvas）
  - 支持 fitView 自适应
  - 从 AppState 读取 graphData 并渲染
- **验收：** 画布可渲染、可交互
- **依赖：** Task 1.1.2（toG6Format）

#### Task 1.3.2: Zustand 应用状态
- **文件：** `src/presentation/stores/appStore.ts`
- **产出：**
  - `useAppStore` — Zustand store + zundo temporal middleware
  - `AppState` 接口（mode, currentProject, graphData, selectedNodeId, ...）
  - Actions：`setMode`, `setGraphData`, `selectNode`, `addNode`, `moveNode`, `addEdge`, `removeEdge`, `archiveNode`
  - zundo 仅追踪 graphData 变更，limit 50
- **验收：** 状态变更正确触发 UI 重渲染，undo/redo 可用
- **依赖：** Task 1.1.1

#### Task 1.3.3: Aha 模式完善
- **文件：** `src/presentation/components/AhaMode/AhaMode.tsx` `QuickInput.tsx`
- **产出：**
  - QuickInput 组件：底部固定输入条，回车提交
  - 输入→创建节点→更新 store
  - 显示最近节点列表（NodeStack）
  - 即时 Zen 入口按钮（QuickZenButton）
- **验收：** 输入文字→回车→节点创建→store 更新
- **依赖：** Task 1.2.2, Task 1.3.2

#### Task 1.3.4: Zen 模式完善
- **文件：** `src/presentation/components/ZenMode/ZenMode.tsx`
- **产出：**
  - 集成 GraphCanvas
  - 集成 NodeCard（点击节点弹出卡片）
  - 集成 GraphToolbar（缩放、布局切换、筛选）
  - MiniMap 小地图
  - UndoRedoButtons
- **验收：** 切换到 Zen 模式可见画布 + 工具栏 + 节点卡片
- **依赖：** Task 1.3.1, Task 1.3.2

#### Task 1.3.5: 模式切换动画
- **文件：** `src/presentation/components/common/ModeSwitch.tsx` `src/App.tsx`
- **产出：**
  - ModeSwitch 按钮 + Motion AnimatePresence 过渡
  - Aha→Zen：文字下沉消失，画布从散布收敛
  - Zen→Aha：画布淡出，输入界面淡入
- **验收：** 切换流畅无抖动
- **依赖：** Task 1.3.3, Task 1.3.4

### Phase 1 验收标准

- [ ] `npm run build` 前端构建通过
- [ ] `cargo check` Rust 编译通过
- [ ] `npm test` Vitest 领域层测试通过
- [ ] 启动应用 → Aha 模式输入文字 → 节点出现在画布上
- [ ] Zen 模式 → 节点可拖拽 → 画布可缩放和平移
- [ ] Aha ↔ Zen 模式切换有流畅动画
- [ ] 撤销/重做可用

---

## Phase 2: Git与数据

> **目标：** 每个节点=一个 Markdown 文件，每个操作自动 git commit。项目数据完全可溯源。

### 2.1 git2-rs Rust 命令

#### Task 2.1.1: Git 核心操作
- **文件：** `src-tauri/src/git_commands.rs`
- **产出：**
  - `git_init(path)` → Result\<String, String\>（初始化仓库）
  - `git_add(repo_path, file_path)` → Result\<String, String\>
  - `git_commit(repo_path, message)` → Result\<String, String\>（返回 commit hash）
  - `git_rm(repo_path, file_path)` → Result\<String, String\>
  - `git_status(repo_path)` → Result\<GitStatusResult, String\>
  - `git_log(repo_path, file_path?, limit?)` → Result\<Vec\<CommitLog\>, String\>
  - `git_diff(repo_path, commit_a, commit_b)` → Result\<DiffResult, String\>
- **验收：** `cargo test` 所有命令测试通过
- **依赖：** 无

#### Task 2.1.2: Git 版本管理
- **文件：** `src-tauri/src/git_commands.rs`（追加）
- **产出：**
  - `git_create_branch(repo_path, name)` → Result\<String, String\>
  - `git_switch_branch(repo_path, name)` → Result\<String, String\>
  - `git_merge_branch(repo_path, name)` → Result\<String, String\>
  - `git_create_tag(repo_path, name, message)` → Result\<String, String\>
  - `git_list_tags(repo_path)` → Result\<Vec\<String\>, String\>
- **验收：** `cargo test` 通过
- **依赖：** Task 2.1.1

### 2.2 TypeScript Git 服务

#### Task 2.2.1: TauriGitService
- **文件：** `src/infrastructure/git/TauriGitService.ts`
- **产出：**
  - `TauriGitService` 类，实现 `GitService` 接口
  - 封装所有 `invoke()` 调用
  - `init(projectPath)` → Promise\<void\>
  - `commit(message)` → Promise\<string\>
  - `rm(filePath)` → Promise\<void\>
  - `createTag(name, message)` → Promise\<void\>
  - `createBranch(name)` → Promise\<void\>
  - `log(filePath?, limit?)` → Promise\<CommitLog[]\>
  - `diff(commitA, commitB)` → Promise\<DiffResult\>
  - `status()` → Promise\<GitStatus\>
- **验收：** 类型安全，错误处理覆盖
- **依赖：** Task 2.1.1, Task 2.1.2

### 2.3 项目数据管理

#### Task 2.3.1: 项目服务
- **文件：** `src/application/services/ProjectService.ts`
- **产出：**
  - `createProject(name, type, path)` — 创建目录结构 + git init + 写入 project-constitution.md
  - `openProject(path)` — 读取项目配置
  - 项目创建时生成 `project-constitution.md`（L1 核心记忆模板）
  - 项目创建时生成空 `graph-index.json`
- **验收：** 创建/打开项目完整可用，文件结构符合设计
- **依赖：** Task 1.2.1, Task 2.1.1

#### Task 2.3.2: 工作流编排 — 节点创建链路
- **文件：** `src/application/services/ApplicationService.ts`
- **产出：**
  - `handleNewThought(content)` 完整链路：
    1. NodeManager.createNode(content)
    2. FileSystemService.writeNode(path, content)
    3. GraphEngine.addNode(node) → 更新 graph-index.json
    4. FileSystemService.writeGraphIndex(path, index)
    5. GitService.add(nodeFile) + GitService.add('graph-index.json')
    6. GitService.commit("新灵感: {title}")
    7. 更新 AppState.graphData
- **验收：** 端到端链路可走通，每一步可独立 mock 测试
- **依赖：** Task 1.1.3, Task 1.2.2, Task 2.2.1, Task 2.3.1

### Phase 2 验收标准

- [ ] 创建项目 → 自动生成 .git/ + nodes/ + graph-index.json + project-constitution.md
- [ ] 创建节点 → nodes/{slug}.md 文件生成 → git commit 记录产生
- [ ] 查看 `git log` 能看到每次操作的 commit
- [ ] 节点文件内容为合法 Markdown

---

## Phase 3: AI引擎

> **目标：** AI 网关就绪，用户可自主配置供应商。延展、恶魔代言人、关联扫描、偏离检测全部可用。

### 3.1 AI 网关基础设施

#### Task 3.1.1: AI 适配器
- **文件：** `src/infrastructure/ai/adapters/OpenAICompatAdapter.ts`
- **产出：**
  - `OpenAICompatAdapter` 类
  - `generateStream(params)` → AsyncIterable\<StreamChunk\>
  - `generateStructured(params)` → Promise\<T\>
  - 支持 SSE 流式解析
  - 支持 `baseURL` 覆盖（对接 Ollama、DeepSeek、智谱等）
  - 支持 `authType` 差异化（bearer / custom-header）
  - 支持 `extraHeaders`
  - 使用 `fetch` + `AbortSignal`
- **验收：** 对接不同 baseURL 的 OpenAI-compatible 端点均可用
- **测试文件：** `src/infrastructure/ai/adapters/OpenAICompatAdapter.test.ts`
- **依赖：** 无（仅依赖 fetch）

#### Task 3.1.2: Anthropic 适配器
- **文件：** `src/infrastructure/ai/adapters/AnthropicAdapter.ts`
- **产出：**
  - `AnthropicAdapter` 类
  - 适配 Anthropic Messages API（SSE 事件格式不同）
  - 与 OpenAICompatAdapter 相同的接口
- **验收：** 对接 Anthropic API 可用
- **依赖：** 无

#### Task 3.1.3: AI Gateway 核心
- **文件：** `src/infrastructure/ai/AIGateway.ts`、`ModelRouter.ts`、`ProviderRegistry.ts`、`AdapterFactory.ts`
- **产出：**
  - `AIGateway` 类
  - `registerProvider(config)` / `updateProvider(id, config)` / `removeProvider(id)`
  - `setRoutingTable(projectId, routing)` / `getRoutingTable(projectId)`
  - `streamGenerate(taskType, options)` — 自动路由→获取Key→选Adapter→发起请求
  - `generateStructured(taskType, options)` — 同上，结构化输出
  - 路由逻辑：taskType → ModelRef → ProviderConfig → Adapter
  - 错误分类处理（RateLimit、Auth、Connection、AbortError）
  - 取消请求（AbortSignal 透传）
- **验收：** 完整调用链可走通，错误处理覆盖
- **依赖：** Task 3.1.1, Task 3.1.2

#### Task 3.1.4: 凭据存储
- **文件：** `src/infrastructure/credentials/TauriCredentialStore.ts`
- **产出：**
  - `TauriCredentialStore` 类，实现 `CredentialStore` 接口
  - `storeKey(providerId, key)` / `getKey(providerId)` / `deleteKey(providerId)`
  - 通过 `invoke()` 调用 `tauri-plugin-keyring`
  - 或 fallback 到 Rust `keyring` crate 自定义 command
- **验收：** Key 不写入任何明文文件，系统密钥链中可查
- **依赖：** `tauri-plugin-keyring` 配置（已完成）

### 3.2 AI Engine 领域层

#### Task 3.2.1: Prompt 管理系统
- **文件：** `src/domain/ai-engine/prompts/`
  - `system-prompts.ts` — L1 核心记忆注入模板 + 各 AI 人格描述
  - `extension.ts` — 延展引擎 prompt（生成多方向探索建议）
  - `devils-advocate.ts` — 恶魔代言人 prompt（批判审视）
  - `association-scan.ts` — 关联扫描 prompt（结构化 JSON 输出）
  - `deviation-detect.ts` — 偏离检测 prompt（三分类：relevant/uncertain/deviated）
  - `summary.ts` — Summary 生成 prompt
- **产出：**
  - 每个 prompt 为纯函数：`(context) → string`
  - L1 注入模板：`buildSystemPrompt(coreMemory, personaPrompt) → string`
  - L2 上下文注入：`buildUserMessage(l2Context, userInput) → string`
- **验收：** 所有 prompt 函数可单元测试，输出字符串格式正确
- **测试文件：** `src/domain/ai-engine/prompts/prompts.test.ts`
- **依赖：** 无

#### Task 3.2.2: AI Engine 核心
- **文件：** `src/domain/ai-engine/AIEngine.ts`
- **产出：**
  - `AIEngine` 类（依赖注入 AIGateway）
  - `generateExtensions(nodeId, context, signal?)` → AsyncIterable\<ExtensionChunk\>
  - `generateDevilsAdvocate(nodeId, context, signal?)` → AsyncIterable\<string\>
  - `scanAssociations(newNodeId, allNodes)` → Promise\<SuggestedAssociation[]\>
  - `generateSummary(sessionData, signal?)` → AsyncIterable\<string\>
  - 每次调用前组装 L1 + L2 上下文
  - 通过 AIGateway 调用对应 taskType 的模型
- **验收：** 各种 AI 调用均通过 mock AIGateway 测试
- **测试文件：** `src/domain/ai-engine/AIEngine.test.ts`
- **依赖：** Task 3.1.3, Task 3.2.1

### 3.3 记忆系统

#### Task 3.3.1: L1/L2 记忆管理
- **文件：** `src/domain/memory-system/MemorySystem.ts`
- **产出：**
  - `MemorySystem` 类
  - `getCoreMemory(projectId)` → Promise\<CoreMemory\>
  - `updateCoreMemory(projectId, update)` → Promise\<void\>
  - `getWorkingContext(projectId, focusNodeId)` → Promise\<L2Context\>
  - `updateWorkingContext(projectId, nodeId)` → Promise\<void\>
  - `addToBuffer(node)` → Promise\<void\>（Aha 模式缓冲）
  - `flushBuffer(projectId)` → Promise\<ThoughtNode[]\>
  - L2Context 组装算法：沿图遍历获取父/子节点 + 最近操作节点 + 相关主题簇
- **验收：** L2 上下文组装正确
- **测试文件：** `src/domain/memory-system/MemorySystem.test.ts`
- **依赖：** Task 1.1.2

### 3.4 偏离检测

#### Task 3.4.1: 偏离检测器
- **文件：** `src/domain/deviation-detector/DeviationDetector.ts`
- **产出：**
  - `DeviationDetector` 类
  - `check(input, coreMemory, recentContext)` → Promise\<DeviationResult\>
  - DeviationResult: `relevant | uncertain | deviated`
  - 使用结构化 AI 输出做三分类
- **验收：** 偏离/相关判断可用
- **测试文件：** `src/domain/deviation-detector/DeviationDetector.test.ts`
- **依赖：** Task 3.1.3

### 3.5 审查引擎

#### Task 3.5.1: 审查引擎
- **文件：** `src/domain/review-engine/ReviewEngine.ts`
- **产出：**
  - `ReviewEngine` 类
  - `generateCritique(targetNodeId, context, critiqueType, signal?)` → AsyncIterable\<CritiqueChunk\>
  - critiqueType: 'logical-flaw' | 'risk-analysis' | 'alternative-view' | 'completeness-check'
- **验收：** 四种审查类型均可用
- **依赖：** Task 3.2.2

### 3.6 AI 设置 UI

#### Task 3.6.1: AI 供应商设置界面
- **文件：** `src/presentation/components/Settings/AISettingsModal.tsx` `ProviderList.tsx` `ProviderEditor.tsx` `ModelRoutingTable.tsx`
- **产出：**
  - 供应商列表（显示已配置的供应商、baseURL、状态）
  - 添加/编辑供应商表单（预设模板 + 自定义）
  - 连接测试按钮（testConnection）
  - 模型路由配置表（每个 taskType → provider + model）
  - API Key 输入（通过 `invoke` 存储到密钥链，UI 不保留明文）
- **验收：** 完整配置流程可用
- **依赖：** Task 3.1.3, Task 3.1.4

### Phase 3 验收标准

- [ ] 用户可添加 OpenAI / Anthropic / Ollama / DeepSeek 等供应商
- [ ] API Key 安全存储在系统密钥链
- [ ] 选中节点 → 点击"延展" → AI 流式生成多方向建议
- [ ] 点击"恶魔代言人" → 批判意见流式输出
- [ ] Aha 模式下输入新节点 → 后台自动关联扫描（不呈现结果）
- [ ] Zen 模式下可看到 AI 建议的虚线关联
- [ ] 输入内容偏离项目时弹出偏离提示
- [ ] AI 调用错误正确分类和处理

---

## Phase 4: 完整工作流

> **目标：** Aha↔Zen 完整循环、确认分支、修剪归档、标记主干、导出交付物。

### 4.1 工作流编排

#### Task 4.1.1: 确认分支机制
- **文件：** `src/application/services/ApplicationService.ts`（追加）
- **产出：**
  - `handleBranchConfirmation(extensionId, parentNodeId)` 链路：
    1. 从 AI 延展中提取内容 → 创建新节点
    2. GraphEngine.addEdge(parentId, newId, 'user-confirmed')
    3. 写入文件 → git commit("确认分支: {标题}")
    4. AI 建议虚线 → 变为用户确认实线
    5. MemorySystem.updateWorkingContext(newNode)
- **验收：** 端到端确认分支链路可用
- **依赖：** Task 2.3.2, Task 3.2.2

#### Task 4.1.2: 修剪分支机制
- **文件：** `src/application/services/ApplicationService.ts`（追加）
- **产出：**
  - `handlePruning(nodeId, reason)` 链路：
    1. 弹出确认框，强制输入修剪原因
    2. GraphEngine.archiveBranch(nodeId, reason)
    3. 移动文件到 archive/ 目录
    4. GitService.rm(原文件) + git commit("修剪: {原因}")
    5. MemorySystem.addToL3Archive(nodeId)
    6. 节点视觉折叠为点（Motion 动画）
- **验收：** 修剪→归档→Git 记录完整
- **依赖：** Task 2.3.2

#### Task 4.1.3: 标记主干方案
- **文件：** `src/application/services/ApplicationService.ts`（追加）
- **产出：**
  - `handleMarkMainBranch(nodeId, name)` 链路：
    1. GraphEngine.markAsMainBranch(nodeId, name)
    2. GitService.createTag(name, "标记主干方案: {name}")
    3. 主干路径视觉高亮
- **验收：** 主干标记→Git tag 生成
- **依赖：** Task 2.3.2

#### Task 4.1.4: 导出实施构建包
- **文件：** `src/application/services/ApplicationService.ts`（追加）
- **产出：**
  - `exportDeliveryPackage(mainBranchId)`：
    1. 从主干路径收集所有节点
    2. 生成 PROJECT_CONTEXT.md（项目宪章 + 节点内容 + 脉络摘要）
    3. 生成 DEVELOPMENT_PACK.md（分步实施计划 + 风险提示）
    4. 写入 exports/ 目录
    5. GitService.commit("导出构建包: {日期}")
- **验收：** 导出文件内容完整、结构清晰
- **依赖：** Task 2.3.2

### 4.2 UI 完善

#### Task 4.2.1: ExtensionPanel 流式 AI 面板
- **文件：** `src/presentation/components/ZenMode/ExtensionPanel.tsx` `ExtensionStreamView.tsx` `ConfirmBranchButton.tsx`
- **产出：**
  - 触发延展 → 面板展开 → 逐 token 渲染
  - 多个方向分 Tab 展示
  - 每个方向可"提取为固化分支"
  - 取消按钮（AbortController）
- **验收：** 流式渲染流畅，确认分支可用
- **依赖：** Task 3.2.2, Task 4.1.1

#### Task 4.2.2: 修剪交互
- **文件：** `src/presentation/components/ZenMode/ContextMenu.tsx`（追加）
- **产出：**
  - 右键节点 → "修剪此分支"
  - 确认框（强制输入原因）
  - 修剪动画：节点 → 收缩 → 折叠为点
- **验收：** 修剪流程完整流畅
- **依赖：** Task 4.1.2

#### Task 4.2.3: 节点搜索
- **文件：** `src/presentation/components/ZenMode/SearchPanel.tsx`
- **产出：**
  - 搜索框 + 结果列表
  - 标题模糊匹配 + 全文关键词搜索
  - 点击结果 → 画布聚焦该节点（fitView + 高亮）
- **验收：** 搜索可用，聚焦准确
- **依赖：** Task 1.3.1

#### Task 4.2.4: 导出对话框
- **文件：** `src/presentation/components/ExportDialog/ExportDialog.tsx`
- **产出：**
  - 选择主干方案 → 预览内容 → 确认导出
  - 显示导出文件路径
- **验收：** 导出可用
- **依赖：** Task 4.1.4

### Phase 4 验收标准

- [ ] Aha 输入 → 积累 → Zen 查看关联 → AI 延展 → 确认分支 → 修剪 → 标记主干 → 导出
- [ ] 完整工作流中每一步都有对应 Git commit 记录
- [ ] 修剪后的分支在 archive/ 中可溯源
- [ ] 主干方案有对应 Git tag
- [ ] 导出文件可直接放入代码仓库供 AI 编程助手读取

---

## Phase 5: 润色与交付

> **目标：** Summary 模式、移动端 PWA、性能优化、交互打磨。

### 5.1 Summary 模式

#### Task 5.1.1: Summary 生成器
- **文件：** `src/domain/summary-generator/SummaryGenerator.ts`
- **产出：**
  - `generateSummary(sessionData)` → SummaryData
  - 包含：思考旅程回顾、交付物清单、缩略脉络图、命名仪式
  - 命名仪式：为本次思考旅程生成一个名称建议
- **依赖：** Task 3.2.2

#### Task 5.1.2: Summary UI
- **文件：** `src/presentation/components/SummaryModal/SummaryModal.tsx`
- **产出：**
  - 模态弹窗展示 Summary
  - 命名仪式交互（确认/自定义名称）
  - 分享/导出按钮
- **依赖：** Task 5.1.1

### 5.2 移动端 PWA

#### Task 5.2.1: 极简输入 PWA
- **文件：** `public/manifest.json`、`public/sw.js`、新的移动端入口
- **产出：**
  - PWA manifest（离线输入）
  - Service Worker（缓存、离线存储）
  - 移动端专用简洁 UI（仅文本输入框 + 提交按钮）
  - 数据通过文件系统同步（依赖云盘或 Git push）
- **依赖：** Task 2.3.2

### 5.3 性能优化

#### Task 5.3.1: 大图渲染优化
- **文件：** `src/presentation/components/ZenMode/GraphCanvas.tsx`（优化）
- **产出：**
  - G6 Canvas 渲染模式（非 DOM）
  - 节点展开/折叠（减少渲染节点数）
  - 增量数据更新（非全量重渲染）
  - Theme 主题支持（亮色/暗色）
- **依赖：** Task 1.3.1

#### Task 5.3.2: AI 缓存与去重
- **文件：** `src/infrastructure/cache/DexieCache.ts`
- **产出：**
  - 关联扫描结果缓存（避免重复扫描已有关联的节点对）
  - 项目元数据缓存（加速启动）
  - 节点索引缓存（加速搜索）
- **依赖：** Task 2.3.2

### 5.4 交互打磨

#### Task 5.4.1: 细节交互
- **产出：**
  - 右键菜单完善（ContextMenu 全菜单项）
  - 快捷键支持（Ctrl+Z 撤销、Ctrl+S 保存、Space 切换模式等）
  - 系统托盘（Tauri tray 集成）
  - 通知系统（AI 扫描完成、关联发现等）
  - 暗色模式切换
  - 节点状态视觉区分（active/archived/main-branch 颜色/形状）
- **依赖：** Phase 4 完成

### Phase 5 验收标准

- [ ] Zen 会话结束 → Summary 自动生成 → 命名仪式完成
- [ ] 移动端 PWA 可离线文本输入
- [ ] 200+ 节点脉络图流畅渲染
- [ ] 亮色/暗色主题可切换
- [ ] 快捷键、右键菜单、通知完善

---

## Phase 6: 测试与发布

> **目标：** 测试覆盖达标、CI/CD 就绪、发布 v1.0。

### 6.1 测试

#### Task 6.1.1: 领域层单元测试
- **覆盖率目标：** >80%
- **文件：** `src/domain/**/*.test.ts`
- **覆盖：** GraphEngine, AIEngine, MemorySystem, DeviationDetector, ReviewEngine, SummaryGenerator, NodeManager
- **依赖：** Phase 1-5 领域层代码

#### Task 6.1.2: 应用层集成测试
- **文件：** `src/application/**/*.test.ts`
- **覆盖：** ApplicationService 各工作流、ProjectService
- **依赖：** Phase 1-5 应用层代码

#### Task 6.1.3: 组件测试
- **文件：** `src/presentation/**/*.test.tsx`
- **覆盖：** 核心组件渲染、交互事件
- **依赖：** Phase 1-5 UI 代码

#### Task 6.1.4: Playwright E2E
- **文件：** `tests/e2e/`
- **覆盖：**
  - Aha 输入 → 节点创建
  - Zen 模式查看 + 拖拽
  - AI 设置 + 供应商配置
  - AI 延展 → 确认分支
  - 修剪 → 标记主干 → 导出
- **依赖：** Phase 4 完成

#### Task 6.1.5: Rust 测试
- **文件：** `src-tauri/src/**/*.rs` `#[cfg(test)]`
- **覆盖：** git_commands, fs_commands
- **依赖：** Phase 2 完成

### 6.2 CI/CD

#### Task 6.2.1: GitHub Actions
- **文件：** `.github/workflows/ci.yml`
- **产出：**
  - Lint: ESLint + Prettier + Clippy + Rustfmt
  - Test: Vitest + cargo test
  - E2E: Playwright (WebKit + Chromium)
  - Build: Vite build + cargo build
- **文件：** `.github/workflows/release.yml`
- **产出：**
  - Tauri bundle (macOS .dmg + Windows .msi + Linux .AppImage)
- **依赖：** Phase 6.1

### 6.3 文档

#### Task 6.3.1: 项目文档
- **文件：** `README.md`、`CONTRIBUTING.md`、`LICENSE`
- **产出：**
  - README：项目介绍、截图、安装方式、快速开始
  - CONTRIBUTING：贡献指南、开发环境搭建、代码规范
  - LICENSE：MIT
- **依赖：** 无

### Phase 6 验收标准

- [ ] 领域层测试覆盖率 > 80%
- [ ] `npm test` 全绿
- [ ] `cargo test` 全绿
- [ ] Playwright E2E 核心流程全绿
- [ ] CI（lint + test + build）通过
- [ ] 跨平台构建成功（macOS + Windows + Linux）
- [ ] README 和 CONTRIBUTING 完善
- [ ] GitHub Release v1.0.0

---

## 依赖关系图

```
Phase 1 (核心骨架)
  ├── 1.1 领域层核心 → 1.3 表示层
  ├── 1.2 基础设施层(FS) → 1.3 表示层
  └── 1.3 表示层骨架
        │
Phase 2 (Git与数据)
  ├── 2.1 git2-rs → 2.2 TS Git服务 → 2.3 项目管理
  └── 2.3 依赖 Phase 1 全部
        │
Phase 3 (AI引擎)
  ├── 3.1 AI网关(独立可测) → 3.2 AI Engine
  ├── 3.3 记忆系统(依赖 1.1)
  └── 3.6 AI设置UI(依赖 3.1)
        │
Phase 4 (完整工作流)
  ├── 4.1 工作流(依赖 Phase 2 + 3)
  └── 4.2 UI(依赖 4.1)
        │
Phase 5 (润色交付)
  ├── 5.1 Summary(依赖 3.2)
  ├── 5.2 PWA(依赖 2.3)
  └── 5.3 性能优化(依赖 1.3)
        │
Phase 6 (测试发布)
  └── 6.1 测试(依赖 Phase 1-5) → 6.2 CI/CD → 6.3 文档
```

---

## 参考文档索引

| 文档 | 路径 |
|:---|:---|
| 产品方案 | `/Users/van/projects/AHA/Product plan.md` |
| 架构设计 | `/Users/van/projects/AHA/Architecture design.md` |
| 项目指令 | `/Users/van/projects/AHA/CLAUDE.md` |
| 依赖参考总索引 | `/Users/van/projects/AHA/docs/reference/README.md` |
| G6 v5 API | `/Users/van/projects/AHA/docs/reference/g6-v5/README.md` |
| Vercel AI SDK v6 | `/Users/van/projects/AHA/docs/reference/vercel-ai-sdk-v6/README.md` |
| Motion | `/Users/van/projects/AHA/docs/reference/motion/README.md` |
| Tauri v2 | `/Users/van/projects/AHA/docs/reference/tauri-v2/README.md` |
| TipTap | `/Users/van/projects/AHA/docs/reference/tiptap/README.md` |
| git2-rs | `/Users/van/projects/AHA/docs/reference/git2-rs/README.md` |
| tauri-plugin-keyring | `/Users/van/projects/AHA/docs/reference/tauri-plugin-keyring/README.md` |
| zundo | `/Users/van/projects/AHA/docs/reference/zundo/README.md` |
| dnd-kit | `/Users/van/projects/AHA/docs/reference/dnd-kit/README.md` |
