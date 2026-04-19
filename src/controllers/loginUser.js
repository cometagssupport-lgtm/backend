import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";

export const loginUser = async (req, res) => {
  const { email, password, userId } = req.body;

  // Basic validation
  if (!password) {
    return res.status(400).json({
      statusCode: 400,
      message: "Password is required",
      data: null,
    });
  }
  if (!email && !userId) {
    return res.status(400).json({
      statusCode: 400,
      message: "Either email or userId is required to check user status",
      data: null,
    });
  }

  try {
    // 1️⃣ Fetch user from DB
    let userResult;
    if (email) {
      userResult = await pool.query(userQueries.getUserByEmail, [email]);
    } else if (userId) {
      userResult = await pool.query(userQueries.getUserById, [userId]);
    }

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User Not Found",
        data: null,
      });
    }

    const user = userResult.rows[0];

    // 2️⃣ Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid email or password",
        data: null,
      });
    }

    // 3️⃣ Check if user is active
    if (!user.isActiveUser) {
      return res.status(400).json({
        statusCode: 400,
        message: "Please contact support team",
        data: null,
      });
    }

    // 3️⃣ Check if user is verify
    if (!user.isVerified) {
      return res.status(400).json({
        statusCode: 400,
        message: "Account is not Verified , Please verify your account",
        data: null,
      });
    }

    // ✅ Success
    return res.status(200).json({
      statusCode: 200,
      message: "success",
      data: {
        userId: user.userId,
        isActiveUser: user.isActiveUser,
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
