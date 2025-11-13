import type { AxeResults } from "axe-core";
import type { PromisifyAssertion } from "@vitest/expect";

declare module "@vitest/expect" {
  interface Assertion<T = any> {
    toHaveNoViolations(): T extends AxeResults ? void : never;
  }
  
  interface PromisifyAssertion<T> {
    toHaveNoViolations: T extends AxeResults ? () => Promise<void> : never;
  }
}

declare module "vitest/expect" {
  interface Assertion<T = any> {
    toHaveNoViolations(): T extends AxeResults ? void : never;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

