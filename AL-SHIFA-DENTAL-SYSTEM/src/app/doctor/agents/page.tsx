"use client";
import { useState } from "react";
import AgentChat from "@/components/agent-chat";
import { Card } from "@/components/ui/card";
import { Bot, Database, DollarSign, Activity } from "lucide-react";

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<"appointment" | "inventory" | "finance" | "case">("finance");

  const agents = [
    { id: "finance", name: "Revenue Controller", icon: DollarSign, color: "bg-green-100 text-green-700" },
    { id: "inventory", name: "Supply Chain Bot", icon: Database, color: "bg-red-100 text-red-700" },
    { id: "case", name: "Clinical Case Manager", icon: Activity, color: "bg-purple-100 text-purple-700" },
    { id: "appointment", name: "Scheduling Assistant", icon: Bot, color: "bg-blue-100 text-blue-700" },
  ];

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row gap-6 h-full">
        
        {/* Left: Agent Selector */}
        <div className="w-full md:w-1/3 grid grid-cols-2 md:grid-cols-1 gap-4 content-start">
          <div className="col-span-2 md:col-span-1 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">AI Command Center</h1>
            <p className="text-slate-500 text-sm">Select an autonomous agent to interact with.</p>
          </div>
          
          {agents.map((agent) => (
            <Card 
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id as any)}
              className={`p-4 cursor-pointer transition-all border-2 flex items-center gap-4 ${
                selectedAgent === agent.id 
                  ? "border-doctor bg-slate-50 shadow-md" 
                  : "border-transparent hover:border-slate-200"
              }`}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${agent.color}`}>
                <agent.icon className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-900">{agent.name}</h3>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Active
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Right: Chat Interface */}
        <div className="flex-1 h-full">
          <AgentChat 
            key={selectedAgent} // Force re-render on switch
            agentType={selectedAgent} 
            agentName={agents.find(a => a.id === selectedAgent)?.name || "Agent"} 
          />
        </div>

      </div>
    </div>
  );
}