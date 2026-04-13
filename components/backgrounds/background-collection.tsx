"use client";

import { BackgroundStage } from "@/components/backgrounds/background-stage";
import { backgroundOptions } from "@/lib/backgrounds/registry";
import type { BackgroundKind } from "@/lib/backgrounds/types";

type BackgroundCollectionProps = {
  activeKind: BackgroundKind;
};

export function BackgroundCollection({
  activeKind,
}: BackgroundCollectionProps) {
  return (
    <BackgroundStage
      kind={activeKind}
      options={backgroundOptions[activeKind]}
      className="pointer-events-none absolute inset-0"
    />
  );
}
