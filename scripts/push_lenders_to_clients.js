// scripts/push_lenders_to_clients.js - Compiled from TypeScript
import axios from "axios";
import pRetry from "p-retry";
import { buildLendersPayload } from "./build_lenders_payload.js";

function getClientApps() {
  const raw = process.env.CLIENT_APPS || "";
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function authHeaders() {
  const token = process.env.CLIENT_PUSH_TOKEN || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Strategy:
 * 1) Try bulk import: POST /api/admin/lenders/import  (body: {exportedAt, totalLenders, ...})
 * 2) Fallback per-lender upsert:
 *    - POST /api/admin/lenders/upsert { name }
 *    - POST /api/admin/lender-products/upsertMany { lender_name, products: [...] }
 */
async function pushToClientBase(baseUrl, payload) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };

  // 1) Bulk path
  try {
    await axios.post(`${baseUrl}/api/admin/lenders/import`, payload, { headers, timeout: 30000 });
    return { ok: true, mode: "bulk" };
  } catch (e) {
    // fall through to fallback mode
  }

  // 2) Fallback safe mode
  for (const lender of payload.lenders) {
    // upsert lender
    await axios.post(
      `${baseUrl}/api/admin/lenders/upsert`,
      { name: lender.name, is_active: true },
      { headers, timeout: 20000 }
    );

    // upsert products in batch
    await axios.post(
      `${baseUrl}/api/admin/lender-products/upsertMany`,
      {
        lender_name: lender.name,
        products: lender.products,
      },
      { headers, timeout: 60000 }
    );
  }

  return { ok: true, mode: "fallback" };
}

async function run() {
  const payload = await buildLendersPayload();
  const apps = getClientApps();

  if (apps.length === 0) {
    console.log("⚠️  No CLIENT_APPS configured. Nothing to push.");
    process.exit(0);
  }

  console.log(
    `📤 Pushing ${payload.totalLenders} lenders & ${payload.totalProducts} products to ${apps.length} client app(s)...`
  );

  for (const baseUrl of apps) {
    const attempt = async () => pushToClientBase(baseUrl, payload);
    const res = await pRetry(attempt, {
      retries: 4,
      factor: 2,
      minTimeout: 1500,
      maxTimeout: 12000,
      onFailedAttempt: (err) => {
        console.log(`   🔁 Retry ${err.attemptNumber}/${err.retriesLeft + err.attemptNumber} for ${baseUrl} – ${err.message}`);
      },
    });

    console.log(
      `   ✅ ${baseUrl} – mode: ${res.mode} (totalLenders=${payload.totalLenders}, totalProducts=${payload.totalProducts})`
    );
  }

  console.log("🎉 Push completed for all configured clients.");
}

// Test when run directly  
if (process.argv[1] && process.argv[1].endsWith('push_lenders_to_clients.js')) {
  run().catch((e) => {
    console.error("❌ Push failed:", e?.response?.data ?? e);
    process.exit(1);
  });
}

export { run as pushLendersToClients };