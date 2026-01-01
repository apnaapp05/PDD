import { User, Bot, AlertTriangle } from "lucide-react";
import { ChatMessage } from "./chat.types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isUrgent = message.isUrgent;

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-slate-200" : isUrgent ? "bg-red-100" : "bg-blue-100"
      }`}>
        {isUser ? <User className="h-4 w-4 text-slate-500" /> : 
         isUrgent ? <AlertTriangle className="h-4 w-4 text-red-600" /> : 
         <Bot className="h-4 w-4 text-blue-600" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
        isUser 
          ? "bg-blue-600 text-white rounded-tr-none" 
          : isUrgent
            ? "bg-red-50 border border-red-200 text-red-800 rounded-tl-none"
            : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
      }`}>
        {message.content}
      </div>
    </div>
  );
}