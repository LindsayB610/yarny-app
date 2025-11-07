import type { JSX } from "react";

import { AppProviders } from "./providers/AppProviders";
import { AppLayout } from "../components/layout/AppLayout";

export function App(): JSX.Element {
  return (
    <AppProviders>
      <AppLayout />
    </AppProviders>
  );
}

