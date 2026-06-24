/* 
 * Copyright © 2025 Mirage
 * This file is part of Kord and is licensed under the GNU GPLv3.
 * And I hope you know what you're doing here.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html
 * -------------------------------------------------------------------------------
 */


const {
  kord,
  wtype,
  extractUrlsFromString,
  isAdmin,
  isadminn,
  isBotAdmin,
  getData,
  storeData,
  parsedJid,
  lidToJid,
  Baileys,
  sleep,
  prefix,
  getMeta,
  isUrl,
  config
} = require("../core")
const { warn } = require("../core/db")
const { Sticker, StickerTypes } = require("wa-sticker-formatter")
const pre = prefix 
// let activeTimers = new Map()

if (!global.activeTimers) {
  global.activeTimers = new Map()
}
const activeTimers = global.activeTimers
let clientInstance





kord({
cmd: "join",
  desc: "join a group using it's link",
  fromMe: true,
  type: "group",
}, async (m, text) => {
  try {
    var links = extractUrlsFromString(text || m.quoted?.text)
    if (links.length === 0) return await m.send("✘ Provide a WhatsApp group link")
    const linkRegex= /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
  const code = links.find(link => linkRegex.test(link))?.match(linkRegex)?.[1];
  if (!code) return await m.send("✘ Invalid invite link")
  try {
    const joinResult = await m.client.groupAcceptInvite(code);
    if (joinResult) return await m.send('```✓ Joined successfully!```');
    return await m.send(`_*✘ Failed to join group*_`)
  } catch (error) {
    return await m.send("✘ " + error.message)
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "leave|left",
  desc: "leave a group",
  gc: true,
  fromMe: true,
  type: "group",
}, async (m, text) => {
  try {
    await m.client.groupLeave(m.chat)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "gpp|setgcpp",
  desc: "set a group profile pic",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    if (text && text === "remove") {
    await m.client.removeProfilePicture(m.chat);
    return await m.send("```✓ Group Profile Picture Removed```");
    }
    if (!m.quoted?.image) return await m.send("✘ Reply to an image")
    var media = await m.quoted.download()
    await m.client.updateProfilePicture(m.chat, media);
    return await m.send("```✓ Group Profile Picture Updated```")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "gname|setgcname",
  desc: "set a group name(subject)",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text, cmd) => {
  try {
    var name = text || m.quoted?.text
    if (!name) return await m.send(`_*✘ Provide a name to set!*_\n_Example: ${cmd} New Group Name_`)
    const meta = await m.client.groupMetadata(m.chat);
    var botAd = await isBotAdmin(m);
    if (meta.restrict && !botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    await m.client.groupUpdateSubject(m.chat, name)
    return await m.send("```✓ Group Name Updated```")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "gdesc|setgcdesc",
  desc: "set a group description",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text, cmd) => {
  try {
    var desc = text || m.quoted?.text
    if (!desc) return await m.send(`_*✘ Provide a description to set*_\n_Example: ${cmd} Group rules and information..._`)
    const meta = await m.client.groupMetadata(m.chat);
    var botAd = await isBotAdmin(m);
    if (meta.restrict && !botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    await m.client.groupUpdateDescription(m.chat, desc)
    return await m.send("```✓ Description Updated```")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "add",
  desc: "add a user to group",
  gc: true,
  fromMe: wtype,
  type: "group",
}, async (m, text, cmd) => {
  const meta = await m.client.groupMetadata(m.chat);
  var botAd = await isBotAdmin(m);
  if (meta.restrict && !botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
  
  if (!text && !m.quoted?.sender) return await m.send(`_*✘ Reply to user or provide number*_\n_Example: ${cmd} 23412345xxx_`);
  
  const user = text || m.quoted?.sender
const cleanNumber = (user.includes('@') ? user.split('@')[0] : user).replace(/\D/g, '') + '@s.whatsapp.net'
  const userInfo = await m.client.onWhatsApp(cleanNumber);
  
  if (!userInfo.length) return await m.send('_✘ User is not on WhatsApp_');
  
  try {
    const result = await m.client.groupParticipantsUpdate(m.chat, [cleanNumber], "add");
    const status = result[0].status;
    
    if (status === '403') {
      await m.send('_✘ Unable to add user_\n_Sending invite..._');
      return await m.sendGroupInviteMessage(cleanNumber);
    } else if (status === '408') {
      await m.send("_✘ User recently left, try later_");
      const code = await m.client.groupInviteCode(m.chat);
      return await m.client.sendMessage(cleanNumber, { text: `https://chat.whatsapp.com/${code}` });
    } else if (status === '401') {
      return await m.send('_✘ Bot is blocked by the user_');
    } else if (status === '200') {
      return await m.send(`_*✓ @${cleanNumber.split('@')[0]} Added*_`, { mentions: [cleanNumber] });
    } else if (status === '409') {
      return await m.send("_✘ User already in group_");
    }
    return await m.send("✘ " + JSON.stringify(result));
  } catch (error) {
    return await m.send("✘ " + error.message);
  }
})

kord({
cmd: "kick",
  desc: "remove a member from group",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    
    var user = m.mentionedJid[0] || m.quoted?.sender || text
    
    if (!user) return await m.send("_✘ Reply to or mention a member_");
    
    user = (user.includes('@') ? user.split('@')[0] : user).replace(/\D/g, '') + '@s.whatsapp.net'
    
    if (text === "all") {
    var res = await m.send("_✘ Reply \"confirm\" to continue_")
    var response = await m.getResponse(res, 15000)
    if (response.text.toLowerCase() === "confirm") {
    await m.send("_*✓ Kicking all users in 10 seconds*_\n_Use restart command to cancel_")
    await sleep(10000)
    let { participants } = await m.client.groupMetadata(m.chat);
    participants = participants.filter(p => (p.jid || p.phoneNumber) !== m.user.jid);
    for (let key of participants) {
    const jid = parsedJid(key.jid || key.phoneNumber);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "remove");
    if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid, "block");
    await m.send(`_*✓ @${jid[0].split("@")[0]} kicked*_`, { mentions: [jid] });
      }
    }
  } else {
    const jid = parsedJid(user);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "remove");
    if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid, "block");
    await m.send(`_*✓ @${jid.split("@")[0]} kicked*_`, { mentions: [jid] });
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "tkick",
  desc: "temporarily kick a user from the group",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘ Bot Needs To Be Admin!*_");
    const timeRegex = /(\d+)\s*(s|sec|m|min|h|hr|d|day)/gi;
    const matches = [...(text || "").matchAll(timeRegex)];

    if (!matches.length) return await m.send(
      `_✘ Provide a duration_\n_Example: ${m.prefix}tkick @user 10m_\n_Supports: s, m, h, d_`
    );
    const unitMap = { s: 1000, sec: 1000, m: 60000, min: 60000, h: 3600000, hr: 3600000, d: 86400000, day: 86400000 };
    let totalMs = 0;
    for (const match of matches) totalMs += parseInt(match[1]) * unitMap[match[2].toLowerCase()];
    let user = m.mentionedJid[0] || m.quoted?.sender;
    if (!user) {
      const numText = text.replace(timeRegex, "").trim();
      if (!numText) return await m.send("_✘ Reply to or mention a member_");
      user = numText;
    }
    const jid = (user.includes('@') ? user.split('@')[0] : user).replace(/\D/g, '') + '@s.whatsapp.net';
    const formatDuration = (ms) => {
      const parts = [];
      const d = Math.floor(ms / 86400000); if (d) parts.push(`${d}d`);
      const h = Math.floor((ms % 86400000) / 3600000); if (h) parts.push(`${h}h`);
      const min = Math.floor((ms % 3600000) / 60000); if (min) parts.push(`${min}m`);
      const s = Math.floor((ms % 60000) / 1000); if (s) parts.push(`${s}s`);
      return parts.join(' ');
    };
    await m.client.groupParticipantsUpdate(m.chat, [jid], "remove");
    await m.send(
      `_*✓ @${jid.split('@')[0]} temporarily kicked for ${formatDuration(totalMs)}*_`,
      { mentions: [jid] }
    );
    setTimeout(async () => {
      try {
        const result = await m.client.groupParticipantsUpdate(m.chat, [jid], "add");
        const status = result[0]?.status;

        if (status === '200') {
          await m.send(`_*✓ @${jid.split('@')[0]} has been re-added*_`, { mentions: [jid] });
        } else if (status === '403') {
          await m.send(`_✘ Could not re-add @${jid.split('@')[0]}, sending invite..._`, { mentions: [jid] });
          await m.sendGroupInviteMessage(jid);
        } else {
          await m.send(`_✘ Could not re-add @${jid.split('@')[0]} (${status}), sending invite..._`, { mentions: [jid] });
          const code = await m.client.groupInviteCode(m.chat);
          await m.client.sendMessage(jid, { text: `https://chat.whatsapp.com/${code}` });
        }
      } catch (e) {
        console.log("tkick re-add error", e);
        await m.send(`_✘ Failed to re-add @${jid.split('@')[0]} after temp kick_`, { mentions: [jid] });
      }
    }, totalMs);

  } catch (e) {
    console.log("cmd error", e);
    return await m.sendErr(e);
  }
})

kord({
cmd: "promote",
  desc: "promote a member to admin",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var user = m.mentionedJid[0] || m.quoted?.sender || text
    if (!user) return await m.send("_✘ Reply to or mention a member_")
    if(await isadminn(m, user)) return await m.send("✘ Member is already admin")
    let jid = parsedJid(user);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "promote");
    return await m.send(`_*✓ @${jid.split("@")[0]} promoted*_`, { mentions: [jid] });
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "demote",
  desc: "demote an admin to member",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    if (text?.trim().toLowerCase() === "all") {
      const groupMeta = await m.client.groupMetadata(m.chat);
      const admins = groupMeta.participants.filter(p =>
        (p.admin === "admin") &&
        p.id !== m.client.user.id
      );
      if (!admins.length) return await m.send("✘ No demotable admins found");
      const adminJids = admins.map(p => p.id);
      await m.client.groupParticipantsUpdate(m.chat, adminJids, "demote");
      const mentions = adminJids.map(j => `@${j.split("@")[0]}`).join(", ");
      return await m.send(`✓ Demoted all admins: ${mentions}`, { mentions: adminJids });
    }
    var user = m.mentionedJid[0] || m.quoted?.sender || text;
    if (!user) return await m.send("✘ Reply to or mention an admin");
    if (!await isadminn(m, user)) return await m.send("✘ Member is not admin");
    let jid = parsedJid(user);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "demote");
    return await m.send(`✓ @${jid.split("@")[0]} demoted`, { mentions: [jid] });

  } catch (e) {
    console.log("cmd error", e);
    return await m.sendErr(e);
  }
})

kord({
  cmd: "mute",
  desc: "mute a group (immediate or scheduled)",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text, cmd) => {
  try {
    if (!clientInstance) {
      clientInstance = m.client
    }
    
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_")
    
    const chatJid = m.chat
    var muteData = await getData("mute_timers") || {}
    
    try {
      const meta = await m.client.groupMetadata(chatJid)
      if (meta.announce === true) {
        return await m.send("✘ Group is already muted")
      }
    } catch (e) {}
    
    if (!text) {
      await m.client.groupSettingUpdate(chatJid, "announcement")
      
      if (activeTimers.has(chatJid)) {
        clearTimeout(activeTimers.get(chatJid))
        activeTimers.delete(chatJid)
      }
      
      if (muteData[chatJid]) {
        delete muteData[chatJid]
        await storeData("mute_timers", muteData)
      }
      
      return await m.send("✓ Group Muted")
    }
    
    const timeMatch = text.match(/^(\d+)(s|m|hr|h|d|w)$/i)
    if (!timeMatch) {
      return await m.send(`✘ Invalid time format\nUsage: ${cmd} 10s (seconds)\n${cmd} 30m (minutes)\n${cmd} 2hr (hours)\n${cmd} 1d (days)\n${cmd} 1w (weeks)`)
    }
    
    const amount = parseInt(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()
    
    let milliseconds
    switch(unit) {
      case 's': milliseconds = amount * 1000; break
      case 'm': milliseconds = amount * 60 * 1000; break
      case 'h':
      case 'hr': milliseconds = amount * 60 * 60 * 1000; break
      case 'd': milliseconds = amount * 24 * 60 * 60 * 1000; break
      case 'w': milliseconds = amount * 7 * 24 * 60 * 60 * 1000; break
      default: return await m.send("✘ Invalid time unit")
    }
    
    if (milliseconds > 7 * 24 * 60 * 60 * 1000) {
      return await m.send("✘ Maximum mute time is 7 days")
    }
    
    await m.client.groupSettingUpdate(chatJid, "announcement")
    
    let timeDisplay
    if (unit === 's') timeDisplay = `${amount} second${amount > 1 ? 's' : ''}`
    else if (unit === 'm') timeDisplay = `${amount} minute${amount > 1 ? 's' : ''}`
    else if (unit === 'h' || unit === 'hr') timeDisplay = `${amount} hour${amount > 1 ? 's' : ''}`
    else if (unit === 'd') timeDisplay = `${amount} day${amount > 1 ? 's' : ''}`
    else if (unit === 'w') timeDisplay = `${amount} week${amount > 1 ? 's' : ''}`
    
    const unmuteTime = Date.now() + milliseconds
    muteData[chatJid] = {
      unmuteTime: unmuteTime,
      setBy: m.sender,
      setAt: Date.now(),
      duration: milliseconds,
      type: "timer_mute"
    }
    
    await storeData("mute_timers", muteData)
    
    await m.send(`✓ Group Muted for ${timeDisplay}`)
    
    if (activeTimers.has(chatJid)) {
      clearTimeout(activeTimers.get(chatJid))
    }
    
    const timerId = setTimeout(async () => {
      try {
        const meta = await m.client.groupMetadata(chatJid).catch(() => null)
        if (meta && meta.announce === true) {
          await m.client.groupSettingUpdate(chatJid, "not_announcement")
          await m.client.sendMessage(chatJid, { text: "✓ Group Unmuted" })
        }
        
        const currentData = await getData("mute_timers") || {}
        if (currentData[chatJid]) {
          delete currentData[chatJid]
          await storeData("mute_timers", currentData)
        }
        activeTimers.delete(chatJid)
        
      } catch (error) {}
    }, milliseconds)
    
    activeTimers.set(chatJid, timerId)
    
  } catch (e) {
    console.log("mute cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "unmute",
  desc: "unmute a group (immediate or scheduled)",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text, cmd) => {
  try {
    if (!clientInstance) {
      clientInstance = m.client
    }
    
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_")
    
    const chatJid = m.chat
    var muteData = await getData("mute_timers") || {}
    
    let isMuted = false
    try {
      const meta = await m.client.groupMetadata(chatJid)
      isMuted = meta.announce === true
    } catch (e) {
      return await m.send("✘ Error checking group")
    }
    
    if (!text) {
      if (!isMuted) {
        return await m.send("✘ Group is not muted")
      }
      
      await m.client.groupSettingUpdate(chatJid, "not_announcement")
      
      if (activeTimers.has(chatJid)) {
        clearTimeout(activeTimers.get(chatJid))
        activeTimers.delete(chatJid)
      }
      
      if (muteData[chatJid]) {
        delete muteData[chatJid]
        await storeData("mute_timers", muteData)
      }
      
      return await m.send("✓ Group Unmuted")
    }
    
    const timeMatch = text.match(/^(\d+)(s|m|hr|h|d|w)$/i)
    if (!timeMatch) {
      return await m.send(`✘ Invalid time format\nUsage: ${cmd} (immediate)\n${cmd} 10s (unmute for 10s)`)
    }
    
    const amount = parseInt(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()
    
    let milliseconds
    switch(unit) {
      case 's': milliseconds = amount * 1000; break
      case 'm': milliseconds = amount * 60 * 1000; break
      case 'h':
      case 'hr': milliseconds = amount * 60 * 60 * 1000; break
      case 'd': milliseconds = amount * 24 * 60 * 60 * 1000; break
      case 'w': milliseconds = amount * 7 * 24 * 60 * 60 * 1000; break
      default: return await m.send("✘ Invalid time unit")
    }
    
    if (milliseconds > 7 * 24 * 60 * 60 * 1000) {
      return await m.send("✘ Maximum time is 7 days")
    }
    
    if (isMuted) {
      await m.client.groupSettingUpdate(chatJid, "not_announcement")
    }
    
    let timeDisplay
    if (unit === 's') timeDisplay = `${amount} second${amount > 1 ? 's' : ''}`
    else if (unit === 'm') timeDisplay = `${amount} minute${amount > 1 ? 's' : ''}`
    else if (unit === 'h' || unit === 'hr') timeDisplay = `${amount} hour${amount > 1 ? 's' : ''}`
    else if (unit === 'd') timeDisplay = `${amount} day${amount > 1 ? 's' : ''}`
    else if (unit === 'w') timeDisplay = `${amount} week${amount > 1 ? 's' : ''}`
    
    await m.send(`✓ Group Unmuted for ${timeDisplay}`)
    
    if (activeTimers.has(chatJid)) {
      clearTimeout(activeTimers.get(chatJid))
    }
    
    const muteTime = Date.now() + milliseconds
    muteData[chatJid] = {
      unmuteTime: muteTime,
      setBy: m.sender,
      setAt: Date.now(),
      duration: milliseconds,
      type: "timer_unmute"
    }
    
    await storeData("mute_timers", muteData)
    
    const timerId = setTimeout(async () => {
      try {
        const meta = await m.client.groupMetadata(chatJid).catch(() => null)
        if (meta && meta.announce === false) {
          await m.client.groupSettingUpdate(chatJid, "announcement")
          await m.client.sendMessage(chatJid, { text: "✓ Group Muted" })
        }
        
        const currentData = await getData("mute_timers") || {}
        if (currentData[chatJid]) {
          delete currentData[chatJid]
          await storeData("mute_timers", currentData)
        }
        activeTimers.delete(chatJid)
        
      } catch (error) {}
    }, milliseconds)
    
    activeTimers.set(chatJid, timerId)
    
  } catch (e) {
    console.log("unmute cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
cmd: "invite|glink",
  desc: "get group link",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    const code = await m.client.groupInviteCode(m.chat);
    return await m.send(`https://chat.whatsapp.com/${code}`);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "revoke",
  desc: "reset group link",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    await m.client.groupRevokeInvite(m.chat);
    const newCode = await m.client.groupInviteCode(m.chat);
    return await m.send(`✓ Link Revoked\nNew Link: https://chat.whatsapp.com/${newCode}`);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "tag",
  desc: "tag all memebers/admins/me/text",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text, cmd, store) => {
  try {
    if (!m.isGroup) return await m.send(`@${m.sender.split("@")[0]}`, { mentions: [m.sender] })

    const { participants } = await m.client.groupMetadata(m.chat)

    let admins = participants
      .filter(v => v.admin === 'admin' || v.admin === 'superadmin')
      .map(v => v.jid || v.phoneNumber)

    let msg = ""

    if (text === "all" || text === "everyone") {
      participants.forEach((p, i) => {
        msg += `❐ ${i + 1}. @${(p.jid || p.phoneNumber).split('@')[0]}\n`
      })
      await m.send(msg, { mentions: participants.map(a => a.jid || a.phoneNumber) })
    }

    else if (text === "admin" || text === "admins") {
      admins.forEach((admin, i) => {
        msg += `❐ ${i + 1}. @${admin.split('@')[0]}\n`
      })
      return await m.send(msg, { mentions: admins })
    }

    else if (text === "me" || text === "mee") {
      return await m.send(`@${m.sender.split("@")[0]}`, { mentions: [m.sender] })
    }

    else if (text) {
      return await m.send(text, { mentions: participants.map(a => a.jid || a.phoneNumber) })
    }

    else if (m.quoted) {
      return await m.forwardMessage(
        m.chat,
        await store.findMsg(m.quoted.id),
        { contextInfo: { mentionedJid: participants.map(a => a.jid || a.phoneNumber) }, quoted: m }
      )
    }

    return await m.send(`✘ Usage:\ntag all\ntag admins\ntag me\ntag <message>\ntag (reply to message)`)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "tagall",
  desc: "tag all memebers",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text) => {
  try {
    const { participants } = await m.client.groupMetadata(m.chat)
    
    let admins = participants
      .filter(v => v.admin != null)
      .map(v => v.jid || v.phoneNumber)
    
    let msg = `❴ ⇛ *TAGALL* ⇚ ❵\n*Message:* ${text ? text : "blank"}\n*Caller:* @${m.sender.split("@")[0]}\n\n`
    
    participants.forEach((p, i) => {
      msg += `❧ ${i + 1}. @${(p.jid || p.phoneNumber).split('@')[0]}\n`
    })
    
    await m.send(msg, { mentions: participants.map(a => a.jid || a.phoneNumber) })
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "all|everyone",
  desc: "Tag everyone in the group with text",
  fromMe: false,
  type: "group",
  gc: true,
  adminOnly: true
}, async (m, text) => {
  try {
    if (!text) return m.reply("Provide a message for the tag")

    const jid = m.chat
    const subject = text

    const groupMetadata = await m.client.groupMetadata(jid)

    await m.client.sendMessage(jid, {
      text: '@' + jid,
      contextInfo: {
        mentionedJid: groupMetadata.participants.map(x => x.id),
        groupMentions: [
          {
            groupJid: jid,
            groupSubject: subject
          }
        ]
      }
    })

  } catch (error) {
    console.error(error)
    m.sendErr(error)
  }
})


kord({
  cmd: "creategc",
  desc: "create a group",
  fromMe: true,
  type: "group",
}, async (m, text) => {
  const groupName = text || m.pushName;
  if (!m.quoted?.sender && !m.mentionedJid?.[0]) return m.reply("✘ Reply to or mention a user");
  try {
    const group = await m.client.groupCreate(groupName, [m.quoted?.sender || m.mentionedJid[0], m.sender]);
    const inviteCode = await m.client.groupInviteCode(group.id);
    return await m.send(`✓ Group created\nLink: https://chat.whatsapp.com/${inviteCode}`);
  } catch (error) {
    return await m.send("✘ " + error.message);
  }
})

kord({
cmd: "lock",
  desc: "make only admins can modify group settings",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    const meta = await m.client.groupMetadata(m.chat)
    if (meta.restrict) return await m.send("✘ Group settings already admin-only");
    await m.client.groupSettingUpdate(m.chat, 'locked')
    return await m.send("✓ Group settings now admin-only");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "unlock",
  desc: "allow all members to modify group settings",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    const meta = await m.client.groupMetadata(m.chat)
    if (!meta.restrict) return await m.send("✘ Group settings already unlocked");
    await m.client.groupSettingUpdate(m.chat, 'unlocked')
    return await m.send("✓ All members can now modify group settings");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "ginfo",
  desc: "get group info of a group",
  fromMe: wtype,
  type: "group",
}, async (m, text) => {
  if (!text && m.isGroup) {
    var link;
    try {
      link = `https://chat.whatsapp.com/${await m.client.groupInviteCode(m.chat)}`;
    } catch (error) {
      return await m.send("✘_*Bot Needs To Be Admin!*_");
    }
  }
  var links = extractUrlsFromString(link || text || m.quoted?.text)
  if (links.length === 0) return await m.send("✘ Provide a WhatsApp group link")
  const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
  link = links.find(l => linkRegex.test(l));
  
  const code = link.match(linkRegex)[1];
  const currentTime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  try {
    const groupInfo = await m.client.groupGetInviteInfo(code);
    const memberCount = groupInfo.size || 0;
    const maxParticipants = groupInfo.maxParticipants || 257;
    const pic = await m.client.profilePictureUrl(groupInfo.id, "image")
    
    const response = `*╭─❑ 『 GROUP INFORMATION 』 ❑─╮*
├ ➨ *Name:* ${groupInfo.subject}
├ ➨ *Owner:* ${groupInfo.owner ? '@' + groupInfo.owner.split('@')[0] : 'Unknown'}
├ ➨ *Members:* ${memberCount}/${maxParticipants}
├ ➨ *Created:* ${new Date(groupInfo.creation * 1000).toLocaleString()}
├ ➨ *Restricted:* ${groupInfo.restrict ? '✘ Yes' : '✓ No'}
├ ➨ *Announced:* ${groupInfo.announce ? '✘ Yes' : '✓ No'}
├ ➨ *Ephemeral:* ${groupInfo.ephemeralDuration ? `✓ ${groupInfo.ephemeralDuration/86400} days` : '✘ Off'}
├ ➨ *Group ID:* ${groupInfo.id}
├ ➨ *Join Approval:* ${groupInfo.membershipApprovalMode ? '✓ Required' : '✘ Not Required'}
${groupInfo.desc ? `├ ➨ *Description:* \n${groupInfo.desc}\n` : ''}
├────────────────
├ ✎ *Fetched by:* @${m.sender.split('@')[0]}
├ ✎ *Time:* ${currentTime} UTC
╰────────────────✧`;

    await m.send(pic, { 
      mentions: [...(groupInfo.owner ? [groupInfo.owner] : []), m.sender],
      caption: response,
      contextInfo: {
        externalAdReply: {
          title: "Group Info",
          body: groupInfo.subject,
          thumbnailUrl: groupInfo.imageUrl || "",
          sourceUrl: link,
          mediaType: 1
        }
      }
    }, "image");
  } catch (error) {
    await m.send("✘ Error fetching group info:\n" + error.message);
  }
})




kord({
cmd: "events|gcevent|grpevents",
  desc: "manage group events settings",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")
    
    var gdata = await getData('group_events') || {}
    const jid = m.chat
    
    const defaultWelcome = `@pp ╭━━━々 𝚆 𝙴 𝙻 𝙲 𝙾 𝙼 𝙴 々━━━╮
┃ ➺ *々 Welcome @user! to @gname*
┃ ➺ *々 Members: @count*
┃ ➺ We Hope You Have A Nice Time Here!
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    
    const defaultGoodbye = `@pp ╭━━━々 𝙶 𝙾 𝙾 𝙳 𝙱 𝚈 𝙴 々━━━╮
┃ ➺ *々 @user! left @gname!*
┃ ➺ *々 Members: @count*
┃ ➺ We Hope He/She Had A Nice Time Here!
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    
    gdata[jid] = gdata[jid] || {
      events: false,
      add: false,
      remove: false,
      promote: false,
      demote: false,
      antipromote: false,
      antidemote: false,
      welcome: defaultWelcome,
      goodbye: defaultGoodbye
    }
    
    var parts = text.split(" ")
    var cmd = parts[0]?.toLowerCase()
    var value = parts[1]?.toLowerCase()
    
    if (!cmd) {
      let status = gdata[jid].events ? "enabled" : "disabled"
      return await m.send(`*_Group Events Settings_*
_*Usage:*_
_events on/off - Enable/disable all events_
_events clear - clear the group events settings_
_events welcome on/off - Toggle welcome messages_
_events goodbye on/off - Toggle goodbye messages_
_events promote on/off - Toggle promotion alerts_
_events demote on/off - Toggle demotion alerts_
_events antipromote on/off - Toggle anti-promotion_
_events antidemote on/off - Toggle anti-demotion_
_events setwelcome text - Set welcome message_
_events setgoodbye text - Set goodbye message_

*Available Variables:*
@user or &user - Username
@gname or &gname - Group name  
@gdesc or &gdesc - Group description
@count or &count - Member count
@time or &time - Current time
@pp or &pp - Include profile picture
@ad or &ad - Include external ad reply`)
    }
    
    if (cmd === "on" || cmd === "enable") {
      gdata[jid].events = true
      gdata[jid].add = true
      gdata[jid].remove = true
      gdata[jid].promote = true
      gdata[jid].demote = true
      gdata[jid].antipromote = true
      gdata[jid].antidemote = true
      gdata[jid].welcome = defaultWelcome
      gdata[jid].goodbye = defaultGoodbye
      await storeData('group_events', gdata)
      return await m.send("✓ Group events notifications enabled with default messages")
    }
    
    if (cmd === "off" || cmd === "disable") {
      gdata[jid].events = false
      await storeData('group_events', gdata)
      return await m.send("✓ Group events notifications disabled")
    }
    
    if (cmd === "clear") {
      delete gdata[jid]
      await storeData('group_events', gdata)
      return await m.send("✓ Group events notifications cleared")
    }
    
    if (cmd === "status") {
      return await m.send(`*Events Status:* ${gdata[jid].events ? "on" : "off"}
*Welcome:* ${gdata[jid].add ? "on" : "off"}
*Goodbye:* ${gdata[jid].remove ? "on" : "off"}
*Promote:* ${gdata[jid].promote ? "on" : "off"}
*Demote:* ${gdata[jid].demote ? "on" : "off"}
*Anti-Promote:* ${gdata[jid].antipromote ? "on" : "off"}
*Anti-Demote:* ${gdata[jid].antidemote ? "on" : "off"}`)
    }
    
    if (cmd === "welcome") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].events = true
      gdata[jid].add = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Welcome messages turned ${value}`)
    }
    
    if (cmd === "goodbye") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].events = true
      gdata[jid].remove = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Goodbye messages turned ${value}`)
    }
    
    if (cmd === "promote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].events = true
      gdata[jid].promote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Promotion alerts turned ${value}`)
    }
    
    if (cmd === "demote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].events = true
      gdata[jid].demote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Demotion alerts turned ${value}`)
    }
    
    if (cmd === "antipromote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].events = true
      gdata[jid].antipromote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Anti-promotion ${value === "on" ? "enabled" : "disabled"}`)
    }
    
    if (cmd === "antidemote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].events = true
      gdata[jid].antidemote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Anti-demotion ${value === "on" ? "enabled" : "disabled"}`)
    }
    
    if (cmd === "setwelcome") {
      let newMsg = text.replace(cmd, "").trim()
      if (!newMsg) return await m.send(`✘ Provide the welcome message text

*Available Variables:*
@user or &user - Username
@gname or &gname - Group name
@gdesc or &gdesc - Group description  
@count or &count - Member count
@time or &time - Current time
@pp or &pp - Include profile picture
@ad or &ad - Include external ad reply`)
      gdata[jid].welcome = newMsg
      await storeData('group_events', gdata)
      return await m.send("✓ Welcome message updated\n\n" + newMsg)
    }
    
    if (cmd === "setgoodbye") {
      let newMsg = text.replace(cmd, "").trim()
      if (!newMsg) return await m.send(`✘ Provide the goodbye message text

*Available Variables:*
@user or &user - Username
@gname or &gname - Group name
@gdesc or &gdesc - Group description
@count or &count - Member count
@time or &time - Current time
@pp or &pp - Include profile picture
@ad or &ad - Include external ad reply`)
      gdata[jid].goodbye = newMsg
      await storeData('group_events', gdata)
      return await m.send("✓ Goodbye message updated\n\n" + newMsg)
    }
    
    return await m.send("✘ Invalid option. Use 'events' without parameters to see available commands.")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
cmd: "antilink",
  desc: "automactically delete links in group",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text, c) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var data = await getData("antilink") || {}
    data[m.chat] = data[m.chat] || {
    active: false,
    action: null,
    warnc: 0,
    permitted: []
    }
    var parts = text.split(" ");
    var cmd = parts[0]?.toLowerCase();
    var value = parts[1]?.toLowerCase();
    var isActive = data[m.chat].active
    if (!cmd) {
    return await m.send(
    `\`\`\`┌─────────❖
│▸ ANTILINK CONFIG
└─────────❖
Usage:
${c} kick
${c} delete
${c} warn 4
${c} allow (url)
${c} unallow (url)
${c} listallow
${c} status
${c} off

use ${pre}reset to reset warn\`\`\``
    )
    }
    
    if (cmd === "kick") {
    if (isActive && data[m.chat].action === "kick") {
    return await m.send(`\`\`\` Antilink is already set to: kick\`\`\``)
    }
    data[m.chat].active = true
    data[m.chat].action = "kick"
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ Antilink Enabled: kick\`\`\``)
    }
    else if (cmd === "delete") {
    if (isActive && data[m.chat].action === "delete") {
    return await m.send(`\`\`\` Antilink is already set to: delete\`\`\``)
    }
    data[m.chat].active = true
    data[m.chat].action = "delete"
    await storeData("antilink", data)
   return await m.send(`\`\`\`▸ ❏ Antilink Enabled: delete\`\`\``)
    }
    else if (cmd === "warn") {
    if (isActive && data[m.chat].action === "warn") {
    return await m.send(`\`\`\` Antilink is already set to: warn | ${data[m.chat].warnc}\`\`\``)
    }
    data[m.chat].active = true
    data[m.chat].action = "warn"
    data[m.chat].warnc = parseInt(value) || 3
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ Antilink Enabled: warn | ${data[m.chat].warnc}\`\`\``)
    }
    else if (cmd === "allow") {
    var url = parts.slice(1).join(" ");
    if (!url) {
    return await m.send(`\`\`\`provide a URL to allow\nExample: ${c} allow youtube.com\`\`\``)
    }
    if (!data[m.chat].permitted.includes(url)) {
    data[m.chat].permitted.push(url)
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ URL allowed: ${url}\`\`\``)
    } else {
    return await m.send(`\`\`\`URL already in allowed list: ${url}\`\`\``)
    }
    }
    else if (cmd === "unallow") {
    var url = parts.slice(1).join(" ");
    if (!url) {
    return await m.send(`\`\`\`provide a URL to remove\nExample: ${c} unallow youtube.com\`\`\``)
    }
    var index = data[m.chat].permitted.indexOf(url)
    if (index > -1) {
    data[m.chat].permitted.splice(index, 1)
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ URL removed: ${url}\`\`\``)
    } else {
    return await m.send(`\`\`\`URL not found in allowed list: ${url}\`\`\``)
    }
    }
    else if (cmd === "listallow") {
    if (data[m.chat].permitted.length === 0) {
    return await m.send(`\`\`\`No allowed URLs found\`\`\``)
    }
    var list = data[m.chat].permitted.map((url, i) => `${i + 1}. ${url}`).join("\n")
    return await m.send(`\`\`\`┌─────────❖
│▸ ALLOWED URLS
└─────────❖
${list}
└──────────────\`\`\``)
    }
    else if (cmd === "status") {
    return m.send(
    `\`\`\`┌─────────❖
│▸ ANTILINK CONFIG
└─────────❖
│▸ On: ${data[m.chat].active}
│▸ Action: ${data[m.chat].action}
│▸ Allowed URLs: ${data[m.chat].permitted.length}
└──────────────\`\`\``
    )
    } else if (cmd === "off") {
    data[m.chat].active = false
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ Antilink Disabled\`\`\``)
    } else {
    return await m.send(
    `\`\`\`┌─────────❖
│▸ ANTILINK CONFIG
└─────────❖
Usage:
${c} kick
${c} delete
${c} warn 4
${c} allow <url>
${c} unallow <url>
${c} listallow
${c} status
${c} off

use ${pre}reset to reset warn\`\`\``
    )
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
on: "all",
}, async (m, text) => {
  try {
    var data = await getData("antilink") || []
    var d = data[m.chat]
    if (!d || !d.active) return
    if (!m.isGroup) return
    if (await isAdmin(m)) return;
    if (!await isBotAdmin(m)) return;
    var act = isUrl(text)
    if (act) {
    var urls = text.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi) || []
    var allPermitted = urls.every(url => {
    return d.permitted.some(permittedUrl => url.includes(permittedUrl)) })
    if (allPermitted && urls.length > 0) return
    if (d.action === "kick") {
      try {
        await m.send(m, {}, "delete")
        await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
        return await m.send(`\`\`\`Links Are Not Allowed!!\`\`\`\n\`\`\`@${m.sender.split("@")[0]} kicked!\`\`\``, { mentions: [m.sender], q: false })
      } catch (e) {
        console.error("err kicking in antilink", e)
      }
    }
    else if (d.action === "delete") {
      try {
        await m.send(m, {}, "delete")
        return await m.send(`\`\`\`@${m.sender.split("@")[0]} Links Are Not Allowed!!\`\`\``, { mentions: [m.sender], q: false })
      } catch (e) {
        console.error("err deleting in antilink", e)
      }
    }
    else if (d.action === "warn") {
      if (!data.warnCounts) data.warnCounts = {}
      if (!data.warnCounts[m.chat]) data.warnCounts[m.chat] = {}
      var userWarns = data.warnCounts[m.chat][m.sender] || 0
      userWarns++
      data.warnCounts[m.chat][m.sender] = userWarns
      var maxWarns = d.warnc
      var rem = maxWarns - userWarns
      if (rem > 0) {
        await m.send(m, {}, "delete")
        await m.send(`\`\`\`@${m.sender.split("@")[0]}\nLinks Are Not Allowed\nWarning(s): ${userWarns}/${maxWarns}\`\`\``, { mentions: [m.sender], q: false })
        await storeData("antilink", data)
      } else {
        await m.send(m, {}, "delete")
        await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
        await m.send(`\`\`\`@${m.sender.split("@")[0]}\nLinks Are Not Allowed\nWarning(s): ${userWarns}/${maxWarns}\nGoodbye!\`\`\``, { q: false, mentions: [m.sender] })
        delete data.warnCounts[m.chat][m.sender]
        await storeData("antilink", data)
      }
    }
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "akick",
  desc: "auto kick user",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")

    let args = text.trim().split(/\s+/)
    let isRemoveCmd = args[0] === "remove"
    let numberArg = isRemoveCmd ? args[1] : args[0]
    let user = m.mentionedJid[0] || m.quoted?.sender || (numberArg && `${numberArg.replace(/[^0-9]/g, "")}@s.whatsapp.net`)
    if (!user) return await m.send("_✘ Reply to or mention a member_\n_to remove use:_\n_akick remove 234xxxxxxx_")

    const jid = parsedJid(user)

    if (isRemoveCmd || text.includes("remove")) {
      let sdata = await getData("akick")
      if (!Array.isArray(sdata)) sdata = []
      if (!sdata.includes(user)) return m.send("_user is not in auto kick_")
      sdata = sdata.filter(entry => entry !== user)
      await storeData("akick", JSON.stringify(sdata, null, 2))
      return m.send("_user is now free_")
    }

    let d = await getData("akick") || []
    d.push(jid)
    await storeData("akick", d)
    await m.client.groupParticipantsUpdate(m.chat, [jid[0]], "remove")
    if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid[0], "block")
    await m.send(`_*✓ @${jid[0].split("@")[0]} kicked*_`, { mentions: [jid[0]] })

  } catch (e) {
    console.error(e)
    return await m.send(`error in akick ${e}`)
  }
})

