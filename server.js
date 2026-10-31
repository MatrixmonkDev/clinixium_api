import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import securityMiddleware from './middleware/securityMiddleware.js';
import rateLimiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './services/auth/routes/authRoutes.js';
import physicianRoutes from './services/physicians/routes/physicianRoutes.js';
import physicianAuthRoutes from './services/physicians/routes/physicianAuthRoutes.js';
import adminRoutes from './services/admin/routes/adminRoutes.js';
import adminAuthRoutes from './services/admin/routes/adminAuthRoutes.js';
import adminBlockingRoutes from './services/admin/routes/adminBlockingRoutes.js';
import developerRoutes from './services/developer/routes/developerRoutes.js';
import developerAuthRoutes from './services/developer/routes/developerAuthRoutes.js';
import { testDbConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
securityMiddleware(app);

// Rate limiting
app.use(rateLimiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/physicians/auth', physicianAuthRoutes);
app.use('/api/physicians', physicianRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminBlockingRoutes);
app.use('/api/developer/auth', developerAuthRoutes);
app.use('/api/developer', developerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Clinixium API',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security features enabled`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  await testDbConnection();
});

export default app;
