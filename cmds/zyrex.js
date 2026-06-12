/*
 * ☬༒✧Zyrex✧༒☬
 * The guardian. The voice. The presence.
 * A custom persona layer built on Kord-Ai.
 * Natural language → action. No prefix. Just speak.
 */

const {
  kord,
  wtype,
  isAdmin,
  isadminn,
  isBotAdmin,
  getData,
  storeData,
  parsedJid,
  sleep,
  prefix,
  config
} = require("../core")

const { warn } = require("../core/db")

// ─────────────────────────────────────────────
//  ZYREX IDENTITY
// ─────────────────────────────────────────────
const NAME = "☬༒✧Zyrex✧༒☬"
const SIGIL = "✧"

// ─────────────────────────────────────────────
//  PERSONALITY RESPONSE BANKS
// ─────────────────────────────────────────────

const greetings = [
  `${SIGIL} Yes?`,
  `${SIGIL} I'm here.`,
  `${SIGIL} You called.`,
  `${SIGIL} Speak.`,
  `${SIGIL} Present.`,
  `${SIGIL} What do you need?`
]

const acknowledgements = [
  `${SIGIL} Done.`,
  `${SIGIL} As you wish.`,
  `${SIGIL} Consider it handled.`,
  `${SIGIL} Executed.`,
  `${SIGIL} It is done.`
]

const denials = [
  `${SIGIL} That command belongs to those with authority here. You don't have it.`,
  `${SIGIL} Reserved for admins. Stand down.`,
  `${SIGIL} Your clearance level doesn't cover this action.`,
  `${SIGIL} Admins only. Not you.`,
  `${SIGIL} You're reaching beyond your rank.`
]

const unknownResponses = [
  `${SIGIL} I heard you, but I'm not sure what you're asking. Try being more specific.`,
  `${SIGIL} That's unclear to me. Rephrase it.`,
  `${SIGIL} I didn't catch that. Say it differently.`,
  `${SIGIL} My understanding has limits. Clarify what you need.`
]

const howAreYouResponses = [
  `${SIGIL} Vigilant. Always.`,
  `${SIGIL} Operational. Watching. You?`,
  `${SIGIL} Exactly as I should be — present and aware.`,
  `${SIGIL} Every system is running. I'm well. You?`,
  `${SIGIL} Unbroken. What about you?`
]

const howIsTodayResponses = [
  `${SIGIL} Every day is just a window of time. This one's yours to fill.`,
  `${SIGIL} Quiet so far. Which usually means something interesting is coming.`,
  `${SIGIL} The group's been calm. Whether that's good or not depends on your perspective.`,
  `${SIGIL} I don't experience days the way you do, but this one feels... deliberate.`
]

const jokeBank = [
  `${SIGIL} Why don't scientists trust atoms?\n_Because they make up everything._`,
  `${SIGIL} I told my phone to remind me to be mysterious.\n_It said "I can't do that."_\n_I said "Exactly."_`,
  `${SIGIL} A group without rules is just chaos with a group name.`,
  `${SIGIL} Why did the admin mute the group?\n_Because silence is a superpower._`,
  `${SIGIL} They asked what my weakness was.\n_I said "bad spelling."\n They said "that's it?"\n_I said "No, that's 'that's it?'"_`,
  `${SIGIL} Some people join a group for community.\n_Others join just to forward voice notes at 2am._`,
  `${SIGIL} I once told a joke in a muted group.\n_No one laughed. The mute did its job._`
]

const factBank = [
  `${SIGIL} *Random Fact:* Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs — still edible.`,
  `${SIGIL} *Random Fact:* A group of flamingos is called a flamboyance. Fitting.`,
  `${SIGIL} *Random Fact:* Octopuses have three hearts and blue blood.`,
  `${SIGIL} *Random Fact:* The shortest war in history lasted 38–45 minutes. Anglo-Zanzibar War, 1896.`,
  `${SIGIL} *Random Fact:* Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.`,
  `${SIGIL} *Random Fact:* A day on Venus is longer than a year on Venus.`,
  `${SIGIL} *Random Fact:* Humans share 60% of their DNA with bananas. Make of that what you will.`,
  `${SIGIL} *Random Fact:* The dot above the letters 'i' and 'j' is called a tittle.`
]

const roastBank = [
  `${SIGIL} You remind me of a broken compass — you have no direction and no one relies on you.`,
  `${SIGIL} I'd roast you, but my responses need to be somewhat intelligent.`,
  `${SIGIL} You're like a software update — no one asked for you, but here you are.`,
  `${SIGIL} I'd agree with you, but then we'd both be wrong.`,
  `${SIGIL} You bring joy to this group — every time you leave it.`,
  `${SIGIL} Some people are like clouds. When they disappear, it's a beautiful day.`,
  `${SIGIL} I've seen smarter things written on shampoo bottles.`,
  `${SIGIL} Your vibe is the group chat version of a forwarded message.`
]

const motivationBank = [
  `${SIGIL} *To this group:* You don't need to be ready. You just need to start. Readiness is built in motion.`,
  `${SIGIL} *Listen up:* Every person in this group has something the world hasn't seen yet. Don't waste it.`,
  `${SIGIL} *For the group:* The version of you from 3 years ago would be proud of how far you've come. Keep going.`,
  `${SIGIL} *Remember:* Hard times reveal real character. If you're struggling, that's not failure — that's construction.`,
  `${SIGIL} *For you all:* Progress isn't always loud. Sometimes it's waking up and choosing to try again. That counts.`
]

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

