import { pool } from "../../db.js";
import { avengersQueries } from "../../helpers/queries.js";

export const handleHomeScreen = async (userId) => {
  try {
    // 1️⃣ Ensure wallet exists
    await pool.query(avengersQueries.createWalletIfNotExists, [userId]);

    // 2️⃣ Fetch wallet summary
    const walletResult = await pool.query(avengersQueries.getWalletSummary, [userId]);
    const wallet = walletResult.rows[0] || { totalDeposits: 0, totalEarnings: 0 };

    // 3️⃣ Fetch user referral code
    const userResult = await pool.query(avengersQueries.getUserReferralCode, [userId]);
    const user = userResult.rows[0];
    if (!user) throw new Error("User not found");

    // 4️⃣ Fetch master data
    const masterResult = await pool.query(avengersQueries.getMasterDataForHome);
    const master = masterResult.rows[0];
    if (!master) throw new Error("Master data not found");

    // 5️⃣ Build referral link
    const refferalLink = `${process.env.FRONTEND_URL}/register?referral_code=${user.refferalCode}`;

    // ✅ Final response data
    return {
      statusCode: 200,
      message: "success",
      data: {
        totalDeposits: wallet.totalDeposits,
        totalEarnings: wallet.totalEarnings,
        rechargeWallet: Number(wallet.totalDeposits) + Number(wallet.adminWallet),
        refferalLink,
        telegramLinkOne: master.telegramLinkOne,
        refferalCode: user.refferalCode,
        UserName: user.userName,
        email: user.email,
        telegramLinkTwo: master.telegramLinkTwo,
        homeText1: master.homeText1,
        homeText2: master.homeText2
      },
    };
  } catch (error) {
    console.error("Home Screen Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
