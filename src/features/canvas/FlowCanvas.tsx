import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Edge, NodeChange } from '@xyflow/react';
import { NodeActionContext } from './nodes';
import { CANVAS_NODE_TYPES } from './constants';
import CanvasOverlays from './CanvasOverlays';
import CanvasViewport from './CanvasViewport';
import { useCanvasAssembly } from './hooks/useCanvasAssembly';
import { useCanvasClipboard } from './hooks/useCanvasClipboard';
import { useCanvasContextMenu } from './hooks/useCanvasContextMenu';
import { useCanvasEdgeCommands } from './hooks/useCanvasEdgeCommands';
import { useCanvasGroups } from './hooks/useCanvasGroups';
import { useCanvasMediaLibrary } from './hooks/useCanvasMediaLibrary';
import { useCanvasNodeCommands } from './hooks/useCanvasNodeCommands';
import { useCanvasPointerPan } from './hooks/useCanvasPointerPan';
import { useCanvasPresentation } from './hooks/useCanvasPresentation';
import { useCanvasShortcuts } from './hooks/useCanvasShortcuts';
import { useCanvasTemplates } from './hooks/useCanvasTemplates';
import { createImageNodeFromAsset, createMediaAsset } from './utils/mediaAssetUtils';
import { deriveGroupedDisplay, getGroupForNode, getLockedNodeIds, isSyntheticGroupNodeId, parseGroupCardId } from './utils/groupUtils';
import { parseMarkdownOutline, exportStoryboardMarkdown, exportStoryboardCsv, downloadTextFile } from './utils/markdownOutline';
import { collectUnresolvedVariables, replaceVariablesInText, type VariableUsage } from './utils/variableUtils';
import { computeShotSequence } from './utils/storyboardUtils';
import { useFeedback } from '../../shared/feedback/FeedbackProvider';
import type { WorkspaceNode } from '../../types';
import type { FlowCanvasProps, ViewportHandlers, ViewportShellHandlers } from './types';

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  groups,
  setGroups,
  variables,
  setVariables,
  shotOrder,
  setShotOrder,
  shotDurationThreshold,
  setShotDurationThreshold,
  onUpdateMainDocument,
  onExportState,
  onImportState,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  lastSavedAt,
  saveError,
  pendingExtractedSlice,
  onExtractedSlicePlaced,
  shortcuts,
  onOpenShortcutSettings,
}: FlowCanvasProps) {
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();
  const { toast } = useFeedback();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isVariablesOpen, setIsVariablesOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<'markdown' | 'csv' | null>(null);
  const [timelineFocusDisabledIds, setTimelineFocusDisabledIds] = useState<Set<string>>(() => new Set());

  const pointerPan = useCanvasPointerPan();
  const edgeCommands = useCanvasEdgeCommands({ setEdges });
  const presentation = useCanvasPresentation(nodes, edges, timelineFocusDisabledIds);
  const contextMenu = useCanvasContextMenu({
    screenToFlowPosition,
    setEditingId,
    setSelectedEdge: edgeCommands.setSelectedEdge,
    resetPointerPan: pointerPan.resetPointerPan,
  });

  const getCenteredNodePosition = useCallback((xOffset = 120, yOffset = 120) => {
    try {
      const flowContainer = document.querySelector('.react-flow');
      let clientX = window.innerWidth / 2;
      let clientY = window.innerHeight / 2;

      if (flowContainer) {
        const rect = flowContainer.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }

      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });
      return {
        x: flowPosition.x - xOffset + (Math.random() - 0.5) * 40,
        y: flowPosition.y - yOffset + (Math.random() - 0.5) * 40,
      };
    } catch (error) {
      console.warn('screenToFlowPosition error, using fallback coordinates', error);
      return {
        x: 100 + Math.random() * 150,
        y: 100 + Math.random() * 150,
      };
    }
  }, [screenToFlowPosition]);

  const closeTransientUi = useCallback(() => {
    contextMenu.closeContextMenu();
  }, [contextMenu]);

  const groupCommands = useCanvasGroups({ groups, nodes, setGroups, setNodes });
  const lockedNodeIds = useMemo(() => getLockedNodeIds(groups), [groups]);

  const nodeCommands = useCanvasNodeCommands({
    selectedNodes: presentation.selectedNodes,
    setNodes,
    setEdges,
    getCenteredNodePosition,
    lockedNodeIds,
    pendingExtractedSlice,
    onExtractedSlicePlaced,
    onAfterAddNode: () => setIsDrawerOpen(false),
    onAfterSelectionMutation: closeTransientUi,
  });

  const mediaLibrary = useCanvasMediaLibrary({
    setNodes,
    getCenteredNodePosition,
  });

  const assembly = useCanvasAssembly({
    nodes,
    edges,
    onUpdateMainDocument,
    onAfterAssemble: () => setIsDrawerOpen(false),
  });

  const clipboard = useCanvasClipboard({
    edges,
    selectedNodes: presentation.selectedNodes,
    contextMenu: contextMenu.contextMenu,
    setNodes,
    setEdges,
    setSelectedEdge: edgeCommands.setSelectedEdge,
    getCenteredNodePosition,
    onAfterAction: closeTransientUi,
  });

  const templates = useCanvasTemplates({
    edges,
    selectedNodes: presentation.selectedNodes,
    setNodes,
    setEdges,
    getCenteredNodePosition,
  });

  // Prune group membership when member nodes are deleted; drop empty groups.
  useEffect(() => {
    setGroups((currentGroups) => {
      if (currentGroups.length === 0) return currentGroups;
      const nodeIds = new Set(nodes.map((node) => node.id));
      const nextGroups = currentGroups
        .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => nodeIds.has(id)) }))
        .filter((group) => group.nodeIds.length > 0);
      const changed = nextGroups.length !== currentGroups.length
        || nextGroups.some((group, index) => group.nodeIds.length !== currentGroups[index].nodeIds.length);
      return changed ? nextGroups : currentGroups;
    });
  }, [nodes, setGroups]);

  const groupedDisplay = useMemo(
    () => deriveGroupedDisplay(presentation.displayNodes, presentation.displayEdges, groups),
    [presentation.displayNodes, presentation.displayEdges, groups],
  );

  const viewportNodes = useMemo(
    () => groupedDisplay.nodes.map((node) => (
      lockedNodeIds.has(node.id) ? { ...node, draggable: false } : node
    )),
    [groupedDisplay.nodes, lockedNodeIds],
  );

  // Route synthetic group node changes (card dragging) into group state.
  const handleNodesChange = useCallback((changes: NodeChange<WorkspaceNode>[]) => {
    const realChanges: NodeChange<WorkspaceNode>[] = [];
    changes.forEach((change) => {
      if (!('id' in change) || !isSyntheticGroupNodeId(change.id)) {
        realChanges.push(change);
        return;
      }
      const groupId = parseGroupCardId(change.id);
      if (groupId && change.type === 'position' && change.position) {
        groupCommands.updateGroupCardPosition(groupId, change.position);
      }
    });
    if (realChanges.length > 0) {
      onNodesChange(realChanges);
    }
  }, [groupCommands, onNodesChange]);

  const handleCreateGroup = useCallback(() => {
    groupCommands.createGroupFromSelection(presentation.selectedNodes);
    closeTransientUi();
  }, [closeTransientUi, groupCommands, presentation.selectedNodes]);

  const handleUngroupSelection = useCallback(() => {
    const groupIds = new Set(
      presentation.selectedNodes
        .map((node) => getGroupForNode(groups, node.id)?.id)
        .filter((id): id is string => !!id),
    );
    if (groupIds.size === 0) return;
    setGroups((currentGroups) => currentGroups.filter((group) => !groupIds.has(group.id)));
    closeTransientUi();
  }, [closeTransientUi, groups, presentation.selectedNodes, setGroups]);

  const hasGroupedSelection = useMemo(
    () => presentation.selectedNodes.some((node) => !!getGroupForNode(groups, node.id)),
    [groups, presentation.selectedNodes],
  );

  const handleApplyGlobalReplace = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          title: node.data.title ? replaceVariablesInText(node.data.title, variables) : node.data.title,
          content: replaceVariablesInText(node.data.content || '', variables),
        },
      })),
    );
    toast('已将已填充的变量全局替换到节点文本。', 'success');
  }, [setNodes, toast, variables]);

  const storyboardShots = useMemo(
    () => computeShotSequence(nodes, edges, groups, shotOrder),
    [nodes, edges, groups, shotOrder],
  );

  const unresolvedVariables = useMemo<VariableUsage[]>(
    () => collectUnresolvedVariables(nodes, variables),
    [nodes, variables],
  );

  const runExport = useCallback((kind: 'markdown' | 'csv') => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === 'markdown') {
      downloadTextFile(
        `scriptflow-storyboard-${stamp}.md`,
        exportStoryboardMarkdown(storyboardShots, storyboardShots.reduce((sum, shot) => sum + shot.durationSec, 0)),
        'text/markdown;charset=utf-8',
      );
    } else {
      downloadTextFile(
        `scriptflow-storyboard-${stamp}.csv`,
        exportStoryboardCsv(storyboardShots),
        'text/csv;charset=utf-8',
      );
    }
  }, [storyboardShots]);

  const requestExport = useCallback((kind: 'markdown' | 'csv') => {
    if (unresolvedVariables.length > 0) {
      setPendingExport(kind);
      return;
    }
    runExport(kind);
  }, [runExport, unresolvedVariables.length]);

  const handleImportMarkdown = useCallback((markdown: string) => {
    const { nodes: importedNodes, groups: importedGroups } = parseMarkdownOutline(markdown);
    if (importedNodes.length === 0 && importedGroups.length === 0) {
      toast('未从 Markdown 中识别到标题或列表项。', 'error');
      return;
    }
    setNodes((currentNodes) => [...currentNodes, ...importedNodes]);
    if (importedGroups.length > 0) {
      setGroups((currentGroups) => [...currentGroups, ...importedGroups]);
    }
    toast(`已从 Markdown 生成 ${importedNodes.length} 个节点、${importedGroups.length} 个分组。`, 'success');
  }, [setGroups, setNodes, toast]);

  const addImageFilesToCanvas = useCallback((files: File[], clientX: number, clientY: number) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const asset = createMediaAsset(file.name, String(reader.result || ''));
        const basePosition = screenToFlowPosition({
          x: clientX + index * 24,
          y: clientY + index * 24,
        });
        const newNode = createImageNodeFromAsset(asset, basePosition);
        setNodes((currentNodes) => [...currentNodes, newNode]);
      };
      reader.readAsDataURL(file);
    });
  }, [screenToFlowPosition, setNodes]);

  useCanvasShortcuts({
    shortcuts,
    setNodes,
    setEdges,
    setSelectedEdge: edgeCommands.setSelectedEdge,
    selectedEdge: edgeCommands.selectedEdge,
    selectedNodeCount: presentation.selectedNodes.length,
    onOpenShortcutSettings,
    onToggleMenu: () => {
      setIsMenuOpen((open) => !open);
      setIsDrawerOpen(false);
      mediaLibrary.setOpen(false);
      setIsTemplatePanelOpen(false);
    },
    onUndo,
    onRedo,
    onAddText: () => nodeCommands.addNode('text'),
    onAddImage: () => nodeCommands.addNode('image'),
    onAddIdea: () => nodeCommands.addNode('idea'),
    onAddTable: () => nodeCommands.addNode('table'),
    onAddTimeline: () => nodeCommands.addNode('timeline'),
    onToggleMediaLibrary: () => {
      mediaLibrary.setOpen((open) => !open);
      setIsDrawerOpen(false);
      setIsMenuOpen(false);
      setIsTemplatePanelOpen(false);
    },
    onToggleMoreTools: () => {
      setIsDrawerOpen((open) => {
        const nextOpen = !open;
        if (nextOpen) setIsTemplatePanelOpen(false);
        return nextOpen;
      });
      mediaLibrary.setOpen(false);
      setIsMenuOpen(false);
    },
    onCopySelection: clipboard.copySelectedNodes,
    onPasteSelection: () => clipboard.pasteNodes(),
    onDeleteSelection: nodeCommands.deleteSelectedNodes,
    onFitView: () => fitView({ padding: 0.18, duration: 220 }),
    onZoomIn: () => zoomIn({ duration: 160 }),
    onZoomOut: () => zoomOut({ duration: 160 }),
    onAutoLayout: nodeCommands.autoLayout,
    onOpenClearConfirm: () => setShowClearConfirmModal(true),
    onDuplicateSelection: clipboard.duplicateSelectedNodes,
    onAlignLeft: () => nodeCommands.alignSelectedNodes('left'),
    onAlignTop: () => nodeCommands.alignSelectedNodes('top'),
    onDistributeHorizontal: () => nodeCommands.distributeSelectedNodes('horizontal'),
    onDistributeVertical: () => nodeCommands.distributeSelectedNodes('vertical'),
    onDeleteSelectedEdge: edgeCommands.deleteSelectedEdge,
    onCloseTransientUi: closeTransientUi,
  });

  useEffect(() => {
    setTimelineFocusDisabledIds((currentIds) => {
      if (currentIds.size === 0) return currentIds;

      const selectedTimelineIds = new Set(
        nodes
          .filter((node) => node.type === 'timeline' && node.selected)
          .map((node) => node.id),
      );
      const nextIds = new Set([...currentIds].filter((id) => selectedTimelineIds.has(id)));
      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [nodes]);

  const exitTimelineFocus = useCallback((nodeId: string, keepSelected = true) => {
    setEditingId(null);
    setTimelineFocusDisabledIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (keepSelected) {
        nextIds.add(nodeId);
      } else {
        nextIds.delete(nodeId);
      }
      return nextIds;
    });
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId || node.data.type !== 'timeline') return node;
        let nextContent = node.data.content;
        if (!node.data.timelineData && node.data.content?.trim().startsWith('{')) {
          try {
            nextContent = JSON.stringify({
              ...JSON.parse(node.data.content),
              activeTickId: null,
            });
          } catch {
            nextContent = node.data.content;
          }
        }
        return {
          ...node,
          selected: keepSelected ? node.selected : false,
          data: {
            ...node.data,
            content: nextContent,
            timelineData: node.data.timelineData
              ? {
                  ...node.data.timelineData,
                  activeTickId: null,
                }
              : node.data.timelineData,
          },
        };
      }),
    );
  }, [setNodes]);

  const nodeActionContextValue = useMemo(() => ({
    onDeleteNode: nodeCommands.deleteNode,
    onUpdateContent: nodeCommands.updateContent,
    onAddCustomHandle: nodeCommands.addCustomHandle,
    onDeleteCustomHandle: nodeCommands.deleteCustomHandle,
    onExitTimelineFocus: exitTimelineFocus,
    timelineFocusDisabledIds,
    editingId,
    setEditingId,
    selectedNodeCount: presentation.selectedNodes.length,
    shortcuts,
    variables,
    onToggleGroupCollapse: groupCommands.toggleGroupCollapse,
    onToggleGroupLock: groupCommands.toggleGroupLock,
    onRenameGroup: groupCommands.renameGroup,
    onSetGroupColor: groupCommands.setGroupColor,
    onUngroup: groupCommands.ungroup,
  }), [
    editingId,
    exitTimelineFocus,
    groupCommands.renameGroup,
    groupCommands.setGroupColor,
    groupCommands.toggleGroupCollapse,
    groupCommands.toggleGroupLock,
    groupCommands.ungroup,
    nodeCommands.addCustomHandle,
    nodeCommands.deleteCustomHandle,
    nodeCommands.deleteNode,
    nodeCommands.updateContent,
    presentation.selectedNodes.length,
    shortcuts,
    timelineFocusDisabledIds,
    variables,
  ]);

  const viewportHandlers: ViewportHandlers = {
    onConnect: edgeCommands.onConnect,
    onNodeDragStop: nodeCommands.onNodeDragStop,
    onNodeClick: () => edgeCommands.setSelectedEdge(null),
    onEdgeClick: (_event, edge) => {
      edgeCommands.setSelectedEdge(edges.find((candidate) => candidate.id === edge.id) || edge);
      setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
    },
    onPaneClick: () => {
      setEditingId(null);
      edgeCommands.setSelectedEdge(null);
      contextMenu.closeContextMenu();
    },
    onPaneContextMenu: (event) => {
      event.preventDefault();
      if (pointerPan.rightPointerRef.current.moved) {
        pointerPan.resetPointerPan();
        contextMenu.closeContextMenu();
        return;
      }
      contextMenu.openCanvasContextMenu(event.clientX, event.clientY);
    },
    onNodeContextMenu: (event, node) => {
      event.preventDefault();
      event.stopPropagation();
      if (pointerPan.rightPointerRef.current.moved) {
        pointerPan.resetPointerPan();
        contextMenu.closeContextMenu();
        return;
      }

      setEditingId(null);
      edgeCommands.setSelectedEdge(null);

      const isAlreadySelected = presentation.selectedNodes.some((selectedNode) => selectedNode.id === node.id);
      if (!isAlreadySelected) {
        setNodes((currentNodes) =>
          currentNodes.map((candidate) => ({ ...candidate, selected: candidate.id === node.id })),
        );
      }

      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      contextMenu.setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y,
      });
    },
    onEdgeContextMenu: (event) => {
      event.preventDefault();
      setEditingId(null);
    },
    onPointerDown: (event) => {
      if (event.button === 1 || event.button === 2) {
        pointerPan.beginPointerPan(event.clientX, event.clientY);
      }
    },
    onPointerMove: (event) => {
      pointerPan.updatePointerPan(event.clientX, event.clientY);
    },
    onPointerUp: pointerPan.endPointerPan,
    onPointerLeave: pointerPan.endPointerPan,
    onPointerCancel: pointerPan.resetPointerPan,
    onDragOver: (event) => {
      const hasImage = Array.from(event.dataTransfer.items || []).some((item) => item.kind === 'file' && item.type.startsWith('image/'));
      if (!hasImage) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    onDrop: (event) => {
      const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));
      if (files.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      addImageFilesToCanvas(files, event.clientX, event.clientY);
    },
  };

  const viewportShellHandlers: ViewportShellHandlers = {
    onPointerDownCapture: (event) => {
      if (event.button === 1 || event.button === 2) {
        pointerPan.beginPointerPan(event.clientX, event.clientY);
      }
    },
    onPointerMoveCapture: (event) => {
      pointerPan.updatePointerPan(event.clientX, event.clientY);
    },
    onPointerUpCapture: pointerPan.endPointerPan,
    onPointerLeave: pointerPan.endPointerPan,
    onPointerCancelCapture: pointerPan.resetPointerPan,
    onContextMenu: (event) => {
      const target = event.target as Element;
      if (!target.closest('.react-flow')) return;

      event.preventDefault();
      event.stopPropagation();

      const wasRightDrag = pointerPan.rightPointerRef.current.moved;
      pointerPan.resetPointerPan();

      if (wasRightDrag) {
        contextMenu.closeContextMenu();
        return;
      }

      contextMenu.openCanvasContextMenu(event.clientX, event.clientY);
    },
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-neutral-50">
      <div
        className="relative h-full w-full flex-1"
        id="reactflow-container"
        onPointerDownCapture={viewportShellHandlers.onPointerDownCapture}
        onPointerMoveCapture={viewportShellHandlers.onPointerMoveCapture}
        onPointerUpCapture={viewportShellHandlers.onPointerUpCapture}
        onPointerLeave={viewportShellHandlers.onPointerLeave}
        onPointerCancelCapture={viewportShellHandlers.onPointerCancelCapture}
        onContextMenu={viewportShellHandlers.onContextMenu}
      >
        <NodeActionContext.Provider value={nodeActionContextValue}>
          <CanvasViewport
            nodes={viewportNodes}
            edges={groupedDisplay.edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={CANVAS_NODE_TYPES}
            viewportHandlers={viewportHandlers}
            isPanningByPointer={pointerPan.isPanningByPointer}
          />
        </NodeActionContext.Provider>

        <CanvasOverlays
          header={{
            onExportState,
            onImportState,
            onImportMarkdown: handleImportMarkdown,
            onExportMarkdown: () => requestExport('markdown'),
            onExportCsv: () => requestExport('csv'),
            canUndo,
            canRedo,
            onUndo,
            onRedo,
            menuOpen: isMenuOpen,
            onMenuOpenChange: (open) => {
              setIsMenuOpen(open);
              if (open) {
                setIsDrawerOpen(false);
                mediaLibrary.setOpen(false);
                setIsTemplatePanelOpen(false);
              }
            },
            onAutoLayout: nodeCommands.autoLayout,
            onAssembleDocument: assembly.assembleDocument,
            onRequestClearCanvas: () => setShowClearConfirmModal(true),
            onOpenShortcutSettings,
          }}
          hints={{
            show: showHints,
            onClose: () => setShowHints(false),
          }}
          properties={{
            selectedNodes: presentation.selectedNodesForProperties,
            selectedEdge: presentation.selectedNodes.length > 0 ? null : edgeCommands.selectedEdge,
            onUpdateNodes: nodeCommands.updateNodesFromPanel,
            onResizeNodes: nodeCommands.resizeNodesFromPanel,
            onUpdateEdge: edgeCommands.updateEdgeFromPanel,
            onSaveSelectionAsTemplate: templates.saveSelectionAsTemplate,
          }}
          contextMenu={{
            state: contextMenu.contextMenu,
            selectedCount: presentation.selectedNodes.length,
            canPaste: !!clipboard.clipboard,
            canGroup: presentation.selectedNodes.length >= 2,
            hasGroupedSelection,
            onCreateGroup: handleCreateGroup,
            onUngroupSelection: handleUngroupSelection,
            onCopy: clipboard.copySelectedNodes,
            onPaste: () => clipboard.pasteNodes(),
            onDelete: nodeCommands.deleteSelectedNodes,
            onAlignLeft: () => nodeCommands.alignSelectedNodes('left'),
            onAlignTop: () => nodeCommands.alignSelectedNodes('top'),
            onDistributeHorizontal: () => nodeCommands.distributeSelectedNodes('horizontal'),
            onDistributeVertical: () => nodeCommands.distributeSelectedNodes('vertical'),
            onClose: contextMenu.closeContextMenu,
          }}
          toolbar={{
            isDrawerOpen,
            mediaAssetCount: mediaLibrary.assets.length,
            saveStatus,
            lastSavedAt,
            saveError,
            shortcuts,
            mediaLibraryOpen: mediaLibrary.isOpen,
            storyboardOpen: isStoryboardOpen,
            variablesOpen: isVariablesOpen,
            onToggleStoryboard: () => {
              setIsStoryboardOpen((open) => !open);
              setIsVariablesOpen(false);
            },
            onToggleVariables: () => {
              setIsVariablesOpen((open) => !open);
              setIsStoryboardOpen(false);
            },
            onToggleMediaLibrary: () => {
              const nextState = !mediaLibrary.isOpen;
              mediaLibrary.setOpen(nextState);
              setIsDrawerOpen(false);
              setIsMenuOpen(false);
              setIsTemplatePanelOpen(false);
            },
            onToggleDrawer: () => {
              const nextState = !isDrawerOpen;
              setIsDrawerOpen(nextState);
              if (nextState) {
                setIsMenuOpen(false);
                mediaLibrary.setOpen(false);
                setIsTemplatePanelOpen(false);
              }
            },
            onOpenTemplates: () => {
              setIsTemplatePanelOpen(true);
              setIsDrawerOpen(false);
              setIsMenuOpen(false);
              mediaLibrary.setOpen(false);
              edgeCommands.setSelectedEdge(null);
            },
            onAddNode: nodeCommands.addNode,
          }}
          mediaLibrary={mediaLibrary}
          templates={{
            isOpen: isTemplatePanelOpen,
            setOpen: setIsTemplatePanelOpen,
            templates: templates.templates,
            canSaveSelection: templates.canSaveSelection,
            templateCountLabel: templates.templateCountLabel,
            saveSelectionAsTemplate: templates.saveSelectionAsTemplate,
            insertTemplate: templates.insertTemplate,
            renameTemplate: templates.renameTemplate,
            deleteTemplate: templates.deleteTemplate,
          }}
          assembly={assembly}
          clearCanvas={{
            open: showClearConfirmModal,
            onCancel: () => setShowClearConfirmModal(false),
            onConfirm: () => {
              setNodes([]);
              setEdges([]);
              setGroups([]);
              setShowClearConfirmModal(false);
            },
          }}
          storyboard={{
            isOpen: isStoryboardOpen,
            nodes,
            edges,
            groups,
            shotOrder,
            onShotOrderChange: (order) => setShotOrder(order),
            durationThreshold: shotDurationThreshold,
            onDurationThresholdChange: (seconds) => setShotDurationThreshold(seconds),
            onClose: () => setIsStoryboardOpen(false),
          }}
          variablesPanel={{
            isOpen: isVariablesOpen,
            nodes,
            variables,
            onVariablesChange: (next) => setVariables(next),
            onApplyGlobalReplace: handleApplyGlobalReplace,
            onClose: () => setIsVariablesOpen(false),
          }}
          unresolvedExport={{
            kind: pendingExport,
            unresolved: unresolvedVariables,
            onOpenVariables: () => {
              setPendingExport(null);
              setIsVariablesOpen(true);
              setIsStoryboardOpen(false);
            },
            onExportAnyway: () => {
              if (pendingExport) runExport(pendingExport);
              setPendingExport(null);
            },
            onClose: () => setPendingExport(null),
          }}
        />
      </div>
    </div>
  );
}
