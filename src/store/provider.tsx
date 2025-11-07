import type { JSX, PropsWithChildren } from "react";
import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import { createYarnyStore, type YarnyStoreApi } from "./createStore";
import type { YarnyStore } from "./types";

const YarnyStoreContext = createContext<YarnyStoreApi | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren): JSX.Element {
  const storeRef = useRef<YarnyStoreApi>();

  if (!storeRef.current) {
    storeRef.current = createYarnyStore();
  }

  return (
    <YarnyStoreContext.Provider value={storeRef.current}>
      {children}
    </YarnyStoreContext.Provider>
  );
}

export function useYarnyStore<T>(
  selector: (state: YarnyStore) => T,
  equalityFn?: (left: T, right: T) => boolean
): T {
  const store = useContext(YarnyStoreContext);

  if (!store) {
    throw new Error("useYarnyStore must be used within an AppStoreProvider");
  }

  return useStore(store, selector, equalityFn);
}

export function useYarnyStoreApi(): YarnyStoreApi {
  const store = useContext(YarnyStoreContext);

  if (!store) {
    throw new Error("useYarnyStoreApi must be used within an AppStoreProvider");
  }

  return store;
}

