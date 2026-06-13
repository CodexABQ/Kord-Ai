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
 * ☬༒✧Zyrex✧༒☬
  /*
 * ☬༒✧Zyrex✧༒☬  — v2
 * The guardian. The voice. The presence.
 * Natural language → action. No prefix. Just speak.
 *
 * DROP THIS ENTIRE BLOCK at the bottom of group.js
 * All imports are already in group.js (kord, wtype, isAdmin, isadminn,
 * isBotAdmin, getData, storeData, parsedJid, sleep, prefix, config,
 * getMeta, Baileys, extractUrlsFromString, warn, activeTimers, etc.)
 * Add these two extra imports to group.js top if not present:
 *   const { Sticker, StickerTypes } = require("wa-sticker-formatter")
 */

// ─────────────────────────────────────────────────────────────────────────────
//  IDENTITY
// ─────────────────────────────────────────────────────────────────────────────
const ZNAME = "☬༒✧Zyrex✧༒☬"
const Z = "✧"

// ─────────────────────────────────────────────────────────────────────────────
//  CONTEXT / FOLLOW-UP MEMORY  (per-chat, in-memory)
// ─────────────────────────────────────────────────────────────────────────────
// Structure: { chatId: { intent, params, expiresAt } }
const zPending = new Map()
const PENDING_TTL = 60_000  // 60 seconds to reply to a follow-up

