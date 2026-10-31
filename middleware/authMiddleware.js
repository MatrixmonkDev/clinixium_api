import jwt from 'jsonwebtoken';

const authMiddleware = (allowedUserTypes = null) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
        });
      }

      const token = authHeader.substring(7);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check user type if specified
      if (allowedUserTypes && !allowedUserTypes.includes(decoded.userType)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
        });
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  };
};

export default authMiddleware;
