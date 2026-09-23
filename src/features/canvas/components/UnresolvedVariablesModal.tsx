import { AlertTriangle, X } from 'lucide-react';
import type { VariableUsage } from '../utils/variableUtils';

interface UnresolvedVariablesModalProps {
  open: boolean;
  unresolved: VariableUsage[];
  exportLabel: string;
  onOpenVariables: () => void;
  onExportAnyway: () => void;
  onClose: () => void;
}

export default function UnresolvedVariablesModal({
  open,
  unresolved,
  exportLabel,
  onOpenVariables,
  onExportAnyway,
  onClose,
}: UnresolvedVariablesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">存在未替换的变量</h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                以下 {unresolved.length} 个占位符尚未填充，{exportLabel}已被拦截。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {unresolved.map((usage) => (
            <li
              key={usage.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5"
            >
              <code className="truncate font-mono text-xs font-semibold text-amber-800">
                {`{{${usage.name}}}`}
              </code>
              <span className="shrink-0 text-[10px] text-amber-600">{usage.nodeIds.length} 处引用</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onExportAnyway}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          >
            仍要导出
          </button>
          <button
            onClick={onOpenVariables}
            className="cursor-pointer rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-neutral-700"
          >
            去填充变量
          </button>
        </div>
      </div>
    </div>
  );
}
