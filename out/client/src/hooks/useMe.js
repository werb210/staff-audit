import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/queryClient";
export function useMe() {
    return useQuery({
        queryKey: ["me"],
        queryFn: async () => {
            try {
                return await api("/api/users/me");
            }
            catch (error) {
                return null;
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
