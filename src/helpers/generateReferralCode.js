import { v4 as uuidv4 } from "uuid";

export function generateReferralCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export function generateUserId() {
  const timestamp = Date.now(); // 13-digit timestamp
  const randomPart = Math.floor(100 + Math.random() * 900); // 3-digit random number
  return Number(`${timestamp}${randomPart}`); // e.g. 1730226895123123
}