import { Page, Route, request } from '@playwright/test';

type Opts = { contactId: string };

export async function enableApiMocks(page: Page, { contactId }: Opts) {
  if (process.env.SKIP_MOCK === '1') return; // run live

  const base = process.env.STAFF_URL || 'http://127.0.0.1:5000';
  const re = (p: string) => new RegExp(p.replace(/\//g, '\\/'));

  // Helper to log intercepted requests
  async function log(route: Route, label: string) {
    const req = route.request();
    const body = req.postData() || '';
    console.log(`[MOCK] ${label}: ${req.method()} ${req.url()} body=${body.slice(0,200)}`);
  }

  // Communications feed
  await page.route(re(`${base}/api/contacts/${contactId}/communications`), async (route) => {
    await log(route, 'FEED');
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ items: [
        { id: 'c1', type: 'email',   direction: 'outbound', createdAt: new Date().toISOString(), subject: 'Welcome', body: '<p>Hello!</p>' },
        { id: 'c2', type: 'sms',     direction: 'inbound',  createdAt: new Date().toISOString(), content: 'Thanks!' },
        { id: 'c3', type: 'call',    direction: 'outbound', createdAt: new Date().toISOString(), status: 'completed' },
        { id: 'c4', type: 'meeting', direction: 'outbound', createdAt: new Date().toISOString(), startTime: new Date().toISOString() },
      ]})
    });
  });

  // SMS
  await page.route(re(`${base}/api/contacts/${contactId}/sms$`), async (route) => {
    if (route.request().method() === 'GET') {
      await log(route, 'SMS LIST');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ threads:[{ id:'t1', to:'+15551234567', last:'Hi', updatedAt:new Date().toISOString() }] }) });
    }
    if (route.request().method() === 'POST') {
      await log(route, 'SMS SEND');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true }) });
    }
    return route.fallback();
  });
  await page.route(re(`${base}/api/contacts/${contactId}/sms/t1$`), async (route) => {
    await log(route, 'SMS THREAD');
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ messages:[
      { id:'m1', direction:'outbound', body:'Hello!', createdAt:new Date().toISOString() },
      { id:'m2', direction:'inbound',  body:'Hey!',   createdAt:new Date().toISOString() },
    ] })});
  });

  // Calls
  await page.route(re(`${base}/api/contacts/${contactId}/calls$`), async (route) => {
    if (route.request().method() === 'GET') {
      await log(route, 'CALLS LIST');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ items:[
        { id:'k1', to:'+15551234567', direction:'outbound', status:'completed', duration:'120', createdAt:new Date().toISOString() }
      ] })});
    }
    if (route.request().method() === 'POST') {
      await log(route, 'CALL START');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, sid:'CA123' }) });
    }
    return route.fallback();
  });

  // Emails
  await page.route(re(`${base}/api/contacts/${contactId}/emails$`), async (route) => {
    if (route.request().method() === 'GET') {
      await log(route, 'EMAILS LIST');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ items:[
        { id:'e1', subject:'Welcome', body:'<p>Hi there</p>', direction:'outbound', createdAt:new Date().toISOString() }
      ] })});
    }
    if (route.request().method() === 'POST') {
      await log(route, 'EMAIL SEND');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true }) });
    }
    return route.fallback();
  });

  // Meetings
  await page.route(re(`${base}/api/contacts/${contactId}/meetings$`), async (route) => {
    if (route.request().method() === 'GET') {
      await log(route, 'MEETINGS LIST');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ items:[
        { id:'mt1', meetingUrl:'https://meet.example/abc', startTime:new Date().toISOString(), endTime:new Date(Date.now()+30*60_000).toISOString(), createdAt:new Date().toISOString() }
      ] })});
    }
    if (route.request().method() === 'POST') {
      await log(route, 'MEETING CREATE');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, id:'mt2' }) });
    }
    return route.fallback();
  });

  // Booking link sender
  await page.route(re(`${base}/api/contacts/${contactId}/send-booking-link$`), async (route) => {
    if (route.request().method() === 'POST') {
      await log(route, 'BOOKING LINK');
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, sent:true }) });
    }
    return route.fallback();
  });
}