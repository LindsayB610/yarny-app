import "@testing-library/jest-dom";

const noop = () => {};

const createRect = (): DOMRect => {
  // DOMRect is available in jsdom; fallback to manual object if necessary.
  return typeof DOMRect === "function" ? new DOMRect(0, 0, 0, 0) : ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ""
  } as DOMRect);
};

const createRectList = (): DOMRectList => {
  const rect = createRect();
  return {
    length: 1,
    item: () => rect,
    [0]: rect
  } as unknown as DOMRectList;
};

if (typeof Element !== "undefined") {
  if (!Element.prototype.getClientRects) {
    Element.prototype.getClientRects = function () {
      return createRectList();
    };
  }

  if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = function () {
      return createRect();
    };
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = noop;
  }
}

if (typeof Range !== "undefined") {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function () {
      return createRectList();
    };
  }

  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = function () {
      return createRect();
    };
  }
}

if (typeof document !== "undefined") {
  if (!document.elementFromPoint) {
    document.elementFromPoint = (() => document.body ?? null) as typeof document.elementFromPoint;
  }

  if (!document.caretRangeFromPoint) {
    document.caretRangeFromPoint = ((_x: number, _y: number) => {
      const range = document.createRange();
      range.selectNodeContents(document.body ?? document.createElement("div"));
      range.collapse(true);
      return range;
    }) as typeof document.caretRangeFromPoint;
  }
}
