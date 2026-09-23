import type { SceneGroup, WorkspaceNode } from '../../../types';
import type { ShotItem } from './storyboardUtils';
import { formatDurationSec } from './storyboardUtils';
import { GROUP_COLOR_PRESETS } from './groupUtils';

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/;
const COLUMN_WIDTH = 340;
const ROW_HEIGHT = 200;
const CANVAS_ORIGIN_X = 80;
const CANVAS_ORIGIN_Y = 80;

export interface MarkdownOutlineImportResult {
  nodes: WorkspaceNode[];
  groups: SceneGroup[];
}

/**
 * Parse a Markdown outline into canvas nodes and groups:
 * headings become scene groups, list items become text nodes inside the
 * group introduced by the most recent heading.
 */
export function parseMarkdownOutline(markdown: string): MarkdownOutlineImportResult {
  const nodes: WorkspaceNode[] = [];
  const groups: SceneGroup[] = [];
  const timestamp = Date.now();
  let currentGroup: SceneGroup | null = null;
  let groupIndex = 0;
  let itemIndexInGroup = 0;
  let ungroupedIndex = 0;

  const lines = markdown.split(/\r?\n/);
  lines.forEach((line) => {
    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      const name = headingMatch[2].trim();
      if (!name) return;
      currentGroup = {
        id: `md-group-${timestamp}-${groupIndex}`,
        name,
        color: GROUP_COLOR_PRESETS[groupIndex % GROUP_COLOR_PRESETS.length],
        locked: false,
        collapsed: false,
        nodeIds: [],
        collapsedPosition: { x: 0, y: 0 },
        collapseOrigin: { x: 0, y: 0 },
      };
      groups.push(currentGroup);
      groupIndex += 1;
      itemIndexInGroup = 0;
      return;
    }

    const itemMatch = line.match(LIST_ITEM_PATTERN);
    if (!itemMatch) return;
    const content = itemMatch[1].trim();
    if (!content) return;

    const columnIndex = currentGroup ? groupIndex - 1 : 0;
    const rowIndex = currentGroup ? itemIndexInGroup : ungroupedIndex;
    const nodeId = `md-node-${timestamp}-${nodes.length}`;
    const node: WorkspaceNode = {
      id: nodeId,
      type: 'text',
      position: {
        x: CANVAS_ORIGIN_X + columnIndex * COLUMN_WIDTH,
        y: CANVAS_ORIGIN_Y + rowIndex * ROW_HEIGHT,
      },
      data: {
        id: nodeId,
        type: 'text',
        title: content.length > 24 ? `${content.slice(0, 24)}…` : content,
        content,
        createdAt: timestamp,
      },
    } as WorkspaceNode;
    nodes.push(node);

    if (currentGroup) {
      currentGroup.nodeIds.push(nodeId);
      itemIndexInGroup += 1;
    } else {
      ungroupedIndex += 1;
    }
  });

  return { nodes, groups };
}

function stripMarkdownListMarker(text: string) {
  return text.replace(/[*_`]/g, '');
}

/** Export the storyboard sequence as hierarchical Markdown (groups as headings). */
export function exportStoryboardMarkdown(shots: ShotItem[], totalDurationSec: number): string {
  const lines: string[] = ['# 分镜脚本', ''];
  lines.push(`> 共 ${shots.length} 个镜头，预计总时长 ${formatDurationSec(totalDurationSec)}（按 260 字/分钟估算）`);
  lines.push('');

  let currentGroup: string | null | undefined;
  shots.forEach((shot, index) => {
    if (shot.groupName !== currentGroup) {
      currentGroup = shot.groupName;
      lines.push('');
      lines.push(`## ${shot.groupName ?? '未分组'}`);
      lines.push('');
    }
    const content = stripMarkdownListMarker(shot.content.trim());
    const summary = content.length > 80 ? `${content.slice(0, 80)}…` : content;
    lines.push(`${index + 1}. **${shot.title}**（约 ${Math.round(shot.durationSec)} 秒）${summary ? `：${summary}` : ''}`);
  });

  lines.push('');
  return lines.join('\n');
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Export the storyboard sequence as a CSV shot list (with BOM for Excel). */
export function exportStoryboardCsv(shots: ShotItem[]): string {
  const header = ['序号', '分组', '镜头标题', '口播内容', '字数', '预估时长(秒)', '累计时长(秒)'];
  const rows = [header.map(escapeCsvCell).join(',')];

  let cumulative = 0;
  shots.forEach((shot, index) => {
    cumulative += shot.durationSec;
    rows.push([
      String(index + 1),
      shot.groupName ?? '',
      shot.title,
      shot.content.replace(/\s+/g, ' ').trim(),
      String(shot.charCount),
      String(Math.round(shot.durationSec)),
      String(Math.round(cumulative)),
    ].map(escapeCsvCell).join(','));
  });

  return `﻿${rows.join('\r\n')}`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
