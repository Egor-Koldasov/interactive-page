import type {
  BackgroundController,
  MoonlitTideBackgroundOptions,
} from "@/lib/backgrounds/types";
import {
  clamp,
  createAsciiStage,
  createGrid,
  lerp,
  noise2D,
  pick,
  randomRange,
  renderGrid,
  setCell,
} from "@/lib/backgrounds/scenes/shared";

type Star = {
  x: number;
  y: number;
  phase: number;
  twinkle: number;
  char: string;
  color: string;
};

type Foam = {
  x: number;
  y: number;
  speed: number;
  bob: number;
  phase: number;
  char: string;
  color: string;
};

type Reed = {
  x: number;
  baseY: number;
  height: number;
  lean: number;
  phase: number;
  color: string;
};

function createStar(cols: number, horizon: number): Star {
  return {
    x: randomRange(0, cols),
    y: randomRange(1, Math.max(3, horizon * 0.42)),
    phase: randomRange(0, Math.PI * 2),
    twinkle: randomRange(1.2, 3.2),
    char: pick(["*", ".", "'", "`"]),
    color: pick([
      "hsl(54 94% 82%)",
      "hsl(199 92% 80%)",
      "hsl(43 88% 76%)",
    ]),
  };
}

function createFoam(cols: number, rows: number, horizon: number): Foam {
  return {
    x: randomRange(0, cols),
    y: randomRange(horizon, rows - 1),
    speed: randomRange(0.04, 0.12),
    bob: randomRange(0.15, 0.55),
    phase: randomRange(0, Math.PI * 2),
    char: pick(["*", ".", "o", "+"]),
    color: pick([
      "hsl(188 88% 78%)",
      "hsl(48 82% 74%)",
      "hsl(201 96% 86%)",
    ]),
  };
}

function createReed(cols: number, rows: number, side: "left" | "right"): Reed {
  const minX = side === "left" ? 0 : Math.floor(cols * 0.82);
  const maxX = side === "left" ? Math.max(1, Math.floor(cols * 0.18)) : cols - 1;

  return {
    x: Math.floor(randomRange(minX, maxX)),
    baseY: rows - 1 - Math.floor(randomRange(0, 3)),
    height: Math.floor(randomRange(4, 9)),
    lean: randomRange(side === "left" ? 0.4 : -1.2, side === "left" ? 1.2 : -0.4),
    phase: randomRange(0, Math.PI * 2),
    color: pick([
      "hsl(152 46% 45%)",
      "hsl(138 42% 41%)",
      "hsl(164 34% 56%)",
    ]),
  };
}

