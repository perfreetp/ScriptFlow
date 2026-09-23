import { memo, useContext, useState } from 'react';
import { ChevronsDownUp, Lock, LockOpen, Ungroup } from 'lucide-react';
import type { SceneGroup } from '../../../types';
import { GROUP_COLOR_PRESETS } from '../utils/groupUtils';
import { NodeActionContext } from './NodeActionContext';

interface GroupFrameNodeData {
  group: SceneGroup;
}

/** Expanded group background frame rendered behind member nodes. */
export const GroupFrameNode = memo(({ data, width, height }: { data: GroupFrameNodeData; width?: number; height?: number }) => {
  const { group } = data;
  const { onToggleGroupCollapse, onToggleGroupLock, onRenameGroup, onSetGroupColor, onUngroup } = useContext(NodeActionContext);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);

  const commitRename = () => {
    const nextName = nameDraft.trim();
    if (nextName && nextName !== group.name) {
      onRenameGroup?.(group.id, nextName);
    }
    setIsRenaming(false);
  };

  return (
    <div
      className="rounded-2xl border-2 border-dashed"
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        borderColor: group.color,
        backgroundColor: `${group.color}0d`,
      }}
    >
      <div
        className="nodrag absolute -top-3 left-3 flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 shadow-sm"
        style={{ borderColor: group.color }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
        {isRenaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename();
              if (event.key === 'Escape') setIsRenaming(false);
            }}
            className="w-24 rounded border border-neutral-200 px-1 text-[11px] font-semibold text-neutral-800 focus:outline-none"
          />
        ) : (
          <span
            className="max-w-[140px] cursor-text truncate text-[11px] font-bold text-neutral-700"
            data-tooltip="双击重命名分组"
            onDoubleClick={() => {
              setNameDraft(group.name);
              setIsRenaming(true);
            }}
          >
            {group.name}
          </span>
        )}

        {GROUP_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => onSetGroupColor?.(group.id, color)}
            className={`h-3 w-3 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-125 ${color === group.color ? 'ring-1 ring-neutral-500 ring-offset-1' : ''}`}
            style={{ backgroundColor: color }}
            data-tooltip="设置分组配色"
            aria-label={`设置分组颜色 ${color}`}
          />
        ))}

        <button
          onClick={() => onToggleGroupLock?.(group.id)}
          className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-900"
          data-tooltip={group.locked ? '解锁分组' : '锁定分组'}
        >
          {group.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
        </button>
        <button
          onClick={() => onToggleGroupCollapse?.(group.id)}
          className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-900"
          data-tooltip="折叠分组"
        >
          <ChevronsDownUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => onUngroup?.(group.id)}
          className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-400 transition-colors hover:text-red-600"
          data-tooltip="解散分组"
        >
          <Ungroup className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});

GroupFrameNode.displayName = 'GroupFrameNode';
