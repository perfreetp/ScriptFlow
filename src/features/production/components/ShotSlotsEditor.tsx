import { Play, X } from 'lucide-react';
import { useState } from 'react';
import { useFeedback } from '../../../shared/feedback/FeedbackProvider';
import type { ShotSlotBinding, WorkspaceNode } from '../../../types';
import { MATERIAL_DRAG_MIME, SLOT_DEFINITIONS, SLOT_LABELS } from '../constants';
import type { ProductionMaterial } from '../types';
import {
  estimateSecondsFromText,
  formatDuration,
  normalizeShotSlots,
} from '../utils/productionUtils';

interface ShotSlotsEditorProps {
  node: WorkspaceNode;
  materials: ProductionMaterial[];
  onUpdateNodes: (nodeIds: string[], patch: Partial<WorkspaceNode['data']>) => void;
  onOpenTeleprompter: (nodeId: string) => void;
}

export default function ShotSlotsEditor({
  node,
  materials,
  onUpdateNodes,
  onOpenTeleprompter,
}: ShotSlotsEditorProps) {
  const { toast } = useFeedback();
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const slots = normalizeShotSlots(node.data.shotSlots);
  const autoEstimate = estimateSecondsFromText(node.data.content || '');
  const effectiveEstimate = typeof node.data.estimatedSeconds === 'number'
    ? node.data.estimatedSeconds
    : autoEstimate;

  const updateSlots = (nextSlots: ShotSlotBinding[]) => {
    onUpdateNodes([node.id], { shotSlots: nextSlots });
  };

  const bindMaterial = (slotKind: string, materialId: string) => {
    const nextSlots = slots.map((slot) =>
      slot.slot === slotKind ? { ...slot, materialId: materialId || null } : slot,
    );
    updateSlots(nextSlots);
  };

  const handleDrop = (event: React.DragEvent, slotKind: string) => {
    event.preventDefault();
    setDragOverSlot(null);
    const raw = event.dataTransfer.getData(MATERIAL_DRAG_MIME);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { id: string; type: string };
      if (payload.type !== slotKind) {
        toast(`该素材类型为「${SLOT_LABELS[payload.type as keyof typeof SLOT_LABELS] || payload.type}」，与槽位不匹配`, 'error');
        return;
      }
      bindMaterial(slotKind, payload.id);
      toast('素材已绑定到槽位', 'success');
    } catch {
      toast('素材数据无效', 'error');
    }
  };

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-neutral-600">镜头拍摄信息</span>
        <button
          type="button"
          onClick={() => onOpenTeleprompter(node.id)}
          className="flex cursor-pointer items-center gap-1 rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          <Play className="h-3 w-3" />
          提词器
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={node.data.scene || ''}
          onChange={(event) => onUpdateNodes([node.id], { scene: event.target.value || undefined })}
          className="panel-input"
          placeholder="场次 / 分组"
        />
        <input
          value={typeof node.data.estimatedSeconds === 'number' ? node.data.estimatedSeconds : ''}
          onChange={(event) =>
            onUpdateNodes([node.id], {
              estimatedSeconds: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0),
            })
          }
          className="panel-input"
          type="number"
          min={0}
          placeholder={`估算 ${autoEstimate}s`}
          title="估算时长（秒），留空按 260 字/分钟自动估算"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700">
        <input
          type="checkbox"
          checked={node.data.shotDone === true}
          onChange={(event) => onUpdateNodes([node.id], { shotDone: event.target.checked })}
          className="h-3.5 w-3.5 cursor-pointer accent-emerald-600"
        />
        已拍
        <span className="ml-auto text-[10px] text-neutral-400">
          预计 {formatDuration(effectiveEstimate)}
        </span>
      </label>

      <div className="space-y-1">
        <span className="text-[10px] text-neutral-400">素材槽位（从制作面板拖入，或直接选择）</span>
        {slots.map((slot) => {
          const compatibleMaterials = materials.filter((material) => material.type === slot.slot);
          const def = SLOT_DEFINITIONS.find((item) => item.kind === slot.slot);
          return (
            <div
              key={slot.slot}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setDragOverSlot(slot.slot);
              }}
              onDragLeave={() => setDragOverSlot((current) => (current === slot.slot ? null : current))}
              onDrop={(event) => handleDrop(event, slot.slot)}
              className={`flex items-center gap-1.5 rounded-lg border border-dashed p-1 transition-colors ${
                dragOverSlot === slot.slot
                  ? 'border-neutral-800 bg-neutral-100'
                  : slot.materialId
                    ? 'border-neutral-300 bg-neutral-50'
                    : 'border-neutral-200 bg-white'
              }`}
            >
              <span className="w-14 shrink-0 text-[10px] font-medium text-neutral-500">
                {def?.label}
                {def?.required && <span className="text-red-500">*</span>}
              </span>
              <select
                value={slot.materialId || ''}
                onChange={(event) => bindMaterial(slot.slot, event.target.value)}
                className="min-w-0 flex-1 rounded border border-neutral-200 bg-white px-1 py-0.5 text-[10px] text-neutral-700 outline-none focus:border-neutral-400"
              >
                <option value="">未绑定</option>
                {compatibleMaterials.map((material) => (
                  <option key={material.id} value={material.id}>{material.name}</option>
                ))}
              </select>
              {slot.materialId && (
                <button
                  type="button"
                  onClick={() => bindMaterial(slot.slot, '')}
                  className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                  aria-label={`清除${def?.label}槽位`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {typeof node.data.actualSeconds === 'number' && (
        <p className="text-[10px] text-emerald-600">
          实拍 {formatDuration(node.data.actualSeconds)} · 偏差 {Math.round(node.data.actualSeconds - effectiveEstimate)}s
        </p>
      )}
    </section>
  );
}
