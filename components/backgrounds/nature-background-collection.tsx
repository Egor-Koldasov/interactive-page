"use client";

import type { BackgroundKind, BackgroundOptionsMap } from "@/lib/backgrounds/types";
import { BackgroundStage } from "@/components/backgrounds/background-stage";

const backgroundOptions: {
  [Kind in BackgroundKind]: BackgroundOptionsMap[Kind];
} = {
  "windy-forest": {
    speed: 0.9,
  },
  "moonlit-tide": {
    speed: 0.72,
  },
  "desert-dunes": {
    speed: 0.66,
  },
  "aurora-peaks": {
    speed: 0.7,
  },
};

type NatureBackgroundCollectionProps = {
  activeKind: BackgroundKind;
};

export function NatureBackgroundCollection({
  activeKind,
}: NatureBackgroundCollectionProps) {
  return (
    <BackgroundStage
      kind={activeKind}
      options={backgroundOptions[activeKind]}
      className="pointer-events-none absolute inset-0"
    />
  );
}
