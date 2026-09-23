import type { ShotAsset, ShotSlotBinding, ShotSlotType, WorkspaceNode } from '../../../types';
import {
  REQUIRED_SLOT_TYPES,
  SHOT_SLOT_DEFS,
  SHOT_SLOT_LABELS,
  TALKING_HEAD_LIMIT_SEC,
  TELEPROMPTER_CHARS_PER_MINUTE,
} from '../constants';

export function normalizeShotSlots(slots?: ShotSlotBinding[]): ShotSlotBinding[] {
  const existing = new Map((slots || []).map((binding) => [binding.slot, binding.assetId]));
  return SHOT_SLOT_DEFS.map((def) => ({
    slot: def.type,
    assetId: existing.has(def.type) ? (existing.get(def.type) ?? null) : null,
  }));
}

export function countScriptChars(content: string): number {
  return (content || '').replace(/\s+/g, '').length;
}

export function estimateShotDurationSec(content: string, overrideSec?: number): number {
  if (typeof overrideSec === 'number' && Number.isFinite(overrideSec) && overrideSec > 0) {
    return Math.round(overrideSec);
  }
  const chars = countScriptChars(content);
  if (chars === 0) return 0;
  return Math.max(4, Math.round((chars / TELEPROMPTER_CHARS_PER_MINUTE) * 60));
}

export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}秒`;
  return seconds === 0 ? `${minutes}分` : `${minutes}分${seconds}秒`;
}

export function isShotNode(node: WorkspaceNode): boolean {
  return (node.data.type || node.type) === 'text';
}

export function getShotNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return nodes
    .filter(isShotNode)
    .slice()
    .sort((a, b) => (a.data.createdAt || 0) - (b.data.createdAt || 0) || a.id.localeCompare(b.id));
}

export function getShotGroupKey(node: WorkspaceNode): string {
  const tag = (node.data.tags || []).map((item) => item.trim()).find((item) => item.length > 0);
  return tag || '未分组';
}

export interface ShotSlotView {
  slot: ShotSlotType;
  label: string;
  required: boolean;
  asset: ShotAsset | null;
}

export interface CallSheetShot {
  nodeId: string;
  title: string;
  estimateSec: number;
  actualSec: number | null;
  done: boolean;
  slots: ShotSlotView[];
  missingRequired: string[];
  assetDurationSec: number;
}

export interface CallSheetGroup {
  name: string;
  shots: CallSheetShot[];
  totalEstimateSec: number;
  doneCount: number;
}

export function buildCallSheetShot(node: WorkspaceNode, assets: ShotAsset[]): CallSheetShot {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const slots = normalizeShotSlots(node.data.shotSlots).map((binding) => {
    const def = SHOT_SLOT_DEFS.find((candidate) => candidate.type === binding.slot);
    const asset = binding.assetId ? assetMap.get(binding.assetId) ?? null : null;
    return {
      slot: binding.slot,
      label: SHOT_SLOT_LABELS[binding.slot],
      required: def?.required ?? false,
      asset,
    };
  });
  const missingRequired = slots
    .filter((slot) => slot.required && !slot.asset)
    .map((slot) => slot.label);
  const assetDurationSec = slots.reduce((sum, slot) => sum + (slot.asset?.durationSec || 0), 0);
  return {
    nodeId: node.id,
    title: node.data.title || '未命名镜头',
    estimateSec: estimateShotDurationSec(node.data.content || '', node.data.shotEstimateSec),
    actualSec: typeof node.data.shotActualSec === 'number' ? node.data.shotActualSec : null,
    done: !!node.data.shotDone,
    slots,
    missingRequired,
    assetDurationSec,
  };
}

export function buildCallSheet(nodes: WorkspaceNode[], assets: ShotAsset[]): CallSheetGroup[] {
  const groups = new Map<string, CallSheetGroup>();
  getShotNodes(nodes).forEach((node) => {
    const groupName = getShotGroupKey(node);
    const shot = buildCallSheetShot(node, assets);
    const group = groups.get(groupName) || { name: groupName, shots: [], totalEstimateSec: 0, doneCount: 0 };
    group.shots.push(shot);
    group.totalEstimateSec += shot.estimateSec;
    if (shot.done) group.doneCount += 1;
    groups.set(groupName, group);
  });
  return Array.from(groups.values());
}

export interface AssetUsage {
  count: number;
  nodeIds: string[];
}

export function computeAssetUsage(nodes: WorkspaceNode[]): Map<string, AssetUsage> {
  const usage = new Map<string, AssetUsage>();
  nodes.forEach((node) => {
    (node.data.shotSlots || []).forEach((binding) => {
      if (!binding.assetId) return;
      const entry = usage.get(binding.assetId) || { count: 0, nodeIds: [] };
      entry.count += 1;
      entry.nodeIds.push(node.id);
      usage.set(binding.assetId, entry);
    });
  });
  return usage;
}

export interface ProductionAlerts {
  overused: Array<{ asset: ShotAsset; count: number }>;
  missingSlots: Array<{ nodeId: string; title: string; missing: string[] }>;
}

export function computeProductionAlerts(nodes: WorkspaceNode[], assets: ShotAsset[]): ProductionAlerts {
  const usage = computeAssetUsage(nodes);
  const overused = assets
    .map((asset) => ({ asset, count: usage.get(asset.id)?.count || 0 }))
    .filter((entry) => entry.count > Math.max(1, entry.asset.maxUsage));
  const missingSlots = getShotNodes(nodes)
    .map((node) => {
      const slots = normalizeShotSlots(node.data.shotSlots);
      const missing = slots
        .filter((binding) => REQUIRED_SLOT_TYPES.includes(binding.slot) && !binding.assetId)
        .map((binding) => SHOT_SLOT_LABELS[binding.slot]);
      return { nodeId: node.id, title: node.data.title || '未命名镜头', missing };
    })
    .filter((entry) => entry.missing.length > 0);
  return { overused, missingSlots };
}

export interface TalkingHeadRun {
  startTitle: string;
  shotCount: number;
  totalSec: number;
}

export interface ProductionAnalytics {
  durations: Array<{ nodeId: string; title: string; sec: number; hasBroll: boolean }>;
  brollCovered: number;
  totalShots: number;
  talkingHeadRuns: TalkingHeadRun[];
}

export function computeProductionAnalytics(nodes: WorkspaceNode[]): ProductionAnalytics {
  const shots = getShotNodes(nodes);
  const durations = shots.map((node) => {
    const slots = normalizeShotSlots(node.data.shotSlots);
    const hasBroll = slots.some((binding) => binding.slot === 'broll' && !!binding.assetId);
    return {
      nodeId: node.id,
      title: node.data.title || '未命名镜头',
      sec: estimateShotDurationSec(node.data.content || '', node.data.shotEstimateSec),
      hasBroll,
    };
  });

  const talkingHeadRuns: TalkingHeadRun[] = [];
  let current: TalkingHeadRun | null = null;
  durations.forEach((shot) => {
    if (shot.hasBroll) {
      if (current && current.totalSec > TALKING_HEAD_LIMIT_SEC) talkingHeadRuns.push(current);
      current = null;
      return;
    }
    if (!current) {
      current = { startTitle: shot.title, shotCount: 0, totalSec: 0 };
    }
    current.shotCount += 1;
    current.totalSec += shot.sec;
  });
  if (current && current.totalSec > TALKING_HEAD_LIMIT_SEC) talkingHeadRuns.push(current);

  return {
    durations,
    brollCovered: durations.filter((shot) => shot.hasBroll).length,
    totalShots: durations.length,
    talkingHeadRuns,
  };
}
