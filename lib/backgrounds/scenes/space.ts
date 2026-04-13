import type {
  BackgroundController,
  SpaceBackgroundOptions,
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

type DustParticle = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  char: string;
  color: string;
};

type Planet = {
  x: number;
  y: number;
  radius: number;
  hue: number;
  ringTilt: number;
  ring: boolean;
};

function createStar(cols: number, rows: number): Star {
  return {
    x: randomRange(0, cols),
    y: randomRange(1, rows - 2),
    phase: randomRange(0, Math.PI * 2),
    twinkle: randomRange(0.8, 2.8),
    char: pick(["*", ".", "+", "'", "`"]),
    color: pick([
      "hsl(52 100% 82%)",
      "hsl(199 95% 82%)",
      "hsl(282 88% 82%)",
      "hsl(0 0% 92%)",
    ]),
  };
}

function createDustParticle(cols: number, rows: number): DustParticle {
  return {
    x: randomRange(0, cols),
    y: randomRange(rows * 0.08, rows * 0.94),
    speed: randomRange(0.015, 0.05),
    drift: randomRange(0.25, 0.8),
    phase: randomRange(0, Math.PI * 2),
    char: pick([".", ":", "*"]),
    color: pick([
      "hsl(192 88% 72%)",
      "hsl(284 72% 72%)",
      "hsl(218 80% 76%)",
    ]),
  };
}

function drawStars(
  cells: string[][],
  colors: Array<Array<string | null>>,
  stars: Star[],
  time: number,
) {
  for (const star of stars) {
    const glow = Math.sin(time * star.twinkle + star.phase);
    if (glow < -0.28) {
      continue;
    }

    const char = glow > 0.62 ? "*" : glow > 0.18 ? star.char : ".";
    setCell(cells, colors, Math.floor(star.x), Math.floor(star.y), char, star.color);
  }
}

function drawNebula(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  rows: number,
  time: number,
) {
  for (let band = 0; band < 3; band += 1) {
    const centerY = lerp(rows * 0.18, rows * 0.68, band / 2);
    const amplitude = 2.2 + band * 1.25;
    const phase = band * Math.PI * 0.35;
    const thickness = 2 + band;

    for (let x = 0; x < cols; x += 1) {
      const waveY =
        centerY +
        Math.sin(x * (0.09 + band * 0.02) + time * (0.22 + band * 0.08) + phase) *
          amplitude +
        Math.cos(x * 0.035 - time * (0.16 + band * 0.05) + phase) * 1.8;

      for (let offset = -thickness; offset <= thickness; offset += 1) {
        const y = Math.round(waveY + offset * 0.9);
        if (y < 1 || y >= rows - 1) {
          continue;
        }

        const density = noise2D(x * 0.7, y * 1.1, 40 + band);
        const threshold = 0.22 + Math.abs(offset) * 0.1;
        if (density > threshold) {
          continue;
        }

        const char =
          offset === 0
            ? "~"
            : density < 0.08
              ? "*"
              : density < 0.14
                ? ":"
                : ".";
        const color =
          band === 0
            ? "hsl(192 80% 64%)"
            : band === 1
              ? "hsl(280 74% 70%)"
              : "hsl(232 82% 66%)";
        setCell(cells, colors, x, y, char, color);
      }
    }
  }
}

function drawPlanet(
  cells: string[][],
  colors: Array<Array<string | null>>,
  planet: Planet,
  seed: number,
) {
  const spread = Math.ceil(planet.radius * 1.3);

  for (let offsetY = -planet.radius; offsetY <= planet.radius; offsetY += 1) {
    for (let offsetX = -spread; offsetX <= spread; offsetX += 1) {
      const distance = Math.hypot(offsetX / 1.2, offsetY) / planet.radius;
      if (distance > 1) {
        continue;
      }

      const crater = noise2D(offsetX + planet.x, offsetY + planet.y, seed);
      const char =
        distance < 0.28
          ? "@"
          : crater > 0.8
            ? "o"
            : crater > 0.55
              ? "O"
              : "0";
      const lightness = lerp(78, 46, distance);
      const color = `hsl(${planet.hue} 86% ${lightness.toFixed(1)}%)`;
      setCell(
        cells,
        colors,
        planet.x + offsetX,
        planet.y + offsetY,
        char,
        color,
      );
    }
  }

  if (!planet.ring) {
    return;
  }

  for (let offsetX = -spread - 3; offsetX <= spread + 3; offsetX += 1) {
    const ringY = Math.round(planet.y + offsetX * planet.ringTilt * 0.18);
    const distance = Math.abs(offsetX) / (spread + 3);
    if (distance > 1) {
      continue;
    }

    const char = distance > 0.72 ? "-" : distance > 0.42 ? "=" : "~";
    const color =
      distance > 0.55 ? "hsl(44 84% 72%)" : "hsl(196 82% 76%)";
    setCell(cells, colors, planet.x + offsetX, ringY, char, color);
  }
}

