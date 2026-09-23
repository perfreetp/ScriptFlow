import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import type { Edge } from '@xyflow/react';
import { AlertTriangle, Clapperboard, GripVertical, RotateCcw, X } from 'lucide-react';
import type { SceneGroup, WorkspaceNode } from '../../../types';
import {
  DEFAULT_SHOT_DURATION_THRESHOLD,
  NARRATION_CHARS_PER_MINUTE,
  computeShotSequence,
  computeTopologicalOrder,
  formatDurationSec,
} from '../utils/storyboardUtils';

interface StoryboardPanelProps {
  nodes: WorkspaceNode[];
  edges: Edge[];
  groups: SceneGroup[];
  shotOrder: string[];
  onShotOrderChange: (order: string[]) => void;
  durationThreshold: number;
  onDurationThresholdChange: (seconds: number) => void;
  onClose: () => void;
}

export default function StoryboardPanel({
  nodes,
  edges,
  groups,
  shotOrder,
  onShotOrderChange,
  durationThreshold,
  onDurationThresholdChange,
  onClose,
}: StoryboardPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const shots = useMemo(
    () => computeShotSequence(nodes, edges, groups, shotOrder),
    [nodes, edges, groups, shotOrder],
  );
  const totalDurationSec = useMemo(
    () => shots.reduce((sum, shot) => sum + shot.durationSec, 0),
    [shots],
  );
  const isOverThreshold = totalDurationSec > durationThreshold && shots.length > 0;

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const nextOrder = shots.map((shot) => shot.nodeId);
    const [moved] = nextOrder.splice(dragIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);
    onShotOrderChange(nextOrder);
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  };

  const resetToTopological = () => {
    onShotOrderChange(computeTopologicalOrder(nodes, edges));
  };

  return (
    <aside className="pointer-events-auto absolute right-4 top-20 z-40 flex max-h-[calc(100vh-7rem)] w-[21rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-neutral-200/80 bg-white/95 p-2.5 text-left shadow-xl shadow-neutral-900/10 backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-150">
      <header className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Clapperboard className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-neutral-950">分镜时间轴</h3>
            <p className="mt-0.5 truncate text-xs text-neutral-400">
              {shots.length} 个镜头 · 按 {NARRATION_CHARS_PER_MINUTE} 字/分钟估算
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetToTopological}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            data-tooltip="按连线拓扑重新排序"
            data-tooltip-placement="bottom"
            aria-label="按连线拓扑重新排序"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            data-tooltip="关闭分镜时间轴"
            data-tooltip-placement="bottom"
            aria-label="关闭分镜时间轴"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        className={`mt-2.5 rounded-lg border px-3 py-2 text-xs ${
          isOverThreshold
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-neutral-200 bg-neutral-50 text-neutral-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            {isOverThreshold && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
            总时长 {formatDurationSec(totalDurationSec)}
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            阈值
            <input
              type="number"
              min={1}
              value={durationThreshold}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next) && next > 0) {
                  onDurationThresholdChange(Math.round(next));
                }
              }}
              className="w-16 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-right text-[11px] text-neutral-700 focus:border-neutral-400 focus:outline-none"
              aria-label="总时长阈值（秒）"
            />
            秒
          </span>
        </div>
        {isOverThreshold && (
          <p className="mt-1 text-[11px] font-medium text-red-600">
            超出阈值 {formatDurationSec(totalDurationSec - durationThreshold)}，请精简口播或调整镜头。
          </p>
        )}
      </div>

      <div className="mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {shots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
            画布上还没有节点，添加节点后自动生成镜头序列。
          </p>
        ) : (
          shots.map((shot, index) => (
            <div
              key={shot.nodeId}
              draggable
              onDragStart={(event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', shot.nodeId);
              }}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              className={`flex cursor-grab items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors active:cursor-grabbing ${
                isOverThreshold
                  ? 'border-red-200 bg-red-50/60'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              } ${dragIndex === index ? 'opacity-40' : ''} ${
                dropIndex === index && dragIndex !== null && dragIndex !== index
                  ? 'border-neutral-500 ring-1 ring-neutral-400'
                  : ''
              }`}
            >
              <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" />
              <span className="mt-0.5 w-5 shrink-0 text-center text-[11px] font-bold text-neutral-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-neutral-800">{shot.title}</span>
                  {shot.groupName && (
                    <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-px text-[10px] text-neutral-500">
                      {shot.groupName}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 break-all text-[11px] leading-relaxed text-neutral-500">
                  {shot.content || '（无口播内容）'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-[11px] font-bold ${isOverThreshold ? 'text-red-600' : 'text-neutral-700'}`}>
                  {formatDurationSec(shot.durationSec)}
                </div>
                <div className="text-[10px] text-neutral-400">{shot.charCount} 字</div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
