# 创意记录软件 — 架构设计文档

**版本：** v1.1
**状态：** 设计完善，待实施
**技术栈：** TypeScript + Rust（Tauri后端）


## 第一部分：架构总览

### 1.1 分层架构

```
┌──────────────────────────────────────────────────┐
│            表示层 (Presentation)                   │
│  React UI | G6/Graphin 图渲染 | TipTap编辑器      │
│  Motion动画 | Zustand状态 | dnd-kit拖拽           │
├──────────────────────────────────────────────────┤
│            应用层 (Application)                    │
│  模式管理 | 工作流编排 | 状态协调                   │
├──────────────────────────────────────────────────┤
│            领域层 (Domain)                        │
│  脉络图引擎 | AI引擎 | 记忆系统 | 审查引擎          │
│  (零外部依赖，纯TypeScript)                       │
├──────────────────────────────────────────────────┤
│            基础设施层 (Infrastructure)             │
│  AIGateway | GitService | FileSystem | Cache     │
├──────────────────────────────────────────────────┤
│            平台层 (Platform)                      │
│  Tauri Runtime | Rust后端(git2-rs/keyring)       │
│  WebView (WebKit/WebView2)                       │
└──────────────────────────────────────────────────┘
```

### 1.2 依赖方向

```
表示层 → 应用层 → 领域层 → 基础设施层 → 平台层
         ↑          ↑           ↑
    只依赖下方   只依赖下方   只依赖下方
```

**核心原则：领域层零外部依赖，不依赖任何框架或平台API。**

### 1.3 语言分工

| 层 | 语言 | 说明 |
|:---|:---|:---|
| 表示层 | TypeScript + React | UI渲染和用户交互 |
| 应用层 | TypeScript | 工作流编排 |
| 领域层 | TypeScript | 核心业务逻辑，零外部依赖 |
| 基础设施层 | TypeScript + Rust | TypeScript定义接口，重操作委派给Rust |
| 平台层 | Rust + WebView | Tauri运行时和原生能力 |

**Rust的职责（明确边界）：**
- Git操作（git2-rs）
- 文件系统操作（Tauri FS）
- 凭据存储（系统密钥链）
- 系统通知和全局快捷键（v2.0）


## 第二部分：模块设计

### 2.1 表示层 (Presentation Layer)

**职责：** UI渲染、用户交互、视觉反馈。不包含业务逻辑。

#### 2.1.1 组件树

```
App
├── TitleBar (Tauri窗口控制)
├── ModeSwitch (Aha ↔ Zen 切换按钮，含Motion过渡动画)
├── AhaMode
│   ├── QuickInput (底部固定输入条)
│   │   ├── TextInput (纯文本，TipTap极简模式)
│   │   └── SubmitButton
│   ├── NodeStack (最近节点列表，可选查看)
│   ├── QuickZenButton (即时Zen入口，3-5个节点即可查看)
│   └── StatusBar (节点计数、AI扫描状态)
│
├── ZenMode
│   ├── GraphCanvas (G6/Graphin 全屏画布)
│   │   ├── GraphRenderer (G6渲染引擎，Canvas/WebGL)
│   │   ├── NodeCard (节点卡片覆盖层，Motion动画)
│   │   │   ├── NodeEditor (TipTap编辑器)
│   │   │   ├── ExtensionPanel (AI延展面板，流式渲染)
│   │   │   │   ├── ExtensionStreamView (逐token渲染)
│   │   │   │   └── ConfirmBranchButton (提取为固化分支)
│   │   │   └── DevilsAdvocateButton
│   │   ├── EdgeRenderer (连线渲染，实线/虚线区分)
│   │   └── ContextMenu (右键菜单)
│   ├── GraphToolbar (缩放、布局切换、筛选)
│   │   ├── LayoutSwitch (力导向/层次/树状切换)
│   │   └── FilterPanel (按状态/标签筛选节点)
│   ├── MiniMap (小地图，G6内置)
│   └── UndoRedoButtons (撤销/重做)
│
├── AISettingsModal (AI供应商配置)
│   ├── ProviderList (供应商列表)
│   ├── ProviderEditor (添加/编辑供应商)
│   ├── ModelRoutingTable (任务→模型映射)
│   └── ConnectionTest (连接测试按钮)
│
├── SummaryModal (Summary模式弹窗)
├── ExportDialog (导出对话框)
├── SearchPanel (节点搜索，v1.0)
├── ProjectSettings (项目设置)
└── GlobalSettings (全局设置)
```

#### 2.1.2 核心交互流

**Aha模式：**
```
用户输入文字 → 回车
  → QuickInput发射事件
  → 应用层创建节点
  → 节点加入Zen模式的潜在节点池
  → AI后台异步扫描关联（不呈现）
  → 输入框清空，等待下一次输入
  → 始终显示"即时Zen"入口，鼓励用户随时查看脉络
```

**Zen模式：**
```
用户切换至Zen模式（Motion过渡动画）
  → 应用层请求脉络图数据
  → 领域层组装图数据（节点 + AI建议关联虚线 + 用户确认关联实线）
  → 表示层G6渲染图（先散布→力导向动画收敛）
  → 用户拖拽/连线/点击节点
  → 用户操作 zundo 自动记录为可撤销步骤
  → 领域层更新数据 → git2-rs commit
  → 表示层增量更新渲染
```

#### 2.1.3 状态管理 (Zustand + zundo)

```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

// 全局应用状态
interface AppState {
  // 模式
  mode: 'aha' | 'zen';

  // 当前项目
  currentProject: ProjectMeta | null;

  // Aha模式状态
  ahaInputBuffer: string;
  recentNodesPreview: ThoughtNode[];

  // Zen模式状态
  graphData: GraphData | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeLayoutType: 'force' | 'tree' | 'dendrogram';

  // AI 扩展状态
  isExtending: boolean;
  extensionStream: string | null;

  // UI状态
  isSummaryOpen: boolean;
  isExportOpen: boolean;
  isAISettingsOpen: boolean;
  isSearchOpen: boolean;

  // 通知
  notifications: Notification[];
}

// 创建带撤销/重做的 Store
const useStore = create<AppState>()(
  temporal(
    (set) => ({
      mode: 'aha',
      currentProject: null,
      // ... 初始状态
      selectNode: (id) => set({ selectedNodeId: id }),
      moveNode: (id, pos) => set(s => ({
        graphData: updateNodePosition(s.graphData, id, pos)
      })),
    }),
    {
      partialize: (state) => ({
        graphData: state.graphData,  // 仅追踪图数据操作
      }),
      limit: 50,  // 最多50步撤销
    }
  )
);

// 使用撤销/重做
const { undo, redo, pastStates, futureStates } = useStore.temporal.getState();
```

---

### 2.2 应用层 (Application Layer)

**职责：** 编排工作流，协调领域层各模块，管理应用状态。

#### 2.2.1 应用服务接口

