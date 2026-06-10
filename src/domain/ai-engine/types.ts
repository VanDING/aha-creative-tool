/**
 * AHA AI Engine — Domain Types
 */

export interface ExtensionChunk {
  type: 'direction' | 'content' | 'done';
  directionId?: string;
  title?: string;
  content?: string;
  confidence?: number;
}

export interface SuggestedAssociation {
  nodeAId: string;
  nodeBId: string;
  reason: string;
  strength: number;
}

export interface DeviationResult {
  type: 'relevant' | 'uncertain' | 'deviated';
  confidence: number;
  message?: string;
}

export interface CritiqueChunk {
  type: 'logical-flaw' | 'risk-analysis' | 'alternative-view' | 'completeness-check';
  severity: 'critical' | 'warning' | 'suggestion';
  content: string;
}

export type CritiqueType = CritiqueChunk['type'];
