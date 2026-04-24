import { pool } from "../../db.js";

export const gamesHandler = async (userId) => {
  try {
    if (!userId) {
      return {
        statusCode: 400,
        message: "userId is required",
        data: null,
      };
    }

    // 1️⃣ Fetch wallet
    const walletRes = await pool.query(
      `SELECT 
        "userLevel",
        "deposits",
        "lastActivatedAt",
        "freeTrailCount",
        "freeTrailActivationTime",
        "adminWallet"
       FROM users.wallets
       WHERE "userId" = $1`,
      [userId]
    );

    if (walletRes.rows.length === 0) {
      return {
        statusCode: 404,
        message: "Wallet not found",
        data: null,
      };
    }

    const wallet = walletRes.rows[0];

    const deposits = Number(wallet.deposits || 0) + Number(wallet.adminWallet || 0);
    let currectLevel = wallet.userLevel || null;

    const activationTime = wallet.lastActivatedAt
      ? Number(wallet.lastActivatedAt)
      : null;

    const freeTrailActivationTime = wallet.freeTrailActivationTime
      ? Number(wallet.freeTrailActivationTime)
      : null;

    const freeTrailCount = Number(wallet.freeTrailCount || 0);
    const isFreeTrailSubcraibed = freeTrailCount < 2;

    // 2️⃣ Level ranges
    const levelRanges = {
      Level1: { min: 30, max: 1500 },
      Level2: { min: 1501, max: 3500 },
      Level3: { min: 3501, max: 6000 },
      Level4: { min: 6001, max: 9000 },
    };

    const levelOrder = {
      Level1: 1,
      Level2: 2,
      Level3: 3,
      Level4: 4,
    };

    // 3️⃣ Find eligible level
    let elegibleLevel = null;

    for (const level in levelRanges) {
      if (deposits >= levelRanges[level].min) {
        elegibleLevel = level;
      }
    }

    // 4️⃣ 🔥 AUTO UPGRADE LOGIC
    if (
      elegibleLevel &&
      (!currectLevel ||
        levelOrder[elegibleLevel] > (levelOrder[currectLevel] || 0))
    ) {
      await pool.query(
        `UPDATE users.wallets
         SET "userLevel" = $1,
         "lastActivatedAt" = $2
         WHERE "userId" = $3`,
        [elegibleLevel, null, userId]
      );

      currectLevel = elegibleLevel; // update response
    }

    // 5️⃣ Game toggle
    const masterRes = await pool.query(
      `SELECT "isGameEnabled" FROM admin.master LIMIT 1`
    );

    const isGameEnabled = masterRes.rows[0]?.isGameEnabled || false;

    // ✅ Response
    return {
      statusCode: 200,
      message: "success",
      data: {
        isFreeTrailSubcraibed,
        currectLevel,
        elegibleLevel,
        activationTime,
        freeTrailActivationTime,
        isGameEnabled,
      },
    };

  } catch (error) {
    console.error("Games Handler Error:", error);
    return {
      statusCode: 500,
      message: "failed",
      data: null,
    };
  }
};