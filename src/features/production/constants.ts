import type { ShotSlotKind } from '../../types';

export const PRODUCTION_MATERIALS_STORAGE_KEY = 'scriptflow.production.materials.v1';

export const MATERIAL_DRAG_MIME = 'application/x-scriptflow-material';

export const WORDS_PER_MINUTE = 260;

export const DEFAULT_MAX_REFS = 3;

export const TALKING_HEAD_LIMIT_SECONDS = 90;

export const DEFAULT_SCENE_NAME = '未分组';

export interface SlotDefinition {
  kind: ShotSlotKind;
  label: string;
  required: boolean;
}

export const SLOT_DEFINITIONS: SlotDefinition[] = [
  { kind: 'appearance', label: '出镜', required: true },
  { kind: 'broll', label: 'B-roll', required: false },
  { kind: 'graphic', label: '图版', required: false },
  { kind: 'sfx', label: '音效', required: false },
  { kind: 'subtitle', label: '字幕', required: false },
];

export const SLOT_LABELS: Record<ShotSlotKind, string> = SLOT_DEFINITIONS.reduce(
  (acc, def) => ({ ...acc, [def.kind]: def.label }),
  {} as Record<ShotSlotKind, string>,
);

export const REQUIRED_SLOT_KINDS: ShotSlotKind[] = SLOT_DEFINITIONS.filter((def) => def.required).map(
  (def) => def.kind,
);
