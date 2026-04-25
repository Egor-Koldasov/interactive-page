export type CrackPoint = {
  x: number;
  y: number;
};

export type CrackSegment = [
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  depth?: number,
  w0?: number,
  w1?: number,
];

const EPS = 0.5;

type SplitSegment = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  ts: number[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function computeFaces(
  segments: CrackSegment[],
  boundaryPolygon: CrackPoint[],
) {
  const boundarySegs: CrackSegment[] = [];
  const boundaryCount = boundaryPolygon.length;

  for (let i = 0; i < boundaryCount; i += 1) {
    const a = boundaryPolygon[i]!;
    const b = boundaryPolygon[(i + 1) % boundaryCount]!;
    boundarySegs.push([a.x, a.y, b.x, b.y]);
  }

  const splits = [...segments, ...boundarySegs].map<SplitSegment>((segment) => {
    const [ax, ay, bx, by] = segment;

    return {
      ax,
      ay,
      bx,
      by,
      ts: [0, 1],
      minX: Math.min(ax, bx),
      maxX: Math.max(ax, bx),
      minY: Math.min(ay, by),
      maxY: Math.max(ay, by),
    };
  });

  for (let i = 0; i < splits.length; i += 1) {
    const current = splits[i]!;

    for (let j = i + 1; j < splits.length; j += 1) {
      const next = splits[j]!;

      if (
        current.maxX < next.minX ||
        next.maxX < current.minX ||
        current.maxY < next.minY ||
        next.maxY < current.minY
      ) {
        continue;
      }

      const hit = segmentIntersection(current, next);

      if (hit) {
        current.ts.push(hit.t);
        next.ts.push(hit.u);
      }
    }
  }

  const subSegments: [CrackPoint, CrackPoint][] = [];

  for (const split of splits) {
    const uniqueStops = Array.from(
      new Set(split.ts.map((t) => Math.round(t * 1e8) / 1e8)),
    ).sort((a, b) => a - b);
    const dx = split.bx - split.ax;
    const dy = split.by - split.ay;

    for (let i = 0; i < uniqueStops.length - 1; i += 1) {
      const t0 = uniqueStops[i]!;
      const t1 = uniqueStops[i + 1]!;

      if (t1 - t0 < 1e-9) {
        continue;
      }

      const p0 = { x: split.ax + t0 * dx, y: split.ay + t0 * dy };
      const p1 = { x: split.ax + t1 * dx, y: split.ay + t1 * dy };

      if (distance(p0, p1) > EPS) {
        subSegments.push([p0, p1]);
      }
    }
  }

  const verts: CrackPoint[] = [];
  const vertMap = new Map<string, number>();

  function addVert(point: CrackPoint) {
    const key = `${Math.round(point.x / EPS)}_${Math.round(point.y / EPS)}`;
    const existing = vertMap.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const id = verts.length;
    verts.push({ x: point.x, y: point.y });
    vertMap.set(key, id);
    return id;
  }

  const edges: [number, number][] = [];

  for (const [a, b] of subSegments) {
    const va = addVert(a);
    const vb = addVert(b);

    if (va !== vb) {
      edges.push([va, vb]);
    }
  }

  const adjacency = verts.map(() => new Set<number>());

  for (const [a, b] of edges) {
    adjacency[a]!.add(b);
    adjacency[b]!.add(a);
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (let vertex = 0; vertex < verts.length; vertex += 1) {
      if (adjacency[vertex]!.size === 1) {
        const [other] = adjacency[vertex]!;

        adjacency[vertex]!.delete(other);
        adjacency[other]!.delete(vertex);
        changed = true;
      }
    }
  }

  const prunedEdges: [number, number][] = [];
  const edgeSet = new Set<string>();

  for (let vertex = 0; vertex < verts.length; vertex += 1) {
    for (const other of adjacency[vertex]!) {
      const key =
        vertex < other ? `${vertex}_${other}` : `${other}_${vertex}`;

      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        prunedEdges.push([vertex, other]);
      }
    }
  }

  if (prunedEdges.length === 0) {
    return [];
  }

  const halfEdges: Array<{
    from: number;
    to: number;
    twin: number;
    next: number;
  }> = [];

  for (const [a, b] of prunedEdges) {
    const index = halfEdges.length;
    halfEdges.push({ from: a, to: b, twin: index + 1, next: -1 });
    halfEdges.push({ from: b, to: a, twin: index, next: -1 });
  }

  const outgoing = verts.map(() => [] as number[]);

  for (let i = 0; i < halfEdges.length; i += 1) {
    outgoing[halfEdges[i]!.from]!.push(i);
  }

  for (let vertex = 0; vertex < verts.length; vertex += 1) {
    outgoing[vertex]!.sort((a, b) => {
      const pa = verts[halfEdges[a]!.to]!;
      const pb = verts[halfEdges[b]!.to]!;

      return (
        Math.atan2(pa.y - verts[vertex]!.y, pa.x - verts[vertex]!.x) -
        Math.atan2(pb.y - verts[vertex]!.y, pb.x - verts[vertex]!.x)
      );
    });
  }

  for (let i = 0; i < halfEdges.length; i += 1) {
    const destination = halfEdges[i]!.to;
    const destinationOutgoing = outgoing[destination]!;
    const twinIndex = destinationOutgoing.indexOf(halfEdges[i]!.twin);
    halfEdges[i]!.next =
      destinationOutgoing[
        (twinIndex - 1 + destinationOutgoing.length) %
          destinationOutgoing.length
      ]!;
  }

  const visited = new Uint8Array(halfEdges.length);
  const faces: CrackPoint[][] = [];

  for (let i = 0; i < halfEdges.length; i += 1) {
    if (visited[i]) {
      continue;
    }

    const face: number[] = [];
    let current = i;
    let safety = 0;

    do {
      if (safety > 50000) {
        break;
      }

      safety += 1;
      visited[current] = 1;
      face.push(halfEdges[current]!.from);
      current = halfEdges[current]!.next;
    } while (current !== i && !visited[current]);

    if (face.length >= 3) {
      const polygon = face.map((vertexIndex) => verts[vertexIndex]!);

      if (signedArea(polygon) > 1) {
        faces.push(polygon);
      }
    }
  }

  return faces;
}

export function pointInPolygon(point: CrackPoint, polygon: CrackPoint[]) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function segmentIntersection(s1: SplitSegment, s2: SplitSegment) {
  const dx1 = s1.bx - s1.ax;
  const dy1 = s1.by - s1.ay;
  const dx2 = s2.bx - s2.ax;
  const dy2 = s2.by - s2.ay;
  const denominator = dx1 * dy2 - dy1 * dx2;

  if (Math.abs(denominator) < 1e-10) {
    return null;
  }

  const acx = s2.ax - s1.ax;
  const acy = s2.ay - s1.ay;
  const t = (acx * dy2 - acy * dx2) / denominator;
  const u = (acx * dy1 - acy * dx1) / denominator;

  if (t < 1e-8 || t > 1 - 1e-8 || u < 1e-8 || u > 1 - 1e-8) {
    return null;
  }

  return { t, u };
}

function distance(a: CrackPoint, b: CrackPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function signedArea(polygon: CrackPoint[]) {
  let area = 0;

  for (let i = 0; i < polygon.length; i += 1) {
    const nextIndex = (i + 1) % polygon.length;
    area +=
      polygon[i]!.x * polygon[nextIndex]!.y -
      polygon[nextIndex]!.x * polygon[i]!.y;
  }

  return area / 2;
}
