import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationService } from './ApplicationService';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    writeNode: vi.fn(),
    readNode: vi.fn(),
    readGraphIndex: vi.fn(),
    writeGraphIndex: vi.fn(),
    nodePath: vi.fn((projectPath: string, nodeId: string) => `${projectPath}/nodes/${nodeId}.md`),
  },
}));

vi.mock('@infrastructure/filesystem/TauriFileSystemService', () => ({
  fileSystemService: {
    writeNode: mocks.writeNode,
    readNode: mocks.readNode,
    readGraphIndex: mocks.readGraphIndex,
    writeGraphIndex: mocks.writeGraphIndex,
    nodePath: mocks.nodePath,
  },
  nodeToMarkdown: (node: { id: string; title: string; content: string }) =>
    `---\nid: ${node.id}\ntitle: ${node.title}\n---\n\n${node.content}`,
}));

vi.mock('@infrastructure/git/TauriGitService', () => ({
  TauriGitService: class MockTauriGitService {
    add = vi.fn().mockResolvedValue(undefined);
    commit = vi.fn().mockResolvedValue('abc123');
    rm = vi.fn().mockResolvedValue(undefined);
    createTag = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('ApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readGraphIndex.mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
      clusters: [],
      mainBranches: [],
    });
  });

  it('handleNewThought returns a node in-memory', async () => {
    const service = new ApplicationService();
    const node = await service.handleNewThought('Hello idea', null);
    expect(node.title).toBe('Hello idea');
    expect(node.content).toBe('Hello idea');
    expect(mocks.writeNode).not.toHaveBeenCalled();
  });

  it('handleNewThought writes file and updates index when projectPath is set', async () => {
    const service = new ApplicationService();
    const node = await service.handleNewThought('Project idea', '/projects/test');
    expect(node.title).toBe('Project idea');
    expect(mocks.writeNode).toHaveBeenCalledOnce();
    expect(mocks.writeGraphIndex).toHaveBeenCalledOnce();
    const updatedIndex = mocks.writeGraphIndex.mock.calls[0][1];
    expect(updatedIndex.nodes).toHaveLength(1);
    expect(updatedIndex.nodes[0].title).toBe('Project idea');
  });

  it('handleBranchConfirmation creates a child node and edge', async () => {
    const service = new ApplicationService();
    const result = await service.handleBranchConfirmation(
      'parent-1',
      'Extension text',
      '/projects/test',
    );
    expect(result.node.title).toBe('Extension text');
    expect(result.edgeId).toContain('parent-1');
    expect(mocks.writeNode).toHaveBeenCalledOnce();
    const updatedIndex = mocks.writeGraphIndex.mock.calls[0][1];
    expect(updatedIndex.edges).toHaveLength(1);
    expect(updatedIndex.edges[0].sourceId).toBe('parent-1');
  });

  it('handlePruning archives node and updates index', async () => {
    mocks.readGraphIndex.mockResolvedValue({
      version: 1,
      nodes: [
        {
          id: 'n1',
          filename: 'n1.md',
          title: 'T',
          status: 'active',
          createdAt: '',
          updatedAt: '',
          tags: [],
        },
      ],
      edges: [],
      clusters: [],
      mainBranches: [],
    });

    const service = new ApplicationService();
    await service.handlePruning('n1', '不再相关', '/projects/test');
    const updatedIndex = mocks.writeGraphIndex.mock.calls[0][1];
    expect(updatedIndex.nodes[0].status).toBe('archived');
  });
});
