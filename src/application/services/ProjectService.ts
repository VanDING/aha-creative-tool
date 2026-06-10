/**
 * AHA Project Service
 *
 * Orchestrates project lifecycle: create, open, and load project metadata.
 * Coordinates FileSystemService (Rust-backed) and GitService.
 */

import { fileSystemService, GraphIndex } from '@infrastructure/filesystem/TauriFileSystemService';
import { TauriGitService } from '@infrastructure/git/TauriGitService';

export type ProjectType = 'novel' | 'software' | 'design' | 'research' | 'other';

export interface ProjectMeta {
  path: string;
  name: string;
  type: ProjectType;
  createdAt: string;
}

export interface Project {
  meta: ProjectMeta;
  constitution: string;
  graphIndex: GraphIndex;
}

const DEFAULT_CONSTITUTION_TEMPLATE = (name: string, type: ProjectType) => `# ${name} — 项目宪章

## 项目类型
${type}

## 核心目标
（在此处描述这个创意项目最终要达成什么）

## 约束条件
- 

## 关键决策记录
暂无

## 备注
此文件由 AHA 自动生成。你可以随时编辑它，AI 会将其作为最高优先级上下文参考。
`;

export class ProjectService {
  private fs = fileSystemService;

  /**
   * Create a new AHA project on disk.
   * - Creates directory structure (nodes/, archive/, exports/)
   * - Initializes a Git repository
   * - Writes project-constitution.md
   * - Writes empty graph-index.json
   */
  async createProject(name: string, type: ProjectType, projectPath: string): Promise<Project> {
    const git = new TauriGitService(projectPath);

    // 1. Create dirs and init git
    await this.fs.createProjectDirs(projectPath);
    await git.init(projectPath);

    const now = new Date().toISOString();

    // 2. Write constitution
    const constitution = DEFAULT_CONSTITUTION_TEMPLATE(name, type);
    const constitutionFilename = 'project-constitution.md';
    const constitutionFullPath = `${projectPath}/${constitutionFilename}`;
    await this.fs.writeNode(constitutionFullPath, constitution);

    // 3. Write empty graph index
    const graphIndex: GraphIndex = {
      version: 1,
      nodes: [],
      edges: [],
      clusters: [],
      mainBranches: [],
    };
    await this.fs.writeGraphIndex(projectPath, graphIndex);

    // 4. Initial commit
    await git.add(constitutionFilename);
    await git.add('graph-index.json');
    await git.commit(`创建项目: ${name}`);

    return {
      meta: {
        path: projectPath,
        name,
        type,
        createdAt: now,
      },
      constitution,
      graphIndex,
    };
  }

  /**
   * Open an existing project and load its metadata.
   */
  async openProject(projectPath: string): Promise<Project | null> {
    try {
      const graphIndex = await this.fs.readGraphIndex(projectPath);
      const constitutionPath = `${projectPath}/project-constitution.md`;
      let constitution = '';
      try {
        constitution = await this.fs.readNode(constitutionPath);
      } catch {
        // Constitution may be missing; that's okay for open.
      }

      const name = graphIndex.nodes[0]?.title || '未命名项目';
      const type: ProjectType = 'other';

      return {
        meta: {
          path: projectPath,
          name,
          type,
          createdAt: new Date().toISOString(),
        },
        constitution,
        graphIndex,
      };
    } catch {
      return null;
    }
  }
}

export const projectService = new ProjectService();
