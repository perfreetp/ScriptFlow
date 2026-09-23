import type { Edge } from '@xyflow/react';
import type { WorkspaceNode } from '../../../types';
import { isGroupNode } from './groupUtils';

export const WORDS_PER_MINUTE = 260;
export const DEFAULT_SHOT_THRESHOLD_SECONDS = 180;

export interface ShotItem {
  nodeId: string;
  title: string;
  content: string;
  charCount: number;
  durationSeconds: number;
  groupName: string | null;
}

/** Nodes that participate in the storyboard sequence (everything but groups). */
export function getShotNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return nodes.filter((node) => !isGroupNode(node));
}

/**
 * Topological ordering of shot nodes following edge direction (Kahn's
 * algorithm). Ties and cycle leftovers fall back to canvas position
 * (top-to-bottom, left-to-right) so the sequence stays deterministic.
 */
export function computeTopologicalShotOrder(nodes: WorkspaceNode[], edges: Edge[]): string[] {
  const shotNodes = getShotNodes(nodes);
  const ids = new Set(shotNodes.map((node) => node.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  shotNodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) return;
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const nodeById = new Map(shotNodes.map((node) => [node.id, node]));
  const byPosition = (a: string, b: string) => {
    const nodeA = nodeById.get(a)!;
    const nodeB = nodeById.get(b)!;
    return nodeA.position.y - nodeB.position.y || nodeA.position.x - nodeB.position.x;
  };

  const queue = shotNodes
    .filter((node) => (inDegree.get(node.id) || 0) === 0)
    .map((node) => node.id)
    .sort(byPosition);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    const ready: string[] = [];
    (adjacency.get(current) || []).forEach((next) => {
      const remaining = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    });
    queue.push(...ready.sort(byPosition));
  }

  // Cycle leftovers keep positional order at the end.
  const placed = new Set(order);
  const leftovers = shotNodes.map((node) => node.id).filter((id) => !placed.has(id)).sort(byPosition);
  order.push(...leftovers);
  return order;
}

/**
 * Effective shot order: manual ordering (drag reorder) wins for nodes it
 * covers; anything new is appended in topological order.
 */
export function resolveShotOrder(
  nodes: WorkspaceNode[],
  edges: Edge[],
  manualOrder: string[],
): string[] {
  const shotIds = new Set(getShotNodes(nodes).map((node) => node.id));
  const ordered = manualOrder.filter((id) => shotIds.has(id));
  const orderedSet = new Set(ordered);
  computeTopologicalShotOrder(nodes, edges).forEach((id) => {
    if (!orderedSet.has(id)) ordered.push(id);
  });
  return ordered;
}

export function countNarrationChars(content: string): number {
  return (content || '').replace(/\s+/g, '').length;
}

export function estimateShotDurationSeconds(content: string): number {
  return (countNarrationChars(content) / WORDS_PER_MINUTE) * 60;
}

export function buildShotItems(
  nodes: WorkspaceNode[],
  edges: Edge[],
  manualOrder: string[],
): ShotItem[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const groupNameByMemberId = new Map<string, string>();
  nodes.forEach((node) => {
    if (!isGroupNode(node)) return;
    const groupData = node.data.groupData;
    (groupData?.memberIds || []).forEach((memberId) => {
      groupNameByMemberId.set(memberId, groupData.name);
    });
  });

  return resolveShotOrder(nodes, edges, manualOrder)
    .map((nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return null;
      const content = node.data.content || '';
      return {
        nodeId,
        title: node.data.title || '未命名镜头',
        content,
        charCount: countNarrationChars(content),
        durationSeconds: estimateShotDurationSeconds(content),
        groupName: groupNameByMemberId.get(nodeId) || null,
      } satisfies ShotItem;
    })
    .filter((item): item is ShotItem => !!item);
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
