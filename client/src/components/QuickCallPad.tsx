import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Removed old dialer import - using new FAB system
import { Phone } from "lucide-react";

export default function QuickCallPad() {
  const [to, setTo] = useState("");
  // Using new FAB dialer system - no need for hook
  const openDialer = () => console.log("[QuickCallPad] Dialer requested - handled by global FAB");
  const call = async (number: string) => console.log("[QuickCallPad] Call requested to:", number);

  const makeCall = async () => {
    if (!to.trim()) return;
    await call(to);
  };

  const openDialerWithNumber = () => {
    openDialer({ to });
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium mb-3">📞 Quick Call</h3>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Phone number"
            className="flex-1"
          />
          <Button 
            onClick={makeCall}
            disabled={!to.trim()}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Call
          </Button>
        </div>
        <Button 
          onClick={openDialerWithNumber}
          variant="outline"
          className="w-full"
        >
          Open Full Dialer
        </Button>
      </div>
    </div>
  );
}