/* 
 * Copyright © 2025 Mirage
 * This file is part of Kord and is licensed under the GNU GPLv3.
 * And I hope you know what you're doing here.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html
 * -------------------------------------------------------------------------------
 */

const { kord,
commands,
wtype,
prefix,
getData,
storeData,
changeFont,
formatTime,
config
} = require("../core/")
const path = require("path")
const fs = require("fs")

const pre = prefix


kord({
  cmd: "setcmd",
  desc: "bind a command to a sticker (whenevrr that stk is sent, the binded command is executed)",
  fromMe: true,
  type: "tools",
}, async (m, text) => {
  try {
  if (!m.quoted.sticker) return await m.send(`_Reply to a sticker with ${prefix}setcmd command_\n_example: ${prefix}setcmd ping_`)
  if (!text) return await m.send(`_provide a command also.._`) 
  var f = text?.trim()?.split(/\s+/)[0];
  var hash = m.quoted.fileSha256 ? Buffer.from(m.quoted.fileSha256).toString('hex') : null;
  if (!hash) return await m.send("couldn't get stk hash")
  const data = await getData("stk_cmd");
  const stk_cmd = data || {}
  stk_cmd[hash] = text
  await storeData("stk_cmd", JSON.stringify(stk_cmd, null, 2))
  return await m.send(`❏ Sticker set to *${f}*`)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "delcmd",
  desc: "Remove/unbind a command from a sticker",
  fromMe: true,
  type: "tools",
}, async (m) => {
  try {
  if (!m.quoted.sticker) {
    return await m.send(`_Reply to a sticker to delete its command_`);
  }
  const hash = m.quoted.fileSha256 ? Buffer.from(m.quoted.fileSha256).toString("hex") : null;
  if (!hash) return await m.send(`_hash not found_`);
  const data = await getData("stk_cmd");
  const stk_cmd = data || {}
  if (!stk_cmd[hash]) {
    return await m.send(`_no cmd found for that sticker.._`);
  }
  const oldCmd = stk_cmd[hash];
  delete stk_cmd[hash];
  await storeData("stk_cmd", JSON.stringify(stk_cmd, null, 2));
  return await m.send(`*cmd deleted!*\n_from:_ *${oldCmd}*`);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
});

kord({
  cmd: "listcmd|listcmds",
  desc: "List all sticker-bound commands",
  fromMe: true,
  type: "tools",
}, async (m) => {
  try {
  const data = await getData("stk_cmd");
  const stk_cmd = data || {}
  const entries = Object.entries(stk_cmd);
  if (entries.length === 0) {
    return await m.send(`_No sticker commands have been set yet._`);
  }
  let text = `❏ *Sticker Commands:*\n\n`;
  for (const [hash, cmd] of entries) {
    text += `❏ *${cmd}*\n_↳ hash:_ \`${hash.slice(0, 16)}...\`\n\n`;
  }
  return await m.send(text.trim());
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
});


kord({
  cmd: "delcmds",
  desc: "Delete all sticker-bound commands",
  fromMe: true,
  type: "tools",
}, async (m) => {
  try {
    const data = await getData("stk_cmd");
    const stk_cmd = data || {};
    const count = Object.keys(stk_cmd).length;
    
    if (count === 0) {
      return await m.send(`_No sticker commands to delete._`);
    }
    
    await storeData("stk_cmd", JSON.stringify({}, null, 2));
    return await m.send(`*All sticker commands deleted!*\n_Total removed:_ *${count}*`);
  } catch (e) {
    console.log("cmd error", e);
    return await m.sendErr(e);
  }
});


kord({
  cmd: "permit",
  desc: "permit a command or command group to work even when bot is private",
  fromMe: true,
  type: "tools",
}, async (m, text) => {
  try {
    const args = text.split(" ");

      if (!args || args.length === 0) {
        return await m.send(`*_Permit Command_*\n\nUsage:\n_${pre}permit-cmd list_\n_${pre}permit-cmd remove cmdtype CommandType_\n_${pre}permit-cmd remove cmd CommandName_\n_${pre}permit-cmd remove all_\n_${pre}permit-cmd cmdtype CommandType_\n_${pre}permit-cmd cmd CommandName_\n_${pre}permit-cmd all_`)
      }

      const option = args[0].toLowerCase();
      const value = args.length > 1 ? args.slice(1).join(" ") : null;
      const chatJid = m.chat;
      var pmdata = await getData("permit_cmd");
      if (!Array.isArray(pmdata)) pmdata = [];
      let isExist = pmdata.find(entry => entry.chatJid === chatJid);

      if (option === "list") {
        if (pmdata.length === 0) {
          return await m.send("_No permissions set for any chat._");
        }
        const thisChat = pmdata.filter(entry => entry.chatJid === chatJid);
        if (thisChat.length === 0) {
          return await m.send("_No permissions set for this chat_");
        }
        let listMsg = "_*Permitted Commands for this chat*_\n\n";
        thisChat.forEach((entry, i) => {
          listMsg += `${i+1}. ${entry.cmdType ? `cmd Type: ${entry.cmdType}` : ''}${entry.cmd ? `cmd: ${entry.cmd}` : ''}\n`;
        });
        return await m.send(listMsg);
      }

      if (option === "all") {
        const cmdTypes = [...new Set(commands.map(cmd => cmd.type))];
        const existingTypes = pmdata.filter(entry => entry.chatJid === chatJid && entry.cmdType).map(entry => entry.cmdType);
        const typesToAdd = cmdTypes.filter(type => !existingTypes.includes(type));
        
        if (typesToAdd.length === 0) {
          return await m.send("_*All command types are already permitted in this chat*_");
        }

        typesToAdd.forEach(cmdType => {
          pmdata.push({
            chatJid,
            cmdType,
            cmd: ""
          });
        });

        await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
        return await m.send(`_*All command types (${typesToAdd.length} types) are now permitted in this chat*_\n\n_Added: ${typesToAdd.join(", ")}_`);
      }

      if (option === "remove") {
        if (!value) {
          return await m.send(`*_specify what to remove._*\n_example: ${pre}permit-cmd remove cmdtype CommandType_\n_${pre}permit-cmd remove cmd CommandName_\n_${pre}permit-cmd remove all_`);
        }
        if (value.toLowerCase() === "all") {
          pmdata = pmdata.filter(entry => entry.chatJid !== chatJid);
          await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
          return await m.send("_*All permissions for this chat have been removed!*_");
        }
        const removeArgs = value.split(" ");
        const removeType = removeArgs[0].toLowerCase();
        const removeName = removeArgs.slice(1).join(" ");
        if (removeType === "cmdtype") {
          const cmdTypes = [...new Set(commands.map(cmd => cmd.type))];
          if (!cmdTypes.includes(removeName)) {
            return await m.send(`_*Invalid command type!!*_\n_Available types:_\n_${cmdTypes.join("\n")}_`);
          }
          const beforeLength = pmdata.length;
          pmdata = pmdata.filter(entry => !(entry.chatJid === chatJid && entry.cmdType === removeName));
          if (beforeLength === pmdata.length) {
            return await m.send(`_*cmd type "${removeName}" was not permitted in this chat*_`);
        }
          await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
          return await m.send(`_*cmd type "${removeName}" is no longer permitted in this chat*_`);
        }
        if (removeType === "cmd") {
          const usages =  [
  ...new Set(
    commands
      .flatMap(cmd => cmd.cmd?.split('|') || [])
      .map(cmd => cmd.trim())
      .filter(Boolean)
  )
].sort();
          if (!usages.includes(removeName)) {
            return await m.send(`_*cmd not found!*_ _use ${pre}menu to see available commands_`);
          }
          const beforeLength = pmdata.length;
          pmdata = pmdata.filter(entry => !(entry.chatJid === chatJid && entry.cmd === removeName));
          if (beforeLength === pmdata.length) {
            return await m.send(`_*cmd "${removeName}" was not permitted in this chat*_`);
          }
          await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
          return await m.send(`_*cmd "${removeName}" is no longer permitted in this chat*_`);
        }
        const index = parseInt(value) - 1;
        const thisChat = pmdata.filter(entry => entry.chatJid === chatJid);
        if (isNaN(index) || index < 0 || index >= thisChat.length) {
          return await m.send(`*_Invalid removal format_*\n_Use: ${pre}permit-cmd remove cmdtype CommandType_\n_or: ${pre}permit-cmd remove cmd CommandName_\n_or: ${pre}permit-cmd remove all_`);
        }
        const targetEntry = thisChat[index];
        pmdata = pmdata.filter(entry => 
          !(entry.chatJid === chatJid && 
            entry.cmdType === targetEntry.cmdType && 
            entry.cmd === targetEntry.cmd)
        );
        await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
        return await m.send(`_Permission removed: ${targetEntry.cmdType || targetEntry.cmd}_`);
      }
      if (option === "cmdtype") {
        if (!value) {
          const cmdTypes = [...new Set(commands.map(cmd => cmd.type))];
          return await m.send(`_*specify command type.*_ Available types:\n${cmdTypes.join("\n")}`);
        }
        const cmdTypes = [...new Set(commands.map(cmd => cmd.type))];
        if (!cmdTypes.includes(value)) {
          return await m.send(`_*Invalid command type!!*_\n_Available types:_\n_${cmdTypes.join("\n")}_`);
        }
        const alreadyPermitted = pmdata.some(entry => 
          entry.chatJid === chatJid && entry.cmdType === value
        );
        if (alreadyPermitted) {
          return await m.send(`_*cmd type "${value}" is already permitted in this chat*_`);
        }
        const entry = {
          chatJid,
          cmdType: value,
          cmd: ""
        };
        pmdata.push(entry);
        await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
        return await m.send(`_*cmd type "${value}" is now permitted in this chat*_`);
      }
      if (option === "cmd") {
        if (!value) {
          return await m.send(`_*specify a command*_`);
        }
        const usages = [
  ...new Set(
    commands
      .flatMap(cmd => cmd.cmd?.split('|') || [])
      .map(cmd => cmd.trim())
      .filter(Boolean)
  )
].sort();
        if (!usages.includes(value)) {
          return await m.send(`_*cmd not found!*_ _use ${pre}menu to see available commands_`);
        }
        const alreadyPermitted = pmdata.some(entry => 
          entry.chatJid === chatJid && entry.cmd === value
        );
        
        if (alreadyPermitted) {
          return await m.send(`_*cmd "${value}" is already permitted in this chat*_`);
        }
        const entry = {
          chatJid,
          cmdType: "",
          cmd: value
        };
        pmdata.push(entry);
        await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
        return await m.send(`_*cmd "${value}" is now permitted in this chat*_`);
      }
      const cmdTypes = [...new Set(commands.map(cmd => cmd.type))];
      if (cmdTypes.includes(option)) {
        const alreadyPermitted = pmdata.some(entry => 
          entry.chatJid === chatJid && entry.cmdType === option
        );
        if (alreadyPermitted) {
          return await m.send(`_*cmd type "${option}" is already permitted in this chat*_`);
        }
        const entry = {
          chatJid,
          cmdType: option,
          cmd: ""
        };
        pmdata.push(entry);
        await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
        return await m.send(`_*cmd type "${option}" is now permitted in this chat*_`);
      } 
      const usages = [
  ...new Set(
    commands
      .flatMap(cmd => cmd.cmd?.split('|') || [])
      .map(cmd => cmd.trim())
      .filter(Boolean)
  )
].sort();
      if (usages.includes(option)) {
        const alreadyPermitted = pmdata.some(entry => 
          entry.chatJid === chatJid && entry.cmd === option
        );
        if (alreadyPermitted) {
          return await m.send(`_*cmd "${option}" is already permitted in this chat*_`);
        }
        const entry = {
          chatJid,
          cmdType: "",
          cmd: option
        };
        pmdata.push(entry);
        await storeData("permit_cmd", JSON.stringify(pmdata, null, 2));
        return await m.send(`_*cmd "${option}" is now permitted in this chat*_`);
      }
      return await m.send(`\`\`\`INVALID\`\`\` \n*_Permit Command_*\n\nUsage:\n_${pre}permit-cmd list_\n_${pre}permit-cmd remove cmdtype CommandType_\n_${pre}permit-cmd remove cmd CommandName_\n_${pre}permit-cmd remove all_\n_${pre}permit-cmd cmdType/cmd_\n_${pre}permit-cmd all_`);
    } catch(err) {
      console.error(err);
      await m.send(`Error: ${err.message}`);
    }
})

kord({
  cmd: "mention",
  type: "tools",
  desc: "set action to be done when owner is mentioned",
  fromMe: true,
}, async (m, text) => {
  try {
    
    var mData =  await getData("mention_config") || {
  active: false,
  action: "",
  emoji: "🤍",
  text: ""
};
    const args = text.split(" ");
      if (args && args.length > 0) {
  const option = args[0].toLowerCase();
  const value = args.length > 1 ? args[1] : null;
  const fArgs = args.slice(1).join(" ")
    if (option === "off")  {
      mData.active = false;
      await storeData('mention_config', JSON.stringify(mData, null, 2))
      return await m.send("_Mention Action Has Been Turned Off!_");
       } else if (option === "-status" || option === "status") {
          var info = await getData('mention_config') || {active: false, action: "", emoji: "", text: ""}
          return m.send(`*Mention Status:*\n\n \`\`\`Active: ${info.active}\nAction: ${info.action}\nEmoji: ${info.emoji}\nText: ${info.text}\`\`\``)
        } else if (option === "-react" || option === "react") {
          var emoji = value
          mData.active = true;
          mData.action = "react";
          mData.emoji = emoji
          await storeData('mention_config', JSON.stringify(mData, null, 2))
          return await m.send(`_Query Saved!_`);
        } else if (option === "-text"  || option === "text") {
          var sentText = fArgs
          mData.active = true;
          mData.action = "text";
          mData.text = sentText;
          await storeData('mention_config', JSON.stringify(mData, null, 2))
          return await m.send(`_Query Saved!_`);
        } else {
          return await m.send(`_*Invalid Option!!!*_

_*Provide an Option*_
_.mention off_
_.mention -status_
_.mention -react 🤍_ (reacts when the owner is mentioned)
_.mention -text Your Text_ (sends custom text when owner is mentioned, Example: \'Your Text \')`);
        }
      } else {
        return await m.send(`_ *Provide an Option*_
_.mention off_
_.mention -status_
_.mention -react 🤍_ (reacts when the owner is mentioned)
_.mention -text Your Text_ (sends custom text when owner is mentioned, Example: \'Your Text \')`);
      }
    } catch (e) {
    console.error(e)
    m.send(`${e}`)
  } 
})
kord({
  on: "all"
}, async (m, text) => {
  try {
  var MData = await getData("mention_config") || {}
          if (!MData.active) {
            return;
          }
          var jidd = m.chat
          if (text.includes(config().OWNER_NUMBER) || text.includes(m.ownerJid) || m.mentionedJid.includes(m.ownerJid)) {
            if (MData.action === "react") {
            var pEmoji = MData.emoji
            return await m.client.sendMessage(jidd, { react: { text: pEmoji, key: m.key } })
            } else if (MData.action === "text") {
              var pText = MData.text
              return await m.client.sendMessage(jidd, { text: pText }, { quoted: m })
            }
          }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

async function loadAfkData() {
  try {
    const data = await getData("afk_config");
    if (!data || typeof data !== 'object') {
      return { users: {}, owner: { active: false, message: "", lastseen: "" } };
    }
    return data;
  } catch (err) {
    console.error("Error loading AFK data:", err);
    return { users: {}, owner: { active: false, message: "", lastseen: "" } };
  }
}

async function saveAfkData(data) {
  try {
    await storeData("afk_config", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving AFK data:", err);
  }
}

kord({
  cmd: "afk",
  desc: "set afk message",
  fromMe: wtype,
  type: "tools"
}, async (m, text) => {
  try {
  const txt = !text ? "" : text;
  global.afkData = await loadAfkData();
  if (txt.toLowerCase() === "off" || txt.toLowerCase() === "stop") {
    if (m.sender === m.ownerJid) {
      global.afkData.owner.active = false;
    } else {
      if (global.afkData.users[m.sender]) {
        global.afkData.users[m.sender].active = false;
      }
    }
    await saveAfkData(global.afkData);
    return await m.send("afk off");
  }
  
  const currentTime = Math.round((new Date()).getTime() / 1000);
  
  if (m.sender === m.ownerJid) {
    global.afkData.owner = {
      active: true,
      message: txt,
      lastseen: currentTime
    };
    await saveAfkData(global.afkData);
    return await m.send(`owner is now afk..`);
  } else {
    if (!global.afkData.users) {
      global.afkData.users = {};
    }
    
    global.afkData.users[m.sender] = {
      active: true,
      jid: m.chat,
      message: txt,
      lastseen: currentTime
    };
    
    await saveAfkData(global.afkData);
    return await m.send(`@${m.sender.split("@")[0]} is now afk..\n_Reason:_ ${txt}`, {mentions: [m.sender]});
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  on: "all",
}, async (message, text, c, store) => {
  try {
    const afkData = await loadAfkData() || { users: {}, owner: { active: false, message: "", lastseen: "" } }
    const user = message.sender
    if (message.message && message.message.reactionMessage) {
      return
    }
    if (!text) {
      return
    }
    
    if (c && c.includes("afk")) {
      return
    }
    
    if (afkData.users && afkData.users[user] && afkData.users[user].active) {
      afkData.users[user].active = false
      await saveAfkData(afkData)
      const timeDiff = Math.round((new Date()).getTime() / 1000) - afkData.users[user].lastseen
      const timeStr = formatTime(timeDiff)
      await message.send(`Welcome back @${user.split("@")[0]}!\nYou were afk for: *${timeStr}*`, {mentions: [user]})
    }
    
    if (user === message.ownerJid && afkData.owner && afkData.owner.active) {
      afkData.owner.active = false
      await message.send("welcome back!")
      await saveAfkData(afkData)
      return
    }
    
    if (afkData.owner && afkData.owner.active && user !== message.ownerJid) {
      let shouldNotify = false
      if (message.mentionedJid && message.mentionedJid.includes(message.ownerJid)) {
        shouldNotify = true
      }
      
      if (text.includes(message.ownerJid) || text.includes(message.ownerJid.split('@')[0])) {
        shouldNotify = true
      }
      
      if (message.quoted.sender === message.ownerJid) {
        shouldNotify = true
      }
     
      
      if (shouldNotify) {
        const timeDiff = Math.round((new Date()).getTime() / 1000) - afkData.owner.lastseen
        const timeStr = formatTime(timeDiff)
        await message.send(`*Owner is currently AFK.*\n*Reason:* ${afkData.owner.message || "Not specified"}\n*Last seen:* ${timeStr} ago`)
        
        const mesa = await message.forwardMessage(
          message.ownerJid,
          await global.store.findMsg(message.id),
          { quoted: message }
        )
        await message.client.sendMessage(message.ownerJid, { 
          text: `User: ${await global.store.getname(message.sender)}(${message.sender.split("@")[0]}) tagged/reply during afk, Message above:` 
        }, { quoted: mesa })
      }
    }
    
    for (const mentionedUser in afkData.users) {
      if (afkData.users[mentionedUser] && 
          afkData.users[mentionedUser].active && 
          user !== mentionedUser) {
        
        let shouldNotify = false
        
        if (message.mentionedJid && message.mentionedJid.includes(mentionedUser)) {
          shouldNotify = true
        }
        
        if (text.includes(mentionedUser) || text.includes(mentionedUser.split('@')[0])) {
          shouldNotify = true
        }
        
        if (message.quoted && message.quoted.sender === mentionedUser) {
          shouldNotify = true
        }
       
        if (shouldNotify) {
          const timeDiff = Math.round((new Date()).getTime() / 1000) - afkData.users[mentionedUser].lastseen
          const timeStr = formatTime(timeDiff)
          await message.send(`@${mentionedUser.split("@")[0]} *is currently AFK*.\n*Reason:* ${afkData.users[mentionedUser].message || "Not specified"}\n*Last seen:* ${timeStr} ago`, {mentions: [mentionedUser]})
        }
      }
    }
    
  } catch (e) {
   console.log("cmd error", e)
  }
})

var areact = {
    active: false,
    global: false,
    activeChats: [
        '1234@g.us'
    ],
}

if (!getData("areact_config")) {
     storeData("areact_config", JSON.stringify(areact, null, 2));
    }
    
kord({
  cmd: "areact|autoreact|autoreaction",
  desc: "automatically react to messages",
  fromMe: true,
  type: "tools",
}, async (m, text) => {
  try {
  const args = text.split(" ");
  if (args && args.length > 0) {
                const option = args[0].toLowerCase();
                const value = args.length > 1 ? args[1] : null;
                const fArgs = args.slice(1).join(" ")
        if (option === 'on' && value === 'global') {
            areact.global = true;
            await storeData('areact_config', JSON.stringify(areact, null, 2))
            return await m.send('_*Auto React Has Benn Enabled Globally!*_')
        } else if (option === 'off' && value === 'global') {
            areact.global = false;
            await storeData('areact_config', JSON.stringify(areact, null, 2))
            return await m.send('_*Auto react Has been disabled globally*_')
        } else if(option === 'on') {
      areact.active = true;
      areact.activeChats.push(m.chat)
      await storeData('areact_config', JSON.stringify(areact, null, 2))
      return await m.send('_*Auto react Has been Enabled for this group!*_\n\n> Use \`.areact global\` to turn on for all groups')
    } else if (option === 'off') {
      
      areact.activeChats = areact.activeChats.filter(jid => jid !== m.chat);
      await storeData('areact_config', JSON.stringify(areact, null, 2))
      return await m.send('_*Auto react Has been disabled for this group!*_\n\n> Use \`.areact off global\` to turn on for all groups')
    } else if(option === "status") {
      var sareact = await getData('areact_config')
      var actif = sareact.active
      var sglobal = sareact.global
     var sactifChat = new Set(sareact.activeChats || []);
      var sactiveChats = sactifChat.has(m.chat)
      await m.send(`_*AUto React Settings*_\n\n\`\`\`Active: ${actif}\nGlobal?: ${sglobal}\nActive Here?:${sactiveChats}\`\`\``)
    } else {
      m.send(`_*Choose A Valid Option!!*_
      
_*Avaliable Options:*_
\`.areact on\` (to turn on for the present chat)
\`.areact on global\` global (to turn on for all chats)
\`.areact off\` (to turn off for the present chat)
\`.areact off global\` (to turn off for all chats)
\`.areact status\` (to view rhe settings for the present chat)`)
    }
            } else {
m.send(`_*Avaliable Options:*_
\`.areact on\` (to turn on for the present chat)
\`.areact on global\` global (to turn on for all chats)
\`.areact off\` (to turn off for the present chat)
\`.areact off global\` (to turn off for all chats)
\`.areact status\` (to view rhe settings for the present chat)`)
            }
  } catch(e) {
    console.error(e)
    return await m.send(`an error occured: ${e}`)
  }
})

kord({
  on: "all",
  fromMe: false,
}, async(m, text) =>{
  try {
  if (!await getData("areact_config")) {
    await storeData("areact_config", JSON.stringify(areact, null, 2));
    }
   const ePath = path.join(__dirname, "..", "core", "store", 'emojis.json');
     const emojiList = JSON.parse(fs.readFileSync(ePath, 'utf-8')).emojis;
    const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
   const presentJid = m.chat
   var aReact = await getData('areact_config')
   var activeChats = new Set(aReact.activeChats || []);
   if (!activeChats.has(presentJid) && !aReact.global) {
     return;
   } else if (activeChats.has(presentJid) && !aReact.global) {
    await m.react(randomEmoji);
   } else if (aReact.global) {
     await m.react(randomEmoji)
   }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "ignore",
  desc: "ignores the current chat",
  fromMe: true,
  type: "bot"
}, async (m) => {
  try {
  let sdata = await getData("ignored")
  if (!Array.isArray(sdata)) sdata = []

  if (sdata.includes(m.chat)) return m.send("_this chat is already ignored_")

  sdata.push(m.chat)
  await storeData("ignored", JSON.stringify(sdata, null, 2))
  return m.send("_this chat is now ignored_")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "allow",
  desc: "removes the current chat from ignore list",
  fromMe: true,
  type: "bot"
}, async (m) => {
   try {
  let sdata = await getData("ignored")
  if (!Array.isArray(sdata)) sdata = []

  if (!sdata.includes(m.chat)) return m.send("_this chat is not ignored_")

  sdata = sdata.filter(jid => jid !== m.chat)
  await storeData("ignored", JSON.stringify(sdata, null, 2))
  return m.send("_this chat is now allowed_")
   } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "bot",
  desc: "turn bot on or off in this chat",
  fromMe: true,
  type: "bot"
}, async (m, text) => {
  try {
  let sdata = await getData("ignored")
  if (!Array.isArray(sdata)) sdata = []

  const isIgnored = sdata.includes(m.chat)

  if (/off/i.test(text)) {
    if (isIgnored) return m.send("_bot is already turned off in this chat_")
    sdata.push(m.chat)
    await storeData("ignored", JSON.stringify(sdata, null, 2))
    return m.send("_bot has been turned off in this chat_")
  }

  if (/on/i.test(text)) {
    if (!isIgnored) return m.send("_bot is already active in this chat_")
    sdata = sdata.filter(jid => jid !== m.chat)
    await storeData("ignored", JSON.stringify(sdata, null, 2))
    return m.send("_bot has been turned on in this chat_")
  }

  return m.send("_usage: .bot on | .bot off_")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})




















/* 
 * Marketplace system for Kord-Ai (full fixed version)
 * Paste at the bottom of an existing cmds file
 */


const MEDIA_DIR = path.join(__dirname, "..", "media", "marketplace")
const DATA_KEY = "marketplace_listings"
const GROUPS_KEY = "marketplace_groups"
const INACTIVE_DAYS = 3

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
}

// ── Helpers ──────────────────────────────────────────────

function generateId(type) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let id = ""
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return (type === "request" ? "R" : "S") + id
}

async function loadListings() {
  let data = await getData(DATA_KEY)
  if (!data) return {}
  if (typeof data === "string") {
    try { return JSON.parse(data) } catch { return {} }
  }
  return data
}

async function saveListings(listings) {
  await storeData(DATA_KEY, JSON.stringify(listings, null, 2))
}

async function loadGroups() {
  let data = await getData(GROUPS_KEY)
  if (!data) return []
  if (typeof data === "string") {
    try { return JSON.parse(data) } catch { return [] }
  }
  return Array.isArray(data) ? data : []
}

async function saveGroups(groups) {
  await storeData(GROUPS_KEY, JSON.stringify(groups, null, 2))
}

function cleanNumber(num) {
  if (!num) return ""
  return String(num).replace(/\D/g, "")
}

async function downloadMedia(m) {
  const files = []
  try {
    if (m.quoted) {
      const q = m.quoted
      if (q.image || q.video || q.document || q.audio || q.sticker) {
        const buffer = await q.download()
        if (buffer && buffer.length > 100) {
          let ext = ".bin"
          if (q.image) ext = ".jpg"
          else if (q.video) ext = ".mp4"
          else if (q.audio) ext = ".ogg"
          else if (q.sticker) ext = ".webp"
          files.push({
            buffer,
            ext,
            mimetype: q.mimetype || (q.image ? "image/jpeg" : q.video ? "video/mp4" : "application/octet-stream")
          })
        }
      }
    }
    if (m.image || m.video || m.document) {
      const buffer = await m.download()
      if (buffer && buffer.length > 100) {
        let ext = m.image ? ".jpg" : m.video ? ".mp4" : ".bin"
        files.push({
          buffer,
          ext,
          mimetype: m.mimetype || (m.image ? "image/jpeg" : "video/mp4")
        })
      }
    }
  } catch (e) {
    console.log("marketplace media download error:", e.message)
  }
  return files
}

async function saveMediaFiles(id, mediaFiles) {
  const dir = path.join(MEDIA_DIR, id)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const saved = []
  const existing = fs.readdirSync(dir).filter(f => !f.startsWith(".")).length

  for (let i = 0; i < mediaFiles.length; i++) {
    const f = mediaFiles[i]
    if (!f.buffer || f.buffer.length < 100) continue

    const filename = `\( {Date.now()}_ \){existing + i + 1}${f.ext}`
    const filepath = path.join(dir, filename)
    fs.writeFileSync(filepath, f.buffer)
    saved.push({
      path: filepath,
      filename,
      mimetype: f.mimetype,
      ext: f.ext
    })
  }
  return saved
}

function getMediaList(id) {
  const dir = path.join(MEDIA_DIR, id)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => !f.startsWith("."))
    .map(f => ({ path: path.join(dir, f), filename: f }))
}

function getLatestProduct(listings) {
  const active = Object.values(listings)
    .filter(i => i.status === "active" && i.type === "sell")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return active[0] || null
}

async function cleanupInactive() {
  const listings = await loadListings()
  const now = Date.now()
  const limit = INACTIVE_DAYS * 24 * 60 * 60 * 1000
  let changed = false

  for (const id of Object.keys(listings)) {
    const item = listings[id]
    if (item.status === "inactive" && item.inactiveAt) {
      if (now - item.inactiveAt > limit) {
        const dir = path.join(MEDIA_DIR, id)
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true })
        }
        delete listings[id]
        changed = true
      }
    }
  }
  if (changed) await saveListings(listings)
}

cleanupInactive().catch(() => {})

// ── Commands ─────────────────────────────────────────────

// MPHELP
kord({
  cmd: "mphelp|mp",
  desc: "List all marketplace commands",
  fromMe: true,
  type: "marketplace",
}, async (m) => {
  const msg = `*Marketplace Commands*

*Products*
• *${prefix}mpsell* — reply to media → new product
• *${prefix}mpsell ID* — add media to that product
• *${prefix}mpadd* — add media to latest product
• *${prefix}mpedit ID caption* — set caption
• *${prefix}mpowner ID* — get owner number
• *${prefix}mpowner ID 234xxx* — set owner number
• *${prefix}mpdelete* — reply to a post OR use ID
• *${prefix}mpremove ID* — mark inactive
• *${prefix}mpview ID* — view details + media

*Requests*
• *${prefix}mprequest text* — create request
• *${prefix}mprequest* — reply to media → request
• *${prefix}mprequest ID* — add media to request

*List*
• *${prefix}mplist* — summary
• *${prefix}mplist sell*
• *${prefix}mplist request*
• *${prefix}mplist owner* — full list + numbers

*Groups*
• *${prefix}mpgadd* — add current group (silent)
• *${prefix}mpgremove* — remove current group (silent)
• *${prefix}mpgroup list*
• *${prefix}mpgroup clear*

*Post*
• *${prefix}mppost* — preview
• *${prefix}mppost go* — post all
• *${prefix}mppost go ID* — post one item

*Stickers tip*
.setcmd mpsell
.setcmd mpadd
.setcmd mpdelete
.setcmd mpgadd
.setcmd mpgremove`
  return await m.send(msg)
})

// MPSSELL
kord({
  cmd: "mpsell",
  desc: "Create product or add media to specific ID",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    await cleanupInactive()
    const arg = (text || "").trim()
    const listings = await loadListings()

    if (arg && listings[arg.toUpperCase()]) {
      const id = arg.toUpperCase()
      if (listings[id].type !== "sell") {
        return await m.send(`_#${id} is a request. Use mprequest ${id}_`)
      }
      if (!m.quoted && !(m.image || m.video)) {
        return await m.send(`_Reply to a photo/video with *${prefix}mpsell ${id}*_`)
      }
      const mediaFiles = await downloadMedia(m)
      if (!mediaFiles.length) return await m.send("_Could not download media_")
      const saved = await saveMediaFiles(id, mediaFiles)
      listings[id].mediaCount = (listings[id].mediaCount || 0) + saved.length
      listings[id].updatedAt = Date.now()
      await saveListings(listings)
      return await m.send(`✓ Added *\( {saved.length}* media to *# \){id}*\n_Total media: ${listings[id].mediaCount}_`)
    }

    if (!m.quoted && !(m.image || m.video)) {
      return await m.send(
        `_Reply to a photo/video with *${prefix}mpsell*_\n` +
        `_Or *${prefix}mpsell ID* to add to existing_\n` +
        `_Or *${prefix}mpadd* to add to latest product_`
      )
    }

    const mediaFiles = await downloadMedia(m)
    if (!mediaFiles.length) return await m.send("_Could not download media_")

    let id = generateId("sell")
    while (listings[id]) id = generateId("sell")

    const saved = await saveMediaFiles(id, mediaFiles)

    let ownerNumber = cleanNumber(arg)
    if (!ownerNumber && m.quoted?.participant) ownerNumber = cleanNumber(m.quoted.participant)
    if (!ownerNumber && m.quoted?.sender) ownerNumber = cleanNumber(m.quoted.sender)

    listings[id] = {
      id,
      type: "sell",
      caption: "",
      ownerNumber: ownerNumber || "",
      mediaCount: saved.length,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inactiveAt: null
    }
    await saveListings(listings)

    let msg = `✓ Product added\n\n*ID:* ${id}\n_Media: ${saved.length}_`
    if (ownerNumber) msg += `\n_Owner: ${ownerNumber}_`
    msg += `\n\n_Set caption:_ *${prefix}mpedit ${id} Your caption*`
    if (!ownerNumber) msg += `\n_Set owner:_ *${prefix}mpowner ${id} 234xxxxxxxxxx*`
    msg += `\n\n_Add more media with *${prefix}mpadd*_`
    return await m.send(msg)
  } catch (e) {
    console.log("mpsell error", e)
    return await m.sendErr(e)
  }
})

// MPADD
kord({
  cmd: "mpadd",
  desc: "Add media to the latest product",
  fromMe: true,
  type: "marketplace",
}, async (m) => {
  try {
    await cleanupInactive()
    const listings = await loadListings()
    const latest = getLatestProduct(listings)

    if (!latest) {
      return await m.send(`_No active product found._\n_Create one with *${prefix}mpsell*_`)
    }
    if (!m.quoted && !(m.image || m.video)) {
      return await m.send(`_Reply to a photo/video with *\( {prefix}mpadd*_\n_Latest product: *# \){latest.id}*_`)
    }

    const mediaFiles = await downloadMedia(m)
    if (!mediaFiles.length) return await m.send("_Could not download media_")

    const saved = await saveMediaFiles(latest.id, mediaFiles)
    listings[latest.id].mediaCount = (listings[latest.id].mediaCount || 0) + saved.length
    listings[latest.id].updatedAt = Date.now()
    await saveListings(listings)

    return await m.send(`✓ Added *\( {saved.length}* media to *# \){latest.id}*\n_Total media: ${listings[latest.id].mediaCount}_`)
  } catch (e) {
    console.log("mpadd error", e)
    return await m.sendErr(e)
  }
})

// MPREQUEST
kord({
  cmd: "mprequest",
  desc: "Create request or add media to request",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    await cleanupInactive()
    const arg = (text || "").trim()
    const listings = await loadListings()

    if (arg && listings[arg.toUpperCase()]) {
      const id = arg.toUpperCase()
      if (listings[id].type !== "request") {
        return await m.send(`_#${id} is a sell product. Use mpsell ${id}_`)
      }
      if (!m.quoted && !(m.image || m.video)) {
        return await m.send(`_Reply to a photo/video with *${prefix}mprequest ${id}*_`)
      }
      const mediaFiles = await downloadMedia(m)
      if (!mediaFiles.length) return await m.send("_Could not download media_")
      const saved = await saveMediaFiles(id, mediaFiles)
      listings[id].mediaCount = (listings[id].mediaCount || 0) + saved.length
      listings[id].updatedAt = Date.now()
      await saveListings(listings)
      return await m.send(`✓ Added *\( {saved.length}* media to request *# \){id}*\n_Total: ${listings[id].mediaCount}_`)
    }

    const hasMedia = m.quoted || m.image || m.video
    const captionText = arg || (m.quoted?.text || "")

    if (!hasMedia && !captionText) {
      return await m.send(
        `_Usage:_\n*${prefix}mprequest Looking for PS5*\n` +
        `_Or reply to media with *${prefix}mprequest*_`
      )
    }

    let id = generateId("request")
    while (listings[id]) id = generateId("request")

    let mediaCount = 0
    if (hasMedia) {
      const mediaFiles = await downloadMedia(m)
      if (mediaFiles.length) {
        const saved = await saveMediaFiles(id, mediaFiles)
        mediaCount = saved.length
      }
    }

    let ownerNumber = ""
    if (m.quoted?.participant) ownerNumber = cleanNumber(m.quoted.participant)
    else if (m.quoted?.sender) ownerNumber = cleanNumber(m.quoted.sender)

    listings[id] = {
      id,
      type: "request",
      caption: captionText || "",
      ownerNumber: ownerNumber || "",
      mediaCount,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inactiveAt: null
    }
    await saveListings(listings)

    let msg = `✓ Request added\n\n*ID:* ${id}`
    if (captionText) msg += `\n_${captionText}_`
    if (mediaCount) msg += `\n_Media: ${mediaCount}_`
    if (!captionText) msg += `\n\n_Set caption:_ *${prefix}mpedit ${id} Looking for ...*`
    return await m.send(msg)
  } catch (e) {
    console.log("mprequest error", e)
    return await m.sendErr(e)
  }
})

// MPEDIT
kord({
  cmd: "mpedit",
  desc: "Set or update caption",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const parts = (text || "").trim().split(/\s+/)
    const id = (parts[0] || "").toUpperCase()
    const caption = parts.slice(1).join(" ").trim()

    if (!id || !caption) {
      return await m.send(`_Usage: *${prefix}mpedit SUSYY iPhone 13 for sale*_`)
    }

    const listings = await loadListings()
    if (!listings[id]) return await m.send(`_No item found with ID *#${id}*_`)

    listings[id].caption = caption
    listings[id].updatedAt = Date.now()
    await saveListings(listings)
    return await m.send(`✓ Caption updated for *#\( {id}*\n\n \){caption}`)
  } catch (e) {
    console.log("mpedit error", e)
    return await m.sendErr(e)
  }
})

// MPOWNER
kord({
  cmd: "mpowner",
  desc: "Get or set owner number",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const parts = (text || "").trim().split(/\s+/)
    const id = (parts[0] || "").toUpperCase()
    const number = cleanNumber(parts[1] || "")

    if (!id) {
      return await m.send(`_Usage:_\n*\( {prefix}mpowner SUSYY*\n* \){prefix}mpowner SUSYY 234xxxxxxxxxx*`)
    }

    const listings = await loadListings()
    if (!listings[id]) return await m.send(`_No item found with ID *#${id}*_`)

    if (number) {
      listings[id].ownerNumber = number
      listings[id].updatedAt = Date.now()
      await saveListings(listings)
      return await m.send(`✓ Owner set for *#\( {id}*\n\` \){number}\``)
    }

    const owner = listings[id].ownerNumber
    if (!owner) {
      return await m.send(`_No owner saved for *#\( {id}*_\n_Set with: * \){prefix}mpowner ${id} 234xxxxxxxxxx*_`)
    }
    return await m.send(`*Owner of #\( {id}:*\n\` \){owner}\``)
  } catch (e) {
    console.log("mpowner error", e)
    return await m.sendErr(e)
  }
})

// MPREMOVE
kord({
  cmd: "mpremove",
  desc: "Mark item inactive",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const id = (text || "").trim().toUpperCase()
    if (!id) return await m.send(`_Usage: *${prefix}mpremove SUSYY*_`)

    const listings = await loadListings()
    if (!listings[id]) return await m.send(`_No item found with ID *#${id}*_`)

    listings[id].status = "inactive"
    listings[id].inactiveAt = Date.now()
    listings[id].updatedAt = Date.now()
    await saveListings(listings)
    return await m.send(`✓ *#${id}* marked inactive\n_Auto-deleted after ${INACTIVE_DAYS} days_`)
  } catch (e) {
    console.log("mpremove error", e)
    return await m.sendErr(e)
  }
})

// MPDELETE - by ID or reply to posted message
kord({
  cmd: "mpdelete",
  desc: "Remove product by ID or by replying to a post",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const listings = await loadListings()
    let id = (text || "").trim().toUpperCase()

    if (!id && m.quoted) {
      const quotedText = m.quoted.text || m.quoted.caption || ""
      const match = quotedText.match(/#?([SR][A-Z0-9]{4,})/i)
      if (match) id = match[1].toUpperCase()
    }

    if (!id) {
      return await m.send(
        `_Reply to a posted product with *${prefix}mpdelete*_\n` +
        `_Or use *${prefix}mpdelete SUSYY*_`
      )
    }

    if (!listings[id]) {
      return await m.send(`_No item found with ID *#${id}*_`)
    }

    listings[id].status = "inactive"
    listings[id].inactiveAt = Date.now()
    listings[id].updatedAt = Date.now()
    await saveListings(listings)

    return await m.send(`✓ *#${id}* removed\n_Will be auto-deleted after ${INACTIVE_DAYS} days_`)
  } catch (e) {
    console.log("mpdelete error", e)
    return await m.sendErr(e)
  }
})

// MPLIST
kord({
  cmd: "mplist",
  desc: "List items",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    await cleanupInactive()
    const filter = (text || "").trim().toLowerCase()
    const listings = await loadListings()
    const items = Object.values(listings).filter(i => i.status === "active")

    let filtered = items
    if (filter === "sell") filtered = items.filter(i => i.type === "sell")
    else if (filter === "request") filtered = items.filter(i => i.type === "request")

    if (!filtered.length) return await m.send("_No active items_")

    if (filter === "owner") {
      let msg = `*Marketplace — Active (${items.length})*\n\n`
      for (const item of items) {
        const typeLabel = item.type === "sell" ? "SELL" : "REQ"
        msg += `*#\( {item.id}* [ \){typeLabel}]\n`
        msg += `${item.caption || "_No caption_"}\n`
        msg += `Owner: ${item.ownerNumber || "_not set_"}\n`
        msg += `Media: ${item.mediaCount || 0}\n\n`
      }
      return await m.send(msg.trim())
    }

    let msg = `*Marketplace* — ${filtered.length} active`
    if (filter === "sell") msg += " (sell)"
    if (filter === "request") msg += " (requests)"
    msg += "\n\n"

    for (const item of filtered) {
      const typeLabel = item.type === "sell" ? "S" : "R"
      const cap = item.caption
        ? (item.caption.length > 40 ? item.caption.slice(0, 40) + "…" : item.caption)
        : "_no caption_"
      msg += `*#\( {item.id}* [ \){typeLabel}] ${cap} · ${item.mediaCount || 0} media\n`
    }

    msg += `\n_Use *${prefix}mplist owner* for full details + numbers_`
    return await m.send(msg.trim())
  } catch (e) {
    console.log("mplist error", e)
    return await m.sendErr(e)
  }
})

