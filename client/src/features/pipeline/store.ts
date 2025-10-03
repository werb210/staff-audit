import { useCallback, useMemo, useState } from 'react';
const FORCE_SEED = (import.meta as any).env?.VITE_PIPELINE_FORCE_SEED === '1';
const q = FORCE_SEED ? '?seed=1' : '';
type LaneId='new'|'requiresdocs'|'inreview'|'withlender'|'accepted'|'declined';
type Lane={id:LaneId;name:string;count?:number};
type Card={id:string;businessName:string;amount?:number;status:LaneId};
const LANES:Lane[]=[
  {id:'new',name:'New'},{id:'requiresdocs',name:'Requires Docs'},{id:'inreview',name:'In Review'},
  {id:'withlender',name:'With Lender'},{id:'accepted',name:'Accepted'},{id:'declined',name:'Declined'}
];
async function getJSON<T>(url:string):Promise<T>{ const r=await fetch(url); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

export function usePipeline(){
  const [lanes,setLanes]=useState<Lane[]>(LANES);
  const [cards,setCards]=useState<Card[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|undefined>();

  const load = useCallback(async ()=>{
    setLoading(true); setError(undefined);
    try{
      const [b,c] = await Promise.all([
        getJSON<{lanes:Lane[]}>(`/api/pipeline/board${q}`),
        getJSON<{cards:Card[]}>(`/api/pipeline/cards${q}`),
      ]);
      setLanes(b.lanes?.length? b.lanes : LANES);
      setCards(c.cards||[]);
    }catch(e:any){ setError(e?.message||'load failed'); }
    finally{ setLoading(false); }
  },[]);

  const cardsByLane = useMemo(()=>{
    const by:Record<string,Card[]> = {};
    for(const l of LANES) by[l.id]=[];
    for(const c of cards) { (by[c.status] ||= []).push(c); }
    return by;
  },[cards]);

  const open = useCallback((id:string)=>{ 
    console.log('[open card]', id);
    // TODO: Open card drawer/modal with application details
    // For now, show a simple alert with card info
    const card = cards.find(c => c.id === id);
    if (card) {
      alert(`Opening application for ${card.businessName}\nAmount: $${card.amount?.toLocaleString()}\nStatus: ${card.status}\nID: ${id.slice(0,8)}`);
    }
  },[cards]);
  return { lanes, cardsByLane, load, loading, error, open };
}