```typescript
interface ApplicationService {
  // 项目生命周期
  createProject(name: string, type: ProjectType): Promise<Project>;
  openProject(path: string): Promise<Project>;

  // 模式切换
  switchToZenMode(): Promise<void>;
  switchToAhaMode(): Promise<void>;

  // 核心工作流
  handleNewThought(content: string): Promise<void>;
  handleNodeSelection(nodeId: string): Promise<void>;
  handleBranchConfirmation(extensionId: string): Promise<void>;
  handlePruning(nodeId: string, reason: string): Promise<void>;
  handleMarkMainBranch(nodeId: string, name: string): Promise<void>;

  // AI 调用
  triggerExtension(nodeId: string, signal?: AbortSignal): AsyncIterable<string>;
  triggerDevilsAdvocate(nodeId: string, signal?: AbortSignal): AsyncIterable<string>;
  cancelAIRequest(): void;

  // Summary
  generateSummary(): Promise<SummaryData>;

  // 导出
  exportDeliveryPackage(mainBranchId: string): Promise<Blob>;
}
```

#### 2.2.2 工作流编排（核心）

```
handleNewThought (Aha模式)
  1. 领域层: NodeManager.createNode(content)
  2. 领域层: MemorySystem.addToBuffer(node)
  3. 领域层: DeviationDetector.check(node, L1核心记忆)
     - 如果偏离 → 返回询问，中断
     - 如果相关 → 继续
  4. 领域层: 后台异步扫描语义关联，不呈现
     - 使用用户配置的 association-scan 任务对应模型
  5. 基础设施层: git2-rs commit("新灵感: {content前30字}")

switchToZenMode
  1. 领域层: GraphEngine.buildGraph()
     - 读取所有节点
     - 读取AI扫描的潜在关联缓存
     - 组装为G6兼容的GraphData
  2. 应用层: 更新graphData状态
  3. 表示层: G6渲染图 + Motion力导向初始散布→收敛动画

handleBranchConfirmation (确认分支)
  1. 领域层: NodeManager.createNode(extensionContent)
  2. 领域层: GraphEngine.addEdge(parentId, newNodeId, 'user-confirmed')
  3. 领域层: MemorySystem.updateL2Context(newNode)
  4. 基础设施层: git2-rs commit("确认分支: {新节点标题}")

handlePruning (修剪分支)
  1. 弹出确认框，强制输入修剪原因
  2. 领域层: GraphEngine.markArchived(nodeId)
  3. 领域层: MemorySystem.moveToL3Archive(nodeId)
  4. 基础设施层: git2-rs rm(nodeId) + commit("修剪: {原因}，原因写入commit message")
  5. 表示层: Motion动画节点折叠→消失
```

---

### 2.3 领域层 (Domain Layer)

**职责：** 核心业务逻辑。零外部依赖。这是产品的灵魂。

#### 2.3.1 脉络图引擎 (GraphEngine)

```typescript
interface GraphEngine {
  // 图构建
  buildGraph(projectId: string): Promise<GraphData>;

  // 节点管理
  addNode(node: ThoughtNode): Promise<void>;
  updateNode(nodeId: string, content: Partial<ThoughtNode>): Promise<void>;
  removeNode(nodeId: string): Promise<void>;

  // 边管理
  addEdge(sourceId: string, targetId: string, type: EdgeType): Promise<void>;
  removeEdge(edgeId: string): Promise<void>;

  // 主干管理
  markAsMainBranch(nodeId: string, name: string): Promise<void>;
  getMainBranches(projectId: string): Promise<MainBranch[]>;

  // 修剪与归档
  archiveBranch(nodeId: string, reason: string): Promise<void>;
  getArchivedBranches(projectId: string): Promise<ArchivedBranch[]>;

  // 图分析
  detectMainPath(startNodeId: string): Promise<string[]>;
  findShortestPath(fromId: string, toId: string): Promise<string[]>;
  clusterNodes(): Promise<Cluster[]>;

  // 图数据导出（G6兼容格式）
  toG6Format(graphData: GraphData): G6GraphData;
}

interface ThoughtNode {
  id: string;
  title: string;
  content: string;         // Markdown内容
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived' | 'main-branch';
  tags: string[];
  position?: { x: number; y: number };  // 画布坐标
  metadata: Record<string, any>;
}

interface GraphData {
  nodes: ThoughtNode[];
  edges: Edge[];
  clusters: Cluster[];     // AI识别的主题簇
  aiSuggestions: AISuggestedEdge[];  // AI建议的虚线关联
  mainBranches: MainBranch[];
}

interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'ai-suggested' | 'user-confirmed' | 'main-path';
  label?: string;
  confidence?: number;     // AI建议关联的可信度 0-1
}

interface AISuggestedEdge extends Edge {
  type: 'ai-suggested';
  confidence: number;
  reason: string;          // AI给出的关联理由
}

// G6 v5 图数据格式
interface G6GraphData {
  nodes: Array<{
    id: string;
    data: ThoughtNode;
    style?: Record<string, any>;
    states?: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    data: Edge;
    style?: {
      stroke?: string;       // 虚线/实线
      lineDash?: number[];   // AI建议=[5,5], 用户确认=[]
      opacity?: number;      // 可信度映射为透明度
    };
    label?: string;
  }>;
  combos?: Array<{           // G6 Combo：主题簇
    id: string;
    data: Cluster;
  }>;
}
```

#### 2.3.2 AI引擎 (AIEngine)

```typescript
interface AIEngine {
  // 延展（流式，生成多方向建议）
  generateExtensions(
    nodeId: string,
    context: L2Context,
    signal?: AbortSignal
  ): AsyncIterable<ExtensionChunk>;

  // 对抗审视（流式）
  generateDevilsAdvocate(
    nodeId: string,
    context: L2Context,
    signal?: AbortSignal
  ): AsyncIterable<string>;

  // 关联扫描（后台静默，结构化输出）
  scanAssociations(
    newNodeId: string,
    allNodes: ThoughtNode[]
  ): Promise<SuggestedAssociation[]>;

  // Summary生成（流式）
  generateSummary(
    sessionData: SessionData,
    signal?: AbortSignal
  ): AsyncIterable<string>;
}

interface ExtensionChunk {
  type: 'direction' | 'content' | 'done';
  directionId?: string;
  title?: string;
  content?: string;
  confidence?: number;
}

interface SuggestedAssociation {
  nodeAId: string;
  nodeBId: string;
  reason: string;
  strength: number;  // 0-1
}
```

**AI引擎的任务类型与模型路由：**

```typescript
type AITaskType =
  | 'extension'          // AI延展：高质量/创造性（主模型）
  | 'devils-advocate'    // 恶魔代言人：批判性（主模型或专用模型）
  | 'association-scan'   // 关联扫描：后台/批量（轻量模型）
  | 'deviation-detect'   // 偏离检测：高频/低延迟（本地模型优先）
  | 'summary';           // Summary：一次性/综合性强（主模型）

// 用户可自由配置每个任务类型使用哪个模型
// 例：extension → Claude Opus, association-scan → GPT-4o-mini, deviation-detect → 本地Ollama
```

**Prompt管理：**

```
src/domain/ai-engine/prompts/
├── extension.ts           // 延展引擎 prompt + L1注入模板
├── devils-advocate.ts     // 恶魔代言人 prompt
├── association-scan.ts    // 关联扫描 prompt（结构化输出）
├── deviation-detect.ts    // 偏离检测 prompt（结构化输出）
├── summary.ts            // Summary prompt
└── system-prompts.ts     // 各任务类型的角色描述模板
```