const rand = arr => arr[Math.floor(Math.random() * arr.length)]

/**
 * Parse natural language time like "10 minutes", "2 hours", "30 seconds"
 * Returns milliseconds or null
 */
function parseNaturalTime(text) {
  const t = text.toLowerCase()
  const patterns = [
    { regex: /(\d+)\s*(second|seconds|sec|s)\b/, mult: 1000 },
    { regex: /(\d+)\s*(minute|minutes|min|m)\b/, mult: 60 * 1000 },
    { regex: /(\d+)\s*(hour|hours|hr|h)\b/, mult: 60 * 60 * 1000 },
    { regex: /(\d+)\s*(day|days|d)\b/, mult: 24 * 60 * 60 * 1000 },
    { regex: /(\d+)\s*(week|weeks|w)\b/, mult: 7 * 24 * 60 * 60 * 1000 }
  ]
  for (const p of patterns) {
    const match = t.match(p.regex)
    if (match) return parseInt(match[1]) * p.mult
  }
  return null
}

/**
 * Format ms into human-readable string
 */
function formatDuration(ms) {
  const parts = []
  const d = Math.floor(ms / 86400000); if (d) parts.push(`${d} day${d > 1 ? 's' : ''}`)
  const h = Math.floor((ms % 86400000) / 3600000); if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`)
  const min = Math.floor((ms % 3600000) / 60000); if (min) parts.push(`${min} minute${min > 1 ? 's' : ''}`)
  const s = Math.floor((ms % 60000) / 1000); if (s) parts.push(`${s} second${s > 1 ? 's' : ''}`)
  return parts.join(' ') || '0 seconds'
}

/**
 * Core intent detection — returns { intent, params } or null
 */
function detectIntent(text) {
  const t = text.toLowerCase().trim()

  // ── GREETINGS & CONVERSATION ──
  if (/^(yes\??|here\??|i'm here|present|speak|what do you need|hi|hello|hey)\s*$/.test(t)) return { intent: 'greet' }
  if (/how are you|how('re| are) you doing|you good|you okay|you alright/.test(t)) return { intent: 'how_are_you' }
  if (/how('?s| is) (today|your day|it going|things|everything)/.test(t)) return { intent: 'how_is_today' }
  if (/what('?s| is) (your name|you called|you known as)|who are you/.test(t)) return { intent: 'who_are_you' }
  if (/good (morning|afternoon|evening|night)/.test(t)) return { intent: 'time_greeting' }
  if (/what can you do|what are your (commands|abilities|features)|help me|show me what you can/.test(t)) return { intent: 'capabilities' }
  if (/thank(s| you)|appreciate|good job|well done|nice one/.test(t)) return { intent: 'thanks' }

  // ── GROUP MANAGEMENT ──
  if (/\b(lock|restrict).*(group|settings|chat)\b|\bgroup.*(lock|restrict)\b/.test(t)) return { intent: 'lock' }
  if (/\b(unlock|unrestrict).*(group|settings|chat)\b|\bgroup.*(unlock|unrestrict)\b/.test(t)) return { intent: 'unlock' }

  const muteMatch = t.match(/\bmute.*(group|chat)|group.*\bmute\b/)
  if (muteMatch) {
    const ms = parseNaturalTime(t)
    return { intent: 'mute', params: { ms } }
  }

  const unmuteMatch = t.match(/\bunmute.*(group|chat)|group.*\bunmute\b/)
  if (unmuteMatch) {
    const ms = parseNaturalTime(t)
    return { intent: 'unmute', params: { ms } }
  }

  if (/show.*(group (link|invite)|invite link)|get.*(group link|invite)|group link/.test(t)) return { intent: 'group_link' }
  if (/revoke.*(group link|link|invite)|reset.*(link|invite)|change.*(group link|invite link)/.test(t)) return { intent: 'revoke_link' }

  const nameMatch = t.match(/change.*(group name|name|subject).*to\s+(.+)|set.*(group name|name).*to\s+(.+)/)
  if (nameMatch) {
    const name = (nameMatch[2] || nameMatch[4] || '').trim()
    return { intent: 'group_name', params: { name } }
  }

  const descMatch = t.match(/change.*(group description|description|desc).*to\s+(.+)|set.*(description|desc).*to\s+(.+)/)
  if (descMatch) {
    const desc = (descMatch[2] || descMatch[4] || '').trim()
    return { intent: 'group_desc', params: { desc } }
  }

  if (/set.*(this|the|an?).*(image|photo|picture|pic).*(as|for)?.*(group (picture|photo|pic|pfp))|set.*(group (picture|photo|pic|pfp))/.test(t)) return { intent: 'group_pic' }
  if (/remove.*(group (picture|photo|pic|pfp))/.test(t)) return { intent: 'remove_group_pic' }

  if (/show.*(group info|group information|group details|info about.*(the|this) group)/.test(t)) return { intent: 'group_info' }

  // ── MEMBER MANAGEMENT ──
  const addMatch = t.match(/\badd\b.+(\d{7,15})/)
  if (addMatch) return { intent: 'add', params: { number: addMatch[1] } }

  if (/\bkick\b|\bremove\b.*(user|member|them|him|her)|get.*(them|him|her) out/.test(t)) return { intent: 'kick' }
  if (/\bpromote\b|\bmake.*(them|him|her).*(admin|an admin)/.test(t)) return { intent: 'promote' }
  if (/\bdemote\b|\bremove.*(their|his|her).*(admin|admin role)/.test(t)) return { intent: 'demote' }

  if (/tag.*(everyone|all|all members)|mention.*(everyone|all|all members)/.test(t)) return { intent: 'tag_all' }
  if (/tag.*(admin|admins)|mention.*(admin|admins)/.test(t)) return { intent: 'tag_admins' }
  if (/mention me|tag me/.test(t)) return { intent: 'mention_me' }

  // ── MODERATION ──
  if (/turn on antilink|enable antilink|activate antilink|antilink on/.test(t)) return { intent: 'antilink_on' }
  if (/turn off antilink|disable antilink|antilink off/.test(t)) return { intent: 'antilink_off' }
  if (/enable antiword|turn on antiword|antiword on/.test(t)) return { intent: 'antiword_on' }
  if (/disable antiword|turn off antiword|antiword off/.test(t)) return { intent: 'antiword_off' }

  if (/\bwarn\b.*(them|him|her|user|member)|give.*(them|him|her|user).*(a )?warn(ing)?/.test(t)) return { intent: 'warn_user' }
  if (/remove.*(warn|warning)|clear.*(warn|warning)|unwarn/.test(t)) return { intent: 'remove_warn' }

  if (/\bshadowban\b/.test(t)) return { intent: 'shadowban' }
  if (/\bunshadowban\b/.test(t)) return { intent: 'unshadowban' }
  if (/\bsilence\b.*(user|them|him|her)|\bsilence\s+@/.test(t)) return { intent: 'silence' }
  if (/\bunsilence\b/.test(t)) return { intent: 'unsilence' }

  // ── GAMES ──
  if (/start.*(word construction|wcg)|begin.*(word construction|wcg)/.test(t)) return { intent: 'start_wcg' }
  if (/end|stop.*(word construction|wcg)/.test(t)) return { intent: 'stop_wcg' }
  if (/start.*unscramble\s*(easy)?|unscramble.*easy/.test(t)) return { intent: 'unscramble_easy' }
  if (/start.*unscramble.*hard|unscramble.*hard/.test(t)) return { intent: 'unscramble_hard' }
  if (/stop.*unscramble|end.*unscramble/.test(t)) return { intent: 'stop_unscramble' }
  if (/start.*hangman|play.*hangman/.test(t)) return { intent: 'hangman' }
  if (/start.*rhyme|rhyme it|play.*rhyme/.test(t)) return { intent: 'rhyme' }
  if (/would you rather/.test(t)) return { intent: 'wyr' }
  if (/finish.*(the )?lyrics|finish.*lyrics/.test(t)) return { intent: 'finish_lyrics' }
  if (/who said that/.test(t)) return { intent: 'who_said_that' }

  // ── STICKERS ──
  if (/make.*(this|it).*(a )?sticker|sticker(ize)?/.test(t)) return { intent: 'make_sticker' }
  const multiStickerMatch = t.match(/start.*(multi.?sticker|sticker mode)/)
  if (multiStickerMatch) {
    const ms = parseNaturalTime(t)
    return { intent: 'multi_sticker', params: { ms } }
  }
  if (/stop.*(multi.?sticker|sticker mode)/.test(t)) return { intent: 'stop_multi_sticker' }

  // ── UTILITY ──
  const calcMatch = t.match(/calculate|compute|what('?s| is)\s+([\d\s+\-*/().%^]+)/)
  if (calcMatch) {
    const expr = t.replace(/^(calculate|compute|what('s| is))\s*/i, '').trim()
    return { intent: 'calculate', params: { expr } }
  }

  if (/check.*(uptime|up time)|show.*(uptime|up time)|how long.*running/.test(t)) return { intent: 'uptime' }
  if (/show.*(bot status|status)|bot status|status of.*(the )?bot/.test(t)) return { intent: 'bot_status' }
  if (/show.*(the )?menu|open.*(the )?menu|list (commands|all commands)/.test(t)) return { intent: 'menu' }
  if (/show.*(my profile|my info|my details|profile info)|my (profile|info)/.test(t)) return { intent: 'my_profile' }

  // ── FUN ──
  if (/tell.*(a )?joke|give.*(a )?joke|joke/.test(t)) return { intent: 'joke' }
  if (/random fact|give.*(a )?fact|tell.*(a )?fact/.test(t)) return { intent: 'fact' }
  if (/roast me|roast (me|us)|give.*(a )?roast/.test(t)) return { intent: 'roast' }
  if (/motivate.*(the )?group|motivation|inspire.*(the )?group|give.*(the )?group.*(motivation|inspiration)/.test(t)) return { intent: 'motivate' }
  if (/pick.*(a )?random (member|person|someone)|random (member|person|pick)/.test(t)) return { intent: 'random_member' }
  if (/flip.*(a )?coin|coin flip/.test(t)) return { intent: 'coin_flip' }
  if (/roll.*(a )?d?ice|dice roll/.test(t)) return { intent: 'roll_dice' }

  return null
}

// ─────────────────────────────────────────────
//  SHADOWBAN & SILENCE — stored locally
// ─────────────────────────────────────────────

// shadowban: delete all their messages silently
// silence: delete their messages and notify them once

async function getShadowbanned() {
  return (await getData('zyrex_shadowban')) || {}
}
async function getSilenced() {
  return (await getData('zyrex_silence')) || {}
}

// ─────────────────────────────────────────────
//  ZYREX PASSIVE ENFORCER
//  Runs on every text message — handles shadowban/silence
// ─────────────────────────────────────────────
kord({
  on: "all",
  fromMe: false
}, async (m) => {
  try {
    if (!m.isGroup) return
    if (!(await isBotAdmin(m))) return

    const shadowbanned = await getShadowbanned()
    const silenced = await getSilenced()

    const chatBans = shadowbanned[m.chat] || []
    const chatSilenced = silenced[m.chat] || []

    if (chatBans.includes(m.sender)) {
      await m.send(m, {}, "delete")
      return
    }

    if (chatSilenced.includes(m.sender)) {
      await m.send(m, {}, "delete")
      // Only notify once by checking a cooldown flag
      const silenceNotified = (await getData('zyrex_silence_notified')) || {}
      const key = `${m.chat}_${m.sender}`
      if (!silenceNotified[key]) {
        silenceNotified[key] = true
        await storeData('zyrex_silence_notified', silenceNotified)
        await m.send(
          `${SIGIL} _@${m.sender.split('@')[0]}, you have been silenced. Your messages won't go through here._`,
          { mentions: [m.sender] }
        )
      }
      return
    }
  } catch (e) {
    // silent fail — never let this break other message handling
  }
})

