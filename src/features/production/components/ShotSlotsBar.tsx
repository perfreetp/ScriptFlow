import { useContext, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { Clapperboard, Film, Image as ImageIcon, Music4, Subtitles, User, X } from 'lucide-react';
import type { ShotSlotBinding, ShotSlotType } from '../../../types';
import { SHOT_ASSET_DRAG_MIME, SHOT_SLOT_DEFS } from '../constants';
import { normalizeShotSlots } from '../utils/productionUtils';
import { ProductionContext } from '../ProductionContext';

const SLOT_ICONS: Record<ShotSlotType, typeof User> = {
  onCamera: User,
  broll: Film,
  graphic: ImageIcon,
  audio: Music4,
  subtitle: Subtitles,
};

interface ShotSlotsBarProps {
  nodeId: string;
  slots?: ShotSlotBinding[];
}

export default function ShotSlotsBar({ nodeId, slots }: ShotSlotsBarProps) {
  const { assets, bindAsset, unbindAsset } = useContext(ProductionContext);
  const [activeSlot, setActiveSlot] = useState<ShotSlotType | null>(null);
  const normalized = normalizeShotSlots(slots);
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  const handleDragOver = (event: ReactDragEvent, slot: ShotSlotType) => {
    if (!event.dataTransfer.types.includes(SHOT_ASSET_DRAG_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'link';
    setActiveSlot(slot);
  };

  const handleDrop = (event: ReactDragEvent, slot: ShotSlotType) => {
    if (!event.dataTransfer.types.includes(SHOT_ASSET_DRAG_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveSlot(null);
    const assetId = event.dataTransfer.getData(SHOT_ASSET_DRAG_MIME);
    if (assetId) bindAsset(nodeId, slot, assetId);
  };

  return (
    <div className="nodrag flex shrink-0 flex-wrap items-center gap-1 border-t border-neutral-100 px-3 py-1.5">
      <Clapperboard className="mr-0.5 h-3 w-3 text-neutral-300" />
      {normalized.map((binding) => {
        const def = SHOT_SLOT_DEFS.find((candidate) => candidate.type === binding.slot);
        const asset = binding.assetId ? assetMap.get(binding.assetId) : null;
        const Icon = SLOT_ICONS[binding.slot];
        const isEmpty = !asset;
        const isActive = activeSlot === binding.slot;
        return (
          <span
            key={binding.slot}
            onDragOver={(event) => handleDragOver(event, binding.slot)}
            onDragLeave={() => setActiveSlot((current) => (current === binding.slot ? null : current))}
            onDrop={(event) => handleDrop(event, binding.slot)}
            data-tooltip={
              asset
                ? `${def?.label}：${asset.name}（点击 × 解绑）`
                : `${def?.label}${def?.required ? '（关键槽位）' : ''}：从素材库拖入素材`
            }
            className={`group/slot inline-flex max-w-[104px] cursor-default items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] leading-none transition-colors ${
              asset
                ? 'border-neutral-300 bg-neutral-900 text-white'
                : isActive
                  ? 'border-neutral-500 bg-neutral-100 text-neutral-700'
                  : def?.required
                    ? 'border-dashed border-amber-300 bg-amber-50/60 text-amber-600'
                    : 'border-dashed border-neutral-200 text-neutral-400'
            }`}
          >
            <Icon className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{asset ? asset.name : def?.label}</span>
            {asset && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  unbindAsset(nodeId, binding.slot);
                }}
                className="hidden h-3 w-3 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-300 hover:text-white group-hover/slot:inline-flex"
                aria-label={`解绑${def?.label}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
            {isEmpty && def?.required && <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400" />}
          </span>
        );
      })}
    </div>
  );
}
