import { API_BASE } from "../config";
import { useQuery } from "@tanstack/react-query";
const key = "active_silo";
export function setSilo(s) {
    localStorage.setItem(key, s);
}
export function getSilo() {
    return localStorage.getItem(key) || "bf";
}
export function useSilo() {
    const q = useQuery({
        queryKey: ["silo-status"],
        queryFn: async () => {
            try {
                const r = await fetch(`${API_BASE}/slf/status`);
                if (r.ok) {
                    const j = await r.json();
                    return j.active ? "slf" : getSilo();
                }
            }
            catch (err) {
                console.warn("[useSilo] Status fetch failed", err);
            }
            return getSilo();
        },
        staleTime: 60000,
        initialData: getSilo(),
    });
    return { silo: q.data, setSilo };
}
