import type {
  BackgroundController,
  UrbanBackgroundOptions,
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

type RoofStyle = "flat" | "antenna" | "stepped";

type Building = {
  startX: number;
  width: number;
  topY: number;
  baseY: number;
  roofStyle: RoofStyle;
  phase: number;
  seed: number;
  wallColor: string;
  edgeColor: string;
  windowColor: string;
  dimWindowColor: string;
  signColor: string;
  signText: string;
  signX: number;
  signY: number;
  windowRate: number;
  windowOffset: number;
};

type RainDrop = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  color: string;
};

type TrafficLane = {
  laneY: number;
  reflectionY: number;
  direction: 1 | -1;
  speed: number;
  phase: number;
  trailLength: number;
  color: string;
  reflectionColor: string;
  carCount: number;
  spacing: number;
};

const signTexts = [
  "BYTE",
  "CAFE",
  "CLUB",
  "24H",
  "OPEN",
  "RAMEN",
  "HOTEL",
  "LATE",
] as const;

const wallPalettes = [
  {
    wallColor: "hsl(221 26% 24%)",
    edgeColor: "hsl(214 18% 36%)",
    windowColor: "hsl(202 38% 70%)",
    dimWindowColor: "hsl(213 18% 28%)",
    signColor: "hsl(198 28% 64%)",
  },
  {
    wallColor: "hsl(228 14% 18%)",
    edgeColor: "hsl(230 14% 32%)",
    windowColor: "hsl(24 42% 68%)",
    dimWindowColor: "hsl(228 14% 24%)",
    signColor: "hsl(18 38% 60%)",
  },
  {
    wallColor: "hsl(212 18% 20%)",
    edgeColor: "hsl(205 20% 34%)",
    windowColor: "hsl(49 44% 68%)",
    dimWindowColor: "hsl(218 18% 24%)",
    signColor: "hsl(44 36% 60%)",
  },
] as const;

function createBuilding(cursor: number, railY: number, streetTop: number): Building {
  const width = Math.floor(randomRange(6, 14));
  const baseY = streetTop - Math.floor(randomRange(1, 3));
  const height = Math.floor(randomRange(8, Math.max(10, railY - 4)));
  const topY = clamp(baseY - height, 3, railY - 5);
  const roofStyle = pick<RoofStyle>(["flat", "antenna", "stepped"]);
  const palette = pick(wallPalettes);
  const signText = pick(signTexts);
  const visibleSign =
    width > signText.length + 2
      ? signText
      : signText.slice(0, Math.max(2, width - 2));
  const signX = cursor + Math.max(1, Math.floor((width - visibleSign.length) / 2));
  const signY = clamp(
    topY + Math.floor(randomRange(2, 6)),
    topY + 1,
    baseY - 2,
  );

  return {
    startX: cursor,
    width,
    topY,
    baseY,
    roofStyle,
    phase: randomRange(0, Math.PI * 2),
    seed: randomRange(1, 1000),
    wallColor: palette.wallColor,
    edgeColor: palette.edgeColor,
    windowColor: palette.windowColor,
    dimWindowColor: palette.dimWindowColor,
    signColor: palette.signColor,
    signText: visibleSign,
    signX,
    signY,
    windowRate: randomRange(0.1, 0.18),
    windowOffset: randomRange(0, 8),
  };
}

function createRainDrop(cols: number, rows: number): RainDrop {
  return {
    x: randomRange(0, cols),
    y: randomRange(0, rows),
    speed: randomRange(0.65, 1.4),
    drift: randomRange(0.15, 0.45),
    phase: randomRange(0, Math.PI * 2),
    color: pick([
      "hsl(204 38% 74%)",
      "hsl(196 24% 70%)",
      "hsl(214 30% 76%)",
    ]),
  };
}

function createTrafficLane(
  cols: number,
  laneY: number,
  reflectionY: number,
  direction: 1 | -1,
  color: string,
  reflectionColor: string,
): TrafficLane {
  const carCount = clamp(Math.floor(cols / 18), 2, 4);
  const spacing = clamp(Math.floor(cols / Math.max(1, carCount)), 12, 20);

  return {
    laneY,
    reflectionY,
    direction,
    speed: randomRange(0.16, 0.28),
    phase: randomRange(0, 1),
    trailLength: Math.floor(randomRange(4, 6)),
    color,
    reflectionColor,
    carCount,
    spacing,
  };
}

