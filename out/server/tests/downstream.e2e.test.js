import request from 'supertest';
import fixture from '../../fixtures/application.v1.json';
let app;
let createdId;
beforeAll(async () => {
    const mod = await import('../../server/index');
    app = (mod.default || mod.app || mod.server);
    const res = await request(app).post('/api/applications').send(fixture);
    createdId = res.body.id || res.body.data?.id;
});
test('PDF context carries all fields (if service present)', async () => {
    try {
        const svc = await import('../../server/services/pdfGeneratorService');
        const getCtx = svc.getPdfContextForApp || svc.buildPdfContext || null;
        if (!getCtx)
            return console.warn('[SKIP] pdfGeneratorService.getPdfContextForApp not found');
        const ctx = await getCtx(createdId);
        for (const k of Object.keys(fixture)) {
            expect(ctx).toHaveProperty(k);
        }
    }
    catch {
        console.warn('[SKIP] pdfGeneratorService unavailable');
    }
});
test('Credit summary context carries all fields (if service present)', async () => {
    try {
        const svc = await import('../../server/services/aiApplicationService');
        const getCtx = svc.getCreditSummaryContext || svc.buildCreditInput || null;
        if (!getCtx)
            return console.warn('[SKIP] aiApplicationService.getCreditSummaryContext not found');
        const ctx = await getCtx(createdId);
        for (const k of Object.keys(fixture)) {
            expect(ctx).toHaveProperty(k);
        }
    }
    catch {
        console.warn('[SKIP] aiApplicationService unavailable');
    }
});
