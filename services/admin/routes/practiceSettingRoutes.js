import express from 'express';
import PracticeSettingController from '../controllers/PracticeSettingController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/practice-settings', authMiddleware(['admin']), PracticeSettingController.getAll);
router.get('/practice-settings/:id', authMiddleware(['admin']), PracticeSettingController.getById);
router.post('/practice-settings', authMiddleware(['admin']), PracticeSettingController.create);
router.put('/practice-settings/:id', authMiddleware(['admin']), PracticeSettingController.update);
router.delete('/practice-settings/:id', authMiddleware(['admin']), PracticeSettingController.delete);
router.patch('/practice-settings/:id/disable', authMiddleware(['admin']), PracticeSettingController.disable);
router.patch('/practice-settings/:id/enable', authMiddleware(['admin']), PracticeSettingController.enable);

export default router;
