import { useEffect, useRef } from "react";

/**
 * Performance metrics tracking hook
 * Tracks time-to-first-keystroke and snippet switch latency
 */

interface PerformanceMetrics {
  timeToFirstKeystroke?: number;
  snippetSwitchLatency?: number;
  frameJank?: number[];
}

export function usePerformanceMetrics() {
  const metricsRef = useRef<PerformanceMetrics>({});
  const editorMountTimeRef = useRef<number | null>(null);
  const snippetSwitchStartRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // Track editor mount time
  useEffect(() => {
    editorMountTimeRef.current = performance.now();
  }, []);

  // Monitor frame times for jank detection
  useEffect(() => {
    let lastFrameTime = performance.now();

    const measureFrame = (currentTime: number) => {
      const frameTime = currentTime - lastFrameTime;
      frameTimesRef.current.push(frameTime);

      // Keep only last 60 frames (~1 second at 60fps)
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Detect jank (> 16ms = dropped frame at 60fps)
      const jankFrames = frameTimesRef.current.filter((time) => time > 16);
      metricsRef.current.frameJank = jankFrames;

      lastFrameTime = currentTime;
      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  /**
   * Record time to first keystroke
   * Call this when the user first types in the editor
   */
  const recordFirstKeystroke = () => {
    if (editorMountTimeRef.current && !metricsRef.current.timeToFirstKeystroke) {
      const timeToFirstKeystroke =
        performance.now() - editorMountTimeRef.current;
      metricsRef.current.timeToFirstKeystroke = timeToFirstKeystroke;

      // Log if exceeds budget (800ms)
      if (timeToFirstKeystroke > 800) {
        console.warn(
          `Time to first keystroke (${timeToFirstKeystroke.toFixed(2)}ms) exceeds budget (800ms)`
        );
      }
    }
  };

  /**
   * Start tracking snippet switch
   * Call this when switching to a new snippet
   */
  const startSnippetSwitch = () => {
    snippetSwitchStartRef.current = performance.now();
  };

  /**
   * End tracking snippet switch and record latency
   * Call this when the snippet is interactive (content loaded, editor ready)
   */
  const endSnippetSwitch = () => {
    if (snippetSwitchStartRef.current) {
      const latency = performance.now() - snippetSwitchStartRef.current;
      metricsRef.current.snippetSwitchLatency = latency;
      snippetSwitchStartRef.current = null;

      // Log if exceeds budget (300ms)
      if (latency > 300) {
        console.warn(
          `Snippet switch latency (${latency.toFixed(2)}ms) exceeds budget (300ms)`
        );
      }
    }
  };

  /**
   * Get current metrics
   */
  const getMetrics = (): PerformanceMetrics => {
    return { ...metricsRef.current };
  };

  /**
   * Check if performance budgets are met
   */
  const checkBudgets = (): {
    timeToFirstKeystroke: boolean;
    snippetSwitchLatency: boolean;
    noJank: boolean;
  } => {
    const metrics = metricsRef.current;
    return {
      timeToFirstKeystroke:
        !metrics.timeToFirstKeystroke || metrics.timeToFirstKeystroke <= 800,
      snippetSwitchLatency:
        !metrics.snippetSwitchLatency || metrics.snippetSwitchLatency <= 300,
      noJank:
        !metrics.frameJank || metrics.frameJank.length === 0
    };
  };

  return {
    recordFirstKeystroke,
    startSnippetSwitch,
    endSnippetSwitch,
    getMetrics,
    checkBudgets
  };
}

