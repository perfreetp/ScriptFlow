import type { ReactNode } from 'react';
import type { Edge } from '@xyflow/react';
import CanvasHeader from './components/CanvasHeader';
import WorkspaceHistoryControls from './components/WorkspaceHistoryControls';
import CanvasHintBubble from './components/CanvasHintBubble';
import CanvasPropertiesPanel from './components/CanvasPropertiesPanel';
import CanvasContextMenu from './components/CanvasContextMenu';
import CanvasToolbar from './components/CanvasToolbar';
import MediaLibraryDrawer from './components/MediaLibraryDrawer';
import CanvasTemplatePanel from './components/CanvasTemplatePanel';
import AssemblyPreviewModal from './components/AssemblyPreviewModal';
import ClearCanvasConfirmModal from './components/ClearCanvasConfirmModal';
import StoryboardPanel from './components/StoryboardPanel';
import VariablesPanel from './components/VariablesPanel';
import UnresolvedVariablesModal from './components/UnresolvedVariablesModal';
import type { AutoSaveStatus, CanvasNodeData, SceneGroup, WorkspaceNode, WorkspaceSaveState } from '../../types';
import type { VariableUsage } from './utils/variableUtils';
import type { ShortcutMap } from '../shortcuts';
import type {
  CanvasAssemblyState,
  CanvasContextMenuState,
  CanvasMediaLibraryState,
  CanvasTemplateState,
} from './types';

interface CanvasOverlaysProps {
  header: {
    onExportState: () => void;
    onImportState: (state: WorkspaceSaveState) => void;
    onImportMarkdown: (markdown: string) => void;
    onExportMarkdown: () => void;
    onExportCsv: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    menuOpen: boolean;
    onMenuOpenChange: (open: boolean) => void;
    onAutoLayout: () => void;
    onAssembleDocument: () => void;
    onRequestClearCanvas: () => void;
    onOpenShortcutSettings: () => void;
  };
  hints: {
    show: boolean;
    onClose: () => void;
  };
  properties: {
    selectedNodes: WorkspaceNode[];
    selectedEdge: Edge | null;
    onUpdateNodes: (nodeIds: string[], patch: Partial<CanvasNodeData>) => void;
    onResizeNodes: (nodeIds: string[], width?: number, height?: number) => void;
    onUpdateEdge: (edgeId: string, patch: Partial<Edge>) => void;
    onSaveSelectionAsTemplate?: () => void;
  };
  contextMenu: {
    state: CanvasContextMenuState | null;
    selectedCount: number;
    canPaste: boolean;
    canGroup: boolean;
    hasGroupedSelection: boolean;
    onCreateGroup: () => void;
    onUngroupSelection: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onDelete: () => void;
    onAlignLeft: () => void;
    onAlignTop: () => void;
    onDistributeHorizontal: () => void;
    onDistributeVertical: () => void;
    onClose: () => void;
  };
  toolbar: {
    isDrawerOpen: boolean;
    mediaAssetCount: number;
    saveStatus: AutoSaveStatus;
    lastSavedAt: number | null;
    saveError: string | null;
    shortcuts: ShortcutMap;
    mediaLibraryOpen: boolean;
    storyboardOpen: boolean;
    variablesOpen: boolean;
    onToggleStoryboard: () => void;
    onToggleVariables: () => void;
    onToggleMediaLibrary: () => void;
    onToggleDrawer: () => void;
    onOpenTemplates: () => void;
    onAddNode: (type: CanvasNodeData['type']) => void;
  };
  mediaLibrary: CanvasMediaLibraryState;
  templates: CanvasTemplateState;
  assembly: CanvasAssemblyState;
  clearCanvas: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  };
  storyboard: {
    isOpen: boolean;
    nodes: WorkspaceNode[];
    edges: Edge[];
    groups: SceneGroup[];
    shotOrder: string[];
    onShotOrderChange: (order: string[]) => void;
    durationThreshold: number;
    onDurationThresholdChange: (seconds: number) => void;
    onClose: () => void;
  };
  variablesPanel: {
    isOpen: boolean;
    nodes: WorkspaceNode[];
    variables: Record<string, string>;
    onVariablesChange: (variables: Record<string, string>) => void;
    onApplyGlobalReplace: () => void;
    onClose: () => void;
  };
  unresolvedExport: {
    kind: 'markdown' | 'csv' | null;
    unresolved: VariableUsage[];
    onOpenVariables: () => void;
    onExportAnyway: () => void;
    onClose: () => void;
  };
  children?: ReactNode;
}

