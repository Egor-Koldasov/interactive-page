import type {
  AuroraPeaksBackgroundOptions,
  BackgroundController,
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

type Snowflake = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  char: string;
  color: string;
};

type Ridge = {
  baseY: number;
  amplitude: number;
  frequency: number;
  phase: number;
  crestColor: string;
  fillColor: string;
};

function createStar(cols: number, horizon: number): Star {
  return {
    x: randomRange(0, cols),
    y: randomRange(1, Math.max(3, horizon - 4)),
    phase: randomRange(0, Math.PI * 2),
    twinkle: randomRange(0.8, 2.6),
    char: pick(["*", ".", "+", "'"]),
    color: pick([
      "hsl(188 92% 78%)",
      "hsl(58 88% 82%)",
      "hsl(203 84% 86%)",
    ]),
  };
}

function createSnowflake(cols: number, rows: number): Snowflake {
  return {
    x: randomRange(0, cols),
    y: randomRange(0, rows),
    speed: randomRange(0.05, 0.12),
    drift: randomRange(0.25, 0.9),
    phase: randomRange(0, Math.PI * 2),
    char: pick(["*", ".", "+"]),
    color: pick([
      "hsl(190 74% 86%)",
      "hsl(198 68% 80%)",
      "hsl(0 0% 92%)",
    ]),
  };
}

function createRidge(index: number, rows: number, horizon: number): Ridge {
  const depth = index / 2;

  return {
    baseY: horizon + Math.floor(lerp(0, rows * 0.12, depth)),
    amplitude: lerp(7.4, 3.2, depth),
    frequency: lerp(0.08, 0.16, depth),
    phase: Math.random() * Math.PI * 2,
    crestColor: `hsl(${lerp(198, 210, depth).toFixed(1)} 44% ${lerp(74, 62, depth).toFixed(1)}%)`,
    fillColor: `hsl(${lerp(214, 219, depth).toFixed(1)} 38% ${lerp(28, 16, depth).toFixed(1)}%)`,
  };
}

function ridgeHeight(ridge: Ridge, x: number, time: number) {
  return (
    ridge.baseY -
    Math.abs(
      Math.sin(x * ridge.frequency + ridge.phase + time * 0.08) * ridge.amplitude +
        Math.cos(x * ridge.frequency * 0.42 + ridge.phase * 0.7) *
          ridge.amplitude *
          0.42,
    )
  );
}

