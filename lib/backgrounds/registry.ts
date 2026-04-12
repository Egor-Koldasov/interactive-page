import { createWindyForestBackground } from "@/lib/backgrounds/scenes/windy-forest";
import type { BackgroundRegistry } from "@/lib/backgrounds/types";

export const backgroundRegistry: BackgroundRegistry = {
  "windy-forest": {
    mount: createWindyForestBackground,
  },
};
