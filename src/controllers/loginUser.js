import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";

// Admin emails — stored server-side ONLY, never sent to client
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

export const loginUser = async (req, res) => {
  const { user, password } = req.body;

  // Basic validation
  if (!password) {
    return res.status(400).json({
      statusCode: 400,
      message: "Password is required",
      data: null,
    });
  }
  if (!user) {
    return res.status(400).json({
      statusCode: 400,
      message: "userId, email, or username is required to login",
      data: null,
    });
  }

  try {
    // 1️⃣ Try to find user by userId → email → username (in that order)
    let userResult;

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

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User Not Found",
        data: null,
      });
    }

    const foundUser = userResult.rows[0];

    // 2️⃣ Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid Credentials",
        data: null,
      });
    }

    // 3️⃣ Check if user is active
    if (!foundUser.isActiveUser) {
      return res.status(400).json({
        statusCode: 400,
        message: "Please contact support team",
        data: null,
      });
    }

    // 4️⃣ Check if user account is verified
    if (!foundUser.isVerified) {
      return res.status(400).json({
        statusCode: 400,
        message: "Account is not Verified, Please verify your account",
        data: null,
      });
    }

    // 5️⃣ Determine role — admin check happens server-side only
    const role = ADMIN_EMAILS.includes(foundUser.email) ? 'admin' : 'user';

    // 6️⃣ Sign JWT — expires in 7 days
    const token = jwt.sign(
      {
        userId: foundUser.userId,
        email: foundUser.email,
        role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ Success — return token and minimal user info
    return res.status(200).json({
      statusCode: 200,
      message: "success",
      data: {
        token,
        userId: foundUser.userId,
        email: foundUser.email,
        role,
        isActiveUser: foundUser.isActiveUser,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
