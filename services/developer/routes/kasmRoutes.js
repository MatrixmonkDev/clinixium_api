import express from 'express';
import KasmController from '../controllers/KasmController.js';
import { validate, kasmTestSessionSchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// Test Kasm API connection
router.get('/test-connection', authMiddleware(['developer']), KasmController.testConnection);

// Test workspace session creation
router.post('/test-session', authMiddleware(['developer']), validate(kasmTestSessionSchema), KasmController.testSession);

export default router;