#### 2.3.3 分级记忆系统 (MemorySystem)

```typescript
interface MemorySystem {
  // L1: 核心记忆（项目宪章）
  getCoreMemory(projectId: string): Promise<CoreMemory>;
  updateCoreMemory(projectId: string, update: Partial<CoreMemory>): Promise<void>;

  // L2: 中景记忆（当前工作上下文）
  getWorkingContext(projectId: string, focusNodeId: string): Promise<L2Context>;
  updateWorkingContext(projectId: string, nodeId: string): Promise<void>;

  // L3: 远景记忆（全项目可检索，v3.0引入LanceDB）
  searchArchived(query: string, projectId: string): Promise<SearchResult[]>;
  moveToL3Archive(nodeId: string): Promise<void>;

  // Aha模式缓冲
  addToBuffer(node: ThoughtNode): Promise<void>;
  flushBuffer(projectId: string): Promise<ThoughtNode[]>;
}

interface CoreMemory {
  projectGoal: string;          // 项目核心目标
  constraints: string[];        // 用户自定义约束
  currentMainBranchId?: string; // 当前主干方案
  keyDecisions: KeyDecision[];  // 关键决策记录
  projectType: ProjectType;
}

interface L2Context {
  focusNode: ThoughtNode;
  parentNodes: ThoughtNode[];       // 向上追溯（父节点链）
  childNodes: ThoughtNode[];        // 直接子节点
  recentlyActivated: ThoughtNode[]; // 最近操作的节点（时间窗口+操作次数）
  relatedClusters: Cluster[];       // 相关主题簇（图遍历+AI聚类结果）
}

interface KeyDecision {
  timestamp: Date;
  decision: string;
  reason: string;
  alternatives: string[];
}
```

**L2中景记忆组装算法：**

```
给定 focusNodeId:
  1. 从图数据中获取 focusNode
  2. 沿边向上追溯3层获取 parentNodes
  3. 获取 focusNode 的直接子节点 childNodes
  4. 从操作历史中取最近N个节点 recentlyActivated
  5. 从AI聚类结果中取包含focusNode的主题簇 relatedClusters
  6. 组装为 L2Context，注入每次AI调用的user message头部
```

#### 2.3.4 偏离检测器 (DeviationDetector)

```typescript
interface DeviationDetector {
  check(
    input: string,
    coreMemory: CoreMemory,
    recentContext: string[]
  ): Promise<DeviationResult>;
}

type DeviationResult =
  | { type: 'relevant'; confidence: number }
  | { type: 'uncertain'; suggestedInterpretation: string }
  | { type: 'deviated'; message: string };
```

**v1.0实现方案：** 将用户输入 + L1核心记忆 + 最近上下文送入AI（使用 deviation-detect 任务对应的模型，通常为本地轻量模型），请求分类为 relevant/uncertain/deviated。本地Ollama模型优先，无本地模型时使用用户配置的轻量远程模型。

#### 2.3.5 审查引擎 (ReviewEngine)

```typescript
interface ReviewEngine {
  generateCritique(
    targetNodeId: string,
    context: L2Context,
    critiqueType: CritiqueType,
    signal?: AbortSignal
  ): AsyncIterable<CritiqueChunk>;
}

type CritiqueType =
  | 'logical-flaw'
  | 'risk-analysis'
  | 'alternative-view'
  | 'completeness-check';

interface CritiqueChunk {
  type: CritiqueType;
  severity: 'critical' | 'warning' | 'suggestion';
  content: string;
}
```

---

### 2.4 基础设施层 (Infrastructure Layer)

**职责：** 为领域层提供底层能力。TypeScript接口定义 + Rust实现重操作。

#### 2.4.1 Git服务 (GitService)

```typescript
// TypeScript 接口定义
interface GitService {
  init(projectPath: string): Promise<void>;
  clone(remoteUrl: string, localPath: string): Promise<void>;
  add(filePath: string): Promise<void>;
  commit(message: string): Promise<string>;
  rm(filePath: string): Promise<void>;
  createBranch(name: string): Promise<void>;
  switchBranch(name: string): Promise<void>;
  mergeBranch(name: string): Promise<void>;
  createTag(name: string, message: string): Promise<void>;
  log(filePath?: string, limit?: number): Promise<CommitLog[]>;
  diff(commitA: string, commitB: string): Promise<DiffResult>;
  status(): Promise<GitStatus>;
  push(remote: string, branch: string): Promise<void>;
  pull(remote: string, branch: string): Promise<void>;
}
```

**实现：git2-rs 通过 Tauri Command**

```rust
// src-tauri/src/git_commands.rs
use git2::Repository;
use std::path::Path;

#[tauri::command]
fn git_init(path: String) -> Result<String, String> {
    Repository::init(&path).map_err(|e| e.to_string())?;
    Ok("initialized".into())
}

#[tauri::command]
fn git_commit(repo_path: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    // ... 完整的 add + commit 逻辑（签名、索引写入、树创建、提交）
    Ok(commit_oid.to_string())
}

#[tauri::command]
fn git_create_tag(repo_path: String, name: String, message: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    // ... tag创建逻辑
    Ok("tagged".into())
}

// 更多命令: git_rm, git_log, git_diff, git_status, git_create_branch, ...
```

```typescript
// src/infrastructure/git/TauriGitService.ts
import { invoke } from '@tauri-apps/api/core';

class TauriGitService implements GitService {
  constructor(private repoPath: string) {}

  async init(): Promise<void> {
    await invoke('git_init', { path: this.repoPath });
  }

  async commit(message: string): Promise<string> {
    return invoke('git_commit', { repoPath: this.repoPath, message });
  }

  async createTag(name: string, message: string): Promise<void> {
    await invoke('git_create_tag', { repoPath: this.repoPath, name, message });
  }
  // ... 其余方法
}
```

#### 2.4.2 文件系统服务 (FileSystemService)

```typescript
interface FileSystemService {
  readNode(nodePath: string): Promise<string>;
  writeNode(nodePath: string, content: string): Promise<void>;
  deleteNode(nodePath: string): Promise<void>;
  readGraphIndex(projectPath: string): Promise<GraphIndex>;
  writeGraphIndex(projectPath: string, index: GraphIndex): Promise<void>;
  readProjectConfig(projectPath: string): Promise<ProjectConfig>;
  writeProjectConfig(projectPath: string, config: ProjectConfig): Promise<void>;
  createExport(projectPath: string, files: ExportFile[]): Promise<void>;
  watchProject(projectPath: string, signal: AbortSignal): AsyncIterable<FileChange>;
}
```

**实现：** Tauri FS Plugin API（`@tauri-apps/plugin-fs`）+ Tauri的`notify` crate做文件监听。

#### 2.4.3 AI网关 (AIGateway)

这是架构中最重要的基础设施模块。详见第三部分。

#### 2.4.4 凭据存储 (CredentialStore)

```typescript
interface CredentialStore {
  storeKey(providerId: string, key: string): Promise<void>;
  getKey(providerId: string): Promise<string | null>;
  deleteKey(providerId: string): Promise<void>;
  listProviders(): Promise<string[]>;
}
```

