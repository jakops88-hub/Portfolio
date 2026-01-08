import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { ExternalLink, Database, Cpu, Layers, GitBranch, Star } from 'lucide-react';
import { Project } from '../types';

interface HolographicCardProps {
  project: Project;
}

const HolographicCard: React.FC<HolographicCardProps> = ({ project }) => {
  const ref = useRef<HTMLDivElement>(null);

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useMotionTemplate`calc(${mouseYSpring} * -0.5deg)`;
  const rotateY = useMotionTemplate`calc(${mouseXSpring} * 0.5deg)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct * 20); // Sensitivity
    y.set(yPct * 20);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'memvault': return <Database className="w-6 h-6 text-primary" />;
      case 'dev-brain': return <Cpu className="w-6 h-6 text-purple-400" />;
      case 'contextdiff': return <GitBranch className="w-6 h-6 text-orange-400" />;
      default: return <Layers className="w-6 h-6 text-blue-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.8 }}
      className="perspective-1000 w-full max-w-lg mx-auto my-6"
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative group cursor-default"
      >
        {/* Glow Background */}
        <div 
          className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500"
        />

        {/* Card Body */}
        <div className="relative glass-panel rounded-xl overflow-hidden bg-[#0a0a0a]/90 h-full">
          
          {/* Scanner Animation Line */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-700">
             <div className="w-full h-[2px] bg-cyan-400 blur-sm animate-scan shadow-[0_0_10px_#22d3ee]" />
          </div>

          <div className="p-6 relative z-10 flex flex-col h-full">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900/50 border border-white/5 rounded-lg shadow-inner">
                  {getIcon(project.id)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight font-sans">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Deployed
                  </div>
                </div>
              </div>
              
              {/* Fake Star Count for Aesthetic */}
              <div className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded border border-white/5">
                <Star className="w-3 h-3 text-yellow-500" />
                <span>24</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              {project.description}
            </p>

            {/* Stack Badges */}
            <div className="flex flex-wrap gap-2 mb-6 mt-auto">
              {project.stack.map((tech) => (
                <span 
                  key={tech} 
                  className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/20 border border-cyan-900/50 rounded shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                >
                  {tech}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="text-[10px] text-zinc-600 font-mono">
                ID: {project.id.toUpperCase()}
              </div>
              {project.link && (
                <a 
                  href={project.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group/link flex items-center gap-2 text-xs font-semibold text-white hover:text-cyan-400 transition-colors"
                >
                  View Deployment
                  <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                </a>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HolographicCard;