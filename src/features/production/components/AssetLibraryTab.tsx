import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';
import type { ShotAsset, ShotSlotType, WorkspaceNode } from '../../../types';
import { useFeedback } from '../../../shared/feedback/FeedbackProvider';
import { SHOT_ASSET_DRAG_MIME, SHOT_SLOT_DEFS, SHOT_SLOT_LABELS } from '../constants';
import { formatDuration, type AssetUsage } from '../utils/productionUtils';
import type { NewShotAssetInput } from '../hooks/useProductionAssets';

interface AssetLibraryTabProps {
  assets: ShotAsset[];
  usage: Map<string, AssetUsage>;
  selectedShotNode: WorkspaceNode | null;
  onAddAsset: (input: NewShotAssetInput) => void;
  onDeleteAsset: (assetId: string) => void;
  onBindToNode: (nodeId: string, slot: ShotSlotType, assetId: string) => void;
  onUnbindAssetEverywhere: (assetId: string) => void;
}

export default function AssetLibraryTab({
  assets,
  usage,
  selectedShotNode,
  onAddAsset,
  onDeleteAsset,
  onBindToNode,
  onUnbindAssetEverywhere,
}: AssetLibraryTabProps) {
  const { toast, confirm } = useFeedback();
  const [name, setName] = useState('');
  const [type, setType] = useState<ShotSlotType>('broll');
  const [duration, setDuration] = useState('10');
  const [tags, setTags] = useState('');
  const [maxUsage, setMaxUsage] = useState('1');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast('请先填写素材名称', 'error');
      return;
    }
    onAddAsset({
      name,
      type,
      durationSec: Number(duration) || 0,
      tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      maxUsage: Number(maxUsage) || 1,
    });
    setName('');
    setTags('');
    toast('素材已登记到素材库', 'success');
  };

  const handleDelete = async (asset: ShotAsset) => {
    const refCount = usage.get(asset.id)?.count || 0;
    const ok = await confirm({
      title: '删除素材',
      message: refCount > 0 ? `「${asset.name}」正被 ${refCount} 个镜头引用，删除后将自动解绑。` : `确定删除「${asset.name}」吗？`,
      confirmText: '删除',
      destructive: true,
    });
    if (!ok) return;
    onDeleteAsset(asset.id);
    onUnbindAssetEverywhere(asset.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={handleSubmit} className="space-y-2 border-b border-neutral-100 bg-neutral-50/40 p-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="素材名称，如：开场航拍"
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] focus:border-neutral-400 focus:outline-none"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ShotSlotType)}
            className="w-[76px] rounded-md border border-neutral-200 bg-white px-1.5 py-1.5 text-[11px] focus:border-neutral-400 focus:outline-none"
          >
            {SHOT_SLOT_DEFS.map((def) => (
              <option key={def.type} value={def.type}>{def.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
            <span className="shrink-0 text-[10px] text-neutral-400">时长(秒)</span>
            <input
              value={duration}
              onChange={(event) => setDuration(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className="w-full min-w-0 text-[11px] focus:outline-none"
            />
          </label>
          <label className="flex flex-1 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
            <span className="shrink-0 text-[10px] text-neutral-400">可用次数</span>
            <input
              value={maxUsage}
              onChange={(event) => setMaxUsage(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className="w-full min-w-0 text-[11px] focus:outline-none"
            />
          </label>
        </div>
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="标签（逗号分隔），如：外景, 日景"
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-neutral-900 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          <Plus className="h-3 w-3" />
          登记素材
        </button>
      </form>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin">
        {assets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-neutral-400 select-none">
            <p className="text-[11px] font-semibold text-neutral-500">素材库为空</p>
            <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
              登记可复用的出镜、B-roll、图版、音效、字幕素材，然后拖到镜头卡片的槽位上完成绑定。
            </p>
          </div>
        ) : (
          assets.map((asset) => {
            const refCount = usage.get(asset.id)?.count || 0;
            const isOverused = refCount > Math.max(1, asset.maxUsage);
            return (
              <div
                key={asset.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(SHOT_ASSET_DRAG_MIME, asset.id);
                  event.dataTransfer.effectAllowed = 'link';
                }}
                className={`group cursor-grab rounded-lg border bg-white p-2.5 transition-all hover:shadow-xs active:cursor-grabbing ${
                  isOverused ? 'border-red-200 bg-red-50/40' : 'border-neutral-200 hover:border-neutral-300'
                }`}
                data-tooltip="拖拽到镜头卡片的槽位上完成绑定"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-neutral-800">{asset.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {selectedShotNode && (
                      <button
                        onClick={() => {
                          onBindToNode(selectedShotNode.id, asset.type, asset.id);
                          toast(`已绑定到「${selectedShotNode.data.title || '选中镜头'}」的${SHOT_SLOT_LABELS[asset.type]}槽位`, 'success');
                        }}
                        className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                        data-tooltip={`绑定到选中镜头的${SHOT_SLOT_LABELS[asset.type]}槽位`}
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(asset)}
                      className="cursor-pointer rounded p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      data-tooltip="删除素材"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[9px]">
                  <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 font-semibold leading-none text-white">
                    {SHOT_SLOT_LABELS[asset.type]}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 leading-none text-neutral-500">
                    {formatDuration(asset.durationSec)}
                  </span>
                  {asset.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-neutral-100 px-1.5 py-0.5 leading-none text-neutral-500">
                      {`#${tag}`}
                    </span>
                  ))}
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-semibold leading-none ${
                      isOverused
                        ? 'bg-red-100 text-red-600'
                        : refCount > 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    {isOverused
                      ? `超额引用 ${refCount}/${asset.maxUsage}`
                      : refCount > 0
                        ? `占用中 · ${refCount} 个镜头`
                        : '未占用'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
