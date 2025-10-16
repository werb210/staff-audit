import { Router } from 'express';

const router = Router();

// SMS endpoints
router.get('/sms', (req: any, res: any) => {
  const { contactId } = req.query;
  
  const smsThread = [
    {
      id: 'sms_1',
      contactId: contactId || 'contact_123',
      direction: 'outbound',
      to: '+15551234567',
      from: '+15559876543',
      body: 'Hi John, this is Sarah from Boreal Financial. Do you have a moment to discuss your equipment financing needs?',
      status: 'delivered',
      sentAt: '2024-08-20T14:30:00Z',
      templateId: 'sms_tmpl_1'
    },
    {
      id: 'sms_2',
      contactId: contactId || 'contact_123',
      direction: 'inbound',
      to: '+15559876543',
      from: '+15551234567',
      body: 'Yes, I\'m interested. When can we talk?',
      status: 'received',
      sentAt: '2024-08-20T14:45:00Z'
    },
    {
      id: 'sms_3',
      contactId: contactId || 'contact_123',
      direction: 'outbound',
      to: '+15551234567',
      from: '+15559876543',
      body: 'Great! I have availability tomorrow at 2 PM or Friday at 10 AM. Which works better for you?',
      status: 'delivered',
      sentAt: '2024-08-20T14:50:00Z'
    }
  ];
  
  res.json({ messages: smsThread });
});

router.post('/sms', (req: any, res: any) => {
  const { to, contactId, body, templateId } = req.body;
  
  if (!to || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, body' });
  }
  
  const newMessage = {
    id: `sms_${Date.now()}`,
    contactId,
    direction: 'outbound',
    to,
    from: '+15559876543', // System default
    body,
    status: 'queued',
    sentAt: new Date().toISOString(),
    templateId
  };
  
  // Simulate async sending
  setTimeout(() => {
    newMessage.status = 'delivered';
  }, 1000);
  
  console.log(`📱 SMS sent to ${to}: ${body.substring(0, 50)}...`);
  
  res.status(201).json(newMessage);
});

// Email endpoints
router.get('/email', (req: any, res: any) => {
  const { contactId } = req.query;
  
  const emailThread = [
    {
      id: 'email_1',
      contactId: contactId || 'contact_123',
      direction: 'outbound',
      to: 'john@acmemanufacturing.com',
      from: 'sarah@borealfinancial.com',
      subject: 'Equipment financing options for Acme Manufacturing',
      html: '<p>Hi John,</p><p>I hope this email finds you well. I wanted to follow up on our previous conversation about equipment financing...</p>',
      text: 'Hi John, I hope this email finds you well. I wanted to follow up on our previous conversation about equipment financing...',
      status: 'delivered',
      sentAt: '2024-08-19T09:15:00Z',
      templateId: 'email_tmpl_1',
      opened: true,
      openedAt: '2024-08-19T10:22:00Z',
      clicked: false
    },
    {
      id: 'email_2',
      contactId: contactId || 'contact_123',
      direction: 'inbound',
      to: 'sarah@borealfinancial.com',
      from: 'john@acmemanufacturing.com',
      subject: 'Re: Equipment financing options for Acme Manufacturing',
      html: '<p>Hi Sarah,</p><p>Thanks for reaching out. We are indeed looking for financing options for some new equipment. Could you send me more details about your rates and terms?</p>',
      text: 'Hi Sarah, Thanks for reaching out. We are indeed looking for financing options for some new equipment. Could you send me more details about your rates and terms?',
      status: 'received',
      sentAt: '2024-08-19T11:30:00Z'
    },
    {
      id: 'email_3',
      contactId: contactId || 'contact_123',
      direction: 'outbound',
      to: 'john@acmemanufacturing.com',
      from: 'sarah@borealfinancial.com',
      subject: 'Re: Equipment financing options for Acme Manufacturing',
      html: '<p>Hi John,</p><p>Absolutely! I\'ve attached our rate sheet and terms. Based on your business profile, I think you\'d qualify for our premium tier with rates starting at 5.9%...</p>',
      text: 'Hi John, Absolutely! I\'ve attached our rate sheet and terms. Based on your business profile, I think you\'d qualify for our premium tier with rates starting at 5.9%...',
      status: 'delivered',
      sentAt: '2024-08-19T13:45:00Z',
      templateId: 'email_tmpl_2',
      opened: true,
      openedAt: '2024-08-19T14:12:00Z',
      clicked: true,
      clickedAt: '2024-08-19T14:15:00Z'
    }
  ];
  
  res.json({ messages: emailThread });
});

