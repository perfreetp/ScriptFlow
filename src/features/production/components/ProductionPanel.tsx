import { useMemo, useState } from 'react';
import { BarChart3, Clapperboard, ClipboardList, FolderKanban, ScrollText, X } from 'lucide-react';
import type { ShotAsset, ShotSlotType, WorkspaceNode } from '../../../types';
import type { NewShotAssetInput } from '../hooks/useProductionAssets';
import {
  buildCallSheet,
  computeAssetUsage,
  computeProductionAlerts,
  computeProductionAnalytics,
  estimateShotDurationSec,
  getShotNodes,
} from '../utils/productionUtils';
import AssetLibraryTab from './AssetLibraryTab';
import AnalyticsTab from './AnalyticsTab';
import CallSheetTab from './CallSheetTab';
import type { TeleprompterShot } from './TeleprompterModal';
import { useFeedback } from '../../../shared/feedback/FeedbackProvider';

type ProductionTab = 'library' | 'callsheet' | 'analytics';

interface ProductionPanelProps {
  nodes: WorkspaceNode[];
  assets: ShotAsset[];
  addAsset: (input: NewShotAssetInput) => void;
  deleteAsset: (assetId: string) => void;
  selectedShotNode: WorkspaceNode | null;
  onBindAsset: (nodeId: string, slot: ShotSlotType, assetId: string) => void;
  onUnbindAssetEverywhere: (assetId: string) => void;
  onToggleShotDone: (nodeId: string, done: boolean) => void;
  onOpenTeleprompter: (shots: TeleprompterShot[]) => void;
  onClose: () => void;
}

const TAB_DEFS: Array<{ key: ProductionTab; label: string; icon: typeof FolderKanban }> = [
  { key: 'library', label: '素材库', icon: FolderKanban },
  { key: 'callsheet', label: '通告单', icon: ClipboardList },
  { key: 'analytics', label: '看板', icon: BarChart3 },
];

export default function ProductionPanel({
  nodes,
  assets,
  addAsset,
  deleteAsset,
  selectedShotNode,
  onBindAsset,
  onUnbindAssetEverywhere,
  onToggleShotDone,
  onOpenTeleprompter,
  onClose,
}: ProductionPanelProps) {
  const [activeTab, setActiveTab] = useState<ProductionTab>('library');
  const { toast } = useFeedback();

  const usage = useMemo(() => computeAssetUsage(nodes), [nodes]);
  const callSheetGroups = useMemo(() => buildCallSheet(nodes, assets), [nodes, assets]);
  const analytics = useMemo(() => computeProductionAnalytics(nodes), [nodes]);
  const alerts = useMemo(() => computeProductionAlerts(nodes, assets), [nodes, assets]);
  const alertCount = alerts.overused.length + alerts.missingSlots.length + analytics.talkingHeadRuns.length;

  const handleOpenTeleprompter = () => {
    const shots = getShotNodes(nodes).map((node) => ({
      nodeId: node.id,
      title: node.data.title || '未命名镜头',
      content: node.data.content || '',
      estimateSec: estimateShotDurationSec(node.data.content || '', node.data.shotEstimateSec),
    }));
    if (shots.length === 0) {
      toast('画布上还没有镜头卡片，请先创建文本卡片作为镜头。', 'error');
      return;
    }
    onOpenTeleprompter(shots);
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 top-[72px] z-40 flex w-80 animate-in slide-in-from-right flex-col overflow-hidden rounded-xl border border-neutral-200/95 bg-white/95 text-xs text-neutral-800 shadow-25 backdrop-blur-md duration-200">
      <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Clapperboard className="h-4 w-4 text-neutral-700" />
          <span className="text-xs font-semibold text-neutral-800">拍摄制作</span>
          {alertCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-red-600">
              {alertCount} 项告警
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenTeleprompter}
            className="flex cursor-pointer items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-neutral-800"
            data-tooltip="进入提词器录制模式"
          >
            <ScrollText className="h-3 w-3" />
            提词器
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 border-b border-neutral-100 bg-white">
        {TAB_DEFS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1 border-b-2 py-2 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'library' && (
        <AssetLibraryTab
          assets={assets}
          usage={usage}
          selectedShotNode={selectedShotNode}
          onAddAsset={addAsset}
          onDeleteAsset={deleteAsset}
          onBindToNode={onBindAsset}
          onUnbindAssetEverywhere={onUnbindAssetEverywhere}
        />
      )}
      {activeTab === 'callsheet' && (
        <CallSheetTab groups={callSheetGroups} onToggleShotDone={onToggleShotDone} />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsTab analytics={analytics} alerts={alerts} />
      )}
    </div>
  );
}
