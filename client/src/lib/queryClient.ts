import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: 1, 
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Prevent duplicate fetches
      staleTime: 15_000, // Cache for 15 seconds to prevent spam
    },
    mutations: { retry: 0 },
  },
});

// Simple API request helper for mutations
export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { // Include cookies for session auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (response.status === 401) {
    // Redirect to login on unauthorized
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    throw new Error("Unauthorized");
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }
  
  return response.json();
}

// Enhanced API function with 401 redirect handling  
export async function api(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, { // Include cookies for session auth
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...options.headers,
      },
      ...options,
    });
    
    if (response.status === 401) {
      // Redirect to login on unauthorized  
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      throw new Error("Unauthorized");
    }
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("json") ? response.json() : response.text();
  } catch (error) {
    throw error;
  }
}