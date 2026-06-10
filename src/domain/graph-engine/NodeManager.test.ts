import { describe, it, expect } from 'vitest';
import { NodeManager, generateSlug, validateNode } from './NodeManager';

describe('generateSlug', () => {
  it('slugifies English titles', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('preserves Chinese characters', () => {
    expect(generateSlug('人工智能')).toBe('人工智能');
  });

  it('trims and collapses dashes', () => {
    expect(generateSlug('  A   B  ')).toBe('a-b');
  });

  it('falls back to "node" for empty input', () => {
    expect(generateSlug('!!!')).toBe('node');
  });
});

describe('validateNode', () => {
  it('accepts a valid node', () => {
    const node = {
      id: 'n1',
      title: 'T',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active' as const,
      tags: [],
      metadata: {},
    };
    expect(validateNode(node)).toBe(true);
  });

  it('rejects invalid shapes', () => {
    expect(validateNode(null)).toBe(false);
    expect(validateNode({})).toBe(false);
    expect(
      validateNode({
        id: 1,
        title: 'T',
        content: '',
        createdAt: '',
        updatedAt: '',
        status: 'active',
        tags: [],
        metadata: {},
      }),
    ).toBe(false);
  });
});

describe('NodeManager', () => {
  it('creates a node with generated id and timestamps', () => {
    const manager = new NodeManager();
    const node = manager.createNode('创意萌芽', '这是一个想法');
    expect(node.title).toBe('创意萌芽');
    expect(node.content).toBe('这是一个想法');
    expect(node.status).toBe('active');
    expect(node.id).toContain('创意萌芽');
    expect(manager.count).toBe(1);
  });

  it('tracks recent nodes', () => {
    const manager = new NodeManager();
    manager.createNode('First');
    manager.createNode('Second');
    manager.createNode('Third');
    expect(manager.recent(2)).toHaveLength(2);
    expect(manager.recent(2)[0].title).toBe('Third');
  });

  it('updates content and bumps timestamp', () => {
    const manager = new NodeManager();
    const node = manager.createNode('N');
    const updated = manager.updateContent(node.id, 'Updated');
    expect(updated?.content).toBe('Updated');
    expect(updated!.updatedAt).not.toBe(node.updatedAt);
  });

  it('sets position and status', () => {
    const manager = new NodeManager();
    const node = manager.createNode('N');
    manager.setPosition(node.id, { x: 10, y: 20 });
    expect(manager.getNode(node.id)?.position).toEqual({ x: 10, y: 20 });
    manager.setStatus(node.id, 'archived');
    expect(manager.getNode(node.id)?.status).toBe('archived');
  });

  it('removes a node', () => {
    const manager = new NodeManager();
    const node = manager.createNode('N');
    expect(manager.removeNode(node.id)).toBe(true);
    expect(manager.count).toBe(0);
    expect(manager.removeNode('missing')).toBe(false);
  });

  it('searches by title and content', () => {
    const manager = new NodeManager();
    manager.createNode('Apple', 'A fruit');
    manager.createNode('Banana', 'Yellow');
    manager.createNode('Car', 'Apple car maybe');
    expect(manager.search('apple')).toHaveLength(2);
    expect(manager.search('yellow')).toHaveLength(1);
  });

  it('loads nodes while filtering invalid ones', () => {
    const manager = new NodeManager();
    manager.load([
      {
        id: 'n1',
        title: 'Valid',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        tags: [],
        metadata: {},
      },
      {} as never,
    ]);
    expect(manager.count).toBe(1);
  });

  it('clears all nodes', () => {
    const manager = new NodeManager();
    manager.createNode('A');
    manager.clear();
    expect(manager.count).toBe(0);
  });
});