kord({
cmd: "antiword",
  desc: "auto delete words you set",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text, c) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var aw = await getData("antiword") || {}
    aw[m.chat] = aw[m.chat] || {
    active: false,
    action: "delete",
    warnc: config().WARNCOUNT,
    words: []
    }
    var dw = aw[m.chat]
    var parts = text.split(" ");
    var cmd = parts[0]?.toLowerCase();
    var value = parts[1]?.toLowerCase();
    var vl = parts[2]?.toLowerCase()
    var isActive = aw[m.chat].active
    
    if (!cmd) return await m.send(
    `\`\`\`┌─────────❖
│▸ ANTIWORD CONFIG
└─────────❖
Usage:
${c} on
${c} action kick/delete/warn 3
${c} warnc 5
${c} status/get
${c} remove <words>/all
${c} off
${c} gay, stupid

use ${pre}reset to reset warn\`\`\``
    )
    
    if (cmd == "on") {
    if (isActive) return await m.send(`\`\`\`➻ Antiword is Already On: ${dw.action}\`\`\``)
    dw.active = true
    dw.action = "delete"
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Antiword Turned On and set to Delete\nUse ${c} action kick/delete/warn 3 to set action\`\`\``)
    }
    if (cmd == "off") {
    if (isActive) {
    dw.active = false
    await storeData("antiword", aw)
    return await m.send("```➻ AntiWord Turned Off```")
    }
    return await m.send("```➻ Antiword isn't active```")
    }
    if (cmd == "action") {
    if (value == "kick") {
    if (isActive && aw[m.chat].action === "kick") return await m.send("```➻ Antiword is active & Action is already set to: kick```")
    aw[m.chat].active = true
    dw.action = "kick"
    await storeData("antiword", aw)
    return await m.send("```➻ Antiword Turned On & Action Set To: kick```")
    }
    else if (value == "delete") {
    if (isActive && aw[m.chat].action === "delete") return await m.send("```➻ Antiword is active & Action is already set to: delete```")
    aw[m.chat].active = true
    dw.action = "delete"
    await storeData("antiword", aw)
    return await m.send("```➻ Antiword Turned On & Action Set To: delete```")
    }
    else if (value == "warn") {
    if (isActive && dw.action == "warn") return await m.send(`\`\`\`➻ AntiWord is active & Action is Already set to warn | ${dw.warnc}\`\`\``)
    
    dw.active = true
    dw.action = "warn"
    dw.warnc = parseInt(vl) || config().WARNCOUNT
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Antiword Turned On & Action Set To: warn(${dw.warnc}\`\`\``)
    }
    else {
      return await m.send(`\`\`\`Use Either ${c} action kick/delete/warn 3\`\`\``)
    }
  }
  if (cmd == "warnc") {
    if (!value || isNaN(parseInt(value))) {
      return await m.send(`\`\`\`Usage: ${c} warnc <number>\nExample: ${c} warnc 5\`\`\``)
    }
    let newWarnCount = parseInt(value)
    if (newWarnCount < 1) {
      return await m.send("```➻ Warn count must be at least 1```")
    }
    dw.warnc = newWarnCount
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Warn count updated to: ${newWarnCount}\`\`\``)
  }
  if (cmd == "get" || cmd == "status") {
    return await m.send(`\`\`\`┌─────────❖
│▸ ANTIWORD STATUS
└─────────❖
Active: ${dw.active}
Action: ${dw.action}
Warn Count: ${dw.warnc}
Words: ${dw.words.join(", ") || "None"}
\`\`\``)
  }
  if (cmd == "remove" || cmd == "rm") {
    if (!value) {
      return await m.send(`\`\`\`Usage: ${c} remove <word1,word2> or ${c} remove all\nExample: ${c} remove gay, stupid\n${c} remove all\`\`\``)
    }
    if (value == "all") {
      if (dw.words.length === 0) {
        return await m.send("```➻ No words to remove```")
      }
      dw.words = []
      await storeData("antiword", aw)
      return await m.send("```➻ All words have been removed```")
    }
    let wtr = text.slice(text.indexOf(' ') + 1).toLowerCase().split(",").map(w => w.trim())
    let ew = wtr.filter(word => dw.words.includes(word))
    let nmw = wtr.filter(word => !dw.words.includes(word))
    if (ew.length === 0) {
      return await m.send(`\`\`\`➻ Word(s) not found: ${wtr.join(", ")}\`\`\``)
    }
    dw.words = dw.words.filter(word => !ew.includes(word))
    await storeData("antiword", aw)
    if (nmw.length > 0) {
      return await m.send(`\`\`\`➻ Removed: ${ew.join(", ")}\n➻ Not found: ${nmw.join(", ")}\`\`\``)
    }
    return await m.send(`\`\`\`➻ Removed: ${ew.join(", ")}\`\`\``)
  }
  let acts = ["delete", "kick", "warn", "on", "off", "action", "get", "status", "warnc", "remove", "rm"]
  if (acts.includes(cmd)) {
    return await m.send(`\`\`\`➻ Invalid command usage. "${cmd}" is a reserved command.\nType ${c} for help\`\`\``)
  }
  let wrds = text.toLowerCase().split(",").map(w => w.trim())
  let rwd = wrds.filter(word => acts.includes(word))
  if (rwd.length > 0) {
    return await m.send(`\`\`\`➻ Cannot add action word(s): ${rwd.join(", ")}\n remove it >>.\nExample: ${c} gay, stupid, fool\`\`\``)
  }
  let ew = wrds.filter(word => dw.words.includes(word))
  let newWords = wrds.filter(word => !dw.words.includes(word))
  if (ew.length > 0 && newWords.length === 0) {
    return await m.send(`\`\`\`➻ Word(s) already exist: ${ew.join(", ")}\`\`\``)
  }
  if (ew.length > 0 && newWords.length > 0) {
    dw.words.push(...newWords)
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Added: ${newWords.join(", ")}\n➻ Already existed: ${ew.join(", ")}\`\`\``)
  }
  if (wrds.length === 1) {
    dw.words.push(wrds[0])
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Word "${wrds[0]}" has been added\`\`\``)
  }
  dw.words.push(...wrds)
  await storeData("antiword", aw)
  return await m.send(`\`\`\`➻ Words added: ${wrds.join(", ")}\`\`\``)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

