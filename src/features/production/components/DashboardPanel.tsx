import { AlertTriangle } from 'lucide-react';
import { TALKING_HEAD_LIMIT_SECONDS } from '../constants';
import type { DashboardStats } from '../types';
import { formatDuration } from '../utils/productionUtils';

interface DashboardPanelProps {
  stats: DashboardStats;
}

interface DurationBucket {
  label: string;
  count: number;
}

function buildDurationBuckets(secondsList: number[]): DurationBucket[] {
  const buckets: DurationBucket[] = [
    { label: '0–15s', count: 0 },
    { label: '15–30s', count: 0 },
    { label: '30–60s', count: 0 },
    { label: '1–2min', count: 0 },
    { label: '2min+', count: 0 },
  ];
  secondsList.forEach((seconds) => {
    if (seconds < 15) buckets[0].count += 1;
    else if (seconds < 30) buckets[1].count += 1;
    else if (seconds < 60) buckets[2].count += 1;
    else if (seconds < 120) buckets[3].count += 1;
    else buckets[4].count += 1;
  });
  return buckets;
}

function DurationHistogram({ stats }: { stats: DashboardStats }) {
  const buckets = buildDurationBuckets(stats.durationBars.map((bar) => bar.seconds));
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const chartHeight = 120;
  const barGap = 10;
  const chartWidth = 252;
  const barWidth = (chartWidth - barGap * (buckets.length - 1)) / buckets.length;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-2.5">
      <h4 className="mb-2 text-[11px] font-semibold text-neutral-700">镜头时长分布</h4>
      <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight + 22}`} role="img" aria-label="镜头时长分布柱状图">
        {buckets.map((bucket, index) => {
          const barHeight = (bucket.count / maxCount) * chartHeight;
          const x = index * (barWidth + barGap);
          const y = chartHeight - barHeight;
          return (
            <g key={bucket.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(0, barHeight)}
                rx={3}
                fill="#737373"
              />
              <text x={x + barWidth / 2} y={chartHeight - barHeight - 3} textAnchor="middle" fontSize="10" fill="#404040">
                {bucket.count > 0 ? bucket.count : ''}
              </text>
              <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="9" fill="#737373">
                {bucket.label}
              </text>
            </g>
          );
        })}
        <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e5e5e5" strokeWidth={1} />
      </svg>
    </section>
  );
}

function CoverageDonut({ stats }: { stats: DashboardStats }) {
  const size = 96;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const coveredLength = circumference * stats.brollCoverage;

  return (
    <section className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="B-roll 覆盖率">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${coveredLength} ${circumference - coveredLength}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill="#171717">
          {Math.round(stats.brollCoverage * 100)}%
        </text>
      </svg>
      <div>
        <h4 className="text-[11px] font-semibold text-neutral-700">B-roll 覆盖率</h4>
        <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">
          {stats.brollCoveredCount} / {stats.shotCount} 个镜头绑定了 B-roll
        </p>
      </div>
    </section>
  );
}

function TalkingHeadAlerts({ stats }: { stats: DashboardStats }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-2.5">
      <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-neutral-700">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        纯口播连续超时告警
      </h4>
      <p className="mb-1.5 text-[10px] text-neutral-400">
        连续无 B-roll / 图版的口播镜头累计超过 {TALKING_HEAD_LIMIT_SECONDS}s 即告警
      </p>
      {stats.talkingHeadRuns.length === 0 ? (
        <p className="rounded-md bg-neutral-50 px-2 py-1.5 text-[10px] text-neutral-400">暂无超时段落</p>
      ) : (
        <ul className="space-y-1">
          {stats.talkingHeadRuns.map((run, index) => (
            <li key={index} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
              <span className="font-semibold">
                {run.shotTitles[0]} → {run.shotTitles[run.shotTitles.length - 1]}
              </span>
              <span className="ml-1 text-amber-600">
                连续 {run.shotTitles.length} 镜 · {formatDuration(run.totalSeconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DashboardPanel({ stats }: DashboardPanelProps) {
  if (stats.shotCount === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-xs text-neutral-400">
        画布上还没有镜头节点，暂无可分析数据
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
      <DurationHistogram stats={stats} />
      <CoverageDonut stats={stats} />
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-2.5 text-center">
          <p className="text-base font-bold text-neutral-800">{formatDuration(stats.totalEstimatedSeconds)}</p>
          <p className="mt-0.5 text-[10px] text-neutral-400">估算总时长</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-2.5 text-center">
          <p className="text-base font-bold text-neutral-800">{formatDuration(stats.totalActualSeconds)}</p>
          <p className="mt-0.5 text-[10px] text-neutral-400">实拍总时长</p>
        </div>
      </section>
      <TalkingHeadAlerts stats={stats} />
    </div>
  );
}
