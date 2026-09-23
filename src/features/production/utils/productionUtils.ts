import type { ShotSlotBinding, ShotSlotKind, WorkspaceNode } from '../../../types';
import {
  DEFAULT_MAX_REFS,
  DEFAULT_SCENE_NAME,
  REQUIRED_SLOT_KINDS,
  SLOT_DEFINITIONS,
  SLOT_LABELS,
  TALKING_HEAD_LIMIT_SECONDS,
  WORDS_PER_MINUTE,
} from '../constants';
import type {
  CallSheetScene,
  CallSheetShot,
  DashboardStats,
  MaterialUsage,
  ProductionMaterial,
  ProductionWarning,
  TalkingHeadRun,
} from '../types';

export function countScriptChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

export function estimateSecondsFromText(text: string): number {
  const chars = countScriptChars(text);
  if (chars === 0) return 0;
  return Math.max(1, Math.round((chars / WORDS_PER_MINUTE) * 60));
}

export function normalizeShotSlots(slots: ShotSlotBinding[] | undefined): ShotSlotBinding[] {
  return SLOT_DEFINITIONS.map((def) => {
    const existing = (slots || []).find((slot) => slot.slot === def.kind);
    return { slot: def.kind, materialId: existing?.materialId ?? null };
  });
}

export function getBoundSlotCount(data: { shotSlots?: ShotSlotBinding[] }): number {
  return (data.shotSlots || []).filter((slot) => slot.materialId).length;
}

export function getMissingRequiredSlots(data: { shotSlots?: ShotSlotBinding[] }): ShotSlotKind[] {
  const slots = normalizeShotSlots(data.shotSlots);
  return REQUIRED_SLOT_KINDS.filter((kind) => !slots.find((slot) => slot.slot === kind)?.materialId);
}

export function getShotTitle(node: WorkspaceNode, index: number): string {
  return node.data.title?.trim() || `镜头 ${index + 1}`;
}

export function getShotEstimatedSeconds(node: WorkspaceNode): number {
  if (typeof node.data.estimatedSeconds === 'number' && node.data.estimatedSeconds > 0) {
    return Math.round(node.data.estimatedSeconds);
  }
  return estimateSecondsFromText(node.data.content || '');
}

export function getShotScene(node: WorkspaceNode): string {
  return node.data.scene?.trim() || DEFAULT_SCENE_NAME;
}

export function orderShotNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return [...nodes].sort((a, b) => {
    const sceneCompare = getShotScene(a).localeCompare(getShotScene(b), 'zh-CN');
    if (sceneCompare !== 0) return sceneCompare;
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.position.x - b.position.x;
  });
}

export function computeMaterialUsage(nodes: WorkspaceNode[]): Map<string, MaterialUsage> {
  const usage = new Map<string, MaterialUsage>();
  nodes.forEach((node) => {
    const seenInNode = new Set<string>();
    (node.data.shotSlots || []).forEach((slot) => {
      if (!slot.materialId || seenInNode.has(slot.materialId)) return;
      seenInNode.add(slot.materialId);
      const entry = usage.get(slot.materialId) || { materialId: slot.materialId, refCount: 0, shotNodeIds: [] };
      entry.refCount += 1;
      entry.shotNodeIds.push(node.id);
      usage.set(slot.materialId, entry);
    });
  });
  return usage;
}

export function computeProductionWarnings(
  nodes: WorkspaceNode[],
  materials: ProductionMaterial[],
): ProductionWarning[] {
  const warnings: ProductionWarning[] = [];
  const usage = computeMaterialUsage(nodes);

  materials.forEach((material) => {
    const entry = usage.get(material.id);
    const maxRefs = material.maxRefs > 0 ? material.maxRefs : DEFAULT_MAX_REFS;
    if (entry && entry.refCount > maxRefs) {
      warnings.push({
        id: `over-${material.id}`,
        kind: 'over-referenced',
        materialId: material.id,
        message: `素材「${material.name}」被 ${entry.refCount} 个镜头引用，超过上限 ${maxRefs}`,
      });
    }
  });

  orderShotNodes(nodes).forEach((node, index) => {
    getMissingRequiredSlots(node.data).forEach((slotKind) => {
      warnings.push({
        id: `missing-${node.id}-${slotKind}`,
        kind: 'missing-slot',
        nodeId: node.id,
        slot: slotKind,
        message: `镜头「${getShotTitle(node, index)}」缺少关键槽位：${SLOT_LABELS[slotKind]}`,
      });
    });
  });

  return warnings;
}

