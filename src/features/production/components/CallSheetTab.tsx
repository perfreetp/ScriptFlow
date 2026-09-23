import { CheckCircle2, Circle, Printer } from 'lucide-react';
import type { CallSheetGroup } from '../utils/productionUtils';
import { formatDuration } from '../utils/productionUtils';

interface CallSheetTabProps {
  groups: CallSheetGroup[];
  onToggleShotDone: (nodeId: string, done: boolean) => void;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildPrintHtml(groups: CallSheetGroup[], generatedAt: Date): string {
  const totalShots = groups.reduce((sum, group) => sum + group.shots.length, 0);
  const doneShots = groups.reduce((sum, group) => sum + group.doneCount, 0);
  const totalSec = groups.reduce((sum, group) => sum + group.totalEstimateSec, 0);
  const percent = totalShots === 0 ? 0 : Math.round((doneShots / totalShots) * 100);

  const groupHtml = groups
    .map((group, groupIndex) => {
      const rows = group.shots
        .map((shot, shotIndex) => {
          const assetText = shot.slots
            .filter((slot) => slot.asset)
            .map((slot) => `${slot.label}·${slot.asset?.name}(${formatDuration(slot.asset?.durationSec || 0)})`)
            .join('、');
          const missingText = shot.missingRequired.length > 0 ? `缺：${shot.missingRequired.join('、')}` : '';
          return `<tr>
            <td class="check">${shot.done ? '☑' : '☐'}</td>
            <td>${groupIndex + 1}-${shotIndex + 1}</td>
            <td class="title">${escapeHtml(shot.title)}${missingText ? `<div class="missing">${escapeHtml(missingText)}</div>` : ''}</td>
            <td>${escapeHtml(assetText || '—')}</td>
            <td class="num">${formatDuration(shot.estimateSec)}</td>
            <td class="num">${shot.assetDurationSec > 0 ? formatDuration(shot.assetDurationSec) : '—'}</td>
          </tr>`;
        })
        .join('');
      return `<h2>第 ${groupIndex + 1} 组 · ${escapeHtml(group.name)}（${group.shots.length} 个镜头 / 合计 ${formatDuration(group.totalEstimateSec)}）</h2>
        <table>
          <thead><tr><th></th><th>镜号</th><th>镜头</th><th>所需素材</th><th>预估时长</th><th>素材时长</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>拍摄通告单</title>
<style>
  body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; }
  .meta { font-size: 12px; color: #555; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  td.num, th:last-child, th:nth-last-child(2) { text-align: right; white-space: nowrap; }
  td.check { text-align: center; font-size: 14px; }
  td.title { font-weight: 600; }
  .missing { color: #b45309; font-weight: 400; font-size: 11px; margin-top: 2px; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>拍摄通告单</h1>
  <div class="meta">生成时间：${generatedAt.toLocaleString('zh-CN')}</div>
  <div class="meta">共 ${totalShots} 个镜头 · 已拍 ${doneShots} · 完成率 ${percent}% · 预估总时长 ${formatDuration(totalSec)}</div>
  ${groupHtml}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

export default function CallSheetTab({ groups, onToggleShotDone }: CallSheetTabProps) {
  const totalShots = groups.reduce((sum, group) => sum + group.shots.length, 0);
  const doneShots = groups.reduce((sum, group) => sum + group.doneCount, 0);
  const totalSec = groups.reduce((sum, group) => sum + group.totalEstimateSec, 0);
  const percent = totalShots === 0 ? 0 : Math.round((doneShots / totalShots) * 100);

  const handleExport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(groups, new Date()));
    printWindow.document.close();
  };

  if (totalShots === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-neutral-400 select-none">
        <p className="text-[11px] font-semibold text-neutral-500">画布上还没有镜头卡片</p>
        <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
          在画布中创建文本卡片作为镜头，并可用标签（tags）为镜头分组，这里会自动按分组生成通告单。
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-neutral-100 bg-neutral-50/40 p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-neutral-700">
            拍摄进度 {doneShots}/{totalShots} · {percent}%
          </span>
          <span className="text-neutral-400">预估总时长 {formatDuration(totalSec)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <button
          onClick={handleExport}
          className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-neutral-900 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          <Printer className="h-3 w-3" />
          导出打印版通告单
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
        {groups.map((group) => (
          <section key={group.name} className="overflow-hidden rounded-lg border border-neutral-200">
            <header className="flex items-center justify-between bg-neutral-50 px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold text-neutral-800">{group.name}</span>
              <span className="text-[10px] text-neutral-400">
                {group.doneCount}/{group.shots.length} 已拍 · {formatDuration(group.totalEstimateSec)}
              </span>
            </header>
            <ul className="divide-y divide-neutral-100">
              {group.shots.map((shot) => (
                <li key={shot.nodeId} className="px-2.5 py-2">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onToggleShotDone(shot.nodeId, !shot.done)}
                      className={`mt-0.5 shrink-0 cursor-pointer transition-colors ${shot.done ? 'text-emerald-500' : 'text-neutral-300 hover:text-neutral-500'}`}
                      data-tooltip={shot.done ? '标记为未拍' : '标记为已拍'}
                    >
                      {shot.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[11px] font-semibold ${shot.done ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                          {shot.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-neutral-400">{formatDuration(shot.estimateSec)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
                        {shot.slots.map((slot) => (
                          <span
                            key={slot.slot}
                            className={`rounded-full px-1.5 py-0.5 leading-none ${
                              slot.asset
                                ? 'bg-neutral-100 text-neutral-600'
                                : slot.required
                                  ? 'bg-amber-100 font-semibold text-amber-700'
                                  : 'bg-neutral-50 text-neutral-300'
                            }`}
                          >
                            {slot.label}{slot.asset ? `·${slot.asset.name}` : slot.required ? '·缺' : ''}
                          </span>
                        ))}
                        {shot.assetDurationSec > 0 && (
                          <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 leading-none text-neutral-500">
                            素材合计 {formatDuration(shot.assetDurationSec)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