function drawComets(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  rows: number,
  time: number,
) {
  for (let comet = 0; comet < 2; comet += 1) {
    const progress = (time * (0.06 + comet * 0.02) + comet * 0.43) % 1;
    const headX = Math.floor(cols + 8 - progress * (cols + 16));
    const headY = Math.floor(rows * (0.14 + comet * 0.2) + progress * rows * 0.18);

    for (let trail = 0; trail < 8; trail += 1) {
      const x = headX + trail;
      const y = headY - Math.floor(trail * 0.45);
      const char = trail === 0 ? "@" : trail < 3 ? "*" : ".";
      const color =
        trail < 2 ? "hsl(46 100% 80%)" : trail < 5 ? "hsl(195 96% 74%)" : "hsl(284 74% 70%)";
      setCell(cells, colors, x, y, char, color);
    }
  }
}

function drawDust(
  cells: string[][],
  colors: Array<Array<string | null>>,
  cols: number,
  rows: number,
  particles: DustParticle[],
  time: number,
) {
  for (const particle of particles) {
    const x =
      (particle.x + time * cols * particle.speed + Math.sin(time + particle.phase) * particle.drift) %
      cols;
    const y =
      particle.y +
      Math.cos(time * 0.9 + particle.phase) * 0.8 +
      Math.sin(time * 0.4 + particle.phase) * 0.5;

    setCell(
      cells,
      colors,
      Math.floor((x + cols) % cols),
      clamp(Math.floor(y), 1, rows - 2),
      particle.char,
      particle.color,
    );
  }
}

export function createSpaceBackground(
  target: HTMLElement,
  options: SpaceBackgroundOptions = {},
): BackgroundController {
  const { overlay, cols, rows } = createAsciiStage(target, options, {
    color: "#dce7ff",
    textShadow: "0 0 10px rgba(2, 6, 20, 0.45)",
    background: [
      "radial-gradient(circle at 24% 18%, rgba(122, 189, 255, 0.16), transparent 18%)",
      "radial-gradient(circle at 72% 30%, rgba(214, 109, 255, 0.12), transparent 24%)",
      "radial-gradient(circle at 52% 74%, rgba(76, 131, 255, 0.1), transparent 28%)",
      "linear-gradient(180deg, #02040b 0%, #060d1c 34%, #0a1023 58%, #03050c 100%)",
    ].join(","),
    filter: "brightness(0.17)",
  });
  const stars = Array.from(
    { length: clamp(Math.floor((cols * rows) / 18), 32, 120) },
    () => createStar(cols, rows),
  );
  const particles = Array.from(
    { length: clamp(Math.floor(cols / 4.5), 10, 26) },
    () => createDustParticle(cols, rows),
  );
  const planets: Planet[] = [
    {
      x: Math.floor(cols * 0.76),
      y: Math.max(4, Math.floor(rows * 0.28)),
      radius: clamp(Math.floor(cols / 13), 3, 7),
      hue: 212,
      ringTilt: -1,
      ring: true,
    },
    {
      x: Math.floor(cols * 0.18),
      y: Math.max(5, Math.floor(rows * 0.62)),
      radius: clamp(Math.floor(cols / 20), 2, 4),
      hue: 292,
      ringTilt: 1,
      ring: false,
    },
  ];
  let rafId = 0;
  let running = false;
  let startTime = performance.now();

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.42);
    const { cells, colors } = createGrid(rows, cols);

    drawNebula(cells, colors, cols, rows, time);
    drawStars(cells, colors, stars, time);
    drawComets(cells, colors, cols, rows, time);

    planets.forEach((planet, index) => {
      drawPlanet(cells, colors, planet, 54 + index);
    });

    drawDust(cells, colors, cols, rows, particles, time);

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