// MPVIEW
kord({
  cmd: "mpview",
  desc: "View full details + media",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const id = (text || "").trim().toUpperCase()
    if (!id) return await m.send(`_Usage: *${prefix}mpview SUSYY*_`)

    const listings = await loadListings()
    const item = listings[id]
    if (!item) return await m.send(`_No item found with ID *#${id}*_`)

    const typeLabel = item.type === "sell" ? "FOR SALE" : "REQUEST"
    let msg = `*#${item.id}* — ${typeLabel}\n`
    msg += `Status: ${item.status}\n`
    msg += `Caption: ${item.caption || "_none_"}\n`
    msg += `Owner: ${item.ownerNumber || "_not set_"}\n`
    msg += `Media: ${item.mediaCount || 0}\n`
    msg += `Created: ${new Date(item.createdAt).toLocaleString()}`

    await m.send(msg)

    const media = getMediaList(id)
    for (const file of media) {
      try {
        const buffer = fs.readFileSync(file.path)
        if (!buffer || buffer.length < 100) continue
        const isVideo = file.filename.endsWith(".mp4")
        if (isVideo) {
          await m.send(buffer, { caption: `#${id}`, mimetype: "video/mp4" }, "video")
        } else {
          await m.send(buffer, { caption: `#${id}`, mimetype: "image/jpeg" }, "image")
        }
      } catch (e) {
        console.log("mpview media error", e.message)
      }
    }
  } catch (e) {
    console.log("mpview error", e)
    return await m.sendErr(e)
  }
})

