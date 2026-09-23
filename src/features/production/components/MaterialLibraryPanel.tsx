import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ShotSlotKind } from '../../../types';
import { MATERIAL_DRAG_MIME, SLOT_DEFINITIONS, SLOT_LABELS } from '../constants';
import type { MaterialUsage, ProductionMaterial, ProductionWarning } from '../types';
import { formatDuration } from '../utils/productionUtils';

interface MaterialLibraryPanelProps {
  materials: ProductionMaterial[];
  usage: Map<string, MaterialUsage>;
  warnings: ProductionWarning[];
  onAddMaterial: (input: { name: string; type: ShotSlotKind; durationSeconds: number; tags: string[] }) => void;
  onUpdateMaterial: (materialId: string, patch: Partial<ProductionMaterial>) => void;
  onDeleteMaterial: (materialId: string) => void;
}

export default function MaterialLibraryPanel({
  materials,
  usage,
  warnings,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}: MaterialLibraryPanelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ShotSlotKind>('broll');
  const [duration, setDuration] = useState('10');
  const [tags, setTags] = useState('');

  const overReferencedWarnings = warnings.filter((warning) => warning.kind === 'over-referenced');
  const missingSlotWarnings = warnings.filter((warning) => warning.kind === 'missing-slot');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAddMaterial({
      name,
      type,
      durationSeconds: Number(duration) || 0,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
    setName('');
    setTags('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50/60 p-2">
        <span className="text-[11px] font-semibold text-neutral-600">登记新素材</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="panel-input"
          placeholder="素材名称，如：开场航拍"
        />
        <div className="flex gap-1.5">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ShotSlotKind)}
            className="panel-input flex-1"
          >
            {SLOT_DEFINITIONS.map((def) => (
              <option key={def.kind} value={def.kind}>{def.label}</option>
            ))}
          </select>
          <input
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="panel-input w-20"
            type="number"
            min={0}
            placeholder="时长(秒)"
            title="素材时长（秒）"
          />
        </div>
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="panel-input"
          placeholder="标签，用英文逗号分隔"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-lg bg-neutral-900 text-xs font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <Plus className="h-3.5 w-3.5" />
          登记素材
        </button>
      </section>

      {warnings.length > 0 && (
        <section className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            告警与缺口清单（{warnings.length}）
          </span>
          <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] leading-snug text-amber-800">
            {overReferencedWarnings.map((warning) => (
              <li key={warning.id}>• {warning.message}</li>
            ))}
            {missingSlotWarnings.map((warning) => (
              <li key={warning.id}>• {warning.message}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {materials.length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-200 p-3 text-center text-[11px] text-neutral-400">
            素材库为空，先登记可复用素材
          </p>
        )}
        {materials.map((material) => {
          const entry = usage.get(material.id);
          const refCount = entry?.refCount || 0;
          const isOver = refCount > 0 && refCount > material.maxRefs;
          return (
            <div
              key={material.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  MATERIAL_DRAG_MIME,
                  JSON.stringify({ id: material.id, type: material.type }),
                );
                event.dataTransfer.effectAllowed = 'copy';
              }}
              className={`cursor-grab rounded-lg border p-2 text-left shadow-xs transition-colors active:cursor-grabbing ${
                isOver ? 'border-red-200 bg-red-50/60' : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
              title="拖拽到右侧节点槽位进行绑定"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-semibold text-neutral-800">{material.name}</span>
                <button
                  type="button"
                  onClick={() => onDeleteMaterial(material.id)}
                  className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  data-tooltip="删除素材"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-neutral-500">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-600">
                  {SLOT_LABELS[material.type]}
                </span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">{formatDuration(material.durationSeconds)}</span>
                {material.tags.map((tag) => (
                  <span key={tag} className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500">#{tag}</span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <span className={refCount > 0 ? 'font-semibold text-neutral-700' : 'text-neutral-400'}>
                  {refCount > 0 ? `已占用 · 被 ${refCount} 个镜头引用` : '未占用'}
                </span>
                <label className="flex items-center gap-1 text-neutral-400">
                  上限
                  <input
                    type="number"
                    min={1}
                    value={material.maxRefs}
                    onChange={(event) =>
                      onUpdateMaterial(material.id, { maxRefs: Math.max(1, Number(event.target.value) || 1) })
                    }
                    className="w-12 rounded border border-neutral-200 bg-white px-1 py-0.5 text-center text-[10px] text-neutral-700 outline-none focus:border-neutral-400"
                  />
                </label>
              </div>
              {isOver && (
                <p className="mt-1 text-[10px] font-medium text-red-500">
                  超额引用：{refCount}/{material.maxRefs}
                </p>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
