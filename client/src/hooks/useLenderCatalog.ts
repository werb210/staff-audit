import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/queryClient";

// V1 API Product interface (matches our verified server endpoints)
export interface V1LenderProduct {
  id: string;
  productName: string;
  lenderName: string;
  productCategory: string;
  minimumLendingAmount: number;
  maximumLendingAmount: number;
  countryOffered: "CA" | "US";
  isActive: boolean;
}

// V1 API Lender interface
export interface V1Lender {
  id: string;
  name: string;
  product_count: number;
}

// Legacy interface for backward compatibility
export interface LenderProduct {
  id: string;
  name: string;
  lender_id: string;
  lender_name: string;
  country: "CA" | "US";
  category: string;
  min_amount: number;
  max_amount: number;
  interest_rate_min?: number | null;
  interest_rate_max?: number | null;
  term_min?: number | null;
  term_max?: number | null;
  active: boolean;
  required_documents: Array<{
    key: string;
    label: string;
    required: boolean;
    months?: number;
  }>;
}

export interface LenderCatalogResponse {
  total: number;
  products: LenderProduct[];
}

export interface CatalogFieldsResponse {
  canonical_fields: Array<{
    name: string;
    type: string;
    required: boolean;
    enum?: string[];
    item?: string;
  }>;
  legacy_aliases: Record<string, string>;
  sample_endpoint: string;
}

// Hook to fetch V1 lender products (42 products verified)
export function useV1Products() {
  return useQuery<V1LenderProduct[]>({
    queryKey: ["/api/v1/products"],
    queryFn: () => api("/api/v1/products"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to fetch V1 lenders (12 lenders verified)
export function useV1Lenders() {
  return useQuery<{ lenders: V1Lender[] }>({
    queryKey: ["/api/v1/lenders"],
    queryFn: () => api("/api/v1/lenders"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to fetch lender catalog data (legacy - for backward compatibility)
export function useLenderCatalog() {
  return useQuery<LenderCatalogResponse>({
    queryKey: ["/api/catalog/export-products"],
    queryFn: () => api("/api/catalog/export-products"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to fetch catalog schema fields
export function useCatalogFields() {
  return useQuery<CatalogFieldsResponse>({
    queryKey: ["/api/catalog/fields"],
    queryFn: () => api("/api/catalog/fields"),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to fetch catalog dump with filtering
export function useLenderCatalogDump(
  limit: number = 50,
  lender_id?: string,
  country?: string,
) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());
  if (lender_id) params.set("lender_id", lender_id);
  if (country) params.set("country", country);

  const queryString = params.toString();
  const url = `/api/catalog/dump${queryString ? `?${queryString}` : ""}`;

  return useQuery<LenderCatalogResponse & { canonical_fields: string[] }>({
    queryKey: ["/api/catalog/dump", limit, lender_id, country],
    queryFn: () => api(url),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
