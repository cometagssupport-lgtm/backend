import { pool } from "../../db.js";

export const updateProfileHandler = async (userId, profile) => {
    try {

        // 1️⃣ Validation
        if (!userId || !profile) {
            return {
                statusCode: 400,
                message: "userId and profile are required",
            };
        }

        // profile must be between 1–9
        if (profile < 1 || profile > 9) {
            return {
                statusCode: 400,
                message: "Invalid profile value (must be 1–9)",
            };
        }

        // 2️⃣ Update query
        const result = await pool.query(
            `UPDATE users.userDetails
       SET "profilePic" = $1
       WHERE "userId" = $2
       RETURNING "userId", "profilePic"`,
            [profile, userId]
        );

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                message: "User not found",
            };
        }

        // 3️⃣ Success response
        return {
            statusCode: 200,
            message: "Profile updated successfully",
            data: result.rows[0],
        };

    } catch (error) {
        console.error("Update Profile Error:", error);
        return {
            statusCode: 500,
            message: "Internal Server Error",
        };
    }
};