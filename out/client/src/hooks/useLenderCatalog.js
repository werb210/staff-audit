import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/queryClient";
// Hook to fetch V1 lender products (42 products verified)
export function useV1Products() {
    return useQuery({
        queryKey: ["/api/v1/products"],
        queryFn: () => api("/api/v1/products"),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}
// Hook to fetch V1 lenders (12 lenders verified)
export function useV1Lenders() {
    return useQuery({
        queryKey: ["/api/v1/lenders"],
        queryFn: () => api("/api/v1/lenders"),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}
// Hook to fetch lender catalog data (legacy - for backward compatibility)
export function useLenderCatalog() {
    return useQuery({
        queryKey: ["/api/catalog/export-products"],
        queryFn: () => api("/api/catalog/export-products"),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}
// Hook to fetch catalog schema fields
export function useCatalogFields() {
    return useQuery({
        queryKey: ["/api/catalog/fields"],
        queryFn: () => api("/api/catalog/fields"),
        staleTime: 15 * 60 * 1000, // 15 minutes
        refetchOnWindowFocus: false,
    });
}
// Hook to fetch catalog dump with filtering
export function useLenderCatalogDump(limit = 50, lender_id, country) {
    const params = new URLSearchParams();
    if (limit)
        params.set("limit", limit.toString());
    if (lender_id)
        params.set("lender_id", lender_id);
    if (country)
        params.set("country", country);
    const queryString = params.toString();
    const url = `/api/catalog/dump${queryString ? `?${queryString}` : ""}`;
    return useQuery({
        queryKey: ["/api/catalog/dump", limit, lender_id, country],
        queryFn: () => api(url),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}
