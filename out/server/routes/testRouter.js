import { Router } from 'express';
const router = Router();
// Simple DELETE route for testing
router.delete('/simple-delete', (req, res) => {
    console.log('🧪 [TEST ROUTER] Simple DELETE route works!');
    res.json({
        success: true,
        message: 'DELETE method working in test router',
        method: req.method,
        url: req.originalUrl
    });
});
// Also test other methods
router.get('/simple-get', (req, res) => {
    console.log('🧪 [TEST ROUTER] Simple GET route works!');
    res.json({
        success: true,
        message: 'GET method working in test router',
        method: req.method
    });
});
console.log('🔍 [TEST ROUTER] Test router loaded with DELETE and GET routes');
export default router;
