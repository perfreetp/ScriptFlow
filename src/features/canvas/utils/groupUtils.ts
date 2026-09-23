import type { Edge } from '@xyflow/react';
import type { GroupCanvasNodeData, WorkspaceNode } from '../../../types';

export const GROUP_PADDING_X = 28;
export const GROUP_PADDING_TOP = 64;
export const GROUP_PADDING_BOTTOM = 28;
export const GROUP_COLLAPSED_WIDTH = 260;
export const GROUP_COLLAPSED_HEIGHT = 132;

export const GROUP_COLOR_OPTIONS = [
  '#f8fafc',
  '#fef3c7',
  '#dcfce7',
  '#dbeafe',
  '#fce7f3',
  '#ede9fe',
];

export function isGroupNode(node: WorkspaceNode): boolean {
  return node.type === 'group' && !!node.data.groupData;
}

export function getGroupData(node: WorkspaceNode): GroupCanvasNodeData['groupData'] | null {
  return isGroupNode(node) ? (node.data as GroupCanvasNodeData).groupData : null;
}

export function getGroupNodes(nodes: WorkspaceNode[]): WorkspaceNode[] {
  return nodes.filter(isGroupNode);
}

/** Map of member node id -> group node id. */
export function getMembershipMap(nodes: WorkspaceNode[]): Map<string, string> {
  const map = new Map<string, string>();
  getGroupNodes(nodes).forEach((groupNode) => {
    (getGroupData(groupNode)?.memberIds || []).forEach((memberId) => {
      map.set(memberId, groupNode.id);
    });
  });
  return map;
}

export function getNodeDimensions(node: WorkspaceNode) {
  const width = node.measured?.width ?? node.width ?? node.data.width ?? 280;
  const height = node.measured?.height ?? node.height ?? node.data.height ?? 140;
  return { width, height };
}

export function computeGroupBounds(members: WorkspaceNode[]) {
  if (members.length === 0) {
    return { x: 0, y: 0, width: 320, height: 240 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  members.forEach((member) => {
    const { width, height } = getNodeDimensions(member);
    minX = Math.min(minX, member.position.x);
    minY = Math.min(minY, member.position.y);
    maxX = Math.max(maxX, member.position.x + width);
    maxY = Math.max(maxY, member.position.y + height);
  });
  return {
    x: minX - GROUP_PADDING_X,
    y: minY - GROUP_PADDING_TOP,
    width: maxX - minX + GROUP_PADDING_X * 2,
    height: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
  };
}

/**
 * Derive the canvas presentation for collapsed groups: member nodes are hidden
 * and every edge crossing a collapsed group boundary is re-attached to the
 * group card, aggregating duplicates into a single edge with a count label.
 */
export function collapseGroupsPresentation(
  nodes: WorkspaceNode[],
  edges: Edge[],
): { nodes: WorkspaceNode[]; edges: Edge[] } {
  const collapsedGroups = getGroupNodes(nodes).filter(
    (groupNode) => getGroupData(groupNode)?.collapsed,
  );
  if (collapsedGroups.length === 0) return { nodes, edges };

  const hiddenMemberIds = new Set<string>();
  collapsedGroups.forEach((groupNode) => {
    (getGroupData(groupNode)?.memberIds || []).forEach((memberId) => hiddenMemberIds.add(memberId));
  });

  const resolveEndpoint = (nodeId: string): string => {
    if (!hiddenMemberIds.has(nodeId)) return nodeId;
    const owner = collapsedGroups.find((groupNode) =>
      (getGroupData(groupNode)?.memberIds || []).includes(nodeId),
    );
    return owner ? owner.id : nodeId;
  };

  const nextNodes = nodes.map((node) => {
    if (hiddenMemberIds.has(node.id)) {
      return { ...node, hidden: true, selected: false };
    }
    if (collapsedGroups.some((groupNode) => groupNode.id === node.id)) {
      return {
        ...node,
        style: { ...node.style, zIndex: 1 },
      };
    }
    return node;
  });

  const aggregated = new Map<string, Edge & { count: number }>();
  edges.forEach((edge) => {
    const source = resolveEndpoint(edge.source);
    const target = resolveEndpoint(edge.target);
    if (source === target) return; // fully internal edge: hidden while collapsed
    const key = `${source}->${target}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.count += 1;
      existing.label = `×${existing.count}`;
      return;
    }
    const remapped = source !== edge.source || target !== edge.target;
    aggregated.set(key, {
      ...edge,
      id: remapped ? `agg:${key}` : edge.id,
      source,
      target,
      sourceHandle: remapped ? undefined : edge.sourceHandle,
      targetHandle: remapped ? undefined : edge.targetHandle,
      label: undefined,
      count: 1,
    });
  });

  const nextEdges = Array.from(aggregated.values()).map(({ count: _count, ...edge }) => edge);
  return { nodes: nextNodes, edges: nextEdges };
}
