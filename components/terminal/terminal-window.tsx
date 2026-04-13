"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import {
  backgroundKinds,
  backgroundRegistry,
} from "@/lib/backgrounds/registry";
import {
  findResumeCompany,
  resumeCompanies,
  resumeCompanyNames,
  resumeDownloadUrl,
  resumeProfile,
  type ResumeCompany,
} from "@/lib/resume/resume-data";
import type { BackgroundKind } from "@/lib/backgrounds/types";
import { terminalThemePreferenceStore } from "@/lib/terminal/theme-preference-store";

type LineTone =
  | "default"
  | "muted"
  | "accent"
  | "success"
  | "error"
  | "link";

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
  themeId: TerminalThemeId;
};

type TerminalThemeId = "modern" | "retro";

type TerminalTheme = {
  id: TerminalThemeId;
  name: string;
  description: string;
  shellClassName: string;
  headerClassName: string;
  headerMetaClassName?: string;
  headerLabel?: string;
  headerLabelClassName?: string;
  statusLightClassName?: string;
  screenClassName: string;
  overlayClassName: string;
  overlayStyle: React.CSSProperties;
  contentClassName: string;
  promptToneClasses: {
    user: string;
    separator: string;
    host: string;
    path: string;
  };
  toneClasses: Record<LineTone, string>;
  tabActiveClassName: string;
  tabInactiveClassName: string;
  closeButtonActiveClassName: string;
  closeButtonInactiveClassName: string;
  addTabClassName: string;
  addTabLabel: string;
  linkClassName: string;
  cursorStyle: React.CSSProperties;
};

type CommandResult = {
  entries: TerminalEntry[];
  nextThemeId?: TerminalThemeId;
  nextBackgroundId?: BackgroundKind;
  downloadUrl?: string;
};

const terminalThemeOrder: TerminalThemeId[] = ["modern", "retro"];

