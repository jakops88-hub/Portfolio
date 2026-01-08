import React from 'react';
import { Home, Terminal, FileText, Mail, Github, GitFork } from 'lucide-react';
import { motion } from 'framer-motion';

interface DockProps {
  onItemClick?: (label: string) => void;
}

interface DockItem {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href?: string;
}

const Dock: React.FC<DockProps> = ({ onItemClick }) => {
  const items: DockItem[] = [
    { icon: <Home className="w-5 h-5" />, label: "Home", active: true },
    { icon: <Terminal className="w-5 h-5" />, label: "Console" },
    { icon: <GitFork className="w-5 h-5" />, label: "Projects" },
    { icon: <FileText className="w-5 h-5" />, label: "Resume" },
    { icon: <Github className="w-5 h-5" />, label: "GitHub", href: "https://github.com/jakops88-hub" },
    { icon: <Mail className="w-5 h-5" />, label: "Contact", href: "mailto:nordicsecures@proton.me" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-dock px-4 py-3 rounded-2xl flex items-center gap-2 shadow-2xl">
        {items.map((item, index) => {
          // If it's an external link, render motion.a, otherwise motion.button
          const Component = item.href ? motion.a : motion.button;
          const props = item.href 
            ? { 
                href: item.href, 
                target: item.label === 'Contact' ? undefined : "_blank", 
                rel: item.label === 'Contact' ? undefined : "noopener noreferrer" 
              } 
            : { 
                onClick: () => onItemClick && onItemClick(item.label) 
              };

          return (
            <Component
              key={item.label}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`p-3 rounded-xl transition-all relative group flex items-center justify-center ${
                item.active 
                  ? 'bg-white/10 text-white' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              }`}
              {...props}
            >
              {item.icon}
              
              {/* Tooltip */}
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">
                {item.label}
              </span>
              
              {/* Active Indicator */}
              {item.active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full" />
              )}
            </Component>
          );
        })}
        
        <div className="w-px h-8 bg-white/10 mx-2" />
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold border border-white/20 shadow-lg">
          JS
        </div>
      </div>
    </div>
  );
};

export default Dock;