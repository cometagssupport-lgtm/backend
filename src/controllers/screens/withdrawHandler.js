// src/controllers/screens/withdrawHandler.js
import { pool } from "../../db.js";
import { avengersQueries } from "../../helpers/queries.js";
// export const handleWithdrawScreen = async (userId) => {
//   try {
//     // 1️⃣ Fetch total balance (earnings) from wallets table
//     const walletResult = await pool.query(
//       `SELECT earnings FROM users.wallets WHERE "userId" = $1`,
//       [userId]
//     );

//     let totalBalance = 0;
//     if (walletResult.rows.length > 0) {
//       totalBalance = Number(walletResult.rows[0].earnings) || 0;
//     } else {
//       // Auto-create wallet if not exists
//       await pool.query(
//         `INSERT INTO users.wallets ("userId", deposits, earnings) VALUES ($1, 0, 0)`,
//         [userId]
//       );
//     }

//     // 2️⃣ Fetch walletNetworks from master table
//      const result = await pool.query(avengersQueries.getMasterWalletNetworks);
//     const walletNetworks = result.rows[0];

//     // ✅ Success Response
//     return {
//       statusCode: 200,
//       message: "success",
//       data: {
//         totalBalance,
//         walletNetworks,
//       },
//     };
//   } catch (error) {
//     console.error("Withdraw Screen Handler Error:", error);
//     return {
//       statusCode: 400,
//       message: "failed",
//       data: null,
//     };
//   }
// };
export const handleWithdrawScreen = async (userId) => {
  try {
    // 🧭 1. Fetch total balance (earnings) from wallet
    const walletResult = await pool.query(
      `SELECT earnings FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    const totalRemainingBalance =
      walletResult.rows.length > 0 ? Number(walletResult.rows[0].earnings) : 0;

    // 🧭 2. Fetch latest withdraw address
    const withdrawResult = await pool.query(
      `SELECT "withdrawAddress" 
       FROM users.withdrawals 
       WHERE "userId" = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [userId]
    );

    const withdrawAddress =
      withdrawResult.rows.length && withdrawResult.rows[0].withdrawAddress
        ? withdrawResult.rows[0].withdrawAddress
        : "";

    // 🧭 3. Fetch passcode (to check if passkey is set)
    const userResult = await pool.query(
      `SELECT passcode FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    const passkey = userResult.rows.length > 0 && userResult.rows[0].passcode !== null;

    return {
      statusCode: 200,
      message: "success",
      data: {
        totalRemainingBalance,
        withdrawAddress,
        passkey,
      },
    };
  } catch (error) {
    console.error("Withdrawal Screen Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};