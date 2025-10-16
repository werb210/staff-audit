import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
import { requireRoles } from '../middleware/rbac.ts';

const r = Router();
r.use(authBearer);

// LOOKUP - Phone validation and carrier info
r.get('/:phoneNumber', requireRoles('admin','user','marketing'), async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { includeCarrier = 'true' } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    console.log(`🔍 [TWILIO-LOOKUP] Phone lookup for ${phoneNumber}`);
    
    // TODO: Integrate with real Twilio Lookup API
    // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const lookup = await twilio.lookups.phoneNumbers(phoneNumber).fetch({type: ['carrier']});
    
    // Mock response for now - replace with actual Twilio API call
    const mockResult = {
      success: true,
      phoneNumber: phoneNumber,
      nationalFormat: formatPhoneNumber(phoneNumber),
      valid: isValidPhoneFormat(phoneNumber),
      countryCode: phoneNumber.startsWith('+1') ? 'US' : 'UNKNOWN',
      carrier: includeCarrier === 'true' ? {
        name: 'Mock Carrier',
        type: 'mobile',
        errorCode: null
      } : undefined
    };
    
    res.json(mockResult);
    
  } catch (error) {
    console.error('❌ [TWILIO-LOOKUP] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1);
    return `(${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
  }
  return phone;
}

function isValidPhoneFormat(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export default r;