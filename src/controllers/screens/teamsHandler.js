import { pool } from "../../db.js";
import { userQueries } from "../../helpers/queries.js";

export const getTeamsData = async (userId, isAdmin) => {
  try {
    // 1️⃣ Get user generations
    const genRes = await pool.query(userQueries.getUserGenerations, [userId]);
    const genCommissionsRes = await pool.query(userQueries.getGenCommissions, [userId]);
    if (genRes.rows.length === 0) return { message: "User not found" };

    const { firstGen, secondGen, thirdGen, fourthGen, fifthGen, userName } = genRes.rows[0];
    const { firstGenCommission, secondGenCommission, thirdGenCommission, fourthGenCommission, fifthGenCommission } = genCommissionsRes?.rows[0];
    const allGenUserIds = [
      ...(firstGen || []),
      ...(secondGen || []),
      ...(thirdGen || []),
      ...(fourthGen || []),
      ...(fifthGen || []),
    ];

    if (allGenUserIds.length === 0) {
      return {
        statusCode: 200,
        message: "success",
        data: {
          username: userName,
          totalDownlines: 0,
          totalPromationComission: 0,
          teamRecharge: 0,
          teamWitdrawls: 0,
          genOne: { reffered: 0, valid: 0, commission: 0, teamRecharge: 0 },
          genTwo: { reffered: 0, valid: 0, commission: 0, teamRecharge: 0 },
          genThree: { reffered: 0, valid: 0, commission: 0, teamRecharge: 0 },
          genFour: { reffered: 0, valid: 0, commission: 0, teamRecharge: 0 },
          genFive: { reffered: 0, valid: 0, commission: 0, teamRecharge: 0 },
        },
      };
    }

    // 2️⃣ Fetch generation users
    const genUsersRes = await pool.query(userQueries.getUsersByIds, [allGenUserIds]);
    const genUsers = genUsersRes.rows;

    // 3️⃣ Fetch wallets
    const walletRes = await pool.query(userQueries.getWalletsByUserIds, [allGenUserIds]);
    const wallets = walletRes.rows;

    // 4️⃣ Fetch withdrawals
    const withdrawRes = await pool.query(userQueries.getWithdrawalsByUserIds, [allGenUserIds]);
    const withdrawals = withdrawRes.rows;

    // 🔥 Rule updates start here

    // ➤ totalDownlines = only FIRST GENERATION users who deposited
    const totalDownlines = Number((firstGen || []).length) + Number((secondGen || []).length) + Number((thirdGen || []).length) + Number((fourthGen || []).length) + Number((fifthGen || []).length)

    // ➤ Sum commissions safely
    const totalPromationComission = wallets.reduce(
      (acc, w) => acc + Number(w.totalCommission || 0),
      0
    );

    // ➤ teamRecharge (exclude free money)
    const teamRecharge = wallets.reduce((acc, w) => {
      let amount = Number(w.deposits || 0);
      if (w.isFreeMoney) amount -= 8;        // remove free claimed amount
      return acc + (amount > 0 ? amount : 0);
    }, 0);


    // ➤ teamWithdrawals
    const teamWitdrawls = withdrawals.reduce(
      (acc, w) => acc + Number(w.amount || 0),
      0
    );

    const validMembers = genUsers.filter(u => u.isDeposited === true).length;

    // 🔹 Individual generation counts
    const getGenStats = (genArray) => {
      const reffered = genArray?.length || 0;
      const valid = genArray?.filter(id => {
        const u = genUsers.find(g => g.userId === id);
        return u?.isDeposited === true;
      }).length || 0;
      return { reffered, valid };
    };
    // 🔹 helper for generation recharge
    const getGenRecharge = (genArray) => {
      return (genArray || []).reduce((acc, id) => {
        const wallet = wallets.find(w => w.userId === id);
        if (!wallet) return acc;

        let amount = Number(wallet.deposits || 0);
        if (wallet.isFreeMoney) amount -= 8;

        return acc + (amount > 0 ? amount : 0);
      }, 0);
    };
    const genOne = getGenStats(firstGen);
    const genTwo = getGenStats(secondGen);
    const genThree = getGenStats(thirdGen);
    const genFour = getGenStats(fourthGen);
    const genFive = getGenStats(fifthGen);

    // 🔥 Admin view
    if (isAdmin) {
      const genUsersDetails = await pool.query(userQueries.getUsersDetailsByIds, [allGenUserIds]);
      const details = genUsersDetails.rows;

      return {
        statusCode: 200,
        message: "success",
        data: {
          username: userName,
          totalDownlines,
          totalPromationComission,
          teamRecharge,
          teamWitdrawls,
          genOne: {
            ...genOne,
            commission: firstGenCommission,
            users: details
              .filter(u => firstGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          },
          genTwo: {
            ...genTwo,
            commission: secondGenCommission,
            users: details
              .filter(u => secondGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          },
          genThree: {
            ...genThree,
            commission: thirdGenCommission,
            users: details
              .filter(u => thirdGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          },
          genFour: {
            ...genFour,
            commission: fourthGenCommission,
            users: details
              .filter(u => fourthGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          },
          genFive: {
            ...genFive,
            commission: fifthGenCommission,
            users: details
              .filter(u => fifthGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          }
        }
      };
    }

    // 🔥 Normal user response
    return {
      statusCode: 200,
      message: "success",
      data: {
        username: userName,
        totalDownlines,
        totalPromationComission,
        teamRecharge,
        teamWitdrawls,
        validMembers,
        genOne: {
          ...genOne,
          commission: Number(firstGenCommission || 0),
          teamRecharge: getGenRecharge(firstGen),
        },

        genTwo: {
          ...genTwo,
          commission: Number(secondGenCommission || 0),
          teamRecharge: getGenRecharge(secondGen),
        },

        genThree: {
          ...genThree,
          commission: Number(thirdGenCommission || 0),
          teamRecharge: getGenRecharge(thirdGen),
        },

        genFour: {
          ...genFour,
          commission: Number(fourthGenCommission || 0),
          teamRecharge: getGenRecharge(fourthGen),
        },

        genFive: {
          ...genFive,
          commission: Number(fifthGenCommission || 0),
          teamRecharge: getGenRecharge(fifthGen),
        }
      },
    };

  } catch (err) {
    console.error("Teams Handler Error:", err);
    return { statusCode: 400, message: "failed", data: null };
  }
};
