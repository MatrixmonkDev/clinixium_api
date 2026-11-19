import express from 'express';
import FormTemplateController from '../controllers/FormTemplateController.js';
import FormFieldController from '../controllers/FormFieldController.js';
import { validate, formTemplateCreateSchema, formTemplateUpdateSchema, formFieldCreateSchema, formFieldUpdateSchema, formFieldReorderSchema, formAssignCategoriesSchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// Form Template CRUD
router.post('/templates', authMiddleware(['developer']), validate(formTemplateCreateSchema), FormTemplateController.create);
router.get('/templates', authMiddleware(['developer']), FormTemplateController.getAll);
router.get('/templates/:id', authMiddleware(['developer']), FormTemplateController.getById);
router.put('/templates/:id', authMiddleware(['developer']), validate(formTemplateUpdateSchema), FormTemplateController.update);
router.delete('/templates/:id', authMiddleware(['developer']), FormTemplateController.delete);
router.post('/templates/:id/archive', authMiddleware(['developer']), FormTemplateController.archive);
router.post('/templates/:id/restore', authMiddleware(['developer']), FormTemplateController.restore);
router.post('/templates/:id/submit', authMiddleware(['developer']), FormTemplateController.submitForApproval);

// Category Assignment
router.post('/templates/:id/categories', authMiddleware(['developer']), validate(formAssignCategoriesSchema), FormTemplateController.assignCategories);
router.delete('/templates/:id/categories/:categoryId', authMiddleware(['developer']), FormTemplateController.removeCategory);
router.get('/templates/:id/categories', authMiddleware(['developer']), FormTemplateController.getCategories);

// Version History
router.get('/templates/:id/versions', authMiddleware(['developer']), FormTemplateController.getVersionHistory);

// Field Management
router.post('/templates/:id/fields', authMiddleware(['developer']), validate(formFieldCreateSchema), FormFieldController.create);
router.put('/fields/:id', authMiddleware(['developer']), validate(formFieldUpdateSchema), FormFieldController.update);
router.delete('/fields/:id', authMiddleware(['developer']), FormFieldController.delete);
router.put('/templates/:id/fields/reorder', authMiddleware(['developer']), validate(formFieldReorderSchema), FormFieldController.reorder);
router.get('/fields/:id', authMiddleware(['developer']), FormFieldController.getById);

export default router;