var warns = {}
kord({
on: "all",
  fromMe: false,
}, async (m, text) => {
  try {
    if (!m.isGroup) return;
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    var data = await getData("antiword") || {}
    if (!data[m.chat]) return
    var d = data[m.chat]
    if (!d.active) return
    if (await isAdmin(m)) return
    
    var msgText = (text || "").toLowerCase()
    var foundWord = d.words.find(word => msgText.includes(word.toLowerCase()))
    
    if (!foundWord) return
    
    if (d.action == "delete") {
    await m.send(m, {}, "delete")
    return await m.send(`_*@${m.sender.split("@")[0]}*_\n_*That word is not allowed here!*_`, { mentions: [m.sender] })
  }
  
  if (d.action == "kick") {
    await m.send(m, {}, "delete")
    await m.send(`_*@${m.sender.split("@")[0]} kicked for using prohibited word*_`, { mentions: [m.sender] })
    return await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
  }


if (d.action == "warn") {
  await m.send(m, {}, "delete")
  warns[m.chat] = warns[m.chat] || {}
  warns[m.chat][m.sender] = warns[m.chat][m.sender] || 0
  warns[m.chat][m.sender]++
  if (warns[m.chat][m.sender] >= d.warnc) {
    warns[m.chat][m.sender] = 0
    await m.send(`_*@${m.sender.split("@")[0]} kicked after ${d.warnc} warnings for using prohibited words*_`, { mentions: [m.sender] })
    return await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
  }
  return await m.send(`_*@${m.sender.split("@")[0]} warned! (${warns[m.chat][m.sender]}/${d.warnc}) for using prohibited word*_`, { mentions: [m.sender] })
}
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "warn",
  desc: "warn user and kick if warnings exceeded",
  type: "group",
  fromMe: true,
  gc: true,
  adminOnly: true,
}, async (m, text) => {
  try {
    var user = m.mentionedJid[0] || m.quoted.sender
    if (!user) return await m.send(`_*mention or reply to a user*_\nor use *${prefix}warn reset* to clear warnings`)
    if (text.toLowerCase() === "reset") {
    var r = await warn.resetWarn(m.chat, user)
    if (!r) return await m.send("_*user hasn't been warned anytime before*_")
    return await m.send("*🍁 Warnings Cleared!*")
    }
    var aa = await warn.addWarn(m.chat, user, `${text ? text : null}`, m.sender)
    var wc = await warn.getWcount(m.chat, user)
    if (wc < config().WARNCOUNT) {
    if (aa.timestamp) { 
      await m.send(m.quoted, {}, "delete")
      return await m.send(
    `┏┅┅ 『 *WARNING* 』┅┅┓
┇ *User:* @${user.split("@")[0]}
┇ *Reason:* ${text ? text : "not specified"}
┇ *WarnCounts:* ${wc}
┗┉By: @${m.sender.split("@")[0]}`, {mentions: [user, m.sender] })
}
    return await m.send("some error occurred...")
  } else {
    await m.send("*Warnings Exceeded!*\n_*Goodbye!*_")
    await warn.resetWarn(m.chat, user)
    return await m.client.groupParticipantsUpdate(m.chat, [user], "remove")
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "antigm",
  desc: "set action to be done when a person mentions the group",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m);
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ");
  if (args && args.length > 0) {
  const option = args[0].toLowerCase();
  const value = args.length > 1 ? args[1] : null;
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antigm_config");
      if (!Array.isArray(sdata)) sdata = [];
  let isExist = sdata.find(entry => entry.chatJid === chatJid);
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antigm_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGm Is Now Enabled!*_\n_Action:_ delete`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3"
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antigm_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGm Is Now Enabled!*_\n_Action:_ kick`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antigm warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antigm_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGm Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiGm is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-GM STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiGm is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antigm_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiGm disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiGm config ] \`\`\`
_${pre}antigm delete_
_${pre}antigm kick_
_${pre}antigm warn 3_
_${pre}antigm status_
_${pre}antigm off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiGm config ] \`\`\`
_${pre}antigm delete_
_${pre}antigm kick_
_${pre}antigm warn 3_
_${pre}antigm status_
_${pre}antigm off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

const gwCount = new Map()
kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    if (isGroup) {
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    
    if(m.message.reactionMessage) return;
    const cJid = m.key.remoteJid
    const groupMetadata = await getMeta(m.client, m.chat);
    const admins =  groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid || v.phoneNumber);
    if (m.message?.groupStatusMentionMessage && !m.fromMe) {
    var sdata = await getData("antigm_config");
    if (!Array.isArray(sdata)) return;
    let isExist = sdata.find(entry => entry.chatJid === cJid);
    if (isExist && !admins.includes(m.sender)) {
    var act = isExist.action
    if (act === "del") {
    await m.send(m, {}, "delete")
      return await m.send(`_*Status Mention is not Allowed!!*_`)
    } else if (act === "kick") {
      await m.send(m, {}, "delete")
      await m.send(`_*Status Mention is not Allowed!!*_\n_Goodbye!!_`)
      await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
} else if (act === "warn") {
  const warnKey = `${cJid}_${m.sender}`
  var cCount = (gwCount.get(warnKey) || 0) + 1
  gwCount.set(warnKey, cCount)
  var maxC = parseInt(isExist.maxwrn)
  if (cCount >= maxC) {
    await m.send(m, {}, "delete")
    await m.send(`_*@${m.sender.split('@')[0]} Max Warning Exceeded!!*_\n_Goodbye!!!_`, { mentions: [m.sender] })
    await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove')
    gwCount.delete(warnKey)
  } else {
    var rmsg = `_*Status Mention is not Allowed!!*_\n_You are warned!_\nWarning(s): (${cCount}/${maxC})\n_Remaining:_ ${maxC - cCount}`
    await m.send(m, {}, "delete")
    await m.send(rmsg, { mentions: [m.sender] })
  }
      if (cCount >= maxC) {
        await m.send(m, {}, "delete")
        await m.send(`_*Max Warning Exceeded!!*_\n_Goodbye!!!_`)
        await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
        gwCount.delete(cJid)
      }
    }
  }
  } else return;
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "antigcstatus",
  desc: "set action to be done when a user posts on the group status ",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m);
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ");
  if (args && args.length > 0) {
  const option = args[0].toLowerCase();
  const value = args.length > 1 ? args[1] : null;
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antigsw_config");
      if (!Array.isArray(sdata)) sdata = [];
  let isExist = sdata.find(entry => entry.chatJid === chatJid);
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antigsw_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGcStatus Is Now Enabled!*_\n_Action:_ delete`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3"
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antigsw_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGcStatus Is Now Enabled!*_\n_Action:_ kick`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}Antigcstatus warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antigsw_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGcStatus Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}`)
    } else if (option === "status") {
      if (!isExist) return await m.send("AntiGcStatus is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-GC STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiGcStatus is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antigsw_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiGcStatus disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiGcStatus config ] \`\`\`
_${pre}antigcstatus delete_
_${pre}antigcstatus kick_
_${pre}antigcstatus warn 3_
_${pre}antigcstatus status_
_${pre}antigcstatus off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available Antigcstatus config ] \`\`\`
_${pre}antigcstatus delete_
_${pre}antigcstatus kick_
_${pre}antigcstatus warn 3_
_${pre}antigcstatus status_
_${pre}antigcstatus off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

const wwCount = new Map()
kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    if (isGroup) {
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    
    if(m.message.reactionMessage) return;
    const cJid = m.key.remoteJid
    const groupMetadata = await getMeta(m.client, m.chat);
    const admins =  groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid || v.phoneNumber);
    if (m.mtype === "groupStatusMessageV2" && !m.fromMe) {
    var sdata = await getData("antigsw_config");
    if (!Array.isArray(sdata)) return;
    let isExist = sdata.find(entry => entry.chatJid === cJid);
    if (isExist && !admins.includes(m.sender)) {
    var act = isExist.action
    if (act === "del") {
    await m.send(m, {}, "delete")
      return await m.send(`_*Gc Status is not Allowed!!*_`)
    } else if (act === "kick") {
      await m.send(m, {}, "delete")
      await m.send(`_*Gc Status is not Allowed!!*_\n_Goodbye!!_`)
      await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
} else if (act === "warn") {
  const warnKey = `${cJid}_${m.sender}`
  var cCount = (wwCount.get(warnKey) || 0) + 1
  wwCount.set(warnKey, cCount)
  var maxC = parseInt(isExist.maxwrn)
  if (cCount >= maxC) {
    await m.send(m, {}, "delete")
    await m.send(`_*@${m.sender.split('@')[0]} Max Warning Exceeded!!*_\n_Goodbye!!!_`, { mentions: [m.sender] })
    await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove')
    wwCount.delete(warnKey)
  } else {
    var rmsg = `_*Gc Status is not Allowed!!*_\n_You are warned!_\nWarning(s): (${cCount}/${maxC})\n_Remaining:_ ${maxC - cCount}`
    await m.send(m, {}, "delete")
    await m.send(rmsg, { mentions: [m.sender] })
  }
      if (cCount >= maxC) {
        await m.send(m, {}, "delete")
        await m.send(`_*Max Warning Exceeded!!*_\n_Goodbye!!!_`)
        await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
        wwCount.delete(cJid)
      }
    }
  }
  } else return;
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "antibot",
  desc: "set action to be done when a visitor bot messaes in group",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m);
  if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ");
  if (args && args.length > 0) {
  const option = args[0].toLowerCase();
  const value = args.length > 1 ? args[1] : null;
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antibot_config");
      if (!Array.isArray(sdata)) sdata = [];
  let isExist = sdata.find(entry => entry.chatJid === chatJid);
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antibot_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiBot Is Now Enabled!*_\n_Action:_ delete`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3"
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antibot_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiBot Is Now Enabled!*_\n_Action:_ kick`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antibot warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antibot_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiBot Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiBot is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-BOT STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiBot is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antibot_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiBot disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiBot config ] \`\`\`
_${pre}antibot delete_
_${pre}antibot kick_
_${pre}antibot warn 3_
_${pre} antibot status_
_${pre}antibot off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiBot config ] \`\`\`
_${pre}antibot delete_
_${pre}antibot kick_
_${pre}antibot warn 3_
_${pre} antibot status_
_${pre}antibot off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

    const wCount = new Map()
kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    if (isGroup) {
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    
    if(m.message.reactionMessage) return;
    const cJid = m.key.remoteJid
    const groupMetadata = await getMeta(m.client, m.chat);
    const admins =  groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid || v.phoneNumber);
    if ((m.isBot || m.isBaileys) && !m.fromMe) {
    var sdata = await getData("antibot_config");
    if (!Array.isArray(sdata)) return;
    let isExist = sdata.find(entry => entry.chatJid === cJid);
    if (isExist && !admins.includes(m.sender)) {
    var act = isExist.action
    if (act === "del") {
    await m.send(m, {}, "delete")
      return await m.send(`_*Bots are not Allowed!!*_`)
    } else if (act === "kick") {
      await m.send(m, {}, "delete")
      await m.send(`_*Bots are not Allowed!!*_\n_Goodbye!!_`)
      await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
} else if (act === "warn") {
  const warnKey = `${cJid}_${m.sender}`
  var cCount = (wCount.get(warnKey) || 0) + 1
  wCount.set(warnKey, cCount)
  var maxC = parseInt(isExist.maxwrn)
  if (cCount >= maxC) {
    await m.send(m, {}, "delete")
    await m.send(`_*Max Warning Exceeded!!*_\n_Goodbye!!!_`)
    await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove')
    wCount.delete(warnKey)
  } else {
    var rmsg = `_*Bots are not Allowed!!*_\n_You are warned!_\nWarning(s): (${cCount}/${maxC})\n_Remaining:_ ${maxC - cCount}`
    await m.send(m, {}, "delete")
    await m.send(rmsg)
  }
      if (cCount >= maxC) {
        await m.send(m, {}, "delete")
        await m.send(`_*Max Warning Exceeded!!*_\n_Goodbye!!!_`)
        await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
        wCount.delete(cJid)
      }
    }
  }
  } else return;
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


const formatTimeAgo = sec => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) % 3600 / 60)
  const s = Math.floor((sec % 3600) % 60)
  return `${h} hours ${m} minutes ${s} seconds ago`
}

kord({
  cmd: "msgs",
  desc: "Show message stats",
  fromMe: true,
  type: "tools",
  gc: true,
  adminOnly: true
}, async (m, text, c, store) => {
  const rows = await store.chatHistory(m.chat, 99999)
  if (!rows.length) return m.send("_No messages found_")

  const stats = {}
  const now = Math.floor(Date.now() / 1000)

  for (const row of rows) {
    let parsed
    try {
      parsed = JSON.parse(row.message)
    } catch { continue }

    const msg = parsed.message || {}
    const key = parsed.key || {}

    const rawJid = key.participantPn || key.participant || key.remoteJid
    if (!rawJid || rawJid.endsWith("@g.us")) continue

    const jid = rawJid.split("@")[0]
    const name = parsed.pushName || jid
    const timestamp = parsed.messageTimestamp || 0

    if (!stats[jid]) {
      stats[jid] = {
        name,
        total: 0,
        text: 0,
        sticker: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        others: 0,
        lastSeen: timestamp
      }
    }

    stats[jid].total++

    if (msg.conversation || msg.extendedTextMessage) stats[jid].text++
    else if (msg.stickerMessage) stats[jid].sticker++
    else if (msg.imageMessage) stats[jid].image++
    else if (msg.videoMessage) stats[jid].video++
    else if (msg.audioMessage) stats[jid].audio++
    else if (msg.documentMessage) stats[jid].document++
    else stats[jid].others++

    if (timestamp > stats[jid].lastSeen)
      stats[jid].lastSeen = timestamp
  }

  const all = Object.entries(stats)
  const sorted = all.sort((a, b) => b[1].total - a[1].total)
  const sliced = text.trim().toLowerCase() === "all" ? sorted : sorted.slice(0, 10)

  const report = sliced.map(([jid, d]) => {
    const ago = formatTimeAgo(now - d.lastSeen)
    let lines = [
      `*Number :* ${jid}`,
      `*Name :* ${d.name}`,
      `*Total Msgs :* ${d.total}`,
      `*text :* ${d.text}`
    ]
    if (d.sticker) lines.push(`*sticker :* ${d.sticker}`)
    if (d.image) lines.push(`*image :* ${d.image}`)
    if (d.video) lines.push(`*video :* ${d.video}`)
    if (d.audio) lines.push(`*audio :* ${d.audio}`)
    if (d.document) lines.push(`*document :* ${d.document}`)
    if (d.others) lines.push(`*others :* ${d.others}`)
    lines.push(`*lastSeen :* ${ago}`)
    return lines.join("\n")
  }).join("\n\n")

  return m.send(report)
})


kord({
  cmd: "antispam",
  desc: "set action to be done when a person sends spam messages",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m)
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ")
  if (args && args.length > 0) {
  const option = args[0].toLowerCase()
  const value = args.length > 1 ? args[1] : null
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antispam_config")
      if (!Array.isArray(sdata)) sdata = []
  let isExist = sdata.find(entry => entry.chatJid === chatJid)
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3",
     msgLimit: 5,
     timeFrame: 10
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antispam_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiSpam Is Now Enabled!*_\n_Action:_ delete\n_Limit:_ 5 messages in 10 seconds`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3",
        "msgLimit": 5,
        "timeFrame": 10
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antispam_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiSpam Is Now Enabled!*_\n_Action:_ kick\n_Limit:_ 5 messages in 10 seconds`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antispam warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou,
        "msgLimit": 5,
        "timeFrame": 10
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antispam_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiSpam Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}\n_Limit:_ 5 messages in 10 seconds`)
    } else if (option === "limit") {
      var msgLimit = parseInt(args[1])
      var timeFrame = parseInt(args[2])
      if (!msgLimit || !timeFrame) return await m.send(`*_Use ${prefix}antispam limit 5 10_*\n_5 messages in 10 seconds_`)
      
      if (isExist) {
        isExist.msgLimit = msgLimit
        isExist.timeFrame = timeFrame
      } else {
        return await m.send("_Enable AntiSpam first with delete/kick/warn option_")
      }
      await storeData("antispam_config", JSON.stringify(sdata, null, 2))
      return await m.send(`_*AntiSpam Limit Updated!*_\n_Limit:_ ${msgLimit} messages in ${timeFrame} seconds`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiSpam is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-SPAM STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}
_Limit:_ ${isExist.msgLimit} messages in ${isExist.timeFrame} seconds`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiSpam is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antispam_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiSpam disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiSpam config ] \`\`\`
_${pre}antispam delete_
_${pre}antispam kick_
_${pre}antispam warn 3_
_${pre}antispam limit 5 10_
_${pre}antispam status_
_${pre}antispam off_

_use ${pre}reset to reset warn_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiSpam config ] \`\`\`
_${pre}antispam delete_
_${pre}antispam kick_
_${pre}antispam warn 3_
_${pre}antispam limit 5 10_
_${pre}antispam status_
_${pre}antispam off_

_use ${pre}reset to reset warn_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

const userMessageCount = new Map()
const userWarnings = new Map()

kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us')
    if (isGroup) {
    var botAd = await isBotAdmin(m)
    if (!botAd) return
    
    if(m.message.reactionMessage) return
    if(m.fromMe) return
    
    const cJid = m.key.remoteJid
    const sender = m.sender
    const groupMetadata = await getMeta(m.client, m.chat)
    const admins = groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid || v.phoneNumber)
    
    if (admins.includes(sender)) return
    
    if (m.message && !m.message.reactionMessage) {
    var sdata = await getData("antispam_config")
    if (!Array.isArray(sdata)) return
    let isExist = sdata.find(entry => entry.chatJid === cJid)
    if (isExist) {
    
    const userKey = `${cJid}_${sender}`
    const currentTime = Date.now()
    
    if (!userMessageCount.has(userKey)) {
      userMessageCount.set(userKey, [])
    }
    
    const userMessages = userMessageCount.get(userKey)
    userMessages.push(currentTime)
    
    const timeFrame = isExist.timeFrame * 1000
    const validMessages = userMessages.filter(timestamp => currentTime - timestamp < timeFrame)
    userMessageCount.set(userKey, validMessages)
    
    if (validMessages.length > isExist.msgLimit) {
      var act = isExist.action
      
      if (act === "del") {
        await m.send(m, {}, "delete")
        await m.send(`_*@${sender.split('@')[0]} Stop Spamming!!*_`, {mentions: [sender]})
        userMessageCount.delete(userKey)
      } else if (act === "kick") {
        await m.send(m, {}, "delete")
        await m.send(`_*@${sender.split('@')[0]} Stop Spamming!!*_\n_Goodbye!!_`, {mentions: [sender]})
        await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
        userMessageCount.delete(userKey)
        userWarnings.delete(userKey)
      } else if (act === "warn") {
        const warnKey = userKey
        var currentWarns = userWarnings.get(warnKey) || 0
        currentWarns += 1
        userWarnings.set(warnKey, currentWarns)
        
        var maxC = parseInt(isExist.maxwrn)
        var remain = maxC - currentWarns
        
        if (currentWarns >= maxC) {
          await m.send(m, {}, "delete")
          await m.send(`_*@${sender.split('@')[0]} Max Warning Exceeded!!*_\n_Goodbye!!!_`, {mentions: [sender]})
          await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
          userMessageCount.delete(userKey)
          userWarnings.delete(warnKey)
        } else {
          var rmsg = `_*@${sender.split('@')[0]} Stop Spamming!!*_
_You are warned!_
Warning(s): (${currentWarns}/${maxC})
_Remaining:_ ${remain}`
          await m.send(`${rmsg}`, {mentions: [sender]})
          await m.send(m, {}, "delete")
        }
        
        userMessageCount.delete(userKey)
      }
    }
    }
    }
    }
  } catch (e) {
    console.log("antispam error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "antitag",
  desc: "set action to be done when a person tags all group members",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m)
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ")
  if (args && args.length > 0) {
  const option = args[0].toLowerCase()
  const value = args.length > 1 ? args[1] : null
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antitag_config")
      if (!Array.isArray(sdata)) sdata = []
  let isExist = sdata.find(entry => entry.chatJid === chatJid)
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3",
     mode: "members"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antitag_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiTag Is Now Enabled!*_\n_Action:_ delete\n_Mode:_ members`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3",
        "mode": "members"
      }
       if (isExist) {
      isExist.action = "kick"
      if (!isExist.mode) isExist.mode = "members"
    } else {
      sdata.push(kikc)
    }
    await storeData("antitag_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiTag Is Now Enabled!*_\n_Action:_ kick\n_Mode:_ members`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antitag warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou,
        "mode": "members"
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
      if (!isExist.mode) isExist.mode = "members"
    } else {
      sdata.push(warnco)
    }
    await storeData("antitag_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiTag Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}\n_Mode:_ members`)
    } else if (option === "admins") {
      if (!isExist) return await m.send("_Please enable antitag first with an action (delete/kick/warn)_")
      isExist.mode = "admins"
      await storeData("antitag_config", JSON.stringify(sdata, null, 2))
      return await m.send(`_*AntiTag Mode Changed!*_\n_Mode:_ admins only`)
    } else if (option === "members") {
      if (!isExist) return await m.send("_Please enable antitag first with an action (delete/kick/warn)_")
      isExist.mode = "members"
      await storeData("antitag_config", JSON.stringify(sdata, null, 2))
      return await m.send(`_*AntiTag Mode Changed!*_\n_Mode:_ members`)
    } else if (option === "member") {
      if (!isExist) return await m.send("_Please enable antitag first with an action (delete/kick/warn)_")
      isExist.mode = "member"
      await storeData("antitag_config", JSON.stringify(sdata, null, 2))
      return await m.send(`_*AntiTag Mode Changed!*_\n_Mode:_ member (no member tagging allowed)`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiTag is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-TAG STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}
_Mode:_ ${isExist.mode || "members"}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiTag is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antitag_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiTag disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiTag config ] \`\`\`
_${pre}antitag delete_
_${pre}antitag kick_
_${pre}antitag warn 3_
_${pre}antitag admins_
_${pre}antitag members_
_${pre}antitag member_
_${pre}antitag status_
_${pre}antitag off_

_use ${pre}reset to reset warn_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiTag config ] \`\`\`
_${pre}antitag delete_
_${pre}antitag kick_
_${pre}antitag warn 3_
_${pre}antitag admins_
_${pre}antitag members_
_${pre}antitag member_
_${pre}antitag status_
_${pre}antitag off_

_use ${pre}reset to reset warn_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

const tagWarnings = new Map()

kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us')
    if (isGroup) {
    var botAd = await isBotAdmin(m)
    if (!botAd) return
    
    if(m.message.reactionMessage) return
    if(m.fromMe) return
    
    const cJid = m.key.remoteJid
    const sender = m.sender
    const groupMetadata = await getMeta(m.client, m.chat)
    const admins = groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid || v.phoneNumber)
    
    if (admins.includes(sender)) return
    
    if (m.mentionedJid && m.mentionedJid.length > 0) {
    var sdata = await getData("antitag_config")
    if (!Array.isArray(sdata)) return
    let isExist = sdata.find(entry => entry.chatJid === cJid)
    if (isExist) {
    
    const { participants } = await m.client.groupMetadata(m.chat)
    const allParticipants = participants.map(p => p.jid || p.phoneNumber )
    const adminJids = participants.filter(p => p.admin !== null).map(p => p.jid || p.phoneNumber )
    const mentionedCount = m.mentionedJid.length
    const totalParticipants = allParticipants.length
    
    const mode = isExist.mode || "members"
    let shouldTrigger = false
    
    if (mode === "admins") {
      const mentionedAdmins = m.mentionedJid.filter(jid => adminJids.includes(jid))
      const adminPercentage = adminJids.length > 0 ? (mentionedAdmins.length / adminJids.length) * 100 : 0
      shouldTrigger = adminPercentage >= 80 || mentionedAdmins.length >= Math.min(5, adminJids.length)
    } else if (mode === "member") {
      const mentionedMembers = m.mentionedJid.filter(jid => !adminJids.includes(jid))
      shouldTrigger = mentionedMembers.length > 0
    } else {
      const tagPercentage = (mentionedCount / totalParticipants) * 100
      shouldTrigger = tagPercentage >= 80 || mentionedCount >= 10
    }
    
    if (shouldTrigger) {
      var act = isExist.action
      
      if (act === "del") {
        await m.send(m, {}, "delete")
        let modeText = "Mass Tagging"
        if (mode === "admins") modeText = "Mass Tagging Admins"
        else if (mode === "member") modeText = "Tagging Members"
        await m.send(`_*@${sender.split('@')[0]} ${modeText} is not Allowed!!*_`, {mentions: [sender]})
      } else if (act === "kick") {
        await m.send(m, {}, "delete")
        let modeText = "Mass Tagging"
        if (mode === "admins") modeText = "Mass Tagging Admins"
        else if (mode === "member") modeText = "Tagging Members"
        await m.send(`_*@${sender.split('@')[0]} ${modeText} is not Allowed!!*_\n_Goodbye!!_`, {mentions: [sender]})
        await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
      } else if (act === "warn") {
        const warnKey = `${cJid}_${sender}`
        var currentWarns = tagWarnings.get(warnKey) || 0
        currentWarns += 1
        tagWarnings.set(warnKey, currentWarns)
        
        var maxC = parseInt(isExist.maxwrn)
        var remain = maxC - currentWarns
        
        if (currentWarns >= maxC) {
          await m.send(m, {}, "delete")
          await m.send(`_*@${sender.split('@')[0]} Max Warning Exceeded!!*_\n_Goodbye!!!_`, {mentions: [sender]})
          await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
          tagWarnings.delete(warnKey)
        } else {
          let modeText = "Mass Tagging"
          if (mode === "admins") modeText = "Mass Tagging Admins"
          else if (mode === "member") modeText = "Tagging Members"
          var rmsg = `_*@${sender.split('@')[0]} ${modeText} is not Allowed!!*_
_You are warned!_
Warning(s): (${currentWarns}/${maxC})
_Remaining:_ ${remain}`
          await m.send(`${rmsg}`, {mentions: [sender]})
          await m.send(m, {}, "delete")
        }
      }
    }
    }
    }
    }
  } catch (e) {
    console.log("antitag error", e)
    return await m.sendErr(e)
  }
})



kord({
  cmd: "reset",
  desc: "reset warn count of a user for a specific anti-feature",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");

    const args = text.trim().split(" ");
    const feature = args[0]?.toLowerCase();
    const user = m.mentionedJid[0] || m.quoted?.sender;

    const validFeatures = ["antispam", "antitag", "antigm", "antibot", "antiword", "antilink", "antigcstatus"];

    if (!feature || !validFeatures.includes(feature)) {
      return await m.send(
        `_*Usage:*_ .reset <feature> @user\n\n_Available features:_\n${validFeatures.map(f => `• ${f}`).join("\n")}`
      );
    }

    if (!user) return await m.send("_✘ Reply to or mention a user_");

    const chatJid = m.chat;
    const userTag = `@${user.split("@")[0]}`;
    const userKey = `${chatJid}_${user}`;

    if (feature === "antispam") {
      const hadMsgCount = userMessageCount.has(userKey);
      const hadWarning = userWarnings.has(userKey);
      userMessageCount.delete(userKey);
      userWarnings.delete(userKey);
      if (!hadMsgCount && !hadWarning) return await m.send(`_✘ No antispam record found for ${userTag}_`, { mentions: [user] });
      return await m.send(`_✓ Antispam warns reset for ${userTag}_`, { mentions: [user] });
    }

    if (feature === "antitag") {
      if (!tagWarnings.has(userKey)) return await m.send(`_✘ No antitag record found for ${userTag}_`, { mentions: [user] });
      tagWarnings.delete(userKey);
      return await m.send(`_✓ Antitag warns reset for ${userTag}_`, { mentions: [user] });
    }

    if (feature === "antigm") {
      if (!gwCount.has(userKey)) return await m.send(`_✘ No antigm record found for ${userTag}_`, { mentions: [user] });
      gwCount.delete(userKey);
      return await m.send(`_✓ Antigm warns reset for ${userTag}_`, { mentions: [user] });
    }

    if (feature === "antibot") {
      if (!wCount.has(userKey)) return await m.send(`_✘ No antibot record found for ${userTag}_`, { mentions: [user] });
      wCount.delete(userKey);
      return await m.send(`_✓ Antibot warns reset for ${userTag}_`, { mentions: [user] });
    }

    if (feature === "antigcstatus") {
      if (!wwCount.has(userKey)) return await m.send(`_✘ No antigcstatus record found for ${userTag}_`, { mentions: [user] });
      wwCount.delete(userKey);
      return await m.send(`_✓ Antigcstatus warns reset for ${userTag}_`, { mentions: [user] });
    }

    if (feature === "antiword") {
      if (!warns[chatJid]?.[user]) return await m.send(`_✘ No antiword record found for ${userTag}_`, { mentions: [user] });
      warns[chatJid][user] = 0;
      return await m.send(`_✓ Antiword warns reset for ${userTag}_`, { mentions: [user] });
    }

    if (feature === "antilink") {
      var data = await getData("antilink") || {};
      if (!data.warnCounts?.[chatJid]?.[user]) return await m.send(`_✘ No antilink record found for ${userTag}_`, { mentions: [user] });
      delete data.warnCounts[chatJid][user];
      await storeData("antilink", data);
      return await m.send(`_✓ Antilink warns reset for ${userTag}_`, { mentions: [user] });
    }

  } catch (e) {
    console.log("reset cmd error", e);
    return await m.sendErr(e);
  }
});

const parseInterval = input => {
  const match = input.match(/(\d+)([dhm])/i)
  if (!match) return 0
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  if (unit === 'd') return value * 24 * 3600
  if (unit === 'h') return value * 3600
  if (unit === 'm') return value * 60
  return 0
}
const listOnlineOffline = async (m, text, store, mode, sock) => {
  if (!text) return await m.send("_provide a time interval_\n_example:_\n_listonline 10m_\n_listonline 30m_\n_listonline 24h_\n_listonline 1d_")
  const intervalSec = parseInterval(text)
  if (!intervalSec) return await m.send("_invalid interval_\n_example:_\n_listonline 10m_\n_listonline 30m_\n_listonline 24h_\n_listonline 1d_")
  const now = Math.floor(Date.now() / 1000)
  const rows = await store.chatHistory(m.chat, 99999)
  if (!rows.length) return m.send("_No messages found_")

  const stats = {}
  for (const row of rows) {
    let parsed
    try { parsed = JSON.parse(row.message) } catch { continue }
    const key = parsed.key || {}
    const participantJid = key.participant || key.remoteJid
    const actualJid = key.participantPn || participantJid
    if (!participantJid || participantJid.endsWith("@g.us")) continue
    const jid = participantJid.split("@")[0]
    const timestamp = parsed.messageTimestamp || 0
    if (mode === "online" && timestamp < now - intervalSec) continue
    if (!stats[jid] || stats[jid].lastSeen < timestamp) {
      stats[jid] = { 
        jid, 
        name: parsed.pushName || jid, 
        lastSeen: timestamp, 
        rawJid: participantJid,
        actualJid: actualJid
      }
    }
  }

  let filtered
  if (mode === "online") filtered = Object.values(stats)
  else {
    const cutoff = now - intervalSec
    filtered = Object.values(stats).filter(u => u.lastSeen < cutoff)
  }

  if (!filtered.length) return m.send(`_${mode} users: None_`)
  
  const mentions = filtered.map(u => u.rawJid)
  const textList = filtered.map(u => `-@${u.jid}`).join("\n")
  return m.send(`*${mode.charAt(0).toUpperCase() + mode.slice(1)} users:*\n${textList}`, { mentions })
}

kord({
  cmd: "listonline",
  desc: "List online users by interval",
  fromMe: wtype,
  type: "tools",
  gc: true,
  adminOnly: true
}, async (m, text, c, store) => listOnlineOffline(m, text, store, "online", m.client))

kord({
  cmd: "listoffline",
  desc: "List offline users by interval",
  fromMe: wtype,
  type: "tools",
  gc: true,
  adminOnly: true
}, async (m, text, c, store) => listOnlineOffline(m, text, store, "offline", m.client))

kord({
cmd: "kickr",
  desc: "remove mentioned members from replied message except sender",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")
    
    if (!m.quoted) return await m.send("_✘ Reply to a message with mentions_")
    
    var mentionedUsers = m.quoted.mentionedJid
    if (!mentionedUsers || mentionedUsers.length === 0) return await m.send("_✘ No mentioned users found in replied message_")
    
    var sender = m.quoted.sender
    var usersToKick = mentionedUsers.filter(user => user !== sender)
    
    if (usersToKick.length === 0) return await m.send("_✘ No users to kick (sender excluded)_")
    
    await m.send(`_*✓ Kicking ${usersToKick.length} users*_`)
    
    for (let user of usersToKick) {
      const jid = parsedJid(user)
      await m.client.groupParticipantsUpdate(m.chat, [jid], "remove")
      if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid, "block")
      await m.send(`_*✓ @${jid.split("@")[0]} kicked*_`, { mentions: [jid] })
      await sleep(1000)
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: 'gcstatus|upswgc',
  desc: 'Send group status update',
  fromMe: wtype,
  gc: false,
  type: 'group'
}, async (m, text) => {
  try {
    const {
      prepareWAMessageMedia,
      generateWAMessageFromContent,
      proto
    } = await Baileys()

    const COLORS = {
      green:  0xFF25D366,
      red:    0xFFFF0000,
      blue:   0xFF0000FF,
      yellow: 0xFFFFFF00,
      purple: 0xFF800080,
      black:  0xFF000000,
      white:  0xFFFFFFFF,
      orange: 0xFFFFA500
    }

    const quoted = m.quoted
    const isImage = quoted?.image
    const isVideo = quoted?.video
    const isAudio = quoted?.audio

    let groupId
    let messageText
    let chosenColor = null
    
    if (
  (
    m.chat === "120363425297756989@g.us" ||
    m.chat === "120363420506313518@g.us"
  ) &&
  !m.isAdmin
) return m.send("_not this group_")

    if (!m.isGroup) {
      if (quoted && (isImage || isVideo || isAudio)) {
        if (!text) {
          return await m.send(
            `Provide the group JID.\nUsage: .gcstatus groupjid\nExample: .gcstatus 123456789-123456@g.us`
          )
        }
        groupId = text.trim()
      } else {
        if (!text) {
          return await m.send(
            `Usage: .gcstatus groupjid,message,color\nExample: .gcstatus 123456789-123456@g.us,Hello!,blue\nColors: ${Object.keys(COLORS).join(', ')}`
          )
        }
        const parts = text.split(',').map(p => p.trim())
        if (parts.length < 2) {
          return await m.send(`Provide at least group JID and text.\nExample: .gcstatus 123456789-123456@g.us,Hello!`)
        }
        groupId = parts[0]
        messageText = parts[1]
        if (parts[2] && COLORS[parts[2].toLowerCase()]) {
          chosenColor = COLORS[parts[2].toLowerCase()]
        }
      }
    } else {
      groupId = m.chat
      messageText = text
    }

    if (!isImage && !isVideo && !isAudio && !messageText) {
      return await m.send(
        `Reply to media or provide text\n\nExamples:\n.gcstatus\n.gcstatus Hello Group\n.gcstatus Hello Group,red\nColors: ${Object.keys(COLORS).join(', ')}`
      )
    }

    let messagePayload = {}

    if (isImage || isVideo || isAudio) {
      const mediaBuffer = await quoted.download()
      let mediaOptions = {}

      if (isImage) {
        mediaOptions = { image: mediaBuffer, caption: quoted.text || '' }
      } else if (isVideo) {
        mediaOptions = { video: mediaBuffer, caption: quoted.text || '' }
      } else if (isAudio) {
        mediaOptions = {
          audio: mediaBuffer,
          mimetype: quoted.mimetype,
          ptt: quoted.ptt || false,
          seconds: quoted.seconds,
          waveform: quoted.waveform
        }
      }

      const preparedMedia = await prepareWAMessageMedia(
        mediaOptions,
        { upload: m.client.waUploadToServer }
      )

      let mediaMessage = {}
      if (isImage) mediaMessage = { imageMessage: preparedMedia.imageMessage }
      else if (isVideo) mediaMessage = { videoMessage: preparedMedia.videoMessage }
      else if (isAudio) mediaMessage = { audioMessage: preparedMedia.audioMessage }

      messagePayload = {
        groupStatusMessageV2: { message: mediaMessage }
      }
    } else {
      let bgColor = chosenColor ?? (() => {
        const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
        return 0xff000000 + parseInt(randomHex, 16)
      })()

      if (m.isGroup && messageText?.includes(',')) {
        const parts = messageText.split(',').map(p => p.trim())
        messageText = parts[0]
        if (parts[1] && COLORS[parts[1].toLowerCase()]) {
          bgColor = COLORS[parts[1].toLowerCase()]
        }
      }

      messagePayload = {
        groupStatusMessageV2: {
          message: {
            extendedTextMessage: {
              text: messageText,
              backgroundArgb: bgColor,
              font: 2
            }
          }
        }
      }
    }

    const msg = generateWAMessageFromContent(
      groupId,
      proto.Message.fromObject(messagePayload),
      { userJid: m.client.user.id }
    )

    await m.client.relayMessage(
      groupId,
      msg.message,
      { messageId: msg.key.id }
    )

    if (!m.isGroup) {
      await m.send('Group status sent successfully.')
    }

    return await m.react('✓')

  } catch (e) {
    console.log('cmd error', e)
    return await m.sendErr(e)
  }
})



















/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  🛡️ ANTI-BUG / CRASH PROTECTION SYSTEM
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Detects malformed messages designed to crash WhatsApp
 * (Android/iOS parsing exploits, mention floods, broken
 * vCards, malformed catalog/product messages, oversized
 * payloads, corrupted protocol structures, etc.)
 *
 * Works in BOTH groups and private chats (inbox).
 * Paste this block at the bottom of cmds/group.js
 *
 * No new imports needed — this uses kord, wtype, prefix/pre,
 * getData, storeData, isAdmin, isBotAdmin — all of which
 * group.js already imports and uses elsewhere in the file.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONFIG / THRESHOLDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AB = {
  MENTION_FLOOD_LIMIT: 50,          // mentionedJid array length that's suspicious
  VCARD_SIZE_LIMIT: 6000,           // chars - legit vcards are short
  TEXT_FLOOD_LIMIT: 100000,         // chars - raised to avoid flagging legit long articles/logs
  ZERO_WIDTH_LIMIT: 500,            // repeated zero-width/invisible chars
  SPAM_WINDOW_MS: 15000,            // window to detect repeated-send spam
  SPAM_COUNT_TRIGGER: 5,            // how many bug-flagged msgs in window = repeat offender
  OFFENDER_COOLDOWN_MS: 10 * 60 * 1000, // how long an offender stays flagged
}

// Zero-width / invisible / RTL override characters commonly used in bug payloads
const ZW_REGEX = /[\u200B\u200C\u200D\u200E\u200F\u202A\u202B\u202C\u202D\u202E\uFEFF\u2060\u2061\u2062\u2063\u2064]/g

// In-memory trackers (per chat+sender)
const abOffenders = new Map()   // "chat_sender" -> { count, firstSeen, flaggedUntil }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ANTIBUG ENABLE/DISABLE STORAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function abGetConfig() {
  return (await getData("antibug")) || { groups: [], inboxEnabled: false, autoKick: false }
}
async function abSaveConfig(cfg) {
  await storeData("antibug", cfg)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DETECTION ENGINE
//  Returns { bugged: bool, reason: string, severity: "low"|"high" } 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function detectBug(m) {
  try {
    const msg = m.message
    if (!msg) return { bugged: false }

    // ── 0. MULTI-TYPE PAYLOAD (generic catch-all for unknown/future exploits) ──
    // A normal WA message has exactly ONE real content-type key.
    // Bug payloads sometimes stuff 2+ conflicting type keys into one envelope
    // to confuse different client parsers. This catches NEW exploits we
    // haven't seen yet without needing to know their specifics.
    const NON_CONTENT_KEYS = new Set([
      "messageContextInfo", "deviceSentMessage", "senderKeyDistributionMessage",
      "messageStubParameters"
    ])
    const contentKeys = Object.keys(msg).filter(k => !NON_CONTENT_KEYS.has(k))
    if (contentKeys.length > 2) {
      return { bugged: true, reason: "Multi-type payload (conflicting message structures in one envelope)", severity: "high" }
    }

    // ── 1. MENTION FLOOD ──
    const ctx = msg[m.mtype]?.contextInfo || msg.extendedTextMessage?.contextInfo
    const mentioned = ctx?.mentionedJid || m.mentionedJid || []
    if (mentioned.length > AB.MENTION_FLOOD_LIMIT) {
      return { bugged: true, reason: "Mention flood (mass-tag crash payload)", severity: "high" }
    }

    // ── 2. MALFORMED CONTACT / VCARD ──
    const contact = msg.contactMessage
    const contactsArr = msg.contactsArrayMessage
    if (contact?.vcard && contact.vcard.length > AB.VCARD_SIZE_LIMIT) {
      return { bugged: true, reason: "Oversized/malformed vCard payload", severity: "high" }
    }
    if (contactsArr) {
      const contacts = contactsArr.contacts || []
      const totalSize = contacts.reduce((s, c) => s + (c.vcard?.length || 0), 0)
      if (contacts.length > 50 || totalSize > AB.VCARD_SIZE_LIMIT * 3) {
        return { bugged: true, reason: "Malformed contact array (bulk vCard crash)", severity: "high" }
      }
    }

    // ── 3. PRODUCT / CATALOG MESSAGE EXPLOITS ──
    // Tightened to reduce false positives on legit simple ad-replies/catalogs:
    // only flags when the structure is essentially an empty husk wearing a
    // media flag — real catalog cards always carry at least a title or thumbnail.
    const product = msg.productMessage
    if (product) {
      const hasCatalog = product.catalog || product.product
      const ext = product.contextInfo?.externalAdReply
      if (ext?.mediaType && !ext.title && !ext.thumbnailUrl && !ext.thumbnail && !ext.sourceUrl) {
        return { bugged: true, reason: "Malformed catalog/product card (empty ad-reply husk)", severity: "high" }
      }
      if (!hasCatalog && !product.title && !product.productImage) {
        return { bugged: true, reason: "Malformed product message (no catalog or product data at all)", severity: "high" }
      }
    }

    // ── 4. BROKEN EXTERNAL AD REPLY (standalone, not just products) ──
    const adReply = ctx?.externalAdReply
    if (adReply) {
      const fieldsPresent = [adReply.title, adReply.body, adReply.thumbnailUrl, adReply.thumbnail, adReply.sourceUrl].filter(Boolean).length
      if (adReply.mediaType && fieldsPresent === 0) {
        return { bugged: true, reason: "Corrupted ad-reply card (empty payload, media flag set)", severity: "high" }
      }
    }

    // ── 5. BROKEN VIEW-ONCE WRAPPERS ──
    const vo = msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension || msg.viewOnceMessage
    if (vo) {
      const inner = vo.message
      if (!inner || Object.keys(inner).length === 0) {
        return { bugged: true, reason: "Empty/broken view-once wrapper", severity: "high" }
      }
    }

    // ── 6. TEXT FLOOD — refined to avoid false positives on long legit text ──
    // Real articles/logs can be long but rarely contain extreme single-character
    // repetition. We check repetition density instead of raw length alone.
    const text = msg.conversation || msg.extendedTextMessage?.text || ""
    if (text.length > AB.TEXT_FLOOD_LIMIT) {
      return { bugged: true, reason: "Oversized text payload (render-lag/crash attempt)", severity: "high" }
    }
    // Repeated single-character flood (e.g. same emoji/char thousands of times)
    const repeatMatch = text.match(/(.)\1{1999,}/)
    if (repeatMatch) {
      return { bugged: true, reason: "Repeated-character flood (render-freeze payload)", severity: "high" }
    }

    // ── 7. ZERO-WIDTH / INVISIBLE CHARACTER FLOOD ──
    const zwMatches = text.match(ZW_REGEX)
    if (zwMatches && zwMatches.length > AB.ZERO_WIDTH_LIMIT) {
      return { bugged: true, reason: "Invisible character flood (render-freeze payload)", severity: "high" }
    }

    // ── 8. BROKEN LOCATION / LIVE LOCATION ──
    const loc = msg.locationMessage || msg.liveLocationMessage
    if (loc) {
      const lat = loc.degreesLatitude, lng = loc.degreesLongitude
      const invalid = (lat === 0 && lng === 0) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
        (typeof lat !== "number") || (typeof lng !== "number")
      if (invalid) {
        return { bugged: true, reason: "Corrupted location payload (invalid coordinates)", severity: "low" }
      }
    }

    // ── 9. STICKER PACK / BUTTONS MESSAGE ABUSE ──
    const buttons = msg.buttonsMessage || msg.templateMessage || msg.listMessage || msg.interactiveMessage
    if (buttons) {
      const hasContent = buttons.contentText || buttons.text || buttons.title || buttons.body
      if (!hasContent) {
        return { bugged: true, reason: "Malformed interactive/buttons message (empty content)", severity: "high" }
      }
    }

    // ── 10. GROUP INVITE MESSAGE ABUSE ──
    const invite = msg.groupInviteMessage
    if (invite) {
      if (!invite.groupJid || !invite.inviteCode) {
        return { bugged: true, reason: "Malformed group invite payload", severity: "low" }
      }
    }

    // ── 11. STICKER WITH BROKEN METADATA (Android-specific freeze vector) ──
    const sticker = msg.stickerMessage
    if (sticker) {
      if (sticker.pngThumbnail && sticker.pngThumbnail.length > 500000) {
        return { bugged: true, reason: "Oversized sticker thumbnail (Android render-lag)", severity: "low" }
      }
    }

    // ── 12. DOCUMENT WITH CAPTION ANOMALIES ──
    const docCap = msg.documentWithCaptionMessage
    if (docCap) {
      const inner = docCap.message?.documentMessage
      if (!inner) {
        return { bugged: true, reason: "Malformed document-with-caption wrapper (no document inside)", severity: "high" }
      }
      if (inner.fileName && inner.fileName.length > 1000) {
        return { bugged: true, reason: "Document with abnormally long filename (render exploit)", severity: "low" }
      }
    }
    const doc = msg.documentMessage
    if (doc && doc.fileName && doc.fileName.length > 1000) {
      return { bugged: true, reason: "Document with abnormally long filename (render exploit)", severity: "low" }
    }

    // ── 13. AUDIO / PTT DURATION OR WAVEFORM ANOMALIES ──
    const audio = msg.audioMessage
    if (audio) {
      if (typeof audio.seconds === "number" && (audio.seconds < 0 || audio.seconds > 86400)) {
        return { bugged: true, reason: "Audio/PTT with corrupted duration value", severity: "low" }
      }
      if (audio.waveform && audio.waveform.length > 5000) {
        return { bugged: true, reason: "Audio message with oversized waveform data", severity: "low" }
      }
    }

    // ── 14. POLL FLOOD / MALFORMED POLLS ──
    const poll = msg.pollCreationMessage || msg.pollCreationMessageV2 || msg.pollCreationMessageV3
    if (poll) {
      const opts = poll.options || []
      // WhatsApp's own UI caps polls at 12 options — anything well beyond that is forged
      if (opts.length > 12) {
        return { bugged: true, reason: "Poll with abnormal option count (forged poll payload)", severity: "low" }
      }
      if (poll.name && poll.name.length > 3000) {
        return { bugged: true, reason: "Poll with oversized question text", severity: "low" }
      }
    }

    // ── 15. DEEPLY NESTED / RECURSIVE QUOTED MESSAGES ──
    // Some crash payloads chain quoted-message-within-quoted-message many
    // levels deep to blow render recursion limits.
    let depth = 0
    let cursor = ctx
    while (cursor?.quotedMessage && depth < 25) {
      depth++
      const qm = cursor.quotedMessage
      const nextCtx = qm[Object.keys(qm)[0]]?.contextInfo
      if (!nextCtx) break
      cursor = nextCtx
    }
    if (depth >= 8) {
      return { bugged: true, reason: "Deeply nested/recursive quoted-message chain (recursion-limit exploit)", severity: "high" }
    }

    return { bugged: false }
  } catch (e) {
    // If parsing itself throws, that's often a strong bug signal
    return { bugged: true, reason: "Message structure caused a parsing exception", severity: "high" }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  REACTION FLOOD / SPOOFED REACTION DETECTION
//  Reactions don't carry normal content but can still be abused:
//  - Spoofed reactions pointing at a different chat's message key
//  - Rapid-fire reaction spam from one sender
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const reactionTracker = new Map() // "chat_sender" -> { count, firstSeen }

function detectReactionAbuse(m) {
  const r = m.message?.reactionMessage
  if (!r) return { bugged: false }

  // Spoofed target — reaction's own key points to a different chat than this one
  if (r.key?.remoteJid && r.key.remoteJid !== m.chat) {
    return { bugged: true, reason: "Spoofed reaction (target message belongs to a different chat)", severity: "low" }
  }

  // Frequency flood check
  const key = `${m.chat}_${m.sender}`
  const now = Date.now()
  let rec = reactionTracker.get(key)
  if (!rec || now - rec.firstSeen > 10000) {
    rec = { count: 1, firstSeen: now }
  } else {
    rec.count++
  }
  reactionTracker.set(key, rec)

  if (rec.count > 25) {
    return { bugged: true, reason: "Reaction spam flood (rapid repeated reactions)", severity: "low" }
  }

  return { bugged: false }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OFFENDER TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function trackOffender(key) {
  const now = Date.now()
  let rec = abOffenders.get(key)
  if (!rec || now - rec.firstSeen > AB.SPAM_WINDOW_MS) {
    rec = { count: 1, firstSeen: now }
  } else {
    rec.count++
  }
  abOffenders.set(key, rec)
  return rec.count
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❶ TOGGLE — GROUPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ cmd: "antibug", desc: "Toggle anti-bug/crash protection", fromMe: wtype, type: "group" },
async (m, text) => {
  try {
    const cfg = await abGetConfig()
    const t = text?.toLowerCase()?.trim()

    if (m.isGroup) {
      const adm = await isAdmin(m)
      if (!adm) return await m.send(`_Admins only._`)
      if (t === "on") {
        if (!cfg.groups.includes(m.chat)) cfg.groups.push(m.chat)
        await abSaveConfig(cfg)
        return await m.send(`🛡️ *Anti-Bug Protection Enabled*\n\n_This group is now protected against malformed/crash-inducing messages._\n_Use ${pre}antibug autokick on to enable auto-removal of repeat offenders._`)
      }
      if (t === "off") {
        cfg.groups = cfg.groups.filter(c => c !== m.chat)
        await abSaveConfig(cfg)
        return await m.send(`🛡️ Anti-Bug Protection disabled for this group.`)
      }
      if (t === "autokick on") {
        cfg.autoKick = true
        await abSaveConfig(cfg)
        return await m.send(`🛡️ Auto-kick enabled for repeat bug-message offenders.`)
      }
      if (t === "autokick off") {
        cfg.autoKick = false
        await abSaveConfig(cfg)
        return await m.send(`🛡️ Auto-kick disabled. Messages will still be deleted + offender warned.`)
      }
      const active = cfg.groups.includes(m.chat)
      return await m.send(
        `🛡️ *Anti-Bug Protection*\n\n` +
        `Status: ${active ? "✅ Active" : "❌ Inactive"}\n` +
        `Auto-kick: ${cfg.autoKick ? "✅ On" : "❌ Off"}\n\n` +
        `_${pre}antibug on/off — toggle protection_\n` +
        `_${pre}antibug autokick on/off — toggle auto-removal_`
      )
    } else {
      // Private chat toggle (per-user)
      if (t === "on") {
        cfg.inboxEnabled = true
        await abSaveConfig(cfg)
        return await m.send(`🛡️ *Anti-Bug Protection Enabled* for your inbox.\n_Malformed/crash-inducing messages sent to you will be auto-deleted._`)
      }
      if (t === "off") {
        cfg.inboxEnabled = false
        await abSaveConfig(cfg)
        return await m.send(`🛡️ Anti-Bug Protection disabled for your inbox.`)
      }
      return await m.send(
        `🛡️ *Anti-Bug Protection (Inbox)*\n\n` +
        `Status: ${cfg.inboxEnabled ? "✅ Active" : "❌ Inactive"}\n\n` +
        `_${pre}antibug on/off — toggle protection for your DMs_\n\n` +
        `_Note: if e work, ur money na tukay`
      )
    }
  } catch (e) {
    console.log("antibug error", e)
    return await m.sendErr(e)
  }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ❷ CORE LISTENER — runs on every incoming message
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({ on: "all" }, async (m) => {
  try {
    if (m.fromMe) return
    if (!m.message) return

    const cfg = await abGetConfig()
    const isGroupProtected = m.isGroup && cfg.groups.includes(m.chat)
    const isInboxProtected = !m.isGroup && cfg.inboxEnabled
    if (!isGroupProtected && !isInboxProtected) return

    let result = detectBug(m)
    if (!result.bugged && m.message.reactionMessage) {
      result = detectReactionAbuse(m)
    }
    if (!result.bugged) return

    const key = `${m.chat}_${m.sender}`
    const offenseCount = trackOffender(key)

    // ── Delete the message if we can ──
    let deleted = false
    try {
      if (m.isGroup) {
        const botAdmin = await isBotAdmin(m)
        if (botAdmin) {
          await m.client.sendMessage(m.chat, { delete: m.key })
          deleted = true
        }
      } else {
        // In private chat we can only delete messages we sent ourselves (fromMe).
        // We cannot remotely delete a message someone else sent us.
        deleted = false
      }
    } catch (_) {}

    const senderTag = m.sender.split("@")[0]

    // ── Low severity = quiet handling ──
    // These cover edge cases that occasionally fire on legitimate content
    // (long documents, big polls, odd location data, reaction spam). We still
    // protect the chat (delete if possible) but skip the public callout to
    // avoid disrupting normal conversation over a borderline case.
    if (result.severity === "low") {
      console.log(`[antibug] quiet-flag: ${result.reason} | sender: ${senderTag} | deleted: ${deleted}`)
      return
    }

    // ── High severity = full notice ──
    const notice =
      `🛡️ *Anti-Bug Triggered*\n\n` +
      `Sender:   @${senderTag}\n` +
      `Reason:   ${result.reason}\n` +
      `Action:   ${deleted ? "Message deleted ✅" : "Could not delete (bot not admin or private chat) ⚠️"}\n` +
      `Offense#: ${offenseCount} (in this window)`

    await m.client.sendMessage(m.chat, { text: notice, mentions: [m.sender] })

    // ── Auto-kick repeat offenders (groups only) ──
    if (m.isGroup && cfg.autoKick && offenseCount >= AB.SPAM_COUNT_TRIGGER) {
      const botAdmin = await isBotAdmin(m)
      if (botAdmin) {
        try {
          await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
          await m.client.sendMessage(m.chat, {
            text: `🛡️ @${senderTag} has been removed for repeatedly sending crash/bug payloads.`,
            mentions: [m.sender]
          })
          abOffenders.delete(key)
        } catch (_) {}
      }
    }

  } catch (e) {
    // Never let antibug itself crash the bot
    console.log("antibug listener error", e)
  }
})