export function createUrbanBackground(
  target: HTMLElement,
  options: UrbanBackgroundOptions = {},
): BackgroundController {
  const { overlay, cols, rows } = createAsciiStage(target, options, {
    color: "#d2dbe1",
    textShadow: "0 0 7px rgba(3, 8, 18, 0.35)",
    background: [
      "radial-gradient(circle at 18% 16%, rgba(171, 126, 118, 0.08), transparent 22%)",
      "radial-gradient(circle at 78% 24%, rgba(108, 146, 171, 0.08), transparent 26%)",
      "radial-gradient(circle at 50% 72%, rgba(175, 156, 120, 0.05), transparent 28%)",
      "linear-gradient(180deg, #0a0d17 0%, #121826 34%, #1a2230 58%, #0d121b 100%)",
    ].join(","),
    filter: "brightness(0.18)",
  });
  const railY = clamp(Math.floor(rows * 0.62), Math.floor(rows * 0.56), rows - 6);
  const streetTop = rows - 4;
  const streetDividerY = streetTop + 2;
  const buildings: Building[] = [];
  const rainDrops = Array.from(
    { length: clamp(Math.floor((cols * rows) / 24), 36, 140) },
    () => createRainDrop(cols, rows),
  );
  const trafficLanes = [
    createTrafficLane(
      cols,
      streetTop + 1,
      streetDividerY,
      1,
      "hsl(38 56% 68%)",
      "hsl(33 38% 50%)",
    ),
    createTrafficLane(
      cols,
      streetTop + 3,
      streetDividerY,
      -1,
      "hsl(9 48% 62%)",
      "hsl(9 34% 46%)",
    ),
  ];
  let cursor = -2;
  let rafId = 0;
  let running = false;
  let startTime = performance.now();

  while (cursor < cols + 4) {
    const building = createBuilding(cursor, railY, streetTop);
    buildings.push(building);
    cursor += building.width + Math.floor(randomRange(1, 4));
  }

  function drawSky(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (let band = 0; band < 3; band += 1) {
      const bandY = 2 + band * Math.max(2, Math.floor(railY / 7));
      const bandWidth = Math.max(14, Math.floor(cols / (3.8 + band)));
      const bandX =
        Math.floor(
          (time * (0.45 + band * 0.1) + band * cols * 0.32) %
            (cols + bandWidth * 2),
        ) - bandWidth;

      for (let x = 0; x < bandWidth; x += 1) {
        const px = bandX + x;
        const wobble = Math.sin(time * 0.9 + x * 0.18 + band) * 0.8;
        const py = Math.round(bandY + wobble);
        if (py < 1 || py >= railY - 4 || noise2D(px, py, 60 + band) > 0.22) {
          continue;
        }

        const char = x % 6 === 0 ? "~" : x % 3 === 0 ? "=" : "-";
        const color =
          band === 0 ? "hsl(211 28% 60%)" : "hsl(226 18% 54%)";
        setCell(cells, colors, px, py, char, color);
      }
    }

    for (let x = 2; x < cols - 2; x += 1) {
      const signal =
        Math.sin(time * 2.2 + x * 0.16) + Math.cos(time * 1.5 - x * 0.08);
      if (signal < 1.75 || (x + Math.floor(time * 7)) % 11 !== 0) {
        continue;
      }

      const y = clamp(
        2 + Math.floor((Math.sin(x * 0.28 + time) + 1) * Math.max(1, railY * 0.12)),
        2,
        railY - 5,
      );
      setCell(cells, colors, x, y, "*", "hsl(198 44% 68%)");
      setCell(cells, colors, x + 1, y, "-", "hsl(207 24% 60%)");
    }
  }

  function drawBuildings(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (const building of buildings) {
      const endX = building.startX + building.width - 1;

      for (let y = building.topY; y <= building.baseY; y += 1) {
        for (let x = building.startX; x <= endX; x += 1) {
          const isEdge = x === building.startX || x === endX;
          const facadeNoise = noise2D(x, y, building.seed);
          let char = isEdge ? "|" : facadeNoise > 0.82 ? "H" : "#";
          let color = isEdge ? building.edgeColor : building.wallColor;

          if (y === building.topY) {
            char = "_";
            color = building.edgeColor;
          }

          if (building.roofStyle === "stepped" && y === building.topY - 1) {
            const innerLeft = building.startX + Math.floor(building.width * 0.22);
            const innerRight = endX - Math.floor(building.width * 0.22);
            if (x >= innerLeft && x <= innerRight) {
              char = "_";
              color = building.edgeColor;
            }
          }

          setCell(cells, colors, x, y, char, color);
        }
      }

      if (building.roofStyle === "antenna") {
        const antennaX = building.startX + Math.floor(building.width / 2);
        setCell(cells, colors, antennaX, building.topY - 1, "|", building.edgeColor);
        if (Math.sin(time * 5 + building.phase) > 0.1) {
          setCell(cells, colors, antennaX, building.topY - 2, "*", "hsl(4 54% 62%)");
        }
      }

      for (let y = building.topY + 2; y < building.baseY - 1; y += 2) {
        for (let x = building.startX + 1; x < endX; x += 3) {
          const windowTick = Math.floor(
            (time + building.windowOffset + x * 0.03 + y * 0.05) *
              building.windowRate,
          );
          const glow =
            Math.sin(time * 0.45 + x * 0.15 + building.phase) * 0.5 +
            Math.cos(time * 0.25 + y * 0.12 + building.phase) * 0.5;
          const lit =
            noise2D(x * 0.85, y * 0.65, building.seed + windowTick * 19) >
            0.56;
          const char = lit ? (glow > 0.82 ? "@" : "o") : ".";
          const color = lit ? building.windowColor : building.dimWindowColor;
          setCell(cells, colors, x, y, char, color);
        }
      }

      for (let index = 0; index < building.signText.length; index += 1) {
        setCell(
          cells,
          colors,
          building.signX + index,
          building.signY,
          building.signText[index] ?? " ",
          building.signColor,
        );
      }
    }
  }

  function drawRail(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (let x = 0; x < cols; x += 1) {
      setCell(
        cells,
        colors,
        x,
        railY,
        x % 6 === 0 ? "+" : "=",
        "hsl(217 24% 38%)",
      );

      if (x % 9 === 0) {
        for (let y = railY + 1; y < streetTop; y += 1) {
          setCell(cells, colors, x, y, "|", "hsl(220 22% 26%)");
        }
      }
    }

    const carWidth = 7;
    const carCount = clamp(Math.floor(cols / 28), 2, 4);
    const trainLength = carCount * (carWidth + 1);
    const frontX =
      Math.floor((time * cols * 0.55) % (cols + trainLength * 2)) - trainLength;

    for (let carIndex = 0; carIndex < carCount; carIndex += 1) {
      const carX = frontX + carIndex * (carWidth + 1);
      const carColor =
        carIndex % 2 === 0 ? "hsl(199 38% 66%)" : "hsl(22 40% 64%)";

      for (let offset = 0; offset < carWidth; offset += 1) {
        const x = carX + offset;
        setCell(cells, colors, x, railY - 2, "_", carColor);

        const char =
          offset === 0
            ? "["
            : offset === carWidth - 1
              ? "]"
              : (offset + carIndex) % 2 === 0
                ? "o"
                : "=";
        const color =
          offset === 0 || offset === carWidth - 1
            ? carColor
            : Math.sin(time * 6 + x * 0.9) > -0.2
              ? "hsl(43 52% 70%)"
              : "hsl(216 18% 36%)";
        setCell(cells, colors, x, railY - 1, char, color);
      }
    }
  }

  function drawStreet(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (let x = 0; x < cols; x += 1) {
      setCell(cells, colors, x, streetTop, "_", "hsl(220 14% 20%)");
      setCell(
        cells,
        colors,
        x,
        streetTop + 1,
        (x + Math.floor(time * 4)) % 16 === 0 ? ":" : ".",
        "hsl(217 20% 26%)",
      );
      setCell(
        cells,
        colors,
        x,
        streetDividerY,
        x % 12 < 4 ? "=" : ".",
        "hsl(39 36% 50%)",
      );
      setCell(
        cells,
        colors,
        x,
        streetTop + 3,
        (x + Math.floor(time * 4) + 8) % 16 === 0 ? ":" : ".",
        "hsl(213 28% 22%)",
      );
    }

    for (const lane of trafficLanes) {
      const span = cols + lane.spacing * lane.carCount;
      const progress = (time * cols * lane.speed + lane.phase * lane.spacing) % span;
      const leadX =
        lane.direction === 1
          ? Math.floor(progress) - lane.spacing
          : cols - 1 - Math.floor(progress) + lane.spacing;

      for (let carIndex = 0; carIndex < lane.carCount; carIndex += 1) {
        const frontX = leadX - carIndex * lane.spacing * lane.direction;

        for (let offset = 0; offset < lane.trailLength; offset += 1) {
          const x = frontX - offset * lane.direction;
          const char =
            offset === 0
              ? lane.direction === 1
                ? ">"
                : "<"
              : offset < lane.trailLength - 1
                ? "="
                : "-";
          const reflectionChar = offset === 0 ? "|" : ":";

          setCell(cells, colors, x, lane.laneY, char, lane.color);
          setCell(
            cells,
            colors,
            x,
            lane.reflectionY,
            reflectionChar,
            lane.reflectionColor,
          );
        }
      }
    }
  }

  function drawRain(
    cells: string[][],
    colors: Array<Array<string | null>>,
    time: number,
  ) {
    for (const drop of rainDrops) {
      const wrappedX =
        (drop.x + time * cols * drop.drift + Math.sin(time + drop.phase) * 1.8) %
        cols;
      const wrappedY = (drop.y + time * rows * drop.speed) % rows;
      const x = Math.floor((wrappedX + cols) % cols);
      const y = Math.floor((wrappedY + rows) % rows);

      setCell(cells, colors, x, y, "|", drop.color);
      setCell(cells, colors, x - 1, y + 1, "\\", drop.color);
    }
  }

  function frame(now: number) {
    if (!running) {
      return;
    }

    const elapsed = (now - startTime) / 1000;
    const time = elapsed * (options.speed ?? 0.3);
    const { cells, colors } = createGrid(rows, cols);

    drawSky(cells, colors, time);
    drawBuildings(cells, colors, time);
    drawRail(cells, colors, time);
    drawStreet(cells, colors, time);
    drawRain(cells, colors, time);

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
