import { ProductWithRules } from "@/types/lenderProduct";

export async function getProductWithRules(
  productId: string,
): Promise<ProductWithRules> {
  // Prefer a combined endpoint if present; fall back to two calls
  try {
    const res = await fetch(
      `${API_BASE}/lender-products/${productId}?expand=rules`,
      {},
    );
    if (res.ok) return res.json();
  } catch (e) {
    console.warn(
      "Combined endpoint not available, falling back to separate calls",
    );
  }

  const [prodRes, rulesRes] = await Promise.all([
    fetch(`${API_BASE}/lender-products/${productId}`, {}),
    fetch(`${API_BASE}/lender-products/${productId}/rules`, {}).catch(() => ({
      ok: false,
    })),
  ]);

  const prod = await prodRes.json();
  const rules = rulesRes.ok ? await rulesRes.json() : {};

  // Normalize legacy field names
  return {
    id: prod.id,
    lenderId: prod.lenderId || prod.lender_id,
    name: prod.name || prod.productName,
    category: prod.category || prod.productCategory,
    countryOffered: prod.countryOffered || prod.country,
    minAmount: prod.minAmount || prod.minimumLendingAmount || prod.min_amount,
    maxAmount: prod.maxAmount || prod.maximumLendingAmount || prod.max_amount,
    minRate: prod.minRate || prod.interestRateMinimum || prod.rate_min,
    maxRate: prod.maxRate || prod.interestRateMaximum || prod.rate_max,
    minTermMonths: prod.minTermMonths || prod.termMinimum || prod.term_min,
    maxTermMonths: prod.maxTermMonths || prod.termMaximum || prod.term_max,
    active: prod.active ?? prod.isActive ?? true,
    description: prod.description,
    rules: rules || {},
  };
}

export async function upsertProductWithRules(payload: ProductWithRules) {
  // Use new orchestrator if available:
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id
    ? `/api/lender-products/${payload.id}/combined`
    : `/api/lenders/${payload.lenderId}/products/combined`;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) return res.json();
  } catch (e) {
    console.warn(
      "Combined endpoint not available, falling back to separate calls",
    );
  }

  // Fallback: call old endpoints in sequence so nothing breaks
  const legacyPayload = {
    lenderId: payload.lenderId,
    productName: payload.name,
    productCategory: payload.category || "business_loan",
    countryOffered: payload.countryOffered || "CA",
    minimumLendingAmount: payload.minAmount || 0,
    maximumLendingAmount: payload.maxAmount || 0,
    interestRateMinimum: payload.minRate || 0,
    interestRateMaximum: payload.maxRate || 0,
    termMinimum: payload.minTermMonths || 0,
    termMaximum: payload.maxTermMonths || 0,
    isActive: payload.active ?? true,
    description: payload.description || "",
    documentsRequired: payload.rules?.requiredDocs || [],
  };

  if (!payload.id) {
    const created = await fetch(`${API_BASE}/v1/lenders/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legacyPayload),
    }).then((r) => r.json());

    // Try to save rules if endpoint exists
    try {
      await fetch(`${API_BASE}/lender-products/${created.id}/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.rules || {}),
      });
    } catch (e) {
      console.warn("Rules endpoint not available");
    }

    return created;
  } else {
    await fetch(`${API_BASE}/v1/lenders/products/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legacyPayload),
    });

    // Try to save rules if endpoint exists
    try {
      await fetch(`${API_BASE}/lender-products/${payload.id}/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.rules || {}),
      });
    } catch (e) {
      console.warn("Rules endpoint not available");
    }

    return { id: payload.id };
  }
}
