import { useMemo, useState } from 'react';
import { Braces, Plus, Replace, Trash2, Wand2, X } from 'lucide-react';
import type { ScriptVariable, WorkspaceNode } from '../../../types';
import { collectUsedVariableNames } from '../utils/variables';

interface VariablesPanelProps {
  open: boolean;
  nodes: WorkspaceNode[];
  variables: ScriptVariable[];
  onVariablesChange: (variables: ScriptVariable[]) => void;
  onApplyVariables: (onlyNames?: Set<string>) => void;
  onClose: () => void;
}

export default function VariablesPanel({
  open,
  nodes,
  variables,
  onVariablesChange,
  onApplyVariables,
  onClose,
}: VariablesPanelProps) {
  const [newName, setNewName] = useState('');

  const usedNames = useMemo(() => collectUsedVariableNames(nodes), [nodes]);
  const knownNames = useMemo(
    () => new Set(variables.map((variable) => variable.name)),
    [variables],
  );
  const missingNames = usedNames.filter((name) => !knownNames.has(name));
  const filledCount = variables.filter((variable) => variable.value !== '').length;

  if (!open) return null;

  const updateVariable = (id: string, patch: Partial<ScriptVariable>) => {
    onVariablesChange(
      variables.map((variable) => (variable.id === id ? { ...variable, ...patch } : variable)),
    );
  };

  const removeVariable = (id: string) => {
    onVariablesChange(variables.filter((variable) => variable.id !== id));
  };

  const addVariable = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || knownNames.has(trimmed)) return;
    onVariablesChange([
      ...variables,
      { id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: trimmed, value: '' },
    ]);
    setNewName('');
  };

  return (
    <aside className="absolute right-4 top-20 z-30 flex max-h-[calc(100%-120px)] w-[340px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 shadow-2xl shadow-neutral-900/15 backdrop-blur-md animate-in fade-in slide-in-from-right-2">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-neutral-700" />
          <h3 className="text-sm font-bold text-neutral-800">变量管理</h3>
          <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
            {filledCount}/{variables.length} 已填
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          data-tooltip="关闭面板"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {missingNames.length > 0 && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-700">画布中检测到未登记的占位符：</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {missingNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addVariable(name)}
                  className="cursor-pointer rounded-full border border-amber-300 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                  data-tooltip="点击登记为变量"
                >
                  {`{{${name}}}`} +
                </button>
              ))}
            </div>
          </div>
        )}

        {variables.length === 0 && (
          <p className="px-1 py-6 text-center text-xs leading-relaxed text-neutral-400">
            在节点文本中使用 {'{{变量名}}'} 占位符，
            <br />
            在此统一填充并全局替换。
          </p>
        )}

        {variables.map((variable) => (
          <div key={variable.id} className="mb-2 rounded-lg border border-neutral-150 bg-white px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="max-w-[45%] truncate rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neutral-600">
                {`{{${variable.name}}}`}
              </span>
              <input
                type="text"
                value={variable.value}
                placeholder="填写替换值…"
                onChange={(event) => updateVariable(variable.id, { value: event.target.value })}
                className="min-w-0 flex-1 rounded border border-neutral-200 px-1.5 py-1 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400"
              />
              <button
                type="button"
                onClick={() => onApplyVariables(new Set([variable.name]))}
                disabled={variable.value === ''}
                className="shrink-0 cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
                data-tooltip="全局替换此变量"
              >
                <Replace className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeVariable(variable.id)}
                className="shrink-0 cursor-pointer rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                data-tooltip="删除变量"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newName}
            placeholder="新变量名…"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addVariable(newName);
            }}
            className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400"
          />
          <button
            type="button"
            onClick={() => addVariable(newName)}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
          <button
            type="button"
            onClick={() => onApplyVariables()}
            disabled={filledCount === 0}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            data-tooltip="将所有已填写的变量值替换到画布节点"
          >
            <Wand2 className="h-3.5 w-3.5" />
            全部填充
          </button>
        </div>
      </div>
    </aside>
  );
}
