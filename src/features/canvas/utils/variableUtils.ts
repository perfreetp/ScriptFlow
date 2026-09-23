import type { WorkspaceNode } from '../../../types';

const VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function extractVariableNames(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const name = match[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

export interface VariableUsage {
  name: string;
  nodeIds: string[];
}

/** Collect every {{variable}} placeholder used across node titles and content. */
export function collectVariableUsages(nodes: WorkspaceNode[]): VariableUsage[] {
  const usageMap = new Map<string, Set<string>>();
  nodes.forEach((node) => {
    const text = `${node.data.title || ''}\n${node.data.content || ''}`;
    extractVariableNames(text).forEach((name) => {
      if (!usageMap.has(name)) usageMap.set(name, new Set());
      usageMap.get(name)!.add(node.id);
    });
  });
  return Array.from(usageMap.entries())
    .map(([name, ids]) => ({ name, nodeIds: Array.from(ids) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Variables that are referenced but have no filled-in value yet. */
export function collectUnresolvedVariables(
  nodes: WorkspaceNode[],
  variables: Record<string, string>,
): VariableUsage[] {
  return collectVariableUsages(nodes).filter((usage) => !(variables[usage.name] ?? '').trim());
}

export function replaceVariablesInText(text: string, variables: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (raw, rawName: string) => {
    const value = variables[rawName.trim()];
    return value && value.trim() ? value : raw;
  });
}

/** Render segments for highlighting placeholders inside node content. */
export interface VariableSegment {
  text: string;
  variableName?: string;
}

export function splitTextByVariables(text: string): VariableSegment[] {
  const segments: VariableSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index) });
    }
    segments.push({ text: match[0], variableName: match[1].trim() });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments;
}
