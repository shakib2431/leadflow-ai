

import { useState } from "react";
import { Ticket, Calendar, CheckCircle } from "lucide-react";

export function TicketSystem({ leadId }: { leadId: string }) {
  const [ticket, setTicket] = useState("");
  
  const raiseTicket = async () => {
    await fetch("/api/tickets", { 
      method: "POST", 
      body: JSON.stringify({ lead_id: leadId, subject: ticket }) 
    });
    alert("Ticket raised successfully!");
  };

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
      <h3 className="flex items-center gap-2 font-bold mb-4"><Ticket size={18} /> Support Tickets</h3>
      <textarea 
        className="w-full bg-black/20 p-3 rounded-lg mb-3 border border-gray-600"
        placeholder="Describe your issue..."
        onChange={(e) => setTicket(e.target.value)}
      />
      <button onClick={raiseTicket} className="bg-violet-600 px-4 py-2 rounded-lg text-sm font-bold">Raise Ticket</button>
    </div>
  );
}

export function MeetingBooker() {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
      <h3 className="flex items-center gap-2 font-bold mb-4"><Calendar size={18} /> Book Meeting</h3>
      {/* Embed Cal.com or Calendly directly */}
      <iframe 
        src="https://cal.com/your-name/sync-call" 
        className="w-full h-64 border-0 rounded-lg"
      />
    </div>
  );
}