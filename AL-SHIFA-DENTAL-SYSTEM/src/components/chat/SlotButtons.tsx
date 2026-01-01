import { AppointmentSlot } from "./chat.types";
import { Clock } from "lucide-react";

export default function SlotButtons({
  slots,
  onSelect,
}: {
  slots: AppointmentSlot[];
  onSelect: (slotId: string) => void;
}) {
  return (
    <div className="ml-11 mb-4 space-y-2 animate-in fade-in slide-in-from-left-2">
      <p className="text-xs font-medium text-slate-500">Available Slots:</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.slot_id}
            onClick={() => onSelect(slot.slot_id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
          >
            <Clock className="h-3 w-3" />
            {slot.start}
          </button>
        ))}
      </div>
    </div>
  );
}