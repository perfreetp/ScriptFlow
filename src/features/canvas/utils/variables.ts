import type { ScriptVariable, WorkspaceNode } from '../../../types';
import { isGroupNode } from './groupUtils';

const VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function extractVariableNames(text: string): string[] {
  const names = new Set<string>();
  if (!text) return [];
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const name = match[1].trim();
    if (name) names.add(name);
  }
  return Array.from(names);
}

/** All placeholder names referenced by node titles / contents on the canvas. */
export function collectUsedVariableNames(nodes: WorkspaceNode[]): string[] {
  const names = new Set<string>();
  nodes.forEach((node) => {
    if (isGroupNode(node)) return;
    extractVariableNames(node.data.title || '').forEach((name) => names.add(name));
    extractVariableNames(node.data.content || '').forEach((name) => names.add(name));
  });
  return Array.from(names);
}

export interface UnresolvedVariableRef {
  name: string;
  nodeId: string;
  nodeTitle: string;
}

/** Placeholders still present on the canvas (i.e. not yet filled in). */
export function collectUnresolvedVariables(nodes: WorkspaceNode[]): UnresolvedVariableRef[] {
  const unresolved: UnresolvedVariableRef[] = [];
  nodes.forEach((node) => {
    if (isGroupNode(node)) return;
    const nodeTitle = node.data.title || node.id;
    const names = new Set([
      ...extractVariableNames(node.data.title || ''),
      ...extractVariableNames(node.data.content || ''),
    ]);
    names.forEach((name) => {
      unresolved.push({ name, nodeId: node.id, nodeTitle });
    });
  });
  return unresolved;
}

export function replaceVariablesInText(text: string, valuesByName: Map<string, string>): string {
  if (!text) return text;
  return text.replace(VARIABLE_PATTERN, (raw, rawName: string) => {
    const name = rawName.trim();
    const value = valuesByName.get(name);
    return value !== undefined && value !== '' ? value : raw;
  });
}

/** Replace every placeholder that has a non-empty value across all nodes. */
export function applyVariablesToNodes(
  nodes: WorkspaceNode[],
  variables: ScriptVariable[],
  onlyNames?: Set<string>,
): { nodes: WorkspaceNode[]; replacedCount: number } {
  const valuesByName = new Map(
    variables
      .filter((variable) => variable.name.trim() && variable.value !== '')
      .filter((variable) => !onlyNames || onlyNames.has(variable.name))
      .map((variable) => [variable.name.trim(), variable.value]),
  );
  if (valuesByName.size === 0) return { nodes, replacedCount: 0 };

  let replacedCount = 0;
  const nextNodes = nodes.map((node) => {
    if (isGroupNode(node)) return node;
    const nextTitle = replaceVariablesInText(node.data.title || '', valuesByName);
    const nextContent = replaceVariablesInText(node.data.content || '', valuesByName);
    if (nextTitle === (node.data.title || '') && nextContent === (node.data.content || '')) {
      return node;
    }
    replacedCount += 1;
    return {
      ...node,
      data: { ...node.data, title: nextTitle, content: nextContent },
    } as WorkspaceNode;
  });

  return { nodes: nextNodes, replacedCount };
}
