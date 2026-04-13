"use client";

import { startTransition, useEffect, useState } from "react";
import { NatureBackgroundCollection } from "@/components/backgrounds/nature-background-collection";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import { natureBackgroundKinds } from "@/lib/backgrounds/registry";
import { backgroundPreferenceStore } from "@/lib/backgrounds/background-preference-store";
import type { BackgroundKind } from "@/lib/backgrounds/types";

function isBackgroundKind(value: string): value is BackgroundKind {
  return natureBackgroundKinds.includes(value as BackgroundKind);
}

export default function Home() {
  const [backgroundKind, setBackgroundKind] = useState<BackgroundKind>(
    natureBackgroundKinds[0],
  );
  const [isBackgroundPreferenceReady, setIsBackgroundPreferenceReady] =
    useState(false);

  useEffect(() => {
    const storedBackgroundKind = backgroundPreferenceStore.read();

    startTransition(() => {
      if (storedBackgroundKind && isBackgroundKind(storedBackgroundKind)) {
        setBackgroundKind(storedBackgroundKind);
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
      <NatureBackgroundCollection activeKind={backgroundKind} />

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
