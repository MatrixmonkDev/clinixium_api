import express from 'express';
import OptionsController from '../controllers/optionsController.js';

const router = express.Router();

// Country codes and timezones (public endpoints)
router.get('/options/countries', OptionsController.getCountries);
router.get('/options/timezones', OptionsController.getTimezones);

// Medical departments and categories (public endpoints)
router.get('/options/departments', OptionsController.getDepartments);
router.get('/options/categories', OptionsController.getCategories);
router.get('/options/categories/sub-specialties', OptionsController.getSubSpecialties);
router.get('/options/categories/department/:departmentId', OptionsController.getCategoriesByDepartment);
router.get('/options/categories/:parentId/children', OptionsController.getCategoryChildren);
router.get('/options/categories/children', OptionsController.getCategoryChildrenByParentIds);

// Practice settings (public endpoint)
router.get('/options/practice-settings', OptionsController.getPracticeSettings);

// Imaging modalities (public endpoint)
router.get('/options/imaging-modalities', OptionsController.getImagingModalities);

// AI annotation experiences (public endpoint)
router.get('/options/ai-experiences', OptionsController.getAIExperiences);

// Document types (public endpoint)
router.get('/options/doc-types', OptionsController.getDocTypes);

export default router;
