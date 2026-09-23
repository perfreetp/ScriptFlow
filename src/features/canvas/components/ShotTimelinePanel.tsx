import { useMemo, useState } from 'react';
import { AlertTriangle, Clapperboard, GripVertical, RotateCcw, X } from 'lucide-react';
import type { Edge } from '@xyflow/react';
import type { WorkspaceNode } from '../../../types';
import {
  WORDS_PER_MINUTE,
  buildShotItems,
  computeTopologicalShotOrder,
  formatDuration,
} from '../utils/shotSequence';

interface ShotTimelinePanelProps {
  open: boolean;
  nodes: WorkspaceNode[];
  edges: Edge[];
  shotOrder: string[];
  thresholdSeconds: number;
  onShotOrderChange: (order: string[]) => void;
  onThresholdChange: (seconds: number) => void;
  onClose: () => void;
}

export default function ShotTimelinePanel({
  open,
  nodes,
  edges,
  shotOrder,
  thresholdSeconds,
  onShotOrderChange,
  onThresholdChange,
  onClose,
}: ShotTimelinePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const items = useMemo(
    () => buildShotItems(nodes, edges, shotOrder),
    [nodes, edges, shotOrder],
  );
  const totalSeconds = useMemo(
    () => items.reduce((sum, item) => sum + item.durationSeconds, 0),
    [items],
  );
  const isOverThreshold = totalSeconds > thresholdSeconds && items.length > 0;

  if (!open) return null;

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const nextOrder = items.map((item) => item.nodeId);
    const [moved] = nextOrder.splice(dragIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);
    onShotOrderChange(nextOrder);
    setDragIndex(null);
    setDropIndex(null);
  };

  const resetToTopological = () => {
    onShotOrderChange(computeTopologicalShotOrder(nodes, edges));
  };

  return (
    <aside
      className={`absolute right-4 top-20 z-30 flex max-h-[calc(100%-120px)] w-[320px] flex-col overflow-hidden rounded-2xl border bg-white/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 ${
        isOverThreshold ? 'border-red-300 shadow-red-900/10' : 'border-neutral-200 shadow-neutral-900/15'
      }`}
    >
      <div className={`flex items-center justify-between border-b px-4 py-3 ${
        isOverThreshold ? 'border-red-100 bg-red-50/70' : 'border-neutral-100'
      }`}>
        <div className="flex items-center gap-2">
          <Clapperboard className={`h-4 w-4 ${isOverThreshold ? 'text-red-500' : 'text-neutral-700'}`} />
          <h3 className={`text-sm font-bold ${isOverThreshold ? 'text-red-600' : 'text-neutral-800'}`}>分镜时间轴</h3>
          <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
            {items.length} 镜头
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetToTopological}
            className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            data-tooltip="按连线拓扑重新排序"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            data-tooltip="关闭面板"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`px-4 py-2.5 text-[11px] leading-relaxed ${
        isOverThreshold ? 'bg-red-50/50 text-red-600' : 'text-neutral-500'
      }`}>
        <div className="flex items-center justify-between">
          <span>总时长（按 {WORDS_PER_MINUTE} 字/分钟）</span>
          <span className={`font-mono text-sm font-bold ${isOverThreshold ? 'text-red-600' : 'text-neutral-800'}`}>
            {formatDuration(totalSeconds)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span>时长阈值（分钟）</span>
          <input
            type="number"
            min={1}
            step={1}
            value={Math.round(thresholdSeconds / 60)}
            onChange={(event) => {
              const minutes = Number(event.target.value);
              if (!Number.isFinite(minutes) || minutes <= 0) return;
              onThresholdChange(Math.round(minutes * 60));
            }}
            className="w-16 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-right font-mono text-[11px] text-neutral-700 focus:outline-none focus:border-neutral-400"
          />
        </div>
        {isOverThreshold && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>总时长超出阈值 {formatDuration(totalSeconds - thresholdSeconds)}，请精简口播或调整镜头。</span>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-neutral-400">
            画布中还没有镜头节点，添加文本卡片后会自动生成序列。
          </p>
        )}
        {items.map((item, index) => (
          <div
            key={item.nodeId}
            draggable
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDropIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(index);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDropIndex(null);
            }}
            className={`mb-1.5 flex cursor-grab items-start gap-2 rounded-lg border px-2 py-2 transition-colors active:cursor-grabbing ${
              isOverThreshold
                ? 'border-red-200 bg-red-50/40 hover:border-red-300'
                : 'border-neutral-150 bg-white hover:border-neutral-300'
            } ${dragIndex === index ? 'opacity-40' : ''} ${
              dropIndex === index && dragIndex !== null && dragIndex !== index
                ? 'border-neutral-500 ring-1 ring-neutral-400'
                : ''
            }`}
          >
            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" />
            <span className={`mt-0.5 w-5 shrink-0 text-center font-mono text-[10px] font-bold ${
              isOverThreshold ? 'text-red-400' : 'text-neutral-400'
            }`}>
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-neutral-800">{item.title}</span>
                <span className={`shrink-0 font-mono text-[10px] font-bold ${
                  isOverThreshold ? 'text-red-500' : 'text-neutral-500'
                }`}>
                  {formatDuration(item.durationSeconds)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                <span className="truncate">{item.groupName ? `分组：${item.groupName}` : '未分组'}</span>
                <span className="shrink-0">{item.charCount} 字</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
