import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Layers, Database, Cpu } from 'lucide-react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'memvault': return <Database className="w-5 h-5 text-cyan-400" />;
      case 'dev-brain': return <Cpu className="w-5 h-5 text-purple-400" />;
      default: return <Layers className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 w-full max-w-md bg-surface border border-border rounded-lg overflow-hidden shadow-lg hover:border-zinc-600 transition-colors"
    >
      <div className="p-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           {getIcon(project.id)}
        </div>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800">
             {getIcon(project.id)}
          </div>
          <h3 className="font-mono text-lg font-bold text-white tracking-tight">
            {project.name}
          </h3>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-4">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {project.stack.map((tech) => (
            <span 
              key={tech} 
              className="px-2 py-1 text-xs font-medium text-zinc-300 bg-zinc-800/50 border border-zinc-700 rounded-md"
            >
              {tech}
            </span>
          ))}
        </div>

        {project.link && (
          <a 
            href={project.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            VIEW PROJECT <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500/50 to-blue-600/50" />
    </motion.div>
  );
};

export default ProjectCard;