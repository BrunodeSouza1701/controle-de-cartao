import { writeFileSync } from "fs";

const base = process.env.CF_API_BASE || "";
const apiKey = process.env.CF_FIREBASE_API_KEY || "";
const authDomain = process.env.CF_FIREBASE_AUTH_DOMAIN || "";
const projectId = process.env.CF_FIREBASE_PROJECT_ID || "";

const content =
  `window.CONTROLE_API = ${JSON.stringify({ base })};\n` +
  `window.FIREBASE_WEB = ${JSON.stringify({ apiKey, authDomain, projectId })};\n`;

writeFileSync(new URL("../api-config.js", import.meta.url), content, "utf8");
console.log(
  "api-config.js gerado (Worker base:",
  base ? "sim" : "não",
  "| Firebase web:",
  apiKey && projectId ? "sim" : "não",
  ")",
);
