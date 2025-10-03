import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  roles?: string[];
  mfaRequired?: boolean;
  mfaVerified?: boolean;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<User | null> => {
      try {
        return await api('/api/users/me');
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}