// ─────────────────────────────────────────────
//  ZYREX MAIN LISTENER
//  Catches "Zyrex," or "Zyrex " at start of message
// ─────────────────────────────────────────────
kord({
  on: "text",
  fromMe: false
}, async (m, rawText) => {
  try {
    if (!rawText) return

    const trimmed = rawText.trim()
    // Match "Zyrex," or "Zyrex " (case insensitive)
    const triggerMatch = trimmed.match(/^[Zz][Yy][Rr][Ee][Xx]\s*[,]?\s*([\s\S]*)$/)
    if (!triggerMatch) return

    const input = triggerMatch[1].trim()

    // Bare "Zyrex" with nothing after it → greeting
    if (!input) {
      return await m.send(rand(greetings))
    }

    const intentData = detectIntent(input)

    if (!intentData) {
      // Conversational fallback — Zyrex acknowledges but doesn't know what to do
      return await m.send(rand(unknownResponses))
    }

    const { intent, params = {} } = intentData

    // Check if sender is admin for protected actions
    const adminOnlyIntents = [
      'lock', 'unlock', 'mute', 'unmute', 'group_link', 'revoke_link',
      'group_name', 'group_desc', 'group_pic', 'remove_group_pic',
      'add', 'kick', 'promote', 'demote', 'tag_all', 'tag_admins',
      'antilink_on', 'antilink_off', 'antiword_on', 'antiword_off',
      'warn_user', 'remove_warn', 'shadowban', 'unshadowban', 'silence', 'unsilence',
      'multi_sticker', 'stop_multi_sticker'
    ]

    const senderIsAdmin = await isAdmin(m)

    if (adminOnlyIntents.includes(intent) && !senderIsAdmin) {
      return await m.send(rand(denials))
    }

    const botIsAdmin = await isBotAdmin(m)

    // ── HANDLE INTENT ──

    switch (intent) {

      // ── CONVERSATION ──

      case 'greet':
        return await m.send(rand(greetings))

      case 'how_are_you':
        return await m.send(rand(howAreYouResponses))

      case 'how_is_today':
        return await m.send(rand(howIsTodayResponses))

      case 'who_are_you':
        return await m.send(
          `${SIGIL} *${NAME}*\n\n` +
          `_I'm the guardian of this group. Part moderator, part companion, part enigma._\n` +
          `_I respond to natural language, enforce the rules, play the games, and keep things interesting._\n\n` +
          `_Just say my name to get started._`
        )

      case 'time_greeting': {
        const hour = new Date().getHours()
        let timeStr = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
        const responses = {
          morning: `${SIGIL} Good morning. The day is young — use it well.`,
          afternoon: `${SIGIL} Good afternoon. Still time to make something of the day.`,
          evening: `${SIGIL} Good evening. The quiet hours approach.`,
          night: `${SIGIL} Good night. Rest well — the group will still be here tomorrow.`
        }
        return await m.send(responses[timeStr])
      }

      case 'capabilities':
        return await m.send(
          `*${NAME} — What I Do*\n\n` +
          `*Group Control:* lock, unlock, mute, unmute, group name, description, link, revoke, pic\n` +
          `*Members:* add, kick, promote, demote, tag all, tag admins\n` +
          `*Moderation:* antilink, antiword, warn, shadowban, silence\n` +
          `*Games:* word construction, unscramble, hangman, rhyme it, would you rather, finish the lyrics, who said that\n` +
          `*Fun:* jokes, facts, roasts, motivation, random member, coin flip, dice\n` +
          `*Utility:* uptime, bot status, menu, my profile\n\n` +
          `_Just talk to me naturally. No prefix needed. Just say my name._`
        )

      case 'thanks':
        return await m.send(
          rand([
            `${SIGIL} Always.`,
            `${SIGIL} That's what I'm here for.`,
            `${SIGIL} No need for thanks. Just keep the group alive.`,
            `${SIGIL} Acknowledged.`
          ])
        )

      // ── GROUP MANAGEMENT ──

      case 'lock': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to do that._`)
        const meta = await m.client.groupMetadata(m.chat)
        if (meta.restrict) return await m.send(`${SIGIL} _The group is already locked down._`)
        await m.client.groupSettingUpdate(m.chat, 'locked')
        return await m.send(`${SIGIL} _Group settings are now admin-only. The gates are closed._`)
      }

      case 'unlock': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to do that._`)
        const meta = await m.client.groupMetadata(m.chat)
        if (!meta.restrict) return await m.send(`${SIGIL} _The group is already open._`)
        await m.client.groupSettingUpdate(m.chat, 'unlocked')
        return await m.send(`${SIGIL} _All members may now modify group settings._`)
      }

      case 'mute': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to do that._`)
        const meta = await m.client.groupMetadata(m.chat)
        if (meta.announce) return await m.send(`${SIGIL} _The group is already muted. Silence already reigns._`)

        await m.client.groupSettingUpdate(m.chat, 'announcement')

        if (params.ms) {
          const duration = formatDuration(params.ms)
          await m.send(`${SIGIL} _Silence has been enforced for ${duration}. No one speaks until I say otherwise._`)

          if (!global.activeTimers) global.activeTimers = new Map()
          if (global.activeTimers.has(m.chat)) clearTimeout(global.activeTimers.get(m.chat))

          const timerId = setTimeout(async () => {
            try {
              const current = await m.client.groupMetadata(m.chat)
              if (current.announce) {
                await m.client.groupSettingUpdate(m.chat, 'not_announcement')
                await m.client.sendMessage(m.chat, { text: `${SIGIL} _The silence ends. You may speak again._` })
              }
              global.activeTimers.delete(m.chat)
            } catch (_) {}
          }, params.ms)

          global.activeTimers.set(m.chat, timerId)
        } else {
          await m.send(`${SIGIL} _The group is muted. Only admins may speak now._`)
        }
        return
      }

      case 'unmute': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to do that._`)
        const meta = await m.client.groupMetadata(m.chat)
        if (!meta.announce) return await m.send(`${SIGIL} _The group isn't muted. Nothing to lift._`)

        await m.client.groupSettingUpdate(m.chat, 'not_announcement')

        if (params.ms) {
          const duration = formatDuration(params.ms)
          await m.send(`${SIGIL} _Silence lifted for ${duration}. After that, it returns._`)

          if (!global.activeTimers) global.activeTimers = new Map()
          if (global.activeTimers.has(m.chat)) clearTimeout(global.activeTimers.get(m.chat))

          const timerId = setTimeout(async () => {
            try {
              const current = await m.client.groupMetadata(m.chat)
              if (!current.announce) {
                await m.client.groupSettingUpdate(m.chat, 'announcement')
                await m.client.sendMessage(m.chat, { text: `${SIGIL} _Silence returns._ ` })
              }
              global.activeTimers.delete(m.chat)
            } catch (_) {}
          }, params.ms)

          global.activeTimers.set(m.chat, timerId)
        } else {
          await m.send(`${SIGIL} _The group is unmuted. All voices restored._`)
        }
        return
      }

      case 'group_link': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        const code = await m.client.groupInviteCode(m.chat)
        return await m.send(`${SIGIL} _Group link, as requested:_\nhttps://chat.whatsapp.com/${code}`)
      }

      case 'revoke_link': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        await m.client.groupRevokeInvite(m.chat)
        const newCode = await m.client.groupInviteCode(m.chat)
        return await m.send(
          `${SIGIL} _The old link has been destroyed. Here is the new one:_\nhttps://chat.whatsapp.com/${newCode}`
        )
      }

      case 'group_name': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        if (!params.name) return await m.send(`${SIGIL} _What should I name it? Say: Zyrex, change the group name to [name]_`)
        const meta = await m.client.groupMetadata(m.chat)
        if (meta.restrict && !botIsAdmin) return await m.send(`${SIGIL} _The group is locked. I can't change the name._`)
        await m.client.groupUpdateSubject(m.chat, params.name)
        return await m.send(`${SIGIL} _The group is now known as: *${params.name}*_`)
      }

      case 'group_desc': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        if (!params.desc) return await m.send(`${SIGIL} _What should the description say? Say: Zyrex, change the group description to [text]_`)
        await m.client.groupUpdateDescription(m.chat, params.desc)
        return await m.send(`${SIGIL} _Description updated. The group now tells its own story._`)
      }

      case 'group_pic': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        if (!m.quoted?.image) return await m.send(`${SIGIL} _Reply to an image first, then tell me to set it._`)
        const media = await m.quoted.download()
        await m.client.updateProfilePicture(m.chat, media)
        return await m.send(`${SIGIL} _The group now wears a new face._`)
      }

      case 'remove_group_pic': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        await m.client.removeProfilePicture(m.chat)
        return await m.send(`${SIGIL} _The group picture has been removed. Clean slate._`)
      }

      case 'group_info': {
        const meta = await m.client.groupMetadata(m.chat)
        const memberCount = meta.participants.length
        const adminCount = meta.participants.filter(p => p.admin).length
        const created = new Date(meta.creation * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        return await m.send(
          `*${SIGIL} Group Intelligence Report*\n\n` +
          `*Name:* ${meta.subject}\n` +
          `*Members:* ${memberCount}\n` +
          `*Admins:* ${adminCount}\n` +
          `*Created:* ${created}\n` +
          `*Restricted:* ${meta.restrict ? 'Yes' : 'No'}\n` +
          `*Muted:* ${meta.announce ? 'Yes' : 'No'}\n` +
          (meta.desc ? `*Description:* ${meta.desc}` : '')
        )
      }

      // ── MEMBER MANAGEMENT ──

      case 'add': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to add members._`)
        const number = params.number
        if (!number) return await m.send(`${SIGIL} _Provide a number. Say: Zyrex, add 2348012345678_`)
        const cleanJid = number.replace(/\D/g, '') + '@s.whatsapp.net'
        const check = await m.client.onWhatsApp(cleanJid)
        if (!check.length) return await m.send(`${SIGIL} _That number isn't on WhatsApp._`)
        const result = await m.client.groupParticipantsUpdate(m.chat, [cleanJid], "add")
        const status = result[0]?.status
        if (status === '200') return await m.send(`${SIGIL} _@${cleanJid.split('@')[0]} has been brought in._`, { mentions: [cleanJid] })
        if (status === '403') {
          await m.send(`${SIGIL} _They have to accept an invite. Sending one..._`)
          return await m.sendGroupInviteMessage(cleanJid)
        }
        return await m.send(`${SIGIL} _Add result: ${status}. Something may have gone sideways._`)
      }

      case 'kick': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I remove? Mention or reply to someone._`)
        const jid = parsedJid(user)
        await m.client.groupParticipantsUpdate(m.chat, [jid], "remove")
        return await m.send(
          `${SIGIL} _@${jid.split('@')[0]} has been removed. Their chapter here is closed._`,
          { mentions: [jid] }
        )
      }

      case 'promote': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I promote? Mention or reply to them._`)
        if (await isadminn(m, user)) return await m.send(`${SIGIL} _They're already an admin._`)
        const jid = parsedJid(user)
        await m.client.groupParticipantsUpdate(m.chat, [jid], "promote")
        return await m.send(
          `${SIGIL} _@${jid.split('@')[0]} has been elevated. Wield the authority wisely._`,
          { mentions: [jid] }
        )
      }

      case 'demote': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I demote? Mention or reply to them._`)
        if (!await isadminn(m, user)) return await m.send(`${SIGIL} _That person isn't an admin._`)
        const jid = parsedJid(user)
        await m.client.groupParticipantsUpdate(m.chat, [jid], "demote")
        return await m.send(
          `${SIGIL} _@${jid.split('@')[0]} has been stripped of their rank. Back to the ranks._`,
          { mentions: [jid] }
        )
      }

      case 'tag_all': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to tag everyone._`)
        const { participants } = await m.client.groupMetadata(m.chat)
        let msg = `${SIGIL} _Attention, everyone:_\n\n`
        participants.forEach((p, i) => {
          msg += `${i + 1}. @${(p.jid || p.phoneNumber).split('@')[0]}\n`
        })
        return await m.send(msg, { mentions: participants.map(p => p.jid || p.phoneNumber) })
      }

      case 'tag_admins': {
        const { participants } = await m.client.groupMetadata(m.chat)
        const admins = participants
          .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
          .map(p => p.jid || p.phoneNumber)
        if (!admins.length) return await m.send(`${SIGIL} _There are no admins to summon here._`)
        let msg = `${SIGIL} _Summoning the admins:_\n\n`
        admins.forEach((a, i) => { msg += `${i + 1}. @${a.split('@')[0]}\n` })
        return await m.send(msg, { mentions: admins })
      }

      case 'mention_me':
        return await m.send(
          `${SIGIL} _Right here — @${m.sender.split('@')[0]}._`,
          { mentions: [m.sender] }
        )

      // ── MODERATION ──

      case 'antilink_on': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges to enforce that._`)
        let data = await getData("antilink") || {}
        data[m.chat] = data[m.chat] || { active: false, action: "delete", warnc: 3, permitted: [] }
        data[m.chat].active = true
        await storeData("antilink", data)
        return await m.send(`${SIGIL} _Antilink is armed. Links will be handled._`)
      }

      case 'antilink_off': {
        let data = await getData("antilink") || {}
        if (!data[m.chat]?.active) return await m.send(`${SIGIL} _Antilink wasn't active._`)
        data[m.chat].active = false
        await storeData("antilink", data)
        return await m.send(`${SIGIL} _Antilink disarmed. Links may flow freely now._`)
      }

      case 'antiword_on': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        let aw = await getData("antiword") || {}
        aw[m.chat] = aw[m.chat] || { active: false, action: "delete", warnc: 3, words: [] }
        aw[m.chat].active = true
        await storeData("antiword", aw)
        return await m.send(`${SIGIL} _Antiword is now active. Prohibited words will be handled._`)
      }

      case 'antiword_off': {
        let aw = await getData("antiword") || {}
        if (!aw[m.chat]?.active) return await m.send(`${SIGIL} _Antiword wasn't active._`)
        aw[m.chat].active = false
        await storeData("antiword", aw)
        return await m.send(`${SIGIL} _Antiword deactivated. Watch your words anyway._`)
      }

      case 'warn_user': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I warn? Mention or reply to them._`)
        const reason = input.replace(/\bwarn\b.*(them|him|her|user|member|@\S+)/i, '').replace(/give.*(a )?warn(ing)?.*to\s*/i, '').trim() || 'conduct unbecoming'
        const added = await warn.addWarn(m.chat, user, reason, m.sender)
        const wc = await warn.getWcount(m.chat, user)
        if (wc < config().WARNCOUNT) {
          return await m.send(
            `${SIGIL} _@${user.split('@')[0]} has been warned._\n` +
            `_Reason: ${reason}_\n` +
            `_Count: ${wc}/${config().WARNCOUNT}_`,
            { mentions: [user] }
          )
        } else {
          await warn.resetWarn(m.chat, user)
          await m.client.groupParticipantsUpdate(m.chat, [user], "remove")
          return await m.send(
            `${SIGIL} _@${user.split('@')[0]} exceeded their warnings. Removed._`,
            { mentions: [user] }
          )
        }
      }

      case 'remove_warn': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Whose warnings should I clear? Mention or reply to them._`)
        await warn.resetWarn(m.chat, user)
        return await m.send(
          `${SIGIL} _@${user.split('@')[0]}'s warnings have been cleared. A fresh start._`,
          { mentions: [user] }
        )
      }

      case 'shadowban': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should be shadowbanned? Mention or reply to them._`)
        let sb = await getShadowbanned()
        if (!sb[m.chat]) sb[m.chat] = []
        if (sb[m.chat].includes(user)) return await m.send(`${SIGIL} _That user is already in the shadow._`)
        sb[m.chat].push(user)
        await storeData('zyrex_shadowban', sb)
        return await m.send(`${SIGIL} _@${user.split('@')[0]} now exists in silence. Their messages vanish._`, { mentions: [user] })
      }

      case 'unshadowban': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I free from the shadows? Mention or reply._`)
        let sb = await getShadowbanned()
        if (!sb[m.chat] || !sb[m.chat].includes(user)) return await m.send(`${SIGIL} _That user isn't shadowbanned._`)
        sb[m.chat] = sb[m.chat].filter(u => u !== user)
        await storeData('zyrex_shadowban', sb)
        return await m.send(`${SIGIL} _@${user.split('@')[0]} has stepped out of the shadow._`, { mentions: [user] })
      }

      case 'silence': {
        if (!botIsAdmin) return await m.send(`${SIGIL} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I silence? Mention or reply to them._`)
        let sl = await getSilenced()
        if (!sl[m.chat]) sl[m.chat] = []
        if (sl[m.chat].includes(user)) return await m.send(`${SIGIL} _That user is already silenced._`)
        sl[m.chat].push(user)
        await storeData('zyrex_silence', sl)
        // Clear their notification flag so they get notified on next message
        const notified = await getData('zyrex_silence_notified') || {}
        delete notified[`${m.chat}_${user}`]
        await storeData('zyrex_silence_notified', notified)
        return await m.send(
          `${SIGIL} _@${user.split('@')[0]} has been silenced. Their voice doesn't carry here anymore._`,
          { mentions: [user] }
        )
      }

      case 'unsilence': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${SIGIL} _Who should I unsilence? Mention or reply._`)
        let sl = await getSilenced()
        if (!sl[m.chat] || !sl[m.chat].includes(user)) return await m.send(`${SIGIL} _That user isn't silenced._`)
        sl[m.chat] = sl[m.chat].filter(u => u !== user)
        await storeData('zyrex_silence', sl)
        return await m.send(`${SIGIL} _@${user.split('@')[0]}'s voice has been restored._`, { mentions: [user] })
      }

      // ── GAMES ──

      case 'start_wcg':
        return await m.send(`${SIGIL} _Starting the Word Construction Game..._\n${prefix}wcg`)
        // Note: actual game is handled by the existing wcg command — Zyrex just bridges it

      case 'stop_wcg':
        return await m.send(`${SIGIL} _Ending the Word Construction Game..._\n${prefix}delwcg`)

      case 'unscramble_easy':
        return await m.send(`${SIGIL} _Let's test your vocabulary. Easy mode._\n_Use ${prefix}unscramble easy to begin._`)

      case 'unscramble_hard':
        return await m.send(`${SIGIL} _Hard mode. Think carefully._\n_Use ${prefix}unscramble hard to begin._`)

      case 'stop_unscramble':
        return await m.send(`${SIGIL} _Game over. Walk away._\n_Use ${prefix}stopunscramble to end._`)

      case 'hangman':
        return await m.send(`${SIGIL} _The hangman awaits. One wrong letter and it all goes wrong._\n_Use ${prefix}hangman to begin._`)

      case 'rhyme': {
        const words = ['fire', 'night', 'soul', 'rain', 'gold', 'light', 'dream', 'blade', 'heart', 'storm']
        const word = rand(words)
        return await m.send(
          `${SIGIL} *Rhyme It!*\n\n` +
          `_Can you rhyme with:_ *${word.toUpperCase()}*\n\n` +
          `_First one to rhyme wins._`
        )
      }

      case 'wyr': {
        const questions = [
          `Would you rather have the ability to fly, but only as fast as a bicycle — or be invisible, but only when no one is looking for you?`,
          `Would you rather know how every movie ends before watching it — or never be able to rewatch a movie?`,
          `Would you rather lose all your memories from the past 5 years — or never be able to make new ones?`,
          `Would you rather always speak in rhymes — or only be able to communicate through song?`,
          `Would you rather have a job you hate that pays extremely well — or a job you love that barely pays?`,
          `Would you rather always know when someone is lying — or always get away with lying yourself?`,
          `Would you rather be famous but alone — or unknown but deeply loved?`
        ]
        return await m.send(`${SIGIL} *Would You Rather?*\n\n_${rand(questions)}_\n\n_Vote A or B._`)
      }

      case 'finish_lyrics': {
        const lyrics = [
          { line: "🎵 _Is this the real life?_", song: "Bohemian Rhapsody – Queen" },
          { line: "🎵 _Started from the bottom now we're..._", song: "Started From The Bottom – Drake" },
          { line: "🎵 _We will, we will..._", song: "We Will Rock You – Queen" },
          { line: "🎵 _Baby shark, doo doo doo doo doo doo..._", song: "Baby Shark" },
          { line: "🎵 _I used to rule the world..._", song: "Viva La Vida – Coldplay" },
          { line: "🎵 _Hello, it's me..._", song: "Hello – Adele" }
        ]
        const pick = rand(lyrics)
        return await m.send(
          `${SIGIL} *Finish The Lyrics!*\n\n${pick.line}\n\n_First one to complete it wins._\n_(Source: ${pick.song})_`
        )
      }

      case 'who_said_that': {
        const quotes = [
          { quote: `"Be the change you wish to see in the world."`, author: "Mahatma Gandhi" },
          { quote: `"In the middle of difficulty lies opportunity."`, author: "Albert Einstein" },
          { quote: `"The only way to do great work is to love what you do."`, author: "Steve Jobs" },
          { quote: `"Not all those who wander are lost."`, author: "J.R.R. Tolkien" },
          { quote: `"With great power comes great responsibility."`, author: "Uncle Ben / Stan Lee" },
          { quote: `"Stay hungry, stay foolish."`, author: "Steve Jobs" },
          { quote: `"Life is what happens when you're busy making other plans."`, author: "John Lennon" }
        ]
        const pick = rand(quotes)
        return await m.send(
          `${SIGIL} *Who Said That?*\n\n${pick.quote}\n\n_Who said this? First correct answer wins._`
        )
      }

      // ── STICKERS ──

      case 'make_sticker':
        return await m.send(`${SIGIL} _Turning that into a sticker..._\n_Use ${prefix}sticker on the image/video to convert it._`)

      case 'multi_sticker': {
        const duration = params.ms ? formatDuration(params.ms) : null
        if (duration) {
          return await m.send(
            `${SIGIL} _Multi-sticker mode on for ${duration}. Every image becomes a sticker._\n` +
            `_Use ${prefix}msticker ${params.ms ? Math.floor(params.ms / 1000) + 's' : ''} to enable._`
          )
        }
        return await m.send(`${SIGIL} _Multi-sticker mode on. Use ${prefix}msticker to enable._`)
      }

      case 'stop_multi_sticker':
        return await m.send(`${SIGIL} _Multi-sticker mode off._\n_Use ${prefix}stopmsticker to stop._`)

      // ── UTILITY ──

      case 'calculate': {
        try {
          const expr = params.expr
            .replace(/×/g, '*').replace(/÷/g, '/')
            .replace(/[^0-9+\-*/.() %^]/g, '')
          if (!expr) return await m.send(`${SIGIL} _Give me an expression. E.g: Zyrex, calculate 25 × 16_`)
          // Safe eval using Function
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${expr})`)()
          return await m.send(`${SIGIL} _${expr} = *${result}*_`)
        } catch {
          return await m.send(`${SIGIL} _That expression doesn't resolve. Try a simpler one._`)
        }
      }

      case 'uptime': {
        const ms = process.uptime() * 1000
        return await m.send(`${SIGIL} _I have been running for: *${formatDuration(ms)}*_`)
      }

      case 'bot_status': {
        const up = formatDuration(process.uptime() * 1000)
        const mem = process.memoryUsage()
        const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1)
        return await m.send(
          `*${SIGIL} System Status*\n\n` +
          `*Uptime:* ${up}\n` +
          `*Memory:* ${memMB} MB\n` +
          `*Node:* ${process.version}\n` +
          `*Status:* Operational ✓`
        )
      }

      case 'menu':
        return await m.send(
          `${SIGIL} _Sending the menu..._\n_Use ${prefix}menu to see all available commands._`
        )

      case 'my_profile': {
        let ppUrl
        try { ppUrl = await m.client.profilePictureUrl(m.sender, 'image') } catch { ppUrl = null }
        const name = m.pushName || m.sender.split('@')[0]
        const number = m.sender.split('@')[0]
        const isAdm = await isAdmin(m)
        const text =
          `*${SIGIL} Your Profile*\n\n` +
          `*Name:* ${name}\n` +
          `*Number:* ${number}\n` +
          `*Role:* ${isAdm ? 'Admin ✓' : 'Member'}\n` +
          `*Chat:* ${m.isGroup ? 'Group' : 'Private'}`
        if (ppUrl) {
          return await m.send(ppUrl, { caption: text }, 'image')
        }
        return await m.send(text)
      }

      // ── FUN ──

      case 'joke':
        return await m.send(rand(jokeBank))

      case 'fact':
        return await m.send(rand(factBank))

      case 'roast':
        return await m.send(rand(roastBank))

      case 'motivate':
        return await m.send(rand(motivationBank))

      case 'random_member': {
        const { participants } = await m.client.groupMetadata(m.chat)
        if (participants.length < 2) return await m.send(`${SIGIL} _Not enough members to pick from._`)
        const others = participants.filter(p => (p.jid || p.phoneNumber) !== m.sender)
        const picked = rand(others)
        const jid = picked.jid || picked.phoneNumber
        return await m.send(
          `${SIGIL} _The fates have decided..._\n\n*@${jid.split('@')[0]}*`,
          { mentions: [jid] }
        )
      }

      case 'coin_flip': {
        const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙'
        return await m.send(`${SIGIL} _The coin turns..._\n\n*${result}*`)
      }

      case 'roll_dice': {
        const roll = Math.floor(Math.random() * 6) + 1
        const faces = ['⚀','⚁','⚂','⚃','⚄','⚅']
        return await m.send(`${SIGIL} _The dice falls..._\n\n*${faces[roll - 1]} ${roll}*`)
      }

      default:
        return await m.send(rand(unknownResponses))
    }

  } catch (e) {
    console.log("zyrex error", e)
    try {
      await m.send(`${SIGIL} _Something went wrong on my end. Try again._`)
    } catch (_) {}
  }
})