export default function CanvasOverlays({
  header,
  hints,
  properties,
  contextMenu,
  toolbar,
  mediaLibrary,
  templates,
  assembly,
  clearCanvas,
  storyboard,
  variablesPanel,
  unresolvedExport,
}: CanvasOverlaysProps) {
  return (
    <>
      <CanvasHeader
        onExportState={header.onExportState}
        onImportState={header.onImportState}
        onImportMarkdown={header.onImportMarkdown}
        onExportMarkdown={header.onExportMarkdown}
        onExportCsv={header.onExportCsv}
        menuOpen={header.menuOpen}
        onMenuOpenChange={header.onMenuOpenChange}
        leadingActions={(
          <WorkspaceHistoryControls
            canUndo={header.canUndo}
            canRedo={header.canRedo}
            onUndo={header.onUndo}
            onRedo={header.onRedo}
          />
        )}
        onAutoLayout={header.onAutoLayout}
        onAssembleDocument={header.onAssembleDocument}
        onRequestClearCanvas={header.onRequestClearCanvas}
        onOpenShortcutSettings={header.onOpenShortcutSettings}
      />

      {hints.show && <CanvasHintBubble onClose={hints.onClose} />}

      {templates.isOpen ? (
        <CanvasTemplatePanel
          templates={templates.templates}
          canSaveSelection={templates.canSaveSelection}
          templateCountLabel={templates.templateCountLabel}
          onSaveSelection={templates.saveSelectionAsTemplate}
          onInsertTemplate={templates.insertTemplate}
          onRenameTemplate={templates.renameTemplate}
          onDeleteTemplate={templates.deleteTemplate}
          onClose={() => templates.setOpen(false)}
        />
      ) : (
        <CanvasPropertiesPanel
          selectedNodes={properties.selectedNodes}
          selectedEdge={properties.selectedEdge}
          onUpdateNodes={properties.onUpdateNodes}
          onResizeNodes={properties.onResizeNodes}
          onUpdateEdge={properties.onUpdateEdge}
          onSaveSelectionAsTemplate={properties.onSaveSelectionAsTemplate}
        />
      )}

      {contextMenu.state && (
        <CanvasContextMenu
          x={contextMenu.state.x}
          y={contextMenu.state.y}
          selectedCount={contextMenu.selectedCount}
          canPaste={contextMenu.canPaste}
          canGroup={contextMenu.canGroup}
          hasGroupedSelection={contextMenu.hasGroupedSelection}
          onCreateGroup={contextMenu.onCreateGroup}
          onUngroupSelection={contextMenu.onUngroupSelection}
          onCopy={contextMenu.onCopy}
          onPaste={contextMenu.onPaste}
          onDelete={contextMenu.onDelete}
          onAlignLeft={contextMenu.onAlignLeft}
          onAlignTop={contextMenu.onAlignTop}
          onDistributeHorizontal={contextMenu.onDistributeHorizontal}
          onDistributeVertical={contextMenu.onDistributeVertical}
          onClose={contextMenu.onClose}
        />
      )}

      <CanvasToolbar
        isDrawerOpen={toolbar.isDrawerOpen}
        isMediaLibraryOpen={toolbar.mediaLibraryOpen}
        isStoryboardOpen={toolbar.storyboardOpen}
        isVariablesOpen={toolbar.variablesOpen}
        mediaAssetCount={toolbar.mediaAssetCount}
        saveStatus={toolbar.saveStatus}
        lastSavedAt={toolbar.lastSavedAt}
        saveError={toolbar.saveError}
        shortcuts={toolbar.shortcuts}
        onToggleStoryboard={toolbar.onToggleStoryboard}
        onToggleVariables={toolbar.onToggleVariables}
        onToggleMediaLibrary={toolbar.onToggleMediaLibrary}
        onToggleDrawer={toolbar.onToggleDrawer}
        onOpenTemplates={toolbar.onOpenTemplates}
        onAddNode={toolbar.onAddNode}
      />

      <MediaLibraryDrawer
        open={mediaLibrary.isOpen}
        assets={mediaLibrary.assets}
        fileInputRef={mediaLibrary.fileInputRef}
        onClose={() => mediaLibrary.setOpen(false)}
        onUpload={mediaLibrary.upload}
        onInsertAsset={mediaLibrary.insertAsset}
        onDeleteAsset={mediaLibrary.deleteAsset}
        onDownloadAll={mediaLibrary.downloadAll}
      />

      <AssemblyPreviewModal
        open={assembly.isModalOpen}
        assembledDocText={assembly.assembledDocText}
        isCopied={assembly.isCopied}
        onClose={assembly.closeModal}
        onCopy={assembly.copyToClipboard}
        onApply={assembly.applyToMainDocument}
      />

      <ClearCanvasConfirmModal
        open={clearCanvas.open}
        onCancel={clearCanvas.onCancel}
        onConfirm={clearCanvas.onConfirm}
      />

      {storyboard.isOpen && (
        <StoryboardPanel
          nodes={storyboard.nodes}
          edges={storyboard.edges}
          groups={storyboard.groups}
          shotOrder={storyboard.shotOrder}
          onShotOrderChange={storyboard.onShotOrderChange}
          durationThreshold={storyboard.durationThreshold}
          onDurationThresholdChange={storyboard.onDurationThresholdChange}
          onClose={storyboard.onClose}
        />
      )}

      {variablesPanel.isOpen && (
        <VariablesPanel
          nodes={variablesPanel.nodes}
          variables={variablesPanel.variables}
          onVariablesChange={variablesPanel.onVariablesChange}
          onApplyGlobalReplace={variablesPanel.onApplyGlobalReplace}
          onClose={variablesPanel.onClose}
        />
      )}

      <UnresolvedVariablesModal
        open={unresolvedExport.kind !== null}
        unresolved={unresolvedExport.unresolved}
        exportLabel={unresolvedExport.kind === 'csv' ? 'CSV 分镜表导出' : 'Markdown 导出'}
        onOpenVariables={unresolvedExport.onOpenVariables}
        onExportAnyway={unresolvedExport.onExportAnyway}
        onClose={unresolvedExport.onClose}
      />
    </>
  );
}
