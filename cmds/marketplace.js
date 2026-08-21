/* 
 * Marketplace / Ad Queue Assistant
 * ────────────────────────────────
 * Personal inventory + advertising queue for items people send you
 * to sell. Owner + SUDO/MODS only. Never auto-posts anywhere —
 * every post targets explicit groups or named group categories
 * you set up yourself.
 *
 * ── IMPORTANT CAVEATS (read before relying on this in production) ──
 *
 * 1. IMAGE PERSISTENCE: images/videos are uploaded to Kord's CDN
 *    (via m.upload, same mechanism as the existing .url command)
 *    the moment you .grab them — only the resulting URL is stored,
 *    never a local file path. This means items survive bot
 *    restarts/redeploys, since local disk (e.g. on Render free
 *    tier) is wiped on restart but the CDN URL is not.
 *
 * 2. DRAFTS ARE NOT PERSISTED. The item you're actively building
 *    with .item new / .item grab / .item done lives in memory only
 *    until you run .item done. If the bot restarts mid-draft, that
 *    draft is lost (media already uploaded stays on the CDN, but
 *    you'll need to re-grab it into a new draft). Finish drafts in
 *    one sitting where possible.
 *
 * 3. SCHEDULING relies on an in-memory timer (setTimeout) plus a
 *    startup reconciliation pass. If the bot is offline AT or PAST
 *    a scheduled post time, that item is marked "failed" (per your
 *    choice) rather than posted late or silently dropped — you'll
 *    need to manually re-schedule it with .item <id> post again.
 *
 * 4. Posting outside a live message handler (i.e. a scheduled post
 *    firing on its own) needs a WhatsApp client reference. This file
 *    grabs one opportunistically from the first message the bot sees
 *    after startup. If a scheduled post's timer fires before ANY
 *    message has been seen post-restart, it waits up to 2 minutes
 *    for one to arrive before giving up and marking the item failed.
 *
 * Storage keys used:
 *   marketplace_items       -> array of item objects
 *   marketplace_categories  -> array of { name, groups: [jid,...] }
 *   marketplace_counter     -> number, for sequential ITEM-XXX ids
 */

const { kord, wtype, getData, storeData, config, prefix } = require("../core")
const fs = require("fs")

if (!global.marketplaceDrafts) global.marketplaceDrafts = new Map() // senderJid -> draft
if (!global.marketplaceTimers) global.marketplaceTimers = new Map() // itemId -> timeout handle
if (!global.marketplaceClient) global.marketplaceClient = null

const drafts = global.marketplaceDrafts
const timers = global.marketplaceTimers

