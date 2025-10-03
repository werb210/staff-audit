// Stub file for application detail router
import { Router } from 'express';
const router = Router();

// TODO: implement application detail logic
router.get('/application-detail/:id', (req, res) => {
  res.json({ status: 'ok', message: 'Application detail stub', id: req.params.id });
});

export default router;