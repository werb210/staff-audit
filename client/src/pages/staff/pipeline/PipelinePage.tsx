import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { api } from '@/lib/queryClient';
import { ApplicationDrawer } from '@/features/pipeline/ApplicationDrawer';
import { PipelineCard, PipelineCardType } from '@/features/pipeline/PipelineCard';
import { LANES, Lane, labels, Card } from '@/features/pipeline/types';
import { useToast } from '@/hooks/use-toast';
import { useFeaturePanel, FeatureActionButton } from '@/features/featureWiring';

// Utility functions
const asArray = (x: any) => Array.isArray(x) ? x : [];
const uniqBy = (arr: any[], key: string) => {
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
};
const lower = (s: string | undefined | null) => (s ?? '').toLowerCase();

const normalizeApp = (item: any): Card & PipelineCardType => ({
  // Basic Card interface
  id: item.id,
  businessName: item.company || item.businessName || item.contactName || 'Untitled',
  title: item.company || item.businessName || item.contactName || 'Untitled',
  amount: Number(item.amount || 0),
  status: (item.stage === 'draft' ? 'new' : (item.stage || item.status || 'new')),
  contact: item.contactEmail || null,
  
  // Enhanced PipelineCardType fields
  name: item.company || item.businessName || item.contactName || 'Untitled',
  company: item.company || item.businessName || 'Unknown Company',
  email: item.contactEmail || null,
  contactPhone: item.contactPhone || null,
  businessType: item.businessType || null,
  industry: item.industry || null,
  annualRevenue: item.annualRevenue || null,
  yearsInBusiness: item.yearsInBusiness || null,
  numberOfEmployees: item.numberOfEmployees || null,
  businessAddress: item.businessAddress || null,
  website: item.website || null,
  useOfFunds: item.useOfFunds || null,
  documentCount: item.docCount || 0,
  documentsUploaded: item.documentsUploaded || [],
  missingDocuments: item.missingDocuments || [],
  createdAt: item.lastActivity || item.createdAt || null,
  lenderId: item.lenderId || null,
  productId: item.productId || null
});

