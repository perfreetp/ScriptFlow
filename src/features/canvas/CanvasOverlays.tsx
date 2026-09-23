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
import ProductionPanel from '../production/components/ProductionPanel';
import TeleprompterOverlay from '../production/components/TeleprompterOverlay';
import type { TeleprompterRecording } from '../production/components/TeleprompterOverlay';
import type { NewMaterialInput } from '../production/hooks/useProductionMaterials';
import type { ProductionMaterial } from '../production/types';
import type { AutoSaveStatus, CanvasNodeData, WorkspaceNode, WorkspaceSaveState } from '../../types';
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
    productionMaterials: ProductionMaterial[];
    onOpenTeleprompter: (nodeId: string) => void;
  };
  contextMenu: {
    state: CanvasContextMenuState | null;
    selectedCount: number;
    canPaste: boolean;
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
    productionPanelOpen: boolean;
    onToggleMediaLibrary: () => void;
    onToggleProductionPanel: () => void;
    onToggleDrawer: () => void;
    onOpenTemplates: () => void;
    onAddNode: (type: CanvasNodeData['type']) => void;
  };
  production: {
    isOpen: boolean;
    nodes: WorkspaceNode[];
    materials: ProductionMaterial[];
    onAddMaterial: (input: NewMaterialInput) => void;
    onUpdateMaterial: (materialId: string, patch: Partial<ProductionMaterial>) => void;
    onDeleteMaterial: (materialId: string) => void;
    onToggleShotDone: (nodeId: string, done: boolean) => void;
    onClose: () => void;
  };
  teleprompter: {
    startNodeId: string | null;
    shots: WorkspaceNode[];
    onFinish: (recordings: TeleprompterRecording[]) => void;
    onClose: () => void;
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
  production,
  teleprompter,
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
          productionMaterials={properties.productionMaterials}
          onOpenTeleprompter={properties.onOpenTeleprompter}
          shifted={production.isOpen}
        />
      )}

      {contextMenu.state && (
        <CanvasContextMenu
          x={contextMenu.state.x}
          y={contextMenu.state.y}
          selectedCount={contextMenu.selectedCount}
          canPaste={contextMenu.canPaste}
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
        mediaAssetCount={toolbar.mediaAssetCount}
        saveStatus={toolbar.saveStatus}
        lastSavedAt={toolbar.lastSavedAt}
        saveError={toolbar.saveError}
        shortcuts={toolbar.shortcuts}
        productionPanelOpen={toolbar.productionPanelOpen}
        onToggleMediaLibrary={toolbar.onToggleMediaLibrary}
        onToggleProductionPanel={toolbar.onToggleProductionPanel}
        onToggleDrawer={toolbar.onToggleDrawer}
        onOpenTemplates={toolbar.onOpenTemplates}
        onAddNode={toolbar.onAddNode}
      />

      {production.isOpen && (
        <ProductionPanel
          nodes={production.nodes}
          materials={production.materials}
          onAddMaterial={production.onAddMaterial}
          onUpdateMaterial={production.onUpdateMaterial}
          onDeleteMaterial={production.onDeleteMaterial}
          onToggleShotDone={production.onToggleShotDone}
          onClose={production.onClose}
        />
      )}

      {teleprompter.startNodeId && (
        <TeleprompterOverlay
          shots={teleprompter.shots}
          startNodeId={teleprompter.startNodeId}
          onFinish={teleprompter.onFinish}
          onClose={teleprompter.onClose}
        />
      )}

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
