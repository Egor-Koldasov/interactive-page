import type {
  BackgroundController,
  WindyForestBackgroundOptions,
} from "@/lib/backgrounds/types";

type Palette = {
  foliage: string;
  foliageWarm: string;
  trunk: string;
  grass: string;
};

type Tree = {
  baseX: number;
  baseY: number;
  topY: number;
  canopyRadius: number;
  depth: number;
  phase: number;
  swayAmount: number;
  palette: Palette;
};

type Particle = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  bob: number;
  phase: number;
  char: string;
  color: string;
};

type CellMeasurement = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function noise2D(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function pick<T>(list: readonly T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function createPalette(depth: number, glow: number): Palette {
  const greenHue = lerp(132, 104, depth);
  const foliageLight = lerp(42, 62, glow);

  return {
    foliage: `hsl(${greenHue.toFixed(1)} 72% ${foliageLight.toFixed(1)}%)`,
    foliageWarm: `hsl(${(greenHue - 18).toFixed(1)} 82% ${(foliageLight + 8).toFixed(1)}%)`,
    trunk: `hsl(${lerp(22, 30, depth).toFixed(1)} 42% ${lerp(24, 42, depth).toFixed(1)}%)`,
    grass: `hsl(${lerp(110, 86, depth).toFixed(1)} 65% ${lerp(38, 55, glow).toFixed(1)}%)`,
  };
}

function createTree(
  index: number,
  totalTrees: number,
  cols: number,
  rows: number,
  horizon: number,
): Tree {
  const depth = (index + 1) / (totalTrees + 1);
  const baseX = Math.floor(lerp(2, cols - 3, Math.random()));
  const trunkHeight = Math.floor(lerp(rows * 0.16, rows * 0.42, Math.random()));
  const canopyRadius = Math.floor(lerp(3, 9, 1 - depth));
  const baseY = horizon + Math.floor(lerp(1, rows * 0.16, Math.random()));
  const phase = Math.random() * Math.PI * 2;
  const swayAmount = lerp(0.6, 3.8, 1 - depth);

  return {
    baseX,
    baseY: clamp(baseY, horizon, rows - 2),
    topY: clamp(baseY - trunkHeight, 2, rows - 6),
    canopyRadius,
    depth,
    phase,
    swayAmount,
    palette: createPalette(depth, Math.random()),
  };
}

function createParticle(cols: number, rows: number, horizon: number): Particle {
  return {
    x: randomRange(0, cols),
    y: randomRange(0, horizon + rows * 0.12),
    speed: randomRange(0.06, 0.22),
    drift: randomRange(0.5, 1.8),
    bob: randomRange(0.15, 0.7),
    phase: randomRange(0, Math.PI * 2),
    char: pick(["*", "+", ".", "`", "o"]),
    color: pick([
      "hsl(42 96% 72%)",
      "hsl(26 100% 72%)",
      "hsl(58 92% 76%)",
      "hsl(150 78% 70%)",
    ]),
  };
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

function setCell(
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

export function createWindyForestBackground(
  target: HTMLElement,
  options: WindyForestBackgroundOptions = {},
): BackgroundController {
  if (!(target instanceof HTMLElement)) {
    throw new Error("createWindyForestBackground requires an HTMLElement target.");
  }

  ensureTargetStyles(target);

  const width = target.clientWidth;
  const height = target.clientHeight;

  if (!width || !height) {
    throw new Error("Target element needs a non-zero size before rendering.");
  }

  const fontFamily =
    options.fontFamily ??
    '"Cascadia Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  const fontSize =
    options.fontSize ?? clamp(Math.floor(Math.min(width, height) / 22), 8, 18);
  const lineHeight = options.lineHeight ?? 1.04;
  const cell = measureCell(target, fontSize, lineHeight, fontFamily);
  const cols = Math.max(12, Math.floor(width / cell.width));
  const rows = Math.max(8, Math.floor(height / cell.height));
  const horizon = Math.floor(rows * 0.66);
  const treeCount = clamp(Math.floor(cols / 11), 4, 14);
  const particles: Particle[] = [];
  const trees: Tree[] = [];
  let rafId = 0;
  let running = false;
  let startTime = performance.now();

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
  overlay.style.color = "#dff6f4";
  overlay.style.textShadow = "0 0 10px rgba(11, 14, 28, 0.35)";
  overlay.style.background = [
    "radial-gradient(circle at 20% 15%, rgba(255, 183, 77, 0.16), transparent 30%)",
    "radial-gradient(circle at 80% 22%, rgba(120, 221, 196, 0.18), transparent 28%)",
    "linear-gradient(180deg, #18314f 0%, #274060 28%, #49626d 56%, #1f3322 100%)",
  ].join(",");

  target.replaceChildren(overlay);

  for (
    let particleIndex = 0;
    particleIndex < clamp(Math.floor(cols / 5), 8, 24);
    particleIndex += 1
  ) {
    particles.push(createParticle(cols, rows, horizon));
  }

  for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
    trees.push(createTree(treeIndex, treeCount, cols, rows, horizon));
  }

  trees.sort((left, right) => left.depth - right.depth);

  function drawSky(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    wind: number,
  ) {
    for (let cloud = 0; cloud < 3; cloud += 1) {
      const cloudY = 2 + cloud * Math.max(2, Math.floor(horizon / 5));
      const cloudWidth = Math.max(8, Math.floor(cols / (5 + cloud)));
      const cloudX =
        Math.floor(
          ((time * (0.9 + cloud * 0.3)) + cloud * cols * 0.37) %
            (cols + cloudWidth * 2),
        ) - cloudWidth;

      for (let x = 0; x < cloudWidth; x += 1) {
        const px = cloudX + x;
        const wobble = Math.sin(time * 1.2 + x * 0.45 + cloud) * 0.8;
        const py = Math.round(cloudY + wobble);
        const char = x % 7 === 0 ? "~" : x % 5 === 0 ? "=" : "-";
        const color = cloud === 0 ? "hsl(38 90% 74%)" : "hsl(188 55% 78%)";

        if (noise2D(px, py, cloud + 1) > 0.18) {
          setCell(cells, colors, px, py, char, color);
        }
      }
    }

    for (let x = 0; x < cols; x += 1) {
      if ((x + Math.floor(time * 7)) % 17 === 0) {
        const sparkleY =
          1 +
          Math.floor((Math.sin(x * 0.32 + time) + 1) * Math.max(1, horizon * 0.18));
        const sparkleSeed = noise2D(x, sparkleY, 11);
        const sparkleChar = sparkleSeed > 0.66 ? "." : sparkleSeed > 0.33 ? "'" : "`";
        setCell(cells, colors, x, sparkleY, sparkleChar, "hsl(54 92% 78%)");
      }

      if ((x + Math.floor(time * 5)) % 13 === 0) {
        const breezeY = Math.max(
          2,
          horizon - 3 + Math.round(Math.sin(x * 0.4 + time * 1.4) * 1.5),
        );
        const breezeSeed = noise2D(x, breezeY, 15);
        const breezeChar =
          breezeSeed > 0.75
            ? "~"
            : breezeSeed > 0.5
              ? "-"
              : breezeSeed > 0.25
                ? "="
                : "_";

        setCell(
          cells,
          colors,
          x,
          breezeY,
          breezeChar,
          wind > 0 ? "hsl(170 56% 70%)" : "hsl(205 48% 72%)",
        );
      }
    }
  }

  function drawTree(
    cells: string[][],
    colors: Array<Array<string | null>>,
    tree: Tree,
    time: number,
    wind: number,
  ) {
    const trunkHeight = tree.baseY - tree.topY;
    const sway =
      Math.sin(time * 1.7 + tree.phase) * tree.swayAmount +
      wind * (1.2 - tree.depth * 0.75);
    let previousX = tree.baseX;

    for (let y = 0; y <= trunkHeight; y += 1) {
      const progress = y / Math.max(1, trunkHeight);
      const bend = Math.round(
        tree.baseX + sway * Math.pow(1 - progress, 1.6) * 0.45,
      );
      const row = tree.baseY - y;
      let char = "|";

      if (bend > previousX) {
        char = "/";
      } else if (bend < previousX) {
        char = "\\";
      }

      previousX = bend;
      setCell(cells, colors, bend, row, char, tree.palette.trunk);

      if (y > trunkHeight * 0.2 && noise2D(bend, row, tree.phase) > 0.84) {
        const branchSide =
          noise2D(bend + 17, row + 17, tree.phase * 2) > 0.5 ? 1 : -1;
        setCell(
          cells,
          colors,
          bend + branchSide,
          row,
          "'",
          tree.palette.foliageWarm,
        );
      }
    }

    const canopyCenterX = Math.round(tree.baseX + sway);
    const canopyMidY = tree.topY + Math.floor(trunkHeight * 0.18);
    const radiusY = Math.max(2, Math.floor(tree.canopyRadius * 0.66));

    for (let offsetY = -radiusY; offsetY <= radiusY; offsetY += 1) {
      const spread = tree.canopyRadius - Math.abs(offsetY) * 0.75;

      for (let offsetX = -Math.ceil(spread); offsetX <= Math.ceil(spread); offsetX += 1) {
        const noise =
          Math.sin(offsetX * 1.1 + tree.phase) +
          Math.cos(offsetY * 1.4 + tree.phase * 0.8);

        if (noise < -0.25 || noise2D(offsetX, offsetY, tree.phase * 10) > 0.88) {
          continue;
        }

        const leafX =
          canopyCenterX +
          offsetX +
          Math.round(
            wind *
              (1 - tree.depth) *
              0.6 *
              (1 - Math.abs(offsetY) / (radiusY + 1)),
          );
        const leafY = canopyMidY + offsetY;
        const glow = Math.sin(
          time * 2.1 + offsetX * 0.7 + offsetY * 0.5 + tree.phase,
        );
        const charSeed = noise2D(
          offsetX + tree.baseX,
          offsetY + tree.topY,
          tree.phase * 7,
        );
        const char =
          glow > 0.45
            ? charSeed > 0.66
              ? "*"
              : charSeed > 0.33
                ? "+"
                : "x"
            : charSeed > 0.8
              ? "&"
              : charSeed > 0.6
                ? "Y"
                : charSeed > 0.4
                  ? "V"
                  : charSeed > 0.2
                    ? "w"
                    : "^";
        const color =
          glow > 0.25 ? tree.palette.foliageWarm : tree.palette.foliage;

        setCell(cells, colors, leafX, leafY, char, color);
      }
    }
  }

  function drawGround(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    wind: number,
  ) {
    for (let y = horizon; y < rows; y += 1) {
      const density = (y - horizon) / Math.max(1, rows - horizon);

      for (let x = 0; x < cols; x += 1) {
        if (noise2D(x, y, 4) > 0.12 + density * 0.24) {
          continue;
        }

        const sway =
          Math.sin(time * 3 + x * 0.38 + y * 0.2) * (1.2 + density * 2.4) +
          wind * 0.9;
        const charSeed = noise2D(x, y, 8);
        const char =
          sway > 1.15
            ? "/"
            : sway < -1.15
              ? "\\"
              : charSeed > 0.75
                ? "|"
                : charSeed > 0.5
                  ? "'"
                  : charSeed > 0.25
                    ? ","
                    : ";";
        const green = 92 + Math.sin(x * 0.08 + time) * 18;
        const light = 34 + density * 21 + Math.cos(y + x * 0.15) * 4;
        const color = `hsl(${green.toFixed(1)} 60% ${light.toFixed(1)}%)`;
        setCell(cells, colors, x, y, char, color);
      }
    }

    const ridgeY = horizon - 1;
    for (let ridgeX = 0; ridgeX < cols; ridgeX += 1) {
      const hill = Math.round(
        ridgeY +
          Math.sin(ridgeX * 0.12) * 1.5 +
          Math.cos(ridgeX * 0.03 + time * 0.3) * 1.2,
      );
      setCell(cells, colors, ridgeX, hill, "_", "hsl(138 30% 30%)");
    }
  }

  function drawParticles(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    wind: number,
  ) {
    for (const particle of particles) {
      const wrappedX =
        (particle.x + time * cols * particle.speed + wind * particle.drift * 4) %
        cols;
      const wrappedY =
        (particle.y + Math.sin(time * 2.8 + particle.phase) * particle.bob) %
        Math.max(1, horizon + 2);
      const x = Math.floor((wrappedX + cols) % cols);
      const y = Math.floor(
        (wrappedY + Math.max(1, horizon + 2)) % Math.max(1, horizon + 2),
      );

      setCell(cells, colors, x, y, particle.char, particle.color);
    }
  }

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.8);
    const wind =
      Math.sin(time * 0.9) * 0.8 + Math.sin(time * 2.4 + 1.2) * 0.45;
    const cells = Array.from({ length: rows }, () => Array(cols).fill(" "));
    const colors = Array.from({ length: rows }, () =>
      Array<string | null>(cols).fill(null),
    );

    drawSky(cells, colors, time, wind);
    drawGround(cells, colors, time, wind);

    for (const tree of trees) {
      drawTree(cells, colors, tree, time, wind);
    }

    drawParticles(cells, colors, time, wind);

    const htmlLines: string[] = [];
    for (let row = 0; row < rows; row += 1) {
      htmlLines.push(renderLine(cells[row], colors[row]));
    }

    overlay.innerHTML = htmlLines.join("\n");
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) {
      return;
    }

    running = true;
    startTime = performance.now();
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function destroy() {
    stop();
    overlay.remove();
  }

  start();

  return {
    start,
    stop,
    destroy,
  };
}
