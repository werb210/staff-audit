import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/queryClient";
import { tokenStore } from "@/lib/tokenStore";

type User = { id:string; email:string; name?:string; role?:string; totp_enrolled?:boolean };
type Ctx = { user?:User|null; loading:boolean; refresh:()=>Promise<void>; login:()=>void; devLogin:(email?:string)=>Promise<void>; logout:()=>Promise<void> };
const AuthCtx = createContext<Ctx>({ loading:true, refresh:async()=>{}, login:()=>{}, devLogin:async()=>{}, logout:async()=>{} });

export function AuthProvider({ children }:{ children:any }){
  const [user,setUser] = useState<User|null>(null);
  const [loading,setLoading] = useState<boolean>(true);

  async function refresh(){
    setLoading(true);
    try {
      if (!tokenStore.access) {
        setUser(null);
        setLoading(false);
        return;
      }
      const r = await api("/auth/whoami");
      if (r.status === 401) {
        setUser(null);
        tokenStore.clear();
        setLoading(false);
        return;
      }
      const j = await r.json();
      setUser(j.user);
    } catch (err) {
      setUser(null);
      tokenStore.clear();
    }
    setLoading(false);
  }
  useEffect(()=>{ refresh(); }, []);

  function login(){ location.href = "/login"; }
  async function devLogin(email?:string){
    // Disabled in simple auth mode
    location.href = "/login";
  }
  async function logout(){ 
    try { 
      await api("/auth/logout",{method:"POST"}); 
    } catch {} 
    tokenStore.clear(); 
    setUser(null); 
    location.href="/login"; 
  }

  return <AuthCtx.Provider value={{ user, loading, refresh, login, devLogin, logout }}>{children}</AuthCtx.Provider>;
}
export function useAuth(){ return useContext(AuthCtx); }