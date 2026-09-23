import { memo, useContext, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronsUpDown, Lock, LockOpen, PackageOpen } from 'lucide-react';
import type { SceneGroup } from '../../../types';
import { NodeActionContext } from './NodeActionContext';

interface GroupCardNodeData {
  group: SceneGroup;
  memberCount: number;
}

/** Collapsed group summary card: aggregates member nodes and their cross-group edges. */
export const GroupCardNode = memo(({ data }: { data: GroupCardNodeData }) => {
  const { group, memberCount } = data;
  const { onToggleGroupCollapse, onToggleGroupLock, onRenameGroup } = useContext(NodeActionContext);
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
      className="flex w-[240px] flex-col overflow-hidden rounded-xl border-2 bg-white shadow-lg"
      style={{ borderColor: group.color }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5" style={{ background: group.color }} />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5" style={{ background: group.color }} />

      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ backgroundColor: `${group.color}1f` }}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
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
            onClick={(event) => event.stopPropagation()}
            className="nodrag w-full rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-neutral-800 focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 cursor-text truncate text-xs font-bold text-neutral-800"
            data-tooltip="双击重命名分组"
            onDoubleClick={() => {
              setNameDraft(group.name);
              setIsRenaming(true);
            }}
          >
            {group.name}
          </span>
        )}
        <button
          onClick={() => onToggleGroupLock?.(group.id)}
          className="shrink-0 cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-white/70 hover:text-neutral-900"
          data-tooltip={group.locked ? '解锁分组' : '锁定分组'}
        >
          {group.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onToggleGroupCollapse?.(group.id)}
          className="shrink-0 cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-white/70 hover:text-neutral-900"
          data-tooltip="展开分组"
        >
          <PackageOpen className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          <ChevronsUpDown className="h-3 w-3" />
          已折叠 {memberCount} 个节点
        </span>
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${group.color}26`, color: group.color }}>
          分组
        </span>
      </div>
    </div>
  );
});

GroupCardNode.displayName = 'GroupCardNode';