const terminalThemes: Record<TerminalThemeId, TerminalTheme> = {
  modern: {
    id: "modern",
    name: "modern",
    description: "A sleek glass terminal with cool neon accents.",
    shellClassName:
      "overflow-hidden rounded-2xl border border-white/10 bg-[#09090a9c] shadow-[0_28px_120px_rgba(0,0,0,0.52)] backdrop-blur-xs focus-visible:border-white/18",
    headerClassName: "border-b border-white/8",
    screenClassName: "relative flex min-h-0 flex-1 flex-col",
    overlayClassName: "pointer-events-none absolute inset-0 opacity-20",
    overlayStyle: {
      background: [
        "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
      ].join(","),
      backgroundSize: "100% 2.1rem, 2.2rem 100%",
    },
    contentClassName:
      "relative space-y-3 font-mono text-[0.94rem] leading-5 text-zinc-100",
    promptToneClasses: {
      user: "text-emerald-300",
      separator: "text-zinc-500",
      host: "text-cyan-300",
      path: "text-zinc-500",
    },
    toneClasses: {
      default: "text-zinc-100",
      muted: "text-zinc-500",
      accent: "text-amber-100",
      success: "text-emerald-300",
      error: "text-rose-300",
      link: "text-white",
    },
    tabActiveClassName:
      "group flex items-center h-full gap-1.5 bg-white/4 px-8 py-1.5 text-sm text-white transition" +
      " relative",
    tabInactiveClassName:
      "group flex items-center h-full gap-1.5 hover:bg-white/1 px-8 py-1.5 text-sm text-zinc-400 transition hover:text-zinc-200 relative",
    closeButtonActiveClassName:
      "absolute top-2 right-2 text-xl text-zinc-400 opacity-0 pointer-events-none transition hover:text-zinc-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
    closeButtonInactiveClassName:
      "absolute top-2 right-2 text-xl text-zinc-400 opacity-0 pointer-events-none transition hover:text-zinc-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
    addTabClassName:
      "px-3 py-1.5 text-3xl text-zinc-400 hover:text-zinc-100 transition",
    addTabLabel: "+",
    linkClassName:
      "underline decoration-white/20 underline-offset-4 transition hover:text-white",
    cursorStyle: {
      lineHeight: "inherit",
      boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.96)",
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      color: "inherit",
      ["--terminal-cursor-rest-color" as string]: "currentColor",
      ["--terminal-cursor-active-bg" as string]: "rgba(255, 255, 255, 0.96)",
      ["--terminal-cursor-active-color" as string]: "#03050a",
    },
  },
  retro: {
    id: "retro",
    name: "retro",
    description:
      "A beige phosphor CRT with glow, scanlines, and heavier chrome.",
    shellClassName:
      "retro-terminal-shell border border-[#fff8e02e] rounded-xl focus-visible:ring-2 focus-visible:ring-[#181815]/45 overflow-hidden",
    headerClassName: "retro-terminal-header bg-[#181815]",
    headerMetaClassName: "hidden min-w-0 items-center gap-2 sm:flex",
    statusLightClassName:
      "h-2.5 w-2.5 rounded-full bg-[#8eff87] [animation:terminal-led-pulse_2.4s_ease-in-out_infinite]",
    screenClassName:
      "retro-terminal-screen rounded-b-xl relative flex min-h-0 flex-1 flex-col",
    overlayClassName: "pointer-events-none absolute inset-0 opacity-35",
    overlayStyle: {
      background: [
        "linear-gradient(180deg, rgba(198,255,192,0.02), rgba(198,255,192,0.06) 42%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0.22) 100%)",
        "linear-gradient(90deg, rgba(110,255,122,0.03), rgba(246,198,107,0.014), rgba(110,255,122,0.03))",
      ].join(","),
      backgroundSize: "100% 4px, 4px 100%",
    },
    contentClassName:
      "retro-terminal-text relative space-y-3 font-mono text-[0.94rem] leading-5",
    promptToneClasses: {
      user: "text-[#f6c66b] [text-shadow:0_0_8px_rgba(246,198,107,0.25)]",
      separator: "text-[#6d8c64]",
      host: "text-[#a4ff9f] [text-shadow:0_0_8px_rgba(126,255,127,0.24)]",
      path: "text-[#6d8c64]",
    },
    toneClasses: {
      default: "text-[#d6ffd1] [text-shadow:0_0_8px_rgba(123,255,126,0.18)]",
      muted: "text-[#78966e]",
      accent: "text-[#f6c66b] [text-shadow:0_0_9px_rgba(246,198,107,0.28)]",
      success: "text-[#a4ff9f] [text-shadow:0_0_10px_rgba(126,255,127,0.34)]",
      error: "text-[#ff9a75] [text-shadow:0_0_10px_rgba(255,154,117,0.2)]",
      link: "text-white",
    },
    tabActiveClassName:
      "group flex items-center h-full gap-1.5 bg-white/4 px-8 py-1.5 text-sm text-white transition" +
      " relative",
    tabInactiveClassName:
      "group flex items-center h-full gap-1.5 hover:bg-white/1 px-8 py-1.5 text-sm text-zinc-400 transition hover:text-zinc-200 relative",
    closeButtonActiveClassName:
      "absolute top-1 right-2 text-xl text-zinc-400 opacity-0 pointer-events-none transition hover:text-zinc-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
    closeButtonInactiveClassName:
      "absolute top-1 right-2 text-xl text-zinc-400 opacity-0 pointer-events-none transition hover:text-zinc-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
    addTabClassName:
      "px-3 py-1.5 text-3xl text-zinc-400 hover:text-zinc-100 transition",
    addTabLabel: "+",
    linkClassName:
      "underline underline-offset-4 transition hover:text-[#ffe4a6]",
    cursorStyle: {
      lineHeight: "inherit",
      boxShadow:
        "inset 0 0 0 1px rgba(181, 255, 173, 0.88), 0 0 10px rgba(181, 255, 173, 0.34)",
      backgroundColor: "rgba(181, 255, 173, 0.94)",
      color: "#071108",
      ["--terminal-cursor-rest-color" as string]: "currentColor",
      ["--terminal-cursor-active-bg" as string]: "rgba(181, 255, 173, 0.94)",
      ["--terminal-cursor-active-color" as string]: "#071108",
    },
  },
};

