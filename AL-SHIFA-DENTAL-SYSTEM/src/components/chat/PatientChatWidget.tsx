"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentAPI } from "@/lib/api"; // Import the Bridge

// Types
interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  data?: any; // For Slots, Buttons, etc.
}

export default function PatientChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "agent", text: "Hello! I'm Dr. AI. How can I help you today?" }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // 1. Add User Message
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // 2. Call Backend API
      const response = await AgentAPI.sendMessage(userMsg.text);
      
      // 3. Add Agent Response
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        text: response.response_text,
        data: response.data 
      };
      setMessages(prev => [...prev, agentMsg]);
      
    } catch (error) {
      // Error Handling
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: "agent", 
        text: "I'm having trouble connecting to the clinic server. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 z-50"
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold">Dr. AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    msg.sender === "user" 
                      ? "bg-blue-600 text-white rounded-br-none" 
                      : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none"
                  }`}>
                    {msg.text}
                    
                    {/* Render Special Data (Like Slots) */}
                    {msg.data?.available_slots && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-bold uppercase text-slate-400">Available Slots:</p>
                        <div className="grid grid-cols-2 gap-2">
                           {msg.data.available_slots.map((slot: any) => (
                             <button key={slot.slot_id} className="text-xs bg-blue-50 text-blue-600 py-1 px-2 rounded hover:bg-blue-100 border border-blue-200">
                               {slot.start}
                             </button>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}