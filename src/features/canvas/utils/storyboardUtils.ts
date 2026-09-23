import type { Edge } from '@xyflow/react';
import type { SceneGroup, WorkspaceNode } from '../../../types';
import { getGroupForNode } from './groupUtils';

/** Average narration speed used for duration estimates (chars per minute). */
export const NARRATION_CHARS_PER_MINUTE = 260;
export const DEFAULT_SHOT_DURATION_THRESHOLD = 180;

export interface ShotItem {
  nodeId: string;
  title: string;
  content: string;
  groupName: string | null;
  charCount: number;
  durationSec: number;
}

/** Kahn topological sort; ties fall back to canvas reading order (top to bottom, left to right). */
export function computeTopologicalOrder(nodes: WorkspaceNode[], edges: Edge[]): string[] {
  const nodeIds = nodes.map((node) => node.id);
  const nodeIdSet = new Set(nodeIds);
  const indegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const adjacency = new Map<string, string[]>(nodeIds.map((id) => [id, []]));

  edges.forEach((edge) => {
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) return;
    if (edge.source === edge.target) return;
    adjacency.get(edge.source)!.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  const positionOf = new Map(nodes.map((node) => [node.id, node.position]));
  const byReadingOrder = (a: string, b: string) => {
    const pa = positionOf.get(a)!;
    const pb = positionOf.get(b)!;
    return pa.y - pb.y || pa.x - pb.x;
  };

  const queue = nodeIds.filter((id) => (indegree.get(id) ?? 0) === 0).sort(byReadingOrder);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    adjacency.get(current)!.forEach((next) => {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) {
        queue.push(next);
        queue.sort(byReadingOrder);
      }
    });
  }

  // Cycle fallback: append anything not reached, in reading order.
  if (order.length < nodeIds.length) {
    const placed = new Set(order);
    nodeIds
      .filter((id) => !placed.has(id))
      .sort(byReadingOrder)
      .forEach((id) => order.push(id));
  }

  return order;
}

export function countNarrationChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

export function estimateShotDurationSec(content: string): number {
  return (countNarrationChars(content) / NARRATION_CHARS_PER_MINUTE) * 60;
}

/**
 * Effective shot sequence: the persisted manual order wins; nodes missing
 * from the manual list are appended in topological order.
 */
export function computeShotSequence(
  nodes: WorkspaceNode[],
  edges: Edge[],
  groups: SceneGroup[],
  shotOrder: string[],
): ShotItem[] {
  const topoOrder = computeTopologicalOrder(nodes, edges);
  const topoSet = new Set(topoOrder);
  const manual = shotOrder.filter((id) => topoSet.has(id));
  const manualSet = new Set(manual);
  const effectiveOrder = [...manual, ...topoOrder.filter((id) => !manualSet.has(id))];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return effectiveOrder
    .map((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return null;
      const content = node.data.content || '';
      const group = getGroupForNode(groups, nodeId);
      return {
        nodeId,
        title: node.data.title || '未命名镜头',
        content,
        groupName: group?.name ?? null,
        charCount: countNarrationChars(content),
        durationSec: estimateShotDurationSec(content),
      } satisfies ShotItem;
    })
    .filter((item): item is ShotItem => item !== null);
}

export function formatDurationSec(totalSec: number): string {
  const rounded = Math.round(totalSec);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
