import { useState, useCallback } from "react";
import { API_BASE } from "../config";

export interface VoiceSystemState {
  isConnected: boolean;
  currentCall: any | null;
  isDialing: boolean;
  error: string | null;
}

export const useVoiceSystem = () => {
  const [state, setState] = useState<VoiceSystemState>({
    isConnected: false,
    currentCall: null,
    isDialing: false,
    error: null,
  });

  const placeCall = useCallback(async (phoneNumber: string) => {
    setState((prev) => ({ ...prev, isDialing: true, error: null }));
    try {
      const response = await fetch(`${API_BASE}/voice/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phoneNumber }),
      });
      if (!response.ok) throw new Error("Call failed");
      const call = await response.json();
      setState({ ...state, currentCall: call, isDialing: false, isConnected: true });
      return call;
    } catch (error) {
      setState({ ...state, isDialing: false, error: (error as Error).message });
      throw error;
    }
  }, [state]);

  const endCall = useCallback(async () => {
    if (!state.currentCall) return;
    try {
      const response = await fetch(`${API_BASE}/voice/call/${state.currentCall.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to end call");
      setState({ ...state, currentCall: null, isConnected: false });
    } catch (error) {
      setState({ ...state, error: (error as Error).message });
    }
  }, [state]);

  return { ...state, placeCall, endCall };
};
