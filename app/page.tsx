import { BackgroundStage } from "@/components/backgrounds/background-stage";
import { TerminalWindow } from "@/components/terminal/terminal-window";

const forestOptions = {
  speed: 0.9,
} as const;

export default function Home() {
  return (
    <main className="relative h-[100dvh] overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <BackgroundStage
        kind="windy-forest"
        options={forestOptions}
        className="pointer-events-none absolute inset-0"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "linear-gradient(180deg, rgba(2, 4, 8, 0.18), rgba(2, 4, 8, 0.4) 30%, rgba(2, 4, 8, 0.82) 100%)",
            "radial-gradient(circle at 50% 16%, rgba(255, 222, 143, 0.08), transparent 24%)",
          ].join(","),
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-18 h-72 w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "rgba(255, 255, 255, 0.05)" }}
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="flex h-full min-h-[32rem] w-full flex-col items-center gap-4 sm:gap-6">
          <h1 className="text-center text-[clamp(3.75rem,11vw,6.2rem)] leading-none font-medium text-stone-100 tracking-wider">
            Egor Koldasov
          </h1>

          <div className="flex min-h-0 w-full max-w-4xl flex-1 justify-center">
            <TerminalWindow />
          </div>
        </section>
      </div>
    </main>
  );
}
