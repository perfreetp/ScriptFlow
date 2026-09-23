import type { WorkspaceNode } from '../../../types';
import { isGroupNode } from './groupUtils';
import {
  buildShotItems,
  formatDuration,
} from './shotSequence';

export interface OutlineItem {
  title: string;
  content: string;
}

export interface OutlineGroup {
  title: string;
  items: OutlineItem[];
}

export interface ParsedOutline {
  groups: OutlineGroup[];
  looseItems: OutlineItem[];
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const LIST_ITEM_PATTERN = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/;

/**
 * Parse a Markdown outline where headings become groups and list items
 * become nodes. Continuation lines and deeper-nested list items are appended
 * to the current node's content.
 */
export function parseMarkdownOutline(markdown: string): ParsedOutline {
  const groups: OutlineGroup[] = [];
  const looseItems: OutlineItem[] = [];
  let currentGroup: OutlineGroup | null = null;
  let currentItem: OutlineItem | null = null;
  let currentItemIndent = 0;

  const pushItem = (item: OutlineItem) => {
    if (currentGroup) {
      currentGroup.items.push(item);
    } else {
      looseItems.push(item);
    }
  };

  markdown.split(/\r?\n/).forEach((rawLine) => {
    const heading = rawLine.match(HEADING_PATTERN);
    if (heading) {
      currentGroup = { title: heading[2].trim(), items: [] };
      groups.push(currentGroup);
      currentItem = null;
      return;
    }

    const listItem = rawLine.match(LIST_ITEM_PATTERN);
    if (listItem) {
      const indent = listItem[1].replace(/\t/g, '  ').length;
      const text = listItem[2].trim();
      if (!currentItem || indent <= currentItemIndent) {
        currentItem = { title: text.slice(0, 40) || '未命名镜头', content: text };
        currentItemIndent = indent;
        pushItem(currentItem);
      } else {
        currentItem.content = `${currentItem.content}\n${text}`;
      }
      return;
    }

    const trimmed = rawLine.trim();
    if (trimmed && currentItem) {
      currentItem.content = `${currentItem.content}\n${trimmed}`;
    }
  });

  return {
    groups: groups.filter((group) => group.items.length > 0 || group.title),
    looseItems,
  };
}

export function isOutlineEmpty(outline: ParsedOutline): boolean {
  return outline.groups.every((group) => group.items.length === 0) && outline.looseItems.length === 0;
}

/** Export the canvas as hierarchical Markdown: groups as headings, nodes as list items. */
export function exportCanvasToMarkdown(nodes: WorkspaceNode[]): string {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const groupedMemberIds = new Set<string>();
  const lines: string[] = ['# 分镜脚本', ''];

  nodes.filter(isGroupNode).forEach((groupNode) => {
    const groupData = groupNode.data.groupData;
    if (!groupData) return;
    lines.push(`## ${groupData.name}`, '');
    groupData.memberIds.forEach((memberId) => {
      const member = nodeById.get(memberId);
      if (!member || isGroupNode(member)) return;
      groupedMemberIds.add(memberId);
      lines.push(`- ${member.data.title || '未命名镜头'}`);
      (member.data.content || '').split('\n').forEach((contentLine) => {
        if (contentLine.trim()) lines.push(`  ${contentLine.trim()}`);
      });
    });
    lines.push('');
  });

  const looseNodes = nodes.filter((node) => !isGroupNode(node) && !groupedMemberIds.has(node.id));
  if (looseNodes.length > 0) {
    lines.push('## 未分组', '');
    looseNodes.forEach((node) => {
      lines.push(`- ${node.data.title || '未命名镜头'}`);
      (node.data.content || '').split('\n').forEach((contentLine) => {
        if (contentLine.trim()) lines.push(`  ${contentLine.trim()}`);
      });
    });
    lines.push('');
  }

  return lines.join('\n');
}

function escapeCsvCell(value: string): string {
  const normalized = (value || '').replace(/\r?\n/g, ' ');
  return `"${normalized.replace(/"/g, '""')}"`;
}

/** Export the storyboard sequence as a CSV table (with BOM for Excel). */
export function exportCanvasToCsv(
  nodes: WorkspaceNode[],
  edges: import('@xyflow/react').Edge[],
  shotOrder: string[],
): string {
  const items = buildShotItems(nodes, edges, shotOrder);
  const header = ['序号', '镜头标题', '口播文本', '字数', '预估时长', '所属分组'];
  const rows = items.map((item, index) => [
    String(index + 1),
    item.title,
    item.content,
    String(item.charCount),
    formatDuration(item.durationSeconds),
    item.groupName || '',
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  return `﻿${csv}`;
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
