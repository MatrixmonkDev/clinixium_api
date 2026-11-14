import express from 'express';
import DeveloperAuthController from '../controllers/developerAuthController.js';
import { validate, loginSchema, staffRegisterSchema, twoFactorSetupSchema, twoFactorVerifySchema, resendVerificationEmailSchema, developerOnboardingStep1Schema, developerOnboardingStep2Schema, developerOnboardingStep3Schema, developerOnboardingStep4Schema, developerOnboardingStep5Schema, developerOnboardingStep6Schema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', validate(staffRegisterSchema), DeveloperAuthController.register);
router.post('/login', validate(loginSchema), DeveloperAuthController.login);

// Email verification endpoints
router.get('/verify-email', DeveloperAuthController.verifyEmail);
router.post('/resend-verification-email', validate(resendVerificationEmailSchema), DeveloperAuthController.resendVerificationEmail);

// Onboarding endpoints
router.post('/onboarding/step1', authMiddleware(['developer']), validate(developerOnboardingStep1Schema), DeveloperAuthController.completeOnboardingStep1);
router.post('/onboarding/step2', authMiddleware(['developer']), validate(developerOnboardingStep2Schema), DeveloperAuthController.completeOnboardingStep2);
router.post('/onboarding/step3', authMiddleware(['developer']), validate(developerOnboardingStep3Schema), DeveloperAuthController.completeOnboardingStep3);
router.post('/onboarding/step4', authMiddleware(['developer']), validate(developerOnboardingStep4Schema), DeveloperAuthController.completeOnboardingStep4);
router.post('/onboarding/step5', authMiddleware(['developer']), validate(developerOnboardingStep5Schema), DeveloperAuthController.completeOnboardingStep5);
router.post('/onboarding/step6', authMiddleware(['developer']), validate(developerOnboardingStep6Schema), DeveloperAuthController.completeOnboardingStep6);

// Onboarding data endpoints
router.get('/onboarding/data', authMiddleware(['developer']), DeveloperAuthController.getOnboardingData);
router.get('/onboarding/progress', authMiddleware(['developer']), DeveloperAuthController.getOnboardingProgress);

// 2FA endpoints
router.post('/2fa/setup', authMiddleware(['developer']), validate(twoFactorSetupSchema), DeveloperAuthController.setupTwoFactor);
router.post('/2fa/confirm', authMiddleware(['developer']), validate(twoFactorSetupSchema), DeveloperAuthController.confirmTwoFactor);
router.post('/2fa/verify', authMiddleware(['developer']), validate(twoFactorVerifySchema), DeveloperAuthController.verifyTwoFactor);
router.post('/2fa/disable', authMiddleware(['developer']), DeveloperAuthController.disableTwoFactor);

export default router;
