"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, RefreshCcw } from "lucide-react";
import api from "@/lib/api";

type AgentType = "appointment" | "inventory" | "finance" | "case";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  action?: string; // To show if an action was taken
}

export default function AgentChat({ agentType, agentName }: { agentType: AgentType; agentName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "agent", text: `Hello! I am the ${agentName}. How can I assist you today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      // 1. Determine Endpoint
      const endpoint = `/agent/${agentType}`;
      
      // 2. Prepare Payload (All agents accept user_query)
      const payload: any = { user_query: userMsg, session_id: "SESSION_1" };
      
      // Add specific fields if needed (e.g. role for finance)
      if (agentType === "finance") payload.role = "doctor";

      // 3. Send Request
      const response = await api.post(endpoint, payload);
      
      // 4. Update Chat
      setMessages((prev) => [
        ...prev, 
        { 
          role: "agent", 
          text: response.data.response_text,
          action: response.data.action_taken || response.data.action_suggested
        }
      ]);

    } catch (error) {
      setMessages((prev) => [...prev, { role: "agent", text: "⚠️ Error connecting to Agent brain." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{agentName}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Online
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMessages([{ role: "agent", text: "Session Reset." }])}>
          <RefreshCcw className="h-4 w-4 text-slate-400" />
        </Button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm whitespace-pre-wrap ${
              m.role === "user" 
                ? "bg-doctor text-white rounded-br-none" 
                : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
            }`}>
              {m.text}
              {m.action && m.action !== "none" && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  Action: {m.action}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-doctor" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`Ask ${agentName}...`}
          className="flex-1"
        />
        <Button onClick={handleSend} variant="doctor" disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
