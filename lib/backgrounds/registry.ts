import { createAuroraPeaksBackground } from "@/lib/backgrounds/scenes/aurora-peaks";
import { createDesertDunesBackground } from "@/lib/backgrounds/scenes/desert-dunes";
import { createMoonlitTideBackground } from "@/lib/backgrounds/scenes/moonlit-tide";
import { createUrbanBackground } from "@/lib/backgrounds/scenes/urban";
import { createWindyForestBackground } from "@/lib/backgrounds/scenes/windy-forest";
import type {
  BackgroundCollectionEntry,
  BackgroundKind,
  BackgroundOptionsMap,
  BackgroundRegistry,
} from "@/lib/backgrounds/types";

export const backgroundCollection = [
  {
    kind: "windy-forest",
    label: "Windy Forest",
    description:
      "Lantern glow, swaying pines, and drifting pollen in the dusk.",
    options: {
      speed: 0.9,
    },
    mount: createWindyForestBackground,
  },
  {
    kind: "moonlit-tide",
    label: "Moonlit Tide",
    description:
      "A silver shoreline with rolling water, reeds, and moon shimmer.",
    options: {
      speed: 0.72,
    },
    mount: createMoonlitTideBackground,
  },
  {
    kind: "desert-dunes",
    label: "Desert Dunes",
    description:
      "Warm dunes, heat haze, drifting sand, and quiet cactus silhouettes.",
    options: {
      speed: 0.66,
    },
    mount: createDesertDunesBackground,
  },
  {
    kind: "aurora-peaks",
    label: "Aurora Peaks",
    description:
      "Snowy ridgelines under moving aurora and cold mountain stars.",
    options: {
      speed: 0.7,
    },
    mount: createAuroraPeaksBackground,
  },
  {
    kind: "urban",
    label: "Urban",
    description:
      "Rainy towers, muted signage, and an elevated train over wet streets.",
    options: {
      speed: 0.3,
    },
    mount: createUrbanBackground,
  },
] satisfies BackgroundCollectionEntry[];

export const backgroundKinds = backgroundCollection.map(
  ({ kind }) => kind,
) as BackgroundKind[];

export const backgroundRegistry = Object.fromEntries(
  backgroundCollection.map((entry) => [
    entry.kind,
    {
      label: entry.label,
      description: entry.description,
      mount: entry.mount,
    },
  ]),
) as BackgroundRegistry;

export const backgroundOptions = Object.fromEntries(
  backgroundCollection.map(({ kind, options }) => [kind, options]),
) as {
  [Kind in BackgroundKind]: BackgroundOptionsMap[Kind];
};
