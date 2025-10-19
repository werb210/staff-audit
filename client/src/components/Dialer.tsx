// client/src/components/Dialer.tsx
import React, { useState } from 'react';

interface DialerProps {
  contact: { id: string; name: string; phone: string };
  onClose: () => void;
}

const Dialer: React.FC<DialerProps> = ({ contact, onClose }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [timer, setTimer] = useState(0);

  const startCall = async () => {
    try {
      setIsCalling(true);
      const res = await fetch(`${API_BASE}/dialer/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contact.phone,
          from: process.env.REACT_APP_TWILIO_FROM_NUMBER,
        }),
      });
      await res.json();
      // Start timer
      const interval = setInterval(() => setTimer(t => t + 1), 1000);
      setTimeout(() => clearInterval(interval), 1000 * 60 * 60); // auto-stop after an hour
    } catch (err) {
      console.error(err);
      setIsCalling(false);
    }
  };

  const endCall = () => {
    // TODO: end call via Twilio
    setIsCalling(false);
    setTimer(0);
  };

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg border-l z-50 p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-2">Dialer</h2>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
      >
        ✕
      </button>
      <div className="mb-4">
        <p>Calling: {contact.name}</p>
        <p>Phone: {contact.phone}</p>
      </div>
      <div className="mb-4">
        {isCalling ? (
          <p className="text-green-600">Call in progress… Time: {timer}s</p>
        ) : (
          <p className="text-gray-600">Ready to call.</p>
        )}
      </div>
      <div className="space-x-2">
        {!isCalling ? (
          <button
            onClick={startCall}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Start Call
          </button>
        ) : (
          <button
            onClick={endCall}
            className="px-3 py-1 bg-red-500 text-white rounded"
          >
            End Call
          </button>
        )}
      </div>
      <div className="mt-4 p-2 bg-yellow-100 text-sm rounded">
        {/* Consent banner; adjust to meet your compliance requirements */}
        <p>
          This call may be recorded for quality and training purposes. By
          continuing, you consent to being recorded.
        </p>
      </div>
    </div>
  );
};

export default Dialer;
