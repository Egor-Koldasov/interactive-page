import type {
  BackgroundController,
  FireBackgroundOptions,
} from "@/lib/backgrounds/types";
import {
  clamp,
  createAsciiStage,
  createGrid,
  noise2D,
  pick,
  randomRange,
  renderGrid,
  setCell,
} from "@/lib/backgrounds/scenes/shared";

type Ember = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  char: string;
  color: string;
};

type SmokeThread = {
  x: number;
  y: number;
  speed: number;
  sway: number;
  phase: number;
  length: number;
  color: string;
};

function createEmber(cols: number, rows: number, flameTop: number): Ember {
  return {
    x: randomRange(0, cols),
    y: randomRange(flameTop, rows),
    speed: randomRange(0.18, 0.42),
    drift: randomRange(0.25, 1.1),
    phase: randomRange(0, Math.PI * 2),
    char: pick(["*", ".", "+", ":"]),
    color: pick([
      "hsl(46 100% 76%)",
      "hsl(30 100% 70%)",
      "hsl(12 92% 64%)",
    ]),
  };
}

function createSmokeThread(cols: number, flameTop: number): SmokeThread {
  return {
    x: randomRange(0, cols),
    y: randomRange(2, flameTop + 2),
    speed: randomRange(0.04, 0.12),
    sway: randomRange(0.4, 1.5),
    phase: randomRange(0, Math.PI * 2),
    length: Math.floor(randomRange(3, 7)),
    color: pick([
      "hsl(24 12% 42%)",
      "hsl(18 10% 34%)",
      "hsl(0 0% 38%)",
    ]),
  };
}

function flameChar(intensity: number) {
  if (intensity > 1.62) {
    return "@";
  }

  if (intensity > 1.42) {
    return "#";
  }

  if (intensity > 1.2) {
    return "W";
  }

  if (intensity > 1.02) {
    return "Y";
  }

  if (intensity > 0.84) {
    return "|";
  }

  if (intensity > 0.68) {
    return "!";
  }

  if (intensity > 0.52) {
    return ":";
  }

  return ".";
}

function flameColor(intensity: number) {
  if (intensity > 1.58) {
    return "hsl(52 100% 86%)";
  }

  if (intensity > 1.32) {
    return "hsl(36 100% 76%)";
  }

  if (intensity > 1.08) {
    return "hsl(22 100% 66%)";
  }

  if (intensity > 0.84) {
    return "hsl(12 88% 58%)";
  }

  return "hsl(3 72% 44%)";
}

function drawFlames(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  rows: number,
  flameTop: number,
  time: number,
) {
  const flameHeight = Math.max(1, rows - flameTop);

  for (let y = flameTop; y < rows; y += 1) {
    const rise = (rows - 1 - y) / flameHeight;

    for (let x = 0; x < cols; x += 1) {
      const turbulence =
        Math.sin(x * 0.24 + time * 5.2 - rise * 7.5) * 0.4 +
        Math.cos(x * 0.1 - time * 2.6 + rise * 11) * 0.3 +
        Math.sin(x * 0.05 + time * 1.4 + rise * 18) * 0.22;
      const noise = noise2D(x * 0.7 + time * 0.8, y * 0.9, 71) * 0.65;
      const core = 1.72 - rise * 2.05;
      const pulse = Math.sin(time * 4.4 + x * 0.18) * 0.18;
      const intensity = core + turbulence + noise + pulse;

      if (intensity < 0.5) {
        continue;
      }

      setCell(cells, colors, x, y, flameChar(intensity), flameColor(intensity));
    }
  }
}

function drawEmbers(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  rows: number,
  flameTop: number,
  embers: Ember[],
  time: number,
) {
  for (const ember of embers) {
    const x =
      ember.x +
      Math.sin(time * 1.8 + ember.phase) * ember.drift +
      time * cols * 0.02;
    const y =
      ember.y -
      time * rows * ember.speed +
      Math.cos(time * 2.4 + ember.phase) * 0.5;

    const wrappedX = ((x % cols) + cols) % cols;
    const wrappedY =
      ((y - 1) % Math.max(1, rows - flameTop + 2) + Math.max(1, rows - flameTop + 2)) %
        Math.max(1, rows - flameTop + 2) +
      flameTop -
      1;

    setCell(
      cells,
      colors,
      Math.floor(wrappedX),
      clamp(Math.floor(wrappedY), 1, rows - 2),
      ember.char,
      ember.color,
    );
  }
}

function drawSmoke(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  flameTop: number,
  threads: SmokeThread[],
  time: number,
) {
  for (const thread of threads) {
    for (let segmentIndex = 0; segmentIndex < thread.length; segmentIndex += 1) {
      const progress = segmentIndex / Math.max(1, thread.length - 1);
      const x =
        thread.x +
        Math.sin(time * 1.1 + thread.phase + progress * 2.4) * thread.sway +
        progress * 1.8;
      const y =
        thread.y -
        time * cols * thread.speed * 0.04 -
        segmentIndex;
      const density = noise2D(x, y, 83 + segmentIndex);

      if (density > 0.55 + progress * 0.18) {
        continue;
      }

      const char = progress < 0.3 ? "~" : progress < 0.7 ? "-" : ".";
      setCell(
        cells,
        colors,
        Math.floor(x),
        clamp(Math.floor(y), 1, flameTop + 1),
        char,
        thread.color,
      );
    }
  }
}

function drawCoals(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  rows: number,
  time: number,
) {
  for (let x = 0; x < cols; x += 1) {
    const pulse = Math.sin(time * 3.8 + x * 0.35) + noise2D(x, rows - 1, 95);
    const char = pulse > 1.25 ? "#" : pulse > 0.85 ? "=" : "_";
    const color =
      pulse > 1.25 ? "hsl(28 100% 62%)" : pulse > 0.85 ? "hsl(12 84% 42%)" : "hsl(8 62% 24%)";
    setCell(cells, colors, x, rows - 1, char, color);
  }
}

export function createFireBackground(
  target: HTMLElement,
  options: FireBackgroundOptions = {},
): BackgroundController {
  const { overlay, cols, rows } = createAsciiStage(target, options, {
    color: "#ffd8bc",
    textShadow: "0 0 10px rgba(40, 6, 2, 0.4)",
    background: [
      "radial-gradient(circle at 50% 82%, rgba(255, 136, 61, 0.18), transparent 24%)",
      "radial-gradient(circle at 18% 22%, rgba(118, 32, 12, 0.12), transparent 22%)",
      "radial-gradient(circle at 82% 28%, rgba(255, 92, 0, 0.1), transparent 18%)",
      "linear-gradient(180deg, #070708 0%, #140a08 34%, #2a0e08 64%, #090405 100%)",
    ].join(","),
    filter: "brightness(0.19)",
  });
  const flameTop = clamp(Math.floor(rows * 0.44), 3, rows - 4);
  const embers = Array.from(
    { length: clamp(Math.floor(cols / 2.4), 18, 56) },
    () => createEmber(cols, rows, flameTop),
  );
  const smokeThreads = Array.from(
    { length: clamp(Math.floor(cols / 8), 5, 12) },
    () => createSmokeThread(cols, flameTop),
  );
  let rafId = 0;
  let running = false;
  let startTime = performance.now();

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.9);
    const { cells, colors } = createGrid(rows, cols);

    drawSmoke(cells, colors, cols, flameTop, smokeThreads, time);
    drawFlames(cells, colors, cols, rows, flameTop, time);
    drawEmbers(cells, colors, cols, rows, flameTop, embers, time);
    drawCoals(cells, colors, cols, rows, time);

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
