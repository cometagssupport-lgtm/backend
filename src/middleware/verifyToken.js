import jwt from 'jsonwebtoken';

/**
 * verifyToken — validates the JWT Bearer token on every protected user route.
 * Attaches decoded payload (userId, email, role) to req.user.
 */
export const verifyToken = (req, res, next) => {
  try {
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
    req.user = decoded; // { userId, email, role, iat, exp }
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
