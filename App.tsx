import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Cpu, User, X, Terminal, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicCard from './components/HolographicCard';
import InteractiveTimeline from './components/InteractiveTimeline';
import SystemStatus from './components/SystemStatus';
import Dock from './components/Dock';
import ResumeSidebar from './components/ResumeSidebar';
import { sendMessageToGemini } from './services/geminiService';
import { ChatMessage, Project } from './types';
import { RESUME_DATA, QUICK_PROMPTS } from './constants';

// --- NY KOMPONENT: WELCOME HERO (Fyller ut tomrummet) ---
const WelcomeHero = ({ onPromptClick, onOpenProfile }: { onPromptClick: (text: string) => void, onOpenProfile: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-8 p-4"
  >
    <div className="relative">
      <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse-slow" />
      <div className="relative w-24 h-24 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
        <Cpu className="w-10 h-10 text-cyan-400" />
      </div>
    </div>
    
    <div className="space-y-2 max-w-lg">
      <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
        Neural Command Center
      </h1>
      <p className="text-zinc-400 text-sm md:text-base">
        Jacob Sandström's Digital Twin. Powered by Gemini 1.5 Flash.
        <br />
        Expert in <span className="text-cyan-400">Local-First</span> architecture & <span className="text-purple-400">The Boring Stack</span>.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md">
      {QUICK_PROMPTS.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onPromptClick(prompt)}
          className="group flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-cyan-950/20 border border-white/5 hover:border-cyan-500/30 rounded-lg text-left transition-all"
        >
          <span className="text-sm text-zinc-300 group-hover:text-cyan-300">{prompt}</span>
          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
        </button>
      ))}
      <button
          onClick={onOpenProfile}
          className="col-span-1 md:col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-sm text-white transition-all mt-2"
      >
          <User className="w-4 h-4" /> View Full Profile
      </button>
    </div>
  </motion.div>
);

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Ny state för att veta om vi ska visa Hero

  const [messages, setMessages] = useState<ChatMessage[]>([]); // Börja tomt, vi visar Hero istället
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, hasInteracted]);

  const handleSendMessage = async (text: string, isHidden: boolean = false) => {
    if (!text.trim() || isLoading) return;

    // Göm Hero-sektionen och profilen när man börjar chatta
    if (!isHidden) {
        setShowProfile(false);
        setHasInteracted(true);
    }

    const userMessage: ChatMessage = { role: 'user', content: text, isHidden };
    const currentHistory = [...messages, userMessage]; 
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: currentHistory.map(m => ({ 
            role: m.role, 
            content: m.content 
          }))
        })
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      const rawResponse = data.response;
      
      let cleanContent = rawResponse;
      let projectIds: string[] = [];
      let showHistory = false;
      
      // --- ROBUST PARSING ENGINE (FIXAD REGEX) ---
      
      // 1. Function Calls (Data från backend)
      if (data.function_calls) {
        data.function_calls.forEach((call: any) => {
          if (call.name === 'get_pinned_repos') {
             // Fallback: Visa de första projekten om vi får repos
             projectIds = RESUME_DATA.projects.map(p => p.id).slice(0, 2); 
          }
          if (call.name === 'get_career_history') showHistory = true;
        });
      }

      // 2. Text Tag Parsing (Generative UI)
      // Vi använder en mer tillåtande regex (case insensitive 'i')
      const projectTagRegex = /\[SHOW_PROJECT:\s*([a-zA-Z0-9_-]+)\]/gi;
      const historyTagRegex = /\[SHOW_HISTORY\]/gi;

      // Hitta alla projekt-taggar
      const matches = [...cleanContent.matchAll(projectTagRegex)];
      if (matches.length > 0) {
        matches.forEach(m => {
            if (m[1]) projectIds.push(m[1].toLowerCase()); // Spara ID
        });
        // Ta bort taggarna från texten så de inte syns
        cleanContent = cleanContent.replace(projectTagRegex, '');
      }

      // Hitta historik-taggar
      if (historyTagRegex.test(cleanContent)) {
        showHistory = true;
        cleanContent = cleanContent.replace(historyTagRegex, '');
      }

      const botMessage: ChatMessage = {
        role: 'model',
        content: cleanContent.trim(),
        // Ta bort dubbletter av IDs
        relatedProjectIds: projectIds.length > 0 ? [...new Set(projectIds)] : undefined,
        showHistory: showHistory
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Error: Connection interrupted. Check system logs." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDockInteraction = (label: string) => {
    if (label === 'Resume') {
        setShowProfile(!showProfile);
    } else if (label === 'Projects') {
       handleSendMessage("Show me your projects.", true);
    } else if (label === 'Home') {
        setShowProfile(false);
        setHasInteracted(false); // Gå tillbaka till Hero
        setMessages([]); // Rensa chatten (valfritt)
    }
  };

  const getProjectDetails = (id: string): Project | undefined => {
    return RESUME_DATA.projects.find(p => p.id === id);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-100 bg-[#050505]">
      
      <SystemStatus />
      
      {/* Profile Sidebar */}
      <AnimatePresence>
        {showProfile && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full md:w-[500px] z-50 shadow-2xl border-l border-white/10 bg-[#050505]/95 backdrop-blur-xl"
          >
            <div className="absolute top-4 right-4 z-50">
                <button 
                    onClick={() => setShowProfile(false)}
                    className="p-2 bg-zinc-900/80 rounded-full text-zinc-400 hover:text-white border border-white/10"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <ResumeSidebar />
          </motion.div>
        )}
      </AnimatePresence>

      <Dock onItemClick={handleDockInteraction} />

      {/* Main Stage */}
      <div className={`absolute inset-0 max-w-4xl mx-auto pt-20 pb-32 px-4 md:px-6 flex flex-col transition-all duration-500 ${showProfile ? 'md:pr-[500px] opacity-30 md:opacity-100 pointer-events-none md:pointer-events-auto' : ''}`}>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
          
          {/* VISA HERO OM INGEN KONVERSATION STARTAT */}
          {!hasInteracted && messages.length === 0 ? (
             <WelcomeHero 
                onPromptClick={(txt) => handleSendMessage(txt)} 
                onOpenProfile={() => setShowProfile(true)}
             />
          ) : (
            <AnimatePresence initial={false}>
                {messages.filter(msg => !msg.isHidden).map((msg, idx) => (
                <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col mb-6 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                    <div 
                    className={`max-w-[85%] px-6 py-4 rounded-2xl text-sm md:text-base leading-relaxed border ${
                        msg.role === 'user' 
                        ? 'bg-zinc-800 text-white border-zinc-700 rounded-br-sm' 
                        : 'bg-zinc-900/50 backdrop-blur-md text-zinc-200 border-white/10 rounded-bl-sm shadow-xl'
                    }`}
                    >
                    {msg.role === 'model' && (
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-cyan-500/70 select-none">
                        <Cpu className="w-3 h-3" /> Digital Twin
                        </div>
                    )}
                    <div className="prose prose-invert prose-p:my-1 prose-pre:bg-black/50">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    </div>

                    {/* HOLOGRAPHIC CARDS AREA */}
                    {msg.relatedProjectIds && (
                    <div className="w-full mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                        {msg.relatedProjectIds.map(id => {
                        const proj = getProjectDetails(id);
                        return proj ? <HolographicCard key={id} project={proj} /> : null;
                        })}
                    </div>
                    )}
                    
                    {/* TIMELINE AREA */}
                    {msg.showHistory && <InteractiveTimeline />}
                </motion.div>
                ))}
            </AnimatePresence>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 pl-4 mt-4">
               <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75" />
               <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR */}
        <div className="mt-4 relative z-40">
           <div className="relative group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
             <input
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
               placeholder={hasInteracted ? "Ask about projects, stack, or background..." : "Initialize system..."}
               disabled={isLoading}
               className="relative w-full bg-zinc-900/90 backdrop-blur-xl text-white placeholder-zinc-500 rounded-xl px-6 py-4 border border-white/10 focus:border-cyan-500/50 outline-none font-mono text-sm shadow-2xl pr-14"
             />
             <button
               onClick={() => handleSendMessage(inputValue)}
               disabled={isLoading || !inputValue.trim()}
               className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-cyan-400 disabled:opacity-30 transition-colors"
             >
               <Send className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}

export default App;