const commandCatalog = {
  help: "Show available commands and usage tips.",
  contacts: "Print email, GitHub, and Telegram contact details.",
  resume: "Explore the current resume and download the PDF.",
  theme: "List and switch terminal themes.",
  background: "List and switch ASCII backgrounds.",
} as const;

const commandNames = Object.keys(commandCatalog) as Array<
  keyof typeof commandCatalog
>;
const promptParts = {
  user: "guest",
  host: "egorkolds_page",
  path: "$",
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

function triggerDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
      segment("       Show available commands and shortcuts.", "muted"),
    ],
    [
      segment("  contacts", "success"),
      segment("   Print author's contact details.", "muted"),
    ],
    [
      segment("  resume", "success"),
      segment("     Explore resume overview, list, read, and download.", "muted"),
    ],
    [
      segment("  theme", "success"),
      segment("      Manage terminal theme.", "muted"),
    ],
    [
      segment("  background", "success"),
      segment(" Manage page background.", "muted"),
    ],
    // [
    //   segment("Tips:", "accent"),
    //   segment(" Tab autocompletes, Arrow Up/Down walks history.", "muted"),
    // ],
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

function resumeHelpLines(): TerminalLine[] {
  return [
    [segment("Resume commands", "accent")],
    [
      segment("  Usage", "muted"),
      segment(": resume <command>", "default"),
    ],
    [
      segment("  resume overview", "success"),
      segment(" Show a summary of experience and current focus.", "muted"),
    ],
    [
      segment("  resume list", "success"),
      segment("     List companies, role, and working periods.", "muted"),
    ],
    [
      segment("  resume read <company>", "success"),
      segment(" Show the full experience for one company.", "muted"),
    ],
    [
      segment("  resume download", "success"),
      segment(" Open the resume PDF.", "muted"),
    ],
    [
      segment("Example: ", "muted"),
      segment("resume read iorad", "success"),
    ],
  ];
}

function resumeOverviewLines(): TerminalLine[] {
  return [
    [segment(resumeProfile.name, "accent")],
    [
      segment(`  ${resumeProfile.title}`, "success"),
      segment(`  ${resumeProfile.focus.join(" | ")}`, "muted"),
    ],
    [
      segment("  Website", "muted"),
      segment(": ", "muted"),
      segment(
        resumeProfile.website,
        "success",
        `https://${resumeProfile.website}`,
      ),
    ],
    [
      segment("  Email", "muted"),
      segment(": ", "muted"),
      segment(
        resumeProfile.email,
        "success",
        `mailto:${resumeProfile.email}`,
      ),
    ],
    [
      segment("  LinkedIn", "muted"),
      segment(": ", "muted"),
      segment(
        resumeProfile.linkedIn,
        "success",
        `https://${resumeProfile.linkedIn}`,
      ),
    ],
    [
      segment("  GitHub", "muted"),
      segment(": ", "muted"),
      segment(
        resumeProfile.github,
        "success",
        `https://${resumeProfile.github}`,
      ),
    ],
    ...resumeProfile.summary.map((line) => [segment(line, "default")]),
    [segment("Experience snapshot", "accent")],
    [
      segment("  Companies", "muted"),
      segment(`: ${resumeCompanies.length}`, "success"),
      segment(" product teams and startups.", "muted"),
    ],
    [
      segment("  Ownership", "muted"),
      segment(
        ": end-to-end feature delivery with planning and process support.",
        "default",
      ),
    ],
    [
      segment("  Recent focus", "muted"),
      segment(`: ${resumeProfile.recentFocus}`, "default"),
    ],
    [
      segment("Next steps: ", "muted"),
      segment("resume list", "accent"),
      segment(", ", "muted"),
      segment("resume read iorad", "accent"),
      segment(", ", "muted"),
      segment("resume download", "accent"),
    ],
  ];
}

function companyRoleLabel(company: ResumeCompany) {
  return Array.from(
    new Set(company.experiences.map((experience) => experience.role)),
  ).join(", ");
}

function companyPeriodsLabel(company: ResumeCompany) {
  return company.experiences.map((experience) => experience.period).join("; ");
}

