#!/bin/bash
export STAFF_API_URL="https://staff.boreal.financial"
export CLIENT_API_URL="https://clientportal.boreal.financial" 
export ADMIN_API_KEY="bf_client_live_32products_2025"
npx playwright test tests/e2e/lenderProductsSync.spec.ts --headed
