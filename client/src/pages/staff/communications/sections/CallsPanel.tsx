import React, { useState } from "react";
import { useDialer } from "@/state/dialerStore";
import { 
  formatPhoneNumber, 
  isValidPhoneNumber, 
  getPhoneFormatHint,
  normalizePhoneNumber 
} from "@/lib/phoneUtils";

export default function CallsPanel() {
  const { setOpen } = useDialer();
  const [phoneNumber, setPhoneNumber] = useState("");

  const dialPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'], 
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  const handleDialPadClick = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  const handleCall = async () => {
    if (phoneNumber) {
      try {
        const { voiceApi } = await import("@/lib/api/voice");
        const response = await voiceApi.placeCall(phoneNumber);
        console.log(`Call initiated to ${phoneNumber}:`, response);
        // Show success notification
      } catch (error) {
        console.error(`Call failed to ${phoneNumber}:`, error);
        // Show error notification
      }
    }
  };

  return (
    <div data-comm-tab="calls" className="p-4">
      <div className="max-w-xs mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              setPhoneNumber(formatted);
            }}
            onBlur={(e) => {
              const normalized = normalizePhoneNumber(e.target.value);
              setPhoneNumber(normalized);
            }}
            placeholder="+1234567890"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              phoneNumber && !isValidPhoneNumber(phoneNumber) 
                ? "border-red-300 focus:ring-red-500" 
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {phoneNumber && (
            <p className="text-xs text-gray-600 mt-1">
              {getPhoneFormatHint(phoneNumber)}
            </p>
          )}
        </div>
        
        {/* Dial Pad */}
        <div className="grid grid-cols-3 gap-2">
          {dialPadNumbers.flat().map((digit) => (
            <button
              key={digit}
              onClick={() => handleDialPadClick(digit)}
              className="aspect-square bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-lg font-semibold"
            >
              {digit}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCall}
            disabled={!phoneNumber}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Call
          </button>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Open Dialer
          </button>
        </div>
        
        <button
          onClick={() => setPhoneNumber("")}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
}