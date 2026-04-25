"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState } from "react";
import { toCanvas } from "html-to-image";
import {
  computeFaces,
  pointInPolygon,
  type CrackPoint,
  type CrackSegment,
} from "@/lib/canvas-cracks/shatter";

type CanvasCrackOverlayProps = {
  trigger: number;
  targetRef: React.RefObject<HTMLElement | null>;
};

type Shard = {
  id: number;
  polygon: CrackPoint[];
  centroid: CrackPoint;
  dangleSegs: CrackSegment[];
  x: number;
  y: number;
  rotation: number;
  scale: number;
  vx: number;
  vy: number;
  vr: number;
  dropping: boolean;
  bornAt: number;
  dropDelay: number;
};

type CrackState = {
  source: HTMLCanvasElement;
  shards: Shard[];
  width: number;
  height: number;
  startedAt: number;
  lastTick: number;
  rootRect: { x0: number; y0: number; x1: number; y1: number };
};

const DROP_DELAY_MS = 360;
const EDGE_DROP_PROBABILITY = 0.22;
const EDGE_DROP_MAX_AREA_FRACTION = 0.16;
const DANGLING_BASE_WIDTH = 4;
const DANGLING_DEPTH_FALLOFF = 0.78;

function makeRootShard(width: number, height: number): Shard {
  const polygon = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const centroid = polygonCentroid(polygon);

  return {
    id: 1,
    polygon,
    centroid,
    dangleSegs: [],
    x: centroid.x,
    y: centroid.y,
    rotation: 0,
    scale: 1,
    vx: 0,
    vy: 0,
    vr: 0,
    dropping: false,
    bornAt: performance.now(),
    dropDelay: 0,
  };
}

let shardId = 2;
let snapshotStyleProperties: string[] | null = null;