// Shared group logic
async function handleGroupAdd(m) {
  const groups = await loadGroups()
  const ownerJid = m.ownerJid || m.sender

  const silentReact = async (emoji = "✅") => {
    try {
      await m.client.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    } catch {}
  }
  const notifyOwner = async (text) => {
    try {
      await m.client.sendMessage(ownerJid, { text })
    } catch {}
  }

  if (!m.chat.endsWith("@g.us")) {
    return await m.send("_Use this *inside* the group_")
  }

  if (groups.includes(m.chat)) {
    await silentReact("⚠️")
    await notifyOwner(`⚠ Group already in list\n\`${m.chat}\``)
    return
  }

  groups.push(m.chat)
  await saveGroups(groups)

  let gName = m.chat
  try {
    const meta = await m.client.groupMetadata(m.chat)
    gName = meta.subject || m.chat
  } catch {}

  await silentReact("✅")
  await notifyOwner(`✓ Group added\n*\( {gName}*\n\` \){m.chat}\`\n\nTotal: ${groups.length}`)
}

async function handleGroupRemove(m) {
  const groups = await loadGroups()
  const ownerJid = m.ownerJid || m.sender

  const silentReact = async (emoji = "✅") => {
    try {
      await m.client.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    } catch {}
  }
  const notifyOwner = async (text) => {
    try {
      await m.client.sendMessage(ownerJid, { text })
    } catch {}
  }

  if (!m.chat.endsWith("@g.us")) {
    return await m.send("_Use this *inside* the group_")
  }

  const idx = groups.indexOf(m.chat)
  if (idx === -1) {
    await silentReact("⚠️")
    await notifyOwner(`⚠ Group not in list\n\`${m.chat}\``)
    return
  }

  groups.splice(idx, 1)
  await saveGroups(groups)

  await silentReact("✅")
  await notifyOwner(`✓ Group removed\n\`${m.chat}\`\n\nTotal: ${groups.length}`)
}

