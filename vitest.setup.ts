import "./src/setupTests";
import { beforeAll, afterEach, afterAll, expect } from "vitest";
import { toHaveNoViolations } from "vitest-axe/matchers";

import { server } from "./tests/setup/msw-server";

expect.extend({ toHaveNoViolations });

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

