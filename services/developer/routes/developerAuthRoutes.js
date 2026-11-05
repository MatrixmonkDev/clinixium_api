import express from 'express';
import DeveloperAuthController from '../controllers/developerAuthController.js';
import { validate, loginSchema, staffRegisterSchema, twoFactorSetupSchema, twoFactorVerifySchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', validate(staffRegisterSchema), DeveloperAuthController.register);
router.post('/login', validate(loginSchema), DeveloperAuthController.login);

// 2FA endpoints
router.post('/2fa/setup', authMiddleware(['developer']), DeveloperAuthController.setupTwoFactor);
router.post('/2fa/confirm', authMiddleware(['developer']), validate(twoFactorSetupSchema), DeveloperAuthController.confirmTwoFactor);
router.post('/2fa/verify', authMiddleware(['developer']), validate(twoFactorVerifySchema), DeveloperAuthController.verifyTwoFactor);
router.post('/2fa/disable', authMiddleware(['developer']), DeveloperAuthController.disableTwoFactor);

export default router;
