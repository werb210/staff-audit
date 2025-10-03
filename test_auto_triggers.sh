#!/bin/bash

# Test Auto-Trigger System for Application A16
# Document ID: 83488be1-7fc2-4667-a2b4-b3c9b9d80d87
# Application ID: d28448be-c9e4-48a7-8a32-da936e4e2b1c

echo "=== AUTO-TRIGGER TEST SCRIPT ==="
echo "Document: November_2024_A16_BankStatement.pdf"
echo "Application: d28448be-c9e4-48a7-8a32-da936e4e2b1c"
echo "Document ID: 83488be1-7fc2-4667-a2b4-b3c9b9d80d87"
echo ""

# Test 1: Manual OCR Processing (simulating AUTO-TRIGGER 1)
echo "🤖 [AUTO-TRIGGER 1] Testing OCR processing..."
curl -X POST "http://localhost:5000/api/ocr/83488be1-7fc2-4667-a2b4-b3c9b9d80d87/process" \
  -H "Content-Type: application/json" \
  -H "x-dev-bypass: true"

echo ""
echo ""

# Test 2: Check OCR Results
echo "📊 Checking OCR results..."
curl -X GET "http://localhost:5000/api/ocr/application/d28448be-c9e4-48a7-8a32-da936e4e2b1c" \
  -H "x-dev-bypass: true"

echo ""
echo ""

# Test 3: Banking Analysis (simulating AUTO-TRIGGER 2)
echo "🤖 [AUTO-TRIGGER 2] Testing banking analysis..."
curl -X POST "http://localhost:5000/api/banking-analysis/banking-analysis/d28448be-c9e4-48a7-8a32-da936e4e2b1c" \
  -H "Content-Type: application/json" \
  -H "x-dev-bypass: true"

echo ""
echo ""

# Test 4: Check Banking Analysis Results
echo "📊 Checking banking analysis results..."
curl -X GET "http://localhost:5000/api/applications/d28448be-c9e4-48a7-8a32-da936e4e2b1c/banking-analysis" \
  -H "x-dev-bypass: true"

echo ""
echo ""

# Test 5: Check Application Status
echo "📋 Checking application status..."
curl -X GET "http://localhost:5000/api/applications/d28448be-c9e4-48a7-8a32-da936e4e2b1c" \
  -H "x-dev-bypass: true"

echo ""
echo ""
echo "=== AUTO-TRIGGER TEST COMPLETE ==="