**实现：** `tauri-plugin-keyring`（Tauri v2原生插件，macOS Keychain / Windows Credential Manager / Linux Secret Service）。

```typescript
// src/infrastructure/credentials/TauriCredentialStore.ts
import { getPassword, setPassword, deletePassword } from 'tauri-plugin-keyring';

class TauriCredentialStore implements CredentialStore {
  async storeKey(providerId: string, key: string): Promise<void> {
    await setPassword(`aha:ai-provider:${providerId}`, key);
  }

  async getKey(providerId: string): Promise<string | null> {
    return getPassword(`aha:ai-provider:${providerId}`);
  }

  async deleteKey(providerId: string): Promise<void> {
    await deletePassword(`aha:ai-provider:${providerId}`);
  }

  async listProviders(): Promise<string[]> {
    // 从 providers.json 中读取（不含密钥）
    // 密钥仅存在于系统密钥链中
  }
}
```

**关键原则：API Key 绝不写入任何明文文件。** `~/.aha/providers.json` 中只存储 `apiKeyRef` 引用标记，实际密钥仅存于系统原生密钥链。前端永远不会持有密钥明文——密钥由 Rust 侧在发起 HTTP 请求前即时获取并注入。

#### 2.4.5 本地缓存 (LocalCache)

```typescript
interface LocalCache {
  getProjectMeta(projectPath: string): Promise<ProjectMeta | null>;
  setProjectMeta(projectPath: string, meta: ProjectMeta): Promise<void>;
  getNodeIndex(projectId: string): Promise<NodeIndex | null>;
  setNodeIndex(projectId: string, index: NodeIndex): Promise<void>;
  getAssociationCache(projectId: string): Promise<AssociationCache | null>;
  setAssociationCache(projectId: string, cache: AssociationCache): Promise<void>;
}
```

**实现：** Dexie.js（IndexedDB封装，~10KB）。v1.0足够。若未来需要复杂查询（如"找出所有最近7天修改过的节点"），可升级为 SQLite WASM。


## 第三部分：AI网关详细设计

### 3.1 设计原则

| 原则 | 含义 |
|:---|:---|
| **零默认供应商** | 安装后无预配置AI服务，无硬编码endpoint或模型名 |
| **协议适配而非供应商适配** | 系统对接通信协议，不对接具体公司 |
| **用户完全自主** | 用户自行选择供应商、配置模型、管理Key、控制成本 |
| **任务路由** | 不同任务类型可使用不同模型，用户自由分配 |

### 3.2 架构

```
                    ┌─────────────────────────────┐
                    │         AIGateway             │
                    │                               │
    taskType ──────→│  ModelRouter                  │
    options         │  根据用户配置的路由表           │
                    │  将任务映射到 (provider, model) │
                    │                               │
                    │  ProviderRegistry             │
                    │  管理所有已注册的供应商配置      │
                    │                               │
                    │  AdapterFactory               │
                    │  根据 protocol 选择适配器       │
                    │       │                       │
                    │       ├── openai-compatible    │
                    │       │   OpenAICompatAdapter   │
                    │       │   (覆盖95%+供应商)      │
                    │       │                        │
                    │       └── anthropic            │
                    │           AnthropicAdapter      │
                    │           (Anthropic原生协议)    │
                    │                               │
                    │  CredentialStore              │
                    │  从系统密钥链获取API Key         │
                    │  不写入任何明文文件             │
                    └─────────────────────────────┘
```

### 3.3 供应商配置模型

```typescript
interface ProviderConfig {
  /** 用户自定义唯一标识 */
  id: string;

  /** 用户可见名称 */
  name: string;

  /** 通信协议 */
  protocol: 'openai-compatible' | 'anthropic';

  /** API端点 */
  baseURL: string;

  /** API Key引用（实际值在系统密钥链中） */
  apiKeyRef?: string;

  /** 该供应商下的模型列表 */
  models: ModelConfig[];

  /** 是否启用 */
  enabled: boolean;

  // ─── 差异化配置字段 ────

  /** 认证方式 */
  authType?: 'bearer' | 'custom-header' | 'query-param';

  /** 认证header名 */
  authHeaderName?: string;

  /** 额外HTTP headers（如OpenRouter需要HTTP-Referer） */
  extraHeaders?: Record<string, string>;

  /** 模型名映射（如OpenRouter中Claude叫"anthropic/claude-sonnet-4-6"） */
  modelNameOverrides?: Record<string, string>;
}

interface ModelConfig {
  id: string;              // 模型标识符
  name: string;            // 显示名称
  capabilities: {
    streaming: boolean;
    structuredOutput: boolean;
    maxContextTokens: number;
    maxOutputTokens: number;
  };
  defaults?: {
    temperature?: number;
    maxTokens?: number;
  };
}
```

### 3.4 任务路由

```typescript
interface ModelRoutingTable {
  /** 默认模型：某任务类型未指定时使用 */
  defaultModel: ModelRef;

  /** 每任务类型的模型分配 */
  taskModels: Partial<Record<AITaskType, ModelRef>>;

  /** 可选：后台任务专用轻量模型 */
  backgroundModel?: ModelRef;
}

interface ModelRef {
  providerId: string;
  modelId: string;
}
```

**用户配置示例（纯UI配置，非代码）：**

```
┌─────────────────────────────────────────────────┐
│  AI 模型路由                                     │
│                                                 │
│  默认模型:  [Claude Sonnet 4.6 ▼] (OpenRouter)   │
│                                                 │
│  AI 延展          [Claude Opus 4.8 ▼]            │
│  恶魔代言人        [跟默认一样 ▼]                  │
│  关联扫描（后台）   [GPT-4o-mini ▼]               │
│  偏离检测          [llama3:8b ▼] (本地Ollama)     │
│  Summary          [跟默认一样 ▼]                  │
│                                                 │
│  [+ 添加供应商]  [测试全部连接]                   │
└─────────────────────────────────────────────────┘
```

### 3.5 网关核心接口

```typescript
interface AIGateway {
  // 供应商管理
  registerProvider(config: ProviderConfig): Promise<void>;
  updateProvider(providerId: string, update: Partial<ProviderConfig>): Promise<void>;
  removeProvider(providerId: string): Promise<void>;
  listProviders(): Promise<ProviderConfig[]>;
  testConnection(providerId: string): Promise<ConnectionTestResult>;

  // 路由配置
  setRoutingTable(projectId: string, routing: ModelRoutingTable): Promise<void>;
  getRoutingTable(projectId: string): Promise<ModelRoutingTable>;

  // 核心调用（自动路由→获取Key→选择Adapter→发起请求）
  streamGenerate(
    taskType: AITaskType,
    options: {
      systemPrompt: string;
      messages: ChatMessage[];
      temperature?: number;
      maxTokens?: number;
      abortSignal?: AbortSignal;
    }
  ): AsyncIterable<StreamChunk>;

  generateStructured<T>(
    taskType: AITaskType,
    options: {
      systemPrompt: string;
      messages: ChatMessage[];
      schema: ZodSchema<T>;
      abortSignal?: AbortSignal;
    }
  ): Promise<T>;
}

interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

interface ConnectionTestResult {
  success: boolean;
  latency: number;
  modelsFound: number;
  error?: string;
}
```

