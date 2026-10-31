import express from 'express';
import AdminAuthController from '../controllers/adminAuthController.js';
import { validate, loginSchema, staffRegisterSchema } from '../../../utils/validators.js';

const router = express.Router();

router.post('/register', validate(staffRegisterSchema), AdminAuthController.register);
router.post('/login', validate(loginSchema), AdminAuthController.login);

export default router;
