import type { ShotSlotType } from '../../types';

export const PRODUCTION_ASSETS_STORAGE_KEY = 'scriptflow.production.assets.v1';

export const TELEPROMPTER_CHARS_PER_MINUTE = 260;

export const TALKING_HEAD_LIMIT_SEC = 90;

export const SHOT_ASSET_DRAG_MIME = 'application/x-scriptflow-shot-asset';

export interface ShotSlotDef {
  type: ShotSlotType;
  label: string;
  required: boolean;
}

export const SHOT_SLOT_DEFS: ShotSlotDef[] = [
  { type: 'onCamera', label: '出镜', required: true },
  { type: 'broll', label: 'B-roll', required: false },
  { type: 'graphic', label: '图版', required: false },
  { type: 'audio', label: '音效', required: false },
  { type: 'subtitle', label: '字幕', required: false },
];

export const SHOT_SLOT_LABELS: Record<ShotSlotType, string> = SHOT_SLOT_DEFS.reduce(
  (acc, def) => ({ ...acc, [def.type]: def.label }),
  {} as Record<ShotSlotType, string>,
);

export const REQUIRED_SLOT_TYPES: ShotSlotType[] = SHOT_SLOT_DEFS.filter((def) => def.required).map(
  (def) => def.type,
);
