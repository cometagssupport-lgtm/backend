import jwt from 'jsonwebtoken';

/**
 * verifyAdmin — must be used AFTER verifyToken.
 * Ensures the caller has role === 'admin' in their JWT payload.
 * If you place it on a route by itself (without verifyToken first),
 * it also does a full token parse so it can be used standalone.
 */
export const verifyAdmin = (req, res, next) => {
  try {
    // If verifyToken already ran, req.user is already set — just check role
    if (req.user) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          statusCode: 403,
          message: 'Access denied. Admin privileges required.',
          data: null,
        });
      }
      return next();
    }

    // Standalone usage — parse token ourselves
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Access denied. No token provided.',
        data: null,
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        statusCode: 403,
        message: 'Access denied. Admin privileges required.',
        data: null,
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        statusCode: 401,
        message: 'Token expired. Please login again.',
        data: null,
      });
    }
    return res.status(401).json({
      statusCode: 401,
      message: 'Invalid token.',
      data: null,
    });
  }
};
