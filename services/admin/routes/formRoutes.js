import express from 'express';
import FormTemplateController from '../controllers/FormTemplateController.js';
import FormFieldController from '../controllers/FormFieldController.js';
import { validate, formTemplateCreateSchema, formTemplateUpdateSchema, formFieldCreateSchema, formFieldUpdateSchema, formFieldReorderSchema, formAssignCategoriesSchema, formApprovalSchema, formRequestCorrectionSchema } from '../../../utils/validators.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// Form Template CRUD
router.post('/templates', authMiddleware(['admin']), validate(formTemplateCreateSchema), FormTemplateController.create);
router.get('/templates', authMiddleware(['admin']), FormTemplateController.getAll);
router.get('/templates/pending', authMiddleware(['admin']), FormTemplateController.getPendingApprovals);
router.get('/templates/multiple-versions', authMiddleware(['admin']), FormTemplateController.getFormsWithMultipleVersions);
router.get('/templates/:id', authMiddleware(['admin']), FormTemplateController.getById);
router.put('/templates/:id', authMiddleware(['admin']), validate(formTemplateUpdateSchema), FormTemplateController.update);
router.delete('/templates/:id', authMiddleware(['admin']), FormTemplateController.delete);
router.post('/templates/:id/archive', authMiddleware(['admin']), FormTemplateController.archive);
router.post('/templates/:id/restore', authMiddleware(['admin']), FormTemplateController.restore);

// Category Assignment
router.post('/templates/:id/categories', authMiddleware(['admin']), validate(formAssignCategoriesSchema), FormTemplateController.assignCategories);
router.delete('/templates/:id/categories/:categoryId', authMiddleware(['admin']), FormTemplateController.removeCategory);
router.get('/templates/:id/categories', authMiddleware(['admin']), FormTemplateController.getCategories);

// Approval Workflow
router.post('/templates/:id/approve', authMiddleware(['admin']), FormTemplateController.approve);
router.post('/templates/:id/reject', authMiddleware(['admin']), validate(formApprovalSchema), FormTemplateController.reject);
router.post('/templates/:id/request-correction', authMiddleware(['admin']), validate(formRequestCorrectionSchema), FormTemplateController.requestCorrection);

// Version History
router.get('/templates/:id/versions', authMiddleware(['admin']), FormTemplateController.getVersionHistory);

// Field Management
router.post('/templates/:id/fields', authMiddleware(['admin']), validate(formFieldCreateSchema), FormFieldController.create);
router.put('/fields/:id', authMiddleware(['admin']), validate(formFieldUpdateSchema), FormFieldController.update);
router.delete('/fields/:id', authMiddleware(['admin']), FormFieldController.delete);
router.put('/templates/:id/fields/reorder', authMiddleware(['admin']), validate(formFieldReorderSchema), FormFieldController.reorder);
router.get('/fields/:id', authMiddleware(['admin']), FormFieldController.getById);

export default router;