export function createMoonlitTideBackground(
  target: HTMLElement,
  options: MoonlitTideBackgroundOptions = {},
): BackgroundController {
  const { overlay, cols, rows } = createAsciiStage(target, options, {
    color: "#d8edf8",
    textShadow: "0 0 10px rgba(4, 8, 22, 0.35)",
    background: [
      "radial-gradient(circle at 76% 18%, rgba(255, 227, 165, 0.2), transparent 18%)",
      "radial-gradient(circle at 45% 68%, rgba(97, 188, 255, 0.18), transparent 24%)",
      "linear-gradient(180deg, #07111f 0%, #102541 36%, #17395d 62%, #0a1826 100%)",
    ].join(","),
  });
  const horizon = Math.floor(rows * 0.48);
  const moonX = Math.floor(cols * 0.77);
  const moonY = Math.max(3, Math.floor(rows * 0.16));
  const moonRadius = clamp(Math.floor(cols / 12), 3, 7);
  const stars = Array.from(
    { length: clamp(Math.floor(cols / 3.2), 18, 40) },
    () => createStar(cols, horizon),
  );
  const foam = Array.from(
    { length: clamp(Math.floor(cols / 5), 10, 24) },
    () => createFoam(cols, rows, horizon),
  );
  const reeds = Array.from(
    { length: clamp(Math.floor(cols / 15), 3, 7) },
    (_, index) => createReed(cols, rows, index % 2 === 0 ? "left" : "right"),
  );
  let rafId = 0;
  let running = false;
  let startTime = performance.now();

  function drawSky(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (const star of stars) {
      const glow = Math.sin(time * star.twinkle + star.phase);
      if (glow < -0.2) {
        continue;
      }

      const char = glow > 0.55 ? "*" : glow > 0 ? star.char : ".";
      setCell(
        cells,
        colors,
        Math.floor(star.x),
        Math.floor(star.y),
        char,
        star.color,
      );
    }

    for (let cloud = 0; cloud < 2; cloud += 1) {
      const cloudY = 2 + cloud * Math.max(2, Math.floor(horizon / 7));
      const cloudWidth = Math.max(12, Math.floor(cols / (4.4 + cloud)));
      const cloudX =
        Math.floor(
          (time * (0.55 + cloud * 0.12) + cloud * cols * 0.37) %
            (cols + cloudWidth * 2),
        ) - cloudWidth;

      for (let x = 0; x < cloudWidth; x += 1) {
        const px = cloudX + x;
        const wobble = Math.sin(time * 0.8 + x * 0.28 + cloud) * 0.7;
        const py = Math.round(cloudY + wobble);

        if (noise2D(px, py, 18 + cloud) > 0.16) {
          continue;
        }

        const char = x % 7 === 0 ? "~" : x % 5 === 0 ? "=" : "-";
        const color = cloud === 0 ? "hsl(214 34% 80%)" : "hsl(202 36% 72%)";
        setCell(cells, colors, px, py, char, color);
      }
    }
  }

  function drawMoon(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (let offsetY = -moonRadius; offsetY <= moonRadius; offsetY += 1) {
      const spread = Math.ceil(moonRadius * 1.3);
      for (let offsetX = -spread; offsetX <= spread; offsetX += 1) {
        const distance = Math.hypot(offsetX / 1.25, offsetY) / moonRadius;
        if (distance > 1) {
          continue;
        }

        const crater = noise2D(offsetX + moonX, offsetY + moonY, 22);
        const glow = Math.sin(time * 0.8 + offsetX * 0.5 + offsetY * 0.25);
        const char =
          distance < 0.36 && crater > 0.75
            ? "."
            : glow > 0.6
              ? "@"
              : glow > 0.1
                ? "O"
                : "o";
        const color =
          crater > 0.82 && distance < 0.54
            ? "hsl(43 66% 74%)"
            : "hsl(46 92% 80%)";
        setCell(cells, colors, moonX + offsetX, moonY + offsetY, char, color);
      }
    }
  }

  function drawWater(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    tide: number,
  ) {
    for (let y = horizon; y < rows; y += 1) {
      const depth = (y - horizon) / Math.max(1, rows - horizon - 1);

      for (let x = 0; x < cols; x += 1) {
        const wave =
          Math.sin(x * lerp(0.16, 0.42, depth) - time * (2.3 - depth) + y * 0.55) +
          Math.cos(x * 0.08 + time * 1.2 + depth * 6.4) * 0.55 +
          tide * 0.3;

        const char =
          wave > 1
            ? "~"
            : wave > 0.4
              ? "="
              : wave > -0.2
                ? "-"
                : "_";
        const light = lerp(34, 18, depth) + Math.max(0, wave) * 6;
        const color =
          wave > 0.92
            ? `hsl(191 80% ${light.toFixed(1)}%)`
            : `hsl(${lerp(212, 201, depth).toFixed(1)} 56% ${light.toFixed(1)}%)`;

        setCell(cells, colors, x, y, char, color);
      }
    }

    for (let y = horizon; y < rows; y += 1) {
      const depth = (y - horizon) / Math.max(1, rows - horizon - 1);
      const shimmerX = moonX + Math.sin(time * 2 + y * 0.35) * 1.8;
      const spread = lerp(moonRadius * 2.4, 1.2, depth);

      for (
        let x = Math.floor(shimmerX - spread);
        x <= Math.ceil(shimmerX + spread);
        x += 1
      ) {
        if (noise2D(x, y, 27) > 0.38 + depth * 0.2) {
          continue;
        }

        const char =
          depth < 0.28
            ? "|"
            : noise2D(x, y, 29) > 0.5
              ? "!"
              : ":";
        setCell(cells, colors, x, y, char, "hsl(48 90% 74%)");
      }
    }
  }

  function drawShore(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    tide: number,
  ) {
    for (const reed of reeds) {
      let previousX = reed.x;
      const sway = Math.sin(time * 1.8 + reed.phase) * reed.lean + tide * 0.4;

      for (let step = 0; step < reed.height; step += 1) {
        const progress = step / Math.max(1, reed.height - 1);
        const x = Math.round(reed.x + sway * progress * 1.4);
        const y = reed.baseY - step;
        const char = x > previousX ? "/" : x < previousX ? "\\" : "|";

        setCell(cells, colors, x, y, char, reed.color);

        if (step > 1 && step < reed.height - 1 && noise2D(x, y, reed.phase) > 0.72) {
          setCell(
            cells,
            colors,
            x + (noise2D(x + 5, y + 7, reed.phase) > 0.5 ? 1 : -1),
            y,
            "'",
            "hsl(54 72% 68%)",
          );
        }

        previousX = x;
      }
    }

    for (let rock = 0; rock < 4; rock += 1) {
      const rockX =
        rock < 2 ? 2 + rock * 3 : cols - 4 - (rock - 2) * 3;
      const rockY = rows - 2 - (rock % 2);
      const rockChar = rock % 2 === 0 ? "#" : "%";
      setCell(cells, colors, rockX, rockY, rockChar, "hsl(210 20% 22%)");
      setCell(cells, colors, rockX + 1, rockY, rockChar, "hsl(210 18% 18%)");
    }
  }

  function drawFoam(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    tide: number,
  ) {
    for (const particle of foam) {
      const wrappedX = (particle.x + time * cols * particle.speed) % cols;
      const wrappedY =
        particle.y +
        Math.sin(time * 2.4 + particle.phase) * particle.bob +
        tide * 0.6;
      const x = Math.floor((wrappedX + cols) % cols);
      const y = clamp(Math.floor(wrappedY), horizon, rows - 1);

      setCell(cells, colors, x, y, particle.char, particle.color);
    }
  }

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.72);
    const tide = Math.sin(time * 0.7) * 0.8 + Math.cos(time * 1.4 + 0.8) * 0.35;
    const { cells, colors } = createGrid(rows, cols);

    drawSky(cells, colors, time);
    drawMoon(cells, colors, time);
    drawWater(cells, colors, time, tide);
    drawShore(cells, colors, time, tide);
    drawFoam(cells, colors, time, tide);

    overlay.innerHTML = renderGrid(cells, colors);
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
