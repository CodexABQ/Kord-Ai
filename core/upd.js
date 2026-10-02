// Kord-Ai self-updater — deobfuscated from upd.js
// Exports: updateBot (the "update" command) and checkNdUpdate (auto-update on startup).
// All dead/junk code from the obfuscator (LRU cache, linked-list adder, string-interleave DP,
// bucket max-gap, etc.) was never executed and has been removed.

const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const fetch = require("node-fetch");
const { prefix } = require("./func");
const { getPlatformInfo } = require("./dclient");

const REPO_OWNER = "CodexABQ";
const REPO_NAME = "Kord-Ai";
const BRANCH = "master";

const TOKEN_PARTS = ["ghp_NgxKnCVPlu", "6HFQaekzJHB", "eKldIh2nm0PncKv"];

const ROOT_DIR = path.resolve(__dirname, "..");
const VERSION_FILE = path.join(ROOT_DIR, ".version");

// Paths that are never overwritten or deleted by an update
const PROTECTED_PATHS = [
  "node_modules",
  "config.env",
  "config.js",
  ".env",
  "session",
  path.join("..", "../core/session"),
];

const API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

// ---------------------------------------------------------------- helpers

async function githubFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + TOKEN_PARTS.join(""),
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "KordAi",
    },
  });
  if (!res.ok) throw new Error("API error: " + res.status);
  return res;
}

function isProtected(filename) {
  const normalized = path.normalize(filename).replace(/\\/g, "/");
  return PROTECTED_PATHS.some((p) => {
    const prot = path.normalize(p).replace(/\\/g, "/");
    return (
      normalized === prot ||
      normalized.startsWith(prot + "/") ||
      normalized.includes("/" + prot + "/")
    );
  });
}

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

function npmInstall() {
  return new Promise((resolve, reject) => {
    exec("npm install", { cwd: ROOT_DIR }, (err) => {
      if (err) {
        console.error("Yarn install failed:", err.message);
        reject(err);
      } else {
        console.log("Dependencies installed successfully");
        resolve();
      }
    });
  });
}

function restartBot() {
  return new Promise((resolve) => {
    exec("npx pm2 restart kord-v2", (err) => {
      if (err) {
        console.log("PM2 restart failed, using npm start");
        exec("npm start", (err2) => {
          if (err2) {
            console.error("Both PM2 and npm start failed:", err2.message);
            process.exit(1);
          }
          resolve();
        });
      } else {
        console.log("PM2 restart successful");
        resolve();
      }
    });
  });
}

// Reads the locally recorded commit sha; on first run, seeds it from the repo
// (the second-latest commit if there are two, so the first update has something to apply).
async function getLocalSha() {
  try {
    return (await fs.readFile(VERSION_FILE, "utf-8")).trim();
  } catch {
    const res = await githubFetch(`${API}/commits?per_page=2`);
    const commits = await res.json();
    const sha = commits.length > 1 ? commits[1].sha : commits[0].sha;
    await fs.writeFile(VERSION_FILE, sha);
    return sha;
  }
}

async function getLatestCommit() {
  const res = await githubFetch(`${API}/commits/${BRANCH}`);
  return res.json();
}

// ---------------------------------------------------------------- check only

async function checkForUpdates() {
  const currentSha = await getLocalSha();
  const latest = await getLatestCommit();

  if (currentSha === latest.sha) {
    return {
      upToDate: true,
      curr: currentSha.substring(0, 8),
      latest: latest.sha.substring(0, 8),
      msg: latest.commit.message,
    };
  }

  const cmp = await (await githubFetch(`${API}/compare/${currentSha}...${latest.sha}`)).json();
  const commits = cmp.commits.map((c) => ({
    hash: c.sha.substring(0, 8),
    msg: c.commit.message,
    date: new Date(c.commit.author.date).toLocaleDateString(),
  }));

  return {
    upToDate: false,
    curr: currentSha.substring(0, 8),
    latest: latest.sha.substring(0, 8),
    commits,
    totalCommits: commits.length,
  };
}

// ---------------------------------------------------------------- apply update

