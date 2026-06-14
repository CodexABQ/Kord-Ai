const { kord, wtype, prefix, config, getData, storeData, isAdmin } = require("../core")
const { MongoClient } = require("mongodb")
const triviaData = require("./data/trivia.json")
const scrambleData = require("./data/scramble.json")
const pre = prefix


const MONGO_URI = config().MONGODB_URI || config().ECONOMY_MONGO || ""
let _econDB = null
let _econClient = null

async function getEconDB() {
  if (_econDB) return _econDB
  if (!MONGO_URI) throw new Error("MONGODB_URI not set in config")
  _econClient = new MongoClient(MONGO_URI, { tls: true, serverSelectionTimeoutMS: 8000 })
  await _econClient.connect()
  _econDB = _econClient.db()
  return _econDB
}

async function econCol(name) {
  const db = await getEconDB()
  return db.collection(name)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONSTANTS & CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ₦ = "₦"
const E = {
  DAILY_MIN: 300, DAILY_MAX: 500,
  WEEKLY: 2000,
  WORK_MIN: 80, WORK_MAX: 220,
  WORK_CD: 2 * 60 * 60 * 1000,        // 2 hours
  DAILY_CD: 24 * 60 * 60 * 1000,
  WEEKLY_CD: 7 * 24 * 60 * 60 * 1000,
  ROB_CD: 4 * 60 * 60 * 1000,
  LOAN_INTEREST: 0.15,
  LOAN_BAD_INTEREST: 0.30,
  LOAN_DURATION: 7 * 24 * 60 * 60 * 1000,
  STREAK_BONUS: 50,                    // bonus per day of streak
  TITLE_DURATION: 7 * 24 * 60 * 60 * 1000,
  BANK_BASE_CAP: 50000,
}

// Decorative symbols pool
const SYM = ["✦","✧","✪","✭","✮","✯","ꕥ","᭄","✱","◔","۞","☬","✜","𖤓","✰","✩"]
const rs = () => SYM[Math.floor(Math.random() * SYM.length)]

const TITLES = {
  "shadow":      { price: 800,  label: "𖤐 Shadow",       badge: "𖤐" },
  "millionaire": { price: 5000, label: "✦ Millionaire",   badge: "✦" },
  "gambler":     { price: 600,  label: "🎰 Gambler",      badge: "🎰" },
  "professor":   { price: 1200, label: "✜ Professor",     badge: "✜" },
  "legend":      { price: 8000, label: "✰ Legend",        badge: "✰" },
  "hustler":     { price: 400,  label: "⚡ Hustler",      badge: "⚡" },
  "phantom":     { price: 2000, label: "☬ Phantom",       badge: "☬" },
  "oracle":      { price: 3500, label: "᭄ Oracle",        badge: "᭄" },
  "warlord":     { price: 4500, label: "☠︎ Warlord",      badge: "☠︎" },
  "tycoon":      { price: 6000, label: "ꕥ Tycoon",       badge: "ꕥ" },
}

const BUSINESSES = {
  "bakery":     { price: 1500,  yield_min: 80,  yield_max: 150, cd: 4 * 3600000, emoji: "🥖" },
  "fishingboat":{ price: 2500,  yield_min: 120, yield_max: 250, cd: 6 * 3600000, emoji: "🚢" },
  "internetcafe":{ price: 4000, yield_min: 200, yield_max: 400, cd: 8 * 3600000, emoji: "💻" },
  "lemonadestand":{ price: 800, yield_min: 40,  yield_max: 90,  cd: 2 * 3600000, emoji: "🍋" },
  "cryptorig":  { price: 8000,  yield_min: 300, yield_max: 700, cd: 12 * 3600000, emoji: "⛏️" },
  "petrolstation":{ price: 6000,yield_min: 250, yield_max: 500, cd: 10 * 3600000, emoji: "⛽" },
  "restaurant": { price: 3000,  yield_min: 150, yield_max: 300, cd: 5 * 3600000,  emoji: "🍽️" },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ECONOMY GUARD — check if economy is active in chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function econActive(m) {
  const chats = await getData("econ") || []
  if (!chats.includes(m.chat)) {
    await m.send(`╔══〔 ${rs()}〕══╗\n╠ 💎 Economy is not active here.\n╠ Admin: use *${pre}economy on* to activate\n╚══════════════╝`)
    return false
  }
  return true
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  USER DATA HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getUser(jid) {
  const col = await econCol("users")
  let user = await col.findOne({ jid })
  if (!user) {
    user = {
      jid,
      wallet: 500,          // starter coins
      bank: 0,
      bankCap: E.BANK_BASE_CAP,
      totalEarned: 500,
      lastDaily: 0,
      lastWeekly: 0,
      lastWork: 0,
      lastRob: 0,
      streak: 0,
      lastStreakDay: 0,
      creditScore: 100,
      loan: null,           // { amount, due, interest }
      defaulted: false,
      title: null,          // { label, badge, expiresAt }
      businesses: {},       // { bizName: { lastCollect } }
      badges: [],
      gamesWon: 0,
      totalGambled: 0,
      createdAt: Date.now()
    }
    await col.insertOne(user)
  }
  return user
}

async function saveUser(jid, update) {
  const col = await econCol("users")
  await col.updateOne({ jid }, { $set: update }, { upsert: true })
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString()
}

function fmtCD(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getTitle(user) {
  if (!user.title) return ""
  if (Date.now() > user.title.expiresAt) return ""
  return user.title.label + " "
}

function getBadge(user) {
  if (!user.title) return "◔"
  if (Date.now() > user.title.expiresAt) return "◔"
  return user.title.badge
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ACTIVE GAME STATE (in-memory per chat)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const activeGames = new Map()   // chatId → game object
const activePots = new Map()    // chatId → pot object
const activeDuels = new Map()   // "sender_target" → duel object

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BOX BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function box(title, lines) {
  const top = `╔══〔 ${title} 〕══╗`
  const body = lines.map(l => `╠  ${l}`).join("\n")
  return `${top}\n${body}\n╚══════════════════╝`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❶ ECONOMY TOGGLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "economy|econ", desc: "Toggle economy system", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!config().MONGODB_URI && !config().ECONOMY_MONGO)
      return await m.send(box("⚠️ Setup Required", [
        "Set MONGODB_URI in your config",
        "Example: setvar MONGODB_URI=mongodb://..."
      ]))
    const adm = await isAdmin(m)
    if (!adm) return await m.send(`╠ ${rs()} Admins only.`)
    let chats = await getData("econ") || []
    const t = text?.toLowerCase()
    if (t === "off") {
      chats = chats.filter(c => c !== m.chat)
      await storeData("econ", chats)
      return await m.send(box("📉 Economy Deactivated", ["Economy commands are now off in this group."]))
    }
    if (!chats.includes(m.chat)) chats.push(m.chat)
    await storeData("econ", chats)
    return await m.send(box(`${rs()} Economy Activated`, [
      "The economy is now live in this group.",
      `Use *${pre}ehelp* to see all commands.`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❷ ECONOMY HELP MENU
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "ehelp|emenu|economyhelp", desc: "Economy command list", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const p = pre
    return await m.send(
`╔══〔 ${rs()}✦ ECONOMY MENU ✦${rs()} 〕══╗
╠
╠  ✧ *WALLET & BANK*
╠  ${p}bal — Check your balance
╠  ${p}dep [amount/all] — Deposit to bank
╠  ${p}with [amount/all] — Withdraw from bank
╠  ${p}profile [@user] — View economy profile
╠
╠  ✦ *EARNING*
╠  ${p}daily — Claim daily reward (24h)
╠  ${p}weekly — Claim weekly bonus (7d)
╠  ${p}work — Work for coins (2h cooldown)
╠  ${p}collect — Collect business income
╠
╠  ᵕ̈ *BUSINESSES*
╠  ${p}buybiz [name] — Buy a business
╠  ${p}mybiz — View your businesses
╠  ${p}bizlist — See all available businesses
╠
╠  ☬ *SOCIAL*
╠  ${p}pay @user [amount] — Send coins
╠  ${p}rob @user — Attempt robbery
╠  ${p}lb — Economy leaderboard
╠
╠  🏦 *LOANS*
╠  ${p}loan [amount] — Take a loan
╠  ${p}repay — Repay your loan
╠  ${p}myloan — View loan details
╠
╠  ✰ *SHOP & TITLES*
╠  ${p}shop — View the shop
╠  ${p}buy title [name] — Buy a title (7 days)
╠  ${p}titles — See all available titles
╠  ${p}inv — Your inventory
╠
╠  🎮 *GAMES*
╠  ${p}trivia — Trivia question (group race)
╠  ${p}scramble — Word scramble game
╠  ${p}numguess — Number guessing game
╠  ${p}mathrace — Math race for coins
╠
╠  🎰 *GAMBLING*
╠  ${p}slots [amount] — Spin the slot machine
╠  ${p}cf @user [amount] — Coinflip PvP duel
╠  ${p}joinpot [amount] — Join the group jackpot
╠  ${p}startpot [amount] — Start a jackpot round
╠
╚══════════════════════════════╝`)
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❸ BALANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "bal|wallet", desc: "Check balance", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const title = getTitle(u)
    const net = u.wallet + u.bank
    return await m.send(box(`${rs()} ${title}${m.pushName || m.sender.split("@")[0]}`, [
      `💎 Wallet:  ${₦}${fmtNum(u.wallet)}`,
      `🏦 Bank:    ${₦}${fmtNum(u.bank)} / ${₦}${fmtNum(u.bankCap)}`,
      `📊 Net Worth: ${₦}${fmtNum(net)}`,
      `🔥 Streak:  ${u.streak} day${u.streak !== 1 ? "s" : ""}`,
      `📈 Credit:  ${u.creditScore}/100`,
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❹ PROFILE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "profile|eprofile", desc: "Economy profile card", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender
    const u = await getUser(target)
    const name = target === m.sender ? (m.pushName || m.sender.split("@")[0]) : target.split("@")[0]
    const title = getTitle(u)
    const badge = getBadge(u)
    const titleExpiry = u.title && Date.now() < u.title.expiresAt
      ? `expires in ${fmtCD(u.title.expiresAt - Date.now())}` : "No active title"
    const bizNames = Object.keys(u.businesses || {})
    return await m.send(
`╔══〔 ${badge} ${title}${name} 〕══╗
╠
╠  ✦ *FINANCES*
╠  💎 Wallet:    ${₦}${fmtNum(u.wallet)}
╠  🏦 Bank:      ${₦}${fmtNum(u.bank)}
╠  📊 Net Worth: ${₦}${fmtNum(u.wallet + u.bank)}
╠  💰 Total Earned: ${₦}${fmtNum(u.totalEarned)}
╠
╠  ᵕ̈ *STANDING*
╠  🔥 Daily Streak: ${u.streak} day${u.streak !== 1 ? "s" : ""}
╠  📈 Credit Score: ${u.creditScore}/100
╠  🎮 Games Won: ${u.gamesWon}
╠  🎲 Total Gambled: ${₦}${fmtNum(u.totalGambled)}
╠
╠  ✰ *TITLE*
╠  ${title || "None"} (${titleExpiry})
╠
╠  🏢 *BUSINESSES* (${bizNames.length})
╠  ${bizNames.length ? bizNames.map(b => BUSINESSES[b]?.emoji + " " + b).join(", ") : "None yet"}
╠
╚══════════════════════════════╝`)
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❺ DAILY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "daily", desc: "Claim daily reward", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const now = Date.now()
    const cd = E.DAILY_CD - (now - u.lastDaily)
    if (cd > 0) return await m.send(box(`⏱️ Daily Cooldown`, [
      `You've already claimed today.`,
      `Come back in: *${fmtCD(cd)}*`
    ]))
    // Streak logic
    const lastDay = new Date(u.lastStreakDay).toDateString()
    const today = new Date(now).toDateString()
    const yesterday = new Date(now - 86400000).toDateString()
    let newStreak = lastDay === yesterday ? u.streak + 1 : 1
    const base = rand(E.DAILY_MIN, E.DAILY_MAX)
    const streakBonus = Math.min(newStreak * E.STREAK_BONUS, 500)
    const total = base + streakBonus
    await saveUser(m.sender, {
      wallet: u.wallet + total,
      totalEarned: u.totalEarned + total,
      lastDaily: now,
      streak: newStreak,
      lastStreakDay: now
    })
    return await m.send(box(`🎁 Daily Claimed ${rs()}`, [
      `Base Reward:   ${₦}${fmtNum(base)}`,
      `Streak Bonus:  ${₦}${fmtNum(streakBonus)} (🔥 Day ${newStreak})`,
      `━━━━━━━━━━━━━━`,
      `Total Earned:  ${₦}${fmtNum(total)}`,
      `New Balance:   ${₦}${fmtNum(u.wallet + total)}`,
      `Come back in:  24 hours`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❻ WEEKLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "weekly", desc: "Claim weekly bonus", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const now = Date.now()
    const cd = E.WEEKLY_CD - (now - u.lastWeekly)
    if (cd > 0) return await m.send(box(`⏱️ Weekly Cooldown`, [
      `Already claimed this week.`,
      `Come back in: *${fmtCD(cd)}*`
    ]))
    await saveUser(m.sender, {
      wallet: u.wallet + E.WEEKLY,
      totalEarned: u.totalEarned + E.WEEKLY,
      lastWeekly: now
    })
    return await m.send(box(`${rs()} Weekly Bonus`, [
      `Reward:       ${₦}${fmtNum(E.WEEKLY)}`,
      `New Balance:  ${₦}${fmtNum(u.wallet + E.WEEKLY)}`,
      `Come back in: 7 days`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❼ WORK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "work", desc: "Work to earn coins", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const now = Date.now()
    const cd = E.WORK_CD - (now - u.lastWork)
    if (cd > 0) return await m.send(box(`😴 Still Tired`, [
      `You're still recovering from your last shift.`,
      `Rest for: *${fmtCD(cd)}*`
    ]))
    const jobs = [
      { name: "Software Developer", emoji: "💻" },
      { name: "Market Trader", emoji: "🛒" },
      { name: "Teacher", emoji: "📚" },
      { name: "Mechanic", emoji: "🔧" },
      { name: "Chef", emoji: "🍳" },
      { name: "Security Guard", emoji: "🛡️" },
      { name: "Delivery Rider", emoji: "🛵" },
      { name: "Photographer", emoji: "📷" },
      { name: "Barber", emoji: "✂️" },
      { name: "Doctor", emoji: "🏥" },
    ]
    const job = jobs[Math.floor(Math.random() * jobs.length)]
    const earned = rand(E.WORK_MIN, E.WORK_MAX)
    await saveUser(m.sender, {
      wallet: u.wallet + earned,
      totalEarned: u.totalEarned + earned,
      lastWork: now
    })
    return await m.send(box(`${job.emoji} Work Complete`, [
      `Job:       ${job.name}`,
      `Earned:    ${₦}${fmtNum(earned)}`,
      `Balance:   ${₦}${fmtNum(u.wallet + earned)}`,
      `Rest for:  2 hours before next shift`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❽ DEPOSIT & WITHDRAW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "dep|deposit", desc: "Deposit to bank", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (!text) return await m.send(`╠ Provide an amount. Example: *${pre}dep 1000* or *${pre}dep all*`)
    const u = await getUser(m.sender)
    const amount = text.toLowerCase() === "all" ? u.wallet : parseInt(text)
    if (!amount || amount <= 0 || isNaN(amount)) return await m.send(`╠ ${rs()} Invalid amount.`)
    if (amount > u.wallet) return await m.send(`╠ 💸 Insufficient wallet balance. You have ${₦}${fmtNum(u.wallet)}`)
    const space = u.bankCap - u.bank
    if (space <= 0) return await m.send(`╠ 🏦 Bank is full. (${₦}${fmtNum(u.bank)}/${₦}${fmtNum(u.bankCap)})`)
    const dep = Math.min(amount, space)
    await saveUser(m.sender, { wallet: u.wallet - dep, bank: u.bank + dep })
    return await m.send(box(`🏦 Deposit Success`, [
      `Deposited:    ${₦}${fmtNum(dep)}`,
      `Wallet Now:   ${₦}${fmtNum(u.wallet - dep)}`,
      `Bank Now:     ${₦}${fmtNum(u.bank + dep)} / ${₦}${fmtNum(u.bankCap)}`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "with|withdraw", desc: "Withdraw from bank", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (!text) return await m.send(`╠ Provide an amount. Example: *${pre}with 500* or *${pre}with all*`)
    const u = await getUser(m.sender)
    const amount = text.toLowerCase() === "all" ? u.bank : parseInt(text)
    if (!amount || amount <= 0 || isNaN(amount)) return await m.send(`╠ ${rs()} Invalid amount.`)
    if (amount > u.bank) return await m.send(`╠ 💸 Insufficient bank balance. Bank: ${₦}${fmtNum(u.bank)}`)
    await saveUser(m.sender, { wallet: u.wallet + amount, bank: u.bank - amount })
    return await m.send(box(`💸 Withdrawal`, [
      `Withdrawn:    ${₦}${fmtNum(amount)}`,
      `Wallet Now:   ${₦}${fmtNum(u.wallet + amount)}`,
      `Bank Now:     ${₦}${fmtNum(u.bank - amount)}`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❾ PAY / GIFT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "pay|give|gift", desc: "Send coins to someone", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    const target = m.mentionedJid[0] || m.quoted?.sender
    if (!target) return await m.send(`╠ ${rs()} Mention or reply to who you want to pay.`)
    if (target === m.sender) return await m.send(`╠ ${rs()} You can't pay yourself.`)
    const amount = parseInt(text?.replace(/@\S+/g, "").trim())
    if (!amount || amount <= 0 || isNaN(amount)) return await m.send(`╠ ${rs()} Invalid amount.`)
    const u = await getUser(m.sender)
    if (u.wallet < amount) return await m.send(`╠ 💸 Not enough in wallet. You have ${₦}${fmtNum(u.wallet)}`)
    const t = await getUser(target)
    await saveUser(m.sender, { wallet: u.wallet - amount })
    await saveUser(target, { wallet: t.wallet + amount, totalEarned: t.totalEarned + amount })
    return await m.send(box(`💸 Payment Sent ${rs()}`, [
      `Sent:       ${₦}${fmtNum(amount)}`,
      `To:         @${target.split("@")[0]}`,
      `Your Wallet: ${₦}${fmtNum(u.wallet - amount)}`
    ]), { mentions: [target] })
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❿ ROB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "rob", desc: "Rob someone", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    const target = m.mentionedJid[0] || m.quoted?.sender
    if (!target) return await m.send(`╠ ${rs()} Mention or reply to who you want to rob.`)
    if (target === m.sender) return await m.send(`╠ ${rs()} You can't rob yourself.`)
    const u = await getUser(m.sender)
    const now = Date.now()
    const cd = E.ROB_CD - (now - u.lastRob)
    if (cd > 0) return await m.send(box(`🚨 Lay Low`, [
      `You're still being watched.`,
      `Try again in: *${fmtCD(cd)}*`
    ]))
    const t = await getUser(target)
    if (t.wallet < 200) return await m.send(`╠ ${rs()} @${target.split("@")[0]} is broke. Not worth the risk.`, { mentions: [target] })
    const success = Math.random() < 0.45  // 45% success rate
    if (success) {
      const stolen = rand(Math.floor(t.wallet * 0.1), Math.floor(t.wallet * 0.3))
      await saveUser(m.sender, { wallet: u.wallet + stolen, lastRob: now, totalEarned: u.totalEarned + stolen })
      await saveUser(target, { wallet: t.wallet - stolen })
      return await m.send(box(`😈 Robbery Success ${rs()}`, [
        `You robbed @${target.split("@")[0]}`,
        `Stolen:      ${₦}${fmtNum(stolen)}`,
        `Your Wallet: ${₦}${fmtNum(u.wallet + stolen)}`
      ]), { mentions: [target] })
    } else {
      const fine = rand(100, 300)
      const actualFine = Math.min(fine, u.wallet)
      await saveUser(m.sender, { wallet: u.wallet - actualFine, lastRob: now })
      // Credit score penalty
      const newCredit = Math.max(0, u.creditScore - 3)
      await saveUser(m.sender, { creditScore: newCredit })
      return await m.send(box(`🚨 Caught! ${rs()}`, [
        `You got caught trying to rob @${target.split("@")[0]}`,
        `Fine:        ${₦}${fmtNum(actualFine)}`,
        `Your Wallet: ${₦}${fmtNum(u.wallet - actualFine)}`,
        `Credit Score: ${newCredit}/100 (-3)`
      ]), { mentions: [target] })
    }
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓫ LOANS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "loan", desc: "Take a loan", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    if (u.loan) return await m.send(box(`🏦 Existing Loan`, [
      `You already have an active loan.`,
      `Use *${pre}myloan* to view details.`,
      `Use *${pre}repay* to pay it off first.`
    ]))
    const amount = parseInt(text)
    if (!amount || amount <= 0 || isNaN(amount)) return await m.send(`╠ Provide an amount. Example: *${pre}loan 2000*`)
    const maxLoan = Math.floor(u.creditScore * 100)
    if (amount > maxLoan) return await m.send(box(`⚠️ Loan Limit`, [
      `Your credit score limits you to ${₦}${fmtNum(maxLoan)}`,
      `Current Credit: ${u.creditScore}/100`,
      `Improve credit by repaying loans on time.`
    ]))
    const interest = u.defaulted ? E.LOAN_BAD_INTEREST : E.LOAN_INTEREST
    const due = amount + Math.floor(amount * interest)
    const dueDate = Date.now() + E.LOAN_DURATION
    await saveUser(m.sender, {
      wallet: u.wallet + amount,
      totalEarned: u.totalEarned + amount,
      loan: { amount, due, interest, dueDate }
    })
    return await m.send(box(`🏦 Loan Approved ${rs()}`, [
      `Borrowed:   ${₦}${fmtNum(amount)}`,
      `Interest:   ${(interest * 100).toFixed(0)}%${u.defaulted ? " ⚠️ (Defaulter Rate)" : ""}`,
      `Total Due:  ${₦}${fmtNum(due)}`,
      `Repay By:   7 days`,
      `━━━━━━━━━━━━━━━`,
      `⚠️ Default = credit score drops + 30% rate next time`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "myloan|loaninfo", desc: "View your loan", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    if (!u.loan) return await m.send(box(`🏦 No Active Loan`, [`You have no outstanding loans.`]))
    const now = Date.now()
    const overdue = now > u.loan.dueDate
    const timeLeft = overdue ? 0 : u.loan.dueDate - now
    return await m.send(box(`🏦 Your Loan ${overdue ? "⚠️ OVERDUE" : ""}`, [
      `Borrowed:   ${₦}${fmtNum(u.loan.amount)}`,
      `Total Due:  ${₦}${fmtNum(u.loan.due)}`,
      `Interest:   ${(u.loan.interest * 100).toFixed(0)}%`,
      overdue
        ? `Status:     ⚠️ OVERDUE — credit damaged`
        : `Time Left:  ${fmtCD(timeLeft)}`,
      `Credit Score: ${u.creditScore}/100`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "repay|repayloan", desc: "Repay your loan", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    if (!u.loan) return await m.send(`╠ ${rs()} You have no active loan.`)
    if (u.wallet < u.loan.due) return await m.send(box(`💸 Insufficient Funds`, [
      `You owe: ${₦}${fmtNum(u.loan.due)}`,
      `Wallet:  ${₦}${fmtNum(u.wallet)}`,
      `Short:   ${₦}${fmtNum(u.loan.due - u.wallet)}`,
      `Earn more or withdraw from bank.`
    ]))
    const now = Date.now()
    const onTime = now <= u.loan.dueDate
    const creditGain = onTime ? 5 : -10
    const newCredit = Math.max(0, Math.min(100, u.creditScore + creditGain))
    await saveUser(m.sender, {
      wallet: u.wallet - u.loan.due,
      loan: null,
      defaulted: !onTime,
      creditScore: newCredit
    })
    return await m.send(box(`${onTime ? "✅" : "⚠️"} Loan Repaid`, [
      `Paid:         ${₦}${fmtNum(u.loan.due)}`,
      `Status:       ${onTime ? "On Time ✓" : "Late ⚠️"}`,
      `Credit Score: ${newCredit}/100 (${creditGain > 0 ? "+" : ""}${creditGain})`,
      `Wallet Now:   ${₦}${fmtNum(u.wallet - u.loan.due)}`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓬ BUSINESSES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "bizlist|businesses", desc: "List available businesses", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    let msg = `╔══〔 🏢 Available Businesses 〕══╗\n╠\n`
    for (const [key, b] of Object.entries(BUSINESSES)) {
      msg += `╠  ${b.emoji} *${key}*\n`
      msg += `╠     Price: ${₦}${fmtNum(b.price)}\n`
      msg += `╠     Earns: ${₦}${b.yield_min}–${₦}${b.yield_max} every ${b.cd / 3600000}h\n╠\n`
    }
    msg += `╠  Use *${pre}buybiz [name]* to purchase\n╚══════════════════╝`
    return await m.send(msg)
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "buybiz", desc: "Buy a business", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    const name = text?.toLowerCase().replace(/\s+/g, "")
    if (!name || !BUSINESSES[name]) return await m.send(`╠ ${rs()} Unknown business. Use *${pre}bizlist* to see options.`)
    const biz = BUSINESSES[name]
    const u = await getUser(m.sender)
    if (u.businesses?.[name]) return await m.send(`╠ ${rs()} You already own a ${biz.emoji} ${name}.`)
    if (u.wallet < biz.price) return await m.send(`╠ 💸 You need ${₦}${fmtNum(biz.price)}. You have ${₦}${fmtNum(u.wallet)}`)
    const newBiz = { ...(u.businesses || {}), [name]: { lastCollect: 0 } }
    await saveUser(m.sender, { wallet: u.wallet - biz.price, businesses: newBiz })
    return await m.send(box(`${biz.emoji} Business Acquired`, [
      `You now own a *${name}*`,
      `Cost:      ${₦}${fmtNum(biz.price)}`,
      `Income:    ${₦}${biz.yield_min}–${₦}${biz.yield_max} every ${biz.cd / 3600000}h`,
      `Use *${pre}collect* to claim income`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "mybiz|mybusiness", desc: "View your businesses", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const biz = u.businesses || {}
    if (!Object.keys(biz).length) return await m.send(`╠ ${rs()} You don't own any businesses yet. Use *${pre}bizlist* to browse.`)
    let msg = `╔══〔 🏢 Your Businesses 〕══╗\n╠\n`
    const now = Date.now()
    for (const [key, data] of Object.entries(biz)) {
      const b = BUSINESSES[key]
      if (!b) continue
      const ready = now - data.lastCollect >= b.cd
      const cdLeft = b.cd - (now - data.lastCollect)
      msg += `╠  ${b.emoji} *${key}*\n`
      msg += `╠     Status: ${ready ? "✅ Ready to collect!" : `⏱️ ${fmtCD(cdLeft)}`}\n╠\n`
    }
    msg += `╠  Use *${pre}collect* to harvest income\n╚══════════════════╝`
    return await m.send(msg)
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "collect", desc: "Collect business income", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const biz = u.businesses || {}
    if (!Object.keys(biz).length) return await m.send(`╠ ${rs()} You have no businesses. Use *${pre}buybiz* to get started.`)
    const now = Date.now()
    let totalCollected = 0
    const lines = []
    const updatedBiz = { ...biz }
    for (const [key, data] of Object.entries(biz)) {
      const b = BUSINESSES[key]
      if (!b) continue
      if (now - data.lastCollect >= b.cd) {
        const earned = rand(b.yield_min, b.yield_max)
        totalCollected += earned
        updatedBiz[key] = { lastCollect: now }
        lines.push(`${b.emoji} ${key}: ${₦}${fmtNum(earned)}`)
      }
    }
    if (!totalCollected) return await m.send(`╠ ${rs()} No businesses are ready yet. Check *${pre}mybiz*.`)
    await saveUser(m.sender, {
      wallet: u.wallet + totalCollected,
      totalEarned: u.totalEarned + totalCollected,
      businesses: updatedBiz
    })
    return await m.send(box(`${rs()} Business Income Collected`, [
      ...lines,
      `━━━━━━━━━━━━━━━`,
      `Total:       ${₦}${fmtNum(totalCollected)}`,
      `Wallet Now:  ${₦}${fmtNum(u.wallet + totalCollected)}`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓭ SHOP & TITLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "titles|titleslist", desc: "See available titles", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    let msg = `╔══〔 ✰ Available Titles 〕══╗\n╠  (All titles last 7 days)\n╠\n`
    for (const [key, t] of Object.entries(TITLES)) {
      msg += `╠  ${t.badge} *${t.label}*\n╠     Price: ${₦}${fmtNum(t.price)}\n╠\n`
    }
    msg += `╠  Use *${pre}buy title [name]* to purchase\n╚══════════════════╝`
    return await m.send(msg)
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "shop", desc: "View the shop", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    return await m.send(box(`🛒 Shop ${rs()}`, [
      `*Titles* (7 days each)`,
      `Use *${pre}titles* to see all titles`,
      `Use *${pre}buy title [name]* to purchase`,
      `━━━━━━━━━━━━━━━`,
      `*Businesses* (passive income)`,
      `Use *${pre}bizlist* to see all businesses`,
      `Use *${pre}buybiz [name]* to purchase`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "buy", desc: "Buy from shop", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (!text) return await m.send(`╠ Usage: *${pre}buy title [name]* or *${pre}buy biz [name]*`)
    const parts = text.toLowerCase().trim().split(/\s+/)
    if (parts[0] === "title") {
      const titleKey = parts[1]
      if (!titleKey || !TITLES[titleKey]) return await m.send(`╠ ${rs()} Unknown title. Use *${pre}titles* to see options.`)
      const t = TITLES[titleKey]
      const u = await getUser(m.sender)
      if (u.wallet < t.price) return await m.send(`╠ 💸 You need ${₦}${fmtNum(t.price)}. You have ${₦}${fmtNum(u.wallet)}`)
      await saveUser(m.sender, {
        wallet: u.wallet - t.price,
        title: { label: t.label, badge: t.badge, expiresAt: Date.now() + E.TITLE_DURATION }
      })
      return await m.send(box(`${t.badge} Title Equipped`, [
        `You are now: *${t.label}*`,
        `Duration:  7 days`,
        `Cost:      ${₦}${fmtNum(t.price)}`,
        `Wallet:    ${₦}${fmtNum(u.wallet - t.price)}`
      ]))
    }
    return await m.send(`╠ ${rs()} Unknown purchase. Use *${pre}shop* to browse.`)
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "inv|inventory", desc: "View inventory", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const u = await getUser(m.sender)
    const title = u.title && Date.now() < u.title.expiresAt
    const bizCount = Object.keys(u.businesses || {}).length
    return await m.send(box(`📦 Your Inventory`, [
      `✰ Title:       ${title ? u.title.label + ` (${fmtCD(u.title.expiresAt - Date.now())} left)` : "None"}`,
      `🏢 Businesses: ${bizCount} owned`,
      `🎮 Games Won:  ${u.gamesWon}`,
      `📊 Credit:     ${u.creditScore}/100`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓮ LEADERBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "lb|leaderboard|rich", desc: "Economy leaderboard", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const col = await econCol("users")
    const top = await col.find({}).sort({ wallet: -1 }).limit(10).toArray()
    if (!top.length) return await m.send(`╠ ${rs()} No economy data yet.`)
    const medals = ["🥇", "🥈", "🥉"]
    let msg = `╔══〔 ${rs()} WEALTH LEADERBOARD ${rs()} 〕══╗\n╠\n`
    const mentions = []
    top.forEach((u, i) => {
      const medal = medals[i] || `${i + 1}.`
      const tag = u.jid.split("@")[0]
      const title = u.title && Date.now() < u.title.expiresAt ? u.title.badge + " " : ""
      const net = (u.wallet || 0) + (u.bank || 0)
      msg += `╠  ${medal} ${title}@${tag}: ${₦}${fmtNum(net)}\n`
      mentions.push(u.jid)
    })
    msg += `╠\n╚══════════════════════════════╝`
    return await m.send(msg, { mentions })
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓯ SLOTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "slots|slot", desc: "Spin the slot machine", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    const bet = parseInt(text)
    if (!bet || bet < 50 || isNaN(bet)) return await m.send(`╠ Minimum bet is ${₦}50. Example: *${pre}slots 200*`)
    const u = await getUser(m.sender)
    if (u.wallet < bet) return await m.send(`╠ 💸 Not enough. Wallet: ${₦}${fmtNum(u.wallet)}`)
    await saveUser(m.sender, { wallet: u.wallet - bet, totalGambled: u.totalGambled + bet })
    const symbols = ["🍋","🍊","🍇","💎","7️⃣","⭐","🔔"]
    const spin = () => symbols[Math.floor(Math.random() * symbols.length)]
    const reels = [spin(), spin(), spin()]
    const roll = Math.random()
    let outcome, multiplier
    if (roll < 0.50) { outcome = "lose"; multiplier = 0 }
    else if (roll < 0.90) {
      outcome = "small"; multiplier = rand(12, 19) / 10
      reels[0] = reels[1] = symbols[Math.floor(Math.random() * 4)]
    } else if (roll < 0.99) {
      outcome = "big"; multiplier = rand(25, 40) / 10
      reels[0] = reels[1] = reels[2] = symbols[Math.floor(Math.random() * 4)]
    } else {
      outcome = "jackpot"; multiplier = 15
      reels[0] = reels[1] = reels[2] = "💎"
    }
    const won = Math.floor(bet * multiplier)
    const profit = won - bet
    await saveUser(m.sender, { wallet: u.wallet - bet + won })
    const resultLine =
      outcome === "lose" ? `💸 Lost ${₦}${fmtNum(bet)}` :
      outcome === "small" ? `✅ Won ${₦}${fmtNum(won)} (+${₦}${fmtNum(profit)})` :
      outcome === "big" ? `🎉 Big Win! ${₦}${fmtNum(won)} (+${₦}${fmtNum(profit)})` :
      `🌟 JACKPOT!! ${₦}${fmtNum(won)}!!!`
    return await m.send(box(`🎰 Slot Machine`, [
      `[ ${reels[0]} | ${reels[1]} | ${reels[2]} ]`,
      `━━━━━━━━━━━━━━━`,
      resultLine,
      `Wallet: ${₦}${fmtNum(u.wallet - bet + won)}`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓰ COINFLIP PvP DUEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "cf|coinflip", desc: "PvP coinflip duel", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    const target = m.mentionedJid[0] || m.quoted?.sender
    if (!target) return await m.send(`╠ ${rs()} Mention someone to challenge. Example: *${pre}cf @user 500*`)
    if (target === m.sender) return await m.send(`╠ ${rs()} You can't duel yourself.`)
    const amount = parseInt(text?.replace(/@\S+/g, "").trim())
    if (!amount || amount < 50 || isNaN(amount)) return await m.send(`╠ Minimum duel amount is ${₦}50.`)
    const u = await getUser(m.sender)
    if (u.wallet < amount) return await m.send(`╠ 💸 Not enough. Wallet: ${₦}${fmtNum(u.wallet)}`)
    const duelKey = `${m.chat}_${target}_${m.sender}`
    activeDuels.set(duelKey, {
      challenger: m.sender,
      challengerName: m.pushName || m.sender.split("@")[0],
      target,
      amount,
      chat: m.chat,
      expiresAt: Date.now() + 120000
    })
    return await m.send(box(`⚔️ Duel Challenge ${rs()}`, [
      `@${m.sender.split("@")[0]} challenges @${target.split("@")[0]}`,
      `Bet Amount: ${₦}${fmtNum(amount)} each`,
      `Winner takes: ${₦}${fmtNum(amount * 2)}`,
      `━━━━━━━━━━━━━━━`,
      `@${target.split("@")[0]}, type *${pre}accept* to duel`,
      `or *${pre}decline* to back down`,
      `Expires in: 2 minutes`
    ]), { mentions: [m.sender, target] })
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "accept", desc: "Accept a duel", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    // Find a duel where this person is the target
    let duel = null, duelKey = null
    for (const [key, d] of activeDuels.entries()) {
      if (d.target === m.sender && d.chat === m.chat && Date.now() < d.expiresAt) {
        duel = d; duelKey = key; break
      }
    }
    if (!duel) return await m.send(`╠ ${rs()} You have no pending duel challenges.`)
    activeDuels.delete(duelKey)
    const t = await getUser(m.sender)
    if (t.wallet < duel.amount) return await m.send(`╠ 💸 Not enough coins to accept. Need ${₦}${fmtNum(duel.amount)}`)
    const challenger = await getUser(duel.challenger)
    if (challenger.wallet < duel.amount) return await m.send(`╠ ${rs()} Challenger no longer has enough coins.`)
    const challengerWins = Math.random() < 0.5
    const winner = challengerWins ? duel.challenger : m.sender
    const loser = challengerWins ? m.sender : duel.challenger
    const winnerU = await getUser(winner)
    const loserU = await getUser(loser)
    await saveUser(winner, { wallet: winnerU.wallet + duel.amount, gamesWon: winnerU.gamesWon + 1, totalEarned: winnerU.totalEarned + duel.amount })
    await saveUser(loser, { wallet: loserU.wallet - duel.amount })
    const coin = Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails"
    return await m.send(box(`⚔️ Duel Result ${rs()}`, [
      `Coin: ${coin}`,
      `━━━━━━━━━━━━━━━`,
      `🏆 Winner: @${winner.split("@")[0]}`,
      `💸 Loser:  @${loser.split("@")[0]}`,
      `Prize:     ${₦}${fmtNum(duel.amount * 2)}`
    ]), { mentions: [winner, loser] })
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "decline", desc: "Decline a duel", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    for (const [key, d] of activeDuels.entries()) {
      if (d.target === m.sender && d.chat === m.chat) {
        activeDuels.delete(key)
        return await m.send(`╠ ${rs()} @${m.sender.split("@")[0]} backed down from the duel.`, { mentions: [m.sender] })
      }
    }
    return await m.send(`╠ ${rs()} You have no pending duel to decline.`)
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓱ GROUP JACKPOT POT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "startpot|jackpot", desc: "Start a group jackpot", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (activePots.has(m.chat)) return await m.send(`╠ ${rs()} A jackpot is already running. Use *${pre}joinpot* to enter.`)
    const entry = parseInt(text) || 200
    if (entry < 50) return await m.send(`╠ Minimum entry is ${₦}50.`)
    const pot = { entry, players: [], pool: 0, chat: m.chat, expiresAt: Date.now() + 120000 }
    activePots.set(m.chat, pot)
    setTimeout(async () => {
      const p = activePots.get(m.chat)
      if (!p || p.players.length < 2) {
        activePots.delete(m.chat)
        if (p?.players.length === 1) {
          const refund = await getUser(p.players[0].jid)
          await saveUser(p.players[0].jid, { wallet: refund.wallet + p.entry })
          await m.client.sendMessage(m.chat, { text: `╠ ${rs()} Not enough players for jackpot. Entry refunded.` })
        } else {
          await m.client.sendMessage(m.chat, { text: `╠ ${rs()} Jackpot cancelled — nobody joined.` })
        }
        return
      }
      const winner = p.players[Math.floor(Math.random() * p.players.length)]
      const winU = await getUser(winner.jid)
      await saveUser(winner.jid, { wallet: winU.wallet + p.pool, gamesWon: winU.gamesWon + 1, totalEarned: winU.totalEarned + p.pool })
      activePots.delete(m.chat)
      const mentions = p.players.map(pl => pl.jid)
      await m.client.sendMessage(m.chat, {
        text: box(`🎉 JACKPOT WINNER ${rs()}`, [
          `Players: ${p.players.map(pl => "@" + pl.jid.split("@")[0]).join(", ")}`,
          `━━━━━━━━━━━━━━━`,
          `🏆 Winner: @${winner.jid.split("@")[0]}`,
          `Prize:     ${₦}${fmtNum(p.pool)}`
        ]),
        mentions
      })
    }, 120000)
    return await m.send(box(`🎰 Jackpot Started ${rs()}`, [
      `Entry Fee:  ${₦}${fmtNum(entry)}`,
      `Time Left:  2 minutes`,
      `━━━━━━━━━━━━━━━`,
      `Use *${pre}joinpot* to enter!`,
      `Need at least 2 players`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

kord({ cmd: "joinpot", desc: "Join the jackpot", fromMe: wtype, type: "economy", gc: true },
async (m) => {
  try {
    if (!await econActive(m)) return
    const pot = activePots.get(m.chat)
    if (!pot) return await m.send(`╠ ${rs()} No jackpot is running. Use *${pre}startpot [amount]* to start one.`)
    if (Date.now() > pot.expiresAt) { activePots.delete(m.chat); return await m.send(`╠ ${rs()} That jackpot has expired.`) }
    if (pot.players.find(p => p.jid === m.sender)) return await m.send(`╠ ${rs()} You're already in this jackpot.`)
    const u = await getUser(m.sender)
    if (u.wallet < pot.entry) return await m.send(`╠ 💸 You need ${₦}${fmtNum(pot.entry)} to enter.`)
    await saveUser(m.sender, { wallet: u.wallet - pot.entry, totalGambled: u.totalGambled + pot.entry })
    pot.players.push({ jid: m.sender })
    pot.pool += pot.entry
    return await m.send(box(`✅ Joined Jackpot ${rs()}`, [
      `Player: @${m.sender.split("@")[0]}`,
      `Entry:  ${₦}${fmtNum(pot.entry)}`,
      `Pool:   ${₦}${fmtNum(pot.pool)} (${pot.players.length} players)`,
      `Good luck! 🎰`
    ]), { mentions: [m.sender] })
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓲ MINI GAMES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── TRIVIA ──
kord({ cmd: "trivia", desc: "Trivia game for coins", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (activeGames.has(m.chat)) return await m.send(`╠ ${rs()} A game is already running in this group.`)
    const bet = parseInt(text) || 100
    const q = triviaData[Math.floor(Math.random() * triviaData.length)]
    const labels = ["A", "B", "C", "D"]
    const opts = q.options.map((o, i) => `${labels[i]}) ${o}`).join("\n")
    activeGames.set(m.chat, {
      type: "trivia", answer: labels[q.a], pot: 0, players: new Set(),
      bet, expiresAt: Date.now() + 30000, q
    })
    setTimeout(async () => {
      const g = activeGames.get(m.chat)
      if (g?.type === "trivia") {
        activeGames.delete(m.chat)
        await m.client.sendMessage(m.chat, { text: box(`⏱️ Trivia Ended`, [`No one got it right.`, `Answer: *${labels[g.q.a]}) ${g.q.options[g.q.a]}*`]) })
      }
    }, 30000)
    return await m.send(
      `╔══〔 🧠 TRIVIA ${rs()} 〕══╗\n` +
      `╠  *${q.q}*\n╠\n` +
      `╠  ${opts.split("\n").join("\n╠  ")}\n╠\n` +
      `╠  Category: ${q.cat} | Bet: ${₦}${bet} | ⏱️ 30s\n` +
      `╠  Type A, B, C, or D to answer!\n╚══════════════════╝`
    )
  } catch (e) { return await m.sendErr(e) }
})

// ── SCRAMBLE ──
kord({ cmd: "scramble|wordscramble", desc: "Word scramble game", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (activeGames.has(m.chat)) return await m.send(`╠ ${rs()} A game is already running in this group.`)
    const bet = parseInt(text) || 80
    const entry = scrambleData[Math.floor(Math.random() * scrambleData.length)]
    const scrambled = entry.word.split("").sort(() => Math.random() - 0.5).join("")
    activeGames.set(m.chat, {
      type: "scramble", answer: entry.word,
      bet, expiresAt: Date.now() + 45000
    })
    setTimeout(async () => {
      const g = activeGames.get(m.chat)
      if (g?.type === "scramble") {
        activeGames.delete(m.chat)
        await m.client.sendMessage(m.chat, { text: box(`⏱️ Scramble Ended`, [`No one got it!`, `Answer: *${entry.word}*`]) })
      }
    }, 45000)
    return await m.send(box(`🔤 Word Scramble ${rs()}`, [
      `Unscramble this: *${scrambled.toUpperCase()}*`,
      `Hint: ${entry.hint}`,
      `Reward: ${₦}${fmtNum(bet)} | ⏱️ 45s`,
      `Type the correct word to win!`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ── NUMBER GUESS ──
kord({ cmd: "numguess|numgame", desc: "Number guessing game", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (activeGames.has(m.chat)) return await m.send(`╠ ${rs()} A game is already running in this group.`)
    const bet = parseInt(text) || 100
    const number = Math.floor(Math.random() * 100) + 1
    activeGames.set(m.chat, { type: "numguess", answer: number, bet, expiresAt: Date.now() + 60000, guesses: 0 })
    setTimeout(async () => {
      const g = activeGames.get(m.chat)
      if (g?.type === "numguess") {
        activeGames.delete(m.chat)
        await m.client.sendMessage(m.chat, { text: box(`⏱️ Game Over`, [`Nobody guessed it.`, `The number was: *${number}*`]) })
      }
    }, 60000)
    return await m.send(box(`🔢 Number Guess ${rs()}`, [
      `I'm thinking of a number from *1 to 100*`,
      `First to guess it wins ${₦}${fmtNum(bet)}`,
      `I'll say hot or cold after each guess`,
      `⏱️ 60 seconds — just type a number!`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ── MATH RACE ──
kord({ cmd: "mathrace|math", desc: "Math race for coins", fromMe: wtype, type: "economy", gc: true },
async (m, text) => {
  try {
    if (!await econActive(m)) return
    if (activeGames.has(m.chat)) return await m.send(`╠ ${rs()} A game is already running in this group.`)
    const bet = parseInt(text) || 120
    const ops = ["+", "-", "*"]
    const op = ops[Math.floor(Math.random() * ops.length)]
    let a, b, answer
    if (op === "+") { a = rand(10, 99); b = rand(10, 99); answer = a + b }
    else if (op === "-") { a = rand(20, 99); b = rand(1, a - 1); answer = a - b }
    else { a = rand(2, 15); b = rand(2, 15); answer = a * b }
    const display = op === "*" ? `${a} × ${b}` : `${a} ${op} ${b}`
    activeGames.set(m.chat, { type: "mathrace", answer: String(answer), bet, expiresAt: Date.now() + 30000 })
    setTimeout(async () => {
      const g = activeGames.get(m.chat)
      if (g?.type === "mathrace") {
        activeGames.delete(m.chat)
        await m.client.sendMessage(m.chat, { text: box(`⏱️ Math Race Over`, [`Nobody got it.`, `Answer: *${answer}*`]) })
      }
    }, 30000)
    return await m.send(box(`➗ Math Race ${rs()}`, [
      `Solve this first to win ${₦}${fmtNum(bet)}:`,
      ``,
      `  *${display} = ?*`,
      ``,
      `⏱️ 30 seconds — just type the number!`
    ]))
  } catch (e) { return await m.sendErr(e) }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓳ GAME ANSWER LISTENER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ on: "text", fromMe: false }, async (m, text) => {
  try {
    if (!m.isGroup) return
    const game = activeGames.get(m.chat)
    if (!game) return
    if (Date.now() > game.expiresAt) { activeGames.delete(m.chat); return }
    const answer = text?.trim()
    if (!answer) return

    if (game.type === "trivia") {
      const guess = answer.toUpperCase().replace(/[^ABCD]/, "")
      if (!["A","B","C","D"].includes(guess)) return
      if (guess === game.answer) {
        activeGames.delete(m.chat)
        const u = await getUser(m.sender)
        await saveUser(m.sender, { wallet: u.wallet + game.bet, gamesWon: u.gamesWon + 1, totalEarned: u.totalEarned + game.bet })
        return await m.send(box(`🎉 Correct! ${rs()}`, [
          `@${m.sender.split("@")[0]} got it right!`,
          `Answer: *${game.answer}) ${game.q.options[game.q.a]}*`,
          `Earned: ${₦}${fmtNum(game.bet)}`
        ]), { mentions: [m.sender] })
      }
    }

    if (game.type === "scramble") {
      if (answer.toLowerCase() === game.answer.toLowerCase()) {
        activeGames.delete(m.chat)
        const u = await getUser(m.sender)
        await saveUser(m.sender, { wallet: u.wallet + game.bet, gamesWon: u.gamesWon + 1, totalEarned: u.totalEarned + game.bet })
        return await m.send(box(`🎉 Unscrambled! ${rs()}`, [
          `@${m.sender.split("@")[0]} got it!`,
          `Word: *${game.answer}*`,
          `Earned: ${₦}${fmtNum(game.bet)}`
        ]), { mentions: [m.sender] })
      }
    }

    if (game.type === "numguess") {
      const guess = parseInt(answer)
      if (isNaN(guess) || guess < 1 || guess > 100) return
      game.guesses++
      if (guess === game.answer) {
        activeGames.delete(m.chat)
        const u = await getUser(m.sender)
        await saveUser(m.sender, { wallet: u.wallet + game.bet, gamesWon: u.gamesWon + 1, totalEarned: u.totalEarned + game.bet })
        return await m.send(box(`🎉 Got it! ${rs()}`, [
          `@${m.sender.split("@")[0]} guessed correctly!`,
          `Number: *${game.answer}*`,
          `Guesses: ${game.guesses}`,
          `Earned: ${₦}${fmtNum(game.bet)}`
        ]), { mentions: [m.sender] })
      }
      const diff = Math.abs(guess - game.answer)
      const hint = diff <= 5 ? "🔥 Very hot!" : diff <= 15 ? "♨️ Warm" : diff <= 30 ? "🌡️ Cold" : "🧊 Very cold!"
      return await m.send(`${hint} (${guess > game.answer ? "too high" : "too low"})`)
    }

    if (game.type === "mathrace") {
      if (answer.trim() === game.answer) {
        activeGames.delete(m.chat)
        const u = await getUser(m.sender)
        await saveUser(m.sender, { wallet: u.wallet + game.bet, gamesWon: u.gamesWon + 1, totalEarned: u.totalEarned + game.bet })
        return await m.send(box(`🎉 First! ${rs()}`, [
          `@${m.sender.split("@")[0]} solved it first!`,
          `Answer: *${game.answer}*`,
          `Earned: ${₦}${fmtNum(game.bet)}`
        ]), { mentions: [m.sender] })
      }
    }
  } catch (_) {}
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⓴ LOAN OVERDUE CHECK (runs on every economy command)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function checkLoanOverdue(jid) {
  try {
    const u = await getUser(jid)
    if (!u.loan) return
    if (Date.now() > u.loan.dueDate && !u.defaulted) {
      const newCredit = Math.max(0, u.creditScore - 15)
      await saveUser(jid, { defaulted: true, creditScore: newCredit })
    }
  } catch (_) {}
}