export function createAuroraPeaksBackground(
  target: HTMLElement,
  options: AuroraPeaksBackgroundOptions = {},
): BackgroundController {
  const { overlay, cols, rows } = createAsciiStage(target, options, {
    color: "#d9f6ff",
    textShadow: "0 0 12px rgba(3, 12, 22, 0.45)",
    background: [
      "radial-gradient(circle at 50% 10%, rgba(91, 255, 198, 0.1), transparent 22%)",
      "radial-gradient(circle at 24% 16%, rgba(97, 182, 255, 0.12), transparent 18%)",
      "linear-gradient(180deg, #04101a 0%, #081c2f 40%, #0a1930 70%, #02050b 100%)",
    ].join(","),
  });
  const horizon = Math.floor(rows * 0.64);
  const stars = Array.from(
    { length: clamp(Math.floor(cols / 2.7), 24, 52) },
    () => createStar(cols, horizon),
  );
  const snowflakes = Array.from(
    { length: clamp(Math.floor(cols / 4.2), 14, 28) },
    () => createSnowflake(cols, rows),
  );
  const ridges = Array.from({ length: 3 }, (_, index) =>
    createRidge(index, rows, horizon),
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
      if (glow < -0.35) {
        continue;
      }

      const char = glow > 0.45 ? "*" : glow > -0.05 ? star.char : ".";
      setCell(
        cells,
        colors,
        Math.floor(star.x),
        Math.floor(star.y),
        char,
        star.color,
      );
    }
  }

  function drawAurora(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (let band = 0; band < 3; band += 1) {
      const baseY = 2 + band * 2;
      const amplitude = 2.2 + band * 0.9;
      const speed = 0.8 + band * 0.18;
      const phase = band * Math.PI * 0.35;

      for (let x = 0; x < cols; x += 1) {
        const curtainY =
          baseY +
          Math.sin(x * 0.11 + time * speed + phase) * amplitude +
          Math.cos(x * 0.05 - time * speed * 0.7 + phase) * 1.3;
        const curtainHeight =
          2 +
          Math.floor(
            (Math.sin(x * 0.18 + time * 1.15 + phase) + 1) * 1.5,
          );

        for (let offset = 0; offset < curtainHeight; offset += 1) {
          const y = Math.round(curtainY + offset);
          if (y < 1 || y >= horizon - 1) {
            continue;
          }

          if (noise2D(x, y, 42 + band) > 0.2 + offset * 0.12) {
            continue;
          }

          const wave = Math.sin(time * 1.4 + x * 0.21 + offset * 0.75 + phase);
          const char =
            offset === 0
              ? "~"
              : wave > 0.4
                ? "|"
                : wave < -0.28
                  ? "/"
                  : "\\";
          const color =
            wave > 0.45
              ? "hsl(160 88% 66%)"
              : wave > -0.1
                ? "hsl(182 80% 62%)"
                : "hsl(196 80% 66%)";
          setCell(cells, colors, x, y, char, color);
        }
      }
    }
  }

  function drawMountains(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (const ridge of ridges) {
      for (let x = 0; x < cols; x += 1) {
        const y = clamp(
          Math.round(ridgeHeight(ridge, x, time)),
          Math.floor(rows * 0.35),
          rows - 2,
        );
        const slope = ridgeHeight(ridge, x + 1, time) - ridgeHeight(ridge, x - 1, time);
        const crestChar = slope > 0.3 ? "/" : slope < -0.3 ? "\\" : "^";

        setCell(cells, colors, x, y, crestChar, ridge.crestColor);

        if ((x + y) % 9 === 0 && noise2D(x, y, 54) > 0.52) {
          setCell(cells, colors, x, y, "*", "hsl(0 0% 96%)");
        }

        for (let fillY = y + 1; fillY < rows; fillY += 1) {
          const depth = (fillY - y) / Math.max(1, rows - y);
          const char =
            depth < 0.18
              ? "A"
              : noise2D(x, fillY, ridge.phase) > 0.68
                ? "^"
                : "#";
          setCell(cells, colors, x, fillY, char, ridge.fillColor);
        }
      }
    }

    for (let x = 1; x < cols - 1; x += 2) {
      const treeBase = rows - 2 - Math.floor(noise2D(x, rows, 62) * 2);
      if (noise2D(x, treeBase, 64) < 0.46) {
        continue;
      }

      setCell(cells, colors, x, treeBase, "Y", "hsl(158 26% 24%)");
      setCell(cells, colors, x, treeBase - 1, "^", "hsl(158 30% 34%)");
    }
  }

  function drawSnow(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    wind: number,
  ) {
    for (const flake of snowflakes) {
      const wrappedX =
        (flake.x + time * cols * flake.speed + wind * flake.drift * 4) % cols;
      const wrappedY =
        (flake.y + time * rows * flake.speed * 0.8) % rows;
      const x = Math.floor((wrappedX + cols) % cols);
      const y = Math.floor((wrappedY + rows) % rows);

      setCell(cells, colors, x, y, flake.char, flake.color);
    }
  }

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.7);
    const wind = Math.sin(time * 0.8) * 0.75 + Math.cos(time * 1.6) * 0.28;
    const { cells, colors } = createGrid(rows, cols);

    drawSky(cells, colors, time);
    drawAurora(cells, colors, time);
    drawMountains(cells, colors, time);
    drawSnow(cells, colors, time, wind);

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
