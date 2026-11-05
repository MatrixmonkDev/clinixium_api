import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import UserUpload from '../models/UserUpload.js';
import Joi from 'joi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter - only allow images and documents
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, PDF, and Word documents are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Helper function to map userType from JWT to database format
function mapUserTypeToCode(userType) {
  const mapping = {
    'physician': 'P',
    'admin': 'A',
    'developer': 'D'
  };
  return mapping[userType] || userType;
}

class UploadController {
  static uploadFile = upload.single('file');

  static handleUpload(req, res, next) {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File size exceeds 5MB limit',
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      next();
    });
  }

  static async upload(req, res, next) {
    try {
      const userId = req.user.id;
      const userType = mapUserTypeToCode(req.user.userType); // Convert to 'P', 'A', or 'D'
      const { doc_type_id, description } = req.body;

      // Validate input
      const schema = Joi.object({
        doc_type_id: Joi.number().integer().required(),
        description: Joi.string().allow('', null).optional(),
      });

      const { error, value } = schema.validate({ doc_type_id, description });

      if (error) {
        // Delete uploaded file if validation fails
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      // Store file info in database
      const uploadData = {
        user_id: userId,
        user_type: userType,
        doc_type_id: value.doc_type_id,
        url: `/uploads/${req.file.filename}`,
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        storage_provider: 'local',
        description: value.description ?? null,
      };

      const uploadId = await UserUpload.create(uploadData);

      const fullUrl = `${process.env.BASE_URL}${uploadData.url}`;

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: uploadId,
          url: fullUrl,
          file_name: uploadData.file_name,
          file_size: uploadData.file_size,
          mime_type: uploadData.mime_type,
        },
      });
    } catch (error) {
      // Delete uploaded file if database operation fails
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  static async getUploads(req, res, next) {
    try {
      const userId = req.user.id;
      const userType = mapUserTypeToCode(req.user.userType);

      const uploads = await UserUpload.findByUser(userId, userType);

      // Add full URL to each upload
      const uploadsWithFullUrl = uploads.map(upload => ({
        ...upload,
        url: `${process.env.BASE_URL}${upload.url}`,
      }));

      res.status(200).json({
        success: true,
        data: uploadsWithFullUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUploadById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userType = mapUserTypeToCode(req.user.userType);

      const upload = await UserUpload.findById(id);

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found',
        });
      }

      // Check ownership
      if (upload.user_id !== userId || upload.user_type !== userType) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Add full URL
      upload.url = `${process.env.BASE_URL}${upload.url}`;

      res.status(200).json({
        success: true,
        data: upload,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUpload(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userType = mapUserTypeToCode(req.user.userType);

      const upload = await UserUpload.findById(id);

      if (!upload) {
        return res.status(404).json({
          success: false,
          message: 'Upload not found',
        });
      }

      // Check ownership
      if (upload.user_id !== userId || upload.user_type !== userType) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Delete from database
      await UserUpload.delete(id);

      // Delete physical file
      const filePath = path.join(__dirname, '../../../uploads', path.basename(upload.url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UploadController;
