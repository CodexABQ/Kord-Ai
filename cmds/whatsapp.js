/* 
 * Copyright © 2025 Mirage
 * This file is part of Kord and is licensed under the GNU GPLv3.
 * And I hope you know what you're doing here.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html
 * -------------------------------------------------------------------------------
 */
 
 
 const { kord, wtype, isAdmin, isadminn, saveFilter, listFilters, removeFilter, prefix, getData, storeData, isBotAdmin} = require("../core")

kord({
  cmd: "delete|del|dlt",
  desc: "delete a replied message",
  fromMe: wtype,
  type: "user",
}, async (m, text) => {
  try {
    if (!m.quoted) return await m.send("_Reply to a message to delete_")
    
    if (m.isGroup) {
    if (m.quoted.fromMe && m.isCreator) {
    await m.send(m.quoted, {}, "delete")
    return await m.send(m, {}, "delete")
    }
    
    let ad = await isAdmin(m)
    let botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("_I'm not admin.._")
    if (!ad) return await m.send("_You're not admin.._")
    
    await m.send(m.quoted, {}, "delete")
    return await m.send(m, {}, "delete")
    }
    
    if (!m.isCreator) return await m.send("_I don't know you.._")
    await m.send(m.quoted, {}, "delete")
    if (m.fromMe) {
    return await m.send(m, {}, "delete")
    } else return
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
        cmd: "archive",
        desc: "archive a chat",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    const lmsg = {
    message: m.message,
    key: m.key,
    messageTimestamp: m.timestamp };
    await m.client.chatModify({
    archive: true,
    lastMessages: [lmsg]
    }, m.chat);
    return await m.send('_chat archived_')
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "unarchive",
        desc: "unarchive a chat",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    const lmsg = {
    message: m.message,
    key: m.key,
    messageTimestamp: m.timestamp };
    await m.client.chatModify({
    archive: false,
    lastMessages: [lmsg]
    }, m.chat);
    return await m.send('_chat unarchived_')
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
        cmd: "jid",
        desc: "gets jid of either replied user or present chat",
        fromMe: wtype,
        type: "user",
}, async (m) => {
  try {
    if (m.quoted.sender) return await m.send(m.quoted.sender);
    else return await m.send(m.chat);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "pp|setpp",
        desc: "changes profile pic to replied photo",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    if (!m.quoted.image && !m.image) return await m.send("_reply to a picture_")
    if (m.quoted.image) {
    var picpath = await m.quoted.download()
    } else {
    picpath = await m.client.downloadMediaMessage(m)
    }
    await m.client.updateProfilePicture(m.user.jid, picpath);
    return await m.send("_profile pic changed_")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "removepp",
        desc: "removes profile picture",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    await m.client.removeProfilePicture(m.user.jid);
    return await m.send("_profile pic removed.._");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "clear",
        desc: "clear a chat",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    await m.client.chatModify({
    delete: true,
    lastMessages: [{
    key: m.key,
    messageTimestamp: m.messageTimestamp
    }]
    }, m.chat)
    await m.send('_Chat Cleared_')
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "pinchat|chatpin",
        desc: "pin a chat",
        fromMe: true,
        type: "user"
}, async (m, text) => {
  try {
    await m.client.chatModify({
    pin: true
    }, m.chat);
    await m.send('_Chat Pined_')
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "unpinchat|unchatpin",
        desc: "unpin a chat",
        fromMe: true,
        type: "user"
}, async (m, text) => {
  try {
    await m.client.chatModify({
    pin: false
    }, m.chat);
    await m.send('_Chat Unpined_')
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "block",
        desc: 'block a user',
        fromMe: true,
        type: 'user',
}, async (m, text) => {
  try {
    if (m.isGroup && m.quoted?.sender) {
    await m.client.updateBlockStatus(m.quoted?.sender, "block")
    } else {
    await m.client.updateBlockStatus(m.chat, "block")
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "unblock",
        desc: 'unblock a user',
        fromMe: true,
        type: 'user',
}, async (m, text) => {
  try {
    if (m.isGroup && m.quoted?.sender) {
    await m.client.updateBlockStatus(m.quoted?.sender, "unblock")
    } else {
    await m.client.updateBlockStatus(m.chat, "unblock")
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "blocklist",
        desc: "fetches list of blocked numbers",
        fromMe: true,
        type: 'user',
}, async (m, text) => {
  try {
    const num = await m.client.fetchBlocklist();
    if (!num?.length) return await m.send("_No blocked users found!_");
    const blockList = `_*❏ Block List ❏*_\n\n${num.map(n => `➟ +${n.replace('@s.whatsapp.net', '')}`).join('\n')}`;
    return await m.send(blockList);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "setname",
        desc: "set profile name",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    q = text
    if (!q) return await m.send(`_*provide a name to set!*_\n_Example: ${prefix}setname Mirage_`);
    await m.client.updateProfileName(q);
    await m.reply(`_Profile name updated to ${q}_`);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
        cmd: "bio|setbio",
        desc: "set bio for profile",
        fromMe: true,
        type: "user",
}, async (m, text) => {
  try {
    let query = text
    if (!query) return await m.send(`*_Provide A Text*_\n_example: ${prefix}setbio urgent calls only._`);
    await m.client.updateProfileStatus(query);
    await m.send('_Bio updated_');
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "getpp",
  desc: "get profile pic of a user/group",
  fromMe: true,
  type: "user",
}, async (m, text) => {
  try {
    if (m.isGroup && !m.quoted.sender) {
    var pic = await m.client.profilePictureUrl(m.chat, 'image')
    return await m.send(pic, {}, "image")
    } else if (m.isGroup && m.quoted.sender) {
    var pic = await m.client.profilePictureUrl(m.quoted.sender, 'image')
    return await m.send(pic, {}, "image")
    } else if (m.quoted.sender) {
    var pic = await m.client.profilePictureUrl(m.quoted.sender, 'image')
    return await m.send(pic, {}, "image")
    } else {
    var pic = await m.client.profilePictureUrl(m.chat, 'image')
    return await m.send(pic, {}, "image")
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "forward|fwrd",
  desc: "forward a quoted",
  fromMe: true,
  type: "user",
}, async (m, text, c) => {
  try {
    if (!text) {
      return await m.send(
        `_*Provide a number/jid!*_\n` +
        `_Example: ${c} 2348033221144_\n` +
        `${c} 2348033221144@s.whatsapp.net\n` +
        `${c} 2348033221144,2348033221144@s.whatsapp.net\n\n` +
        `Use ${prefix}jid to get the jid of a chat`
      )
    }
if (!m.quoted || !m.quoted.id || m.quoted.id === m.key?.id) {
      return await m.send("_*Reply to the message you want to forward*_")
    }
    let jids = text.split(",").map(j => j.trim()).filter(j => j.length > 0)
    if (jids.length === 0) return await m.send("_*No valid JIDs provided*_")

    let q = m.quoted
    let fwdCtx = { isForwarded: true, forwardingScore: 9999 }
    let sentTo = []

    let msgType = null
    let msgContent = null
    let mediaBuffer = null
    if (q.image) {
      msgType = "image"
      try { mediaBuffer = await q.download() } catch (e) {
        return await m.send("_*Failed to download image*_")
      }
    }
    else if (q.video) {
      msgType = "video"
      try { mediaBuffer = await q.download() } catch (e) {
        return await m.send("_*Failed to download video*_")
      }
    }
    else if (q.audio) {
      msgType = "audio"
      try { mediaBuffer = await q.download() } catch (e) {
        return await m.send("_*Failed to download audio*_")
      }
    }
    else if (q.sticker) {
      msgType = "sticker"
      try { mediaBuffer = await q.download() } catch (e) {
        return await m.send("_*Failed to download sticker*_")
      }
    }
    else if (q.text || q.conversation) {
      msgType = "text"
      msgContent = q.text || q.conversation
    }
    else if (q.media || q.mimetype) {
      msgType = "document"
      try { mediaBuffer = await q.download() } catch (e) {
        return await m.send("_*Failed to download file*_")
      }
    }
    else {
      return await m.send("_*Cannot forward this message type*_")
    }
  
    for (let rawJid of jids) {
      let jidd = rawJid
      if (!jidd.includes("@")) {
        jidd = `${jidd}@s.whatsapp.net`
      }

      try {
        if (msgType === "text") {
          await m.client.sendMessage(jidd, {
            text: msgContent,
            contextInfo: fwdCtx
          })
        }
        else if (msgType === "image") {
          await m.client.sendMessage(jidd, {
            image: mediaBuffer,
            caption: q.caption || "",
            mimetype: q.mimetype,
            contextInfo: fwdCtx
          })
        }
        else if (msgType === "video") {
          await m.client.sendMessage(jidd, {
            video: mediaBuffer,
            caption: q.caption || "",
            mimetype: q.mimetype,
            contextInfo: fwdCtx
          })
        }
        else if (msgType === "audio") {
          await m.client.sendMessage(jidd, {
            audio: mediaBuffer,
            mimetype: q.mimetype,
            ptt: q.ptt || false,
            contextInfo: fwdCtx
          })
        }
        else if (msgType === "sticker") {
          await m.client.sendMessage(jidd, {
            sticker: mediaBuffer,
            contextInfo: fwdCtx
          })
        }
        else if (msgType === "document") {
          await m.client.sendMessage(jidd, {
            document: mediaBuffer,
            mimetype: q.mimetype,
            fileName: q.fileName || "file",
            caption: q.caption || "",
            contextInfo: fwdCtx
          })
        }

        sentTo.push(jidd)

      } catch (err) {
        console.log(`Forward failed for ${jidd}:`, err.message)
        continue
      }
    }
    if (sentTo.length === 0) {
      return await m.send("_*Failed to forward msg to JID*_")
    }    
    await m.send(`_Forwarded to ${sentTo}_\n`)

  } catch (e) {
    console.log("forward cmd error:", e)
    return await m.sendErr(e)
  }
});

kord({
  cmd: 'lastseen',
	fromMe: true,
	desc: 'to change lastseen privacy',
	type: 'privacy'
}, async (message, match, cmd) => {
  try {
    if (!match) return await message.send(`_*Example:-* ${cmd} all_\n_to change last seen privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join('/')}* values_`);
    await message.client.updateLastSeenPrivacy(match)
    await message.send(`_Privacy settings *last seen* Updated to *${match}*_`);
  } catch (e) {
    console.log("cmd error", e)
    return await message.sendErr(e)
  }
})
kord({
cmd: 'online',
	fromMe: true,
	desc: 'to change online privacy',
	type: 'privacy'
}, async (message, match, cmd) => {
  try {
    if (!match) return await message.send(`_*Example:-* ${cmd} all_\n_to change *online*  privacy settings_`);
    const available_privacy = ['all', 'match_last_seen'];
    if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join('/')}* values_`);
    await message.client.updateOnlinePrivacy(match)
    await message.send(`_Privacy Updated to *${match}*_`);
  } catch (e) {
    console.log("cmd error", e)
    return await message.sendErr(e)
  }
})
kord({
cmd: 'mypp',
	fromMe: true,
	desc: 'privacy setting profile picture',
	type: 'privacy'
}, async (message, match, cmd) => {
  try {
    if (!match) return await message.send(`_*Example:-* ${cmd} all_\n_to change *profile picture*  privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join('/')}* values_`);
    await message.client.updateProfilePicturePrivacy(match)
    await message.send(`_Privacy Updated to *${match}*_`);
  } catch (e) {
    console.log("cmd error", e)
    return await message.sendErr(e)
  }
})
kord({
cmd: 'mystatus',
	fromMe: true,
	desc: 'privacy for my status',
	type: 'privacy'
}, async (message, match, cmd) => {
  try {
    if (!match) return await message.send(`_*Example:-* ${cmd} all_\n_to change *status*  privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join('/')}* values_`);
    await message.client.updateStatusPrivacy(match)
    await message.send(`_Privacy Updated to *${match}*_`);
  } catch (e) {
    console.log("cmd error", e)
    return await message.sendErr(e)
  }
})
kord({
cmd: 'read',
	fromMe: true,
	desc: 'privacy for read message',
	type: 'privacy'
}, async (message, match, cmd) => {
  try {
    if (!match) return await message.send(`_*Example:-* ${cmd} all_\n_to change *read and receipts message*  privacy settings_`);
    const available_privacy = ['all', 'none'];
    if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join('/')}* values_`);
    await message.client.updateReadReceiptsPrivacy(match)
    await message.send(`_Privacy Updated to *${match}*_`);
  } catch (e) {
    console.log("cmd error", e)
    return await message.sendErr(e)
  }
})
kord({
cmd: 'allow-gcadd|groupadd',
	fromMe: true,
	desc: 'privacy for group add',
	type: 'privacy'
}, async (message, match, cmd) => {
  try {
    if (!match) return await message.send(`_*Example:-* ${cmd} all_\n_to change *group add*  privacy settings_`);
    const available_privacy = ['all', 'contacts', 'contact_blacklist', 'none'];
    if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join('/')}* values_`);
    await message.client.updateGroupsAddPrivacy(match)
    await message.send(`_Privacy Updated to *${match}*_`);
  } catch (e) {
    console.log("cmd error", e)
    return await message.sendErr(e)
  }
})



kord({
  cmd: "pfilter",
  desc: "Set a PM filter",
  fromMe: true,
  pm: true,
  type: "autoreply",
}, async (m, text) => {
  try {
    if (text.toLowerCase() === "list") return await listFilters(m, "pfilter")
    await saveFilter(m, text, "pfilter")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "pstop",
  desc: "Remove a PM filter",
  fromMe: true,
  pm: true,
  type: "autoreply",
}, async (m, text) => {
  try {
    if (!text) return await m.send("Specify a keyword to remove")
    await removeFilter(m, text, "pfilter")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "gfilter",
  desc: "Set a group filter",
  fromMe: true,
  type: "autoreply",
  gc: true,
  adminOnly: true,
}, async (m, text) => {
  try {
    if (text.toLowerCase() === "list") return await listFilters(m, "gfilter")
    await saveFilter(m, text, "gfilter")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "gstop",
  desc: "Remove a group filter",
  fromMe: true,
  type: "autoreply",
  gc: true,
  adminOnly: true,
}, async (m, text) => {
  try {
    if (!text) return await m.send("Specify a keyword to remove")
    await removeFilter(m, text, "gfilter")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  on: "text",
  fromMe: false,
}, async (m) => {
  try {
    if (m.sender === m.ownerJid) return

    if (!m.isGroup) {
      let global = await getData("pfilter") || {}
      let gmatch = global["pm"]?.[m.body?.toLowerCase()]
      if (gmatch) {
        if (gmatch.type && gmatch.file) {
          let buff = Buffer.from(gmatch.file, "base64")
          return await m.send(buff, { caption: gmatch.caption, mimetype: gmatch.mimetype }, gmatch.type.replace("Message", ""))
        } else {
          return await m.send(gmatch.msg)
        }
      }
      return
    }

    let local = await getData("gfilter") || {}
    let res = local[m.chat]?.[m.body?.toLowerCase()]
    if (res) {
      if (res.type && res.file) {
        let buff = Buffer.from(res.file, "base64")
        return await m.send(buff, { caption: res.caption, mimetype: res.mimetype }, res.type.replace("Message", ""))
      } else {
        return await m.send(res.msg)
      }
    }
  } catch (e) {
    console.log("listener error", e)
  }
})

function parseDuration(str) {
  const match = str?.match(/^(\d+)(s|m|h|d)$/)
  if (!match) return null
  const val = parseInt(match[1])
  const unit = match[2]
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
  return val * multipliers[unit]
}

const muteTimers = new Map()

kord({
  cmd: "mute-user",
  desc: "mute a user or a sticker. Use -t <duration> for timed mute (e.g. -t 10m, -t 1h)",
  fromMe: true,
  type: "bot",
  gc: true,
  adminOnly: true,
}, async (m, text) => {
  var botAd = await isBotAdmin(m)
  if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")

  var _b = await getData("blacklisted") || {}
  if (!_b[m.chat]) _b[m.chat] = { users: [], stk: [], timers: {} }
  if (!_b[m.chat].timers) _b[m.chat].timers = {}

  let bl = _b[m.chat]

  let duration = null
  let durationLabel = null

  const timerMatch = text.match(/-t\s*(\d+[smhd])/)
  if (timerMatch) {
    durationLabel = timerMatch[1]
    duration = parseDuration(durationLabel)
    text = text.replace(timerMatch[0], '').trim()
  } else {
    const bareMatch = text.match(/\b(\d+[smhd])(\s|$)/)
    if (bareMatch) {
      durationLabel = bareMatch[1]
      duration = parseDuration(durationLabel)
      text = text.replace(bareMatch[0], '').trim()
    }
  }

  if (text.includes("-s")) {
    if (!m.quoted?.sticker) return await m.send("_reply to the sticker to mute_")
    var hash = m.quoted.fileSha256 ? Buffer.from(m.quoted.fileSha256).toString('hex') : null
    if (bl.stk.includes(hash)) return await m.send("_sticker is already muted_")

    bl.stk.push(hash)

    if (duration) {
      const timerKey = `${m.chat}::stk_${hash}`
      if (muteTimers.has(timerKey)) {
        clearTimeout(muteTimers.get(timerKey))
        muteTimers.delete(timerKey)
      }
      bl.timers[`stk_${hash}`] = Date.now() + duration
      const handle = setTimeout(async () => {
        muteTimers.delete(timerKey)
        var _fresh = await getData("blacklisted") || {}
        if (!_fresh[m.chat]) return
        _fresh[m.chat].stk = (_fresh[m.chat].stk || []).filter(h => h !== hash)
        delete _fresh[m.chat].timers?.[`stk_${hash}`]
        await storeData("blacklisted", _fresh)
        await m.send(`_sticker auto-unmuted after timer_`)
      }, duration)
      muteTimers.set(timerKey, handle)
      await storeData("blacklisted", _b)
      return await m.send(`_sticker muted for ${durationLabel}_`)
    }

    await storeData("blacklisted", _b)
    return await m.send("_sticker muted_")
  }

  let input = m.mentionedJid?.[0] || m.quoted?.sender || text
  if (!input) return await m.send('need user...')
  let user = (input.includes('@') ? input.split('@')[0] : input).replace(/\D/g, '') + '@s.whatsapp.net'
  if (await isadminn(m, user)) return await m.send("User is an admin")
  if (bl.users.includes(user)) return await m.send("_User is already muted_")

  bl.users.push(user)

  if (duration) {
    const timerKey = `${m.chat}::${user}`
    if (muteTimers.has(timerKey)) {
      clearTimeout(muteTimers.get(timerKey))
      muteTimers.delete(timerKey)
    }
    bl.timers[user] = Date.now() + duration
    const handle = setTimeout(async () => {
      muteTimers.delete(timerKey)
      var _fresh = await getData("blacklisted") || {}
      if (!_fresh[m.chat]) return
      _fresh[m.chat].users = (_fresh[m.chat].users || []).filter(u => u !== user)
      delete _fresh[m.chat].timers?.[user]
      await storeData("blacklisted", _fresh)
      await m.send(`@${user.split("@")[0]} has been auto-unmuted`, { mentions: [user] })
    }, duration)
    muteTimers.set(timerKey, handle)
    await storeData("blacklisted", _b)
    return await m.send(`@${user.split("@")[0]} has been muted for ${durationLabel}`, { mentions: [user] })
  }

  await storeData("blacklisted", _b)
  return await m.send(`@${user.split("@")[0]} has been muted`, { mentions: [user] })
})


kord({
  cmd: "unmute-user",
  desc: "unmute a user or sticker",
  fromMe: true,
  type: "bot",
  gc: true,
  adminOnly: true,
}, async (m, text) => {
  var botAd = await isBotAdmin(m)
  if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")

  var _b = await getData("blacklisted") || {}
  if (!_b[m.chat]) return await m.send("_no one muted here_")

  let bl = _b[m.chat]
  if (!bl.timers) bl.timers = {}

  if (text.includes("-s")) {
    if (!m.quoted?.sticker) return await m.send("_reply to the sticker to unmute_")
    var hash = m.quoted.fileSha256 ? Buffer.from(m.quoted.fileSha256).toString('hex') : null
    if (!bl.stk.includes(hash)) return await m.send("_sticker is not muted_")

    const timerKey = `${m.chat}::stk_${hash}`
    if (muteTimers.has(timerKey)) {
      clearTimeout(muteTimers.get(timerKey))
      muteTimers.delete(timerKey)
    }

    bl.stk = bl.stk.filter(h => h !== hash)
    delete bl.timers[`stk_${hash}`]
    await storeData("blacklisted", _b)
    return await m.send("_sticker unmuted_")
  }

  let input = m.mentionedJid?.[0] || m.quoted?.sender || text
  if (!input) return await m.send('need user...')
  let user = (input.includes('@') ? input.split('@')[0] : input).replace(/\D/g, '') + '@s.whatsapp.net'
  if (await isadminn(m, user)) return await m.send("User is an admin")
  if (!bl.users.includes(user)) return await m.send("_User is not muted_")

  const timerKey = `${m.chat}::${user}`
  if (muteTimers.has(timerKey)) {
    clearTimeout(muteTimers.get(timerKey))
    muteTimers.delete(timerKey)
  }

  bl.users = bl.users.filter(u => u !== user)
  delete bl.timers[user]
  await storeData("blacklisted", _b)
  return await m.send(`@${user.split("@")[0]} has been unmuted`, { mentions: [user] })
})

kord({
  on: "all",
  fromMe: false
}, async (m) => {
  if (!m.isGroup) return

  var botAd = await isBotAdmin(m)
  if (!botAd) return

  var data = await getData("blacklisted")
  if (!data || !data[m.chat]) return

  var bl = data[m.chat]

  if (bl.timers) {
    const now = Date.now()
    let changed = false

    if (bl.timers[m.sender] && now >= bl.timers[m.sender]) {
      bl.users = bl.users.filter(u => u !== m.sender)
      delete bl.timers[m.sender]
      changed = true
    }

    if (changed) await storeData("blacklisted", data)
  }

  if (bl.users.includes(m.sender)) {
    return await m.send(m, {}, "delete")
  }

  if (m.mtype === "stickerMessage" && m.msg?.fileSha256) {
    const hash = Buffer.from(m.msg.fileSha256).toString("hex")

    if (bl.timers?.[`stk_${hash}`] && Date.now() >= bl.timers[`stk_${hash}`]) {
      bl.stk = bl.stk.filter(h => h !== hash)
      delete bl.timers[`stk_${hash}`]
      await storeData("blacklisted", data)
      return
    }

    if (bl.stk.includes(hash)) return await m.send(m, {}, "delete")
  }
})















// ========== Improved ViewOnce Sticker System ==========

kord({
  cmd: "setvvsticker|setvvs",
  desc: "Set a sticker as ViewOnce saver trigger",
  fromMe: true,
  type: "user",
}, async (m) => {
  try {
    if (!m.quoted?.sticker) {
      return await m.send("_*Reply to the sticker you want to use as VV trigger*_")
    }

    const buffer = await m.quoted.download()
    const hash = require("crypto").createHash("md5").update(buffer).digest("hex")

    await storeData("vv_sticker_hash", hash)
    await m.react("✅")
    return await m.send("✓ Sticker set successfully!\n\nNow reply any ViewOnce with this sticker to save it.")
  } catch (e) {
    console.log(e)
    return await m.sendErr(e)
  }
})

kord({
  on: "all",
}, async (m) => {
  try {
    if (!m.sticker || !m.quoted) return

    const savedHash = await getData("vv_sticker_hash")
    if (!savedHash) return

    // Get hash of the sticker that was just sent
    const buffer = await m.download()
    const currentHash = require("crypto").createHash("md5").update(buffer).digest("hex")

    if (currentHash !== savedHash) return

    // Check if quoted message is ViewOnce
    const quoted = m.quoted
    const isViewOnce = quoted.viewOnce || 
                       quoted.message?.viewOnceMessage ||
                       quoted.message?.viewOnceMessageV2 ||
                       quoted.message?.viewOnceMessageV2Extension ||
                       quoted.mtype?.includes("viewOnce")

    if (!isViewOnce) return

    let media
    try {
      media = await quoted.download()
    } catch {
      return await m.reply("✘ Failed to download ViewOnce")
    }

    if (!media) return

    const owner = (config().OWNER_NUMBER || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"

    let type = "image"
    if (quoted.video || quoted.mtype?.includes("video")) type = "video"
    else if (quoted.audio || quoted.mtype?.includes("audio")) type = "audio"

    await m.client.sendMessage(owner, {
      [type]: media,
      caption: `📥 *ViewOnce Saved*\nFrom: ${m.pushName || m.sender.split("@")[0]}`
    })

    await m.react("🥹")

  } catch (e) {
    console.log("vvsticker error:", e)
  }
})