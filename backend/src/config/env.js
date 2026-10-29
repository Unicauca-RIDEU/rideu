import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL ?? "",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  mailMode: process.env.MAIL_MODE || "console",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  mailFrom: process.env.MAIL_FROM || "Ride U <no-reply@rideu.local>",
};
