import { AlertTriangle, Film, Gauge, ListChecks } from 'lucide-react';
import type { ProductionAlerts, ProductionAnalytics } from '../utils/productionUtils';
import { formatDuration } from '../utils/productionUtils';
import { TALKING_HEAD_LIMIT_SEC } from '../constants';

interface AnalyticsTabProps {
  analytics: ProductionAnalytics;
  alerts: ProductionAlerts;
}

export default function AnalyticsTab({ analytics, alerts }: AnalyticsTabProps) {
  const { durations, brollCovered, totalShots, talkingHeadRuns } = analytics;
  const coverage = totalShots === 0 ? 0 : brollCovered / totalShots;
  const maxSec = Math.max(1, ...durations.map((item) => item.sec));
  const avgSec = totalShots === 0 ? 0 : durations.reduce((sum, item) => sum + item.sec, 0) / totalShots;
  const alertCount = alerts.overused.length + alerts.missingSlots.length + talkingHeadRuns.length;

  if (totalShots === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-neutral-400 select-none">
        <p className="text-[11px] font-semibold text-neutral-500">暂无可分析的镜头</p>
        <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">在画布中创建文本卡片作为镜头后，这里会展示时长分布与覆盖率。</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 scrollbar-thin">
      <section className="rounded-lg border border-neutral-200 p-3">
        <header className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-800">
          <Gauge className="h-3.5 w-3.5 text-neutral-500" />
          镜头时长分布
          <span className="ml-auto text-[10px] font-normal text-neutral-400">均值 {formatDuration(avgSec)}</span>
        </header>
        <svg viewBox="0 0 280 96" className="h-24 w-full" role="img" aria-label="镜头时长分布柱状图">
          {durations.map((item, index) => {
            const barWidth = 280 / durations.length;
            const height = Math.max(2, (item.sec / maxSec) * 72);
            const x = index * barWidth + barWidth * 0.18;
            return (
              <g key={item.nodeId}>
                <rect
                  x={x}
                  y={84 - height}
                  width={Math.max(2, barWidth * 0.64)}
                  height={height}
                  rx={1.5}
                  className={item.hasBroll ? 'fill-neutral-700' : 'fill-neutral-300'}
                >
                  <title>{`${item.title} · ${formatDuration(item.sec)}${item.hasBroll ? ' · 含B-roll' : ' · 纯口播'}`}</title>
                </rect>
              </g>
            );
          })}
          <line
            x1={0}
            x2={280}
            y1={84 - (avgSec / maxSec) * 72}
            y2={84 - (avgSec / maxSec) * 72}
            className="stroke-amber-500"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <line x1={0} x2={280} y1={84.5} y2={84.5} className="stroke-neutral-200" strokeWidth={1} />
        </svg>
        <div className="mt-1 flex items-center gap-3 text-[9px] text-neutral-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-xs bg-neutral-700" />含 B-roll</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-xs bg-neutral-300" />纯口播</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-amber-500" />平均时长</span>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 p-3">
        <header className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-800">
          <Film className="h-3.5 w-3.5 text-neutral-500" />
          B-roll 覆盖率
          <span className="ml-auto text-[10px] font-normal text-neutral-400">{brollCovered}/{totalShots} 个镜头</span>
        </header>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" role="img" aria-label="B-roll 覆盖率环形图">
            <circle cx={32} cy={32} r={26} fill="none" className="stroke-neutral-100" strokeWidth={9} />
            <circle
              cx={32}
              cy={32}
              r={26}
              fill="none"
              className="stroke-emerald-500"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${coverage * 163.36} 163.36`}
              transform="rotate(-90 32 32)"
            />
            <text x={32} y={36} textAnchor="middle" className="fill-neutral-800 text-[14px] font-bold">
              {Math.round(coverage * 100)}%
            </text>
          </svg>
          <p className="text-[10px] leading-relaxed text-neutral-500">
            {coverage >= 0.7
              ? 'B-roll 覆盖充足，画面节奏有保障。'
              : coverage >= 0.4
                ? 'B-roll 覆盖一般，建议为纯口播镜头补充画面素材。'
                : 'B-roll 覆盖偏低，成片可能长时间停留在口播画面。'}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 p-3">
        <header className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-800">
          <AlertTriangle className="h-3.5 w-3.5 text-neutral-500" />
          告警与缺口
          {alertCount > 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-red-600">
              {alertCount}
            </span>
          )}
        </header>
        {alertCount === 0 ? (
          <p className="text-[10px] text-neutral-400">暂无告警：素材引用、关键槽位与口播时长均在安全范围内。</p>
        ) : (
          <ul className="space-y-2 text-[10px] leading-relaxed">
            {talkingHeadRuns.map((run, index) => (
              <li key={`talk-${index}`} className="rounded-md bg-amber-50 px-2 py-1.5 text-amber-700">
                纯口播连续超时：从「{run.startTitle}」起连续 {run.shotCount} 个镜头无 B-roll，累计 {formatDuration(run.totalSec)}（阈值 {formatDuration(TALKING_HEAD_LIMIT_SEC)}）。
              </li>
            ))}
            {alerts.overused.map(({ asset, count }) => (
              <li key={asset.id} className="rounded-md bg-red-50 px-2 py-1.5 text-red-600">
                素材超额引用：「{asset.name}」被 {count} 个镜头引用，超过可用次数 {asset.maxUsage}。
              </li>
            ))}
            {alerts.missingSlots.map((entry) => (
              <li key={entry.nodeId} className="rounded-md bg-amber-50 px-2 py-1.5 text-amber-700">
                缺口清单：「{entry.title}」缺少关键槽位 {entry.missing.join('、')}。
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 p-3">
        <header className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-800">
          <ListChecks className="h-3.5 w-3.5 text-neutral-500" />
          逐镜时长明细
        </header>
        <ul className="space-y-1">
          {durations.map((item, index) => (
            <li key={item.nodeId} className="flex items-center gap-2 text-[10px]">
              <span className="w-5 shrink-0 text-right text-neutral-300">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-neutral-600">{item.title}</span>
              <span className="h-1 rounded-full bg-neutral-200" style={{ width: `${Math.max(6, (item.sec / maxSec) * 72)}px` }} />
              <span className="shrink-0 text-neutral-400">{formatDuration(item.sec)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
