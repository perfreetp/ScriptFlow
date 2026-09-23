import { AlertTriangle, CheckCircle2, Printer } from 'lucide-react';
import { SLOT_LABELS } from '../constants';
import type { CallSheetScene } from '../types';
import { formatDuration } from '../utils/productionUtils';
import { openCallSheetPrintView } from '../utils/callSheetPrint';

interface CallSheetPanelProps {
  scenes: CallSheetScene[];
  onToggleShotDone: (nodeId: string, done: boolean) => void;
}

export default function CallSheetPanel({ scenes, onToggleShotDone }: CallSheetPanelProps) {
  const totalShots = scenes.reduce((sum, scene) => sum + scene.shots.length, 0);
  const doneShots = scenes.reduce((sum, scene) => sum + scene.doneCount, 0);
  const totalSeconds = scenes.reduce((sum, scene) => sum + scene.totalEstimatedSeconds, 0);
  const completionRate = totalShots === 0 ? 0 : Math.round((doneShots / totalShots) * 100);

  if (totalShots === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-xs text-neutral-400">画布上还没有镜头节点</p>
        <p className="text-[11px] text-neutral-400">先在节点属性中填写场次（分组），再生成通告单</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <section className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-600">
          <span>{scenes.length} 场 · {totalShots} 镜 · 合计 {formatDuration(totalSeconds)}</span>
          <span className="font-semibold text-neutral-800">完成率 {completionRate}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => openCallSheetPrintView(scenes)}
          className="mt-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-xs font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          <Printer className="h-3.5 w-3.5" />
          导出打印通告单
        </button>
      </section>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
        {scenes.map((scene, sceneIndex) => (
          <section key={scene.scene} className="rounded-lg border border-neutral-200 bg-white">
            <header className="flex items-center justify-between border-b border-neutral-100 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-neutral-800">
                第 {sceneIndex + 1} 场 · {scene.scene}
              </span>
              <span className="text-[10px] text-neutral-500">
                {scene.doneCount}/{scene.shots.length} · {formatDuration(scene.totalEstimatedSeconds)}
              </span>
            </header>
            <ul className="divide-y divide-neutral-100">
              {scene.shots.map((shot) => (
                <li key={shot.node.id} className="flex items-start gap-2 px-2.5 py-2">
                  <input
                    type="checkbox"
                    checked={shot.done}
                    onChange={(event) => onToggleShotDone(shot.node.id, event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                    aria-label={`${shot.title} 已拍`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-xs font-medium ${shot.done ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                        {shot.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-neutral-400">
                        {formatDuration(shot.estimatedSeconds)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                      {shot.materials.length === 0 && <span className="text-neutral-400">无绑定素材</span>}
                      {shot.materials.map((entry) => (
                        <span
                          key={`${entry.slot}-${entry.material?.id || 'missing'}`}
                          className={`rounded px-1.5 py-0.5 ${
                            entry.material
                              ? 'bg-neutral-100 text-neutral-600'
                              : 'bg-red-50 text-red-500'
                          }`}
                        >
                          {SLOT_LABELS[entry.slot]}：{entry.material ? entry.material.name : '已失效'}
                        </span>
                      ))}
                    </div>
                    {shot.missingRequiredSlots.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        缺关键槽位：{shot.missingRequiredSlots.map((slot) => SLOT_LABELS[slot]).join('、')}
                      </p>
                    )}
                    {shot.actualSeconds !== null && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        实拍 {formatDuration(shot.actualSeconds)} · 偏差 {Math.round(shot.actualSeconds - shot.estimatedSeconds)}s
                      </p>
                    )}
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
