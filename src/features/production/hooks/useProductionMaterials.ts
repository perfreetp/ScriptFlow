import { useCallback, useEffect, useState } from 'react';
import { dbGet, dbSet } from '../../../shared/storage/db';
import type { ShotSlotKind } from '../../../types';
import { DEFAULT_MAX_REFS, PRODUCTION_MATERIALS_STORAGE_KEY } from '../constants';
import type { ProductionMaterial } from '../types';

export interface NewMaterialInput {
  name: string;
  type: ShotSlotKind;
  durationSeconds: number;
  tags: string[];
}

export function useProductionMaterials() {
  const [materials, setMaterials] = useState<ProductionMaterial[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const saved = await dbGet<ProductionMaterial[]>(PRODUCTION_MATERIALS_STORAGE_KEY);
        if (!cancelled && Array.isArray(saved)) {
          setMaterials(saved);
        }
      } catch (error) {
        console.error('Failed to load production materials', error);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    dbSet(PRODUCTION_MATERIALS_STORAGE_KEY, materials).catch((error) => {
      console.error('Failed to save production materials', error);
    });
  }, [materials, isLoaded]);

  const addMaterial = useCallback((input: NewMaterialInput) => {
    const material: ProductionMaterial = {
      id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name.trim() || '未命名素材',
      type: input.type,
      durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
      tags: input.tags,
      maxRefs: DEFAULT_MAX_REFS,
      createdAt: Date.now(),
    };
    setMaterials((current) => [material, ...current]);
    return material;
  }, []);

  const updateMaterial = useCallback((materialId: string, patch: Partial<ProductionMaterial>) => {
    setMaterials((current) =>
      current.map((material) => (material.id === materialId ? { ...material, ...patch } : material)),
    );
  }, []);

  const deleteMaterial = useCallback((materialId: string) => {
    setMaterials((current) => current.filter((material) => material.id !== materialId));
  }, []);

  return { materials, isLoaded, addMaterial, updateMaterial, deleteMaterial };
}
