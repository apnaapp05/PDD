"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { DoctorAPI } from "@/lib/api";

interface Message {
  role: "user" | "agent";
  text: string;
  action?: string;
  data?: any;
}

export default function AgentChat({ agentType, agentName }: { agentType: string, agentName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: `Hello! I am your ${agentName}. How can I assist you today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await DoctorAPI.chatWithAgent({
        agent_type: agentType,
        user_query: userMsg.text,
        role: "doctor"
      });

      const data = res.data;
      const agentMsg: Message = {
        role: "agent",
        text: data.response_text,
        action: data.action_taken,
        data: data.data
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "agent", text: "⚠️ System error. Please check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-lg border-t-4 border-t-indigo-600">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{agentName}</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Online
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            
            {msg.role === "agent" && (
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
                <Sparkles className="h-4 w-4" />
              </div>
            )}

            <div className={`max-w-[80%] rounded-2xl p-4 text-sm shadow-sm ${
              msg.role === "user" 
                ? "bg-slate-800 text-white rounded-tr-none" 
                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              
              {/* If Agent returns data (like items or slots), display a mini card */}
              {msg.data && msg.action === "show_slots" && msg.data.available_slots && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.data.available_slots.map((slot: any, idx: number) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-mono border border-indigo-100">
                      {slot.time}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 mt-1">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
             <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                <Bot className="h-4 w-4" />
             </div>
             <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center gap-2">
          <input
            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder={`Ask ${agentName}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
          />
          <Button 
            size="icon" 
            className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          AI responses may vary. Verify critical information.
        </p>
      </div>
    </Card>
  );
}