function resumeListLines(): TerminalLine[] {
  return [
    [segment("Resume companies", "accent")],
    ...resumeCompanies.flatMap((company, companyIndex) => {
      const lines: TerminalLine[] = [
        [segment(`  ${company.name}`, "success")],
        [
          segment("    Company", "muted"),
          segment(`: ${company.description}`, "default"),
        ],
        [
          segment("    Role", "muted"),
          segment(`: ${companyRoleLabel(company)}`, "default"),
        ],
        [
          segment("    Period", "muted"),
          segment(`: ${companyPeriodsLabel(company)}`, "accent"),
        ],
        [
          segment("    Read", "muted"),
          segment(`: resume read ${company.id}`, "success"),
        ],
      ];

      if (companyIndex < resumeCompanies.length - 1) {
        lines.push([segment("")]);
      }

      return lines;
    }),
  ];
}

function resumeReadLines(company: ResumeCompany): TerminalLine[] {
  return [
    [segment(company.name, "accent")],
    [segment(company.description, "muted")],
    ...(company.websiteLabel && company.websiteHref
      ? [
          [
            segment("Website", "muted"),
            segment(": ", "muted"),
            segment(company.websiteLabel, "success", company.websiteHref),
          ],
        ]
      : []),
    [segment("")],
    ...company.experiences.flatMap((experience, index) => {
      const lines: TerminalLine[] = [
        [
          segment(experience.role, "success"),
          segment("  ", "muted"),
          segment(experience.period, "accent"),
        ],
        [segment(experience.location, "muted")],
        ...experience.details.map((detail) => [segment(detail, "default")]),
        [
          segment("Tech Stack", "muted"),
          segment(`: ${experience.techStack.join(", ")}`, "success"),
        ],
      ];

      if (index < company.experiences.length - 1) {
        lines.push([segment("")]);
      }

      return lines;
    }),
  ];
}

function resumeDownloadLines(): TerminalLine[] {
  return [
    [
      segment("Resume PDF: ", "muted"),
      segment(resumeDownloadUrl, "link", resumeDownloadUrl),
    ],
  ];
}

function runResumeCommand(args: string[]): CommandResult {
  if (args.length === 0) {
    return {
      entries: [
        output([
          [segment("Usage: resume <command>", "error")],
          ...resumeHelpLines(),
        ]),
      ],
    };
  }

  const subcommand = args[0]?.toLowerCase();

  if (subcommand === "help") {
    return { entries: [output(resumeHelpLines())] };
  }

  if (subcommand === "overview") {
    return { entries: [output(resumeOverviewLines())] };
  }

  if (subcommand === "list") {
    return { entries: [output(resumeListLines())] };
  }

  if (subcommand === "download") {
    return {
      entries: [output(resumeDownloadLines())],
      downloadUrl: resumeDownloadUrl,
    };
  }

  if (subcommand === "read") {
    const requestedCompany = args.slice(1).join(" ");

    if (!requestedCompany) {
      return {
        entries: [
          output([
            [segment("Usage: resume read <company>", "error")],
            [
              segment("Available companies: ", "muted"),
              segment(resumeCompanyNames.join(", "), "accent"),
            ],
          ]),
        ],
      };
    }

    const company = findResumeCompany(requestedCompany);

    if (!company) {
      return {
        entries: [
          output([
            [segment(`Unknown company: ${requestedCompany}`, "error")],
            [
              segment("Available companies: ", "muted"),
              segment(resumeCompanyNames.join(", "), "accent"),
            ],
          ]),
        ],
      };
    }

    return { entries: [output(resumeReadLines(company))] };
  }

  return {
    entries: [
      output([
        [segment(`Unknown resume command: ${subcommand}`, "error")],
        ...resumeHelpLines(),
      ]),
    ],
  };
}

function isTerminalThemeId(value: string): value is TerminalThemeId {
  return terminalThemeOrder.includes(value as TerminalThemeId);
}

function isBackgroundKind(value: string): value is BackgroundKind {
  return backgroundKinds.includes(value as BackgroundKind);
}

