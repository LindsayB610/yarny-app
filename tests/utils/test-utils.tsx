import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppStoreProvider } from "../../src/store/provider";
import { createYarnyStore } from "../../src/store/createStore";
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

// Custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialState?: Partial<YarnyState>;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialState,
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create store for return value, but AppStoreProvider creates its own
  const store = createYarnyStore(initialState);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AppStoreProvider>{children}</AppStoreProvider>
        </QueryClientProvider>
      </BrowserRouter>
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
import userEvent from "@testing-library/user-event";
export { userEvent };

