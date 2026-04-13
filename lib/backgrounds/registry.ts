import { createAuroraPeaksBackground } from "@/lib/backgrounds/scenes/aurora-peaks";
import { createDesertDunesBackground } from "@/lib/backgrounds/scenes/desert-dunes";
import { createMoonlitTideBackground } from "@/lib/backgrounds/scenes/moonlit-tide";
import { createWindyForestBackground } from "@/lib/backgrounds/scenes/windy-forest";
import type { BackgroundKind, BackgroundRegistry } from "@/lib/backgrounds/types";

export const backgroundRegistry: BackgroundRegistry = {
  "windy-forest": {
    label: "Windy Forest",
    description: "Lantern glow, swaying pines, and drifting pollen in the dusk.",
    mount: createWindyForestBackground,
  },
  "moonlit-tide": {
    label: "Moonlit Tide",
    description: "A silver shoreline with rolling water, reeds, and moon shimmer.",
    mount: createMoonlitTideBackground,
  },
  "desert-dunes": {
    label: "Desert Dunes",
    description: "Warm dunes, heat haze, drifting sand, and quiet cactus silhouettes.",
    mount: createDesertDunesBackground,
  },
  "aurora-peaks": {
    label: "Aurora Peaks",
    description: "Snowy ridgelines under moving aurora and cold mountain stars.",
    mount: createAuroraPeaksBackground,
  },
};

export const natureBackgroundKinds: BackgroundKind[] = [
  "windy-forest",
  "moonlit-tide",
  "desert-dunes",
  "aurora-peaks",
];
