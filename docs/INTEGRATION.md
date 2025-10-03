# Client ↔ Staff Integration (Production)

## Required environment
- `APP_URL=https://staff.boreal.financial`
- `CLIENT_CORS_ORIGINS=https://client.boreal.financial,https://www.boreal.financial,http://localhost:5173`
- `ALLOW_CLIENT_SHARED_TOKEN=1`
- `CLIENT_SHARED_BEARER=<secure-random-token>`  ← must match the client

## Single Source of Truth (SoT)
| Endpoint | Method | Expectation |
|---|---|---|
| `/api/v1/products` | GET | 200, **44** items |
| `/api/lenders` | GET | 200, **30** items |
| `/api/required-docs` | GET | 200 (JSON) |
| `/api/applications` | POST | 201 (Created) |
| `/api/applications/validate-intake` | POST | **200** `{ ok:true, validated:true, details }` on success; **400** `{ ok:false, errors:[…], details? }` on missing/invalid |
| `/api/v1/applications/validate-intake` | POST | Same behavior (back-compat alias) |
| Any without bearer | ANY | 401 |
| CORS preflight | OPTIONS | 200/204; origins per `CLIENT_CORS_ORIGINS` |

### Validator semantics
- **Required:** `productId` (or `product_id`/`product`), `country`, `amountRequested`
- **Checks:** product exists in `lender_products`, `active=true`, `country` matches, `amountRequested` within `[amount_min, amount_max]`
- **Responses:**
  - Missing fields → **400** `{ ok:false, errors:[…] }`
  - Invalid product / business rule fail → **400** `{ ok:false, errors:[…], details? }`
  - Valid → **200** `{ ok:true, validated:true, details:{ product… } }`

## Pre-deploy smoke (safe for prod)
```bash
APP_URL=https://staff.boreal.financial \
CLIENT_SHARED_BEARER=*** \
./scripts/smoke.staff.sh
```

## Troubleshooting

**HTML response** → wrong base/proxy; ensure client uses `/api` base.

**401** → tokens don't match or origin not in `CLIENT_CORS_ORIGINS`.