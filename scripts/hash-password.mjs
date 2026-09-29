/**
 * Generates the ADMIN_PASSWORD_HASH value for .env.local.
 *
 *   npm run admin:hash                 (prompts)
 *   npm run admin:hash -- 'password'   (non-interactive)
 *
 * The plaintext password is never stored; only the salt and derived key are.
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

const supplied = process.argv[2];
let password = supplied;

if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("New admin password (12+ characters): ");
  rl.close();
}

password = String(password ?? "");
if (password.length < 12) {
  console.error(`\n  Password is ${password.length} characters; use at least 12.\n`);
  process.exit(1);
}

const salt = randomBytes(16);
const key = await scrypt(password, salt, KEY_LENGTH);

console.log(`\nAdd this line to .env.local (replacing any ADMIN_PASSWORD entry):\n`);
console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${key.toString("hex")}\n`);