### 3.6 适配器实现

**OpenAICompatAdapter（覆盖95%+场景）：**

```typescript
class OpenAICompatAdapter {
  constructor(private config: {
    baseURL: string;
    apiKey: string;
    chatCompletionsPath?: string;
    authType?: 'bearer' | 'custom-header' | 'query-param';
    authHeaderName?: string;
    extraHeaders?: Record<string, string>;
  }) {}

  async *generateStream(params: StreamParams): AsyncIterable<StreamChunk> {
    const path = this.config.chatCompletionsPath ?? '/chat/completions';
    const response = await fetch(`${this.config.baseURL}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          ...params.messages,
        ],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: true,
      }),
      signal: params.abortSignal,
    });
    for await (const chunk of this.parseSSE(response)) {
      yield chunk;
    }
  }

  async generateStructured<T>(params: StructuredParams): Promise<T> {
    const path = this.config.chatCompletionsPath ?? '/chat/completions';
    const response = await fetch(`${this.config.baseURL}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        messages: [...],
        response_format: { type: 'json_object' },  // 标准OpenAI JSON模式
        stream: false,
      }),
    });
    const data = await response.json();
    return params.schema.parse(JSON.parse(data.choices[0].message.content));
  }
}
```

### 3.7 供应商预设模板（纯客户端静态数据）

系统不内置任何供应商，但提供预设模板方便用户填写：

```typescript
const PROVIDER_TEMPLATES = [
  { id: 'openai',       name: 'OpenAI',          protocol: 'openai-compatible', baseURL: 'https://api.openai.com/v1' },
  { id: 'anthropic',    name: 'Anthropic',        protocol: 'anthropic',         baseURL: 'https://api.anthropic.com/v1' },
  { id: 'ollama',       name: 'Ollama (本地)',     protocol: 'openai-compatible', baseURL: 'http://localhost:11434/v1' },
  { id: 'deepseek',     name: 'DeepSeek',         protocol: 'openai-compatible', baseURL: 'https://api.deepseek.com/v1' },
  { id: 'zhipu',        name: '智谱AI',           protocol: 'openai-compatible', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'qwen',         name: '通义千问',          protocol: 'openai-compatible', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'kimi',         name: '月之暗面',          protocol: 'openai-compatible', baseURL: 'https://api.moonshot.cn/v1' },
  { id: 'openrouter',   name: 'OpenRouter',       protocol: 'openai-compatible', baseURL: 'https://openrouter.ai/api/v1' },
  { id: 'groq',         name: 'Groq',             protocol: 'openai-compatible', baseURL: 'https://api.groq.com/openai/v1' },
  { id: 'custom',       name: '自定义(OpenAI兼容)', protocol: 'openai-compatible', baseURL: '' },
  { id: 'custom-ant',   name: '自定义(Anthropic)',  protocol: 'anthropic',         baseURL: '' },
];
```

### 3.8 核心调用流程（以AI延展为例）

```
用户在Zen模式选中节点 → 点击"延展"
    │
    ▼
AIEngine.generateExtensions(nodeId, context, signal)
    │
    ├── 1. MemorySystem 组装上下文
    │     L1核心记忆 + L2中景记忆 + 节点内容
    │
    ├── 2. AIEngine 准备Prompt
    │     prompts/extension.ts 模板 + 上下文变量注入
    │
    ▼
AIGateway.streamGenerate('extension', { systemPrompt, messages, abortSignal })
    │
    ├── 3. 查路由表: taskType='extension'
    │     → { providerId: 'my-openrouter', modelId: 'anthropic/claude-opus-4-8' }
    │
    ├── 4. 查 ProviderConfig: providerId='my-openrouter'
    │     → { protocol: 'openai-compatible', baseURL: 'https://openrouter.ai/api/v1', ... }
    │
    ├── 5. CredentialStore.getKey('my-openrouter')
    │     → 'sk-or-v1-...' (从macOS Keychain)
    │
    ├── 6. AdapterFactory: protocol='openai-compatible'
    │     → OpenAICompatAdapter
    │
    ▼
OpenAICompatAdapter.generateStream({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: 'sk-or-v1-...',
    model: 'anthropic/claude-opus-4-8',
    systemPrompt, messages, abortSignal,
})
    │
    ├── 7. HTTP POST: baseURL/chat/completions
    │     Authorization: Bearer sk-or-v1-...
    │     Body: { model, messages, stream: true }
    │
    ├── 8. 解析SSE → AsyncIterable<StreamChunk>
    │
    └── 9. 每个chunk:
          yield给AIEngine → React Hook → NodeCard实时逐token渲染
          用户可随时点击"取消"→ abortSignal触发 → HTTP请求中断
```

### 3.9 错误处理与降级

```typescript
// AIGateway 错误处理
try {
  for await (const chunk of gateway.streamGenerate('extension', opts)) {
    yield chunk;
  }
} catch (error) {
  if (error.name === 'AbortError') {
    // 用户主动取消，正常
    yield { type: 'done' };
  } else if (isRateLimitError(error)) {
    // 速率限制 → 提示用户
    yield { type: 'error', content: 'API速率限制，请稍后重试' };
  } else if (isAuthError(error)) {
    // 认证失败 → 引导用户检查API Key
    yield { type: 'error', content: 'API Key无效，请检查AI设置' };
  } else if (isConnectionError(error)) {
    // 连接失败 → 对于后台扫描任务静默重试，对于用户主动触发通知
    yield { type: 'error', content: `连接失败: ${error.message}` };
  } else {
    yield { type: 'error', content: `AI调用出错: ${error.message}` };
  }
}

// 后台关联扫描的降级策略:
// 远程模型不可用 → 跳过本次扫描 → 下次有输入时重试
// 本地Ollama不可用且deviation-detect配置为本地的 → 降级使用defaultModel
```


## 第四部分：数据流

### 4.1 核心数据流

```
用户输入 (Aha模式)
    │
    ▼
QuickInput组件
    │
    ▼
ApplicationService.handleNewThought()
    │
    ├──→ DeviationDetector.check()     ← L1核心记忆
    │         │
    │         ├── 偏离 → 返回询问给用户
    │         └── 相关 ↓
    │
    ├──→ NodeManager.createNode()
    │         │
    │         └──→ FileSystemService.writeNode()
    │                    │
    │                    └──→ git2-rs add() + commit()（Rust侧）
    │
    ├──→ MemorySystem.addToBuffer()
    │
    └──→ AIEngine.scanAssociations() (后台异步)
               │
               │  使用 association-scan 任务对应的模型
               │
               └──→ LocalCache.setAssociationCache()
                         │
                         └── (结果不呈现，等待Zen模式)
```

```
用户切换至Zen模式
    │
    ▼
ApplicationService.switchToZenMode()
    │
    ├──→ GraphEngine.buildGraph()
    │         │
    │         ├──→ FileSystemService.readGraphIndex()
    │         ├──→ 批量 readNode()
    │         └──→ LocalCache.getAssociationCache()
    │                    │
    │                    └──→ 组装 GraphData
    │                         (AI建议虚线 + 用户确认实线)
    │
    └──→ 更新 AppState.graphData
              │
              └──→ G6渲染图 + Motion初始散布→收敛动画
```

```
用户确认分支
    │
    ▼
ApplicationService.handleBranchConfirmation()
    │
    ├──→ NodeManager.createNode(extensionContent)
    │         │
    │         └──→ FileSystemService.writeNode() + git2-rs commit()
    │
    ├──→ GraphEngine.addEdge(parentId, newId, 'user-confirmed')
    │         │
    │         └──→ 更新 graph-index.json + git2-rs commit()
    │
    └──→ MemorySystem.updateWorkingContext()
```

### 4.2 AI上下文组装流程

```
AI调用请求 (如：延展某个节点)
    │
    ▼
MemorySystem.getCoreMemory(projectId)
    │
    ├──→ 返回 L1核心记忆
    │
    ▼
MemorySystem.getWorkingContext(projectId, focusNodeId)
    │
    ├──→ 返回 L2中景记忆（图遍历组装）
    │
    ▼
AIEngine 组装完整上下文
    │
    ├──→ system prompt:
    │     [L1项目宪章]
    │     + [AI人格描述] (extension/devils-advocate/association-scan/...)
    │     + [结构化输出指令] (association-scan/deviation-detect时)
    │
    ├──→ user message:
    │     [L2当前上下文摘要]
    │     + [用户当前选中的节点完整内容]
    │     + [用户可能的补充指令]
    │
    ▼
AIGateway.streamGenerate() / generateStructured()
    │
    ├──→ 路由到配置的模型
    ├──→ 获取API Key（从系统密钥链）
    └──→ 选择适配器 → 发起请求
```


## 第五部分：项目结构

```
aha-creative-tool/
├── src/
│   ├── main/                     # Tauri主进程（Rust侧）
│   │   ├── main.rs               # 窗口创建、系统托盘
│   │   ├── git_commands.rs       # Git操作 (git2-rs)
│   │   └── fs_commands.rs        # 文件系统桥接 (notify)
│   │
│   ├── presentation/             # 表示层
│   │   ├── components/
│   │   │   ├── AhaMode/
│   │   │   │   ├── QuickInput.tsx
│   │   │   │   ├── NodeStack.tsx
│   │   │   │   └── QuickZenButton.tsx
│   │   │   ├── ZenMode/
│   │   │   │   ├── GraphCanvas.tsx        # G6/Graphin 容器
│   │   │   │   ├── NodeCard.tsx           # 节点卡片 (Motion动画)
│   │   │   │   ├── NodeEditor.tsx         # TipTap编辑器
│   │   │   │   ├── ExtensionPanel.tsx     # AI延展流式面板
│   │   │   │   ├── ExtensionStreamView.tsx
│   │   │   │   ├── ConfirmBranchButton.tsx
│   │   │   │   ├── DevilsAdvocateButton.tsx
│   │   │   │   ├── GraphToolbar.tsx
│   │   │   │   ├── SearchPanel.tsx
│   │   │   │   └── ContextMenu.tsx
│   │   │   ├── Settings/
│   │   │   │   ├── AISettingsModal.tsx
│   │   │   │   ├── ProviderList.tsx
│   │   │   │   ├── ProviderEditor.tsx
│   │   │   │   └── ModelRoutingTable.tsx
│   │   │   ├── SummaryModal/
│   │   │   ├── ExportDialog/
│   │   │   └── common/
│   │   ├── hooks/
│   │   │   ├── useAIExtension.ts
│   │   │   ├── useGraphInteraction.ts
│   │   │   └── useModeTransition.ts
│   │   ├── stores/               # Zustand stores
│   │   │   ├── appStore.ts
│   │   │   └── aiSettingsStore.ts
│   │   └── styles/
│   │
│   ├── application/              # 应用层
│   │   ├── services/
│   │   │   └── ApplicationService.ts
│   │   └── workflows/
│   │
│   ├── domain/                   # 领域层（零外部依赖）
│   │   ├── graph-engine/
│   │   │   ├── GraphEngine.ts
│   │   │   └── types.ts
│   │   ├── ai-engine/
│   │   │   ├── AIEngine.ts
│   │   │   ├── prompts/
│   │   │   │   ├── extension.ts
│   │   │   │   ├── devils-advocate.ts
│   │   │   │   ├── association-scan.ts
│   │   │   │   ├── deviation-detect.ts
│   │   │   │   ├── summary.ts
│   │   │   │   └── system-prompts.ts
│   │   │   └── types.ts
│   │   ├── memory-system/
│   │   │   ├── MemorySystem.ts
│   │   │   └── types.ts
│   │   ├── deviation-detector/
│   │   ├── review-engine/
│   │   └── summary-generator/
│   │
│   ├── infrastructure/           # 基础设施层
│   │   ├── git/
│   │   │   └── TauriGitService.ts   # invoke Rust commands
│   │   ├── filesystem/
│   │   │   └── TauriFileSystemService.ts
│   │   ├── ai/
│   │   │   ├── AIGateway.ts
│   │   │   ├── ModelRouter.ts
│   │   │   ├── ProviderRegistry.ts
│   │   │   ├── AdapterFactory.ts
│   │   │   ├── adapters/
│   │   │   │   ├── OpenAICompatAdapter.ts
│   │   │   │   └── AnthropicAdapter.ts
│   │   │   └── types.ts
│   │   ├── credentials/
│   │   │   └── TauriCredentialStore.ts
│   │   └── cache/
│   │       └── DexieCache.ts
│   │
│   └── shared/                   # 共享类型与工具
│       ├── types/
│       └── utils/
│
├── src-tauri/                    # Tauri Rust代码
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs               # Tauri入口 + 插件注册
│       ├── git_commands.rs       # git2-rs 操作
│       ├── fs_commands.rs        # 文件操作
│       └── keyring_commands.rs   # 凭据存储桥接
│
├── tests/                        # E2E测试
│   └── e2e/
│       ├── aha-mode.spec.ts
│       ├── zen-mode.spec.ts
│       └── ai-settings.spec.ts
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```


## 第六部分：关键技术决策记录

| 决策 | 选择 | 理由 |
|:---|:---|:---|
| 全栈语言 | TypeScript + Rust | TypeScript统一前后端，Rust处理Git/密钥链等重型原生操作 |
| 桌面框架 | Tauri v2 | 轻量<10MB，跨平台，Rust性能 |
| 图可视化 | **AntV G6 v5** | Canvas/WebGL多后端，内置脉络图所需全部交互和布局，中文生态完善，活跃维护 |
| Git操作 | **git2-rs** (通过Tauri Command) | Rust原生libgit2绑定，性能远优于isomorphic-git，与Tauri架构完美契合 |
| AI SDK | Vercel AI SDK v6 (`ai` 包) + `@ai-sdk/openai` / `@ai-sdk/anthropic` | 轻量，厂商无关，`streamText`+`generateObject`精确匹配AHA场景。使用dedicated provider直连（非Vercel AI Gateway），支持运行时动态API Key注入 |
| AI框架 | **不用LangChain** | 过度抽象，调试困难，为Chain/Agent设计，与AHA的AI约束哲学错配 |
| AI供应商 | OpenAI-compatible协议 + 用户自主配置 | 一个Adapter覆盖95%+供应商（DeepSeek/Ollama/智谱/通义/豆包等全部兼容） |
| 凭据存储 | tauri-plugin-keyring (v0.1.0)，备选方案：Rust `keyring` crate (v3) | ⚠️ tauri-plugin-keyring 早期版本（9 commits，6 stars），若不稳定则切换到 rust `keyring` crate + 自定义 Tauri command |
| 富文本编辑 | TipTap | 基于ProseMirror，Markdown友好，移动端兼容性最好，v4.0协作功能储备 |
| 状态管理 | Zustand + zundo | ~1KB+<700B，极简API，zundo提供撤销/重做 |
| UI组件 | shadcn/ui + Radix | 可定制，无障碍，2026年React生态默认选择 |
| 动画 | **Motion**（`motion` 包，`import { motion } from "motion/react"`） | ⚠️ 原 framer-motion 已改名为 motion。声明式API，layout animation，AnimatePresence处理模式切换过渡 |
| 本地缓存 | Dexie.js (IndexedDB) | ~10KB，轻量，v1.0足够 |
| Markdown解析 | unified + remark + rehype | AST管道架构，支持格式化、安全处理，生态最全 |
| 图布局 | G6内置（dendrogram/mindmap/force/dagre） | G6内置10+布局算法，dendrogram与AHA主干方案视觉完美匹配 |
| CSS | Tailwind CSS | 原子化CSS，与shadcn/ui配合 |
| 测试(单元/组件) | Vitest + React Testing Library | 与Vite共享配置，~3.8x快于Jest，原生TS/ESM |
| 测试(E2E) | Playwright | 唯一同时支持WebKit+Chromium，匹配Tauri桌面端双浏览器引擎 |
| 拖拽 | dnd-kit（非图谱的UI拖拽） | ~10KB，轻量模块化，触摸/键盘/无障碍支持完善 |


## 第七部分：开发阶段规划

### Phase 1: 核心骨架 (MVP验证)
- Tauri v2项目搭建 + Vite + React 18 + TypeScript
- 基础UI框架（shadcn/ui + Zustand + zundo + Motion）
- G6 v5 + Graphin集成，空图画布可渲染
- 文本输入 → 创建节点（Markdown文件） → 图上显示
- 节点拖拽、缩放、撤销/重做
- 即时Zen模式（少量节点快速预览）

### Phase 2: Git与数据
- git2-rs集成（Tauri Command）
- 文件系统读写（节点=Markdown，脉络=graph-index.json）
- 基础Git操作（init、add、commit、branch、tag）
- 项目配置（project-constitution.md）读写
- Dexie.js本地缓存

### Phase 3: AI引擎
- Vercel AI SDK集成
- AI Gateway（供应商管理、模型路由、凭据存储）
- OpenAICompatAdapter + AnthropicAdapter
- 延展引擎实现（流式输出到ExtensionPanel）
- 恶魔代言人实现
- 关联扫描实现（后台异步、结果缓存）
- 偏离检测实现
- L1/L2记忆管理
- Prompt管理模块
- AI供应商设置UI

### Phase 4: 完整工作流
- Aha↔Zen模式切换（Motion过渡动画）
- 确认分支机制（提取为固化分支）
- 修剪与归档（→git rm + commit + archive/）
- 标记主干方案（→git tag）
- 节点搜索（标题/全文）
- 导出实施构建包（→git archive）
- 图布局切换（力导向/层次/树状）

### Phase 5: 润色与交付
- Summary模式（含命名仪式）
- 移动端PWA极简输入
- 性能优化（大图G6 Canvas渲染、增量更新）
- 节点展开/折叠、主题簇Combo
- 交互细节打磨（右键菜单、快捷键、通知）

### Phase 6: 测试与发布
- 领域层 Vitest 单元测试（覆盖率>80%）
- 应用层 Vitest 集成测试
- 组件测试（React Testing Library + Vitest Browser Mode）
- Playwright E2E（核心用户流程 + WebKit/Chromium）
- Rust侧 `cargo test`（git_commands, fs_commands）
- CI/CD流水线（GitHub Actions）
- 用户文档与README


## 第八部分：测试策略

### 8.1 测试金字塔

```
        ┌──────────┐
        │ Playwright │  ← 核心用户流程 E2E
        │   E2E      │     WebKit (macOS/Linux) + Chromium (Windows)
        ├────────────┤
        │   Vitest   │  ← 组件集成测试
        │ Integration│     Tauri command mocks
        ├────────────┤
        │   Vitest   │  ← 领域层纯逻辑 + Hooks + Utils
        │    Unit    │     快速、隔离、确定性
        ├────────────┤
        │  Rust test │  ← git2-rs, fs操作, keyring
        │  (backend) │
        └────────────┘
```

### 8.2 关键测试覆盖

| 测试目标 | 框架 | 说明 |
|:---|:---|:---|
| GraphEngine | Vitest | 图构建、节点/边增删、主干标记、修剪归档 |
| AIEngine | Vitest | Prompt组装、上下文注入、流式chunk处理 |
| MemorySystem | Vitest | L1/L2上下文组装、L2图遍历算法 |
| DeviationDetector | Vitest | 偏离判断逻辑（mock AIAdapter） |
| AIGateway | Vitest | 路由逻辑、适配器选择、错误处理 |
| GitService | `cargo test` | git init/commit/rm/tag/branch/log |
| CredentialStore | `cargo test` | keychain存储/读取/删除 |
| 组件渲染 | Vitest + RTL | UI组件渲染、交互事件 |
| 完整用户旅程 | Playwright | Aha输入→Zen查看→延展→确认→修剪→导出 |


## 第九部分：安全设计

### 9.1 API Key 安全

```
存储层级:
  UX层:    用户输入Key → Tauri Command → Rust侧存储
  内存:    Key仅在发起HTTP请求时从密钥链读取，用完即弃
  持久化:  系统原生密钥链（macOS Keychain / Windows Credential Manager）
          配置文件中仅存储 apiKeyRef 标记

绝对禁止:
  ❌ localStorage / sessionStorage
  ❌ 项目文件夹明文文件 (project-config.json)
  ❌ 全局配置明文文件 (~/.aha/providers.json)
  ❌ 前端持有Key明文超过一次请求的生命周期
  ❌ 将Key写入日志/错误信息/分析数据

Key生命周期:
  用户输入 → invoke('store_key', {id, key})
    → Rust: keyring::Entry::new("aha", id).set_password(key)
    → 前端仅保留 apiKeyRef: "my-openai"
    
  发起AI请求时:
    前端: invoke('get_key', {id: "my-openai"})
    → Rust: keyring::Entry::new("aha", id).get_password()
    → Rust: 注入到HTTP请求头 → 发起请求 → 立即丢弃
```

### 9.2 用户数据安全

- 所有创意数据存储在本地项目文件夹
- 不经过任何第三方服务器
- AI调用直接连接用户配置的供应商端点
- 不收集任何使用数据或遥测（除非用户主动选择开启）


## 第十部分：文件结构详情

```
项目根目录/
├── .git/                       # Git仓库（git2-rs管理）
├── nodes/                      # 创意节点（每个一个.md文件）
│   ├── {slug1}.md
│   ├── {slug2}.md
│   └── ...
├── graph-index.json            # 脉络图结构索引
├── project-constitution.md     # L1核心记忆 + 项目配置
├── archive/                    # 归档的废弃分支
│   └── ...
└── exports/                    # 导出的构建包
    ├── PROJECT_CONTEXT.md
    └── DEVELOPMENT_PACK.md

全局用户配置:
  ~/.aha/
    ├── providers.json           # AI供应商配置（不含Key明文）
    ├── global-routing.json      # 全局默认模型路由
    └── usage.db                 # 用量记录（SQLite）
```

API Key 存储在系统原生密钥链中，与配置文件完全分离。


## 第十一部分：依赖库版本与配置参考

### 11.1 核心依赖一览

本表记录所有依赖库的最新版本（截至2026年6月）、安装方式及关键注意事项。

#### 前端核心

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| React | `react`, `react-dom` | `npm i react@18 react-dom@18` | 使用 React 18，等待 dnd-kit React 19 适配完成后升级 |
| Vite | `vite` | 项目脚手架自带 | Tauri v2 默认使用 Vite |
| TypeScript | `typescript` | `npm i -D typescript` | 全栈 TS |

#### 图可视化

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| G6 v5 | `@antv/g6` | `npm i @antv/g6` | ⚠️ v5 API 与 v4 不兼容。数据格式：NodeData/EdgeData/ComboData |
| Graphin | `@antv/graphin` | `npm i @antv/graphin` | G6 的 React 封装，声明式组件 |

#### AI

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| Vercel AI SDK | `ai` | `npm i ai` | v6.x，文档域名 `ai-sdk.dev` |
| OpenAI provider | `@ai-sdk/openai` | `npm i @ai-sdk/openai` | `openai('model-id')`，默认读 `OPENAI_API_KEY` 环境变量 |
| Anthropic provider | `@ai-sdk/anthropic` | `npm i @ai-sdk/anthropic` | `anthropic('model-id')`，默认读 `ANTHROPIC_API_KEY` 环境变量 |
| Ollama (兼容) | 通过 `@ai-sdk/openai-compatible` 或自定义 fetch | — | Ollama 暴露 OpenAI-compatible `/v1/chat/completions` 端点 |

> ⚠️ **Vercel AI SDK 动态 API Key 注入**：AHA 需要运行时从系统密钥链获取 API Key，而非依赖环境变量。需确认 `createOpenAI({ apiKey: '...' })` 或自定义 `fetch` 中间件注入 Key 的方式。不使用 Vercel AI Gateway（`gateway('provider/model')` 模式）。

#### 编辑器

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| TipTap | `@tiptap/react`, `@tiptap/starter-kit` | `npm i @tiptap/react @tiptap/starter-kit` | 免费版：StarterKit + 图片/表格/历史/占位符，v1.0 够用。收费版：评论/AI/版本历史 |

#### 状态与交互

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| Zustand | `zustand` | `npm i zustand` | v5.x，~1KB |
| zundo | `zundo` | `npm i zundo` | v2.3.0，支持 Zustand v5，<700B |
| Motion | `motion` | `npm i motion` | ⚠️ 原 `framer-motion`，导入：`import { motion } from "motion/react"` |
| dnd-kit | `@dnd-kit/core` | `npm i @dnd-kit/core` | vLatest，2026年4月活跃。React 18 无问题，React 19 状态待确认 |

#### UI 基础

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| shadcn/ui | — | `npx shadcn@latest init` | 非 npm 包，源码直接拷入项目 |
| Radix UI | `@radix-ui/*` | shadcn 自动安装 | |
| Tailwind CSS | `tailwindcss` | `npm i -D tailwindcss` | v4.x |
| Lucide Icons | `lucide-react` | shadcn 自动安装 | |

#### Markdown 处理

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| unified | `unified` | `npm i unified` | AST 管道核心 |
| remark | `remark-parse`, `remark-gfm` | `npm i remark-parse remark-gfm` | Markdown → mdast |
| rehype | `rehype-stringify`, `rehype-sanitize` | `npm i rehype-stringify rehype-sanitize` | hast → HTML，安全过滤 |

#### 测试

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| Vitest | `vitest` | `npm i -D vitest` | v3.x，与 Vite 共享配置 |
| RTL | `@testing-library/react` | `npm i -D @testing-library/react` | |
| Playwright | `@playwright/test` | `npm i -D @playwright/test` | v1.x，需 `npx playwright install` |

#### 本地存储

| 库 | 包名 | 安装 | 关键注意事项 |
|:---|:---|:---|:---|
| Dexie.js | `dexie` | `npm i dexie` | v4.x，IndexedDB 封装，~10KB |

#### Rust 侧 (Cargo.toml)

| Crate | 安装 | 关键注意事项 |
|:---|:---|:---|
| `tauri` | `tauri = "2"` | Tauri v2 stable |
| `git2` (git2-rs) | `git2 = "0.19"` | Rust libgit2 绑定，系统需安装 libgit2 或使用 vendored 特性 |
| `keyring` | `keyring = "3"` | 备选方案：直接使用而非 tauri-plugin-keyring。macOS Keychain / Windows Credential Manager / Linux Secret Service |
| `tauri-plugin-keyring` | `tauri-plugin-keyring = "0.1.0"` | ⚠️ 早期版本，首选尝试。JS 侧：`tauri-plugin-keyring-api` |
| `serde` + `serde_json` | `serde = { version = "1", features = ["derive"] }` `serde_json = "1"` | 序列化/反序列化 |
| `thiserror` | `thiserror = "2"` | 自定义错误类型 |
| `tokio` | `tokio = { version = "1", features = ["full"] }` | 异步运行时 |
| `notify` | `notify = "7"` | 文件系统监听 |

### 11.2 版本兼容性矩阵

| 依赖组合 | 兼容状态 | 备注 |
|:---|:---|:---|
| React 18 + dnd-kit | ✅ | React 18 完全支持，dnd-kit React 19 适配仍在进行 |
| React 18 + Motion | ✅ | Motion 支持 React 18+ |
| Zustand v5 + zundo v2.3.0 | ✅ | zundo v2.3.0 明确支持 Zustand v5 |
| Tauri v2 + git2-rs v0.19 | ✅ | 通过 Tauri command 桥接，无冲突 |
| Tauri v2 + tauri-plugin-keyring v0.1.0 | ⚠️ | 需 Rust ≥ 1.77.2 |
| Vercel AI SDK v6 + @ai-sdk/* | ✅ | v6 为当前主版本 |
| Vite + Vitest | ✅ | 共享配置，零额外设置 |

### 11.3 开发文档存放位置

各依赖库的最新文档（API 参考、使用指南）存放在 `docs/reference/` 目录下，按库名分文件夹：

```
docs/reference/
├── g6-v5/                    # G6 v5 API 参考
├── vercel-ai-sdk-v6/         # Vercel AI SDK v6 文档
├── motion/                   # Motion (原 framer-motion) React API
├── tauri-v2/                 # Tauri v2 开发文档
├── tiptap/                   # TipTap 编辑器文档
└── tauri-plugin-keyring/     # Keyring 插件文档
```

> 这些文档供开发时查阅。若库发布了主版本更新，应及时拉取最新文档替换。

