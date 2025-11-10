import type { AxeResults, ElementContext, RunOptions } from "axe-core";
import { axe } from "vitest-axe";

type AxeTarget = ElementContext | HTMLElement | DocumentFragment;

const DEFAULT_OPTIONS: RunOptions = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
  },
  resultTypes: ["violations"]
};

export async function runAxe(
  target: AxeTarget,
  options: RunOptions = {}
): Promise<AxeResults> {
  return axe(target, {
    ...DEFAULT_OPTIONS,
    ...options,
    runOnly: options.runOnly ?? DEFAULT_OPTIONS.runOnly,
    resultTypes: options.resultTypes ?? DEFAULT_OPTIONS.resultTypes
  });
}

