"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
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
  const [mountVersion, setMountVersion] = useState(0);
  const sizeRef = useRef({
    width: 0,
    height: 0,
  });

  const mountBackground = useEffectEvent(() => {
    const element = rootRef.current;
    if (!element) {
      return null;
    }

    const scene = backgroundRegistry[kind] as BackgroundScene<typeof options>;
    try {
      return scene.mount(element, options);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("non-zero size before rendering")
      ) {
        return null;
      }

      throw error;
    }
  });

  useEffect(() => {
    const controller = mountBackground();
    return () => controller?.destroy();
  }, [kind, mountVersion, options]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    let rafId = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (!width || !height) {
        return;
      }

      if (sizeRef.current.width === width && sizeRef.current.height === height) {
        return;
      }

      sizeRef.current = {
        width,
        height,
      };

      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        startTransition(() => {
          setMountVersion((currentVersion) => currentVersion + 1);
        });
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return <div aria-hidden="true" ref={rootRef} className={className} />;
}
