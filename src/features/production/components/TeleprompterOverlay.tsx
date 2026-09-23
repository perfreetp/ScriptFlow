import { ChevronLeft, ChevronRight, Pause, Play, Square, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkspaceNode } from '../../../types';
import { formatDeviation, formatDuration, getShotEstimatedSeconds, getShotTitle } from '../utils/productionUtils';

export interface TeleprompterRecording {
  nodeId: string;
  actualSeconds: number;
}

interface TeleprompterOverlayProps {
  shots: WorkspaceNode[];
  startNodeId: string;
  onFinish: (recordings: TeleprompterRecording[]) => void;
  onClose: () => void;
}

export default function TeleprompterOverlay({
  shots,
  startNodeId,
  onFinish,
  onClose,
}: TeleprompterOverlayProps) {
  const startIndex = Math.max(0, shots.findIndex((shot) => shot.id === startNodeId));
  const [currentIndex, setCurrentIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Map<string, number>>(() => new Map());

  const scrollRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const recordingsRef = useRef(recordings);
  recordingsRef.current = recordings;

  const currentShot = shots[currentIndex];
  const estimatedSeconds = currentShot ? getShotEstimatedSeconds(currentShot) : 0;
  const scrollDuration = Math.max(1, estimatedSeconds);

  const commitCurrentElapsed = useCallback(() => {
    if (!currentShot || elapsedRef.current <= 0) return;
    setRecordings((current) => {
      const next = new Map(current);
      next.set(currentShot.id, Math.round((next.get(currentShot.id) || 0) + elapsedRef.current));
      return next;
    });
    elapsedRef.current = 0;
    setElapsed(0);
  }, [currentShot]);

  const goToShot = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= shots.length) return;
    commitCurrentElapsed();
    setCurrentIndex(nextIndex);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [commitCurrentElapsed, shots.length]);

  const handleFinish = useCallback(() => {
    const finalRecordings: TeleprompterRecording[] = [];
    const pendingShotId = currentShot?.id;
    const pendingElapsed = elapsedRef.current;
    recordingsRef.current.forEach((seconds, nodeId) => {
      finalRecordings.push({ nodeId, actualSeconds: seconds });
    });
    if (pendingShotId && pendingElapsed > 0) {
      const existing = finalRecordings.find((item) => item.nodeId === pendingShotId);
      if (existing) existing.actualSeconds += Math.round(pendingElapsed);
      else finalRecordings.push({ nodeId: pendingShotId, actualSeconds: Math.round(pendingElapsed) });
    }
    onFinish(finalRecordings);
  }, [currentShot, onFinish]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - lastTime) / 1000);
      lastTime = now;
      elapsedRef.current += dt;
      setElapsed(elapsedRef.current);

      const container = scrollRef.current;
      if (container) {
        const scrollable = container.scrollHeight - container.clientHeight;
        if (scrollable > 0) {
          const pxPerSecond = scrollable / scrollDuration;
          container.scrollTop = Math.min(scrollable, container.scrollTop + pxPerSecond * dt);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, scrollDuration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        goToShot(currentIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        goToShot(currentIndex - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, goToShot, handleFinish]);

  const recordedList = useMemo(() => {
    return shots
      .filter((shot) => recordings.has(shot.id))
      .map((shot, index) => ({
        shot,
        title: getShotTitle(shot, index),
        actual: recordings.get(shot.id) || 0,
        estimated: getShotEstimatedSeconds(shot),
      }));
  }, [shots, recordings]);

  if (!currentShot) return null;

  const deviation = Math.round(elapsed - estimatedSeconds);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-neutral-950/95 text-neutral-100">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
            镜头 {currentIndex + 1} / {shots.length}
          </span>
          <span className="text-sm font-semibold">{currentShot.data.title || '未命名镜头'}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span>空格 暂停/继续</span>
          <span>←→ 切换镜头</span>
          <span>Esc 完成</span>
          <button
            type="button"
            onClick={handleFinish}
            className="ml-2 cursor-pointer rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="退出提词器"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-[38vh]">
          <p className="whitespace-pre-wrap text-center text-3xl font-medium leading-[1.9] tracking-wide">
            {currentShot.data.content || '（本镜头暂无口播内容）'}
          </p>
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/10 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToShot(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="cursor-pointer rounded-md p-2 text-neutral-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="上一镜"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((playing) => !playing)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-neutral-900 transition-transform hover:scale-105"
              aria-label={isPlaying ? '暂停' : '开始'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => goToShot(currentIndex + 1)}
              disabled={currentIndex >= shots.length - 1}
              className="cursor-pointer rounded-md p-2 text-neutral-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="下一镜"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-5 text-sm">
            <div className="text-center">
              <p className="font-mono text-lg font-semibold">{formatDuration(elapsed)}</p>
              <p className="text-[10px] text-neutral-400">本镜用时</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-lg font-semibold text-neutral-300">{formatDuration(estimatedSeconds)}</p>
              <p className="text-[10px] text-neutral-400">估算时长</p>
            </div>
            <div className="text-center">
              <p className={`font-mono text-lg font-semibold ${deviation > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatDeviation(elapsed, estimatedSeconds)}
              </p>
              <p className="text-[10px] text-neutral-400">偏差</p>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              <Square className="h-3.5 w-3.5" />
              完成录制并回填
            </button>
          </div>
        </div>

        {recordedList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
            {recordedList.map((item) => (
              <span
                key={item.shot.id}
                className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-neutral-300"
              >
                {item.title}：实拍 {formatDuration(item.actual)} / 估算 {formatDuration(item.estimated)}（
                {formatDeviation(item.actual, item.estimated)}）
              </span>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