function normalizeBackgroundAlias(value: string) {
  return value === "neon-district" || value === "urbar" ? "urban" : value;
}

function themeHelpLines(): TerminalLine[] {
  return [
    [segment("Theme commands", "accent")],
    [
      segment("  theme list", "success"),
      segment("  Show available terminal themes.", "muted"),
    ],
    [
      segment("  theme set <name>", "success"),
      segment("   Switch to a theme by name.", "muted"),
    ],
    [
      segment("  theme current", "success"),
      segment(" Show the active theme.", "muted"),
    ],
    [
      segment("  theme help", "success"),
      segment("  Show theme usage and examples.", "muted"),
    ],
    [segment("Example: ", "muted"), segment("theme set retro", "success")],
  ];
}

function themeListLines(currentThemeId: TerminalThemeId): TerminalLine[] {
  return [
    [segment("Available themes", "accent")],
    ...terminalThemeOrder.map((themeId) => {
      const theme = terminalThemes[themeId];
      const isActive = themeId === currentThemeId;

      return [
        ...(isActive ? [segment("  [active] ", "accent")] : [segment("  ")]),
        segment(theme.name, isActive ? "success" : "default"),
        segment(`  ${theme.description}`, "muted"),
      ];
    }),
  ];
}

function themeCurrentLines(currentThemeId: TerminalThemeId): TerminalLine[] {
  const theme = terminalThemes[currentThemeId];

  return [
    [segment("Current theme", "accent")],
    [segment(`  ${theme.name}`, "success")],
    [segment(`  ${theme.description}`, "muted")],
  ];
}

function runThemeCommand(
  args: string[],
  currentThemeId: TerminalThemeId,
): CommandResult {
  if (args.length === 0) {
    return { entries: [output(themeHelpLines())] };
  }

  const subcommand = args[0]?.toLowerCase();

  if (subcommand === "help") {
    return { entries: [output(themeHelpLines())] };
  }

  if (subcommand === "list") {
    return { entries: [output(themeListLines(currentThemeId))] };
  }

  if (subcommand === "current") {
    return { entries: [output(themeCurrentLines(currentThemeId))] };
  }

  if (subcommand === "set") {
    const requestedTheme = args[1]?.toLowerCase();

    if (!requestedTheme) {
      return {
        entries: [
          output([
            [segment("Usage: theme set <name>", "error")],
            ...themeHelpLines(),
          ]),
        ],
      };
    }

    if (!isTerminalThemeId(requestedTheme)) {
      return {
        entries: [
          output([
            [segment(`Unknown theme: ${requestedTheme}`, "error")],
            [
              segment("Run ", "muted"),
              segment("theme list", "accent"),
              segment(" to see available themes.", "muted"),
            ],
          ]),
        ],
      };
    }

    if (requestedTheme === currentThemeId) {
      return {
        entries: [
          output([
            [
              segment("Theme already active: ", "muted"),
              segment(terminalThemes[requestedTheme].name, "accent"),
            ],
          ]),
        ],
      };
    }

    return {
      entries: [
        output([
          [
            segment("Theme changed to ", "muted"),
            segment(terminalThemes[requestedTheme].name, "success"),
            segment(".", "muted"),
          ],
          [segment(terminalThemes[requestedTheme].description, "muted")],
        ]),
      ],
      nextThemeId: requestedTheme,
    };
  }

  return {
    entries: [
      output([
        [segment(`Unknown theme command: ${subcommand}`, "error")],
        ...themeHelpLines(),
      ]),
    ],
  };
}

function backgroundHelpLines(): TerminalLine[] {
  return [
    [segment("Background commands", "accent")],
    [
      segment("  background list", "success"),
      segment("    Show available ASCII backgrounds.", "muted"),
    ],
    [
      segment("  background current", "success"),
      segment(" Show the active background.", "muted"),
    ],
    [
      segment("  background set <name>", "success"),
      segment(" Switch to a background by id.", "muted"),
    ],
    [
      segment("Example: ", "muted"),
      segment("background set aurora-peaks", "success"),
    ],
  ];
}

