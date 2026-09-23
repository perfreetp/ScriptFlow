import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge, NodeChange, OnNodesChange } from '@xyflow/react';
import type { GroupDataValue, WorkspaceNode } from '../../../types';
import {
  GROUP_COLLAPSED_HEIGHT,
  GROUP_COLLAPSED_WIDTH,
  GROUP_COLOR_OPTIONS,
  computeGroupBounds,
  getGroupData,
  getGroupNodes,
  getMembershipMap,
  isGroupNode,
} from '../utils/groupUtils';

interface UseCanvasGroupsOptions {
  nodes: WorkspaceNode[];
  setNodes: Dispatch<SetStateAction<WorkspaceNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange<WorkspaceNode>;
  onAfterSelectionMutation?: () => void;
}

let groupCounter = 0;

export function useCanvasGroups({
  nodes,
  setNodes,
  setEdges,
  onNodesChange,
  onAfterSelectionMutation,
}: UseCanvasGroupsOptions) {
  // Keep expanded group rectangles fitted to their members and drop
  // references to deleted member nodes.
  useEffect(() => {
    const groupNodes = getGroupNodes(nodes);
    if (groupNodes.length === 0) return;

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    let changed = false;

    const nextNodes = nodes.map((node) => {
      if (!isGroupNode(node)) return node;
      const group = getGroupData(node);
      if (!group) return node;

      const memberIds = group.memberIds.filter((memberId) => {
        const member = nodesById.get(memberId);
        return member && !isGroupNode(member);
      });
      const members = memberIds
        .map((memberId) => nodesById.get(memberId))
        .filter((member): member is WorkspaceNode => !!member);

      if (memberIds.length !== group.memberIds.length) changed = true;

      if (group.collapsed) {
        if (!changed) return node;
        return {
          ...node,
          data: { ...node.data, groupData: { ...group, memberIds } },
        } as WorkspaceNode;
      }

      const bounds = computeGroupBounds(members);
      const currentWidth = node.style?.width as number | undefined;
      const currentHeight = node.style?.height as number | undefined;
      const positionMatches = Math.abs(node.position.x - bounds.x) < 0.5
        && Math.abs(node.position.y - bounds.y) < 0.5;
      const sizeMatches = currentWidth !== undefined
        && currentHeight !== undefined
        && Math.abs(currentWidth - bounds.width) < 0.5
        && Math.abs(currentHeight - bounds.height) < 0.5;

      if (positionMatches && sizeMatches && memberIds.length === group.memberIds.length) {
        return node;
      }

      changed = true;
      return {
        ...node,
        position: { x: bounds.x, y: bounds.y },
        style: { ...node.style, width: bounds.width, height: bounds.height, zIndex: -1 },
        data: {
          ...node.data,
          width: bounds.width,
          height: bounds.height,
          groupData: { ...group, memberIds },
        },
      } as WorkspaceNode;
    });

    if (changed) setNodes(nextNodes);
  }, [nodes, setNodes]);

  const createGroupFromSelection = useCallback((selectedNodes: WorkspaceNode[]) => {
    const members = selectedNodes.filter((node) => !isGroupNode(node));
    if (members.length === 0) return;

    const bounds = computeGroupBounds(members);
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    groupCounter += 1;

    const groupNode: WorkspaceNode = {
      id: groupId,
      type: 'group',
      position: { x: bounds.x, y: bounds.y },
      style: { width: bounds.width, height: bounds.height, zIndex: -1 },
      data: {
        id: groupId,
        type: 'group',
        content: '',
        title: '',
        width: bounds.width,
        height: bounds.height,
        createdAt: Date.now(),
        groupData: {
          name: `分组 ${groupCounter}`,
          color: GROUP_COLOR_OPTIONS[0],
          locked: false,
          collapsed: false,
          memberIds: members.map((member) => member.id),
        },
      },
    } as WorkspaceNode;

    setNodes((currentNodes) => [groupNode, ...currentNodes]);
    onAfterSelectionMutation?.();
  }, [onAfterSelectionMutation, setNodes]);

  const updateGroup = useCallback((groupId: string, patch: Partial<GroupDataValue>) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== groupId || !isGroupNode(node)) return node;
        const group = getGroupData(node);
        if (!group) return node;
        const nextGroup = { ...group, ...patch };
        const collapsing = patch.collapsed === true && !group.collapsed;
        return {
          ...node,
          ...(collapsing
            ? { style: { ...node.style, width: GROUP_COLLAPSED_WIDTH, height: GROUP_COLLAPSED_HEIGHT, zIndex: 1 } }
            : {}),
          data: {
            ...node.data,
            width: collapsing ? GROUP_COLLAPSED_WIDTH : node.data.width,
            height: collapsing ? GROUP_COLLAPSED_HEIGHT : node.data.height,
            groupData: nextGroup,
          },
        } as WorkspaceNode;
      }),
    );

    // Expanding restores original member edges, so drop any ad-hoc edges
    // that were drawn against the collapsed summary card.
    if (patch.collapsed === false) {
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => edge.source !== groupId && edge.target !== groupId),
      );
    }
  }, [setEdges, setNodes]);

  const ungroup = useCallback((groupId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== groupId));
    onAfterSelectionMutation?.();
  }, [onAfterSelectionMutation, setNodes]);

  /**
   * Wrap the canvas node-change handler so that:
   * - dragging a group moves all of its members by the same delta;
   * - locked groups (and their members) ignore position changes.
   */
  const handleNodesChange = useCallback<OnNodesChange<WorkspaceNode>>((changes) => {
    const membership = getMembershipMap(nodes);
    const lockedGroupIds = new Set(
      getGroupNodes(nodes)
        .filter((groupNode) => getGroupData(groupNode)?.locked)
        .map((groupNode) => groupNode.id),
    );

    const filtered: NodeChange<WorkspaceNode>[] = [];
    const extra: NodeChange<WorkspaceNode>[] = [];

    changes.forEach((change) => {
      if (change.type === 'position') {
        const ownerGroupId = membership.get(change.id);
        const isLocked = lockedGroupIds.has(change.id)
          || (ownerGroupId !== undefined && lockedGroupIds.has(ownerGroupId));
        if (isLocked) return;

        if (change.position) {
          const node = nodes.find((candidate) => candidate.id === change.id);
          if (node && isGroupNode(node)) {
            const group = getGroupData(node);
            const deltaX = change.position.x - node.position.x;
            const deltaY = change.position.y - node.position.y;
            if (group && (deltaX !== 0 || deltaY !== 0)) {
              group.memberIds.forEach((memberId) => {
                const member = nodes.find((candidate) => candidate.id === memberId);
                if (!member) return;
                extra.push({
                  id: memberId,
                  type: 'position',
                  position: {
                    x: member.position.x + deltaX,
                    y: member.position.y + deltaY,
                  },
                  dragging: change.dragging,
                });
              });
            }
          }
        }
      }
      filtered.push(change);
    });

    onNodesChange([...filtered, ...extra]);
  }, [nodes, onNodesChange]);

  return {
    createGroupFromSelection,
    updateGroup,
    ungroup,
    handleNodesChange,
  };
}
