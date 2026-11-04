import express from 'express';
import UploadController from '../controllers/uploadController.js';
import authMiddleware from '../../../middleware/authMiddleware.js';

const router = express.Router();

// Upload file (multipart/form-data)
router.post('/uploads', authMiddleware(['physician', 'admin', 'developer']), UploadController.handleUpload, UploadController.upload);

// Get user's uploads
router.get('/uploads', authMiddleware(['physician', 'admin', 'developer']), UploadController.getUploads);

// Get specific upload by ID
router.get('/uploads/:id', authMiddleware(['physician', 'admin', 'developer']), UploadController.getUploadById);

// Delete upload
router.delete('/uploads/:id', authMiddleware(['physician', 'admin', 'developer']), UploadController.deleteUpload);

export default router;
