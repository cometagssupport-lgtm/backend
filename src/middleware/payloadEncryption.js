import { encryptPayload, decryptPayload } from "../utils/encryption.js";

/**
 * Express middleware to handle incoming encrypted payloads
 * and automatically encrypt outgoing JSON responses.
 */
export const payloadEncryptionMiddleware = (req, res, next) => {
  // Check if encryption is enabled in environment
  const isEnabled = process.env.ENABLE_PAYLOAD_ENCRYPTION === 'true';

  if (!isEnabled) {
    return next();
  }

  // 1. Intercept and decrypt INCOMING payload
  if (req.body && req.body.payload) {
    try {
      req.body = decryptPayload(req.body.payload);
    } catch (error) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid encrypted payload format",
      });
    }
  }

  // 2. Intercept and encrypt OUTGOING payload
  // Save the original res.json function
  const originalJson = res.json;

  // Override res.json
  res.json = function (data) {
    try {
      // Avoid encrypting already encrypted data or error structures if desired
      // But standard approach is to encrypt everything
      const encryptedData = encryptPayload(data);
      
      // Call the original res.json with the { payload: "..." } structure
      return originalJson.call(this, { payload: encryptedData });
    } catch (error) {
      console.error("Failed to encrypt outgoing response", error);
      return originalJson.call(this, {
        statusCode: 500,
        message: "Internal Server Error during encryption",
      });
    }
  };

  next();
};