export function CanvasCrackOverlay({
  trigger,
  targetRef,
}: CanvasCrackOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CrackState | null>(null);
  const frameRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger === 0) {
      return;
    }

    let cancelled = false;

    async function startEffect() {
      const target = targetRef.current;

      if (!target) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let source: HTMLCanvasElement;

      try {
        source = await toCanvas(target, {
          cacheBust: true,
          includeStyleProperties: getSnapshotStyleProperties(),
          pixelRatio,
          width: viewportWidth,
          height: viewportHeight,
          filter: (node) =>
            !(node instanceof HTMLElement) ||
            node.dataset.canvasCrackOverlay !== "true",
        });
      } catch (error) {
        console.warn("Unable to render page into canvas.", error);
        return;
      }

      if (cancelled) {
        return;
      }

      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      canvas.width = Math.floor(viewportWidth * pixelRatio);
      canvas.height = Math.floor(viewportHeight * pixelRatio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      const now = performance.now();
      const rootRect = {
        x0: 0,
        y0: 0,
        x1: viewportWidth,
        y1: viewportHeight,
      };

      stateRef.current = {
        source,
        shards: [makeRootShard(viewportWidth, viewportHeight)],
        width: viewportWidth,
        height: viewportHeight,
        startedAt: now,
        lastTick: now,
        rootRect,
      };

      setIsActive(true);

      window.setTimeout(() => {
        crackAt(viewportWidth * 0.5, viewportHeight * 0.53);
      }, 90);

      loop(now);
    }

    startEffect();

    return () => {
      cancelled = true;
    };
  }, [targetRef, trigger]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stopEffect();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);

  function stopEffect() {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    stateRef.current = null;
    setIsActive(false);
  }

  function loop(now: number) {
    const state = stateRef.current;

    if (!state) {
      return;
    }

    render(now);

    if (
      state.shards.length > 0 &&
      state.shards.every((shard) => shard.y - shard.centroid.y > state.height * 1.45)
    ) {
      stopEffect();
      return;
    }

    frameRef.current = window.requestAnimationFrame(loop);
  }

  function render(now: number) {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!state || !canvas || !context) {
      return;
    }

    const pixelRatio = canvas.width / state.width;
    const dt = Math.min((now - state.lastTick) / 1000, 0.04);
    state.lastTick = now;

    context.save();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, state.width, state.height);
    context.fillStyle = "#03050a";
    context.fillRect(0, 0, state.width, state.height);

    for (const shard of state.shards) {
      const age = now - shard.bornAt;

      if (shard.dropping && age > shard.dropDelay) {
        shard.vy += 1900 * dt;
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        shard.rotation += shard.vr * dt;
        shard.scale = Math.max(0.86, shard.scale - 0.025 * dt);
      }

      drawShard(
        context,
        state.source,
        shard,
        state.width,
        state.height,
        state.rootRect,
      );
    }

    state.shards = state.shards.filter(
      (shard) => shard.y - shard.centroid.y < state.height * 1.8,
    );

    context.restore();
  }

  function crackAt(x: number, y: number) {
    const state = stateRef.current;

    if (!state) {
      return;
    }

    const hit = state.shards.find(
      (shard) => !shard.dropping && pointInPolygon({ x, y }, shard.polygon),
    );

    if (!hit) {
      return;
    }

    const { segsByShard, allSegs } = propagateCracks(x, y, hit, state.shards);
    const tipInfo = computeTipInfo(allSegs);

    for (const seg of allSegs) {
      const [x0, y0, x1, y1, depth = 0] = seg;
      const baseWidth = widthForDepth(depth);
      seg[5] = tipInfo.tips.has(tipInfo.keyFor(x0, y0)) ? 0 : baseWidth;
      seg[6] = tipInfo.tips.has(tipInfo.keyFor(x1, y1)) ? 0 : baseWidth;
    }

    let maxDist = 1;

    for (const seg of allSegs) {
      maxDist = Math.max(
        maxDist,
        Math.hypot(seg[0] - x, seg[1] - y),
        Math.hypot(seg[2] - x, seg[3] - y),
      );
    }

    const nextShards = state.shards.filter((shard) => !segsByShard.has(shard));
    const screenArea = state.width * state.height;

    for (const [shard, crackSegments] of segsByShard) {
      const faces = computeFaces(crackSegments, shard.polygon);

      if (faces.length < 2) {
        nextShards.push({
          ...shard,
          dangleSegs: [
            ...shard.dangleSegs,
            ...crackSegments.filter((seg) =>
              pointInPolygon(
                { x: (seg[0] + seg[2]) / 2, y: (seg[1] + seg[3]) / 2 },
                shard.polygon,
              ),
            ),
          ],
        });
        continue;
      }

      for (const face of faces) {
        const centroid = polygonCentroid(face);
        const area = polygonArea(face);
        const interior = isInteriorPolygon(face, state.rootRect);
        const smallEdge =
          area < screenArea * EDGE_DROP_MAX_AREA_FRACTION &&
          Math.random() < EDGE_DROP_PROBABILITY;
        const shouldDrop = interior || smallEdge;
        const distanceFromClick = Math.hypot(centroid.x - x, centroid.y - y);
        const inheritedDanglings = shard.dangleSegs.filter((seg) =>
          pointInPolygon(
            { x: (seg[0] + seg[2]) / 2, y: (seg[1] + seg[3]) / 2 },
            face,
          ),
        );
        const newDanglings = crackSegments.filter((seg) =>
          pointInPolygon(
            { x: (seg[0] + seg[2]) / 2, y: (seg[1] + seg[3]) / 2 },
            face,
          ),
        );

        nextShards.push({
          id: shardId,
          polygon: face,
          centroid,
          dangleSegs: [...inheritedDanglings, ...newDanglings],
          x: centroid.x,
          y: centroid.y,
          rotation: shouldDrop ? randomSigned(0.06) : 0,
          scale: 1,
          vx: randomSigned(130) + ((centroid.x - x) / maxDist) * 120,
          vy: shouldDrop ? 120 + Math.random() * 180 : 0,
          vr: randomSigned(2.2),
          dropping: shouldDrop,
          bornAt: performance.now(),
          dropDelay:
            DROP_DELAY_MS + Math.min(280, (distanceFromClick / maxDist) * 360),
        });
        shardId += 1;
      }
    }

    state.shards = nextShards;
  }

  return (
    <canvas
      ref={canvasRef}
      data-canvas-crack-overlay="true"
      aria-hidden={!isActive}
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isActive ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={(event) => crackAt(event.clientX, event.clientY)}
    />
  );
}

