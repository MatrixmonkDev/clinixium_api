import express from 'express';
import PhysicianController from '../controllers/physicianController.js';
import { validate, updateProfileSchema, changePasswordSchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// Get profile (protected - physicians only)
router.get('/profile', authMiddleware(['physician']), PhysicianController.getProfile);

// Update profile (protected - physicians only)
router.put('/profile', authMiddleware(['physician']), validate(updateProfileSchema), PhysicianController.updateProfile);

// Change password (protected - physicians only)
router.post('/change-password', authMiddleware(['physician']), validate(changePasswordSchema), PhysicianController.changePassword);

// Get login history (protected - physicians only)
router.get('/login-history', authMiddleware(['physician']), PhysicianController.getLoginHistory);

export default router;
