import * as dotenv from "dotenv";
dotenv.config();

export const env = {
  baseUrl: process.env.BASE_URL || "https://standard-f1-carity.feisystemsh2env.com/",
  headless: (process.env.HEADLESS || "true") === "true",
  browser: process.env.BROWSER || "chromium", // chromium | firefox | webkit
  username: process.env.USERNAME || "george.parker",
  password: process.env.PASSWORD || "Password123#",
  organization: process.env.ORGANIZATION || "Quantum",
  location: process.env.LOCATION || "Quantum Services Medical Equipment",
  staffMember: process.env.STAFF_MEMBER || "Self"
};