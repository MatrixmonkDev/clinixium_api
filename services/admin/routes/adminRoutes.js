import express from 'express';
import AdminController from '../controllers/adminController.js';
import { validate, simpleChangePasswordSchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', authMiddleware(['admin']), AdminController.getProfile);
router.put('/profile', authMiddleware(['admin']), AdminController.updateProfile);
router.post('/change-password', authMiddleware(['admin']), validate(simpleChangePasswordSchema), AdminController.changePassword);
router.get('/login-history', authMiddleware(['admin']), AdminController.getLoginHistory);

export default router;
