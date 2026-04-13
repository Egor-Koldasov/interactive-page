import type {
  BackgroundController,
  DesertDunesBackgroundOptions,
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

type DuneLayer = {
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  ridgeColor: string;
  fillColor: string;
  highlightColor: string;
};

type SandParticle = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  char: string;
  color: string;
};

type Cactus = {
  x: number;
  height: number;
  armHeight: number;
  armSide: 1 | -1;
  phase: number;
  color: string;
};

function createDuneLayer(index: number, rows: number, horizon: number): DuneLayer {
  const depth = index / 3;

  return {
    baseY: horizon + Math.floor(lerp(1, rows * 0.18, depth)),
    amplitude: lerp(5.6, 1.8, depth),
    frequency: lerp(0.06, 0.14, depth),
    speed: lerp(0.35, 0.12, depth),
    phase: Math.random() * Math.PI * 2,
    ridgeColor: `hsl(${lerp(36, 26, depth).toFixed(1)} 74% ${lerp(58, 45, depth).toFixed(1)}%)`,
    fillColor: `hsl(${lerp(30, 22, depth).toFixed(1)} 68% ${lerp(48, 28, depth).toFixed(1)}%)`,
    highlightColor: `hsl(${lerp(42, 32, depth).toFixed(1)} 82% ${lerp(68, 40, depth).toFixed(1)}%)`,
  };
}

function duneHeight(layer: DuneLayer, x: number, time: number) {
  return (
    layer.baseY +
    Math.sin(x * layer.frequency + layer.phase + time * layer.speed) * layer.amplitude +
    Math.cos(
      x * layer.frequency * 0.55 - time * layer.speed * 0.7 + layer.phase * 0.8,
    ) *
      layer.amplitude *
      0.45
  );
}

function createParticle(cols: number, horizon: number): SandParticle {
  return {
    x: randomRange(0, cols),
    y: randomRange(1, horizon + 3),
    speed: randomRange(0.07, 0.22),
    drift: randomRange(0.6, 1.5),
    phase: randomRange(0, Math.PI * 2),
    char: pick([".", "`", "'", ":"]),
    color: pick([
      "hsl(42 92% 74%)",
      "hsl(27 95% 68%)",
      "hsl(48 88% 78%)",
    ]),
  };
}

function createCactus(cols: number): Cactus {
  return {
    x: Math.floor(randomRange(cols * 0.12, cols * 0.88)),
    height: Math.floor(randomRange(4, 8)),
    armHeight: Math.floor(randomRange(2, 5)),
    armSide: Math.random() > 0.5 ? 1 : -1,
    phase: randomRange(0, Math.PI * 2),
    color: pick([
      "hsl(126 28% 18%)",
      "hsl(112 30% 16%)",
      "hsl(138 24% 20%)",
    ]),
  };
}

