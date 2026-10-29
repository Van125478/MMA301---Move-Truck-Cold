import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  favoriteFrom,
  GUEST_FAVORITES_USER_ID,
  readFavorites,
  upsertFavorite,
  withoutFavorite,
  withoutFavorites,
  writeFavorites,
  type FavoriteRecord,
} from "./store";
import type { Shipment } from "../../types/shipment";

type FavoritesValue = {
  ready: boolean;
  items: FavoriteRecord[];
  has: (id: string) => boolean;
  toggle: (shipment: Shipment) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: ReadonlySet<string>) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshSaved: (shipment: Shipment) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session.status === "authenticated" ? session.user.id : GUEST_FAVORITES_USER_ID;
  const [items, setItems] = useState<FavoriteRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    void readFavorites(userId).then((saved) => {
      if (!active) return;
      setItems(saved);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const persist = useCallback(
    async (next: FavoriteRecord[]) => {
      setItems(next);
      await writeFavorites(userId, next);
    },
    [userId],
  );

  const has = useCallback((id: string) => items.some((item) => item.id === id), [items]);

  const toggle = useCallback(
    async (shipment: Shipment) => {
      const next = has(shipment.id) ? withoutFavorite(items, shipment.id) : upsertFavorite(items, favoriteFrom(shipment));
      await persist(next);
    },
    [has, items, persist],
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(withoutFavorite(items, id));
    },
    [items, persist],
  );

  const removeMany = useCallback(
    async (ids: ReadonlySet<string>) => {
      if (ids.size === 0) return;
      await persist(withoutFavorites(items, ids));
    },
    [items, persist],
  );

  const clearAll = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const refreshSaved = useCallback(
    async (shipment: Shipment) => {
      if (!items.some((item) => item.id === shipment.id)) return;
      const current = items.find((item) => item.id === shipment.id);
      await persist(upsertFavorite(items, { ...favoriteFrom(shipment), savedAt: current?.savedAt ?? new Date().toISOString() }));
    },
    [items, persist],
  );

  const value = useMemo(
    () => ({ ready, items, has, toggle, remove, removeMany, clearAll, refreshSaved }),
    [ready, items, has, toggle, remove, removeMany, clearAll, refreshSaved],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites phải nằm trong FavoritesProvider.");
  return value;
}
