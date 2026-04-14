import { pool } from "../../db.js";
import { userQueries } from "../../helpers/queries.js";

export const handleTaskManagerScreen = async (userId) => {
  try {
    // 1️⃣ Fetch firstGen subordinates for the user
    const genResult = await pool.query(
      `SELECT "firstGen" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    if (genResult.rows.length === 0) {
      return {
        statusCode: 404,
        message: "User not found",
        data: null,
      };
    }

    const firstGen = genResult.rows[0].firstGen || [];

    // 2️⃣ Count subordinates with deposits >= 30
    let validCount = 0;
    if (firstGen.length > 0) {
      const validRes = await pool.query(
        `SELECT COUNT(*) FROM users.wallets WHERE "userId" = ANY($1::bigint[]) AND "deposits" >= 30`,
        [firstGen]
      );
      validCount = parseInt(validRes.rows[0].count);
    }

    // 3️⃣ Fetch current claimedTasks
    const walletRes = await pool.query(
      `SELECT "claimedTasks" FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    const claimedTasks = walletRes.rows.length > 0 ? walletRes.rows[0].claimedTasks : 0;

    return {
      statusCode: 200,
      message: "success",
      data: {
        valid: validCount,
        claimedTasks: claimedTasks,
      },
    };
  } catch (error) {
    console.error("Task Manager Screen Handler Error:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    };
  }
};
