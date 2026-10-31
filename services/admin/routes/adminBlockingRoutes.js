import express from 'express';
import AdminBlockingController from '../controllers/adminBlockingController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware(['admin']));

// Get all blocking configurations
router.get('/blocking-config', AdminBlockingController.getBlockingConfigs);

// Get current effective blocking configuration (from cache)
router.get('/blocking-config/current', AdminBlockingController.getCurrentBlockingConfig);

// Get specific blocking configuration
router.get('/blocking-config/:level', AdminBlockingController.getBlockingConfig);

// Create new blocking configuration
router.post('/blocking-config', AdminBlockingController.createBlockingConfig);

// Update blocking configuration
router.put('/blocking-config/:level', AdminBlockingController.updateBlockingConfig);

// Delete blocking configuration
router.delete('/blocking-config/:level', AdminBlockingController.deleteBlockingConfig);

export default router;
