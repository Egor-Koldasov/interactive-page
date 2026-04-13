"use client";

import { startTransition, useEffect, useState } from "react";
import { BackgroundCollection } from "@/components/backgrounds/background-collection";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import { backgroundKinds } from "@/lib/backgrounds/registry";
import { backgroundPreferenceStore } from "@/lib/backgrounds/background-preference-store";
import type { BackgroundKind } from "@/lib/backgrounds/types";

function normalizeBackgroundKind(value: string): BackgroundKind | null {
  const normalizedValue =
    value === "neon-district" || value === "urbar" ? "urban" : value;

  return backgroundKinds.includes(normalizedValue as BackgroundKind)
    ? (normalizedValue as BackgroundKind)
    : null;
}

export default function Home() {
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>(
    backgroundKinds[0],
  );
  const [isBackgroundPreferenceReady, setIsBackgroundPreferenceReady] =
    useState(false);

  useEffect(() => {
    const storedBackgroundKind = backgroundPreferenceStore.read();

    startTransition(() => {
      const normalizedStoredBackgroundKind = storedBackgroundKind
        ? normalizeBackgroundKind(storedBackgroundKind)
        : null;

      if (normalizedStoredBackgroundKind) {
        setBackgroundKind(normalizedStoredBackgroundKind);
      }

      setIsBackgroundPreferenceReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isBackgroundPreferenceReady) {
      return;
    }

    backgroundPreferenceStore.write(backgroundKind);
  }, [backgroundKind, isBackgroundPreferenceReady]);

  return (
    <main className="relative h-[100dvh] overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <BackgroundCollection activeKind={backgroundKind} />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="flex h-full min-h-[32rem] w-full flex-col items-center gap-8 sm:gap-12">
          {/* <h1 className="text-center text-[clamp(3.75rem,11vw,6.2rem)] leading-none font-medium text-stone-100 tracking-wider">
            Egor Koldasov
          </h1> */}

          <div className="flex min-h-0 w-full max-w-4xl flex-1 justify-center">
            <TerminalWindow
              currentBackgroundId={backgroundKind}
              onBackgroundChange={(nextBackgroundKind) => {
                startTransition(() => {
                  setBackgroundKind(nextBackgroundKind);
                });
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
