import React, { createContext, useContext, useEffect, useState } from 'react';

interface LenderUser {
  id: string;
  lenderId: string;
  email: string;
  lenderName: string;
  role: string;
}

interface LenderAuthContextType {
  user: LenderUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const LenderAuthContext = createContext<LenderAuthContextType | undefined>(undefined);

export function LenderAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LenderUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token on mount
    const storedToken = localStorage.getItem('lender_token');
    const storedUser = localStorage.getItem('lender_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await fetch('/lender-portal/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
          throw new Error(errorData.error || 'Login failed');
        }
        return response.json();
      });

      setToken(data.token);
      setUser(data.user);
      
      localStorage.setItem('lender_token', data.token);
      localStorage.setItem('lender_user', JSON.stringify(data.user));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lender_token');
    localStorage.removeItem('lender_user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
  };

  return (
    <LenderAuthContext.Provider value={value}>
      {children}
    </LenderAuthContext.Provider>
  );
}

export function useLenderAuth() {
  const context = useContext(LenderAuthContext);
  if (context === undefined) {
    throw new Error('useLenderAuth must be used within a LenderAuthProvider');
  }
  return context;
}