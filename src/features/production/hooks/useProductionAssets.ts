import { useCallback, useEffect, useState } from 'react';
import type { ShotAsset, ShotSlotType } from '../../../types';
import { dbGet, dbSet } from '../../../shared/storage/db';
import { PRODUCTION_ASSETS_STORAGE_KEY } from '../constants';

export interface NewShotAssetInput {
  name: string;
  type: ShotSlotType;
  durationSec: number;
  tags: string[];
  maxUsage: number;
}

export function useProductionAssets() {
  const [assets, setAssets] = useState<ShotAsset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAssets() {
      try {
        const saved = await dbGet<ShotAsset[]>(PRODUCTION_ASSETS_STORAGE_KEY);
        if (!cancelled && Array.isArray(saved)) {
          setAssets(saved);
        }
      } catch (error) {
        console.error('Failed to load production assets', error);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    dbSet(PRODUCTION_ASSETS_STORAGE_KEY, assets).catch((error) => {
      console.error('Failed to save production assets', error);
    });
  }, [assets, isLoaded]);

  const addAsset = useCallback((input: NewShotAssetInput) => {
    const asset: ShotAsset = {
      id: `shot-asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name.trim() || '未命名素材',
      type: input.type,
      durationSec: Math.max(0, Math.round(input.durationSec)),
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
      maxUsage: Math.max(1, Math.round(input.maxUsage) || 1),
      createdAt: Date.now(),
    };
    setAssets((current) => [asset, ...current]);
    return asset;
  }, []);

  const updateAsset = useCallback((assetId: string, patch: Partial<ShotAsset>) => {
    setAssets((current) =>
      current.map((asset) => (asset.id === assetId ? { ...asset, ...patch, id: asset.id } : asset)),
    );
  }, []);

  const deleteAsset = useCallback((assetId: string) => {
    setAssets((current) => current.filter((asset) => asset.id !== assetId));
  }, []);

  return { assets, isLoaded, addAsset, updateAsset, deleteAsset };
}
