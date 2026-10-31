import express from 'express';
import AuthController from '../controllers/authController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authMiddleware(), AuthController.logout);

export default router;