export default function PipelinePage() {
  useFeaturePanel("pipeline");
  
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/staff/pipeline/:id?');
  const id = params?.id;
  
  const [openId, setOpenId] = useState<string | undefined>(id);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragId] = useState<string | null>(null);
  const [overLane, setOverLane] = useState<string | null>(null);
  const [wip, setWip] = useState<Record<string, number>>({});

  // Sync URL with drawer state (read only - don't navigate on drawer open)
  useEffect(() => {
    if (id && id !== 'pipeline') {
      setOpenId(id);
    }
  }, [id]);

  // REMOVED: Don't navigate when opening drawer to prevent auth re-checks
  // This was causing login redirects due to ProtectedRoute re-running
  // useEffect(() => {
  //   if (openId) {
  //     setLocation(`/staff/pipeline/${openId}`);
  //   } else {
  //     setLocation('/staff/pipeline');
  //   }
  // }, [openId, setLocation]);

  // Fetch WIP limits
  useMemo(() => { 
    api('/api/pipeline/config').then(r => setWip(r.wip || {})).catch(() => {}); 
  }, []);

  // Fetch pipeline data
  const boardQuery = useQuery({
    queryKey: ['pipeline-board'],
    queryFn: async () => {
      try {
        const raw = await api('/api/pipeline/board');
        
        const enrichedCards: (Card & PipelineCardType)[] = [];
        const seenIds = new Set<string>();
        
        if (raw?.lanes && Array.isArray(raw.lanes)) {
          raw.lanes.forEach((lane: any) => {
            const items = lane.items || [];
            items.forEach((item: any) => {
              if (seenIds.has(item.id)) return;
              seenIds.add(item.id);
              enrichedCards.push(normalizeApp(item));
            });
          });
        }
        
        return uniqBy(enrichedCards, 'id');
      } catch (error) {
        console.error('Pipeline board query failed:', error);
        try {
          const mainBoard = await api('/api/pipeline');
          const items = Array.isArray(mainBoard) ? mainBoard : (mainBoard?.items ? mainBoard.items : []);
          return Array.isArray(items) ? items.map(normalizeApp) : [];
        } catch (e2) {
          console.error('Main pipeline also failed:', e2);
          return [];
        }
      }
    },
    staleTime: 30_000
  });

  // Search filtering
  const filtered = useMemo(() => {
    const s = lower((searchQuery || '').trim());
    const boardData = Array.isArray(boardQuery.data) ? boardQuery.data : [];
    if (!s) return boardData;
    const numq = s.replace(/[^0-9]/g, "");
    return boardData.filter((c: Card & PipelineCardType) =>
      lower(c.title || c.name).includes(s) ||
      lower(c.contact || c.email).includes(s) ||
      (String(c.amount || '').replace(/[^0-9]/g, "").includes(numq)) ||
      String(c.amount || '').includes(s)
    );
  }, [boardQuery.data, searchQuery]);

  // Move card function
  async function moveCard(id: string, to: Lane) {
    const currentCards = filtered.filter((c: Card) => c.status === to);
    const nextCount = currentCards.length + 1;
    if (wip[to] && nextCount > wip[to]) {
      toast({
        variant: 'destructive',
        title: 'WIP Limit Reached',
        description: `${labels[to]} lane WIP limit (${wip[to]}) reached`
      });
      return;
    }

    try {
      await api(`/api/pipeline/cards/${id}/move`, { method: 'POST', body: JSON.stringify({ to }), headers: { 'Content-Type': 'application/json' } });
      toast({
        title: 'Card Moved',
        description: 'Application successfully moved'
      });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Move Failed',
        description: 'Failed to move application'
      });
    }
  }

  // Lane KPI calculation
  const laneKpi = (cards: Card[]) => ({
    count: cards.length,
    total: cards.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  });

  const cardsBy = (status: Lane) => (asArray(filtered) as Card[]).filter(c => c.status === status);

  if (boardQuery.isLoading) return <div className="p-4 text-sm text-gray-500">Loading pipeline…</div>;
  if (boardQuery.isError) return <div className="p-4 text-sm text-red-600">Failed to load pipeline.</div>;

  return (
    <div className="p-4" data-page="pipeline">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Sales Pipeline</h1>
        <FeatureActionButton 
          featureId="pipeline" 
          className="border rounded px-3 py-1 text-sm"
          onClick={() => {
            boardQuery.refetch();
            toast({ title: "Pipeline refreshed" });
          }}
        >
          Refresh Pipeline
        </FeatureActionButton>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
        {[
          { label: 'Applications', value: Array.isArray(boardQuery.data) ? boardQuery.data.length : 0 },
          { label: 'Pipeline Value', value: (Array.isArray(boardQuery.data) ? boardQuery.data.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0) : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) },
          { label: 'Conversion (30d)', value: '0%' },
          { label: 'Avg Cycle (d)', value: '—' },
        ].map(x => (
          <div key={x.label} className="rounded-lg border bg-white/70 px-3 py-2">
            <div className="text-gray-500">{x.label}</div>
            <div className="font-semibold">{x.value}</div>
          </div>
        ))}
      </div>

      {/* Search Input */}
      <input 
        value={searchQuery} 
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search by name, email, amount…" 
        className="mb-2 w-full md:w-80 px-3 py-2 border rounded"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {LANES.map(status => {
          const cards = asArray(cardsBy(status));
          const k = laneKpi(cards);
          const highlight = overLane === status ? 'ring-2 ring-blue-400' : '';
          const wipWarning = wip[status] && cards.length >= wip[status] ? 'border-red-300 bg-red-50' : '';

          return (
            <div key={status}
                 data-testid={`lane-${status}`}
                 className={`bg-white border rounded flex flex-col ${highlight} ${wipWarning}`}
                 onDragEnter={(e) => { e.preventDefault(); setOverLane(status); }}
                 onDragOver={(e) => e.preventDefault()}
                 onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverLane(null); }}
                 onDrop={(e) => { 
                   e.preventDefault(); 
                   setOverLane(null);
                   const json = e.dataTransfer.getData('application/json'); 
                   if (!json) return;
                   const { id, from } = JSON.parse(json); 
                   if (from !== status) {
                     moveCard(id, status as Lane);
                   }
                 }}>
              <div className="p-2 border-b sticky top-0 bg-white z-10">
                <div className="font-semibold">{labels[status]}</div>
                <div className="text-xs text-gray-500">{k.count} cards • ${k.total.toLocaleString()}</div>
                {wip[status] && (
                  <div className={`text-[11px] mt-1 ${
                    cards.length >= wip[status] ? 'text-red-600 font-medium' : 'text-amber-600'
                  }`}>
                    WIP: {cards.length}/{wip[status]}
                  </div>
                )}
              </div>

              <div className="p-2 space-y-2 min-h-[60px] flex-1">
                {/* Drop placeholder */}
                {overLane === status && dragId && (
                  <div className="border-2 border-dashed border-blue-300 rounded h-16 flex items-center justify-center text-xs text-blue-600">
                    Drop here
                  </div>
                )}

                {(cards as (Card & PipelineCardType)[] || []).map((c: Card & PipelineCardType) => {
                  return (
                  <div key={c.id}
                       className={`transition-opacity ${
                         dragId === c.id ? 'opacity-50' : ''
                       }`}
                       data-testid="pipeline-card-wrapper"
                       data-id={c.id}>
                    <PipelineCard
                      c={c}
                      onOpen={(card) => {
                        setOpenId(card.id); 
                      }}
                      onMove={(card, nextStatus) => {
                        moveCard(card.id, nextStatus as Lane);
                      }}
                    />
                  </div>
                  );
                })}

                {!cards.length && !overLane && (
                  <div className="text-xs text-gray-400 text-center py-4">No cards</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openId && (
        <ApplicationDrawer 
          openId={openId} 
          onClose={() => {
            setOpenId(undefined);
          }}
        />
      )}
    </div>
  );
}