// ── opportunistically capture a live client reference for use in
//    timer-fired (non-message-handler) contexts, e.g. scheduled posts ──
kord({ on: "all" }, async (m) => {
  try { if (m?.client) global.marketplaceClient = m.client } catch (_) {}
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function marketAuthorized(m) {
  if (m.isCreator) return true
  const raw = `${config().SUDO || ""};${config().MODS || ""}`
  const nums = raw.split(";").map(s => s.trim().replace(/\D/g, "")).filter(Boolean)
  const senderNum = m.sender.split("@")[0].replace(/\D/g, "")
  return nums.includes(senderNum)
}

function getOwnerJid() {
  return `${(config().OWNER_NUMBER || "").replace(/\D/g, "")}@s.whatsapp.net`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ITEM ID / STORAGE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function nextItemId() {
  let counter = await getData("marketplace_counter")
  if (typeof counter !== "number" || isNaN(counter)) counter = 0
  counter += 1
  await storeData("marketplace_counter", JSON.stringify(counter))
  return `ITEM-${String(counter).padStart(3, "0")}`
}

async function getItems() {
  let items = await getData("marketplace_items")
  return Array.isArray(items) ? items : []
}

async function saveItems(items) {
  await storeData("marketplace_items", JSON.stringify(items, null, 2))
}

function resolveItem(token, items) {
  if (!token) return null
  const digits = token.replace(/\D/g, "")
  if (!digits) return null
  const id = `ITEM-${digits.padStart(3, "0")}`
  return items.find(i => i.id === id) || null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GROUP CATEGORY HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getCategories() {
  let cats = await getData("marketplace_categories")
  return Array.isArray(cats) ? cats : []
}

async function saveCategories(cats) {
  await storeData("marketplace_categories", JSON.stringify(cats, null, 2))
}

async function resolveTargets(targetsStr) {
  const tokens = targetsStr.split(",").map(t => t.trim()).filter(Boolean)
  const categories = await getCategories()
  const jids = new Set()
  const unresolved = []

  for (const tok of tokens) {
    if (tok.endsWith("@g.us")) { jids.add(tok); continue }
    const cat = categories.find(c => c.name.toLowerCase() === tok.toLowerCase())
    if (cat) { cat.groups.forEach(g => jids.add(g)); continue }
    unresolved.push(tok)
  }

  return { jids: [...jids], unresolved }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIME PARSING for "post <id> to <targets> <when>"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseWhen(str) {
  const s = (str || "").trim().toLowerCase()
  if (!s || s === "now") return { type: "now" }

  const durationMatch = s.match(/^(\d+)\s*(s|sec|m|min|h|hr|d|day)$/)
  if (durationMatch) {
    const unitMap = { s: 1000, sec: 1000, m: 60000, min: 60000, h: 3600000, hr: 3600000, d: 86400000, day: 86400000 }
    return { type: "delay", ms: parseInt(durationMatch[1]) * unitMap[durationMatch[2]] }
  }

  const atMatch = s.match(/^at\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/)
  if (atMatch) {
    let hour = parseInt(atMatch[1])
    const minute = parseInt(atMatch[2])
    const ampm = atMatch[3]
    if (ampm === "pm" && hour < 12) hour += 12
    if (ampm === "am" && hour === 12) hour = 0
    const target = new Date()
    target.setHours(hour, minute, 0, 0)
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1)
    return { type: "schedule", date: target }
  }

  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  POSTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function scheduleItemPost(itemId, delayMs) {
  if (timers.has(itemId)) clearTimeout(timers.get(itemId))
  const handle = setTimeout(() => performPost(itemId), delayMs)
  timers.set(itemId, handle)
}

async function performPost(itemId) {
  try {
    let items = await getItems()
    let item = items.find(i => i.id === itemId)
    if (!item) return
    if (item.status !== "pending" && item.status !== "scheduled") return

    let client = global.marketplaceClient
    let waited = 0
    while (!client && waited < 120000) {
      await new Promise(r => setTimeout(r, 5000))
      waited += 5000
      client = global.marketplaceClient
    }

    if (!client) {
      item.status = "failed"
      item.failReason = "no active WhatsApp connection available at post time"
      await saveItems(items)
      timers.delete(itemId)
      return
    }

    const postText = item.caption || item.description || ""
    const targets = item.targetGroups || []
    const results = []

    for (const jid of targets) {
      try {
        if (!item.media.length) {
          await client.sendMessage(jid, { text: postText })
        } else {
          for (let i = 0; i < item.media.length; i++) {
            const media = item.media[i]
            const opts = i === 0 ? { caption: postText } : {}
            if (media.type === "video") {
              await client.sendMessage(jid, { video: { url: media.url }, ...opts })
            } else {
              await client.sendMessage(jid, { image: { url: media.url }, ...opts })
            }
          }
        }
        results.push({ jid, ok: true })
      } catch (e) {
        console.log("marketplace post error", jid, e)
        results.push({ jid, ok: false, error: e.message })
      }
    }

    item.postLog = results
    item.postedAt = Date.now()
    item.status = results.some(r => r.ok) ? "posted" : "failed"
    if (item.status === "failed" && !item.failReason) item.failReason = "all targets failed to send"
    await saveItems(items)
    timers.delete(itemId)

    try {
      const okCount = results.filter(r => r.ok).length
      await client.sendMessage(getOwnerJid(), {
        text: `📦 ${item.id} posted: ${okCount}/${results.length} groups succeeded${item.status === "failed" ? " — marked FAILED" : ""}`,
      })
    } catch (_) {}
  } catch (e) {
    console.log("performPost error", e)
  }
}

// ── reconcile scheduled items on startup ──
;(async () => {
  try {
    let items = await getItems()
    let changed = false
    const now = Date.now()
    for (const item of items) {
      if (item.status !== "scheduled") continue
      if (!item.scheduledFor || item.scheduledFor <= now) {
        item.status = "failed"
        item.failReason = "bot was offline past the scheduled post time"
        changed = true
      } else {
        scheduleItemPost(item.id, item.scheduledFor - now)
      }
    }
    if (changed) await saveItems(items)
  } catch (e) {
    console.log("marketplace startup reconcile error", e)
  }
})()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .item COMMAND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({
  cmd: "item",
  desc: "manage marketplace items (add, edit, schedule, post)",
  fromMe: wtype,
  type: "tools",
}, async (m, text, c) => {
  try {
    if (!marketAuthorized(m)) return await m.send("_✘ Not authorized for marketplace commands._")

    const parts = (text || "").trim().split(/\s+/)
    const first = parts[0]?.toLowerCase()

    if (!first) {
      return await m.send(
`\`\`\`┌─────────❖
│▸ MARKETPLACE ITEMS
└─────────❖
${c} new <description>   - start a new draft
${c} grab                - (reply to image/video) attach it to draft
${c} done                - finalize draft into a saved item
${c} cancel              - discard the active draft
${c} list [status]        - list items (pending/scheduled/posted/failed)
${c} view <id>            - view full item detail
${c} <id> price <value>
${c} <id> caption <text>
${c} <id> contact <text>
${c} <id> link <url>
${c} <id> post <targets> <now|at HH:mm|10m|2h>
${c} <id> cancelpost      - revert a scheduled item to pending
${c} <id> delete          - delete an item

targets = comma-separated group category names and/or
raw group JIDs. Set categories with ${prefix}groupcat\`\`\``
      )
    }

    // ── draft lifecycle ──
    if (first === "new") {
      if (drafts.has(m.sender)) return await m.send("_✘ You already have an active draft — finish it with `item done` or discard with `item cancel` first._")
      const description = parts.slice(1).join(" ")
      drafts.set(m.sender, { description, media: [], startedAt: Date.now() })
      return await m.send(`\`\`\`✓ Draft started${description ? `\nDescription: ${description}` : ""}\nNow reply to each image/video with "${c} grab" to attach it, then "${c} done" to save.\`\`\``)
    }

    if (first === "grab") {
      const draft = drafts.get(m.sender)
      if (!draft) return await m.send(`_✘ No active draft — start one with ${c} new <description>_`)

      const src = m.quoted?.image || m.quoted?.video ? m.quoted : (m.image || m.video ? m : null)
      if (!src) return await m.send("_✘ Reply to an image or video message with this command_")

      const type = src.video ? "video" : "image"
      let path
      try {
        path = await m.client.dlandsave(src)
        const url = await m.upload(path)
        draft.media.push({ type, url })
      } catch (e) {
        console.log("marketplace grab error", e)
        return await m.send("_✘ Failed to upload that media, try again_")
      } finally {
        if (path && fs.existsSync(path)) fs.unlinkSync(path)
      }

      return await m.send(`\`\`\`✓ Attached (${draft.media.length} media so far)\`\`\``)
    }

    if (first === "cancel") {
      if (!drafts.has(m.sender)) return await m.send("_No active draft to cancel_")
      drafts.delete(m.sender)
      return await m.send("```✓ Draft discarded```")
    }

    if (first === "done") {
      const draft = drafts.get(m.sender)
      if (!draft) return await m.send(`_✘ No active draft — start one with ${c} new <description>_`)
      if (!draft.media.length) return await m.send(`_✘ Draft has no media yet — reply to images/videos with ${c} grab first, or ${c} cancel to discard_`)

      const id = await nextItemId()
      const items = await getItems()
      items.push({
        id,
        addedBy: m.sender,
        createdAt: Date.now(),
        media: draft.media,
        description: draft.description || "",
        price: null,
        caption: null,
        contact: null,
        link: null,
        status: "pending",
        scheduledFor: null,
        targetGroups: [],
        postedAt: null,
        postLog: [],
        failReason: null,
      })
      await saveItems(items)
      drafts.delete(m.sender)
      return await m.send(`\`\`\`✓ Saved as ${id}\nMedia: ${draft.media.length}\nStatus: pending\n\nEdit with ${c} ${id} price/caption/contact/link\nPost with ${c} ${id} post <targets> <when>\`\`\``)
    }

    // ── listing ──
    if (first === "list") {
      const filter = parts[1]?.toLowerCase()
      const items = await getItems()
      const filtered = filter ? items.filter(i => i.status === filter) : items
      if (!filtered.length) return await m.send(`_No items${filter ? ` with status "${filter}"` : ""}_`)

      const lines = filtered
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(i => {
          const desc = (i.caption || i.description || "").slice(0, 40)
          return `${i.id} [${i.status}] ${i.media.length} media — ${desc}${desc.length === 40 ? "..." : ""}`
        })
      return await m.send(`\`\`\`┌─────────❖\n│▸ ITEMS${filter ? ` (${filter})` : ""}\n└─────────❖\n${lines.join("\n")}\`\`\``)
    }

    // ── view ──
    if (first === "view") {
      const items = await getItems()
      const item = resolveItem(parts[1], items)
      if (!item) return await m.send("_✘ Item not found_")

      let detail = `\`\`\`┌─────────❖
│▸ ${item.id}
└─────────❖
Status: ${item.status}
Media: ${item.media.length}
Description: ${item.description || "-"}
Price: ${item.price || "-"}
Caption: ${item.caption || "-"}
Contact: ${item.contact || "-"}
Link: ${item.link || "-"}
Targets: ${item.targetGroups?.length || 0} group(s)
${item.scheduledFor ? `Scheduled for: ${new Date(item.scheduledFor).toLocaleString()}\n` : ""}${item.status === "failed" && item.failReason ? `Fail reason: ${item.failReason}\n` : ""}\`\`\``
      await m.send(detail)

      const previewCount = Math.min(item.media.length, 5)
      for (let i = 0; i < previewCount; i++) {
        const media = item.media[i]
        await m.send(media.url, {}, media.type === "video" ? "video" : "image")
      }
      if (item.media.length > previewCount) {
        await m.send(`_...and ${item.media.length - previewCount} more (not shown)_`)
      }
      return
    }

    // ── anything else: <id> <subcommand> ... ──
    const items = await getItems()
    const item = resolveItem(first, items)
    if (!item) return await m.send(`_✘ Unknown option or item "${first}" — use ${c} for help_`)

    const sub = parts[1]?.toLowerCase()
    const value = parts.slice(2).join(" ")

    if (sub === "price") {
      if (!value) return await m.send(`_Usage: ${c} ${item.id} price 5000_`)
      item.price = value
      await saveItems(items)
      return await m.send(`\`\`\`✓ ${item.id} price set: ${value}\`\`\``)
    }

    if (sub === "caption") {
      if (!value) return await m.send(`_Usage: ${c} ${item.id} caption <text>_`)
      item.caption = value
      await saveItems(items)
      return await m.send(`\`\`\`✓ ${item.id} caption set\`\`\``)
    }

    if (sub === "contact") {
      if (!value) return await m.send(`_Usage: ${c} ${item.id} contact <text>_`)
      item.contact = value
      await saveItems(items)
      return await m.send(`\`\`\`✓ ${item.id} contact set\`\`\``)
    }

    if (sub === "link") {
      if (!value) return await m.send(`_Usage: ${c} ${item.id} link <url>_`)
      item.link = value
      await saveItems(items)
      return await m.send(`\`\`\`✓ ${item.id} link set\`\`\``)
    }

    if (sub === "delete") {
      if (item.status === "scheduled" && timers.has(item.id)) {
        clearTimeout(timers.get(item.id))
        timers.delete(item.id)
      }
      const filtered = items.filter(i => i.id !== item.id)
      await saveItems(filtered)
      return await m.send(`\`\`\`✓ ${item.id} deleted\`\`\``)
    }

    if (sub === "cancelpost") {
      if (item.status !== "scheduled") return await m.send(`_${item.id} isn't scheduled_`)
      if (timers.has(item.id)) { clearTimeout(timers.get(item.id)); timers.delete(item.id) }
      item.status = "pending"
      item.scheduledFor = null
      await saveItems(items)
      return await m.send(`\`\`\`✓ ${item.id} reverted to pending\`\`\``)
    }

    if (sub === "post") {
      if (item.status === "posted") return await m.send(`_${item.id} was already posted — check ${c} view ${item.id}_`)
      if (!value) return await m.send(`_Usage: ${c} ${item.id} post <targets> <now|at 18:00|30m|2h>_`)

      const postText = item.caption || item.description || ""
      if (!postText) return await m.send(`_✘ ${item.id} has no caption or description — set one first, nothing to post_`)

      // last whitespace-separated token(s) are the "when"; try trailing
      // "at HH:mm" (2 tokens) first, then a single trailing token, else "now"
      const valueParts = value.trim().split(/\s+/)
      let whenStr = "now"
      let targetsStr = value

      if (valueParts.length >= 2 && valueParts[valueParts.length - 2].toLowerCase() === "at") {
        whenStr = valueParts.slice(-2).join(" ")
        targetsStr = valueParts.slice(0, -2).join(" ")
      } else if (valueParts.length >= 2) {
        const maybeWhen = valueParts[valueParts.length - 1]
        if (parseWhen(maybeWhen)) {
          whenStr = maybeWhen
          targetsStr = valueParts.slice(0, -1).join(" ")
        }
      }

      const when = parseWhen(whenStr)
      if (!when) return await m.send(`_✘ Couldn't understand the time "${whenStr}" — try now, at 18:00, 30m, or 2h_`)

      const { jids, unresolved } = await resolveTargets(targetsStr)
      if (unresolved.length) return await m.send(`_✘ Unknown target(s): ${unresolved.join(", ")}_\n_Use exact group JIDs or a category from ${prefix}groupcat list_`)
      if (!jids.length) return await m.send("_✘ No valid targets resolved_")

      item.targetGroups = jids

      if (when.type === "now") {
        item.status = "pending"
        await saveItems(items)
        await m.send(`\`\`\`⏳ Posting ${item.id} to ${jids.length} group(s)...\`\`\``)
        await performPost(item.id)
        return
      }

      const delayMs = when.type === "delay" ? when.ms : when.date.getTime() - Date.now()
      item.status = "scheduled"
      item.scheduledFor = Date.now() + delayMs
      await saveItems(items)
      scheduleItemPost(item.id, delayMs)
      return await m.send(`\`\`\`✓ ${item.id} scheduled for ${new Date(item.scheduledFor).toLocaleString()}\nTargets: ${jids.length} group(s)\`\`\``)
    }

    return await m.send(`_✘ Unknown subcommand "${sub}" for ${item.id} — use ${c} for help_`)
  } catch (e) {
    console.log("item cmd error", e)
    return await m.sendErr(e)
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .groupcat COMMAND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({
  cmd: "groupcat",
  desc: "manage named group categories for marketplace posting",
  fromMe: wtype,
  type: "tools",
}, async (m, text, c) => {
  try {
    if (!marketAuthorized(m)) return await m.send("_✘ Not authorized for marketplace commands._")

    const parts = (text || "").trim().split(/\s+/)
    const sub = parts[0]?.toLowerCase()

    if (!sub) {
      return await m.send(
`\`\`\`┌─────────❖
│▸ GROUP CATEGORIES
└─────────❖
${c} add <name> <jid1,jid2,...>
${c} addhere <name>       - add the CURRENT group to a category
${c} removegroup <name> <jid>
${c} remove <name>
${c} list\`\`\``
      )
    }

    let cats = await getCategories()

    if (sub === "list") {
      if (!cats.length) return await m.send("_No categories set up yet_")
      const lines = cats.map(c2 => `${c2.name}: ${c2.groups.length} group(s)`)
      return await m.send(`\`\`\`┌─────────❖\n│▸ CATEGORIES\n└─────────❖\n${lines.join("\n")}\`\`\``)
    }

    if (sub === "add") {
      const name = parts[1]
      const groupsStr = parts.slice(2).join(" ")
      if (!name || !groupsStr) return await m.send(`_Usage: ${c} add electronics 12036xxx@g.us,12036yyy@g.us_`)
      const groupJids = groupsStr.split(",").map(g => g.trim()).filter(g => g.endsWith("@g.us"))
      if (!groupJids.length) return await m.send("_✘ No valid group JIDs found (must end in @g.us)_")

      let cat = cats.find(c2 => c2.name.toLowerCase() === name.toLowerCase())
      if (cat) {
        groupJids.forEach(g => { if (!cat.groups.includes(g)) cat.groups.push(g) })
      } else {
        cat = { name, groups: groupJids }
        cats.push(cat)
      }
      await saveCategories(cats)
      return await m.send(`\`\`\`✓ Category "${name}" now has ${cat.groups.length} group(s)\`\`\``)
    }

    if (sub === "addhere") {
      if (!m.isGroup) return await m.send("_✘ Run this inside the group you want to add_")
      const name = parts[1]
      if (!name) return await m.send(`_Usage: ${c} addhere electronics_`)
      let cat = cats.find(c2 => c2.name.toLowerCase() === name.toLowerCase())
      if (cat) {
        if (!cat.groups.includes(m.chat)) cat.groups.push(m.chat)
      } else {
        cat = { name, groups: [m.chat] }
        cats.push(cat)
      }
      await saveCategories(cats)
      return await m.send(`\`\`\`✓ This group added to "${name}" (${cat.groups.length} group(s) total)\`\`\``)
    }

    if (sub === "removegroup") {
      const name = parts[1]
      const jid = parts[2]
      if (!name || !jid) return await m.send(`_Usage: ${c} removegroup electronics 12036xxx@g.us_`)
      const cat = cats.find(c2 => c2.name.toLowerCase() === name.toLowerCase())
      if (!cat) return await m.send(`_✘ Category "${name}" not found_`)
      cat.groups = cat.groups.filter(g => g !== jid)
      await saveCategories(cats)
      return await m.send(`\`\`\`✓ Removed from "${name}" (${cat.groups.length} group(s) left)\`\`\``)
    }

    if (sub === "remove") {
      const name = parts[1]
      if (!name) return await m.send(`_Usage: ${c} remove electronics_`)
      const before = cats.length
      cats = cats.filter(c2 => c2.name.toLowerCase() !== name.toLowerCase())
      if (cats.length === before) return await m.send(`_✘ Category "${name}" not found_`)
      await saveCategories(cats)
      return await m.send(`\`\`\`✓ Category "${name}" deleted\`\`\``)
    }

    return await m.send(`_✘ Unknown option "${sub}" — use ${c} for help_`)
  } catch (e) {
    console.log("groupcat cmd error", e)
    return await m.sendErr(e)
  }
})
