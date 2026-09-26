// Creates (or resets the password of) a staff account for the admin portal.
// Run: node --env-file=.env.local scripts/db/create-admin.mjs owner@example.com "Nitin Kumar" [owner|staff]
// The password is typed at a hidden prompt, hashed with Argon2id, and only the hash is stored.
import { hash } from "@node-rs/argon2";
import { createClient } from "@supabase/supabase-js";

const [email, name, role = "owner"] = process.argv.slice(2);
if (!email || !name || !["owner", "staff"].includes(role)) {
  console.error('Usage: create-admin.mjs <email> "<name>" [owner|staff]');
  process.exit(1);
}

function promptHidden(label) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(130);
      } else if (ch === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await promptHidden("Password (min 10 chars): ");
if (password.length < 10) {
  console.error("Password too short.");
  process.exit(1);
}
if ((await promptHidden("Repeat password: ")) !== password) {
  console.error("Passwords do not match.");
  process.exit(1);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const { error } = await db.from("admins").upsert(
  {
    email: email.toLowerCase(),
    name,
    role,
    password_hash: await hash(password),
    failed_logins: 0,
    locked_until: null,
  },
  { onConflict: "email" },
);

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Saved ${role} account for ${email.toLowerCase()} (password stored as an Argon2id hash).`);
