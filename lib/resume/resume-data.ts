export const resumeDownloadUrl =
  "https://docs.google.com/document/d/1VLCoSJOIS01FpFMLBe453fntRZkWePUm/export?format=pdf";

export type ResumeExperience = {
  id: string;
  role: string;
  period: string;
  location: string;
  details: string[];
  techStack: string[];
};

export type ResumeCompany = {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  websiteLabel?: string;
  websiteHref?: string;
  experiences: ResumeExperience[];
};

export const resumeProfile = {
  name: "Egor Koldasov",
  title: "Full-stack Web developer",
  focus: ["React", "Node.js", "PostgreSQL"],
  website: "egor-koldasov.dev",
  email: "koldasov3@gmail.com",
  linkedIn: "linkedin.com/in/egor-koldasov",
  github: "github.com/Egor-Koldasov",
  summary: [
    "Extensive experience working at small companies and digital product startups. Skilled at staying productive while shipping new features, adapting to available resources, and working with shifting priorities.",
    "Core specialty is end-to-end FullStack feature development with full personal ownership of projects. I also have experience working beyond my primary role by helping with DevOps, future feature planning, and internal team processes.",
  ],
  recentFocus:
    "AI features, LLMs with RAG, text-to-speech, and speech-to-text integrations.",
} as const;

export const resumeCompanies: ResumeCompany[] = [
  {
    id: "iorad",
    name: "Iorad",
    aliases: ["iorad", "iorad ai", "iorad core"],
    description:
      "Tutorial and training software for support teams, including later work on an AI knowledge assistant.",
    websiteLabel: "iorad.com",
    websiteHref: "https://iorad.com",
    experiences: [
      {
        id: "iorad-return",
        role: "Full-stack Developer",
        period: "Apr 2025 - Feb 2026",
        location: "Remote",
        details: [
          "Returned to Iorad to work on new projects with a focus on AI features, LLMs with RAG, AI text-to-speech, and speech-to-text.",
          "The main work included the Librarian feature, an AI assistant connected to a team's knowledge base and their created tutorials.",
        ],
        techStack: [
          "React",
          "Node",
          "MySQL",
          "TypeScript",
          "Redux",
          "SASS",
          "Gemini",
          "Milvus",
          "ElevenLabs",
        ],
      },
      {
        id: "iorad-core",
        role: "Full-stack Developer",
        period: "Feb 2016 - Jan 2022",
        location: "Remote",
        details: [
          "Joined when the first real customers were coming in and the product roadmap was just taking shape.",
          "Built features across the full product scope, including the web app, browser extension, embeddable widget, payments and subscriptions, analytics, internal admin tooling, third-party integrations, and performance work.",
          "With active involvement, the project achieved strong results and continues to grow.",
        ],
        techStack: [
          "React",
          "Node",
          "MySQL",
          "TypeScript",
          "Redux",
          "SASS",
        ],
      },
    ],
  },
  {
    id: "tenpu",
    name: "Tenpu",
    aliases: ["tenpu"],
    description:
      "Startup building software for registering and managing tender deals in the Netherlands.",
    websiteLabel: "tenpu.eu",
    websiteHref: "https://tenpu.eu",
    experiences: [
      {
        id: "tenpu-core",
        role: "Full-stack Developer",
        period: "Dec 2023 - Jan 2025",
        location: "Amsterdam, Netherlands | Remote",
        details: [
          "Joined the team at an early stage, built the MVP for the first customers, participated in product planning and roadmap discussions, and helped with team growth.",
          "A defining challenge was deeply understanding the legal tender process, including its types, lifecycle stages, and correct registration in the official registry.",
          "In the absence of detailed unified documentation, the onboarding work was closer to deep research than a standard product handoff.",
        ],
        techStack: [
          "React",
          "Next.js",
          "Prisma",
          "PostgreSQL",
          "Node",
          "TypeScript",
          "Jest",
          "Playwright",
          "Tailwind",
        ],
      },
    ],
  },
  {
    id: "frame",
    name: "Frame",
    aliases: ["frame"],
    description:
      "Startup building a unified workspace for tasks, docs, diagrams, and connected team data.",
    experiences: [
      {
        id: "frame-core",
        role: "Full-stack Developer",
        period: "Sep 2022 - Nov 2023",
        location: "Tbilisi, Georgia | Hybrid, Remote",
        details: [
          "Worked on a product aiming to reduce project-management overhead by combining task management, documents, documentation, diagrams, and third-party integrations into one connected workspace.",
          "Joined after the pre-seed round, participated in development and future planning, advocated for using the product internally first, and contributed to the Product Hunt launch, promotion, analytics gathering, and user feedback collection.",
        ],
        techStack: [
          "React",
          "Node",
          "TypeScript",
          "AWS",
          "PostgreSQL",
          "Jest",
          "Cypress",
          "SASS",
        ],
      },
    ],
  },
  {
    id: "cosysoft",
    name: "CosySoft",
    aliases: ["cosysoft", "cosy soft"],
    description:
      "Product company behind Autostat Radar, a client for automotive market analytics data.",
    experiences: [
      {
        id: "cosysoft-core",
        role: "Full-stack Developer",
        period: "Jan 2015 - Nov 2015",
        location: "Tolyatti, Russia | Onsite",
        details: [
          "First commercial role, joining with a few pet projects and a strong motivation to learn, gain real-world experience, and prove myself.",
          "After ramping up, reached the team's pace within a few months and often helped others as well.",
          "Worked on Autostat Radar, a tool for making large automotive analytics datasets accessible through a client tailored to the domain and its data structure.",
        ],
        techStack: [
          "JavaScript",
          "MySQL",
          "PHP",
          "Java",
          "OLAP",
          "Docker",
          "Backbone.js",
          "jQuery",
        ],
      },
    ],
  },
];

export const resumeCompanyNames = resumeCompanies.map((company) => company.name);

export function findResumeCompany(query: string) {
  const normalizedQuery = normalizeResumeLookup(query);

  return resumeCompanies.find((company) =>
    [company.id, company.name, ...company.aliases].some(
      (candidate) => normalizeResumeLookup(candidate) === normalizedQuery,
    ),
  );
}

function normalizeResumeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
