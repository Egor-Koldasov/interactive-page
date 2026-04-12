"use client";

import { useEffect, useRef, useState } from "react";

type LineTone = "default" | "muted" | "accent" | "success" | "error";

type LineSegment = {
  text: string;
  tone?: LineTone;
  href?: string;
};

type TerminalLine = LineSegment[];

type TerminalEntry =
  | {
      id: string;
      type: "command";
      command: string;
    }
  | {
      id: string;
      type: "output";
      lines: TerminalLine[];
    };

type TerminalTab = {
  id: string;
  title: string;
  entries: TerminalEntry[];
  input: string;
  cursorIndex: number;
  history: string[];
  historyIndex: number | null;
};

type TerminalState = {
  tabs: TerminalTab[];
  activeTabId: string;
};

const commandCatalog = {
  help: "Show available commands and usage tips.",
  contacts: "Print email, GitHub, and Telegram contact details.",
} as const;

const commandNames = Object.keys(commandCatalog) as Array<keyof typeof commandCatalog>;
const promptParts = {
  user: "guest",
  host: "egorkolds_page",
  path: "~$",
} as const;

let idCounter = 0;

function createId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function segment(
  text: string,
  tone: LineTone = "default",
  href?: string,
): LineSegment {
  return { text, tone, href };
}

function output(lines: TerminalLine[]): TerminalEntry {
  return {
    id: createId("output"),
    type: "output",
    lines,
  };
}

function createTab(number: number): TerminalTab {
  return {
    id: createId("tab"),
    title: `shell ${number}`,
    entries: [],
    input: "",
    cursorIndex: 0,
    history: [],
    historyIndex: null,
  };
}

function helpLines(): TerminalLine[] {
  return [
    [segment("Available commands", "accent")],
    [
      segment("  help", "success"),
      segment("      Show available commands and shortcuts.", "muted"),
    ],
    [
      segment("  contacts", "success"),
      segment("  Print email, GitHub, and Telegram.", "muted"),
    ],
    [
      segment("Tips:", "accent"),
      segment(
        " Tab autocompletes, Arrow Up/Down walks command history.",
        "muted",
      ),
    ],
  ];
}

function contactLines(): TerminalLine[] {
  return [
    [segment("Contact channels", "accent")],
    [
      segment("  email", "muted"),
      segment(": ", "muted"),
      segment("koldasov3@gmail.com", "success", "mailto:koldasov3@gmail.com"),
    ],
    [
      segment("  github", "muted"),
      segment(": ", "muted"),
      segment(
        "https://github.com/Egor-Koldasov",
        "success",
        "https://github.com/Egor-Koldasov",
      ),
    ],
    [
      segment("  telegram", "muted"),
      segment(": ", "muted"),
      segment("@egorkolds", "success", "https://t.me/egorkolds"),
    ],
  ];
}

function runCommand(rawCommand: string): TerminalEntry[] {
  const command = rawCommand.trim().toLowerCase();

  if (command === "help") {
    return [output(helpLines())];
  }

  if (command === "contacts") {
    return [output(contactLines())];
  }

  return [
    output([
      [segment(`Command not found: ${rawCommand.trim()}`, "error")],
      ...helpLines(),
    ]),
  ];
}

function submitInput(tab: TerminalTab): TerminalTab {
  const rawCommand = tab.input;
  const trimmedCommand = rawCommand.trim();
  const nextEntries: TerminalEntry[] = [
    ...tab.entries,
    {
      id: createId("command"),
      type: "command",
      command: rawCommand,
    },
  ];

  if (!trimmedCommand) {
    return {
      ...tab,
      entries: nextEntries,
      input: "",
      cursorIndex: 0,
      historyIndex: null,
    };
  }

  return {
    ...tab,
    entries: [...nextEntries, ...runCommand(trimmedCommand)],
    input: "",
    cursorIndex: 0,
    history: [...tab.history, trimmedCommand],
    historyIndex: null,
  };
}

function autocomplete(tab: TerminalTab): TerminalTab {
  const candidate = tab.input.trim().toLowerCase();
  if (!candidate) {
    return tab;
  }

  const matches = commandNames.filter((command) => command.startsWith(candidate));
  if (matches.length === 1) {
    return {
      ...tab,
      input: matches[0],
      cursorIndex: matches[0].length,
      historyIndex: null,
    };
  }

  if (matches.length > 1) {
    return {
      ...tab,
      entries: [
        ...tab.entries,
        output([
          [
            segment("Suggestions: ", "muted"),
            segment(matches.join(", "), "accent"),
          ],
        ]),
      ],
    };
  }

  return tab;
}

