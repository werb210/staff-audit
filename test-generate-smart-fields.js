#!/usr/bin/env node

/**
 * Test script to generate and display Smart Fields object for manual copy to SignNow template
 */

const { generateSmartFields } = require('./server/signing/generateSmartFields.ts');

// Mock application data with comprehensive step-based structure
const mockApplicationData = {
  step1: {
    requestedAmount: "250000",
    lookingFor: "Working Capital",
    equipmentValue: "300000"
  },
  step3: {
    businessName: "Smart Fields Display Corp",
    businessEntity: "Corporation",
    yearsInBusiness: "7",
    numEmployees: "25",
    annualRevenue: "1200000",
    industry: "Technology",
    streetAddress: "456 Tech Boulevard",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    phone: "555-0123",
    website: "smartfieldsdisplay.com",
    dba: "Smart Fields Inc"
  },
  step4: {
    firstName: "Michael",
    lastName: "Thompson",
    email: "michael.thompson@smartfieldsdisplay.com",
    phone: "555-0124",
    dob: "1978-11-20",
    ssn: "111-22-3333",
    streetAddress: "789 Personal Drive",
    city: "San Francisco",
    state: "CA",
    zip: "94107"
  }
};

console.log("🎯 GENERATING SMART FIELDS OBJECT FOR SIGNNOW TEMPLATE");
console.log("=".repeat(80));

// Generate smart fields using the comprehensive function
const smartFields = generateSmartFields(mockApplicationData);

console.log("\n📋 SMART FIELDS OBJECT - READY FOR SIGNNOW TEMPLATE COPY:");
console.log("=".repeat(80));
console.log(JSON.stringify(smartFields, null, 2));
console.log("=".repeat(80));

console.log("\n📊 FIELD SUMMARY:");
console.log(`Total Fields: ${Object.keys(smartFields).length}`);
console.log("Field Names:", Object.keys(smartFields).join(", "));
console.log("=".repeat(80));

console.log("\n🔧 INSTRUCTIONS:");
console.log("1. Copy the JSON object above");
console.log("2. Use the field names as smart field names in SignNow template");
console.log("3. Each field will be automatically populated with the corresponding value");
console.log("=".repeat(80));