// src/controllers/activateGameController.js
import { pool } from '../db.js';
import { roundToTwoDecimals } from "../utils/math.js";
export const activateGame = async (req, res) => {
  const { userId } = req.body;
  if (!userId)
    return res.status(400).json({ statusCode: 400, message: "userId is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch wallet
    const walletRes = await client.query(
      `SELECT "deposits","userLevel","lastActivatedAt","userTodaysCommission"
       FROM users.wallets WHERE "userId" = $1 FOR UPDATE`,
      [userId]
    );

    if (walletRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Wallet not found" });
    }

    const wallet = walletRes.rows[0];
    const userLevel = wallet.userLevel;
    // 🆕 Direct invite eligibility check
    const inviteRules = {
      Level1: 0,
      Level2: 3,
      Level3: 10,
      Level4: 20,
    };

    // Fetch firstGen
    const genRes = await client.query(
      `SELECT "firstGen" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    const firstGen = genRes.rows[0]?.firstGen || [];
    const directInvitesCount = firstGen.length;

    // Required invites for this level
    const requiredInvites = inviteRules[userLevel] ?? 0;

    // ❌ Block activation if not enough invites
    if (directInvitesCount < requiredInvites) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        statusCode: 400,
        message: `You need at least ${requiredInvites} direct invites to activate ${userLevel}.`,
      });
    }
    const purchaseAmount = Number(wallet.deposits || 0);
    const lastActivatedAt = wallet.lastActivatedAt ? Number(wallet.lastActivatedAt) : null;

    if (!purchaseAmount || !userLevel) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User has not purchased any level" });
    }

    // 2️⃣ 24 Hour Cooldown
    if (lastActivatedAt) {
      const last = new Date(lastActivatedAt);
      const now = new Date();
      const diff = (now - last) / (1000 * 60 * 60);
      if (diff < 24) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Please wait ${(24 - diff).toFixed(1)} more hours before next activation.`,
        });
      }
    }

    // 3️⃣ Level Commission %
    const levelRates = { free: 0, Level1: 1.2, Level2: 1.5, Level3: 1.8, Level4: 2.4 };
    const levelRate = levelRates[userLevel];
    if (levelRate === undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid userLevel" });
    }

    const totalCommission = roundToTwoDecimals((purchaseAmount * levelRate) / 100);

    // 4️⃣ Fetch user → get referral chain
    const meRes = await client.query(
      `SELECT "refferedCode","email" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    const senderEmail = meRes.rows[0]?.email || null;
    let currentCode = meRes.rows[0]?.refferedCode || null;
    const uplines = [];

    const getByReferralCode = `
      SELECT "userId","email","refferedCode","refferalCode"
      FROM users.userDetails
      WHERE "refferalCode" = $1
      LIMIT 1;
    `;

    for (let gen = 1; gen <= 5; gen++) {
      if (!currentCode) break;
      const ref = await client.query(getByReferralCode, [currentCode]);
      if (ref.rowCount === 0) break;

      const user = ref.rows[0];
      uplines.push({ gen, userId: Number(user.userId), email: user.email });
      currentCode = user.refferedCode || null;
    }

    // 5️⃣ Gen commissions
    const genPercents = { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2 };
    const genBonuses = {};

    uplines.forEach(up => {
      genBonuses[up.gen] = roundToTwoDecimals((totalCommission * genPercents[up.gen]) / 100);
    });

    // User gets full base commission (only direct game earnings)
    const userShare = totalCommission;

    // 6️⃣ Update user wallet (earnings, totalCommission, today's commission)
    const nowTimestamp = Date.now();

    await client.query(
      `UPDATE users.wallets
       SET 
         "earnings" = COALESCE("earnings", 0) + $1,
         "totalCommission" = COALESCE("totalCommission", 0) + $1,
         "userTodaysCommission" = $1,
         "lastActivatedAt" = $3
       WHERE "userId" = $2`,
      [userShare, userId, nowTimestamp]
    );

    // 7️⃣ Insert user’s own commission into rewards table
    await client.query(
      `INSERT INTO users.rewards
       ("receiverUserId","receiverEmail","senderUserId","commission","senderEmail")
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, senderEmail, userId, userShare, senderEmail]
    );

    // 8️⃣ Distribute generation commissions + insert reward history
    for (const up of uplines) {
      const bonus = genBonuses[up.gen];
      if (bonus <= 0) continue;

      // 🔥 Map generation → column
      let genColumn = "";
      if (up.gen === 1) genColumn = `"firstGenCommission"`;
      else if (up.gen === 2) genColumn = `"secondGenCommission"`;
      else if (up.gen === 3) genColumn = `"thirdGenCommission"`;
      else if (up.gen === 4) genColumn = `"fourthGenCommission"`;
      else if (up.gen === 5) genColumn = `"fifthGenCommission"`;

      const update = await client.query(
        `UPDATE users.wallets
     SET 
       "earnings" = COALESCE("earnings", 0) + $1,
       "totalCommission" = COALESCE("totalCommission", 0) + $1,
       ${genColumn} = COALESCE(${genColumn}, 0) + $1
     WHERE "userId" = $2
     RETURNING "userId"`,
        [bonus, up.userId]
      );

      if (update.rowCount > 0) {
        await client.query(
          `INSERT INTO users.rewards
       ("receiverUserId","receiverEmail","senderUserId","commission","senderEmail")
       VALUES ($1,$2,$3,$4,$5)`,
          [up.userId, up.email, userId, bonus, senderEmail]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "Game activated successfully",
      data: {
        userId,
        userLevel,
        purchaseAmount,
        totalCommission,
        userShare,
        genBonuses,
        uplines,
        userTodaysCommission: userShare,
        lastActivatedAt: nowTimestamp,
        nextActivation: "After 24 hours",
      },
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ActivateGame Error:", err);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  } finally {
    client.release();
  }
};
