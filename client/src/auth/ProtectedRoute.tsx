import { tokenStore } from "@/lib/tokenStore";
import { Redirect } from "wouter";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const hasAccess = !!tokenStore.getAccess();
  const hasRefresh = !!tokenStore.getRefresh();

  if (hasAccess || hasRefresh) return children; // page will call whoami via fetch (with auth)
  return <Redirect to="/login" />;
}
