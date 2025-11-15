import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, type ReactNode, useRef } from "react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";

import { createYarnyStore } from "../../src/store/createStore";
import { YarnyStoreContext } from "../../src/store/provider";
import type { YarnyState, YarnyStoreApi } from "../../src/store/types";

// Create a test query client with default options
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      },
      mutations: {
        retry: false
      }
    }
  });
}

// Test-specific store provider that accepts initial state
function TestStoreProvider({
  children,
  initialState
}: {
  children: ReactNode;
  initialState?: Partial<YarnyState>;
}) {
  const storeRef = useRef<YarnyStoreApi>();

  if (!storeRef.current) {
    storeRef.current = createYarnyStore(initialState);
  }

  return (
    <YarnyStoreContext.Provider value={storeRef.current}>
      {children}
    </YarnyStoreContext.Provider>
  );
}

// Custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialState?: Partial<YarnyState>;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialState,
    queryClient = createTestQueryClient(),
    initialEntries,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create store with initial state
  const store = createYarnyStore(initialState);

  function Wrapper({ children }: { children: ReactNode }) {
    const Router = initialEntries ? MemoryRouter : BrowserRouter;
    const routerProps = initialEntries ? { initialEntries } : {};
    
    return (
      <Router {...routerProps}>
        <QueryClientProvider client={queryClient}>
          <TestStoreProvider initialState={initialState}>{children}</TestStoreProvider>
        </QueryClientProvider>
      </Router>
    );
  }

  return {
    store,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";
export { userEvent };

// Re-export reset utilities for convenience
export * from "./reset-utilities";

