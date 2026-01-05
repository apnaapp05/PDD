# backend/agents/base_agent.py
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from services.llm_service import llm_client
import json
import logging

logger = logging.getLogger(__name__)

class AgentOutput(BaseModel):
    final_response: str
    status: str  # "SUCCESS", "PENDING_TOOL", "ERROR"
    tool_call: Optional[Dict[str, Any]] = None

class BaseAgent:
    def __init__(self, name: str, instructions: str):
        self.name = name
        self.system_instructions = instructions
        self.history = []

    def think(self, user_query: str, context: str = "") -> AgentOutput:
        """
        Constructs a prompt and asks the LLM what to do next.
        """
        prompt = f"""
        You are the {self.name}.
        Your Role: {self.system_instructions}
        
        Current Context: {context}
        User Query: {user_query}

        You have access to tools. If you need to use a tool, respond ONLY with a JSON object like this:
        {{
            "action": "tool_name",
            "params": {{ "param1": "value" }}
        }}

        If you have the final answer, respond like this:
        {{
            "action": "final_answer",
            "response": "Your response to the user..."
        }}
        """

        try:
            # Call Gemini
            response_text = llm_client.generate_response(prompt)
            
            # Clean up response (sometimes LLMs add markdown ```json ... ```)
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            
            data = json.loads(clean_text)
            
            if data.get("action") == "final_answer":
                return AgentOutput(
                    final_response=data.get("response"),
                    status="SUCCESS"
                )
            else:
                return AgentOutput(
                    final_response="Thinking...",
                    status="PENDING_TOOL",
                    tool_call={
                        "function_name": data.get("action"),
                        "arguments": data.get("params")
                    }
                )

        except json.JSONDecodeError:
            # Fallback if LLM doesn't return perfect JSON
            return AgentOutput(
                final_response=response_text, # Just return raw text
                status="SUCCESS"
            )
        except Exception as e:
            logger.error(f"Agent Error: {e}")
            return AgentOutput(final_response="I encountered an internal error.", status="ERROR")