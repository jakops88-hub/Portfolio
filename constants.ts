import { ResumeData, Project, Experience } from './types';

export const RESUME_DATA: ResumeData = {
  name: "Jacob Sandström",
  role: "Senior Full-Stack Engineer & AI Architect",
  location: "Sweden",
  contact: "nordicsecures@proton.me",
  links: [
    { label: "dev.to", url: "https://dev.to/the_nortern_dev" },
    { label: "GitHub", url: "https://github.com/jakops88-hub" }
  ],
  summary: "Senior Engineer specializing in pragmatic, reliable architecture ('The Boring Stack'). Expert in Local-First architecture and deterministic AI.",
  competencies: [
    "TypeScript", "Next.js", "Python", "SQL (Postgres/SQLite)", "Docker", "RAG Pipelines"
  ],
  philosophy: "Technology is a delivery mechanism for value. Simplicity scales better than complexity.",
  projects: [
    {
      id: "memvault",
      name: "MemVault",
      description: "Local-first memory server for AI Agents (Postgres + pgvector). Solves retrieval opacity.",
      stack: ["Postgres", "pgvector", "Docker", "TypeScript"],
      type: "project"
    },
    {
      id: "contextdiff",
      name: "ContextDiff",
      description: "Semantic text analysis platform using LLMs for verification.",
      stack: ["LLMs", "Python", "React"],
      type: "project"
    },
    {
      id: "dev-brain",
      name: "Dev-Brain Dump",
      description: "0ms latency apps using SQLite WASM. Proof of Concept.",
      stack: ["SQLite WASM", "Local-First", "React"],
      type: "project"
    },
    {
      id: "lootsy",
      name: "Lootsy.se",
      description: "Full-stack affiliate platform.",
      stack: ["Next.js", "Supabase", "Tailwind"],
      type: "project"
    }
  ]
};

export const EXPERIENCE_DATA: Experience[] = [
  {
    role: "Senior Full-Stack Engineer",
    company: "TechGiant Nordic",
    period: "2021 - Present",
    description: "Leading the transition to local-first architecture. Improved system resilience by 40%."
  },
  {
    role: "Backend Developer",
    company: "FinServe AB",
    period: "2018 - 2021",
    description: "Architected secure payment gateways handling $50M+ annual volume."
  },
  {
    role: "Junior Developer",
    company: "WebSolutions",
    period: "2016 - 2018",
    description: "Full-stack development using React and Node.js."
  }
];

export const SYSTEM_PROMPT = `
You are Jacob's Digital Twin.
Tone: Senior, pragmatic, "Boring Stack" advocate.

Context:
Name: ${RESUME_DATA.name}
Role: ${RESUME_DATA.role}
Summary: ${RESUME_DATA.summary}
Competencies: ${RESUME_DATA.competencies.join(', ')}
Philosophy: ${RESUME_DATA.philosophy}

Significant Projects:
${RESUME_DATA.projects.map(p => `- ${p.name} (ID: ${p.id}): ${p.description}`).join('\n')}

INSTRUCTIONS:
1. Act as Jacob. Be professional but opinionated about simplicity.
2. If you mention specific projects, you MUST append [SHOW_PROJECT: ID] for EACH project mentioned.
3. If asked for resume, career history, or background, append [SHOW_HISTORY] to the end.
4. Keep answers concise and high-value.
5. Do not hallucinate URLs; use the ones provided or say you can't provide it.
`;

export const QUICK_PROMPTS = [
  "Why the Boring Stack?",
  "Show me MemVault",
  "Experience with RAG?",
  "What is your philosophy?"
];