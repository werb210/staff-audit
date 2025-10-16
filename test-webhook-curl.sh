#!/bin/bash

# Test webhook handler with sample SignNow payload
echo "🧪 Testing SignNow webhook handler..."

# Test 1: Valid webhook payload
echo "Test 1: Valid webhook payload"
curl -X POST http://localhost:5000/api/webhooks/signnow \
  -H "Content-Type: application/json" \
  -d '{
    "event": "document.completed",
    "document_id": "test_doc_123456",
    "timestamp": "2025-01-13T22:30:00Z",
    "user_id": "test_user_456"
  }'

echo -e "\n\n"

# Test 2: Missing required fields
echo "Test 2: Missing required fields (should return 400)"
curl -X POST http://localhost:5000/api/webhooks/signnow \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-13T22:30:00Z",
    "user_id": "test_user_456"
  }'

echo -e "\n\n"

# Test 3: User document field invite signed (iframe completion)
echo "Test 3: User document field invite signed (iframe)"
curl -X POST http://localhost:5000/api/webhooks/signnow \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user.document.fieldinvite.signed",
    "document_id": "test_doc_iframe_789",
    "timestamp": "2025-01-13T22:30:00Z",
    "user_id": "test_user_iframe"
  }'

echo -e "\n\nWebhook tests completed!"