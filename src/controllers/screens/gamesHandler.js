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
        "adminWallet",

        -- 🔥 Level activation timestamps
        "firstLevelActivatedTime",
        "secondLevelActivatedTime",
        "thirdLevelActivatedTime",
        "fourthLevelActivatedTime"

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

    const deposits =
      Number(wallet.deposits || 0) + Number(wallet.adminWallet || 0);

    let dbLevel = wallet.userLevel || null;

    const activationTime = wallet.lastActivatedAt
      ? Number(wallet.lastActivatedAt)
      : null;

    const freeTrailActivationTime = wallet.freeTrailActivationTime
      ? Number(wallet.freeTrailActivationTime)
      : null;

    const freeTrailCount = Number(wallet.freeTrailCount || 0);

    // ✅ true means user still has free trials left
    const isFreeTrailSubcraibed = freeTrailCount < 2;

    // 2️⃣ Level configs
    const levels = ["Level1", "Level2", "Level3", "Level4"];

    const levelRanges = {
      Level1: { min: 30 },
      Level2: { min: 1501 },
      Level3: { min: 3501 },
      Level4: { min: 6001 },
    };

    const inviteRules = {
      Level1: 0,
      Level2: 3,
      Level3: 10,
      Level4: 20,
    };

    const levelOrder = {
      Level1: 1,
      Level2: 2,
      Level3: 3,
      Level4: 4,
    };

    // 3️⃣ Eligible level (money only)
    let elegibleLevel = null;

    for (const level of levels) {
      if (deposits >= levelRanges[level].min) {
        elegibleLevel = level;
      }
    }

    // 4️⃣ Get direct invites
    const genRes = await pool.query(
      `SELECT "firstGen"
       FROM users.userDetails
       WHERE "userId" = $1`,
      [userId]
    );

    const firstGen = genRes.rows[0]?.firstGen || [];
    const directInvitesCount = firstGen.length;

    // 5️⃣ Calculate current level (money + invites)
    let calculatedLevel = null;

    for (const level of levels) {
      if (
        deposits >= levelRanges[level].min &&
        directInvitesCount >= inviteRules[level]
      ) {
        calculatedLevel = level;
      }
    }

    // 6️⃣ Upgrade only (never downgrade)
    if (
      calculatedLevel &&
      (!dbLevel ||
        levelOrder[calculatedLevel] > (levelOrder[dbLevel] || 0))
    ) {
      await pool.query(
        `UPDATE users.wallets
         SET "userLevel" = $1
         WHERE "userId" = $2`,
        [calculatedLevel, userId]
      );

      dbLevel = calculatedLevel;
    }

    // 🔥 Level → activation timestamp mapping
    const levelTimeColumns = {
      Level1: "firstLevelActivatedTime",
      Level2: "secondLevelActivatedTime",
      Level3: "thirdLevelActivatedTime",
      Level4: "fourthLevelActivatedTime",
    };

    // 🔥 Get current level activation time
    const levelTimeColumn = levelTimeColumns[dbLevel];

    const GamelevelActivatedTime = levelTimeColumn
      ? wallet[levelTimeColumn]
      : null;

    // 7️⃣ Game toggle
    const masterRes = await pool.query(
      `SELECT "isGameEnabled"
       FROM admin.master
       LIMIT 1`
    );

    const isGameEnabled =
      masterRes.rows[0]?.isGameEnabled || false;

    // ✅ Final Response
    return {
      statusCode: 200,
      message: "success",
      data: {
        isFreeTrailSubcraibed,
        currectLevel: dbLevel,
        elegibleLevel,
        activationTime,
        freeTrailActivationTime,
        GamelevelActivatedTime, // 🔥 NEW FIELD
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