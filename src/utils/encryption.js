import CryptoJS from "crypto-js";

/**
 * Encrypts data using AES encryption.
 * @param {any} data - The data to encrypt (will be stringified).
 * @returns {string} - The encrypted ciphertext string.
 */
export const encryptPayload = (data) => {
  try {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(stringData, process.env.ENCRYPTION_SECRET).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
};

/**
 * Decrypts AES ciphertext back into original data.
 * @param {string} cipherText - The encrypted string.
 * @returns {any} - The parsed JSON data or string.
 */
export const decryptPayload = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, process.env.ENCRYPTION_SECRET);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error("Decryption resulted in empty string (wrong key?)");
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt payload");
  }
};
