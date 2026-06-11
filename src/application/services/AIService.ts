import { AIGateway } from '@infrastructure/ai/AIGateway';
import { AIEngine } from '@domain/ai-engine/AIEngine';
import { MemorySystem } from '@domain/memory-system/MemorySystem';
import { TauriCredentialStore } from '@infrastructure/credentials/TauriCredentialStore';
import type { ProviderConfig, ModelRoutingTable } from '@infrastructure/ai/types';
import type { GraphData, ThoughtNode } from '@domain/graph-engine/types';

let _instance: AIService | null = null;

export class AIService {
  public gateway: AIGateway;
  public engine: AIEngine;
  public memory: MemorySystem;

  private constructor() {
    const credentialStore = new TauriCredentialStore();
    this.gateway = new AIGateway(credentialStore);
    this.engine = new AIEngine({ gateway: this.gateway });
    this.memory = new MemorySystem();
  }

  static getInstance(): AIService {
    if (!_instance) {
      _instance = new AIService();
    }
    return _instance;
  }

  /** true when providers + routing are both configured */
  get isConfigured(): boolean {
    return this.gateway.listProviders().length > 0 && !!this.gateway.getRoutingTable();
  }

  /** Configure from persisted settings (called on app mount / after settings change) */
  configure(providers: ProviderConfig[], routing: ModelRoutingTable): void {
    // Clear and rebuild registry
    for (const p of this.gateway.listProviders()) {
      this.gateway.removeProvider(p.id);
    }
    for (const p of providers) {
      this.gateway.registerProvider(p);
    }
    this.gateway.setRoutingTable(routing);
  }

  /** Initialize L1 core memory for a project */
  initCoreMemory(projectGoal: string, constraints: string[] = [], projectType = 'other'): void {
    this.memory.updateCoreMemory({
      projectGoal,
      constraints,
      keyDecisions: [],
      projectType,
    });
  }

  /** Scan associations for a newly created node (used in Aha mode). Returns results that can be cached. */
  async scanAssociationsForNode(
    newNode: ThoughtNode,
    graphData: GraphData,
  ): Promise<Array<{ nodeBId: string; strength: number; reason: string }>> {
    if (!this.isConfigured) return [];

    const coreMemory = this.memory.getCoreMemory();
    const allNodes = graphData.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content.slice(0, 500),
    }));

    return this.engine.scanAssociations(
      coreMemory,
      newNode.id,
      newNode.title,
      newNode.content.slice(0, 500),
      allNodes,
    );
  }
}