// MPGADD (for sticker)
kord({
  cmd: "mpgadd",
  desc: "Add current group to marketplace (silent)",
  fromMe: true,
  type: "marketplace",
}, async (m) => {
  try {
    await handleGroupAdd(m)
  } catch (e) {
    console.log("mpgadd error", e)
    return await m.sendErr(e)
  }
})

// MPGREMOVE (for sticker)
kord({
  cmd: "mpgremove",
  desc: "Remove current group from marketplace (silent)",
  fromMe: true,
  type: "marketplace",
}, async (m) => {
  try {
    await handleGroupRemove(m)
  } catch (e) {
    console.log("mpgremove error", e)
    return await m.sendErr(e)
  }
})

// MPGROUP (list / clear / also supports add|remove)
kord({
  cmd: "mpgroup",
  desc: "Manage groups: add, remove, list, clear",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const arg = (text || "").trim().toLowerCase()

    if (arg === "add") return await handleGroupAdd(m)
    if (arg === "remove") return await handleGroupRemove(m)

    const groups = await loadGroups()

    if (arg === "list" || !arg) {
      if (!groups.length) return await m.send("_No groups added yet_")
      let msg = `*Marketplace Groups (${groups.length})*\n\n`
      for (let i = 0; i < groups.length; i++) {
        let name = groups[i]
        try {
          const meta = await m.client.groupMetadata(groups[i])
          name = meta.subject || groups[i]
        } catch {}
        msg += `${i + 1}. \( {name}\n\` \){groups[i]}\`\n\n`
      }
      return await m.send(msg.trim())
    }

    if (arg === "clear") {
      await saveGroups([])
      return await m.send("_All marketplace groups cleared_")
    }

    return await m.send(
      `*mpgroup* usage:\n` +
      `• *\( {prefix}mpgadd* / * \){prefix}mpgroup add*\n` +
      `• *\( {prefix}mpgremove* / * \){prefix}mpgroup remove*\n` +
      `• *${prefix}mpgroup list*\n` +
      `• *${prefix}mpgroup clear*`
    )
  } catch (e) {
    console.log("mpgroup error", e)
    return await m.sendErr(e)
  }
})

