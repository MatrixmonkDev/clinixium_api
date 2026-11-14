import express from 'express';
import MedicalCategoryController from '../controllers/MedicalCategoryController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/medical-categories', authMiddleware(['admin']), MedicalCategoryController.getAll);
router.get('/medical-categories/sub-specialties', authMiddleware(['admin']), MedicalCategoryController.getSubSpecialties);
router.get('/medical-categories/department/:departmentId', authMiddleware(['admin']), MedicalCategoryController.getByDepartment);
router.get('/medical-categories/:parentId/children', authMiddleware(['admin']), MedicalCategoryController.getChildren);
router.get('/medical-categories/:id', authMiddleware(['admin']), MedicalCategoryController.getById);
router.post('/medical-categories', authMiddleware(['admin']), MedicalCategoryController.create);
router.put('/medical-categories/:id', authMiddleware(['admin']), MedicalCategoryController.update);
router.delete('/medical-categories/:id', authMiddleware(['admin']), MedicalCategoryController.delete);
router.patch('/medical-categories/:id/disable', authMiddleware(['admin']), MedicalCategoryController.disable);
router.patch('/medical-categories/:id/enable', authMiddleware(['admin']), MedicalCategoryController.enable);

export default router;