function backgroundListLines(
  currentBackgroundId: BackgroundKind,
): TerminalLine[] {
  return [
    [segment("Available backgrounds", "accent")],
    ...backgroundKinds.map((backgroundId) => {
      const background = backgroundRegistry[backgroundId];
      const isActive = backgroundId === currentBackgroundId;

      return [
        ...(isActive ? [segment("  [active] ", "accent")] : [segment("  ")]),
        segment(backgroundId, isActive ? "success" : "default"),
        segment(`  ${background.label}`, "accent"),
        segment(`  ${background.description}`, "muted"),
      ];
    }),
  ];
}

function backgroundCurrentLines(
  currentBackgroundId: BackgroundKind,
): TerminalLine[] {
  const background = backgroundRegistry[currentBackgroundId];

  return [
    [segment("Current background", "accent")],
    [segment(`  ${currentBackgroundId}`, "success")],
    [segment(`  ${background.label}`, "accent")],
    [segment(`  ${background.description}`, "muted")],
  ];
}

function runBackgroundCommand(
  args: string[],
  currentBackgroundId: BackgroundKind,
): CommandResult {
  if (args.length === 0) {
    return { entries: [output(backgroundHelpLines())] };
  }

  const subcommand = args[0]?.toLowerCase();

  if (subcommand === "help") {
    return { entries: [output(backgroundHelpLines())] };
  }

  if (subcommand === "list") {
    return { entries: [output(backgroundListLines(currentBackgroundId))] };
  }

  if (subcommand === "current") {
    return { entries: [output(backgroundCurrentLines(currentBackgroundId))] };
  }

  if (subcommand === "set") {
    const requestedBackgroundRaw = args[1]?.toLowerCase();
    const requestedBackground = requestedBackgroundRaw
      ? normalizeBackgroundAlias(requestedBackgroundRaw)
      : undefined;

    if (!requestedBackgroundRaw || !requestedBackground) {
      return {
        entries: [
          output([
            [segment("Usage: background set <name>", "error")],
            ...backgroundHelpLines(),
          ]),
        ],
      };
    }

    if (!isBackgroundKind(requestedBackground)) {
      return {
        entries: [
          output([
            [segment(`Unknown background: ${requestedBackground}`, "error")],
            [
              segment("Run ", "muted"),
              segment("background list", "accent"),
              segment(" to see available backgrounds.", "muted"),
            ],
          ]),
        ],
      };
    }

    if (requestedBackground === currentBackgroundId) {
      return {
        entries: [
          output([
            [
              segment("Background already active: ", "muted"),
              segment(requestedBackground, "accent"),
            ],
          ]),
        ],
      };
    }

    return {
      entries: [
        output([
          [
            segment("Background changed to ", "muted"),
            segment(requestedBackground, "success"),
            segment(".", "muted"),
          ],
          [
            segment(
              backgroundRegistry[requestedBackground].description,
              "muted",
            ),
          ],
        ]),
      ],
      nextBackgroundId: requestedBackground,
    };
  }

  return {
    entries: [
      output([
        [segment(`Unknown background command: ${subcommand}`, "error")],
        ...backgroundHelpLines(),
      ]),
    ],
  };
}

function runCommand(
  rawCommand: string,
  currentThemeId: TerminalThemeId,
  currentBackgroundId: BackgroundKind,
): CommandResult {
  const trimmedCommand = rawCommand.trim();
  const [command, ...args] = trimmedCommand.split(/\s+/);
  const normalizedCommand = command.toLowerCase();

  if (normalizedCommand === "help") {
    return { entries: [output(helpLines())] };
  }

  if (normalizedCommand === "contacts") {
    return { entries: [output(contactLines())] };
  }

  if (normalizedCommand === "resume") {
    return runResumeCommand(args);
  }

  if (normalizedCommand === "theme") {
    return runThemeCommand(args, currentThemeId);
  }

  if (normalizedCommand === "background") {
    return runBackgroundCommand(args, currentBackgroundId);
  }

  return {
    entries: [
      output([
        [segment(`Command not found: ${trimmedCommand}`, "error")],
        ...helpLines(),
      ]),
    ],
  };
}

