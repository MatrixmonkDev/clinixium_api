import express from 'express';
import PhysicianAuthController from '../controllers/physicianAuthController.js';
import {
  validate,
  registerSchema,
  loginSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
} from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// Register
router.post('/register', validate(registerSchema), PhysicianAuthController.register);

// Login
router.post('/login', validate(loginSchema), PhysicianAuthController.login);

// Verify 2FA
router.post('/2fa/verify', authMiddleware(['physician']), validate(twoFactorVerifySchema), PhysicianAuthController.verifyTwoFactor);

// Setup 2FA
router.post('/2fa/setup', authMiddleware(['physician']), PhysicianAuthController.setupTwoFactor);

// Confirm 2FA
router.post('/2fa/confirm', authMiddleware(['physician']), validate(twoFactorSetupSchema), PhysicianAuthController.confirmTwoFactor);

// Disable 2FA
router.post('/2fa/disable', authMiddleware(['physician']), PhysicianAuthController.disableTwoFactor);

// ============ ONBOARDING ============

// Get onboarding progress
router.get('/onboarding/progress', authMiddleware(['physician']), PhysicianAuthController.getOnboardingProgress);

// Step 1: Contact Info
router.post('/onboarding/step1', authMiddleware(['physician']), validate(onboardingStep1Schema), PhysicianAuthController.completeStep1);

// Step 2: Professional Details
router.post('/onboarding/step2', authMiddleware(['physician']), PhysicianAuthController.completeStep2);

// Step 3: Hospital Affiliation
router.post('/onboarding/step3', authMiddleware(['physician']), validate(onboardingStep3Schema), PhysicianAuthController.completeStep3);

// Step 4: NPI Verification
router.post('/onboarding/step4', authMiddleware(['physician']), validate(onboardingStep4Schema), PhysicianAuthController.completeStep4);

// Step 5: Identity Verification
router.post('/onboarding/step5', authMiddleware(['physician']), validate(onboardingStep5Schema), PhysicianAuthController.completeStep5);

// Step 6: Compliance
router.post('/onboarding/step6', authMiddleware(['physician']), validate(onboardingStep6Schema), PhysicianAuthController.completeStep6);

export default router;
