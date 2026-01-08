import React, { useEffect, useState } from 'react';
import { User, MapPin, Mail, Github, Globe, Terminal, Server, Star, GitFork } from 'lucide-react';
import { RESUME_DATA } from '../constants';
import { getPinnedRepos } from '../services/githubService';
import { PinnedRepo } from '../types';

const ResumeSidebar: React.FC = () => {
  const [pinnedRepos, setPinnedRepos] = useState<PinnedRepo[]>([]);

  useEffect(() => {
    // Extract username from GitHub URL (e.g., https://github.com/jakops88-hub -> jakops88-hub)
    const githubLink = RESUME_DATA.links.find(l => l.label === 'GitHub');
    if (githubLink) {
      const username = githubLink.url.split('/').pop();
      if (username) {
        getPinnedRepos(username).then(setPinnedRepos);
      }
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10 border-r border-border bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-zinc-900 rounded-full border border-zinc-700 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-zinc-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {RESUME_DATA.name}
          </h1>
          <p className="text-lg text-cyan-400 font-mono">
            {RESUME_DATA.role}
          </p>
          <div className="flex flex-col gap-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {RESUME_DATA.location}
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> {RESUME_DATA.contact}
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-zinc-800" />

        {/* Summary */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4" /> About
          </h2>
          <p className="text-zinc-300 leading-relaxed text-sm">
            {RESUME_DATA.summary}
          </p>
        </section>

        {/* Philosophy */}
        <section>
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
             <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Philosophy</h3>
             <p className="text-zinc-300 italic text-sm">"{RESUME_DATA.philosophy}"</p>
          </div>
        </section>

        {/* Competencies */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" /> Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {RESUME_DATA.competencies.map(skill => (
              <span key={skill} className="px-3 py-1 bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Pinned Repositories (Featured Code) */}
        {pinnedRepos.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <GitFork className="w-4 h-4" /> Featured Code
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {pinnedRepos.map((repo) => (
                <a 
                  key={repo.name}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-zinc-900/30 border border-zinc-800 rounded hover:border-zinc-600 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">
                      {repo.name}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Star className="w-3 h-3 text-yellow-500/50" />
                      {repo.stargazerCount}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-2">
                    {repo.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                      {repo.language}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        <section className="pt-4">
          <div className="flex gap-4">
            {RESUME_DATA.links.map(link => (
              <a 
                key={link.label}
                href={link.url}
                target="_blank" 
                rel="noreferrer"
                className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                {link.label.toLowerCase().includes('git') ? <Github className="w-4 h-4"/> : <Globe className="w-4 h-4"/>}
                {link.label}
              </a>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default ResumeSidebar;