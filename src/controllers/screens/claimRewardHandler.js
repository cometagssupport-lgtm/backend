import { pool } from "../../db.js";

const TASK_REQUIREMENTS = {
  1: { count: 5, reward: 20 },
  2: { count: 15, reward: 30 },
  3: { count: 30, reward: 60 },
  4: { count: 40, reward: 100 },
  5: { count: 60, reward: 160 },
  6: { count: 80, reward: 360 },
};

export const handleClaimReward = async (userId, taskNumber) => {
  try {
    const task = TASK_REQUIREMENTS[taskNumber];
    if (!task) {
      return {
        statusCode: 400,
        message: "Invalid task number",
        data: null,
      };
    }

    // 1️⃣ Fetch user's wallet info (claimedTasks and firstGen)
    const walletRes = await pool.query(
      `SELECT "claimedTasks", "earnings" FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    if (walletRes.rows.length === 0) {
      return {
        statusCode: 404,
        message: "User wallet not found",
        data: null,
      };
    }

    const { claimedTasks, earnings } = walletRes.rows[0];

    // 2️⃣ Check if already claimed
    // Assuming sequential claiming: Task 1 must be claimed first, then 2, etc.
    // The requirement says: "claimedTasks is 1 so he cant claim the task 1 rewards"
    // This implies a count. If taskNumber <= claimedTasks, it's already claimed.
    if (taskNumber <= claimedTasks) {
      return {
        statusCode: 400,
        message: "Reward already claimed for this task",
        data: null,
      };
    }

    // Optional: Ensure they claim the next available task (sequential)
    // if (taskNumber !== claimedTasks + 1) {
    //     return {
    //         statusCode: 400,
    //         message: `Please claim Task ${claimedTasks + 1} first`,
    //         data: null,
    //     };
    // }

    // 3️⃣ Verify eligibility (valid subordinates count)
    const genResult = await pool.query(
      `SELECT "firstGen" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );
    const firstGen = genResult.rows[0]?.firstGen || [];

    let validCount = 0;
    if (firstGen.length > 0) {
      const validRes = await pool.query(
        `SELECT COUNT(*) FROM users.wallets WHERE "userId" = ANY($1::bigint[]) AND "deposits" >= 30`,
        [firstGen]
      );
      validCount = parseInt(validRes.rows[0].count);
    }

    if (validCount < task.count) {
      return {
        statusCode: 400,
        message: `Not enough valid subordinates. Required: ${task.count}, Found: ${validCount}`,
        data: null,
      };
    }

    // 4️⃣ Update wallet (add reward to earnings and increment claimedTasks)
    await pool.query(
      `UPDATE users.wallets SET earnings = earnings + $1, "claimedTasks" = $2 WHERE "userId" = $3`,
      [task.reward, taskNumber, userId]
    );

    return {
      statusCode: 200,
      message: "Reward claimed successfully",
      data: null,
    };
  } catch (error) {
    console.error("Claim Reward Handler Error:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    };
  }
};
