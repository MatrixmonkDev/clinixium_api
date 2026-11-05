import express from 'express';
import AdminAuthController from '../controllers/adminAuthController.js';
import { validate, loginSchema, staffRegisterSchema, twoFactorSetupSchema, twoFactorVerifySchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', validate(staffRegisterSchema), AdminAuthController.register);
router.post('/login', validate(loginSchema), AdminAuthController.login);

// 2FA endpoints
router.post('/2fa/setup', authMiddleware(['admin']), AdminAuthController.setupTwoFactor);
router.post('/2fa/confirm', authMiddleware(['admin']), validate(twoFactorSetupSchema), AdminAuthController.confirmTwoFactor);
router.post('/2fa/verify', authMiddleware(['admin']), validate(twoFactorVerifySchema), AdminAuthController.verifyTwoFactor);
router.post('/2fa/disable', authMiddleware(['admin']), AdminAuthController.disableTwoFactor);

export default router;
