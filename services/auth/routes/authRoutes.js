import express from 'express';
import AuthController from '../controllers/authController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authMiddleware(), AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/validate-reset-token', AuthController.validateResetToken);

export default router;
