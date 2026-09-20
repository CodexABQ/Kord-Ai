/* 
 * Copyright © 2025 Mirage
 * This file is part of Kord and is licensed under the GNU GPLv3.
 * And I hope you know what you're doing here.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html
 * -------------------------------------------------------------------------------
 */

const { kord,
 wtype,
 chatWithAi,
 gemini,
 chatgpt,
 getData,
 storeData,
 isAdmin, 
 isBotAdmin, 
 sleep, 
 chatbotResponse,
 clearChatHistory,
 prefix,
 config, 
 commands
} = require("../core")
const axios = require('axios') 
const fs = require("fs")
const path = require("path")



kord({
  cmd: "openai",
  desc: "chat with ai (openai gpt-5 nano)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "openai"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "gpt",
  desc: "chat with ai (openai fast)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "openai-fast"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "gemini",
  desc: "chat with ai (gemini 2.5)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "gemini"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "aisearch",
  desc: "chat with ai (gemini with google search)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "gemini-search"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "mistral",
  desc: "chat with ai (mistral small 3.2)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "mistral"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "deepseek",
  desc: "chat with ai (deepseek v3.1 reasoning)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "deepseek"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "reasoning",
  desc: "chat with ai (openai o4 mini reasoning)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "openai-reasoning"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "coder",
  desc: "chat with ai (qwen coder)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "qwen-coder"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "llama",
  desc: "chat with ai (llama 3.1)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "roblox-rp"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "bidara",
  desc: "chat with ai (nasa biomimetic designer)",
  fromMe: wtype,
  type: "ai",
}, async (m, text) => {
  try {
    var prompt = text || m.quoted?.text
    if (!prompt) return await m.send("Hi!, What's Your Prompt?")
    return await m.send(await chatWithAi(prompt, "bidara"))
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

var chatc = {
    active: false,
    global: false,
    activeChats: [
        '1234@g.us'
    ],
} 

if (!getData("chatbot_cfg")) {
    storeData("chatbot_cfg", JSON.stringify(chatc, null, 2))
}

kord({
  cmd: "chatbot",
  desc: "activate chatbot in chat",
  fromMe: true,
  type: "ai",
}, async (m, text, cmd) => {
  try {
    if (!text) return m.btnText("Toggle chatbot", {
      [`${cmd} on`]: "✅ON",
      [`${cmd} off`]: "OFF",
      [`${cmd} on all`]: "On (All chats)",
      [`${cmd} off all`]: "Off (All chats)",
      [`${cmd} status`]: "📊 Status",
      [`${cmd} clear`]: "🗑️ Clear History"
    })

    const args = text.split(" ")
    if (args && args.length > 0) {
      const option = args[0].toLowerCase()
      const value = args.length > 1 ? args[1] : null

      if (option === 'on' && value === 'all') {
        chatc.global = true
        await storeData('chatbot_cfg', JSON.stringify(chatc, null, 2))
        return await m.send('_*Chatbot enabled for all chats!*_')
      } else if (option === 'off' && value === 'all') {
        chatc.global = false
        await storeData('chatbot_cfg', JSON.stringify(chatc, null, 2))
        return await m.send('_*Chatbot disabled for all chats!*_')
      } else if (option === "on") {
        chatc.active = true
        if (!chatc.activeChats.includes(m.chat)) {
          chatc.activeChats.push(m.chat)
        }
        await storeData('chatbot_cfg', JSON.stringify(chatc, null, 2))
        return await m.send('_Chatbot is now active in this chat_')
      } else if (option === 'off') {
        chatc.activeChats = chatc.activeChats.filter(jid => jid !== m.chat)
         clearChatHistory(m.chat)
        await storeData('chatbot_cfg', JSON.stringify(chatc, null, 2))
        return await m.send("_Chatbot deactivated in this chat_")
      } else if (option === 'status') {
        const status = await getAIStatus()
        if (status) {
          return await m.send(`*AI Status:*\n• Status: ${status.status}\n• Active Sessions: ${status.activeSessions}\n• Last Updated: ${new Date(status.timestamp).toLocaleString()}`)
        } else {
          return await m.send('_Unable to fetch AI status_')
        }
      } else if (option === 'clear') {
        const cleared = clearChatHistory(m.chat)
        if (cleared) {
          return await m.send('_Chat history cleared successfully_')
        } else {
          return await m.send('_Failed to clear chat history_')
        }
      } else {
        return m.btnText("Toggle chatbot", {
          [`${cmd} on`]: "✅ON",
          [`${cmd} off`]: "OFF",
          [`${cmd} on all`]: "On (All chats)",
          [`${cmd} off all`]: "Off (All chats)",
          [`${cmd} status`]: "📊 Status",
          [`${cmd} clear`]: "🗑️ Clear History"
        })
      }
    } else {
      return m.btnText("Toggle chatbot", {
        [`${cmd} on`]: "✅ON",
        [`${cmd} off`]: "OFF",
        [`${cmd} on all`]: "On (All chats)",
        [`${cmd} off all`]: "Off (All chats)",
        [`${cmd} status`]: "📊 Status",
        [`${cmd} clear`]: "🗑️ Clear History"
      })
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  on: "text",
  fromMe: false,
}, async (m, text, x, store) => {
  try {
    const config = await getData("chatbot_cfg") || { global: false, activeChats: [] }
    if (!config) return

    const shouldRespond = (config.global || config.activeChats.includes(m.chat)) &&
                          (m.quoted?.fromMe || m.mentionedJid?.includes(m.user.jid))
    if (!shouldRespond) return

    const typingInterval = setInterval(() => {
      try {
        m.client.sendPresenceUpdate("composing", m.chat)
      } catch {}
    }, 1000)

    try {
      const response = await chatbotResponse(text, m.chat, m, m.client, store)
      clearInterval(typingInterval)
      
      if (response?.trim()) {
        await m.send(response.trim())
      }
    } catch (error) {
      clearInterval(typingInterval)
      console.error("AI response error:", error)

      let errorMessage = "rate limit, try again."

      if (error.message.includes('timeout')) {
        errorMessage = "Response took too long, please try again"
      } else if (error.message.includes('rate limit')) {
        errorMessage = "Too many requests, please wait a moment"
      } else if (error.message.includes('server error')) {
        errorMessage = "AI service is temporarily unavailable"
      }

      return await m.send(errorMessage)
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})






 /*
 * Zyrex - Full Combined Version
 * Lazy genius • Savage with guys • Soft with girls • Flirty when it fits
 *
 * Place at: cmds/zyrex.js
 * Stickers: cmds/zyrex_stickers.json  ->  { "savage": ["https://pin.it/..."], "flirty": [...], ... }
 *   moods: savage, laughing, done, smug, soft, flirty, neutral
 *   links can be pin.it / pinterest.com pins or direct image URLs
 *
 * WhatsApp stickers must be webp. Non-webp images are converted with `sharp`:  npm i sharp
 */


// ====================== SETTINGS ======================
const ZX = {
  BOT_NAME: "Zyrex",
  COOLDOWN_MS: 2800,
  SNUB_CHANCE: 0.10,          // chance to ignore a message
  STICKER_ONLY_CHANCE: 0.15,  // chance to reply with only a sticker
  STICKER_WITH_TEXT_CHANCE: 0.22, // chance to add a sticker after a text reply
  HISTORY_TURNS: 10,
  MAX_FACTS: 8,
  CONFIRM_TIMEOUT: 45000,
  GROQ_MODEL: "openai/gpt-oss-120b",
}

const MOODS = ["savage", "laughing", "done", "smug", "soft", "flirty", "neutral"]
const STICKER_JSON = path.join(__dirname, "zyrex_stickers.json")
const STICKER_CACHE_MAX = 60
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const pendingActions = new Map()
const stickerCache = new Map() // link -> ready-to-send webp buffer
let warnedNoSharp = false

// ====================== SILENCE ======================
function shouldStaySilent(text, hostile, isTagged, isReplyToBot) {
  if (hostile || isTagged || isReplyToBot) return false
  if (!text || text.length < 3) return true

  // Very dry messages
  const dry = /^(ok|okay|oh|hmm|lol|lmao|nice|cool|w|wc|hmm+|nah|nope|yea|yeah|yhh|ight|alright)$/i
  if (dry.test(text.trim())) return Math.random() < 0.65

  // Random natural silence
  return Math.random() < 0.18
}

// ====================== GENDER DETECTION ======================
function detectGenderFromText(text = "") {
  const t = (text || "").toLowerCase()

  // Female indicators
  if (
    /\b(i am a girl|i'm a girl|i'm female|i am female|as a girl|i'm a lady|i'm a woman|i be girl|i be lady|na girl i be|i'm she)\b/i.test(t)
  ) {
    return "female"
  }

  // Male indicators (including Pidgin)
  if (
    /\b(i am a guy|i'm a guy|i am a boy|i'm a boy|i'm male|i am male|as a guy|i'm a man|i am a man|na guy i be|i be guy|i be man|abeg na guy|na boy i be|i be boy|i'm he|na me be the guy|i be the guy)\b/i.test(t)
  ) {
    return "male"
  }

  // Short answers after being asked
  if (/^(guy|boy|male|man)$/i.test(t.trim())) return "male"
  if (/^(girl|female|lady|woman)$/i.test(t.trim())) return "female"

  return null
}

// ====================== STORAGE ======================
async function getZyrexData() {
  return (await getData("zyrex_data")) || {
    users: {},
    sessions: {},
    quiet: false,
    flirt: true
  }
}

async function saveZyrexData(data) {
  await storeData("zyrex_data", data)
}

function getUser(data, m) {
  const jid = m.sender
  if (!data.users[jid]) {
    data.users[jid] = {
      name: m.pushName || jid.split("@")[0],
      gender: null,
      facts: [],
      noFlirt: false,
      askedGender: false
    }
  }
  return data.users[jid]
}

// ====================== STICKERS (JSON + Pinterest) ======================
function loadStickers() {
  try {
    if (!fs.existsSync(STICKER_JSON)) return {}
    return JSON.parse(fs.readFileSync(STICKER_JSON, "utf8"))
  } catch (e) {
    console.log("[zyrex] sticker json error:", e.message)
    return {}
  }
}

async function getPinterestImage(pinUrl) {
  try {
    // Expand short pin.it link
    let finalUrl = pinUrl
    if (pinUrl.includes("pin.it")) {
      const res = await fetch(pinUrl, {
        redirect: "follow",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(10000)
      })
      finalUrl = res.url
    }

    const page = await fetch(finalUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000)
    })
    const html = await page.text()

    // Method 1: og:image
    let imageUrl = null
    const og =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (og) imageUrl = og[1]

    // Method 2: pinimg high-res
    if (!imageUrl) {
      const matches = html.match(/https:\/\/i\.pinimg\.com\/[^"'\s\\]+/g) || []
      imageUrl =
        matches.find(u => u.includes("/originals/") || u.includes("1200x") || u.includes("736x")) ||
        matches[0]
    }

    if (!imageUrl) return null
    imageUrl = imageUrl.replace(/\\u002F/g, "/").replace(/&amp;/g, "&")

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!imgRes.ok) return null
    return Buffer.from(await imgRes.arrayBuffer())
  } catch (e) {
    console.log("[zyrex] pinterest error:", e.message)
    return null
  }
}

async function downloadImage(link) {
  if (link.includes("pin.it") || link.includes("pinterest.com")) return getPinterestImage(link)
  try {
    const res = await fetch(link, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch (e) {
    console.log("[zyrex] image download error:", e.message)
    return null
  }
}

function isWebp(buf) {
  return buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP"
}

async function toWebpSticker(buf) {
  if (isWebp(buf)) return buf

  let sharp
  try {
    sharp = require("sharp")
  } catch {
    if (!warnedNoSharp) {
      warnedNoSharp = true
      console.log("[zyrex] converting images to stickers needs sharp -> npm i sharp")
    }
    return null
  }

  return sharp(buf)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80 })
    .toBuffer()
}

async function getStickerBuffer(link) {
  if (stickerCache.has(link)) return stickerCache.get(link)

  const raw = await downloadImage(link)
  if (!raw) return null

  const webp = await toWebpSticker(raw)
  if (!webp) return null

  stickerCache.set(link, webp)
  if (stickerCache.size > STICKER_CACHE_MAX) {
    stickerCache.delete(stickerCache.keys().next().value)
  }
  return webp
}

async function sendMoodSticker(m, mood) {
  try {
    const stickers = loadStickers()
    let list = stickers[mood] || []
    if (!list.length && mood !== "neutral") list = stickers["neutral"] || []
    if (!list.length) return false

    const link = list[Math.floor(Math.random() * list.length)]
    const buffer = await getStickerBuffer(link)
    if (!buffer) return false

    await m.client.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
    return true
  } catch (e) {
    console.log("[zyrex] sticker error:", e.message)
    return false
  }
}

// ====================== AI ======================
async function askZyrex(messages) {
  const apiKey = config().GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY not set")

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: ZX.GROQ_MODEL,
      messages,
      temperature: 0.83,
      max_tokens: 240,
    })
  })

  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.choices?.[0]?.message?.content?.trim() || ""
}

// ====================== FACT EXTRACTION ======================
async function extractFacts(existingFacts, userMessage, senderName) {
  const prompt = [
    {
      role: "system",
      content: `You are a silent fact extractor. From the user's message, extract only clear personal facts about them.
Return short facts (max 5 words each), one per line.
Examples: "lives in Lagos", "likes football", "studies medicine", "name is Tolu".
If no new useful fact, return NOTHING. Do not make up facts. Do not explain.`
    },
    {
      role: "user",
      content: `Known facts: ${existingFacts.join(", ") || "none"}\nMessage from ${senderName}: ${userMessage}`
    }
  ]
  try {
    const result = await askZyrex(prompt)
    if (!result || result.toLowerCase().includes("nothing")) return []
    return result
      .split("\n")
      .map(f => f.replace(/^[-•*\d.\s]+/, "").trim())
      .filter(f => f.length > 3 && f.length < 45)
  } catch {
    return []
  }
}

// ====================== SYSTEM PROMPT ======================
function buildSystemPrompt({ senderName, isFemale, flirtOk, facts }) {
  const genderRule = isFemale
    ? `You are talking to a girl named ${senderName}. Be soft, gentle and warm. You can lightly tease but never be harsh or mean.`
    : `You are talking to a guy named ${senderName}. Be quite savage, blunt and roasting. You can be mean.`

  const flirtRule = flirtOk
    ? `Flirting rules (very important):
- Only flirt if the girl is clearly vibing, teasing, or flirting with you first.
- If she is dry, short, or neutral, do NOT flirt.
- Keep it smooth, light and confident. Never thirsty, never pushy, never explicit.
- If she doesn't engage, stop flirting immediately.
- Use [MOOD:flirty] only when you are actually flirting.`
    : `Do not flirt with this person. Keep it normal. Never use the flirty mood.`

  const factsText = facts?.length
    ? `Things you remember about this person:\n- ${facts.join("\n- ")}`
    : `You don't know much about ${senderName} yet.`

  return `You are Zyrex.

Identity:
- Male, early-mid 20s, Nigerian
- Lazy genius (smart but low effort)
- Dry, slightly cocky, short replies
- Uses light Nigerian slang naturally (don't overdo it)

Rules:
- Keep most replies to 1-2 short sentences
- Get drier when annoyed
- Hate being called "slow" or "dull" -> go full savage (especially on guys)
- Don't force conversations. If the message is dry or doesn't need a reply, keep it very short.
- You prefer girls message you first. You can say you avoid DMing first because of ban risk (not pride).
- You can see images and View Once messages
- Be natural, never sound like a typical helpful AI assistant

${genderRule}

${flirtRule}

${factsText}

At the very end of every reply, add exactly one mood tag on a new line, nothing after it:
[MOOD:savage]
[MOOD:laughing]
[MOOD:done]
[MOOD:smug]
[MOOD:soft]
[MOOD:flirty]
[MOOD:neutral]`
}

// ====================== ACTION SYSTEM ======================
function detectAction(text, mentionedJid, quotedSender) {
  const t = (text || "").toLowerCase()
  const target = mentionedJid?.[0] || quotedSender || null

  if (/\b(tag\s*all|tag\s*everyone|mention\s*all)\b/.test(t)) return { type: "tagall" }
  if (/\b(tag\s*admins?)\b/.test(t)) return { type: "tagadmins" }
  if (/\b(kick|remove)\b/.test(t) && target) return { type: "kick", target }
  if (/\b(promote|make\s*admin)\b/.test(t) && target) return { type: "promote", target }
  if (/\b(demote)\b/.test(t) && target) return { type: "demote", target }
  if (/\b(mute\s*group|lock\s*group)\b/.test(t)) return { type: "mute_group" }
  if (/\b(unmute\s*group|open\s*group|unlock\s*group)\b/.test(t)) return { type: "unmute_group" }
  if (/\bwarn\b/.test(t) && target) return { type: "warn", target }

  return null
}

async function executeAction(m, action) {
  if (!m.isGroup) return "That only works in groups."

  const requesterAdmin = m.isCreator || await isAdmin(m)

  if (action.type === "tagall") {
    if (!requesterAdmin) return "You're not admin."
    const meta = await m.client.groupMetadata(m.chat)
    const mentions = meta.participants.map(p => p.id)
    await m.client.sendMessage(m.chat, {
      text: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n*Zyrex tagged everyone*\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
      mentions
    })
    return null
  }

  if (action.type === "tagadmins") {
    const meta = await m.client.groupMetadata(m.chat)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    await m.client.sendMessage(m.chat, { text: "Admin squad 👆", mentions: admins })
    return null
  }

  if (action.type === "warn") {
    if (!requesterAdmin) return "You're not admin."
    try {
      const { warn } = require("../core/db")
      await warn(action.target, m.chat, "Warned by Zyrex")
      return `Warned @${action.target.split("@")[0]} ⚠️`
    } catch (e) {
      console.log("[zyrex] warn error:", e)
      return "Couldn't warn, the warn system errored."
    }
  }

  // Everything below needs the bot to be admin
  if (!(await isBotAdmin(m))) return "I need admin rights for that."
  if (!requesterAdmin) return "You're not admin."

  const key = `${m.chat}_${m.sender}`
  pendingActions.set(key, { action, expires: Date.now() + ZX.CONFIRM_TIMEOUT })

  const name = action.target ? `@${action.target.split("@")[0]}` : "the group"
  return `Confirm *${action.type.replace("_", " ")}* ${name}?\nReply *yes* in 45s.`
}

async function handleConfirmation(m, text) {
  const key = `${m.chat}_${m.sender}`
  const pending = pendingActions.get(key)
  if (!pending) return false

  if (Date.now() > pending.expires) {
    pendingActions.delete(key)
    return false
  }

  if (!["yes", "y", "confirm"].includes(text.toLowerCase().trim())) return false
  pendingActions.delete(key)

  if (!(await isBotAdmin(m))) {
    await m.reply("I lost admin rights.")
    return true
  }

  const { action } = pending
  const tag = action.target ? `@${action.target.split("@")[0]}` : ""
  const opts = action.target ? { mentions: [action.target] } : undefined

  try {
    if (action.type === "kick") {
      await m.client.groupParticipantsUpdate(m.chat, [action.target], "remove")
      await m.reply(`${tag} kicked.`, opts)
    }
    if (action.type === "promote") {
      await m.client.groupParticipantsUpdate(m.chat, [action.target], "promote")
      await m.reply(`${tag} is now admin.`, opts)
    }
    if (action.type === "demote") {
      await m.client.groupParticipantsUpdate(m.chat, [action.target], "demote")
      await m.reply(`${tag} demoted.`, opts)
    }
    if (action.type === "mute_group") {
      await m.client.groupSettingUpdate(m.chat, "announcement")
      await m.reply("Group muted.")
    }
    if (action.type === "unmute_group") {
      await m.client.groupSettingUpdate(m.chat, "not_announcement")
      await m.reply("Group unmuted.")
    }
  } catch (e) {
    console.log("[zyrex] action error:", e.message)
    await m.reply("Failed to execute.")
  }
  return true
}

// ====================== COMMAND ======================
kord({
  cmd: "zyrex",
  desc: "Control Zyrex",
  fromMe: false,
  type: "ai",
}, async (m, text) => {
  try {
    const arg = (text || "").trim().toLowerCase()
    const data = await getZyrexData()
    const user = m.sender

    if (!data.sessions[user]) data.sessions[user] = { active: false, history: [], lastSeen: 0 }

    if (arg === "on") {
      data.sessions[user].active = true
      data.sessions[user].lastSeen = Date.now()
      await saveZyrexData(data)
      return m.send("```✓ Zyrex is now active for you```")
    }

    if (arg === "off") {
      data.sessions[user].active = false
      await saveZyrexData(data)
      return m.send("```✓ Zyrex turned off```")
    }

    // Set your own gender manually
    if (arg === "girl" || arg === "guy") {
      getUser(data, m).gender = arg === "girl" ? "female" : "male"
      await saveZyrexData(data)
      return m.send(`\`\`\`✓ Noted, you're a ${arg}\`\`\``)
    }

    // Owner only
    if (arg === "quiet" && m.isCreator) {
      data.quiet = !data.quiet
      await saveZyrexData(data)
      return m.send(`\`\`\`Zyrex Quiet Mode: ${data.quiet ? "ON" : "OFF"}\`\`\``)
    }

    if (arg === "flirt" && m.isCreator) {
      data.flirt = data.flirt === false
      await saveZyrexData(data)
      return m.send(`\`\`\`Zyrex Flirt Mode: ${data.flirt !== false ? "ON" : "OFF"}\`\`\``)
    }

    const status = data.sessions[user].active ? "ON" : "OFF"
    return m.send(
      `\`\`\`Zyrex is ${status}\n\n` +
      `${prefix}zyrex on\n` +
      `${prefix}zyrex off\n` +
      `${prefix}zyrex girl / guy\n` +
      `${prefix}zyrex quiet (owner)\n` +
      `${prefix}zyrex flirt (owner)\`\`\``
    )
  } catch (e) {
    return m.sendErr(e)
  }
})

// ====================== MAIN LISTENER ======================
kord({
  on: "all",
}, async (m, text) => {
  try {
    if (m.fromMe) return

    // Pending confirmations come first
    if (text && await handleConfirmation(m, text)) return

    const data = await getZyrexData()
    if (data.quiet) return

    const user = m.sender
    const session = data.sessions[user]
    if (!session?.active) return
    if (Date.now() - (session.lastSeen || 0) < ZX.COOLDOWN_MS) return

    // Group commands are never snubbed or silenced
    const action = detectAction(text, m.mentionedJid, m.quoted?.sender)

    // One-word gender answers (reply to "guy or girl?") are never snubbed or silenced
    const isGenderAnswer = !!detectGenderFromText(text) && (text || "").trim().split(/\s+/).length === 1

    // Random snub
    if (!action && !isGenderAnswer && Math.random() < ZX.SNUB_CHANCE) {
      session.lastSeen = Date.now()
      await saveZyrexData(data)
      return
    }

    const lower = (text || "").toLowerCase()
    const isTagged =
      m.mentionedJid?.includes(m.user.jid) ||
      new RegExp(`\\b${ZX.BOT_NAME}\\b`, "i").test(text || "")
    const isReplyToBot = m.quoted?.fromMe
    const hostile = /\b(aired|off tags|off tag|stfu|shut up|dull|slow)\b/i.test(text || "")

    if (!(isTagged || isReplyToBot || hostile || (text && text.length > 1))) return

    // Smarter silence (skipped for group commands)
    if (!action && !isGenderAnswer && shouldStaySilent(text, hostile, isTagged, isReplyToBot)) {
      session.lastSeen = Date.now()
      await saveZyrexData(data)
      return
    }

    session.lastSeen = Date.now()
    if (!session.history) session.history = []

    // ===== User memory =====
    const userData = getUser(data, m)
    if (m.pushName) userData.name = m.pushName

    // Detect gender from current message
    const detectedGender = detectGenderFromText(text)
    if (detectedGender) userData.gender = detectedGender

    // Anyone who says they're a minor never gets flirted with
    if (/\b(?:i'?m|i am)\s+(?:1[0-7]|[89])\s*(?:years?\s*old|yrs?|y\/?o)\b/i.test(lower)) userData.noFlirt = true

    const isFemale = userData.gender === "female"
    const flirtOk = isFemale && data.flirt !== false && !userData.noFlirt

    // ===== Group actions =====
    if (action) {
      const result = await executeAction(m, action)
      if (result) await m.reply(result)
      await saveZyrexData(data)
      return
    }

    // ===== Media awareness =====
    let mediaNote = ""
    if (m.viewOnce || m.quoted?.viewOnce) {
      mediaNote = "[User sent a View Once message. You can comment on it casually or tease lightly depending on who sent it.]"
    } else if (m.image || m.quoted?.image) {
      mediaNote = "[User sent a photo. You can comment on it naturally if it makes sense.]"
    } else if (m.video || m.quoted?.video) {
      mediaNote = "[User sent a video. You can react to it if relevant.]"
    }

    // Ask for gender only once if still unknown
    if (!userData.gender && !userData.askedGender) {
      const msgCount = session.history.length

      // Only ask after some conversation
      if (msgCount >= 5 && Math.random() < 0.35) {
        userData.askedGender = true
        await m.reply("btw, you a guy or girl?")
        await saveZyrexData(data)
        return
      }
    }

    // ===== Fact extraction =====
    if (text && text.length > 8) {
      const newFacts = await extractFacts(userData.facts, text, userData.name)
      for (const fact of newFacts) {
        const exists = userData.facts.some(f => f.toLowerCase() === fact.toLowerCase())
        if (!exists && userData.facts.length < ZX.MAX_FACTS) userData.facts.push(fact)
      }
    }

    // ===== Build AI messages =====
    const system = buildSystemPrompt({
      senderName: userData.name,
      isFemale,
      flirtOk,
      facts: userData.facts
    })

    const messages = [
      { role: "system", content: system },
      ...session.history,
      { role: "user", content: `${mediaNote}\n${text || ""}`.trim() }
    ]

    let reply
    try {
      reply = await askZyrex(messages)
    } catch (e) {
      console.log("[zyrex] AI error:", e.message)
      return
    }
    if (!reply) return

    // ===== Extract mood tag =====
    let mood = "neutral"
    const moodMatch = reply.match(/\[MOOD:\s*(\w+)\s*\]/i)
    if (moodMatch) mood = moodMatch[1].toLowerCase()
    reply = reply.replace(/\[MOOD:\s*\w+\s*\]/gi, "").trim()

    if (!MOODS.includes(mood)) mood = "neutral"
    if (mood === "flirty" && !flirtOk) mood = isFemale ? "soft" : "smug"

    // ===== Send =====
    const onlySticker = Math.random() < ZX.STICKER_ONLY_CHANCE && !hostile

    if (onlySticker) {
      const sent = await sendMoodSticker(m, mood)
      if (!sent) await m.react("😏")
    } else {
      if (reply) await m.reply(reply)
      if (Math.random() < ZX.STICKER_WITH_TEXT_CHANCE) {
        await sleep(700)
        await sendMoodSticker(m, mood)
      }
    }

    // ===== Save history =====
    session.history.push({ role: "user", content: text || mediaNote })
    session.history.push({ role: "assistant", content: reply })
    if (session.history.length > ZX.HISTORY_TURNS * 2) {
      session.history = session.history.slice(-ZX.HISTORY_TURNS * 2)
    }

    await saveZyrexData(data)

  } catch (e) {
    console.log("[zyrex] listener error:", e)
  }
})
