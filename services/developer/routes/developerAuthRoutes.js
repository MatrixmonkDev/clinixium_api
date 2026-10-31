import express from 'express';
import DeveloperAuthController from '../controllers/developerAuthController.js';
import { validate, loginSchema, staffRegisterSchema } from '../../../utils/validators.js';

const router = express.Router();

router.post('/register', validate(staffRegisterSchema), DeveloperAuthController.register);
router.post('/login', validate(loginSchema), DeveloperAuthController.login);

export default router;
