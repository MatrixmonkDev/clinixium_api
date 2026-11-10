import express from 'express';
import DeveloperController from '../controllers/developerController.js';
import { validate, simpleChangePasswordSchema, staffUpdateProfileSchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', authMiddleware(['developer']), DeveloperController.getProfile);
router.put('/profile', authMiddleware(['developer']), validate(staffUpdateProfileSchema), DeveloperController.updateProfile);
router.post('/change-password', authMiddleware(['developer']), validate(simpleChangePasswordSchema), DeveloperController.changePassword);
router.get('/login-history', authMiddleware(['developer']), DeveloperController.getLoginHistory);

export default router;
