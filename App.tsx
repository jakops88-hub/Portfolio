import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicCard from './components/HolographicCard';
import InteractiveTimeline from './components/InteractiveTimeline';
import SystemStatus from './components/SystemStatus';
import Dock from './components/Dock';
import { sendMessageToGemini } from './services/geminiService';
import { ChatMessage, Project } from './types';
import { RESUME_DATA } from './constants';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      content: "Neural link established. I am Jacob's Digital Twin (v2.0). I can visualize architecture, diff code, and retrieve project data. How can I assist?" 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, isHidden: boolean = false) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text, isHidden };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const updatedMessages = [...messages, userMessage]; // Spara temp-variabel
      const rawResponse = await sendMessageToGemini(text, updatedMessages);
      
      // GENERATIVE UI PARSING ENGINE
      // Parsing "intent tags" from the System Prompt to mimic tool invocation.
      let cleanContent = rawResponse;
      let projectIds: string[] = [];
      let showHistory = false;
      
      // 1. Check for History Tag
      if (rawResponse.includes('[SHOW_HISTORY]')) {
        showHistory = true;
        cleanContent = cleanContent.replace('[SHOW_HISTORY]', '');
      }

      // 2. Check for Project Tags (Global match)
      const projectTagRegex = /\[SHOW_PROJECT:\s*([\w-]+)\]/g;
      const matches = [...cleanContent.matchAll(projectTagRegex)];
      
      if (matches.length > 0) {
        projectIds = matches.map(m => m[1]);
        // Remove tags from content
        cleanContent = cleanContent.replace(projectTagRegex, '');
      }

      const botMessage: ChatMessage = {
        role: 'model',
        content: cleanContent.trim(),
        relatedProjectIds: projectIds.length > 0 ? projectIds : undefined,
        showHistory: showHistory
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Neural Interface Error. Connection Unstable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDockInteraction = (label: string) => {
    if (label === 'Resume') {
      handleSendMessage("Show me your career history and resume.", true);
    } else if (label === 'Projects') {
       handleSendMessage("What projects have you worked on? Show me the details.", true);
    }
  };

  const getProjectDetails = (id: string): Project | undefined => {
    return RESUME_DATA.projects.find(p => p.id === id);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      
      {/* HUD Elements */}
      <SystemStatus />
      <Dock onItemClick={handleDockInteraction} />

      {/* Main Content Stage */}
      <div className="absolute inset-0 max-w-4xl mx-auto pt-20 pb-32 px-4 md:px-6 flex flex-col">
        
        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide pr-2">
          <AnimatePresence initial={false}>
            {messages.filter(msg => !msg.isHidden).map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Bubble */}
                <div 
                  className={`max-w-[85%] md:max-w-[70%] backdrop-blur-md px-6 py-4 rounded-2xl text-sm md:text-base leading-relaxed border shadow-lg ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800/80 text-white border-zinc-700/50 rounded-br-none' 
                      : 'glass-panel text-zinc-200 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'model' && (
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 select-none">
                      <Cpu className="w-3 h-3" /> Digital Twin
                    </div>
                  )}
                  
                  <div className="prose prose-invert prose-p:my-1 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown 
                      components={{
                        strong: ({node, ...props}) => <span className="font-semibold text-cyan-400" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 transition-colors" target="_blank" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* COMPONENT REGISTRY: Render Widgets based on "Tool Call" */}
                
                {/* 1. Project Grid */}
                {msg.relatedProjectIds && msg.relatedProjectIds.length > 0 && (
                   <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {msg.relatedProjectIds.map(id => {
                       const proj = getProjectDetails(id);
                       return proj ? <HolographicCard key={id} project={proj} /> : null;
                     })}
                   </div>
                )}

                {/* 2. Interactive Timeline */}
                {msg.showHistory && (
                  <InteractiveTimeline />
                )}

              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-start"
            >
              <div className="glass-panel rounded-2xl px-5 py-3 flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-150" />
                </div>
                <span className="text-xs text-zinc-500 font-mono">PROCESSING</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Command Line */}
        <div className="mt-6 relative z-40">
           <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                placeholder="Enter command or query..."
                disabled={isLoading}
                className="relative w-full bg-[#0a0a0a]/90 backdrop-blur-xl text-white placeholder-zinc-600 rounded-xl pl-6 pr-14 py-4 border border-white/10 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-sm"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-cyan-400 disabled:opacity-30 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
           </div>
           
           <div className="mt-3 flex justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> NEURAL INTERFACE ONLINE
              </span>
           </div>
        </div>
      </div>

    </div>
  );
}

export default App;
