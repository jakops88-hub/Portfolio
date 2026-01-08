import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Briefcase } from 'lucide-react';
import { EXPERIENCE_DATA } from '../constants';

const InteractiveTimeline: React.FC = () => {
  return (
    <div className="w-full mt-6 mb-2">
      <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
        <Briefcase className="w-3 h-3" /> Career History
      </h3>
      <div className="relative border-l border-white/10 ml-3 space-y-8 pb-4">
        {EXPERIENCE_DATA.map((item, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-8"
          >
            {/* Timeline Dot */}
            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-600 group-hover:bg-cyan-500 transition-colors" />
            
            <div className="glass-panel p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-semibold text-sm">{item.role}</h4>
                <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono bg-cyan-950/30 px-2 py-0.5 rounded">
                  <Calendar className="w-3 h-3" />
                  {item.period}
                </div>
              </div>
              <div className="text-xs text-zinc-400 font-mono mb-2">{item.company}</div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default InteractiveTimeline;