export function createDesertDunesBackground(
  target: HTMLElement,
  options: DesertDunesBackgroundOptions = {},
): BackgroundController {
  const { overlay, cols, rows } = createAsciiStage(target, options, {
    color: "#f8e6c8",
    textShadow: "0 0 10px rgba(42, 12, 4, 0.2)",
    background: [
      "radial-gradient(circle at 22% 18%, rgba(255, 218, 131, 0.26), transparent 18%)",
      "radial-gradient(circle at 72% 38%, rgba(255, 149, 96, 0.14), transparent 24%)",
      "linear-gradient(180deg, #341311 0%, #753425 32%, #b76533 62%, #2c160d 100%)",
    ].join(","),
  });
  const horizon = Math.floor(rows * 0.54);
  const sunX = Math.floor(cols * 0.22);
  const sunY = Math.max(4, Math.floor(rows * 0.18));
  const sunRadius = clamp(Math.floor(cols / 11), 4, 8);
  const duneLayers = Array.from({ length: 4 }, (_, index) =>
    createDuneLayer(index, rows, horizon),
  );
  const sandParticles = Array.from(
    { length: clamp(Math.floor(cols / 4), 16, 32) },
    () => createParticle(cols, horizon),
  );
  const cacti = Array.from(
    { length: clamp(Math.floor(cols / 24), 2, 4) },
    () => createCactus(cols),
  );
  let rafId = 0;
  let running = false;
  let startTime = performance.now();

  function frontDuneY(x: number, time: number) {
    return clamp(
      Math.round(duneHeight(duneLayers[duneLayers.length - 1], x, time)),
      horizon,
      rows - 2,
    );
  }

  function drawSky(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (let offsetY = -sunRadius; offsetY <= sunRadius; offsetY += 1) {
      const spread = Math.ceil(sunRadius * 1.25);
      for (let offsetX = -spread; offsetX <= spread; offsetX += 1) {
        const distance = Math.hypot(offsetX / 1.25, offsetY) / sunRadius;
        if (distance > 1) {
          continue;
        }

        const char = distance < 0.45 ? "@" : distance < 0.7 ? "O" : "o";
        const color =
          distance < 0.55 ? "hsl(46 96% 74%)" : "hsl(34 92% 68%)";
        setCell(cells, colors, sunX + offsetX, sunY + offsetY, char, color);
      }
    }

    for (let y = 1; y < horizon - 1; y += 2) {
      for (let x = 0; x < cols; x += 1) {
        const shimmer =
          Math.sin(x * 0.2 + time * 1.3 + y * 0.25) +
          Math.cos(x * 0.08 - time * 0.7 + y);
        if (shimmer < 1.2 || noise2D(x, y, 33) > 0.08) {
          continue;
        }

        const char = shimmer > 1.7 ? "~" : "-";
        const color =
          y < horizon * 0.45 ? "hsl(33 88% 70%)" : "hsl(24 84% 62%)";
        setCell(cells, colors, x, y, char, color);
      }
    }
  }

  function drawDunes(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (const layer of duneLayers) {
      for (let x = 0; x < cols; x += 1) {
        const ridgeY = clamp(
          Math.round(duneHeight(layer, x, time)),
          horizon - 3,
          rows - 2,
        );
        const left = duneHeight(layer, x - 1, time);
        const right = duneHeight(layer, x + 1, time);
        const slope = right - left;
        const ridgeChar = slope > 0.4 ? "/" : slope < -0.4 ? "\\" : "_";

        setCell(cells, colors, x, ridgeY, ridgeChar, layer.ridgeColor);

        for (let y = ridgeY + 1; y < rows; y += 1) {
          const depth = (y - ridgeY) / Math.max(1, rows - ridgeY);
          const ripple =
            Math.sin(x * 0.34 + y * 0.18 + time * 0.8 + layer.phase) +
            Math.cos(x * 0.12 - y * 0.22 + layer.phase * 0.7);
          const char =
            depth < 0.18
              ? ripple > 0.8
                ? "/"
                : ripple < -0.8
                  ? "\\"
                  : "."
              : ripple > 1
                ? ":"
                : ripple > 0.2
                  ? "."
                  : ripple < -0.8
                    ? "`"
                    : ",";
          const color = ripple > 0.85 ? layer.highlightColor : layer.fillColor;
          setCell(cells, colors, x, y, char, color);
        }
      }
    }
  }

  function drawCacti(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (const cactus of cacti) {
      const baseY = frontDuneY(cactus.x, time);
      const sway = Math.sin(time * 1.1 + cactus.phase) * 0.45;
      let previousX = cactus.x;

      for (let step = 0; step < cactus.height; step += 1) {
        const progress = step / Math.max(1, cactus.height - 1);
        const x = Math.round(cactus.x + sway * progress);
        const y = baseY - step;
        const char = x > previousX ? "/" : x < previousX ? "\\" : "|";
        setCell(cells, colors, x, y, char, cactus.color);

        if (step === cactus.armHeight) {
          setCell(cells, colors, x + cactus.armSide, y, "-", cactus.color);
          setCell(cells, colors, x + cactus.armSide, y - 1, "|", cactus.color);
        }

        previousX = x;
      }
    }
  }

  function drawParticles(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
    breeze: number,
  ) {
    for (const particle of sandParticles) {
      const wrappedX =
        (particle.x +
          time * cols * particle.speed +
          breeze * particle.drift * 4) %
        cols;
      const wrappedY =
        particle.y + Math.sin(time * 2.1 + particle.phase) * 0.8;
      const x = Math.floor((wrappedX + cols) % cols);
      const y = clamp(Math.floor(wrappedY), 1, rows - 2);

      setCell(cells, colors, x, y, particle.char, particle.color);
    }
  }

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.66);
    const breeze =
      Math.sin(time * 0.8) * 0.75 + Math.cos(time * 1.6 + 0.4) * 0.25;
    const { cells, colors } = createGrid(rows, cols);

    drawSky(cells, colors, time);
    drawDunes(cells, colors, time + breeze * 0.4);
    drawCacti(cells, colors, time);
    drawParticles(cells, colors, time, breeze);

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