async function applyUpdate() {
  const currentSha = await getLocalSha();
  const latest = await getLatestCommit();

  if (currentSha === latest.sha) {
    return {
      ok: true,
      upToDate: true,
      curr: currentSha.substring(0, 8),
      latest: latest.sha.substring(0, 8),
      msg: latest.commit.message,
    };
  }

  const cmp = await (await githubFetch(`${API}/compare/${currentSha}...${latest.sha}`)).json();
  const commits = cmp.commits.map((c) => ({
    hash: c.sha.substring(0, 8),
    msg: c.commit.message,
  }));
  const files = cmp.files || [];

  const updated = [];
  const removed = [];
  const failed = [];
  let packageJsonChanged = false;

  for (const file of files) {
    if (isProtected(file.filename)) continue;
    if (file.filename === "package.json") packageJsonChanged = true;

    if (file.status === "removed") {
      try {
        await fs.unlink(path.join(ROOT_DIR, file.filename));
        removed.push(file.filename);
      } catch (e) {
        if (e.code !== "ENOENT") failed.push(file.filename);
      }
    } else {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${latest.sha}/${file.filename}`;
        const res = await githubFetch(rawUrl);
        const data = await res.arrayBuffer();
        const dest = path.join(ROOT_DIR, file.filename);
        await ensureDir(path.dirname(dest));
        await fs.writeFile(dest, Buffer.from(data));
        updated.push(file.filename);
      } catch {
        failed.push(file.filename);
      }
    }
  }

  // Only record the new version if every file succeeded
  if (failed.length === 0) await fs.writeFile(VERSION_FILE, latest.sha);

  if (packageJsonChanged && failed.length === 0) {
    try {
      await npmInstall();
    } catch (e) {
      console.error("Failed to install dependencies:", e.message);
    }
  }

  // Restart is needed if core files / index.js / package.json changed
  // (changes under /cmds/ or /plugins/ are hot and don't need one)
  const needRestart = [...updated, ...removed].some((f) => {
    if (f.includes("/cmds/") || f.includes("/plugins/")) return false;
    return (
      f.includes("core/") ||
      f.includes("core\\") ||
      f.startsWith("core/") ||
      f.startsWith("core\\") ||
      f.includes("index.js") ||
      f.includes("package.json")
    );
  });

  return {
    ok: failed.length === 0,
    upToDate: false,
    curr: currentSha.substring(0, 8),
    latest: latest.sha.substring(0, 8),
    commits,
    updated,
    removed,
    failed,
    needRestart,
    total: files.length,
  };
}

// ---------------------------------------------------------------- auto-update on startup

async function checkNdUpdate() {
  try {
    const info = getPlatformInfo();
    if (info.platform == "render") return;

    const result = await applyUpdate();

    if (result.upToDate) {
      console.log("Bot is up to date");
      return true;
    }
    if (!result.ok) {
      console.log("Update failed with " + result.failed.length + " errors");
      return false;
    }

    console.log("Update completed successfully");
    result.commits.forEach((c, i) => console.log(`${i + 1}. [${c.hash}] ${c.msg}`));

    if (result.needRestart) {
      console.log("Restarting bot...");
      await restartBot();
    }
    return true;
  } catch (e) {
    console.error("Auto-update error:", e.message);
    return false;
  }
}

// ---------------------------------------------------------------- "update" command

async function updateBot(message, args) {
  try {
    // Render deployments update by redeploying, not by patching files
    if (message.client.platform == "render") {
      const latest = await getLatestCommit();
      if (process.env.RENDER_GIT_COMMIT == latest.sha) {
        return await message.send("Bot is up to date");
      }
      await message.send("updating..");
      return await updateApp(); // NOTE: updateApp is not defined anywhere in the original file
    }

    // ".update" -> list available updates
    if (!args || args.trim() === "") {
      await message.send("Checking for updates...");
      const info = await checkForUpdates();

      if (info.upToDate) {
        await message.send("Bot is up to date\n");
        return;
      }

      const list = info.commits
        .slice(0, 10)
        .map((c, i) => `${i + 1}. [${c.hash}] ${c.msg} (${c.date})`)
        .join("\n");
      const more =
        info.totalCommits > 10 ? "\n... and " + (info.totalCommits - 10) + " more commits" : "";

      await message.send(
        "Updates Available\n\n" +
          `Total updates: ${info.totalCommits}\n\n` +
          `Recent update:\n${list}${more}\n\n` +
          `Use *${prefix}update now* to update`
      );
      return;
    }

    // ".update now" -> apply
    if (args.trim().toLowerCase() === "now") {
      await message.send("Updating...");
      const result = await applyUpdate();

      if (result.upToDate) {
        await message.send("Bot is up to date");
        return;
      }
      if (!result.ok) {
        await message.send("Update failed with " + result.failed.length + " errors");
        return;
      }

      const list = result.commits.map((c, i) => `${i + 1}. [${c.hash}] ${c.msg}`).join("\n");
      await message.send("Update completed successfully\n\nApplied commits:\n" + list);

      if (result.needRestart) {
        await message.send("Restarting bot...");
        await restartBot();
      }
      return;
    }

    await message.send(
      "Invalid argument. Use:\n" +
        `${prefix}update - Check available updates\n` +
        `${prefix}update now - Update now`
    );
  } catch (e) {
    console.error("Update error:", e);
    await message.send("Update failed: " + e.message);
  }
}

module.exports = {
  updateBot,
  checkNdUpdate,
};
