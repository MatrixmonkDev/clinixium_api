import express from 'express';
import AIAnnotationExperienceController from '../controllers/AIAnnotationExperienceController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/ai-annotation-experiences', authMiddleware(['admin']), AIAnnotationExperienceController.getAll);
router.get('/ai-annotation-experiences/:id', authMiddleware(['admin']), AIAnnotationExperienceController.getById);
router.post('/ai-annotation-experiences', authMiddleware(['admin']), AIAnnotationExperienceController.create);
router.put('/ai-annotation-experiences/:id', authMiddleware(['admin']), AIAnnotationExperienceController.update);
router.delete('/ai-annotation-experiences/:id', authMiddleware(['admin']), AIAnnotationExperienceController.delete);

export default router;
