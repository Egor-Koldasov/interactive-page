"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { backgroundRegistry } from "@/lib/backgrounds/registry";
import type {
  BackgroundKind,
  BackgroundOptionsMap,
  BackgroundScene,
} from "@/lib/backgrounds/types";

type BackgroundStageProps = {
  [Kind in BackgroundKind]: {
    kind: Kind;
    options: BackgroundOptionsMap[Kind];
    className?: string;
  };
}[BackgroundKind];

export function BackgroundStage({
  kind,
  options,
  className,
}: BackgroundStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const mountBackground = useEffectEvent(() => {
    const element = rootRef.current;
    if (!element) {
      return null;
    }

    const scene = backgroundRegistry[kind] as BackgroundScene<typeof options>;
    return scene.mount(element, options);
  });

  useEffect(() => {
    const controller = mountBackground();
    return () => controller?.destroy();
  }, [kind, options]);

  return <div aria-hidden="true" ref={rootRef} className={className} />;
}