function cycleHistory(tab: TerminalTab, direction: "up" | "down"): TerminalTab {
  if (tab.history.length === 0) {
    return tab;
  }

  const currentIndex = tab.historyIndex ?? tab.history.length;
  const nextIndex =
    direction === "up"
      ? Math.max(0, currentIndex - 1)
      : Math.min(tab.history.length, currentIndex + 1);

  if (nextIndex === tab.history.length) {
    return {
      ...tab,
      input: "",
      cursorIndex: 0,
      historyIndex: null,
    };
  }

  const nextInput = tab.history[nextIndex];
  return {
    ...tab,
    input: nextInput,
    cursorIndex: nextInput.length,
    historyIndex: nextIndex,
  };
}

function insertTextAtCursor(tab: TerminalTab, text: string): TerminalTab {
  if (!text) {
    return tab;
  }

  const before = tab.input.slice(0, tab.cursorIndex);
  const after = tab.input.slice(tab.cursorIndex);
  const nextInput = `${before}${text}${after}`;
  const nextCursorIndex = before.length + text.length;

  return {
    ...tab,
    input: nextInput,
    cursorIndex: nextCursorIndex,
    historyIndex: null,
  };
}

function moveCursor(tab: TerminalTab, delta: number): TerminalTab {
  return {
    ...tab,
    cursorIndex: Math.max(0, Math.min(tab.input.length, tab.cursorIndex + delta)),
  };
}

function moveCursorToEdge(tab: TerminalTab, edge: "start" | "end"): TerminalTab {
  return {
    ...tab,
    cursorIndex: edge === "start" ? 0 : tab.input.length,
  };
}

function deleteBackward(tab: TerminalTab): TerminalTab {
  if (tab.cursorIndex === 0) {
    return tab;
  }

  const before = tab.input.slice(0, tab.cursorIndex - 1);
  const after = tab.input.slice(tab.cursorIndex);

  return {
    ...tab,
    input: `${before}${after}`,
    cursorIndex: tab.cursorIndex - 1,
    historyIndex: null,
  };
}

function deleteForward(tab: TerminalTab): TerminalTab {
  if (tab.cursorIndex >= tab.input.length) {
    return tab;
  }

  const before = tab.input.slice(0, tab.cursorIndex);
  const after = tab.input.slice(tab.cursorIndex + 1);

  return {
    ...tab,
    input: `${before}${after}`,
    historyIndex: null,
  };
}

function toneClass(tone: LineTone = "default") {
  switch (tone) {
    case "muted":
      return "text-zinc-500";
    case "accent":
      return "text-amber-100";
    case "success":
      return "text-emerald-300";
    case "error":
      return "text-rose-300";
    default:
      return "text-zinc-100";
  }
}

function TerminalPrompt() {
  return (
    <span className="shrink-0 whitespace-nowrap">
      <span className="text-emerald-300">{promptParts.user}</span>
      <span className="text-zinc-500">@</span>
      <span className="text-cyan-300">{promptParts.host}</span>
      <span className="text-zinc-500">:{promptParts.path}</span>
    </span>
  );
}

function createInitialTerminalState(): TerminalState {
  const firstTab = createTab(1);
  return {
    tabs: [firstTab],
    activeTabId: firstTab.id,
  };
}