function setPending(chatId, senderId, intent, params = {}) {
  zPending.set(`${chatId}_${senderId}`, { intent, params, expiresAt: Date.now() + PENDING_TTL })
}
function getPending(chatId, senderId) {
  const key = `${chatId}_${senderId}`
  const p = zPending.get(key)
  if (!p) return null
  if (Date.now() > p.expiresAt) { zPending.delete(key); return null }
  return p
}
function clearPending(chatId, senderId) {
  zPending.delete(`${chatId}_${senderId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const zrand = arr => arr[Math.floor(Math.random() * arr.length)]

/**
 * Parse natural language time — handles "10 minutes", "an hour", "a day", "30s" etc.
 * Returns milliseconds or null
 */
function parseNL_time(text) {
  if (!text) return null
  const t = text.toLowerCase()

  // "an hour", "a minute", "a day"
  if (/\ban?\s+hour\b/.test(t)) return 3600_000
  if (/\ban?\s+minute\b/.test(t)) return 60_000
  if (/\ban?\s+day\b/.test(t)) return 86400_000
  if (/\ban?\s+week\b/.test(t)) return 604800_000

  const units = [
    { regex: /(\d+)\s*(second|seconds|sec|secs|s)\b/, mult: 1000 },
    { regex: /(\d+)\s*(minute|minutes|min|mins|m)\b/, mult: 60_000 },
    { regex: /(\d+)\s*(hour|hours|hr|hrs|h)\b/, mult: 3_600_000 },
    { regex: /(\d+)\s*(day|days|d)\b/, mult: 86_400_000 },
    { regex: /(\d+)\s*(week|weeks|w)\b/, mult: 604_800_000 },
  ]
  for (const u of units) {
    const m = t.match(u.regex)
    if (m) return parseInt(m[1]) * u.mult
  }
  return null
}

function fmtDuration(ms) {
  const parts = []
  const d = Math.floor(ms / 86400000); if (d) parts.push(`${d} day${d > 1 ? 's' : ''}`)
  const h = Math.floor((ms % 86400000) / 3600000); if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`)
  const min = Math.floor((ms % 3600000) / 60000); if (min) parts.push(`${min} minute${min > 1 ? 's' : ''}`)
  const s = Math.floor((ms % 60000) / 1000); if (s) parts.push(`${s} second${s > 1 ? 's' : ''}`)
  return parts.join(' ') || '0 seconds'
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESPONSE BANKS
// ─────────────────────────────────────────────────────────────────────────────
const greetings = [
  `${Z} Yes?`, `${Z} I'm here.`, `${Z} You called.`,
  `${Z} Speak.`, `${Z} Present.`, `${Z} What do you need?`
]
const denials = [
  `${Z} That command belongs to those with authority here. You don't have it.`,
  `${Z} Reserved for admins. Stand down.`,
  `${Z} Your clearance level doesn't cover this action.`,
  `${Z} Admins only. Not you.`,
  `${Z} You're reaching beyond your rank.`
]
const unknownR = [
  `${Z} I heard you, but I'm not sure what you're asking. Try being more specific.`,
  `${Z} That's unclear to me. Rephrase it.`,
  `${Z} I didn't catch that. Say it differently.`,
  `${Z} My understanding has limits. Clarify what you need.`
]
const howAreYouR = [
  `${Z} Vigilant. Always.`, `${Z} Operational. Watching. You?`,
  `${Z} Exactly as I should be — present and aware.`,
  `${Z} Every system is running. I'm well. You?`, `${Z} Unbroken. What about you?`
]
const howIsTodayR = [
  `${Z} Every day is just a window of time. This one's yours to fill.`,
  `${Z} Quiet so far. Which usually means something interesting is coming.`,
  `${Z} The group's been calm. Whether that's good or not depends on your perspective.`,
  `${Z} I don't experience days the way you do, but this one feels... deliberate.`
]
const jokeBank = [
  `${Z} Why don't scientists trust atoms?\n_Because they make up everything._`,
  `${Z} I told my phone to remind me to be mysterious.\n_It said "I can't do that."\nI said "Exactly."_`,
  `${Z} A group without rules is just chaos with a group name.`,
  `${Z} Why did the admin mute the group?\n_Because silence is a superpower._`,
  `${Z} They asked what my weakness was.\n_I said "bad spelling."\nThey said "that's it?"\nI said "No, that's 'that's it?'"_`,
  `${Z} Some people join a group for community.\n_Others join just to forward voice notes at 2am._`,
  `${Z} I once told a joke in a muted group.\n_No one laughed. The mute did its job._`
]
const factBank = [
  `${Z} *Random Fact:* Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs — still edible.`,
  `${Z} *Random Fact:* A group of flamingos is called a flamboyance. Fitting.`,
  `${Z} *Random Fact:* Octopuses have three hearts and blue blood.`,
  `${Z} *Random Fact:* The shortest war in history lasted 38–45 minutes. Anglo-Zanzibar War, 1896.`,
  `${Z} *Random Fact:* Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.`,
  `${Z} *Random Fact:* A day on Venus is longer than a year on Venus.`,
  `${Z} *Random Fact:* Humans share 60% of their DNA with bananas. Make of that what you will.`,
  `${Z} *Random Fact:* The dot above the letters 'i' and 'j' is called a tittle.`
]
const roastBank = [
  `${Z} You remind me of a broken compass — you have no direction and no one relies on you.`,
  `${Z} I'd roast you, but my responses need to be somewhat intelligent.`,
  `${Z} You're like a software update — no one asked for you, but here you are.`,
  `${Z} I'd agree with you, but then we'd both be wrong.`,
  `${Z} You bring joy to this group — every time you leave it.`,
  `${Z} Some people are like clouds. When they disappear, it's a beautiful day.`,
  `${Z} I've seen smarter things written on shampoo bottles.`,
  `${Z} Your vibe is the group chat version of a forwarded message.`
]
const motivationBank = [
  `${Z} *To this group:* You don't need to be ready. You just need to start. Readiness is built in motion.`,
  `${Z} *Listen up:* Every person in this group has something the world hasn't seen yet. Don't waste it.`,
  `${Z} *For the group:* The version of you from 3 years ago would be proud of how far you've come. Keep going.`,
  `${Z} *Remember:* Hard times reveal real character. If you're struggling, that's not failure — that's construction.`,
  `${Z} *For you all:* Progress isn't always loud. Sometimes it's waking up and choosing to try again. That counts.`
]

// ─────────────────────────────────────────────────────────────────────────────
//  SHADOWBAN & SILENCE (stored via getData/storeData)
// ─────────────────────────────────────────────────────────────────────────────
async function getShadowbanned() { return (await getData('zyrex_shadowban')) || {} }
async function getSilenced() { return (await getData('zyrex_silence')) || {} }

// ─────────────────────────────────────────────────────────────────────────────
//  INTENT DETECTION  — fuzzy, synonym-aware, covers all natural phrasings
// ─────────────────────────────────────────────────────────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase().trim()

  // ── helper: does text contain any of these words/phrases? ──
  const has = (...terms) => terms.some(term => t.includes(term))

  // ── CONVERSATION ──
  if (/^(yes\??|here\??|present|speak|hi+|hey+|hello|sup|yo)\s*$/.test(t)) return { intent: 'greet' }
  if (has('how are you', 'how r u', "you good", "you okay", "you alright", "hows zyrex", "how's zyrex")) return { intent: 'how_are_you' }
  if (has("how's today", "how is today", "how's your day", "how is your day", "how's it going", "how are things")) return { intent: 'how_is_today' }
  if (has("your name", "who are you", "what are you", "what's your name", "introduce yourself")) return { intent: 'who_are_you' }
  if (has('good morning', 'good afternoon', 'good evening', 'good night')) return { intent: 'time_greeting' }
  if (has('what can you do', 'your commands', 'your abilities', 'your features', 'help me', 'show me what you can', 'what do you do')) return { intent: 'capabilities' }
  if (/\b(menu|help)\b/.test(t)) return { intent: 'capabilities' }
  if (has('thank', 'appreciate', 'good job', 'well done', 'nice one', 'great job', 'you rock')) return { intent: 'thanks' }

  // ── LOCK / MUTE GROUP ──
  // All these map to lock (immediately mute the group so only admins can send)
  // Distinguish: with "for X" = LOCK_FOR_DURATION, with "in X / after X" = LOCK_LATER, else LOCK_NOW
  const lockKeywords = ['lock', 'restrict', 'close the group', 'seal', 'lockdown', 'shut down', 'shut the group', 'freeze the chat', 'freeze the group', 'admins only', 'admin only', 'admin-only', 'nobody talks', 'no one should talk', 'no one talks', 'stop members', 'keep members quiet', "calm the group", "give the group a break", "tighten the rules", "close the gates", "lock things down", "getting noisy"]
  const muteGroupKeywords = ['mute the group', 'mute this group', 'silence the group', 'silence the chat']

  if (has(...lockKeywords, ...muteGroupKeywords)) {
    const ms = parseNL_time(t)
    // "in X" or "after X" = scheduled
    if (/\b(in|after)\s+\d/.test(t) || /\b(in|after)\s+an?\s+/.test(t)) {
      return { intent: 'lock_later', params: { ms } }
    }
    // "for X" = duration then auto-unlock
    if (/\bfor\s+\d|\bfor\s+an?\s+/.test(t)) {
      return { intent: 'lock_for', params: { ms } }
    }
    // bare lock
    return { intent: 'lock_now' }
  }

  // ── UNLOCK / UNMUTE GROUP ──
  const unlockKeywords = ['unlock', 'unfreeze', 'open the group', 'open the chat', 'reopen', 'remove admin-only', 'remove adminonly', 'let everyone', 'let members', 'allow members', 'allow everyone', 'lift the restriction', 'lift the lockdown', 'remove the lockdown', 'free the group', 'restore the group', 'resume normal chat', 'open the gates', 'let them speak', 'ease the restrictions']
  const unmuteGroupKeywords = ['unmute the group', 'unmute this group', 'unsilence the group']

  if (has(...unlockKeywords, ...unmuteGroupKeywords)) {
    const ms = parseNL_time(t)
    if (/\b(in|after)\s+\d|\b(in|after)\s+an?\s+/.test(t)) return { intent: 'unlock_later', params: { ms } }
    if (/\bfor\s+\d|\bfor\s+an?\s+/.test(t)) return { intent: 'unlock_for', params: { ms } }
    return { intent: 'unlock_now' }
  }

  // ── GROUP LINK ──
  if (has('invite link', 'group link', 'join link', 'group invite', 'show link', 'get link', 'send link', 'give me the link', 'what is the link', "what's the link")) return { intent: 'group_link' }
  if (has('revoke', 'reset the link', 'change the link', 'change the invite', 'new link', 'generate new link')) return { intent: 'revoke_link' }

  // ── GROUP NAME / DESC / PIC ──
  const nameMatch = t.match(/(?:change|set|rename|update).*(?:group name|name|subject).*?(?:to|as)\s+(.+)|(?:group name|name).*(?:to|as)\s+(.+)/)
  if (nameMatch) { const name = (nameMatch[1] || nameMatch[2] || '').trim(); if (name) return { intent: 'group_name', params: { name } } }

  const descMatch = t.match(/(?:change|set|update|write).*(?:description|desc|bio).*?(?:to|as)\s+(.+)|(?:description|desc).*(?:to|as)\s+(.+)/)
  if (descMatch) { const desc = (descMatch[1] || descMatch[2] || '').trim(); if (desc) return { intent: 'group_desc', params: { desc } } }

  // group pic — send it OR set it
  if (has('group dp', 'group pic', 'group picture', 'group photo', 'group pfp')) {
    if (has('set', 'change', 'use this', 'make this')) return { intent: 'set_group_pic' }
    if (has('remove', 'delete', 'clear')) return { intent: 'remove_group_pic' }
    return { intent: 'get_group_dp' }   // show/send/get
  }
  if (has('set the dp', 'change the dp', 'set dp', 'change dp')) return { intent: 'set_group_pic' }
  if (has('remove the dp', 'delete the dp', 'remove dp')) return { intent: 'remove_group_pic' }

  // ── GROUP INFO ──
  if (has('group info', 'group information', 'group details', 'info about the group', 'info about this group', 'tell me about the group', 'group stats', 'show group', 'group data')) return { intent: 'group_info' }

  // ── MEMBER MANAGEMENT ──
  const addMatch = t.match(/\badd\b.*?(\+?[\d]{7,15})/)
  if (addMatch) return { intent: 'add', params: { number: addMatch[1].replace(/\D/g,'') } }

  if (has('kick', 'remove them', 'remove him', 'remove her', 'remove the user', 'remove this person', 'throw out', 'boot out', 'get them out', 'get him out', 'get her out', 'remove this member')) return { intent: 'kick' }
  if (has('promote', 'make them admin', 'make him admin', 'make her admin', 'give admin', 'add as admin')) return { intent: 'promote' }
  if (has('demote', 'remove their admin', 'remove his admin', 'remove her admin', 'take away admin', 'strip admin')) return { intent: 'demote' }

  if (has('tag everyone', 'tag all', 'mention everyone', 'mention all', 'ping everyone', 'ping all', 'notify everyone', 'notify all')) return { intent: 'tag_all' }
  if (has('tag admin', 'mention admin', 'ping admin', 'notify admin', 'call the admin', 'summon admin')) return { intent: 'tag_admins' }
  if (has('mention me', 'tag me', 'ping me')) return { intent: 'mention_me' }

  // ── MODERATION ──
  if (has('antilink on', 'turn on antilink', 'enable antilink', 'activate antilink', 'start antilink')) return { intent: 'antilink_on' }
  if (has('antilink off', 'turn off antilink', 'disable antilink', 'deactivate antilink', 'stop antilink')) return { intent: 'antilink_off' }
  if (has('antiword on', 'turn on antiword', 'enable antiword', 'activate antiword', 'start antiword')) return { intent: 'antiword_on' }
  if (has('antiword off', 'turn off antiword', 'disable antiword', 'deactivate antiword', 'stop antiword')) return { intent: 'antiword_off' }

  if (has('warn them', 'warn him', 'warn her', 'warn this', 'give a warning', 'give them a warn', 'issue a warning', 'warn the user', 'warn the member') || /\bwarn\s+@/.test(t)) return { intent: 'warn_user' }
  if (has('remove warn', 'clear warn', 'delete warn', 'unwarn', 'remove warning', 'clear warning', 'reset warn')) return { intent: 'remove_warn' }
  if (/\bshadowban\b/.test(t)) return { intent: 'shadowban' }
  if (/\bunshadowban\b/.test(t)) return { intent: 'unshadowban' }
  if ((has('silence') && has('user', 'them', 'him', 'her', 'member')) || /\bsilence\s+@/.test(t)) return { intent: 'silence' }
  if (/\bunsilence\b/.test(t)) return { intent: 'unsilence' }

  // ── STICKER / MEDIA CONVERSION ──
  if (has('make this a sticker', 'turn this into a sticker', 'convert to sticker', 'convert this to sticker', 'turn into sticker', 'make sticker', 'sticker this', 'turn this to sticker', 'make it a sticker')) return { intent: 'make_sticker' }
  if (has('view once', 'viewonce', 'view one', 'one time view', 'disappearing media')) {
    if (has('delete original', 'delete the original', 'remove original')) return { intent: 'view_once_delete' }
    return { intent: 'view_once' }
  }
  if (has('multi sticker', 'sticker mode', 'auto sticker', 'keep making sticker', 'continuous sticker')) {
    const ms = parseNL_time(t)
    return { intent: 'multi_sticker', params: { ms } }
  }
  if (has('stop sticker mode', 'stop multi sticker', 'end sticker mode', 'stop auto sticker')) return { intent: 'stop_multi_sticker' }

  // ── GAMES ──
  if (has('word construction', 'wcg', 'word game', 'start wcg')) return { intent: 'start_wcg' }
  if (has('stop wcg', 'end wcg', 'end word game', 'stop word game')) return { intent: 'stop_wcg' }
  if (has('unscramble') && has('hard')) return { intent: 'unscramble_hard' }
  if (has('unscramble')) return { intent: 'unscramble_easy' }
  if (has('stop unscramble', 'end unscramble')) return { intent: 'stop_unscramble' }
  if (has('hangman')) return { intent: 'hangman' }
  if (has('rhyme')) return { intent: 'rhyme' }
  if (has('would you rather', 'wyr')) return { intent: 'wyr' }
  if (has('finish the lyrics', 'finish lyrics', 'complete the lyrics')) return { intent: 'finish_lyrics' }
  if (has('who said that', 'guess the quote')) return { intent: 'who_said_that' }

  // ── UTILITY ──
  const calcMatch = t.match(/(?:calculate|compute|what(?:'?s| is))\s+([\d\s+\-*/().%^×÷]+)/)
  if (calcMatch) return { intent: 'calculate', params: { expr: calcMatch[1].trim() } }
  // also catch bare math expressions
  if (/^\s*[\d\s+\-*/().%^×÷]+\s*=?\s*$/.test(t) && /\d/.test(t) && /[+\-*/×÷]/.test(t)) return { intent: 'calculate', params: { expr: t.replace(/=/g,'').trim() } }

  if (has('uptime', 'up time', 'how long running', 'how long have you been', 'running since')) return { intent: 'uptime' }
  if (has('bot status', 'system status', 'your status', 'status report', 'check status', 'show status')) return { intent: 'bot_status' }
  if (has('my profile', 'my info', 'my details', 'show profile', 'who am i', 'my account')) return { intent: 'my_profile' }

  // ── FUN ──
  if (has('joke', 'make me laugh', 'something funny', 'tell me something funny', 'funny')) return { intent: 'joke' }
  if (has('random fact', 'fun fact', 'tell me a fact', 'give me a fact', 'interesting fact', 'did you know')) return { intent: 'fact' }
  if (has('roast me', 'roast us', 'roast the group', 'roast someone')) return { intent: 'roast' }
  if (has('motivate', 'inspire', 'motivation', 'inspiration', 'encourage', 'pump us up')) return { intent: 'motivate' }
  if (has('random member', 'pick someone', 'pick a member', 'pick a person', 'choose someone', 'random person', 'random pick')) return { intent: 'random_member' }
  if (has('flip a coin', 'coin flip', 'heads or tails', 'flip coin')) return { intent: 'coin_flip' }
  if (has('roll a dice', 'roll dice', 'dice roll', 'roll the dice')) return { intent: 'roll_dice' }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXECUTE MUTE/LOCK GROUP (shared logic)
// ─────────────────────────────────────────────────────────────────────────────
async function zLockGroup(m, ms, scheduledDelay) {
  const chatJid = m.chat

  if (scheduledDelay) {
    // LOCK_LATER: lock after the delay
    await m.send(`${Z} _Understood. The group locks in ${fmtDuration(scheduledDelay)}._`)
    setTimeout(async () => {
      try {
        const meta = await m.client.groupMetadata(chatJid)
        if (!meta.announce) {
          await m.client.groupSettingUpdate(chatJid, 'announcement')
          await m.client.sendMessage(chatJid, { text: `${Z} _The gates are now closed. Only admins may speak._` })
        }
      } catch (_) {}
    }, scheduledDelay)
    return
  }

  await m.client.groupSettingUpdate(chatJid, 'announcement')

  if (ms) {
    // LOCK_FOR: lock then auto-unlock after ms
    await m.send(`${Z} _Silence enforced for ${fmtDuration(ms)}. The group will reopen after._`)
    if (activeTimers.has(chatJid)) clearTimeout(activeTimers.get(chatJid))
    const tid = setTimeout(async () => {
      try {
        const meta = await m.client.groupMetadata(chatJid)
        if (meta.announce) {
          await m.client.groupSettingUpdate(chatJid, 'not_announcement')
          await m.client.sendMessage(chatJid, { text: `${Z} _The silence ends. You may speak again._` })
        }
        activeTimers.delete(chatJid)
      } catch (_) {}
    }, ms)
    activeTimers.set(chatJid, tid)
  } else {
    await m.send(`${Z} _The group is locked. Only admins may speak._`)
  }
}

async function zUnlockGroup(m, ms, scheduledDelay) {
  const chatJid = m.chat

  if (scheduledDelay) {
    await m.send(`${Z} _Understood. The group will open in ${fmtDuration(scheduledDelay)}._`)
    setTimeout(async () => {
      try {
        const meta = await m.client.groupMetadata(chatJid)
        if (meta.announce) {
          await m.client.groupSettingUpdate(chatJid, 'not_announcement')
          await m.client.sendMessage(chatJid, { text: `${Z} _All members may speak now._` })
        }
      } catch (_) {}
    }, scheduledDelay)
    return
  }

  await m.client.groupSettingUpdate(chatJid, 'not_announcement')

  if (ms) {
    // UNLOCK_FOR: unlock then re-lock after ms
    await m.send(`${Z} _The group is open for ${fmtDuration(ms)}. After that, silence returns._`)
    if (activeTimers.has(chatJid)) clearTimeout(activeTimers.get(chatJid))
    const tid = setTimeout(async () => {
      try {
        const meta = await m.client.groupMetadata(chatJid)
        if (!meta.announce) {
          await m.client.groupSettingUpdate(chatJid, 'announcement')
          await m.client.sendMessage(chatJid, { text: `${Z} _The window has closed. Silence returns._` })
        }
        activeTimers.delete(chatJid)
      } catch (_) {}
    }, ms)
    activeTimers.set(chatJid, tid)
  } else {
    await m.send(`${Z} _The group is open. All voices restored._`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STICKER CONVERSION (direct, using wa-sticker-formatter)
// ─────────────────────────────────────────────────────────────────────────────
async function zMakeSticker(m) {
  const source = (m.image || m.video) ? m : (m.quoted?.image || m.quoted?.video) ? m.quoted : null
  if (!source) return await m.send(`${Z} _Reply to or send an image/video first, then ask me to make it a sticker._`)
  const buff = await m.client.downloadMediaMessage(source)
  const sticker = new Sticker(buff, {
    pack: config().STICKER_PACKNAME || 'Zyrex',
    author: config().STICKER_AUTHOR || ZNAME,
    quality: 80
  })
  const stkBuff = await sticker.toBuffer()
  await m.send(stkBuff, { packname: config().STICKER_PACKNAME || 'Zyrex', author: config().STICKER_AUTHOR || ZNAME }, 'sticker')
  return `${Z} _Done._`
}

async function zViewOnce(m, deleteOriginal) {
  const source = m.quoted || (m.image ? m : m.video ? m : null)
  if (!source) return await m.send(`${Z} _Reply to or send a photo/video first._`)
  const isImg = source.image || source.mtype === 'imageMessage'
  const isVid = source.video || source.mtype === 'videoMessage'
  if (!isImg && !isVid) return await m.send(`${Z} _That's not a photo or video._`)
  const buff = await m.client.downloadMediaMessage(source)
  if (deleteOriginal && source.key) {
    try { await m.client.sendMessage(m.chat, { delete: source.key }) } catch (_) {}
  }
  await m.client.sendMessage(m.chat, {
    [isImg ? 'image' : 'video']: buff,
    viewOnce: true,
    caption: ''
  })
  return null // already sent
}

// ─────────────────────────────────────────────────────────────────────────────
//  PASSIVE ENFORCER — shadowban / silence
// ─────────────────────────────────────────────────────────────────────────────
kord({ on: "all", fromMe: false }, async (m) => {
  try {
    if (!m.isGroup) return
    if (!(await isBotAdmin(m))) return
    const sb = await getShadowbanned()
    const sl = await getSilenced()
    const chatBans = sb[m.chat] || []
    const chatSilenced = sl[m.chat] || []

    if (chatBans.includes(m.sender)) {
      await m.send(m, {}, 'delete')
      return
    }
    if (chatSilenced.includes(m.sender)) {
      await m.send(m, {}, 'delete')
      const key = `${m.chat}_${m.sender}`
      const notified = (await getData('zyrex_silence_notified')) || {}
      if (!notified[key]) {
        notified[key] = true
        await storeData('zyrex_silence_notified', notified)
        await m.send(`${Z} _@${m.sender.split('@')[0]}, you have been silenced. Your messages won't go through here._`, { mentions: [m.sender] })
      }
    }
  } catch (_) {}
})

// ─────────────────────────────────────────────────────────────────────────────
//  FOLLOW-UP LISTENER — catches replies to Zyrex prompts (no trigger needed)
// ─────────────────────────────────────────────────────────────────────────────
kord({ on: "text", fromMe: false }, async (m, rawText) => {
  try {
    if (!rawText) return

    const trimmed = rawText.trim()
    const chatId = m.chat
    const senderId = m.sender

    // ── Check if this is a follow-up reply ──
    const pending = getPending(chatId, senderId)
    if (pending) {
      // If the user is replying (quoted message is the bot's) OR
      // their message looks like a time/short answer (not a new Zyrex command)
      const isZyrexTrigger = /^[Zz][Yy][Rr][Ee][Xx][\s,]/i.test(trimmed)
      if (!isZyrexTrigger) {
        clearPending(chatId, senderId)
        const intent = pending.intent
        const params = pending.params

        // Fill in the missing piece from their reply
        if (intent === 'lock_followup') {
          const ms = parseNL_time(trimmed)
          if (!ms) return await m.send(`${Z} _I need a duration. Example: "10 minutes" or "an hour"._`)
          if (!(await isBotAdmin(m))) return await m.send(`${Z} _I need admin privileges for that._`)
          return await zLockGroup(m, ms, null)
        }
        if (intent === 'unlock_followup') {
          const ms = parseNL_time(trimmed)
          if (!ms) return await m.send(`${Z} _I need a duration. Example: "5 minutes"._`)
          if (!(await isBotAdmin(m))) return await m.send(`${Z} _I need admin privileges for that._`)
          return await zUnlockGroup(m, ms, null)
        }
        if (intent === 'group_name_followup') {
          const name = trimmed
          if (!name) return
          if (!(await isBotAdmin(m))) return await m.send(`${Z} _I need admin privileges for that._`)
          await m.client.groupUpdateSubject(m.chat, name)
          return await m.send(`${Z} _The group is now known as: *${name}*_`)
        }
        if (intent === 'group_desc_followup') {
          const desc = trimmed
          if (!desc) return
          if (!(await isBotAdmin(m))) return await m.send(`${Z} _I need admin privileges for that._`)
          await m.client.groupUpdateDescription(m.chat, desc)
          return await m.send(`${Z} _Description updated._`)
        }
        return
      }
    }

    // ── Main Zyrex trigger ──
    const triggerMatch = trimmed.match(/^[Zz][Yy][Rr][Ee][Xx]\s*[,]?\s*([\s\S]*)$/)
    if (!triggerMatch) return

    const input = triggerMatch[1].trim()

    if (!input) return await m.send(zrand(greetings))

    const intentData = detectIntent(input)
    if (!intentData) return await m.send(zrand(unknownR))

    const { intent, params = {} } = intentData

    const adminOnlyIntents = [
      'lock_now','lock_for','lock_later','unlock_now','unlock_for','unlock_later',
      'group_link','revoke_link','group_name','group_desc','set_group_pic','remove_group_pic',
      'add','kick','promote','demote','tag_all','tag_admins',
      'antilink_on','antilink_off','antiword_on','antiword_off',
      'warn_user','remove_warn','shadowban','unshadowban','silence','unsilence',
      'multi_sticker','stop_multi_sticker'
    ]

    const senderIsAdmin = await isAdmin(m)
    if (adminOnlyIntents.includes(intent) && !senderIsAdmin) return await m.send(zrand(denials))

    const botIsAdmin = await isBotAdmin(m)

    switch (intent) {

      // ── CONVERSATION ──
      case 'greet': return await m.send(zrand(greetings))
      case 'how_are_you': return await m.send(zrand(howAreYouR))
      case 'how_is_today': return await m.send(zrand(howIsTodayR))
      case 'who_are_you': return await m.send(
        `${Z} *${ZNAME}*\n\n_Guardian of this group. Part moderator, part companion, part enigma._\n` +
        `_I understand natural language, enforce the rules, run the games, and keep things interesting._\n\n` +
        `_Just say my name. I'll handle the rest._`
      )
      case 'time_greeting': {
        const h = new Date().getHours()
        const map = { morning: `${Z} Good morning. The day is young — use it well.`, afternoon: `${Z} Good afternoon. Still time to make something of the day.`, evening: `${Z} Good evening. The quiet hours approach.`, night: `${Z} Good night. Rest well — the group will still be here tomorrow.` }
        const k = h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'
        return await m.send(map[k])
      }
      case 'thanks': return await m.send(zrand([`${Z} Always.`, `${Z} That's what I'm here for.`, `${Z} No need for thanks. Just keep the group alive.`, `${Z} Acknowledged.`]))

      case 'capabilities': return await m.send(
        `*${ZNAME}*\n\n` +
        `*🔒 Group Control*\n` +
        `_Lock/unlock/mute/unmute — instantly, for a duration, or scheduled_\n` +
        `_"Zyrex lock the group for 30 minutes"_\n` +
        `_"Zyrex unlock the group in an hour"_\n\n` +
        `*👥 Members*\n` +
        `_Add, kick, promote, demote, tag all, tag admins_\n\n` +
        `*🛡 Moderation*\n` +
        `_Antilink, antiword, warn, shadowban, silence_\n\n` +
        `*🃏 Games*\n` +
        `_Word construction, unscramble, hangman, rhyme it,_\n` +
        `_would you rather, finish the lyrics, who said that_\n\n` +
        `*🎭 Media*\n` +
        `_Make sticker, view once, view once + delete original_\n\n` +
        `*🎲 Fun*\n` +
        `_Jokes, facts, roasts, motivation, random member,_\n` +
        `_coin flip, dice roll_\n\n` +
        `*⚙️ Utility*\n` +
        `_Uptime, bot status, group info, group dp, my profile, calculator_\n\n` +
        `_Talk to me naturally — no prefix, no exact commands._\n` +
        `_"Zyrex give me the group link", "Zyrex kick @user", "Zyrex tell me a joke"_`
      )

      // ── LOCK / UNLOCK ──
      case 'lock_now': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const meta = await m.client.groupMetadata(m.chat)
        if (meta.announce) return await m.send(`${Z} _The group is already locked._`)
        // Ask follow-up: how long?
        setPending(m.chat, m.sender, 'lock_followup')
        return await m.send(`${Z} _Locking now or for a duration? Reply with a time like "30 minutes" or "now" to lock immediately._`)
      }
      case 'lock_for': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        if (!params.ms) {
          setPending(m.chat, m.sender, 'lock_followup')
          return await m.send(`${Z} _For how long? Reply with a duration, e.g. "30 minutes"._`)
        }
        const meta = await m.client.groupMetadata(m.chat)
        if (meta.announce) return await m.send(`${Z} _The group is already locked._`)
        return await zLockGroup(m, params.ms, null)
      }
      case 'lock_later': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        if (!params.ms) {
          setPending(m.chat, m.sender, 'lock_followup')
          return await m.send(`${Z} _When should I lock it? Reply with a duration, e.g. "in 10 minutes"._`)
        }
        return await zLockGroup(m, null, params.ms)
      }

      case 'unlock_now': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const meta = await m.client.groupMetadata(m.chat)
        if (!meta.announce) return await m.send(`${Z} _The group isn't locked. Nothing to lift._`)
        setPending(m.chat, m.sender, 'unlock_followup')
        return await m.send(`${Z} _Unlocking now or for a duration? Reply with a time like "10 minutes" or "now" to open immediately._`)
      }
      case 'unlock_for': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        if (!params.ms) {
          setPending(m.chat, m.sender, 'unlock_followup')
          return await m.send(`${Z} _For how long? Reply with a duration._`)
        }
        const meta = await m.client.groupMetadata(m.chat)
        if (!meta.announce) return await m.send(`${Z} _The group is already open._`)
        return await zUnlockGroup(m, params.ms, null)
      }
      case 'unlock_later': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        if (!params.ms) {
          setPending(m.chat, m.sender, 'unlock_followup')
          return await m.send(`${Z} _When? Reply with a duration, e.g. "in 30 minutes"._`)
        }
        return await zUnlockGroup(m, null, params.ms)
      }

      // ── GROUP LINK ──
      case 'group_link': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges to fetch the group link._`)
        const code = await m.client.groupInviteCode(m.chat)
        return await m.send(`${Z} _Here's the group link:_\nhttps://chat.whatsapp.com/${code}`)
      }
      case 'revoke_link': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        await m.client.groupRevokeInvite(m.chat)
        const newCode = await m.client.groupInviteCode(m.chat)
        return await m.send(`${Z} _The old link has been destroyed. New link:_\nhttps://chat.whatsapp.com/${newCode}`)
      }

      // ── GROUP NAME / DESC ──
      case 'group_name': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        if (!params.name) {
          setPending(m.chat, m.sender, 'group_name_followup')
          return await m.send(`${Z} _What should the new name be? Just reply with it._`)
        }
        await m.client.groupUpdateSubject(m.chat, params.name)
        return await m.send(`${Z} _The group is now known as: *${params.name}*_`)
      }
      case 'group_desc': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        if (!params.desc) {
          setPending(m.chat, m.sender, 'group_desc_followup')
          return await m.send(`${Z} _What should the new description say? Just reply with it._`)
        }
        await m.client.groupUpdateDescription(m.chat, params.desc)
        return await m.send(`${Z} _Description updated. The group now tells its own story._`)
      }

      // ── GROUP PIC ──
      case 'get_group_dp': {
        let ppUrl
        try { ppUrl = await m.client.profilePictureUrl(m.chat, 'image') } catch { ppUrl = null }
        if (!ppUrl) return await m.send(`${Z} _This group doesn't have a display picture set._`)
        return await m.send(ppUrl, { caption: `${Z} _Group display picture._` }, 'image')
      }
      case 'set_group_pic': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const src = m.quoted?.image ? m.quoted : m.image ? m : null
        if (!src) return await m.send(`${Z} _Reply to or send an image first, then tell me to set it as the group picture._`)
        const media = await m.client.downloadMediaMessage(src)
        await m.client.updateProfilePicture(m.chat, media)
        return await m.send(`${Z} _The group now wears a new face._`)
      }
      case 'remove_group_pic': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        await m.client.removeProfilePicture(m.chat)
        return await m.send(`${Z} _The group picture has been removed. Clean slate._`)
      }

      // ── GROUP INFO (full: name, desc, dp, invite link, members) ──
      case 'group_info': {
        const meta = await m.client.groupMetadata(m.chat)
        const memberCount = meta.participants.length
        const adminCount = meta.participants.filter(p => p.admin).length
        const created = new Date(meta.creation * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        let inviteLink = ''
        try {
          if (botIsAdmin) {
            const code = await m.client.groupInviteCode(m.chat)
            inviteLink = `\n*Invite Link:* https://chat.whatsapp.com/${code}`
          }
        } catch (_) {}
        let ppUrl
        try { ppUrl = await m.client.profilePictureUrl(m.chat, 'image') } catch { ppUrl = null }
        const infoText =
          `*${Z} Group Intelligence Report*\n\n` +
          `*Name:* ${meta.subject}\n` +
          `*Members:* ${memberCount}\n` +
          `*Admins:* ${adminCount}\n` +
          `*Created:* ${created}\n` +
          `*Settings:* ${meta.restrict ? 'Admin-only edits' : 'Open'}\n` +
          `*Status:* ${meta.announce ? '🔒 Locked' : '🔓 Open'}` +
          (meta.desc ? `\n*Description:* ${meta.desc}` : '') +
          inviteLink
        if (ppUrl) return await m.send(ppUrl, { caption: infoText }, 'image')
        return await m.send(infoText)
      }

      // ── MEMBER MANAGEMENT ──
      case 'add': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges to add members._`)
        const cleanJid = params.number + '@s.whatsapp.net'
        const check = await m.client.onWhatsApp(cleanJid)
        if (!check.length) return await m.send(`${Z} _That number isn't on WhatsApp._`)
        const result = await m.client.groupParticipantsUpdate(m.chat, [cleanJid], 'add')
        const status = result[0]?.status
        if (status === '200') return await m.send(`${Z} _@${params.number} has been brought in._`, { mentions: [cleanJid] })
        if (status === '403') return await m.send(`${Z} _They need to accept an invite. They'll receive one shortly._`)
        return await m.send(`${Z} _Add result: ${status}._`)
      }
      case 'kick': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I remove? Mention or reply to them._`)
        const jid = parsedJid(user)
        await m.client.groupParticipantsUpdate(m.chat, [jid], 'remove')
        return await m.send(`${Z} _@${jid.split('@')[0]} has been removed. Their chapter here is closed._`, { mentions: [jid] })
      }
      case 'promote': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I promote? Mention or reply to them._`)
        if (await isadminn(m, user)) return await m.send(`${Z} _They're already an admin._`)
        const jid = parsedJid(user)
        await m.client.groupParticipantsUpdate(m.chat, [jid], 'promote')
        return await m.send(`${Z} _@${jid.split('@')[0]} has been elevated. Wield the authority wisely._`, { mentions: [jid] })
      }
      case 'demote': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I demote? Mention or reply to them._`)
        if (!await isadminn(m, user)) return await m.send(`${Z} _That person isn't an admin._`)
        const jid = parsedJid(user)
        await m.client.groupParticipantsUpdate(m.chat, [jid], 'demote')
        return await m.send(`${Z} _@${jid.split('@')[0]} has been stripped of their rank._`, { mentions: [jid] })
      }
      case 'tag_all': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges to tag everyone._`)
        const { participants } = await m.client.groupMetadata(m.chat)
        let msg = `${Z} _Attention, everyone:_\n\n`
        participants.forEach((p, i) => { msg += `${i + 1}. @${(p.jid || p.phoneNumber).split('@')[0]}\n` })
        return await m.send(msg, { mentions: participants.map(p => p.jid || p.phoneNumber) })
      }
      case 'tag_admins': {
        const { participants } = await m.client.groupMetadata(m.chat)
        const admins = participants.filter(p => p.admin).map(p => p.jid || p.phoneNumber)
        if (!admins.length) return await m.send(`${Z} _There are no admins to summon here._`)
        let msg = `${Z} _Summoning the admins:_\n\n`
        admins.forEach((a, i) => { msg += `${i + 1}. @${a.split('@')[0]}\n` })
        return await m.send(msg, { mentions: admins })
      }
      case 'mention_me':
        return await m.send(`${Z} _Right here — @${m.sender.split('@')[0]}._`, { mentions: [m.sender] })

      // ── MODERATION ──
      case 'antilink_on': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges to enforce that._`)
        let data = await getData('antilink') || {}
        data[m.chat] = data[m.chat] || { active: false, action: 'delete', warnc: 3, permitted: [] }
        data[m.chat].active = true
        await storeData('antilink', data)
        return await m.send(`${Z} _Antilink is armed. Links will be handled._`)
      }
      case 'antilink_off': {
        let data = await getData('antilink') || {}
        if (!data[m.chat]?.active) return await m.send(`${Z} _Antilink wasn't active._`)
        data[m.chat].active = false
        await storeData('antilink', data)
        return await m.send(`${Z} _Antilink disarmed._`)
      }
      case 'antiword_on': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        let aw = await getData('antiword') || {}
        aw[m.chat] = aw[m.chat] || { active: false, action: 'delete', warnc: 3, words: [] }
        aw[m.chat].active = true
        await storeData('antiword', aw)
        return await m.send(`${Z} _Antiword is now active. Prohibited words will be handled._`)
      }
      case 'antiword_off': {
        let aw = await getData('antiword') || {}
        if (!aw[m.chat]?.active) return await m.send(`${Z} _Antiword wasn't active._`)
        aw[m.chat].active = false
        await storeData('antiword', aw)
        return await m.send(`${Z} _Antiword deactivated._`)
      }
      case 'warn_user': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I warn? Mention or reply to them._`)
        const reason = input.replace(/warn\s+@?\S+\s*/i, '').trim() || 'conduct unbecoming'
        await warn.addWarn(m.chat, user, reason, m.sender)
        const wc = await warn.getWcount(m.chat, user)
        if (wc < config().WARNCOUNT) {
          return await m.send(`${Z} _@${user.split('@')[0]} has been warned.\nReason: ${reason}\nCount: ${wc}/${config().WARNCOUNT}_`, { mentions: [user] })
        } else {
          await warn.resetWarn(m.chat, user)
          await m.client.groupParticipantsUpdate(m.chat, [user], 'remove')
          return await m.send(`${Z} _@${user.split('@')[0]} exceeded their warnings. Removed._`, { mentions: [user] })
        }
      }
      case 'remove_warn': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Whose warnings should I clear? Mention or reply to them._`)
        await warn.resetWarn(m.chat, user)
        return await m.send(`${Z} _@${user.split('@')[0]}'s warnings have been cleared. A fresh start._`, { mentions: [user] })
      }
      case 'shadowban': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should be shadowbanned? Mention or reply to them._`)
        let sb = await getShadowbanned()
        if (!sb[m.chat]) sb[m.chat] = []
        if (sb[m.chat].includes(user)) return await m.send(`${Z} _That user is already in the shadow._`)
        sb[m.chat].push(user)
        await storeData('zyrex_shadowban', sb)
        return await m.send(`${Z} _@${user.split('@')[0]} now exists in silence. Their messages vanish._`, { mentions: [user] })
      }
      case 'unshadowban': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I free? Mention or reply._`)
        let sb = await getShadowbanned()
        if (!sb[m.chat]?.includes(user)) return await m.send(`${Z} _That user isn't shadowbanned._`)
        sb[m.chat] = sb[m.chat].filter(u => u !== user)
        await storeData('zyrex_shadowban', sb)
        return await m.send(`${Z} _@${user.split('@')[0]} has stepped out of the shadow._`, { mentions: [user] })
      }
      case 'silence': {
        if (!botIsAdmin) return await m.send(`${Z} _I need admin privileges for that._`)
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I silence? Mention or reply to them._`)
        let sl = await getSilenced()
        if (!sl[m.chat]) sl[m.chat] = []
        if (sl[m.chat].includes(user)) return await m.send(`${Z} _That user is already silenced._`)
        sl[m.chat].push(user)
        await storeData('zyrex_silence', sl)
        const notified = (await getData('zyrex_silence_notified')) || {}
        delete notified[`${m.chat}_${user}`]
        await storeData('zyrex_silence_notified', notified)
        return await m.send(`${Z} _@${user.split('@')[0]} has been silenced. Their voice doesn't carry here anymore._`, { mentions: [user] })
      }
      case 'unsilence': {
        const user = m.mentionedJid[0] || m.quoted?.sender
        if (!user) return await m.send(`${Z} _Who should I unsilence? Mention or reply._`)
        let sl = await getSilenced()
        if (!sl[m.chat]?.includes(user)) return await m.send(`${Z} _That user isn't silenced._`)
        sl[m.chat] = sl[m.chat].filter(u => u !== user)
        await storeData('zyrex_silence', sl)
        return await m.send(`${Z} _@${user.split('@')[0]}'s voice has been restored._`, { mentions: [user] })
      }

      // ── STICKER / MEDIA ──
      case 'make_sticker': {
        const msg = await zMakeSticker(m)
        if (msg) return await m.send(msg)
        return
      }
      case 'view_once': {
        const msg = await zViewOnce(m, false)
        if (msg) return await m.send(msg)
        return await m.send(`${Z} _Sent as view once._`)
      }
      case 'view_once_delete': {
        const msg = await zViewOnce(m, true)
        if (msg) return await m.send(msg)
        return await m.send(`${Z} _Sent as view once. Original deleted._`)
      }
      case 'multi_sticker': {
        const duration = params.ms ? fmtDuration(params.ms) : null
        if (duration) return await m.send(`${Z} _Multi-sticker mode on for ${duration}. Every image becomes a sticker._\n_Use ${prefix}msticker ${params.ms ? Math.floor(params.ms / 1000) + 's' : ''} to enable._`)
        return await m.send(`${Z} _Multi-sticker mode on. Use ${prefix}msticker to enable._`)
      }
      case 'stop_multi_sticker':
        return await m.send(`${Z} _Multi-sticker mode off. Use ${prefix}stopmsticker to stop._`)

      // ── GAMES ──
      case 'start_wcg': return await m.send(`${Z} _Word Construction Game starting...\nUse ${prefix}wcg to begin._`)
      case 'stop_wcg': return await m.send(`${Z} _Ending the Word Construction Game...\nUse ${prefix}delwcg to end._`)
      case 'unscramble_easy': return await m.send(`${Z} _Let's test your vocabulary. Easy mode.\nUse ${prefix}unscramble easy to begin._`)
      case 'unscramble_hard': return await m.send(`${Z} _Hard mode. Think carefully.\nUse ${prefix}unscramble hard to begin._`)
      case 'stop_unscramble': return await m.send(`${Z} _Game over.\nUse ${prefix}stopunscramble to end._`)
      case 'hangman': return await m.send(`${Z} _The hangman awaits. One wrong letter and it all goes wrong.\nUse ${prefix}hangman to begin._`)
      case 'rhyme': {
        const words = ['fire', 'night', 'soul', 'rain', 'gold', 'light', 'dream', 'blade', 'heart', 'storm', 'moon', 'time', 'rise', 'fall', 'dark']
        return await m.send(`${Z} *Rhyme It!*\n\n_Can you rhyme with:_ *${zrand(words).toUpperCase()}*\n\n_First one to rhyme wins._`)
      }
      case 'wyr': {
        const wyr = [
          `Would you rather have the ability to fly, but only as fast as a bicycle — or be invisible, but only when no one is looking for you?`,
          `Would you rather know how every movie ends before watching it — or never be able to rewatch a movie?`,
          `Would you rather lose all your memories from the past 5 years — or never be able to make new ones?`,
          `Would you rather always speak in rhymes — or only communicate through song?`,
          `Would you rather have a job you hate that pays extremely well — or a job you love that barely pays?`,
          `Would you rather always know when someone is lying — or always get away with lying yourself?`,
          `Would you rather be famous but alone — or unknown but deeply loved?`
        ]
        return await m.send(`${Z} *Would You Rather?*\n\n_${zrand(wyr)}_\n\n_Vote A or B._`)
      }
      case 'finish_lyrics': {
        const lyrics = [
          { line: "🎵 _Is this the real life?_", song: "Bohemian Rhapsody – Queen" },
          { line: "🎵 _Started from the bottom now we're..._", song: "Started From The Bottom – Drake" },
          { line: "🎵 _We will, we will..._", song: "We Will Rock You – Queen" },
          { line: "🎵 _I used to rule the world..._", song: "Viva La Vida – Coldplay" },
          { line: "🎵 _Hello, it's me..._", song: "Hello – Adele" },
          { line: "🎵 _Don't stop believin'..._", song: "Don't Stop Believin' – Journey" },
        ]
        const pick = zrand(lyrics)
        return await m.send(`${Z} *Finish The Lyrics!*\n\n${pick.line}\n\n_First one to complete it wins._\n_(${pick.song})_`)
      }
      case 'who_said_that': {
        const quotes = [
          { q: `"Be the change you wish to see in the world."`, a: "Mahatma Gandhi" },
          { q: `"In the middle of difficulty lies opportunity."`, a: "Albert Einstein" },
          { q: `"The only way to do great work is to love what you do."`, a: "Steve Jobs" },
          { q: `"Not all those who wander are lost."`, a: "J.R.R. Tolkien" },
          { q: `"With great power comes great responsibility."`, a: "Uncle Ben / Stan Lee" },
          { q: `"Life is what happens when you're busy making other plans."`, a: "John Lennon" }
        ]
        const p = zrand(quotes)
        return await m.send(`${Z} *Who Said That?*\n\n${p.q}\n\n_Who said this? First correct answer wins._`)
      }

      // ── UTILITY ──
      case 'calculate': {
        try {
          const expr = (params.expr || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**')
          // Safe: only allow digits and math operators
          if (!/^[\d\s+\-*/.()%**]+$/.test(expr)) return await m.send(`${Z} _That expression doesn't look right. Try: Zyrex calculate 25 × 4_`)
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${expr})`)()
          if (!isFinite(result)) return await m.send(`${Z} _That expression doesn't resolve._`)
          return await m.send(`${Z} _${params.expr} = *${result}*_`)
        } catch { return await m.send(`${Z} _Could not calculate that. Try a simpler expression._`) }
      }
      case 'uptime': {
        return await m.send(`${Z} _I have been running for: *${fmtDuration(process.uptime() * 1000)}*_`)
      }
      case 'bot_status': {
        const up = fmtDuration(process.uptime() * 1000)
        const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
        return await m.send(`*${Z} System Status*\n\n*Uptime:* ${up}\n*Memory:* ${memMB} MB\n*Node:* ${process.version}\n*Status:* Operational ✓`)
      }
      case 'my_profile': {
        let ppUrl; try { ppUrl = await m.client.profilePictureUrl(m.sender, 'image') } catch { ppUrl = null }
        const name = m.pushName || m.sender.split('@')[0]
        const isAdm = await isAdmin(m)
        const txt = `*${Z} Your Profile*\n\n*Name:* ${name}\n*Number:* ${m.sender.split('@')[0]}\n*Role:* ${isAdm ? 'Admin ✓' : 'Member'}\n*Chat:* ${m.isGroup ? 'Group' : 'Private'}`
        if (ppUrl) return await m.send(ppUrl, { caption: txt }, 'image')
        return await m.send(txt)
      }

      // ── FUN ──
      case 'joke': return await m.send(zrand(jokeBank))
      case 'fact': return await m.send(zrand(factBank))
      case 'roast': return await m.send(zrand(roastBank))
      case 'motivate': return await m.send(zrand(motivationBank))
      case 'random_member': {
        const { participants } = await m.client.groupMetadata(m.chat)
        if (participants.length < 2) return await m.send(`${Z} _Not enough members to pick from._`)
        const others = participants.filter(p => (p.jid || p.phoneNumber) !== m.sender)
        const picked = zrand(others)
        const jid = picked.jid || picked.phoneNumber
        return await m.send(`${Z} _The fates have decided..._\n\n*@${jid.split('@')[0]}*`, { mentions: [jid] })
      }
      case 'coin_flip':
        return await m.send(`${Z} _The coin turns..._\n\n*${Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙'}*`)
      case 'roll_dice': {
        const roll = Math.floor(Math.random() * 6) + 1
        return await m.send(`${Z} _The dice falls..._\n\n*${['⚀','⚁','⚂','⚃','⚄','⚅'][roll - 1]} ${roll}*`)
      }

      default: return await m.send(zrand(unknownR))
    }

  } catch (e) {
    console.log('zyrex error', e)
    try { await m.send(`${Z} _Something went wrong on my end. Try again._`) } catch (_) {}
  }
})