function submitInput(
  tab: TerminalTab,
  currentThemeId: TerminalThemeId,
  currentBackgroundId: BackgroundKind,
): {
  nextTab: TerminalTab;
  nextThemeId?: TerminalThemeId;
  nextBackgroundId?: BackgroundKind;
  nextDownloadUrl?: string;
} {
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
      nextTab: {
        ...tab,
        entries: nextEntries,
        input: "",
        cursorIndex: 0,
        historyIndex: null,
      },
    };
  }

  const commandResult = runCommand(
    trimmedCommand,
    currentThemeId,
    currentBackgroundId,
  );

  return {
    nextTab: {
      ...tab,
      entries: [...nextEntries, ...commandResult.entries],
      input: "",
      cursorIndex: 0,
      history: [...tab.history, trimmedCommand],
      historyIndex: null,
    },
    nextThemeId: commandResult.nextThemeId,
    nextBackgroundId: commandResult.nextBackgroundId,
    nextDownloadUrl: commandResult.downloadUrl,
  };
}

function autocomplete(tab: TerminalTab): TerminalTab {
  const candidate = tab.input.trim().toLowerCase();
  if (!candidate) {
    return tab;
  }

  const matches = commandNames.filter((command) =>
    command.startsWith(candidate),
  );
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
    cursorIndex: Math.max(
      0,
      Math.min(tab.input.length, tab.cursorIndex + delta),
    ),
  };
}

