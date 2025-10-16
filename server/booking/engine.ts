import { DB, AvailabilityRule, Blackout } from "../lib/db";
import { format } from "date-fns-tz";
import { addMinutes, isBefore, isAfter, parseISO } from "date-fns";

const TZ_DEFAULT = process.env.TIMEZONE_DEFAULT || "America/Edmonton";

function expandRules(rule:AvailabilityRule, dateLocal:string){
  // dateLocal = '2025-08-14' in user's timezone
  const slots: {startUtc:string,endUtc:string}[] = [];
  const [sy,sm,sd] = dateLocal.split("-").map(Number);
  const start = new Date(Date.UTC(sy,sm-1,sd));
  
  // Build day's window in local time (simplified for demo)
  const startLocal = new Date(`${dateLocal}T${rule.startLocal}:00`);
  const endLocal   = new Date(`${dateLocal}T${rule.endLocal}:00`);
  let sUtc = new Date(startLocal.getTime()); // Simplified timezone handling
  const eUtc = new Date(endLocal.getTime());
  
  while (isBefore(sUtc, eUtc)) {
    const e = addMinutes(sUtc, rule.slotMins);
    if (isAfter(e, eUtc)) break;
    
    const minNotice = addMinutes(new Date(), rule.minNoticeMins);
    if (isAfter(minNotice, sUtc)) { 
      sUtc = addMinutes(sUtc, rule.slotMins); 
      continue; 
    }
    
    slots.push({ startUtc: sUtc.toISOString(), endUtc: e.toISOString() });
    sUtc = addMinutes(sUtc, rule.slotMins);
  }
  return slots;
}

export function getAvailability(username:string, fromISO:string, days=21){
  const user = [...DB.users.values()].find(u=>u.username===username);
  if (!user) return [];
  
  const rules = DB.rules.get(user.id)||[ { 
    id:"seed", userId:user.id, daysOfWeek:[1,2,3,4,5], 
    startLocal:"09:00", endLocal:"17:00", slotMins:30, 
    bufferBefore:0, bufferAfter:0, minNoticeMins:120 
  }];
  
  const black = DB.blackouts.get(user.id)||[];
  const out: {date:string, slots:{startUtc:string,endUtc:string}[]}[] = [];
  const start = new Date(fromISO);
  
  for (let i=0;i<days;i++){
    const d = new Date(start.getTime() + i*86400000);
    const dow = d.getUTCDay(); // 0..6
    const dateLocal = format(d, "yyyy-MM-dd", { timeZone: TZ_DEFAULT });
    
    const daySlots = rules
      .filter(r=>r.daysOfWeek.includes(dow))
      .flatMap(r=>expandRules(r, dateLocal))
      .filter(s => !black.some(b => 
        !(parseISO(s.endUtc) <= parseISO(b.startUtc) || parseISO(s.startUtc) >= parseISO(b.endUtc))
      ));
    
    out.push({ date: dateLocal, slots: daySlots });
  }
  return out;
}