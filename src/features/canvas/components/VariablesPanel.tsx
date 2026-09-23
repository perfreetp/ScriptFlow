import { useMemo } from 'react';
import { Braces, Replace, X } from 'lucide-react';
import type { WorkspaceNode } from '../../../types';
import { collectVariableUsages } from '../utils/variableUtils';

interface VariablesPanelProps {
  nodes: WorkspaceNode[];
  variables: Record<string, string>;
  onVariablesChange: (variables: Record<string, string>) => void;
  onApplyGlobalReplace: () => void;
  onClose: () => void;
}

export default function VariablesPanel({
  nodes,
  variables,
  onVariablesChange,
  onApplyGlobalReplace,
  onClose,
}: VariablesPanelProps) {
  const usages = useMemo(() => collectVariableUsages(nodes), [nodes]);
  const filledCount = usages.filter((usage) => (variables[usage.name] ?? '').trim()).length;
  const hasFillable = filledCount > 0;

  return (
    <aside className="pointer-events-auto absolute right-4 top-20 z-40 flex max-h-[calc(100vh-7rem)] w-[19rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-neutral-200/80 bg-white/95 p-2.5 text-left shadow-xl shadow-neutral-900/10 backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-150">
      <header className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
            <Braces className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-neutral-950">变量管理</h3>
            <p className="mt-0.5 truncate text-xs text-neutral-400">
              {usages.length} 个占位符 · 已填充 {filledCount} 个
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          data-tooltip="关闭变量管理"
          data-tooltip-placement="bottom"
          aria-label="关闭变量管理"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="mt-2.5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {usages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs leading-relaxed text-neutral-400">
            在节点文本中使用 {'{{变量名}}'} 语法，
            <br />
            即可在此统一填充与替换。
          </p>
        ) : (
          usages.map((usage) => {
            const value = variables[usage.name] ?? '';
            const isFilled = value.trim().length > 0;
            return (
              <div key={usage.name} className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                      isFilled ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {`{{${usage.name}}}`}
                  </span>
                  <span className="shrink-0 text-[10px] text-neutral-400">
                    {usage.nodeIds.length} 处引用
                  </span>
                </div>
                <input
                  type="text"
                  value={value}
                  placeholder={isFilled ? '' : '待填充…'}
                  onChange={(event) => {
                    onVariablesChange({ ...variables, [usage.name]: event.target.value });
                  }}
                  className={`mt-1.5 w-full rounded border px-2 py-1 text-xs focus:outline-none ${
                    isFilled
                      ? 'border-neutral-200 bg-white text-neutral-800 focus:border-neutral-400'
                      : 'border-amber-200 bg-amber-50/50 text-neutral-800 placeholder:text-amber-400 focus:border-amber-400'
                  }`}
                  aria-label={`变量 ${usage.name} 的值`}
                />
              </div>
            );
          })
        )}
      </div>

      {usages.length > 0 && (
        <button
          onClick={onApplyGlobalReplace}
          disabled={!hasFillable}
          className="mt-2.5 inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-[11px] font-bold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          data-tooltip="将已填充的变量值写回所有节点文本"
          data-tooltip-placement="top"
        >
          <Replace className="h-3.5 w-3.5" />
          全局替换已填充变量
        </button>
      )}
    </aside>
  );
}
