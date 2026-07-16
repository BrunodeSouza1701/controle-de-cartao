import { writeFileSync } from "fs";

const base = process.env.CF_API_BASE?.trim() || "";
const apiKey = process.env.CF_FIREBASE_API_KEY?.trim() || "";
const authDomain = process.env.CF_FIREBASE_AUTH_DOMAIN?.trim() || "";
const projectId = process.env.CF_FIREBASE_PROJECT_ID?.trim() || "";

const content =
  `window.CONTROLE_API = ${JSON.stringify({ base })};\n` +
  `window.FIREBASE_WEB = ${JSON.stringify({
    apiKey,
    authDomain,
    projectId,
  })};\n`;

writeFileSync(new URL("../api-config.js", import.meta.url), content, "utf8");