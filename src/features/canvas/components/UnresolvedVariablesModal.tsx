import { AlertTriangle, X } from 'lucide-react';
import type { UnresolvedVariableRef } from '../utils/variables';

interface UnresolvedVariablesModalProps {
  open: boolean;
  unresolved: UnresolvedVariableRef[];
  exportLabel: string;
  onClose: () => void;
  onOpenVariables: () => void;
}

export default function UnresolvedVariablesModal({
  open,
  unresolved,
  exportLabel,
  onClose,
  onOpenVariables,
}: UnresolvedVariablesModalProps) {
  if (!open) return null;

  const uniqueNames = Array.from(new Set(unresolved.map((ref) => ref.name)));

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-900/30 backdrop-blur-[2px]">
      <div className="flex max-h-[70vh] w-[420px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-neutral-800">导出被拦截：存在未替换变量</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <p className="text-xs leading-relaxed text-neutral-500">
            画布中仍有 {uniqueNames.length} 个变量占位符未替换，无法{exportLabel}。
            请先在变量面板中完成填充。
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {uniqueNames.map((name) => (
              <span
                key={name}
                className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700"
              >
                {`{{${name}}}`}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-1">
            {unresolved.map((ref, index) => (
              <li
                key={`${ref.nodeId}-${ref.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-[11px]"
              >
                <span className="truncate font-medium text-neutral-700">{ref.nodeTitle}</span>
                <span className="shrink-0 font-mono text-amber-600">{`{{${ref.name}}}`}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            取消导出
          </button>
          <button
            type="button"
            onClick={onOpenVariables}
            className="cursor-pointer rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-700"
          >
            打开变量面板
          </button>
        </div>
      </div>
    </div>
  );
}
