#!/bin/bash

# Test application creation with step-based payload
echo "🧪 Testing application creation with step-based payload..."

# Test Canadian application similar to your actual data
curl -X POST http://localhost:5000/api/public/applications \
  -H "Content-Type: application/json" \
  -d '{
    "step1": {
      "requestedAmount": 75000,
      "useOfFunds": "Equipment Purchase",
      "repaymentTerms": "12 months"
    },
    "step3": {
      "businessName": "Test Smart Fields Corp",
      "businessType": "Corporation",
      "businessLocation": "CA",
      "businessAddress": "123 Test St\nCalgary, AB T2P 0A1",
      "businessPhone": "+1-403-555-0123",
      "businessEmail": "info@testsmartfields.ca",
      "yearsInBusiness": 5,
      "annualRevenue": 500000,
      "numberOfEmployees": 8
    },
    "step4": {
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@testsmartfields.ca",
      "phone": "+1-403-555-0456",
      "ssn": "123-45-6789",
      "ownershipPercentage": 100
    },
    "source": "client-portal-test",
    "clientVersion": "v2.0"
  }'

echo -e "\n\nApplication creation test completed!"