function moveCursorToEdge(
  tab: TerminalTab,
  edge: "start" | "end",
): TerminalTab {
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

function toneClass(theme: TerminalTheme, tone: LineTone = "default") {
  return theme.toneClasses[tone];
}

function TerminalPrompt({ theme }: { theme: TerminalTheme }) {
  return (
    <span className="shrink-0 whitespace-nowrap">
      <span className={theme.promptToneClasses.user}>{promptParts.user}</span>
      <span className={theme.promptToneClasses.separator}>@</span>
      <span className={theme.promptToneClasses.host}>{promptParts.host}</span>
      <span className={theme.promptToneClasses.path}>:{promptParts.path}</span>
    </span>
  );
}

function getCursorGlyph(input: string, cursorIndex: number) {
  const glyph = input[cursorIndex];
  if (!glyph) {
    return "\u00A0";
  }

  return glyph === " " ? "\u00A0" : glyph;
}

function createInitialTerminalState(): TerminalState {
  const firstTab = createTab(1);
  return {
    tabs: [firstTab],
    activeTabId: firstTab.id,
    themeId: "modern",
  };
}

type TerminalWindowProps = {
  currentBackgroundId: BackgroundKind;
  onBackgroundChange: (backgroundId: BackgroundKind) => void;
};

export function TerminalWindow({
  currentBackgroundId,
  onBackgroundChange,
}: TerminalWindowProps) {
  const nextTabNumberRef = useRef(2);
  const terminalRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isThemePreferenceReady, setIsThemePreferenceReady] = useState(false);
  const [terminalState, setTerminalState] = useState(
    createInitialTerminalState,
  );
  const { tabs, activeTabId, themeId } = terminalState;

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]!;
  const activeTheme = terminalThemes[themeId];
  const cursorGlyph = getCursorGlyph(activeTab.input, activeTab.cursorIndex);

  useEffect(() => {
    terminalRef.current?.focus();
  }, [activeTabId, tabs.length]);

  useEffect(() => {
    const storedThemeId = terminalThemePreferenceStore.read();

    startTransition(() => {
      if (storedThemeId && isTerminalThemeId(storedThemeId)) {
        setTerminalState((currentState) =>
          currentState.themeId === storedThemeId
            ? currentState
            : {
                ...currentState,
                themeId: storedThemeId,
              },
        );
      }

      setIsThemePreferenceReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isThemePreferenceReady) {
      return;
    }

    terminalThemePreferenceStore.write(themeId);
  }, [themeId, isThemePreferenceReady]);

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
      ...currentState,
      tabs: [...currentState.tabs, tab],
      activeTabId: tab.id,
    }));
  }

  function closeTab(tabId: string) {
    setTerminalState((currentState) => {
      const closingIndex = currentState.tabs.findIndex(
        (tab) => tab.id === tabId,
      );
      const remainingTabs = currentState.tabs.filter((tab) => tab.id !== tabId);

      if (remainingTabs.length === 0) {
        const replacementTab = makeTab();
        return {
          ...currentState,
          tabs: [replacementTab],
          activeTabId: replacementTab.id,
        };
      }

      return {
        ...currentState,
        tabs: remainingTabs,
        activeTabId:
          currentState.activeTabId === tabId
            ? (remainingTabs[Math.max(0, closingIndex - 1)] ?? remainingTabs[0])
                .id
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "w") {
      event.preventDefault();
      closeTab(activeTabId);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const { nextTab, nextThemeId, nextBackgroundId, nextDownloadUrl } =
        submitInput(
          activeTab,
          themeId,
          currentBackgroundId,
        );

      setTerminalState((currentState) => ({
        ...currentState,
        themeId: nextThemeId ?? currentState.themeId,
        tabs: currentState.tabs.map((tab) =>
          tab.id === currentState.activeTabId ? nextTab : tab,
        ),
      }));

      if (nextBackgroundId && nextBackgroundId !== currentBackgroundId) {
        onBackgroundChange(nextBackgroundId);
      }

      if (nextDownloadUrl) {
        triggerDownload(nextDownloadUrl);
      }

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
      className={`${activeTheme.shellClassName} flex h-full min-h-[20rem] w-full max-w-3xl flex-col outline-none`}
    >
      <div className={activeTheme.headerClassName}>
        <div className="flex items-center gap-3 h-full">
          {activeTheme.headerMetaClassName &&
          activeTheme.headerLabel &&
          activeTheme.headerLabelClassName ? (
            <div className={activeTheme.headerMetaClassName}>
              {activeTheme.statusLightClassName ? (
                <span
                  aria-hidden="true"
                  className={activeTheme.statusLightClassName}
                />
              ) : null}
              <span className={activeTheme.headerLabelClassName}>
                {activeTheme.headerLabel}
              </span>
            </div>
          ) : null}

          <div className="min-w-0 flex-1 overflow-x-auto h-full">
            <div className="flex items-center h-full">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;

                return (
                  <div
                    key={tab.id}
                    className={
                      isActive
                        ? activeTheme.tabActiveClassName
                        : activeTheme.tabInactiveClassName
                    }
                  >
                    <button
                      type="button"
                      className="cursor-pointer whitespace-nowrap"
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
                      className={
                        isActive
                          ? activeTheme.closeButtonActiveClassName
                          : activeTheme.closeButtonInactiveClassName
                      }
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
                className={activeTheme.addTabClassName}
              >
                {activeTheme.addTabLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={activeTheme.screenClassName}>
        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          onMouseDown={focusTerminal}
        >
          <div
            aria-hidden="true"
            className={activeTheme.overlayClassName}
            style={activeTheme.overlayStyle}
          />

          <div className={activeTheme.contentClassName}>
            {activeTab.entries.map((entry) => {
              if (entry.type === "command") {
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 break-all"
                  >
                    <TerminalPrompt theme={activeTheme} />
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
                        const className = toneClass(activeTheme, part.tone);

                        if (part.href) {
                          return (
                            <a
                              key={`${entry.id}-${lineIndex}-${partIndex}`}
                              href={part.href}
                              className={`${className} ${activeTheme.linkClassName}`}
                              target={
                                part.href.startsWith("http")
                                  ? "_blank"
                                  : undefined
                              }
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
              <TerminalPrompt theme={activeTheme} />
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {activeTab.input.slice(0, activeTab.cursorIndex)}
                <span
                  className="inline-block w-[1ch] rounded-[2px] align-baseline text-left [animation:terminal-cursor-classic_1.05s_steps(1)_infinite]"
                  style={activeTheme.cursorStyle}
                >
                  {cursorGlyph}
                </span>
                {activeTab.input.slice(
                  activeTab.cursorIndex +
                    (activeTab.cursorIndex < activeTab.input.length ? 1 : 0),
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