function drawShard(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  shard: Shard,
  width: number,
  height: number,
  rootRect: CrackState["rootRect"],
) {
  context.save();
  context.translate(shard.x, shard.y);
  context.rotate(shard.rotation);
  context.scale(shard.scale, shard.scale);
  context.translate(-shard.centroid.x, -shard.centroid.y);

  tracePolygon(context, shard.polygon);
  context.clip();
  context.drawImage(source, 0, 0, width, height);

  context.globalCompositeOperation = "screen";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = "rgba(215, 255, 236, 0.42)";
  context.lineWidth = 3;
  strokeInteriorEdges(context, shard.polygon, rootRect);

  for (const seg of shard.dangleSegs) {
    const [, , , , , w0 = DANGLING_BASE_WIDTH, w1 = DANGLING_BASE_WIDTH] = seg;
    context.lineWidth = Math.max(0.8, (w0 + w1) / 2);
    context.beginPath();
    context.moveTo(seg[0], seg[1]);
    context.lineTo(seg[2], seg[3]);
    context.stroke();
  }

  context.globalCompositeOperation = "source-over";
  context.restore();
}

function strokeInteriorEdges(
  context: CanvasRenderingContext2D,
  polygon: CrackPoint[],
  rootRect: CrackState["rootRect"],
) {
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;

    if (isEdgeOnViewportRect(a, b, rootRect)) {
      continue;
    }

    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
}

function tracePolygon(context: CanvasRenderingContext2D, polygon: CrackPoint[]) {
  context.beginPath();
  context.moveTo(polygon[0]!.x, polygon[0]!.y);

  for (let i = 1; i < polygon.length; i += 1) {
    context.lineTo(polygon[i]!.x, polygon[i]!.y);
  }

  context.closePath();
}

function propagateCracks(
  x: number,
  y: number,
  startShard: Shard,
  shards: Shard[],
) {
  const segsByShard = new Map<Shard, CrackSegment[]>();
  const allSegs: CrackSegment[] = [];
  const mainAngle = Math.random() * Math.PI;

  walkMainCrack(x, y, mainAngle, startShard, shards, segsByShard, allSegs);
  walkMainCrack(
    x,
    y,
    mainAngle + Math.PI,
    startShard,
    shards,
    segsByShard,
    allSegs,
  );

  return { segsByShard, allSegs };
}

function walkMainCrack(
  x: number,
  y: number,
  angle: number,
  startShard: Shard | undefined,
  shards: Shard[],
  segsByShard: Map<Shard, CrackSegment[]>,
  allSegs: CrackSegment[],
) {
  let cx = x;
  let cy = y;
  let currentAngle = angle;
  let currentShard = startShard;
  let safety = 0;

  while (safety < 200) {
    safety += 1;

    if (!currentShard) {
      return;
    }

    currentAngle += randomSigned(0.3);

    const nx = cx + Math.cos(currentAngle) * 60;
    const ny = cy + Math.sin(currentAngle) * 60;
    const nextPoint = { x: nx, y: ny };
    const segment: CrackSegment = [cx, cy, nx, ny, 0];

    allSegs.push(segment);
    addSegmentToShard(segsByShard, currentShard, segment);

    if (!pointInPolygon(nextPoint, currentShard.polygon)) {
      const nextShard = findShardAt(nextPoint, shards, currentShard);

      if (nextShard) {
        addSegmentToShard(segsByShard, nextShard, segment);
      }

      currentShard = nextShard;
    }

    cx = nx;
    cy = ny;

    if (Math.random() < 0.22) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const branchAngle =
        currentAngle + side * (Math.PI / 3 + randomSigned(0.4));

      walkBranch(
        cx,
        cy,
        branchAngle,
        currentShard,
        shards,
        segsByShard,
        allSegs,
        3,
        1,
      );
    }
  }
}

function walkBranch(
  x: number,
  y: number,
  angle: number,
  startShard: Shard | undefined,
  shards: Shard[],
  segsByShard: Map<Shard, CrackSegment[]>,
  allSegs: CrackSegment[],
  steps: number,
  depth: number,
) {
  if (depth > 3) {
    return;
  }

  let cx = x;
  let cy = y;
  let currentAngle = angle;
  let currentShard = startShard;

  for (let i = 0; i < steps; i += 1) {
    currentAngle += randomSigned(1.3);

    const nx = cx + Math.cos(currentAngle) * 60;
    const ny = cy + Math.sin(currentAngle) * 60;
    const nextPoint = { x: nx, y: ny };
    const segment: CrackSegment = [cx, cy, nx, ny, depth];

    allSegs.push(segment);

    if (currentShard) {
      addSegmentToShard(segsByShard, currentShard, segment);

      if (!pointInPolygon(nextPoint, currentShard.polygon)) {
        const nextShard = findShardAt(nextPoint, shards, currentShard);

        if (nextShard) {
          addSegmentToShard(segsByShard, nextShard, segment);
        }

        currentShard = nextShard;
      }
    }

    cx = nx;
    cy = ny;

    if (Math.random() < 0.18 * 0.6 ** depth) {
      const side = Math.random() < 0.5 ? -1 : 1;
      walkBranch(
        cx,
        cy,
        currentAngle + side * (Math.PI / 3 + randomSigned(0.4)),
        currentShard,
        shards,
        segsByShard,
        allSegs,
        Math.floor(steps * 0.7),
        depth + 1,
      );
    }
  }
}

