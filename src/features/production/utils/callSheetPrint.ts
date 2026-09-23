import { SLOT_LABELS } from '../constants';
import type { CallSheetScene } from '../types';
import { formatDuration } from './productionUtils';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openCallSheetPrintView(scenes: CallSheetScene[]): void {
  const totalShots = scenes.reduce((sum, scene) => sum + scene.shots.length, 0);
  const doneShots = scenes.reduce((sum, scene) => sum + scene.doneCount, 0);
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.totalEstimatedSeconds, 0);
  const dateLabel = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sceneBlocks = scenes
    .map((scene, sceneIndex) => {
      const rows = scene.shots
        .map((shot, shotIndex) => {
          const materialText = shot.materials.length > 0
            ? shot.materials
                .map((entry) => `${SLOT_LABELS[entry.slot]}：${entry.material ? entry.material.name : '已失效'}`)
                .join('<br/>')
            : '<span class="muted">无</span>';
          const missing = shot.missingRequiredSlots.length > 0
            ? `<div class="warn">缺：${shot.missingRequiredSlots.map((slot) => SLOT_LABELS[slot]).join('、')}</div>`
            : '';
          return `<tr>
            <td class="center">${shotIndex + 1}</td>
            <td>${escapeHtml(shot.title)}${missing}</td>
            <td>${materialText}</td>
            <td class="center">${formatDuration(shot.estimatedSeconds)}</td>
            <td class="center checkbox">${shot.done ? '☑' : '☐'}</td>
          </tr>`;
        })
        .join('');
      return `<section>
        <h2>第 ${sceneIndex + 1} 场 · ${escapeHtml(scene.scene)}
          <span class="scene-meta">${scene.shots.length} 个镜头 / 合计 ${formatDuration(scene.totalEstimatedSeconds)}</span>
        </h2>
        <table>
          <thead>
            <tr><th class="center">#</th><th>镜头</th><th>所需素材</th><th class="center">时长</th><th class="center">已拍</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>拍摄通告单 - ${dateLabel}</title>
<style>
  body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; color: #171717; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #171717; padding-bottom: 4px; }
  .scene-meta { float: right; font-size: 12px; font-weight: normal; color: #525252; }
  .summary { font-size: 13px; color: #404040; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #a3a3a3; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; }
  .center { text-align: center; }
  .checkbox { font-size: 15px; }
  .muted { color: #a3a3a3; }
  .warn { color: #b45309; font-size: 11px; margin-top: 2px; }
  @media print { body { margin: 12mm; } section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <h1>拍摄通告单</h1>
  <p class="summary">${dateLabel} · 共 ${scenes.length} 场 / ${totalShots} 个镜头 · 预计总时长 ${formatDuration(totalSeconds)} · 已完成 ${doneShots}/${totalShots}</p>
  ${sceneBlocks}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
