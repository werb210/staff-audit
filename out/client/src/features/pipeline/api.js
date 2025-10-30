import { api } from "@/lib/http";
export const pipelineApi = {
    getBoard: () => api("/api/pipeline/board"),
    getCards: (q = "") => api(`/api/pipeline/cards${q ? `?${q}` : ""}`),
    getCard: (id) => api(`/api/pipeline/cards/${id}`),
};
