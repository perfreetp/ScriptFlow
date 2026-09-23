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
import ShotTimelinePanel from './components/ShotTimelinePanel';
import VariablesPanel from './components/VariablesPanel';
import UnresolvedVariablesModal from './components/UnresolvedVariablesModal';
import type { UnresolvedVariableRef } from './utils/variables';
import type { AutoSaveStatus, CanvasNodeData, ScriptVariable, WorkspaceNode, WorkspaceSaveState } from '../../types';
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
    onExportMarkdown: () => void;
    onExportCsv: () => void;
    onImportMarkdownOutline: (markdown: string) => void;
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
    onCreateGroup: () => void;
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
    isShotPanelOpen: boolean;
    isVariablesPanelOpen: boolean;
    mediaAssetCount: number;
    saveStatus: AutoSaveStatus;
    lastSavedAt: number | null;
    saveError: string | null;
    shortcuts: ShortcutMap;
    mediaLibraryOpen: boolean;
    onToggleMediaLibrary: () => void;
    onToggleDrawer: () => void;
    onOpenTemplates: () => void;
    onToggleShotPanel: () => void;
    onToggleVariablesPanel: () => void;
    onAddNode: (type: CanvasNodeData['type']) => void;
  };
  shotPanel: {
    isOpen: boolean;
    nodes: WorkspaceNode[];
    edges: Edge[];
    shotOrder: string[];
    thresholdSeconds: number;
    onShotOrderChange: (order: string[]) => void;
    onThresholdChange: (seconds: number) => void;
    onClose: () => void;
  };
  variablesPanel: {
    isOpen: boolean;
    nodes: WorkspaceNode[];
    variables: ScriptVariable[];
    onVariablesChange: (variables: ScriptVariable[]) => void;
    onApplyVariables: (onlyNames?: Set<string>) => void;
    onClose: () => void;
  };
  exportBlock: {
    state: { unresolved: UnresolvedVariableRef[]; exportLabel: string } | null;
    onClose: () => void;
    onOpenVariables: () => void;
  };
  mediaLibrary: CanvasMediaLibraryState;
  templates: CanvasTemplateState;
  assembly: CanvasAssemblyState;
  clearCanvas: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  };
  children?: ReactNode;
}

export default function CanvasOverlays({
  header,
  hints,
  properties,
  contextMenu,
  toolbar,
  shotPanel,
  variablesPanel,
  exportBlock,
  mediaLibrary,
  templates,
  assembly,
  clearCanvas,
}: CanvasOverlaysProps) {
  return (
    <>
      <CanvasHeader
        onExportState={header.onExportState}
        onImportState={header.onImportState}
        onExportMarkdown={header.onExportMarkdown}
        onExportCsv={header.onExportCsv}
        onImportMarkdownOutline={header.onImportMarkdownOutline}
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
          onCreateGroup={contextMenu.onCreateGroup}
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
        isShotPanelOpen={toolbar.isShotPanelOpen}
        isVariablesPanelOpen={toolbar.isVariablesPanelOpen}
        isMediaLibraryOpen={toolbar.mediaLibraryOpen}
        mediaAssetCount={toolbar.mediaAssetCount}
        saveStatus={toolbar.saveStatus}
        lastSavedAt={toolbar.lastSavedAt}
        saveError={toolbar.saveError}
        shortcuts={toolbar.shortcuts}
        onToggleMediaLibrary={toolbar.onToggleMediaLibrary}
        onToggleDrawer={toolbar.onToggleDrawer}
        onOpenTemplates={toolbar.onOpenTemplates}
        onToggleShotPanel={toolbar.onToggleShotPanel}
        onToggleVariablesPanel={toolbar.onToggleVariablesPanel}
        onAddNode={toolbar.onAddNode}
      />

      <ShotTimelinePanel
        open={shotPanel.isOpen}
        nodes={shotPanel.nodes}
        edges={shotPanel.edges}
        shotOrder={shotPanel.shotOrder}
        thresholdSeconds={shotPanel.thresholdSeconds}
        onShotOrderChange={shotPanel.onShotOrderChange}
        onThresholdChange={shotPanel.onThresholdChange}
        onClose={shotPanel.onClose}
      />

      <VariablesPanel
        open={variablesPanel.isOpen}
        nodes={variablesPanel.nodes}
        variables={variablesPanel.variables}
        onVariablesChange={variablesPanel.onVariablesChange}
        onApplyVariables={variablesPanel.onApplyVariables}
        onClose={variablesPanel.onClose}
      />

      <UnresolvedVariablesModal
        open={!!exportBlock.state}
        unresolved={exportBlock.state?.unresolved || []}
        exportLabel={exportBlock.state?.exportLabel || ''}
        onClose={exportBlock.onClose}
        onOpenVariables={exportBlock.onOpenVariables}
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
    </>
  );
}
