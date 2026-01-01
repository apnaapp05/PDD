"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Loader2, Sparkles, Send, FileText, Activity } from "lucide-react";
import { ChatMessage, RouterResponse } from "./chat.types";
import MessageBubble from "./MessageBubble";
import { Button } from "@/components/ui/button";

export default function DoctorAssistantPanel({ patientId }: { patientId?: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const askAI = async (query: string) => {
    if(!query.trim()) return;
    
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/agent/router", {
        agent_type: "router",
        role: "doctor",
        patient_id: patientId || "General Context",
        user_query: query,
      });

      const data: RouterResponse = res.data;

      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: data.response_text,
        metadata: { action_taken: data.action_taken }
      };

      setMessages(prev => [...prev, agentMsg]);

    } catch (e) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "agent",
        content: "⚠️ System offline. Please check connection."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-80 md:w-96">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" /> Clinical Co-Pilot
        </h3>
        {patientId && <p className="text-xs text-slate-500 mt-1">Context: Patient #{patientId}</p>}
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-4 grid grid-cols-2 gap-2">
          <button onClick={() => askAI("Summarize patient history")} className="p-3 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 rounded-xl border border-slate-200 text-xs text-left transition-colors flex flex-col gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Summarize History</span>
          </button>
          <button onClick={() => askAI("Check recent lab results")} className="p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl border border-slate-200 text-xs text-left transition-colors flex flex-col gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Lab Status</span>
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.length === 0 && (
           <div className="text-center mt-10 text-slate-400 text-sm">
              <p>Ready to assist.</p>
              <p className="text-xs mt-1">Ask about diagnosis, labs, or history.</p>
           </div>
        )}
        
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} />
        ))}
        
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
               <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Ask AI assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI(input)}
          />
          <Button size="icon" onClick={() => askAI(input)} disabled={loading} className="bg-slate-900 text-white">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
           AI responses should be verified by a professional.
        </p>
      </div>
    </div>
  );
}