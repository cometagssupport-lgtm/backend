import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";

export const checkActiveUser = async (req, res, next) => {
  try {
    const isLoginRoute = req.path === '/login';

    let userResult;

    if (isLoginRoute) {
      // ── LOGIN ROUTE: single `user` field tried as userId → email → username ──
      const { user } = req.body;

      if (!user) {
        return res.status(400).json({
          statusCode: 400,
          message: "userId, email, or username is required to login",
          data: null,
        });
      }

      // Try by userId first
      userResult = await pool.query(userQueries.getUserById, [user]);

      // If not found, try by email
      if (userResult.rows.length === 0) {
        userResult = await pool.query(userQueries.getUserByEmail, [user]);
      }

      // If still not found, try by username
      if (userResult.rows.length === 0) {
        userResult = await pool.query(userQueries.getUserByUserName, [user]);
      }

    } else {
      // ── ALL OTHER ROUTES: accept only email or userId ──
      const { email, userId } = req.body;

      if (!email && !userId) {
        return res.status(400).json({
          statusCode: 400,
          message: "Either email or userId is required",
          data: null,
        });
      }

      if (email) {
        userResult = await pool.query(userQueries.getUserByEmail, [email]);
      } else {
        userResult = await pool.query(userQueries.getUserById, [userId]);
      }
    }

    // Handle no user found
    if (!userResult || userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User not found",
        data: null,
      });
    }

    const user = userResult.rows[0];

    // Check if active
    if (!user.isActiveUser) {
      return res.status(403).json({
        statusCode: 403,
        message: "User inactive, please contact support",
        data: null,
      });
    }

    // ✅ User active — continue to next middleware/controller
    next();
  } catch (error) {
    console.error("User Active Check Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
