import type { ShotSlotKind, WorkspaceNode } from '../../types';

export interface ProductionMaterial {
  id: string;
  name: string;
  type: ShotSlotKind;
  durationSeconds: number;
  tags: string[];
  maxRefs: number;
  createdAt: number;
}

export interface MaterialUsage {
  materialId: string;
  refCount: number;
  shotNodeIds: string[];
}

export interface ProductionWarning {
  id: string;
  kind: 'over-referenced' | 'missing-slot';
  message: string;
  materialId?: string;
  nodeId?: string;
  slot?: ShotSlotKind;
}

export interface CallSheetShot {
  node: WorkspaceNode;
  title: string;
  estimatedSeconds: number;
  actualSeconds: number | null;
  done: boolean;
  materials: Array<{ slot: ShotSlotKind; material: ProductionMaterial | null }>;
  missingRequiredSlots: ShotSlotKind[];
}

export interface CallSheetScene {
  scene: string;
  shots: CallSheetShot[];
  totalEstimatedSeconds: number;
  doneCount: number;
}

export interface TalkingHeadRun {
  shotTitles: string[];
  totalSeconds: number;
}

export interface DashboardStats {
  shotCount: number;
  durationBars: Array<{ title: string; seconds: number; done: boolean }>;
  brollCoverage: number;
  brollCoveredCount: number;
  talkingHeadRuns: TalkingHeadRun[];
  totalEstimatedSeconds: number;
  totalActualSeconds: number;
}
