import { createContext } from 'react';
import type { ShotAsset, ShotSlotType } from '../../types';

export interface ProductionContextValue {
  assets: ShotAsset[];
  bindAsset: (nodeId: string, slot: ShotSlotType, assetId: string) => void;
  unbindAsset: (nodeId: string, slot: ShotSlotType) => void;
}

export const ProductionContext = createContext<ProductionContextValue>({
  assets: [],
  bindAsset: () => {},
  unbindAsset: () => {},
});