// MPPOST
kord({
  cmd: "mppost",
  desc: "Post items to saved groups",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    await cleanupInactive()
    const listings = await loadListings()
    const groups = await loadGroups()
    const active = Object.values(listings).filter(i => i.status === "active")

    if (!active.length) return await m.send("_No active items to post_")
    if (!groups.length) return await m.send("_No groups saved. Use *mpgadd* first_")

    const arg = (text || "").trim().toLowerCase()

    if (!arg || arg === "preview") {
      let msg = `*Ready to post*\n\n`
      msg += `Active items: *${active.length}*\n`
      msg += `Groups: *${groups.length}*\n\n`
      msg += `Items:\n`
      for (const item of active.slice(0, 15)) {
        const t = item.type === "sell" ? "S" : "R"
        const cap = item.caption ? item.caption.slice(0, 30) : "_no caption_"
        msg += `• #\( {item.id} [ \){t}] ${cap}\n`
      }
      if (active.length > 15) msg += `... +${active.length - 15} more\n`
      msg += `\n_Reply *${prefix}mppost go* to post all_\n`
      msg += `_Or *${prefix}mppost go SUSYY* for one item_`
      return await m.send(msg)
    }

    let toPost = active
    if (arg.startsWith("go")) {
      const parts = arg.split(/\s+/).slice(1)
      if (parts.length) {
        toPost = parts
          .map(p => listings[p.toUpperCase()])
          .filter(i => i && i.status === "active")
        if (!toPost.length) return await m.send("_None of those IDs are active_")
      }
    } else {
      return await m.send(`_Use *\( {prefix}mppost* or * \){prefix}mppost go*_`)
    }

    await m.send(`_Posting *\( {toPost.length}* item(s) to * \){groups.length}* group(s)..._`)

    let success = 0
    let fail = 0

    for (const item of toPost) {
      const caption = item.caption || `#${item.id}`
      const media = getMediaList(item.id)

      for (const groupJid of groups) {
        try {
          if (media.length === 0) {
            await m.client.sendMessage(groupJid, { text: caption })
          } else {
            for (let i = 0; i < media.length; i++) {
              const file = media[i]
              const buffer = fs.readFileSync(file.path)
              if (!buffer || buffer.length < 100) continue

              const isVideo = file.filename.endsWith(".mp4")
              if (isVideo) {
                await m.client.sendMessage(groupJid, {
                  video: buffer,
                  mimetype: "video/mp4",
                  caption: i === 0 ? caption : undefined
                })
              } else {
                await m.client.sendMessage(groupJid, {
                  image: buffer,
                  mimetype: "image/jpeg",
                  caption: i === 0 ? caption : undefined
                })
              }
              await new Promise(r => setTimeout(r, 1200))
            }
          }
          success++
          await new Promise(r => setTimeout(r, 1800))
        } catch (e) {
          console.log(`mppost fail ${groupJid}:`, e.message)
          fail++
        }
      }
    }

    return await m.send(`✓ Posting done\n_Success: ${success}_\n_Failed: ${fail}_`)
  } catch (e) {
    console.log("mppost error", e)
    return await m.sendErr(e)
  }
})