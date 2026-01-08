"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MessageCircle, X, Send, Sparkles, Bot, 
  Loader2, Activity, ShieldAlert, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";

// --- TYPES ---
type Role = "patient" | "doctor" | "admin" | "organization";

interface SmartAssistantProps {
  role: Role;
  userName?: string;
  pageName?: string;   // e.g., "Schedule", "Inventory"
  pageContext?: any;   // The live data (stats, list of items, etc.)
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  action?: {
    type: string;
    label: string;
    data?: any;
  };
}

// --- CONFIGURATION PER ROLE ---
const ROLE_CONFIG = {
  patient: {
    color: "bg-teal-600 hover:bg-teal-500",
    gradient: "from-teal-600 to-emerald-600",
    icon: Sparkles,
    title: "Dr. AI Assistant",
    endpoint: "/agent/execute" 
  },
  doctor: {
    color: "bg-emerald-600 hover:bg-emerald-500",
    gradient: "from-emerald-600 to-teal-600",
    icon: Activity,
    title: "Clinical Co-Pilot",
    endpoint: "/agent/router"
  },
  admin: {
    color: "bg-indigo-600 hover:bg-indigo-500",
    gradient: "from-indigo-600 to-purple-600",
    icon: ShieldAlert,
    title: "System Overwatch",
    endpoint: "/agent/router"
  },
  organization: {
    color: "bg-cyan-600 hover:bg-cyan-500",
    gradient: "from-cyan-600 to-blue-600",
    icon: Building2,
    title: "Facility Manager",
    endpoint: "/agent/router"
  }
};

export default function SmartAssistant({ role, pageName, pageContext }: SmartAssistantProps) {
  const config = ROLE_CONFIG[role];
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Initial State: "Analyzing..." placeholder if context exists
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "init", 
      role: "agent", 
      content: pageContext ? "🔄 Analyzing current page data..." : `Hello! I am ready to assist you.` 
    }
  ]);
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- AUTO-ANALYSIS LOGIC ---
  useEffect(() => {
    // Only generate if we have context, haven't done it yet, and data isn't empty/loading
    if (pageContext && pageName && !reportGenerated) {
      const generateReport = async () => {
        setReportGenerated(true); // Prevent double firing
        setLoading(true);

        try {
          // Construct a hidden prompt for the AI
          const prompt = `
            Act as a smart assistant for a ${role}. 
            Current Page: ${pageName}.
            Data Context: ${JSON.stringify(pageContext)}.
            
            Task: Analyze the status of this page based on the data provided. 
            Give a short, direct report (2-3 sentences max).
            Example style: "You have 3 appointments today. 2 are completed and 1 is pending."
            Do not say "Based on the data". Just give the report.
          `;

          const payload = role === 'patient' 
            ? { user_query: prompt, session_id: "auto-report" }
            : { 
                agent_type: "router",
                role: role,
                user_query: prompt,
                session_id: "auto-report" 
              };

          const res = await api.post(config.endpoint, payload);
          const reportText = res.data.response_text || res.data.response || "Report generated.";

          setMessages([{ 
            id: "report", 
            role: "agent", 
            content: reportText 
          }]);

        } catch (e) {
          setMessages([{ 
            id: "error", 
            role: "agent", 
            content: "I couldn't analyze the live data, but I'm here to help!" 
          }]);
        } finally {
          setLoading(false);
        }
      };
      
      // Small delay to ensure UI is ready
      const timer = setTimeout(generateReport, 1000);
      return () => clearTimeout(timer);
    }
  }, [pageContext, pageName, role, reportGenerated, config.endpoint]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // --- HANDLER: SEND MESSAGE ---
  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput("");
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const payload = role === 'patient' 
        ? { user_query: userText, session_id: "session-1" }
        : { 
            agent_type: "router",
            role: role,
            user_query: userText,
            session_id: "session-1" 
          };

      const res = await api.post(config.endpoint, payload);
      const responseText = res.data.response_text || res.data.response || "Request processed.";
      
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: responseText,
        action: res.data.action_taken ? {
            type: "action",
            label: `Action: ${res.data.action_taken}`,
        } : undefined
      };
      
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "agent", 
        content: "⚠️ Connection unstable. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end font-sans">
      
      {/* --- CHAT WINDOW --- */}
      {isOpen && (
        <Card className="w-[380px] h-[550px] mb-4 flex flex-col overflow-hidden shadow-2xl border-0 animate-in slide-in-from-bottom-10 fade-in duration-300 rounded-2xl ring-1 ring-black/5">
          
          {/* Header */}
          <div className={`bg-gradient-to-r ${config.gradient} p-4 flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <config.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{config.title}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                  <span className="text-[10px] text-white/90 font-medium">
                    {reportGenerated ? "Analysis Complete" : "Online"}
                  </span>
                </div>
              </div>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-white hover:bg-white/20 rounded-full h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                
                {msg.role === "agent" && (
                   <div className="h-6 w-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mr-2 mt-1 shrink-0 border border-slate-300">
                      <Bot className="h-3 w-3 text-slate-600" />
                   </div>
                )}

                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm relative group ${
                  msg.role === "user" 
                    ? `bg-gradient-to-br ${config.gradient} text-white rounded-br-none` 
                    : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap animate-in fade-in duration-500">{msg.content}</p>
                  
                  {msg.action && (
                    <div className="mt-2 pt-2 border-t border-dashed border-slate-200/50">
                      <div className="text-[10px] font-bold uppercase opacity-70 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {msg.action.label}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                 <div className="h-6 w-6 rounded-full bg-transparent mr-2 shrink-0" />
                 <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1 items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Thinking...</span>
                 </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form 
              className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-slate-200 focus-within:border-slate-300 transition-all"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <input
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="Reply or ask new question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <Button 
                size="icon" 
                type="submit" 
                disabled={!input.trim() || loading}
                className={`rounded-full h-8 w-8 ${config.color} shrink-0 transition-transform active:scale-95`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>

        </Card>
      )}

      {/* --- TOGGLE BUTTON --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`h-14 w-14 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] ${config.color} text-white flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 group
          ${isOpen ? "rotate-90 scale-90 bg-slate-800" : ""}
        `}
      >
        {isOpen ? (
            <X className="h-6 w-6" />
        ) : (
            <MessageCircle className="h-7 w-7 group-hover:animate-pulse" />
        )}
        
        {/* Tooltip */}
        {!isOpen && (
          <div className={`absolute right-16 top-2 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 whitespace-nowrap transition-all duration-300 origin-right
            ${isHovered ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-90 translate-x-4 pointer-events-none"}
          `}>
             <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
               <config.icon className="h-3 w-3 text-slate-500" />
               {reportGenerated ? "View Report" : config.title}
             </p>
             <div className="absolute top-4 -right-1.5 w-3 h-3 bg-white transform rotate-45 border-r border-t border-slate-100"></div>
          </div>
        )}
      </button>

    </div>
  );
}