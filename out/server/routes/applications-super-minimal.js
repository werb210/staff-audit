import { Router } from 'express';
const router = Router();
// Super minimal test route with no middleware
router.get('/', async (req, res) => {
    console.log('🎯 Super minimal route reached!');
    try {
        const responseData = {
            success: true,
            message: 'Super minimal route working'
        };
        return res.json(responseData);
    }
    catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});
export default router;
