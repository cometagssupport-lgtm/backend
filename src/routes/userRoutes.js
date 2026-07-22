import express from "express";
import { registerUser } from "../controllers/createUser.js";
import { loginUser } from "../controllers/loginUser.js";
import { forgotPassword } from "../controllers/forgotPassword.js";
import { checkMaintenance } from "../controllers/maintenanceCheck.js";
import { checkActiveUser } from "../middleware/checkActiveUser.js";
import { emailVerify } from "../controllers/emailVerify.js";
import { verifyOtp } from "../controllers/verifyOtp.js";
import { avengersController } from "../controllers/avengersController.js";
import { changePassword, resetPassword } from "../controllers/resetPassword.js";
import { depositConfirmController } from "../controllers/depositConfirmController.js";
import { withdrawController } from "../controllers/withdrawController.js";
import { adminUpdateController, getAdminData } from "../controllers/adminUpdateController.js";
import { adminWithdrawApprovalController } from "../controllers/adminWithdrawApprovalController.js";
import { purchaseNow } from "../controllers/purchaseNow.js";
import { activateGame } from "../controllers/activateGameController.js";
import { adminAveners } from "../controllers/adminAvengers.js";
import { adminTransactionAvengers } from "../controllers/adminTransactionAvengers.js";
import { adminUpdateUserStatus } from "../controllers/adminUserStatusController.js";
import { adminWithdrawFilter } from "../controllers/adminWithdrawFilter.js";
import { sendBulkEmails } from "../controllers/bulkEmailController.js";
import { createPayin,checkPayinStatus } from "../controllers/payment.js";
import { adminUpdatePasscode} from "../controllers/adminUpdatePasscode.js";
import { adminGetDeposits } from "../controllers/adminGetDeposits.js";
import { adminDeleteUser } from "../controllers/adminDeletUser.js";
import { convertEarningsToDeposit } from "../controllers/convertEarningsToDeposit.js";

// Security Middlewares
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { loginLimiter, otpLimiter, withdrawLimiter, generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Apply general rate limit to all routes by default
router.use(generalLimiter);

// ── PUBLIC ROUTES ──
router.post("/create-account", checkMaintenance, registerUser);
router.post("/login", checkMaintenance, loginLimiter, checkActiveUser, loginUser);
router.post("/forgot-password", checkMaintenance, otpLimiter, forgotPassword);
router.get("/maintenance-check", checkMaintenance);
router.post("/verify-otp", checkMaintenance, otpLimiter, verifyOtp);
router.post("/reset-password", checkMaintenance, resetPassword); // Can be public for forgot password flow
router.get("/payin-status/:track_id", checkMaintenance, checkPayinStatus);

// ── PROTECTED USER ROUTES ──
router.post("/email-verify", checkMaintenance, verifyToken, checkActiveUser, emailVerify);
router.post("/avengers", checkMaintenance, verifyToken, checkActiveUser, avengersController);
router.post("/confirm", checkMaintenance, verifyToken, checkActiveUser, depositConfirmController);
router.post("/withdraw", checkMaintenance, withdrawLimiter, verifyToken, checkActiveUser, withdrawController);
router.post("/convert-earnings", checkMaintenance, verifyToken, checkActiveUser, convertEarningsToDeposit);
router.post("/purchaseNow", checkMaintenance, verifyToken, checkActiveUser, purchaseNow);
router.post("/activateGame", checkMaintenance, verifyToken, checkActiveUser, activateGame);
router.post("/change-password", verifyToken, checkActiveUser, changePassword);
router.post("/create-payin", checkMaintenance, verifyToken, createPayin);

// ── ADMIN ROUTES ──
router.post("/adminUpdate", verifyToken, verifyAdmin, adminUpdateController);
router.get("/getAdminData", verifyToken, verifyAdmin, getAdminData);
router.post("/adminUpdatePasscode", verifyToken, adminUpdatePasscode);
router.post("/withdraw-approval", verifyToken, verifyAdmin, adminWithdrawApprovalController);
router.post("/adminAvengers", verifyToken, verifyAdmin, adminAveners);
router.post("/adminTransactionAvengers", verifyToken, verifyAdmin, adminTransactionAvengers);
router.post("/adminUpdateUserStatus", verifyToken, verifyAdmin, adminUpdateUserStatus);
router.post("/adminWithdrawFilter", verifyToken, verifyAdmin, adminWithdrawFilter);
router.post("/send-bulk-emails", verifyToken, verifyAdmin, sendBulkEmails);
router.get("/adminGetDeposits", verifyToken, verifyAdmin, adminGetDeposits);
router.delete("/delete-user", verifyToken, verifyAdmin, adminDeleteUser);

export default router;