export function buildCallSheet(nodes: WorkspaceNode[], materials: ProductionMaterial[]): CallSheetScene[] {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const sceneMap = new Map<string, CallSheetShot[]>();

  orderShotNodes(nodes).forEach((node, index) => {
    const scene = getShotScene(node);
    const slots = normalizeShotSlots(node.data.shotSlots);
    const shot: CallSheetShot = {
      node,
      title: getShotTitle(node, index),
      estimatedSeconds: getShotEstimatedSeconds(node),
      actualSeconds: typeof node.data.actualSeconds === 'number' ? node.data.actualSeconds : null,
      done: node.data.shotDone === true,
      materials: slots
        .filter((slot) => slot.materialId)
        .map((slot) => ({ slot: slot.slot, material: materialById.get(slot.materialId as string) || null })),
      missingRequiredSlots: getMissingRequiredSlots(node.data),
    };
    const list = sceneMap.get(scene) || [];
    list.push(shot);
    sceneMap.set(scene, list);
  });

  return Array.from(sceneMap.entries()).map(([scene, shots]) => ({
    scene,
    shots,
    totalEstimatedSeconds: shots.reduce((sum, shot) => sum + shot.estimatedSeconds, 0),
    doneCount: shots.filter((shot) => shot.done).length,
  }));
}

export function computeDashboardStats(nodes: WorkspaceNode[]): DashboardStats {
  const ordered = orderShotNodes(nodes);
  const durationBars = ordered.map((node, index) => ({
    title: getShotTitle(node, index),
    seconds: getShotEstimatedSeconds(node),
    done: node.data.shotDone === true,
  }));

  const brollCoveredCount = ordered.filter((node) =>
    normalizeShotSlots(node.data.shotSlots).some((slot) => slot.slot === 'broll' && slot.materialId),
  ).length;

  const talkingHeadRuns: TalkingHeadRun[] = [];
  let currentRun: TalkingHeadRun | null = null;
  ordered.forEach((node, index) => {
    const slots = normalizeShotSlots(node.data.shotSlots);
    const isPureTalkingHead = !slots.some(
      (slot) => (slot.slot === 'broll' || slot.slot === 'graphic') && slot.materialId,
    );
    if (isPureTalkingHead) {
      if (!currentRun) currentRun = { shotTitles: [], totalSeconds: 0 };
      currentRun.shotTitles.push(getShotTitle(node, index));
      currentRun.totalSeconds += getShotEstimatedSeconds(node);
    } else {
      if (currentRun && currentRun.totalSeconds > TALKING_HEAD_LIMIT_SECONDS) {
        talkingHeadRuns.push(currentRun);
      }
      currentRun = null;
    }
  });
  if (currentRun && currentRun.totalSeconds > TALKING_HEAD_LIMIT_SECONDS) {
    talkingHeadRuns.push(currentRun);
  }

  return {
    shotCount: ordered.length,
    durationBars,
    brollCoverage: ordered.length === 0 ? 0 : brollCoveredCount / ordered.length,
    brollCoveredCount,
    talkingHeadRuns,
    totalEstimatedSeconds: durationBars.reduce((sum, bar) => sum + bar.seconds, 0),
    totalActualSeconds: ordered.reduce((sum, node) => sum + (node.data.actualSeconds || 0), 0),
  };
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function formatDeviation(actualSeconds: number, estimatedSeconds: number): string {
  const diff = Math.round(actualSeconds - estimatedSeconds);
  if (diff === 0) return '±0s';
  return diff > 0 ? `+${diff}s` : `${diff}s`;
}
