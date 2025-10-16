#!/bin/bash

echo "=== SignNow Template Field Verification ==="
echo "Template ID: e7ba8b894c644999a7b38037ea66f4cc9cc524f5"
echo ""

# Get the SignNow token from environment
SIGNNOW_TOKEN=$(grep SIGNNOW_ACCESS_TOKEN .env | cut -d'=' -f2)

echo "🔍 Testing direct API call to template..."
curl -s -X GET "https://api.signnow.com/v2/templates/e7ba8b894c644999a7b38037ea66f4cc9cc524f5" \
  -H "Authorization: Bearer $SIGNNOW_TOKEN" \
  -H "Content-Type: application/json" | jq '{
    template_id: .id,
    field_count: (.fields | length),
    role_count: (.roles | length),
    fields: [.fields[] | {name: .name, type: .type, required: .required}],
    roles: [.roles[] | {name: .name, signing_order: .signing_order}]
  }'

echo ""
echo "🔍 Testing document creation from template..."
curl -s -X POST "https://api.signnow.com/v2/documents" \
  -H "Authorization: Bearer $SIGNNOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "e7ba8b894c644999a7b38037ea66f4cc9cc524f5"
  }' | jq '{
    document_id: .id,
    field_count: (.fields | length),
    role_count: (.roles | length),
    fields: [.fields[] | {name: .name, type: .type}],
    roles: [.roles[] | {name: .name}]
  }'

echo ""
echo "=== Test Complete ==="