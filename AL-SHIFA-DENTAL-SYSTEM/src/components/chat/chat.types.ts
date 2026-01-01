export type ChatRole = "user" | "agent";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  isUrgent?: boolean; // For red alerting
  metadata?: {
    slots?: AppointmentSlot[];
    action_taken?: string;
    intent?: string;
  };
}

export interface AppointmentSlot {
  slot_id: string;
  start: string;
  end: string;
  doctor_name?: string;
}

export interface RouterResponse {
  response_text: string;
  case_status?: "Normal" | "Escalated";
  available_slots?: AppointmentSlot[];
  action_taken?: string;
}