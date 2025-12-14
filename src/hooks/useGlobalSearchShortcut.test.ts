import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useGlobalSearchShortcut } from "./useGlobalSearchShortcut";

describe("useGlobalSearchShortcut", () => {
  let onOpen: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onOpen = vi.fn();
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers keyboard event listener on mount", () => {
    renderHook(() => useGlobalSearchShortcut(onOpen));

    expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("removes keyboard event listener on unmount", () => {
    const { unmount } = renderHook(() => useGlobalSearchShortcut(onOpen));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("calls onOpen when Cmd+K is pressed on Mac", () => {
    // Mock navigator.platform to simulate Mac
    Object.defineProperty(navigator, "platform", {
      writable: true,
      value: "MacIntel"
    });

    renderHook(() => useGlobalSearchShortcut(onOpen));

    // Get the event handler that was registered
    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "keydown"
    )?.[1] as (e: KeyboardEvent) => void;

    expect(handler).toBeDefined();

    // Simulate Cmd+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
      altKey: false
    });
    Object.defineProperty(event, "target", {
      value: document.body
    });

    handler(event);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("calls onOpen when Ctrl+K is pressed on Windows/Linux", () => {
    // Mock navigator.platform to simulate Windows
    Object.defineProperty(navigator, "platform", {
      writable: true,
      value: "Win32"
    });

    renderHook(() => useGlobalSearchShortcut(onOpen));

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "keydown"
    )?.[1] as (e: KeyboardEvent) => void;

    expect(handler).toBeDefined();

    // Simulate Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false
    });
    Object.defineProperty(event, "target", {
      value: document.body
    });

    handler(event);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not call onOpen when typing in an input", () => {
    renderHook(() => useGlobalSearchShortcut(onOpen));

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "keydown"
    )?.[1] as (e: KeyboardEvent) => void;

    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: false
    });
    Object.defineProperty(event, "target", {
      value: input
    });

    handler(event);

    expect(onOpen).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("does not call onOpen when typing in a textarea", () => {
    renderHook(() => useGlobalSearchShortcut(onOpen));

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "keydown"
    )?.[1] as (e: KeyboardEvent) => void;

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: false
    });
    Object.defineProperty(event, "target", {
      value: textarea
    });

    handler(event);

    expect(onOpen).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it("does not call onOpen when Shift is pressed", () => {
    renderHook(() => useGlobalSearchShortcut(onOpen));

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "keydown"
    )?.[1] as (e: KeyboardEvent) => void;

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: false,
      shiftKey: true
    });
    Object.defineProperty(event, "target", {
      value: document.body
    });

    handler(event);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not register listener when disabled", () => {
    renderHook(() => useGlobalSearchShortcut(onOpen, false));

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});

