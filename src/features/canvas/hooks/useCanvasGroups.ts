import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { SceneGroup, WorkspaceNode } from '../../../types';
import { GROUP_COLOR_PRESETS, getMembersBounds } from '../utils/groupUtils';

interface UseCanvasGroupsOptions {
  groups: SceneGroup[];
  nodes: WorkspaceNode[];
  setGroups: Dispatch<SetStateAction<SceneGroup[]>>;
  setNodes: Dispatch<SetStateAction<WorkspaceNode[]>>;
}

export function useCanvasGroups({ groups, nodes, setGroups, setNodes }: UseCanvasGroupsOptions) {
  const createGroupFromSelection = useCallback((selectedNodes: WorkspaceNode[]) => {
    if (selectedNodes.length < 2) return;
    const memberIds = selectedNodes.map((node) => node.id);
    const memberIdSet = new Set(memberIds);

    setGroups((currentGroups) => {
      const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nextGroup: SceneGroup = {
        id,
        name: `分组 ${currentGroups.length + 1}`,
        color: GROUP_COLOR_PRESETS[currentGroups.length % GROUP_COLOR_PRESETS.length],
        locked: false,
        collapsed: false,
        nodeIds: memberIds,
        collapsedPosition: { x: 0, y: 0 },
        collapseOrigin: { x: 0, y: 0 },
      };
      const remaining = currentGroups
        .map((group) => ({
          ...group,
          nodeIds: group.nodeIds.filter((nodeId) => !memberIdSet.has(nodeId)),
        }))
        .filter((group) => group.nodeIds.length > 0);
      return [...remaining, nextGroup];
    });
  }, [setGroups]);

  const ungroup = useCallback((groupId: string) => {
    setGroups((currentGroups) => currentGroups.filter((group) => group.id !== groupId));
  }, [setGroups]);

  const renameGroup = useCallback((groupId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, name: trimmed } : group)),
    );
  }, [setGroups]);

  const setGroupColor = useCallback((groupId: string, color: string) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, color } : group)),
    );
  }, [setGroups]);

  const toggleGroupLock = useCallback((groupId: string) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === groupId ? { ...group, locked: !group.locked } : group)),
    );
  }, [setGroups]);

  const updateGroupCardPosition = useCallback((groupId: string, position: { x: number; y: number }) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, collapsedPosition: position } : group,
      ),
    );
  }, [setGroups]);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) return;

    if (!group.collapsed) {
      const bounds = getMembersBounds(nodes, group.nodeIds);
      const origin = bounds
        ? { x: bounds.x, y: bounds.y }
        : { x: group.collapsedPosition.x, y: group.collapsedPosition.y };
      setGroups((currentGroups) =>
        currentGroups.map((candidate) =>
          candidate.id === groupId
            ? {
                ...candidate,
                collapsed: true,
                collapseOrigin: origin,
                collapsedPosition: origin,
              }
            : candidate,
        ),
      );
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          group.nodeIds.includes(node.id) ? { ...node, selected: false } : node,
        ),
      );
      return;
    }

    // Expanding: shift members by however far the collapsed card was dragged.
    const deltaX = group.collapsedPosition.x - group.collapseOrigin.x;
    const deltaY = group.collapsedPosition.y - group.collapseOrigin.y;
    if (deltaX !== 0 || deltaY !== 0) {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          group.nodeIds.includes(node.id)
            ? { ...node, position: { x: node.position.x + deltaX, y: node.position.y + deltaY } }
            : node,
        ),
      );
    }
    setGroups((currentGroups) =>
      currentGroups.map((candidate) =>
        candidate.id === groupId ? { ...candidate, collapsed: false } : candidate,
      ),
    );
  }, [groups, nodes, setGroups, setNodes]);

  return {
    createGroupFromSelection,
    ungroup,
    renameGroup,
    setGroupColor,
    toggleGroupLock,
    toggleGroupCollapse,
    updateGroupCardPosition,
  };
}