export function TerminalWindow() {
  const nextTabNumberRef = useRef(2);
  const terminalRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [terminalState, setTerminalState] = useState(createInitialTerminalState);
  const { tabs, activeTabId } = terminalState;

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]!;

  useEffect(() => {
    terminalRef.current?.focus();
  }, [activeTabId, tabs.length]);

  useEffect(() => {
    const panel = scrollRef.current;
    if (!panel) {
      return;
    }

    panel.scrollTop = panel.scrollHeight;
  }, [activeTab.entries, activeTabId, activeTab.input]);

  function focusTerminal() {
    terminalRef.current?.focus();
  }

  function makeTab() {
    const tab = createTab(nextTabNumberRef.current);
    nextTabNumberRef.current += 1;
    return tab;
  }

  function updateActiveTab(transform: (tab: TerminalTab) => TerminalTab) {
    setTerminalState((currentState) => ({
      ...currentState,
      tabs: currentState.tabs.map((tab) =>
        tab.id === currentState.activeTabId ? transform(tab) : tab,
      ),
    }));
  }

  function openTab() {
    const tab = makeTab();
    setTerminalState((currentState) => ({
      tabs: [...currentState.tabs, tab],
      activeTabId: tab.id,
    }));
  }

  function closeTab(tabId: string) {
    setTerminalState((currentState) => {
      const closingIndex = currentState.tabs.findIndex((tab) => tab.id === tabId);
      const remainingTabs = currentState.tabs.filter((tab) => tab.id !== tabId);

      if (remainingTabs.length === 0) {
        const replacementTab = makeTab();
        return {
          tabs: [replacementTab],
          activeTabId: replacementTab.id,
        };
      }

      return {
        tabs: remainingTabs,
        activeTabId:
          currentState.activeTabId === tabId
            ? (remainingTabs[Math.max(0, closingIndex - 1)] ?? remainingTabs[0]).id
            : currentState.activeTabId,
      };
    });
  }

  function appendText(text: string) {
    updateActiveTab((tab) => insertTextAtCursor(tab, text));
  }

  function handlePaste(event: React.ClipboardEvent<HTMLElement>) {
    event.preventDefault();
    appendText(event.clipboardData.getData("text").replace(/\s+/g, " "));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "t") {
      event.preventDefault();
      openTab();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "w") {
      event.preventDefault();
      closeTab(activeTabId);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      updateActiveTab(submitInput);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      updateActiveTab(deleteBackward);
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      updateActiveTab(deleteForward);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      updateActiveTab(autocomplete);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      updateActiveTab((tab) => cycleHistory(tab, "up"));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateActiveTab((tab) => cycleHistory(tab, "down"));
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateActiveTab((tab) => moveCursor(tab, -1));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      updateActiveTab((tab) => moveCursor(tab, 1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      updateActiveTab((tab) => moveCursorToEdge(tab, "start"));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      updateActiveTab((tab) => moveCursorToEdge(tab, "end"));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      updateActiveTab((tab) => ({
        ...tab,
        input: "",
        cursorIndex: 0,
        historyIndex: null,
      }));
      return;
    }

    if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      appendText(event.key);
    }
  }

  return (
    <section
      ref={terminalRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className="flex h-full min-h-[20rem] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,11,20,0.9),rgba(4,7,13,0.96))] shadow-[0_28px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl outline-none focus-visible:border-white/18"
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400/90" />
          <span className="h-3 w-3 rounded-full bg-amber-300/90" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
          <span className="ml-3 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-zinc-400">
            Terminal
          </span>
        </div>

        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-emerald-200">
          Interactive
        </div>
      </div>

      <div className="border-b border-white/8 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;

            return (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                  isActive
                    ? "border-white/14 bg-white/10 text-white"
                    : "border-transparent bg-black/20 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                }`}
              >
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() =>
                    setTerminalState((currentState) => ({
                      ...currentState,
                      activeTabId: tab.id,
                    }))
                  }
                >
                  {tab.title}
                </button>
                <button
                  type="button"
                  className="rounded-full px-1 text-zinc-500 transition hover:bg-white/8 hover:text-zinc-200"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => closeTab(tab.id)}
                >
                  ×
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={openTab}
            className="rounded-full border border-dashed border-white/12 bg-black/20 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/8"
          >
            + Add tab
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          onMouseDown={focusTerminal}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background: [
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
                "linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              ].join(","),
              backgroundSize: "100% 2.1rem, 2.2rem 100%",
            }}
          />

          <div className="relative space-y-3 font-mono text-[0.94rem] leading-7 text-zinc-100">
            {activeTab.entries.map((entry) => {
              if (entry.type === "command") {
                return (
                  <div key={entry.id} className="flex items-start gap-3 break-all">
                    <TerminalPrompt />
                    <span>{entry.command}</span>
                  </div>
                );
              }

              return (
                <div key={entry.id} className="space-y-0.5">
                  {entry.lines.map((line, lineIndex) => (
                    <div
                      key={`${entry.id}-${lineIndex}`}
                      className="whitespace-pre-wrap break-words"
                    >
                      {line.map((part, partIndex) => {
                        const className = toneClass(part.tone);

                        if (part.href) {
                          return (
                            <a
                              key={`${entry.id}-${lineIndex}-${partIndex}`}
                              href={part.href}
                              className={`${className} underline decoration-white/20 underline-offset-4 transition hover:text-white`}
                              target={part.href.startsWith("http") ? "_blank" : undefined}
                              rel={
                                part.href.startsWith("http")
                                  ? "noreferrer noopener"
                                  : undefined
                              }
                            >
                              {part.text}
                            </a>
                          );
                        }

                        return (
                          <span
                            key={`${entry.id}-${lineIndex}-${partIndex}`}
                            className={className}
                          >
                            {part.text}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="flex items-start gap-3 break-all">
              <TerminalPrompt />
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {activeTab.input.slice(0, activeTab.cursorIndex)}
                <span className="ml-[1px] inline-block h-[1.05em] w-[0.68ch] translate-y-[0.12em] rounded-[2px] bg-emerald-300/90 align-baseline [animation:terminal-cursor_1.05s_steps(1)_infinite]" />
                {activeTab.input.slice(activeTab.cursorIndex)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 bg-black/18 px-4 py-3 text-[0.74rem] text-zinc-400 sm:px-6">
          <span>Tab autocompletes commands.</span>
          <span className="mx-2 text-zinc-600">•</span>
          <span>Cmd/Ctrl+T opens a new shell.</span>
          <span className="mx-2 text-zinc-600">•</span>
          <span>{tabs.length} tab(s) open.</span>
        </div>
      </div>
    </section>
  );
}
