import { API_BASE } from "../config";
import { useQuery } from "@tanstack/react-query";

export type Silo = "bf" | "slf";
const key = "active_silo";

export function setSilo(s: Silo) { localStorage.setItem(key, s); }
export function getSilo(): Silo { return (localStorage.getItem(key) as Silo) || "bf"; }

export function useSilo() {
  const q = useQuery({
    queryKey:["silo-status"],
    queryFn: async () => {
      try {
        const r = await fetch(`${API_BASE}/slf/status", {});
        if (r.ok) return (await r.json()).active ? "slf" as Silo : getSilo();
      } catch {}
      return getSilo();
    },
    staleTime: 60_000,
    initialData: getSilo()
  });
  return { silo: q.data as Silo, setSilo };
}