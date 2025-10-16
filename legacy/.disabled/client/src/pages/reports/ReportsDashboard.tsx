import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import FilterBar, { Filters } from './FilterBar';
import { getKpis } from '../../lisa/api/reports';

export default function ReportsDashboard(){
  const tabs = [
    { to:'/reports/sales',     label:'Sales' },
    { to:'/reports/marketing', label:'Marketing' },
    { to:'/reports/lenders',   label:'Lenders' },
    { to:'/reports/documents', label:'Documents' },
    { to:'/reports/banking',   label:'Banking' },
    { to:'/reports/custom',    label:'Custom' },
  ];

  const [filters,setFilters] = useState<Filters>({});
  const [kpi,setKpi] = useState<any>({});

  useEffect(()=>{ (async()=>{
    try{ const r = await getKpis(filters); setKpi(r || {}); } catch {}
  })(); },[filters]);

  return (
    <div className="h-full flex flex-col">
      <FilterBar onChange={setFilters}/>
      <div className="p-3 border-b flex gap-2 bg-white">
        {tabs.map(t=>(
          <NavLink key={t.to} to={t.to}
            className={({isActive})=>`px-3 py-1.5 rounded ${isActive?'bg-gray-900 text-white':'hover:bg-gray-100'}`}>
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3">
        <KpiCard label="Total Applications" value={kpi.totalApplications}/>
        <KpiCard label="Conversion Rate"    value={kpi.conversionRate ? `${kpi.conversionRate}%` : '—'}/>
        <KpiCard label="Avg Time in Pipeline" value={kpi.avgDays ? `${kpi.avgDays} days` : '—'}/>
        <KpiCard label="Funded Amount"      value={kpi.fundedAmount ? `$${kpi.fundedAmount.toLocaleString?.()||kpi.fundedAmount}`:'—'}/>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-white">
        <Outlet context={{ filters }}/>
      </div>
    </div>
  );
}

function KpiCard({ label, value }:{ label:string; value:any }){
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value ?? '—'}</div>
    </div>
  );
}