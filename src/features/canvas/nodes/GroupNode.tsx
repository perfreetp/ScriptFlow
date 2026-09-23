import { memo, useContext, useState } from 'react';
import { Check, ChevronsDownUp, ChevronsUpDown, Lock, LockOpen, Ungroup } from 'lucide-react';
import { NodeActionContext } from './NodeActionContext';
import StandardHandles from './StandardHandles';
import {
  GROUP_COLLAPSED_HEIGHT,
  GROUP_COLLAPSED_WIDTH,
  GROUP_COLOR_OPTIONS,
} from '../utils/groupUtils';
import type { GroupCanvasNodeData } from '../../../types';

export const GroupNode = memo(({ id, data, selected }: { id: string; data: GroupCanvasNodeData; selected?: boolean }) => {
  const { onUpdateGroup, onUngroup } = useContext(NodeActionContext);
  const group = data.groupData;
  const [nameDraft, setNameDraft] = useState(group.name);
  const [isRenaming, setIsRenaming] = useState(false);

  if (!group) return null;

  const commitRename = () => {
    const nextName = nameDraft.trim() || group.name;
    setNameDraft(nextName);
    setIsRenaming(false);
    if (nextName !== group.name) {
      onUpdateGroup?.(id, { name: nextName });
    }
  };

  if (group.collapsed) {
    return (
      <div
        className={`relative flex flex-col overflow-hidden rounded-xl border-2 bg-white text-left shadow-md transition-all ${
          selected ? 'border-neutral-800 ring-1 ring-neutral-800' : 'border-neutral-300 hover:border-neutral-400'
        }`}
        style={{ width: GROUP_COLLAPSED_WIDTH, height: GROUP_COLLAPSED_HEIGHT }}
      >
        <StandardHandles nodeId={id} />
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: group.color }} />
        <div className="flex min-h-0 flex-1 flex-col px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-bold text-neutral-800">{group.name}</span>
            <div className="flex items-center gap-0.5">
              {group.locked && <Lock className="h-3 w-3 text-neutral-400" />}
              <button
                type="button"
                className="nodrag cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                data-tooltip="展开分组"
                onClick={(event) => {
                  event.stopPropagation();
                  onUpdateGroup?.(id, { collapsed: false });
                }}
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
            已折叠 {group.memberIds.length} 个节点，跨组连线已聚合到此卡片。
          </p>
          <span className="mt-auto inline-flex w-fit items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
            {group.memberIds.length} 个节点
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full rounded-2xl border-2 border-dashed transition-colors"
      style={{
        borderColor: selected ? '#262626' : '#a3a3a3',
        backgroundColor: `${group.color}55`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl" />
      <div className="absolute left-3 top-2 flex max-w-[calc(100%-24px)] items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color, border: '1px solid rgba(0,0,0,0.15)' }} />
        {isRenaming ? (
          <input
            type="text"
            value={nameDraft}
            autoFocus
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename();
              if (event.key === 'Escape') {
                setNameDraft(group.name);
                setIsRenaming(false);
              }
            }}
            className="nodrag w-36 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-neutral-500"
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className="nodrag cursor-text truncate rounded px-1 py-0.5 text-xs font-bold text-neutral-700 hover:bg-white/70"
            data-tooltip="点击重命名分组"
            onClick={(event) => {
              event.stopPropagation();
              setNameDraft(group.name);
              setIsRenaming(true);
            }}
          >
            {group.name}
          </button>
        )}
        <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400">
          {group.memberIds.length}
        </span>
      </div>

      <div className="nodrag absolute right-2 top-1.5 flex items-center gap-0.5 rounded-lg border border-neutral-200/70 bg-white/90 px-1 py-0.5 shadow-sm">
        {GROUP_COLOR_OPTIONS.map((color) => (
          <button
            key={color}
            type="button"
            className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-neutral-300/70 transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
            data-tooltip="分组配色"
            onClick={(event) => {
              event.stopPropagation();
              onUpdateGroup?.(id, { color });
            }}
          >
            {group.color === color && <Check className="h-2.5 w-2.5 text-neutral-700" />}
          </button>
        ))}
        <div className="mx-0.5 h-4 w-px bg-neutral-200" />
        <button
          type="button"
          className="cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          data-tooltip={group.locked ? '解锁分组' : '锁定分组'}
          onClick={(event) => {
            event.stopPropagation();
            onUpdateGroup?.(id, { locked: !group.locked });
          }}
        >
          {group.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          className="cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          data-tooltip="折叠分组"
          onClick={(event) => {
            event.stopPropagation();
            onUpdateGroup?.(id, { collapsed: true });
          }}
        >
          <ChevronsDownUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="cursor-pointer rounded p-1 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
          data-tooltip="解散分组（保留节点）"
          onClick={(event) => {
            event.stopPropagation();
            onUngroup?.(id);
          }}
        >
          <Ungroup className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
