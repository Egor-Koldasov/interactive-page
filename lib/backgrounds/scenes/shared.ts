import type { AsciiBackgroundOptions } from "@/lib/backgrounds/types";

export type CellMeasurement = {
  width: number;
  height: number;
};

type AsciiStageConfig = {
  background: string;
  color?: string;
  textShadow?: string;
  filter?: string;
};

export type AsciiStage = {
  overlay: HTMLPreElement;
  cols: number;
  rows: number;
  width: number;
  height: number;
  cell: CellMeasurement;
};

const DEFAULT_FONT_FAMILY =
  '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace';

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function noise2D(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

export function pick<T>(list: readonly T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function ensureTargetStyles(element: HTMLElement) {
  const computed = window.getComputedStyle(element);

  if (computed.position === "static") {
    element.style.position = "relative";
  }

  if (!element.style.overflow) {
    element.style.overflow = "hidden";
  }
}

function measureCell(
  element: HTMLElement,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
): CellMeasurement {
  const probe = document.createElement("span");
  probe.textContent = "MMMMMMMMMM";
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.whiteSpace = "pre";
  probe.style.fontFamily = fontFamily;
  probe.style.fontSize = `${fontSize}px`;
  probe.style.lineHeight = String(lineHeight);

  element.appendChild(probe);

  const rect = probe.getBoundingClientRect();
  const width = rect.width / 10;
  const height = rect.height;

  probe.remove();

  return {
    width: width || fontSize * 0.62,
    height: height || fontSize * lineHeight,
  };
}

export function createAsciiStage(
  target: HTMLElement,
  options: AsciiBackgroundOptions = {},
  config: AsciiStageConfig,
): AsciiStage {
  if (!(target instanceof HTMLElement)) {
    throw new Error("ASCII backgrounds require an HTMLElement target.");
  }

  ensureTargetStyles(target);

  const width = target.clientWidth;
  const height = target.clientHeight;

  if (!width || !height) {
    throw new Error("Target element needs a non-zero size before rendering.");
  }

  const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;
  const fontSize =
    options.fontSize ?? clamp(Math.floor(Math.min(width, height) / 22), 8, 18);
  const lineHeight = options.lineHeight ?? 1.04;
  const cell = measureCell(target, fontSize, lineHeight, fontFamily);
  const cols = Math.max(12, Math.floor(width / cell.width));
  const rows = Math.max(8, Math.floor(height / cell.height));

  const overlay = document.createElement("pre");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.margin = "0";
  overlay.style.padding = "0";
  overlay.style.overflow = "hidden";
  overlay.style.whiteSpace = "pre";
  overlay.style.fontFamily = fontFamily;
  overlay.style.fontSize = `${fontSize}px`;
  overlay.style.lineHeight = String(lineHeight);
  overlay.style.letterSpacing = "0";
  overlay.style.userSelect = "none";
  overlay.style.pointerEvents = "none";
  overlay.style.color = config.color ?? "#f5efe5";
  overlay.style.textShadow = config.textShadow ?? "none";
  overlay.style.background = config.background;
  overlay.style.filter = "brightness(0.2)";

  if (config.filter) {
    overlay.style.filter = config.filter;
  }

  target.replaceChildren(overlay);

  return {
    overlay,
    cols,
    rows,
    width,
    height,
    cell,
  };
}

export function createGrid(rows: number, cols: number) {
  return {
    cells: Array.from({ length: rows }, () => Array(cols).fill(" ")),
    colors: Array.from({ length: rows }, () =>
      Array<string | null>(cols).fill(null),
    ),
  };
}

export function setCell(
  cells: string[][],
  colors: Array<Array<string | null>>,
  x: number,
  y: number,
  char: string,
  color: string,
) {
  const rowWidth = cells[0]?.length ?? 0;
  if (y < 0 || y >= cells.length || x < 0 || x >= rowWidth) {
    return;
  }

  cells[y][x] = char;
  colors[y][x] = color;
}

function renderLine(chars: string[], colors: Array<string | null>) {
  let html = "";
  let currentColor: string | null = null;
  let buffer = "";

  function flush() {
    if (!buffer) {
      return;
    }

    const text = escapeHtml(buffer);
    html += currentColor
      ? `<span style="color:${currentColor}">${text}</span>`
      : text;
    buffer = "";
  }

  for (let index = 0; index < chars.length; index += 1) {
    const nextColor = colors[index];
    if (nextColor !== currentColor) {
      flush();
      currentColor = nextColor;
    }

    buffer += chars[index];
  }

  flush();
  return html;
}

export function renderGrid(
  cells: string[][],
  colors: Array<Array<string | null>>,
) {
  return cells
    .map((chars, rowIndex) => renderLine(chars, colors[rowIndex]))
    .join("\n");
}
