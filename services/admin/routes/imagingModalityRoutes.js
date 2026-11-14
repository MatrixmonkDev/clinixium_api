import express from 'express';
import ImagingModalityController from '../controllers/ImagingModalityController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/imaging-modalities', authMiddleware(['admin']), ImagingModalityController.getAll);
router.get('/imaging-modalities/:id', authMiddleware(['admin']), ImagingModalityController.getById);
router.post('/imaging-modalities', authMiddleware(['admin']), ImagingModalityController.create);
router.put('/imaging-modalities/:id', authMiddleware(['admin']), ImagingModalityController.update);
router.delete('/imaging-modalities/:id', authMiddleware(['admin']), ImagingModalityController.delete);
router.patch('/imaging-modalities/:id/disable', authMiddleware(['admin']), ImagingModalityController.disable);
router.patch('/imaging-modalities/:id/enable', authMiddleware(['admin']), ImagingModalityController.enable);

export default router;
