import { api } from '@/lib/http';

export type Lane = { id:string; name:string; count?:number };
export type Board = { ok:boolean; lanes?:Lane[]; stages?:Lane[]; totals?:number };
export type Card = { id:string; businessName:string; status:string; amount?:number };
export type CardsResp = { ok:boolean; cards:Card[]; __diag?:any };

export const pipelineApi = {
  getBoard: () => api<Board>('/api/pipeline/board'),
  getCards: (q='') => api<CardsResp>(`/api/pipeline/cards${q ? `?${q}`:''}`),
  getCard:  (id:string) => api(`/api/pipeline/cards/${id}`),
};
