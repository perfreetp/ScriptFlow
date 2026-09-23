import { BarChart3, Clapperboard, ClipboardList, Package, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkspaceNode } from '../../../types';
import CallSheetPanel from './CallSheetPanel';
import DashboardPanel from './DashboardPanel';
import MaterialLibraryPanel from './MaterialLibraryPanel';
import type { ProductionMaterial } from '../types';
import type { NewMaterialInput } from '../hooks/useProductionMaterials';
import {
  buildCallSheet,
  computeDashboardStats,
  computeMaterialUsage,
  computeProductionWarnings,
} from '../utils/productionUtils';

type ProductionTab = 'materials' | 'callsheet' | 'dashboard';

interface ProductionPanelProps {
  nodes: WorkspaceNode[];
  materials: ProductionMaterial[];
  onAddMaterial: (input: NewMaterialInput) => void;
  onUpdateMaterial: (materialId: string, patch: Partial<ProductionMaterial>) => void;
  onDeleteMaterial: (materialId: string) => void;
  onToggleShotDone: (nodeId: string, done: boolean) => void;
  onClose: () => void;
}

const TABS: Array<{ id: ProductionTab; label: string; icon: typeof Package }> = [
  { id: 'materials', label: '素材库', icon: Package },
  { id: 'callsheet', label: '通告单', icon: ClipboardList },
  { id: 'dashboard', label: '看板', icon: BarChart3 },
];

export default function ProductionPanel({
  nodes,
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onToggleShotDone,
  onClose,
}: ProductionPanelProps) {
  const [activeTab, setActiveTab] = useState<ProductionTab>('materials');

  const usage = useMemo(() => computeMaterialUsage(nodes), [nodes]);
  const warnings = useMemo(() => computeProductionWarnings(nodes, materials), [nodes, materials]);
  const callSheetScenes = useMemo(() => buildCallSheet(nodes, materials), [nodes, materials]);
  const dashboardStats = useMemo(() => computeDashboardStats(nodes), [nodes]);

  return (
    <div className="absolute right-4 top-20 bottom-24 z-30 flex w-[19rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-neutral-200/80 bg-white/95 p-2.5 text-left shadow-xl shadow-neutral-900/10 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between border-b border-neutral-100 pb-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
          <Clapperboard className="h-4 w-4 text-neutral-500" />
          拍摄制作
          {warnings.length > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              {warnings.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="关闭制作面板"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2.5 grid grid-cols-3 gap-1 rounded-xl border border-neutral-200 bg-white p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-7 cursor-pointer items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-neutral-200 text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'materials' && (
        <MaterialLibraryPanel
          materials={materials}
          usage={usage}
          warnings={warnings}
          onAddMaterial={onAddMaterial}
          onUpdateMaterial={onUpdateMaterial}
          onDeleteMaterial={onDeleteMaterial}
        />
      )}
      {activeTab === 'callsheet' && (
        <CallSheetPanel scenes={callSheetScenes} onToggleShotDone={onToggleShotDone} />
      )}
      {activeTab === 'dashboard' && <DashboardPanel stats={dashboardStats} />}
    </div>
  );
}
