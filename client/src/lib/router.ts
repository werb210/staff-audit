// client/src/lib/router.ts
import { useLocation } from "wouter";

export function usePath(): string {
  const [path] = useLocation();      // wouter returns a string path
  return typeof path === "string" ? path : "";
}

export function useNavigate() {
  const [, setPath] = useLocation();
  return (to: string) => setPath(to);
}