function findShardAt(point: CrackPoint, shards: Shard[], excludeShard?: Shard) {
  return shards.find(
    (shard) =>
      shard !== excludeShard &&
      !shard.dropping &&
      pointInPolygon(point, shard.polygon),
  );
}

function addSegmentToShard(
  map: Map<Shard, CrackSegment[]>,
  shard: Shard,
  segment: CrackSegment,
) {
  const segments = map.get(shard);

  if (segments) {
    segments.push(segment);
    return;
  }

  map.set(shard, [segment]);
}

function computeTipInfo(segments: CrackSegment[]) {
  const tolerance = 0.5;
  const keyFor = (x: number, y: number) =>
    `${Math.round(x / tolerance)},${Math.round(y / tolerance)}`;
  const counts = new Map<string, number>();

  for (const segment of segments) {
    const k0 = keyFor(segment[0], segment[1]);
    const k1 = keyFor(segment[2], segment[3]);

    counts.set(k0, (counts.get(k0) ?? 0) + 1);
    counts.set(k1, (counts.get(k1) ?? 0) + 1);
  }

  const tips = new Set<string>();

  for (const [key, count] of counts) {
    if (count === 1) {
      tips.add(key);
    }
  }

  return { tips, keyFor };
}

function widthForDepth(depth: number) {
  return DANGLING_BASE_WIDTH * DANGLING_DEPTH_FALLOFF ** depth;
}

function polygonCentroid(polygon: CrackPoint[]) {
  let x = 0;
  let y = 0;

  for (const point of polygon) {
    x += point.x;
    y += point.y;
  }

  return {
    x: x / polygon.length,
    y: y / polygon.length,
  };
}

function polygonArea(polygon: CrackPoint[]) {
  let area = 0;

  for (let i = 0; i < polygon.length; i += 1) {
    const point = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    area += point.x * next.y - next.x * point.y;
  }

  return Math.abs(area * 0.5);
}

function isInteriorPolygon(
  polygon: CrackPoint[],
  rect: { x0: number; y0: number; x1: number; y1: number },
) {
  const tolerance = 1;

  return polygon.every(
    (point) =>
      Math.abs(point.x - rect.x0) >= tolerance &&
      Math.abs(point.x - rect.x1) >= tolerance &&
      Math.abs(point.y - rect.y0) >= tolerance &&
      Math.abs(point.y - rect.y1) >= tolerance,
  );
}

function isEdgeOnViewportRect(
  a: CrackPoint,
  b: CrackPoint,
  rect: { x0: number; y0: number; x1: number; y1: number },
) {
  const tolerance = 1;

  return (
    (Math.abs(a.y - rect.y0) < tolerance &&
      Math.abs(b.y - rect.y0) < tolerance) ||
    (Math.abs(a.y - rect.y1) < tolerance &&
      Math.abs(b.y - rect.y1) < tolerance) ||
    (Math.abs(a.x - rect.x0) < tolerance &&
      Math.abs(b.x - rect.x0) < tolerance) ||
    (Math.abs(a.x - rect.x1) < tolerance &&
      Math.abs(b.x - rect.x1) < tolerance)
  );
}

function randomSigned(max: number) {
  return (Math.random() * 2 - 1) * max;
}

function getSnapshotStyleProperties() {
  if (snapshotStyleProperties) {
    return snapshotStyleProperties;
  }

  snapshotStyleProperties = [
    "font",
    ...Array.from(window.getComputedStyle(document.documentElement)).filter(
      (propertyName) => propertyName !== "font-size",
    ),
  ];

  return snapshotStyleProperties;
}
