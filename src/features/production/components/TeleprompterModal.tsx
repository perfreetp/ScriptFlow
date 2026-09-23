import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Square, X } from 'lucide-react';
import { TELEPROMPTER_CHARS_PER_MINUTE } from '../constants';
import { countScriptChars, formatDuration } from '../utils/productionUtils';

export interface TeleprompterShot {
  nodeId: string;
  title: string;
  content: string;
  estimateSec: number;
}

interface TeleprompterModalProps {
  shots: TeleprompterShot[];
  startNodeId: string | null;
  onRecordActual: (nodeId: string, actualSec: number) => void;
  onClose: () => void;
}

interface ShotTiming {
  actualSec: number;
  estimateSec: number;
  title: string;
}

export default function TeleprompterModal({ shots, startNodeId, onRecordActual, onClose }: TeleprompterModalProps) {
  const startIndex = Math.max(0, shots.findIndex((shot) => shot.nodeId === startNodeId));
  const [currentIndex, setCurrentIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timings, setTimings] = useState<Map<string, ShotTiming>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);

  const shot = shots[currentIndex];
  const shotChars = useMemo(() => countScriptChars(shot?.content || ''), [shot]);
  const scrollDurationSec = Math.max(3, (shotChars / TELEPROMPTER_CHARS_PER_MINUTE) * 60);

  const commitTiming = useCallback((nodeId: string, seconds: number) => {
    if (seconds < 0.5) return;
    const rounded = Math.round(seconds);
    setTimings((current) => {
      const next = new Map(current);
      const existing = next.get(nodeId);
      next.set(nodeId, {
        actualSec: Math.max(existing?.actualSec || 0, rounded),
        estimateSec: shots.find((item) => item.nodeId === nodeId)?.estimateSec || 0,
        title: shots.find((item) => item.nodeId === nodeId)?.title || '',
      });
      return next;
    });
    onRecordActual(nodeId, rounded);
  }, [onRecordActual, shots]);

  const goToShot = useCallback((nextIndex: number) => {
    commitTiming(shot.nodeId, elapsedRef.current);
    if (nextIndex >= shots.length) {
      setIsPlaying(false);
      setIsFinished(true);
      return;
    }
    setCurrentIndex(Math.max(0, nextIndex));
    setElapsedSec(0);
    elapsedRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [commitTiming, shot, shots.length]);

  const finishRecording = useCallback(() => {
    commitTiming(shot.nodeId, elapsedRef.current);
    setIsPlaying(false);
    setIsFinished(true);
  }, [commitTiming, shot]);

  useEffect(() => {
    if (!isPlaying || isFinished) return;
    let rafId = 0;
    let lastTime = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.25, (now - lastTime) / 1000);
      lastTime = now;
      elapsedRef.current += dt;
      setElapsedSec(elapsedRef.current);
      const container = scrollRef.current;
      if (container) {
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll > 0) {
          container.scrollTop = Math.min(maxScroll, container.scrollTop + (maxScroll / scrollDurationSec) * dt);
          if (container.scrollTop >= maxScroll - 1) {
            goToShot(currentIndex + 1);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isFinished, currentIndex, scrollDurationSec, goToShot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (!isFinished) setIsPlaying((playing) => !playing);
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        if (!isFinished) goToShot(currentIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (!isFinished) goToShot(currentIndex - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        if (!isFinished) commitTiming(shot.nodeId, elapsedRef.current);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, goToShot, isFinished, onClose, commitTiming, shot]);

  if (!shot) return null;

  const deviationList = Array.from(timings.values());

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-neutral-950/97 text-white select-none">
      <header className="flex shrink-0 items-center justify-between px-5 py-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">
            镜头 {currentIndex + 1} / {shots.length}
          </span>
          <span className="max-w-[320px] truncate text-white/70">{shot.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-emerald-300">{formatDuration(elapsedSec)}</span>
          <span className="text-white/40">预估 {formatDuration(shot.estimateSec)}</span>
          <button
            onClick={() => {
              if (!isFinished) commitTiming(shot.nodeId, elapsedRef.current);
              onClose();
            }}
            className="cursor-pointer rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            data-tooltip="退出提词器 (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {isFinished ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-base font-bold">录制完成 · 偏差对比</h2>
            <p className="mt-1 text-[11px] text-white/50">实际耗时已回填到各镜头卡片，刷新页面后仍会保留。</p>
            {deviationList.length === 0 ? (
              <p className="mt-4 text-xs text-white/50">本次没有记录到有效耗时。</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                {deviationList.map((timing) => {
                  const diff = timing.actualSec - timing.estimateSec;
                  const percent = timing.estimateSec > 0 ? Math.round((diff / timing.estimateSec) * 100) : 0;
                  return (
                    <li key={timing.title} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate">{timing.title}</span>
                      <span className="shrink-0 font-mono text-white/70">
                        {formatDuration(timing.actualSec)} / {formatDuration(timing.estimateSec)}
                      </span>
                      <span className={`w-16 shrink-0 text-right font-mono font-semibold ${diff > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {diff > 0 ? '+' : ''}{formatDuration(Math.abs(diff))}{timing.estimateSec > 0 ? ` (${percent > 0 ? '+' : ''}${percent}%)` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              onClick={onClose}
              className="mt-5 w-full cursor-pointer rounded-lg bg-white py-2 text-xs font-bold text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              完成并返回画布
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-neutral-950 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-neutral-950 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-10 w-full -translate-y-1/2 border-y border-emerald-400/30 bg-emerald-400/5" />
            <div
              ref={scrollRef}
              className="h-full overflow-hidden px-[12vw] py-[38vh]"
            >
              <p className="whitespace-pre-wrap text-center text-3xl font-semibold leading-[2.2] tracking-wide text-white/90">
                {shot.content || '（本镜头暂无口播文案）'}
              </p>
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-center gap-4 px-5 py-4">
            <button
              onClick={() => goToShot(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> 上一镜
            </button>
            <button
              onClick={() => setIsPlaying((playing) => !playing)}
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white text-neutral-900 transition-transform hover:scale-105"
              data-tooltip="空格 暂停/继续"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
            <button
              onClick={() => goToShot(currentIndex + 1)}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/20"
            >
              下一镜 <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={finishRecording}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-red-500/90 px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-500"
            >
              <Square className="h-3.5 w-3.5" /> 结束录制
            </button>
            <span className="absolute right-5 hidden text-[10px] text-white/35 lg:block">
              空格 暂停/继续 · ←/→ 切换镜头 · 约 {TELEPROMPTER_CHARS_PER_MINUTE} 字/分钟
            </span>
          </footer>
        </>
      )}
    </div>
  );
}
