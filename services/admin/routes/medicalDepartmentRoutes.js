import express from 'express';
import MedicalDepartmentController from '../controllers/MedicalDepartmentController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/medical-departments', authMiddleware(['admin']), MedicalDepartmentController.getAll);
router.get('/medical-departments/:id', authMiddleware(['admin']), MedicalDepartmentController.getById);
router.post('/medical-departments', authMiddleware(['admin']), MedicalDepartmentController.create);
router.put('/medical-departments/:id', authMiddleware(['admin']), MedicalDepartmentController.update);
router.delete('/medical-departments/:id', authMiddleware(['admin']), MedicalDepartmentController.delete);

export default router;
