import React from "react";
import AppDrawer from "./AppDrawer";
export default function AppDrawerHost(){
  const [open,setOpen]=React.useState(false);
  const [id,setId]=React.useState<string|null>(null);
  React.useEffect(()=>{
    (window as any).__openApp = (card:any)=>{ setId(card?.id||null); setOpen(true); };
  },[]);
  return <AppDrawer open={open} id={id} onClose={()=>setOpen(false)}/>;
}