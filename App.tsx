import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Cpu, User, X } from 'lucide-react'; // Lade till User, X
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

import HolographicCard from './components/HolographicCard';
import InteractiveTimeline from './components/InteractiveTimeline';
import SystemStatus from './components/SystemStatus';
import Dock from './components/Dock';
import ResumeSidebar from './components/ResumeSidebar'; // Importera denna!
import { sendMessageToGemini } from './services/geminiService';
import { ChatMessage, Project } from './types';
import { RESUME_DATA, QUICK_PROMPTS } from './constants'; // Importera QUICK_PROMPTS

function App() {
  // State för att visa/dölja profilen
  const [showProfile, setShowProfile] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      content: "Neural link established. I am Jacob's Digital Twin. I can visualize architecture, diff code, and retrieve project data. How can I assist?" 
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

    // Stäng profilen om man börjar chatta, för fokus
    if (!isHidden) setShowProfile(false);

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
      
      if (data.function_calls) {
        data.function_calls.forEach((call: any) => {
          if (call.name === 'get_pinned_repos' && Array.isArray(call.result)) {
             projectIds = RESUME_DATA.projects.map(p => p.id).slice(0, 2); 
          }
          if (call.name === 'get_career_history') {
            showHistory = true;
          }
        });
      }

      const botMessage: ChatMessage = {
        role: 'model',
        content: cleanContent,
        relatedProjectIds: projectIds.length > 0 ? projectIds : undefined,
        showHistory: showHistory
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Error: Could not connect to Digital Twin backend." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDockInteraction = (label: string) => {
    if (label === 'Resume') {
        // Toggle Profile Sidebar istället för att bara chatta
        setShowProfile(!showProfile);
    } else if (label === 'Projects') {
       handleSendMessage("What projects have you worked on? Show me the details.", true);
    } else if (label === 'Home') {
        setShowProfile(false);
    }
  };

  const getProjectDetails = (id: string): Project | undefined => {
    return RESUME_DATA.projects.find(p => p.id === id);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-100 bg-[#050505]">
      
      <SystemStatus />
      
      {/* --- PROFILE SIDEBAR OVERLAY --- */}
      <AnimatePresence>
        {showProfile && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full md:w-[480px] z-40 shadow-2xl border-l border-white/10"
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

      {/* Main Content Stage */}
      <div className={`absolute inset-0 max-w-4xl mx-auto pt-20 pb-32 px-4 md:px-6 flex flex-col transition-all duration-500 ${showProfile ? 'md:pr-[500px] opacity-50 md:opacity-100' : ''}`}>
        
        <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-2">
          <AnimatePresence initial={false}>
            {messages.filter(msg => !msg.isHidden).map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
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
                  <div className="prose prose-invert prose-p:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {msg.relatedProjectIds && (
                   <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {msg.relatedProjectIds.map(id => {
                       const proj = getProjectDetails(id);
                       return proj ? <HolographicCard key={id} project={proj} /> : null;
                     })}
                   </div>
                )}
                {msg.showHistory && <InteractiveTimeline />}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex items-start pl-2">
               <span className="text-xs text-cyan-500 font-mono animate-pulse">PROCESSING...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- INPUT AREA WITH SUGGESTION CHIPS --- */}
        <div className="mt-4 relative z-40">
           
           {/* Suggestion Chips */}
           {!isLoading && messages.length < 3 && (
             <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
               {QUICK_PROMPTS.map((prompt, i) => (
                 <button
                   key={i}
                   onClick={() => handleSendMessage(prompt)}
                   className="whitespace-nowrap px-3 py-1.5 bg-zinc-800/50 hover:bg-cyan-950/30 border border-zinc-700 hover:border-cyan-500/50 rounded-full text-xs text-zinc-300 hover:text-cyan-300 transition-all"
                 >
                   {prompt}
                 </button>
               ))}
               <button
                   onClick={() => setShowProfile(true)}
                   className="whitespace-nowrap px-3 py-1.5 bg-zinc-800/50 hover:bg-purple-950/30 border border-zinc-700 hover:border-purple-500/50 rounded-full text-xs text-zinc-300 hover:text-purple-300 transition-all flex items-center gap-1"
               >
                   <User className="w-3 h-3" /> Who is Jacob?
               </button>
             </div>
           )}

           <div className="relative">
             <input
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
               placeholder="Init command..."
               disabled={isLoading}
               className="w-full bg-zinc-900/80 backdrop-blur text-white placeholder-zinc-600 rounded-xl px-6 py-4 border border-white/10 focus:border-cyan-500/50 outline-none font-mono text-sm shadow-2xl pr-12"
             />
             <button
               onClick={() => handleSendMessage(inputValue)}
               disabled={isLoading || !inputValue.trim()}
               className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-cyan-400 disabled:opacity-30"
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