router.post('/email', (req: any, res: any) => {
  const { to, subject, html, text, templateId, contactId } = req.body;
  
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, and html or text' });
  }
  
  const newEmail = {
    id: `email_${Date.now()}`,
    contactId,
    direction: 'outbound',
    to,
    from: 'system@borealfinancial.com', // System default
    subject,
    html,
    text: text || html?.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
    status: 'queued',
    sentAt: new Date().toISOString(),
    templateId,
    opened: false,
    clicked: false
  };
  
  // Simulate async sending and tracking
  setTimeout(() => {
    newEmail.status = 'delivered';
  }, 1000);
  
  setTimeout(() => {
    newEmail.opened = true;
    newEmail.openedAt = new Date().toISOString();
  }, 5000);
  
  console.log(`📧 Email sent to ${to}: ${subject}`);
  
  res.status(201).json(newEmail);
});

// Existing calls endpoint (confirmed working)
router.get('/calls', (req: any, res: any) => {
  const { contactId } = req.query;
  
  const calls = [
    {
      id: 'call_1',
      contactId: contactId || 'contact_123',
      direction: 'outbound',
      outcome: 'completed',
      duration: 420, // seconds
      notes: 'Discussed equipment financing needs. Follow up with rate sheet.',
      transcript: 'Hi John, this is Sarah from Boreal Financial...',
      startedAt: '2024-08-20T10:00:00Z',
      endedAt: '2024-08-20T10:07:00Z'
    },
    {
      id: 'call_2',
      contactId: contactId || 'contact_123',
      direction: 'inbound',
      outcome: 'voicemail',
      duration: 0,
      notes: 'Left voicemail about rate sheet follow-up',
      startedAt: '2024-08-19T15:30:00Z',
      endedAt: '2024-08-19T15:30:30Z'
    }
  ];
  
  res.json({ calls });
});

router.post('/calls', (req: any, res: any) => {
  const { contactId, appId, direction, outcome, duration, notes, transcript } = req.body;
  
  const newCall = {
    id: `call_${Date.now()}`,
    contactId,
    appId,
    direction,
    outcome,
    duration: duration || 0,
    notes: notes || '',
    transcript: transcript || '',
    startedAt: new Date().toISOString(),
    endedAt: duration ? new Date(Date.now() + (duration * 1000)).toISOString() : new Date().toISOString()
  };
  
  console.log(`📞 Call logged: ${direction} ${outcome} for contact ${contactId}`);
  
  res.status(201).json(newCall);
});

// Communication templates
router.get('/templates', (req: any, res: any) => {
  const { type } = req.query;
  
  const templates = [
    {
      id: 'sms_tmpl_1',
      type: 'sms',
      name: 'Initial Outreach',
      body: 'Hi {{firstName}}, this is {{ownerName}} from Boreal Financial. Do you have a moment to discuss your equipment financing needs?',
      variables: ['firstName', 'ownerName'],
      category: 'outreach'
    },
    {
      id: 'sms_tmpl_2',
      type: 'sms',
      name: 'Follow-up',
      body: 'Hi {{firstName}}, following up on our conversation about financing for {{company}}. I have some great options to share with you.',
      variables: ['firstName', 'company'],
      category: 'follow-up'
    },
    {
      id: 'email_tmpl_1',
      type: 'email',
      name: 'Equipment Financing Introduction',
      subject: 'Equipment financing options for {{company}}',
      html: '<p>Hi {{firstName}},</p><p>I hope this email finds you well. I wanted to reach out about equipment financing options for {{company}}...</p>',
      variables: ['firstName', 'company'],
      category: 'introduction'
    },
    {
      id: 'email_tmpl_2',
      type: 'email',
      name: 'Rate Sheet Follow-up',
      subject: 'Competitive rates for {{company}} - {{appAmount}} financing',
      html: '<p>Hi {{firstName}},</p><p>As promised, I\'ve attached our current rate sheet for {{company}}\'s {{appAmount}} financing request...</p>',
      variables: ['firstName', 'company', 'appAmount'],
      category: 'follow-up'
    }
  ].filter(template => !type || template.type === type);
  
  res.json({ templates });
});

export default router;