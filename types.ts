export interface Project {
  id: string;
  name: string;
  description: string;
  stack: string[];
  link?: string;
  type: 'project';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  relatedProjectIds?: string[];
  showHistory?: boolean;
  isHidden?: boolean;
  isThinking?: boolean;
}

export interface ResumeData {
  name: string;
  role: string;
  location: string;
  contact: string;
  links: { label: string; url: string }[];
  summary: string;
  competencies: string[];
  projects: Project[];
  philosophy: string;
}

export interface PinnedRepo {
  name: string;
  description: string;
  url: string;
  stargazerCount: number;
  language: string;
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  description: string;
}