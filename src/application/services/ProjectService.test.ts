import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './ProjectService';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    createProjectDirs: vi.fn().mockResolvedValue(undefined),
    writeNode: vi.fn().mockResolvedValue(undefined),
    writeGraphIndex: vi.fn().mockResolvedValue(undefined),
    readGraphIndex: vi.fn().mockResolvedValue({
      version: 1,
      nodes: [{ id: 'n1', title: 'Existing' }],
      edges: [],
      clusters: [],
      mainBranches: [],
    }),
    readNode: vi.fn().mockResolvedValue('# Constitution'),
  },
}));

vi.mock('@infrastructure/filesystem/TauriFileSystemService', () => ({
  fileSystemService: {
    createProjectDirs: mocks.createProjectDirs,
    writeNode: mocks.writeNode,
    writeGraphIndex: mocks.writeGraphIndex,
    readGraphIndex: mocks.readGraphIndex,
    readNode: mocks.readNode,
  },
}));

vi.mock('@infrastructure/git/TauriGitService', () => ({
  TauriGitService: class MockGit {
    init = vi.fn().mockResolvedValue(undefined);
    add = vi.fn().mockResolvedValue(undefined);
    commit = vi.fn().mockResolvedValue('abc123');
  },
}));

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createProject returns project with meta and constitution', async () => {
    const service = new ProjectService();
    const project = await service.createProject('Novel', 'novel', '/tmp/novel');
    expect(project.meta.name).toBe('Novel');
    expect(project.meta.type).toBe('novel');
    expect(project.constitution).toContain('项目宪章');
    expect(project.graphIndex.nodes).toEqual([]);
    expect(mocks.createProjectDirs).toHaveBeenCalledWith('/tmp/novel');
  });

  it('openProject loads existing graph index and constitution', async () => {
    const service = new ProjectService();
    const project = await service.openProject('/tmp/old');
    expect(project).not.toBeNull();
    expect(project!.meta.name).toBe('Existing');
    expect(project!.constitution).toContain('Constitution');
  });

  it('openProject returns null when graph index missing', async () => {
    mocks.readGraphIndex.mockRejectedValueOnce(new Error('missing'));
    const service = new ProjectService();
    const project = await service.openProject('/tmp/bad');
    expect(project).toBeNull();
  });
});
