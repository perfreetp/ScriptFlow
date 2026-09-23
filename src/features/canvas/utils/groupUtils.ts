import type { Edge } from '@xyflow/react';
import type { SceneGroup, WorkspaceNode } from '../../../types';

export const GROUP_CARD_ID_PREFIX = 'group-card-';
export const GROUP_FRAME_ID_PREFIX = 'group-frame-';

export const GROUP_COLOR_PRESETS = [
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
];

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 160;
const FRAME_PADDING_X = 18;
const FRAME_PADDING_TOP = 46;
const FRAME_PADDING_BOTTOM = 18;

export function groupCardId(groupId: string) {
  return `${GROUP_CARD_ID_PREFIX}${groupId}`;
}

export function groupFrameId(groupId: string) {
  return `${GROUP_FRAME_ID_PREFIX}${groupId}`;
}

export function parseGroupCardId(nodeId: string): string | null {
  return nodeId.startsWith(GROUP_CARD_ID_PREFIX) ? nodeId.slice(GROUP_CARD_ID_PREFIX.length) : null;
}

export function isSyntheticGroupNodeId(nodeId: string) {
  return nodeId.startsWith(GROUP_CARD_ID_PREFIX) || nodeId.startsWith(GROUP_FRAME_ID_PREFIX);
}

export function getGroupForNode(groups: SceneGroup[], nodeId: string): SceneGroup | undefined {
  return groups.find((group) => group.nodeIds.includes(nodeId));
}

export function getLockedNodeIds(groups: SceneGroup[]): Set<string> {
  const locked = new Set<string>();
  groups.forEach((group) => {
    if (!group.locked) return;
    group.nodeIds.forEach((id) => locked.add(id));
  });
  return locked;
}

function getNodeWidth(node: WorkspaceNode) {
  return node.measured?.width ?? node.width ?? node.data.width ?? DEFAULT_NODE_WIDTH;
}

function getNodeHeight(node: WorkspaceNode) {
  return node.measured?.height ?? node.height ?? node.data.height ?? DEFAULT_NODE_HEIGHT;
}

export function getMembersBounds(nodes: WorkspaceNode[], memberIds: string[]) {
  const memberIdSet = new Set(memberIds);
  const members = nodes.filter((node) => memberIdSet.has(node.id));
  if (members.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  members.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + getNodeWidth(node));
    maxY = Math.max(maxY, node.position.y + getNodeHeight(node));
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

interface GroupedDisplayResult {
  nodes: WorkspaceNode[];
  edges: Edge[];
}

/**
 * Derives the renderable nodes/edges for the current group state.
 * Collapsed groups hide their members, render a summary card node, and
 * aggregate every cross-group edge onto the card boundary. Expanded groups
 * render a non-interactive background frame behind their members.
 */
export function deriveGroupedDisplay(
  nodes: WorkspaceNode[],
  edges: Edge[],
  groups: SceneGroup[],
): GroupedDisplayResult {
  if (groups.length === 0) return { nodes, edges };

  const nodeIds = new Set(nodes.map((node) => node.id));
  const collapsedGroups = groups.filter((group) => group.collapsed);
  const expandedGroups = groups.filter((group) => !group.collapsed);

  const nodeToCollapsedGroup = new Map<string, SceneGroup>();
  collapsedGroups.forEach((group) => {
    group.nodeIds.forEach((id) => {
      if (nodeIds.has(id)) nodeToCollapsedGroup.set(id, group);
    });
  });

  const displayNodes = nodes.filter((node) => !nodeToCollapsedGroup.has(node.id));

  expandedGroups.forEach((group) => {
    const bounds = getMembersBounds(nodes, group.nodeIds);
    if (!bounds) return;
    displayNodes.unshift({
      id: groupFrameId(group.id),
      type: 'groupFrame',
      position: {
        x: bounds.x - FRAME_PADDING_X,
        y: bounds.y - FRAME_PADDING_TOP,
      },
      width: bounds.width + FRAME_PADDING_X * 2,
      height: bounds.height + FRAME_PADDING_TOP + FRAME_PADDING_BOTTOM,
      selectable: false,
      draggable: false,
      focusable: false,
      zIndex: -10,
      data: { group },
    } as unknown as WorkspaceNode);
  });

  collapsedGroups.forEach((group) => {
    const memberCount = group.nodeIds.filter((id) => nodeIds.has(id)).length;
    if (memberCount === 0) return;
    displayNodes.push({
      id: groupCardId(group.id),
      type: 'groupCard',
      position: group.collapsedPosition,
      draggable: !group.locked,
      data: { group, memberCount },
    } as unknown as WorkspaceNode);
  });

  if (collapsedGroups.length === 0) {
    return { nodes: displayNodes, edges };
  }

  const aggregatedEdges = new Map<string, Edge>();
  edges.forEach((edge) => {
    const sourceGroup = nodeToCollapsedGroup.get(edge.source);
    const targetGroup = nodeToCollapsedGroup.get(edge.target);
    if (sourceGroup && targetGroup && sourceGroup.id === targetGroup.id) return;

    const source = sourceGroup ? groupCardId(sourceGroup.id) : edge.source;
    const target = targetGroup ? groupCardId(targetGroup.id) : edge.target;
    const key = `${source}→${target}`;
    const existing = aggregatedEdges.get(key);
    if (existing) {
      const count = ((existing.data as { count?: number } | undefined)?.count ?? 1) + 1;
      existing.data = { count };
      existing.label = `${count} 条连线`;
      return;
    }

    aggregatedEdges.set(key, {
      ...edge,
      id: `agg-${key}`,
      source,
      target,
      sourceHandle: sourceGroup ? undefined : edge.sourceHandle,
      targetHandle: targetGroup ? undefined : edge.targetHandle,
      data: { count: 1 },
    });
  });

  return { nodes: displayNodes, edges: Array.from(aggregatedEdges.values()) };
}
