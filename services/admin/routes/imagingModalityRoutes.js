import express from 'express';
import ImagingModalityController from '../controllers/ImagingModalityController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/imaging-modalities', authMiddleware(['admin']), ImagingModalityController.getAll);
router.get('/imaging-modalities/:id', authMiddleware(['admin']), ImagingModalityController.getById);
router.post('/imaging-modalities', authMiddleware(['admin']), ImagingModalityController.create);
router.put('/imaging-modalities/:id', authMiddleware(['admin']), ImagingModalityController.update);
router.delete('/imaging-modalities/:id', authMiddleware(['admin']), ImagingModalityController.delete);

export default router;
