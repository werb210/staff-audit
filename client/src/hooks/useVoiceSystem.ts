// Voice system hook
import { useState, useCallback } from 'react';

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
    setState(prev => ({ ...prev, isDialing: true, error: null }));
    
    try {
      const response = await fetch(`${API_BASE}/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneNumber })
      });
      
      if (!response.ok) {
        throw new Error('Call failed');
      }
      
      const call = await response.json();
      setState(prev => ({ 
        ...prev, 
        currentCall: call, 
        isDialing: false,
        isConnected: true 
      }));
      return call;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isDialing: false, 
        error: error instanceof Error ? error.message : 'Call failed' 
      }));
      throw error;
    }
  }, []);

  const endCall = useCallback(async () => {
    if (state.currentCall) {
      try {
        const response = await fetch(`${API_BASE}/voice/call/${state.currentCall.id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to end call');
        }
        
        setState(prev => ({ 
          ...prev, 
          currentCall: null, 
          isConnected: false 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to end call' 
        }));
      }
    }
  }, [state.currentCall]);

  return {
    ...state,
    placeCall,
    endCall,
  };
};