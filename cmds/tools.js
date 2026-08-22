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
 * Marketplace / Ad Queue Assistant (v2 — MongoDB-backed)
 * ────────────────────────────────────────────────────────
 * Personal inventory + advertising queue for items people send you
 * to sell. Owner + SUDO/MODS only. Never auto-posts anywhere —
 * every post targets explicit groups or named group categories
 * you set up yourself.
 *
 * ── STORAGE: DIRECT MONGODB, NOT getData/storeData ──
 * This connects straight to a MongoDB database you control (e.g.
 * a free instance from sparkdb.pro or any Mongo host) instead of
 * the bot's core key-value store. Reasoning: this data needs real
 * per-item documents with growing history arrays (every repost
 * logged), not one giant JSON blob rewritten on every change.
 *
 * REQUIRES the "mongodb" npm package. This repo already uses
 * MongoDB for economy commands (per config.env's MONGODB_URI), so
 * the driver is very likely already a dependency — if `require
 * ("mongodb")` fails on deploy, run `npm install mongodb --save`.
 *
 * REQUIRES these env vars (add to config.js the same way
 * GROQ_API_KEY was added, then set real values in Render's
 * dashboard — never commit real connection strings):
 *   MARKETPLACE_MONGO_URI  - full connection string
 *   MARKETPLACE_DB_NAME    - database name (optional; if your
 *                             connection string already specifies
 *                             a database, leave this blank)
 *
 * ── ITEM LIFECYCLE (v2 — fixes the v1 design mistake) ──
 * v1 treated "posted" as a terminal status that blocked reposting.
 * That was wrong — the real workflow is: post an item repeatedly
 * (daily / twice-daily, your call) across groups until it sells.
 *
 * item.status is now just: "active" | "sold"
 *   - active: can be posted (manually or scheduled) any number of
 *     times, with every attempt logged to item.postHistory
 *   - sold: excluded from normal listings, refuses further posts
 *     until you run `.item <id> unsold`
 *
 * item.schedule holds AT MOST ONE pending scheduled post at a time
 * (cancel with `.item <id> cancelpost` before scheduling another).
 *
 * ── UPLOAD FIX ──
 * v1 checked m.quoted.image / m.quoted.video to detect grabbable
 * media, which missed valid cases. Switched to m.quoted.media (the
 * same check your existing, working .url command uses). Errors
 * from download/upload are now shown to you directly in chat
 * instead of a generic "try again" — you need that detail since
 * there's no easy way for you to see Render's server logs.
 *
 * KNOWN LIMITATION: if you multi-select several photos in
 * WhatsApp's native share sheet, WhatsApp may send them as a
 * grouped "album" that bots can't reliably read individual images
 * from. Workaround: send photos one at a time, not as a group,
 * then .item grab each one.
 */

const { MongoClient } = require("mongodb")

// ── connection (lazy singleton, reused across calls) ──
async function getMarketDb() {
  const uri = config().MARKETPLACE_MONGO_URI
  if (!uri) throw new Error("MARKETPLACE_MONGO_URI is not set")
  if (!global.marketMongoClient) {
    global.marketMongoClient = new MongoClient(uri)
    await global.marketMongoClient.connect()
  }
  const dbName = config().MARKETPLACE_DB_NAME
  return dbName ? global.marketMongoClient.db(dbName) : global.marketMongoClient.db()
}

if (!global.marketplaceDrafts) global.marketplaceDrafts = new Map() // senderJid -> draft (in-memory, not persisted)
if (!global.marketplaceTimers) global.marketplaceTimers = new Map() // itemId -> timeout handle
if (!global.marketplaceClient) global.marketplaceClient = null // live WA client, captured opportunistically below

const drafts = global.marketplaceDrafts
const timers = global.marketplaceTimers

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
//  ITEM STORAGE (Mongo)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function nextItemId() {
  const db = await getMarketDb()
  const col = db.collection("marketplace_counters")
  await col.updateOne({ _id: "item" }, { $inc: { seq: 1 } }, { upsert: true })
  const doc = await col.findOne({ _id: "item" })
  return `ITEM-${String(doc.seq).padStart(3, "0")}`
}

async function insertItem(item) {
  const db = await getMarketDb()
  await db.collection("marketplace_items").insertOne({ _id: item.id, ...item })
}

async function getItem(id) {
  const db = await getMarketDb()
  return db.collection("marketplace_items").findOne({ _id: id })
}

async function listItems(filter = {}) {
  const db = await getMarketDb()
  return db.collection("marketplace_items").find(filter).sort({ createdAt: -1 }).toArray()
}

async function updateItem(id, patch) {
  const db = await getMarketDb()
  await db.collection("marketplace_items").updateOne({ _id: id }, { $set: patch })
}

async function pushHistory(id, entry) {
  const db = await getMarketDb()
  await db.collection("marketplace_items").updateOne(
    { _id: id },
    { $push: { postHistory: entry }, $inc: { postCount: entry.results?.some(r => r.ok) ? 1 : 0 } }
  )
}

async function deleteItemDoc(id) {
  const db = await getMarketDb()
  await db.collection("marketplace_items").deleteOne({ _id: id })
}

function normalizeItemToken(token) {
  const digits = (token || "").replace(/\D/g, "")
  return digits ? `ITEM-${digits.padStart(3, "0")}` : null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GROUP CATEGORIES (Mongo)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function listCategories() {
  const db = await getMarketDb()
  return db.collection("marketplace_categories").find({}).toArray()
}

async function getCategory(name) {
  const db = await getMarketDb()
  return db.collection("marketplace_categories").findOne({ _id: name.toLowerCase() })
}

async function addToCategory(name, jids) {
  const db = await getMarketDb()
  await db.collection("marketplace_categories").updateOne(
    { _id: name.toLowerCase() },
    { $addToSet: { groups: { $each: jids } }, $setOnInsert: { displayName: name } },
    { upsert: true }
  )
}

async function removeFromCategory(name, jid) {
  const db = await getMarketDb()
  await db.collection("marketplace_categories").updateOne(
    { _id: name.toLowerCase() },
    { $pull: { groups: jid } }
  )
}

async function deleteCategory(name) {
  const db = await getMarketDb()
  await db.collection("marketplace_categories").deleteOne({ _id: name.toLowerCase() })
}

async function resolveTargets(targetsStr) {
  const tokens = targetsStr.split(",").map(t => t.trim()).filter(Boolean)
  const jids = new Set()
  const unresolved = []

  for (const tok of tokens) {
    if (tok.endsWith("@g.us")) { jids.add(tok); continue }
    const cat = await getCategory(tok)
    if (cat) { (cat.groups || []).forEach(g => jids.add(g)); continue }
    unresolved.push(tok)
  }

  return { jids: [...jids], unresolved }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIME PARSING
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
  const handle = setTimeout(() => performPost(itemId, "scheduled"), delayMs)
  timers.set(itemId, handle)
}

async function sendItemToTarget(client, jid, item, postText) {
  if (!item.media.length) {
    await client.sendMessage(jid, { text: postText })
    return
  }
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

// triggeredBy: "manual" | "scheduled"
// explicitTargets: required for "manual" (immediate posts aren't stored
// anywhere before sending); ignored for "scheduled" (reads item.schedule.targets)
async function performPost(itemId, triggeredBy = "manual", explicitTargets = []) {
  try {
    const item = await getItem(itemId)
    if (!item) return
    if (item.status === "sold") return

    let client = global.marketplaceClient
    let waited = 0
    while (!client && waited < 120000) {
      await new Promise(r => setTimeout(r, 5000))
      waited += 5000
      client = global.marketplaceClient
    }

    const targets = triggeredBy === "scheduled" ? (item.schedule?.targets || []) : explicitTargets
    const postText = item.caption || item.description || ""

    if (!client) {
      await pushHistory(itemId, { postedAt: null, targets, results: null, triggeredBy, missed: true, reason: "no WhatsApp connection available" })
      if (triggeredBy === "scheduled") await updateItem(itemId, { schedule: null })
      timers.delete(itemId)
      return
    }

    const results = []
    for (const jid of targets) {
      try {
        await sendItemToTarget(client, jid, item, postText)
        results.push({ jid, ok: true })
      } catch (e) {
        console.log("marketplace post error", jid, e)
        results.push({ jid, ok: false, error: e.message })
      }
    }

    await pushHistory(itemId, { postedAt: Date.now(), targets, results, triggeredBy })
    if (triggeredBy === "scheduled") await updateItem(itemId, { schedule: null })
    timers.delete(itemId)

    try {
      const okCount = results.filter(r => r.ok).length
      await client.sendMessage(getOwnerJid(), {
        text: `📦 ${itemId} posted: ${okCount}/${results.length} group(s) succeeded`,
      })
    } catch (_) {}
  } catch (e) {
    console.log("performPost error", e)
  }
}

// ── reconcile scheduled items on startup ──
;(async () => {
  try {
    const items = await listItems({ "schedule.scheduledFor": { $exists: true, $ne: null } })
    const now = Date.now()
    for (const item of items) {
      if (!item.schedule) continue
      if (item.schedule.scheduledFor <= now) {
        await pushHistory(item._id, { postedAt: null, targets: item.schedule.targets, results: null, triggeredBy: "scheduled", missed: true, reason: "bot was offline past the scheduled time" })
        await updateItem(item._id, { schedule: null })
      } else {
        scheduleItemPost(item._id, item.schedule.scheduledFor - now)
      }
    }
  } catch (e) {
    console.log("marketplace startup reconcile error (check MARKETPLACE_MONGO_URI is set)", e)
  }
})()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  .item COMMAND
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
kord({
  cmd: "item",
  desc: "manage marketplace items (add, edit, schedule, repost, sold)",
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
${c} list [active|sold]   - list items
${c} view <id>            - view full item detail + recent history
${c} <id> price <value>
${c} <id> caption <text>
${c} <id> contact <text>
${c} <id> link <url>
${c} <id> post <targets> <now|at HH:mm|10m|2h>
${c} <id> cancelpost      - cancel a pending scheduled post
${c} <id> sold            - mark sold, stops further posting
${c} <id> unsold          - mark active again
${c} <id> history          - full post history
${c} <id> delete          - delete an item permanently

targets = comma-separated group category names and/or
raw group JIDs. Set categories with ${prefix}groupcat

Items can be posted repeatedly (daily, twice a day,
whatever) until you mark them sold — every post is
logged to that item's history.\`\`\``
      )
    }

    // ── draft lifecycle (in-memory, not persisted) ──
    if (first === "new") {
      if (drafts.has(m.sender)) return await m.send("_✘ You already have an active draft — finish it with `item done` or discard with `item cancel` first._")
      const description = parts.slice(1).join(" ")
      drafts.set(m.sender, { description, media: [], startedAt: Date.now() })
      return await m.send(`\`\`\`✓ Draft started${description ? `\nDescription: ${description}` : ""}\nReply to each image/video with "${c} grab" to attach it, then "${c} done" to save.\n\nSend photos one at a time (not as a multi-select group) for reliable attaching.\`\`\``)
    }

    if (first === "grab") {
      const draft = drafts.get(m.sender)
      if (!draft) return await m.send(`_✘ No active draft — start one with ${c} new <description>_`)

      const src = m.quoted?.media ? m.quoted : (m.media ? m : null)
      if (!src) return await m.send("_✘ Reply to an image or video message with this command. If you sent several photos together as a WhatsApp album, that may not be readable individually — try sending them one at a time instead._")

      const type = src.video || src.mtype === "videoMessage" ? "video" : "image"

      let path
      try {
        path = await m.client.dlandsave(src)
      } catch (e) {
        console.log("marketplace dlandsave error", e)
        return await m.send(`_✘ Download failed: ${e.message || e}_`)
      }

      let url
      try {
        url = await m.upload(path)
      } catch (e1) {
        console.log("marketplace upload error (attempt 1)", e1)
        try {
          await new Promise(r => setTimeout(r, 1500))
          url = await m.upload(path)
        } catch (e2) {
          console.log("marketplace upload error (attempt 2)", e2)
          if (path && fs.existsSync(path)) fs.unlinkSync(path)
          return await m.send(`_✘ Upload failed: ${e2.message || e2}_`)
        }
      } finally {
        if (path && fs.existsSync(path)) fs.unlinkSync(path)
      }

      draft.media.push({ type, url })
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

      let id
      try {
        id = await nextItemId()
      } catch (e) {
        console.log("marketplace nextItemId error", e)
        return await m.send(`_✘ Database error: ${e.message} — check MARKETPLACE_MONGO_URI is set correctly_`)
      }

      const item = {
        id,
        addedBy: m.sender,
        createdAt: Date.now(),
        media: draft.media,
        description: draft.description || "",
        price: null,
        caption: null,
        contact: null,
        link: null,
        status: "active",
        schedule: null,
        postCount: 0,
        lastPostedAt: null,
        postHistory: [],
      }

      try {
        await insertItem(item)
      } catch (e) {
        console.log("marketplace insertItem error", e)
        return await m.send(`_✘ Failed to save item: ${e.message}_`)
      }

      drafts.delete(m.sender)
      return await m.send(`\`\`\`✓ Saved as ${id}\nMedia: ${draft.media.length}\nStatus: active\n\nEdit with ${c} ${id} price/caption/contact/link\nPost with ${c} ${id} post <targets> <when>\`\`\``)
    }

    // ── listing ──
    if (first === "list") {
      const filterArg = parts[1]?.toLowerCase()
      let filter = {}
      if (filterArg === "active" || filterArg === "sold") filter = { status: filterArg }

      let items
      try {
        items = await listItems(filter)
      } catch (e) {
        console.log("marketplace listItems error", e)
        return await m.send(`_✘ Database error: ${e.message}_`)
      }

      if (!items.length) return await m.send(`_No items${filterArg ? ` (${filterArg})` : ""}_`)

      const lines = items.map(i => {
        const desc = (i.caption || i.description || "").slice(0, 35)
        const scheduled = i.schedule ? " ⏰" : ""
        return `${i._id} [${i.status}]${scheduled} ${i.media.length} media, posted ${i.postCount}x — ${desc}${desc.length === 35 ? "..." : ""}`
      })
      return await m.send(`\`\`\`┌─────────❖\n│▸ ITEMS${filterArg ? ` (${filterArg})` : ""}\n└─────────❖\n${lines.join("\n")}\`\`\``)
    }

    // ── view ──
    if (first === "view") {
      const id = normalizeItemToken(parts[1])
      const item = id && await getItem(id)
      if (!item) return await m.send("_✘ Item not found_")

      const recentHistory = (item.postHistory || []).slice(-3).reverse().map(h => {
        if (h.missed) return `  - missed (${h.reason})`
        const okCount = h.results?.filter(r => r.ok).length || 0
        return `  - ${new Date(h.postedAt).toLocaleString()}: ${okCount}/${h.targets.length} succeeded (${h.triggeredBy})`
      }).join("\n")

      let detail = `\`\`\`┌─────────❖
│▸ ${item._id}
└─────────❖
Status: ${item.status}
Media: ${item.media.length}
Posted: ${item.postCount} time(s)
Description: ${item.description || "-"}
Price: ${item.price || "-"}
Caption: ${item.caption || "-"}
Contact: ${item.contact || "-"}
Link: ${item.link || "-"}
${item.schedule ? `Scheduled for: ${new Date(item.schedule.scheduledFor).toLocaleString()}\n` : ""}${recentHistory ? `Recent history:\n${recentHistory}\n` : ""}\`\`\``
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
    const id = normalizeItemToken(first)
    const item = id && await getItem(id)
    if (!item) return await m.send(`_✘ Unknown option or item "${first}" — use ${c} for help_`)

    const sub = parts[1]?.toLowerCase()
    const value = parts.slice(2).join(" ")

    if (sub === "price") {
      if (!value) return await m.send(`_Usage: ${c} ${item._id} price 5000_`)
      await updateItem(item._id, { price: value })
      return await m.send(`\`\`\`✓ ${item._id} price set: ${value}\`\`\``)
    }

    if (sub === "caption") {
      if (!value) return await m.send(`_Usage: ${c} ${item._id} caption <text>_`)
      await updateItem(item._id, { caption: value })
      return await m.send(`\`\`\`✓ ${item._id} caption set\`\`\``)
    }

    if (sub === "contact") {
      if (!value) return await m.send(`_Usage: ${c} ${item._id} contact <text>_`)
      await updateItem(item._id, { contact: value })
      return await m.send(`\`\`\`✓ ${item._id} contact set\`\`\``)
    }

    if (sub === "link") {
      if (!value) return await m.send(`_Usage: ${c} ${item._id} link <url>_`)
      await updateItem(item._id, { link: value })
      return await m.send(`\`\`\`✓ ${item._id} link set\`\`\``)
    }

    if (sub === "sold") {
      if (timers.has(item._id)) { clearTimeout(timers.get(item._id)); timers.delete(item._id) }
      await updateItem(item._id, { status: "sold", schedule: null })
      return await m.send(`\`\`\`✓ ${item._id} marked sold\`\`\``)
    }

    if (sub === "unsold") {
      await updateItem(item._id, { status: "active" })
      return await m.send(`\`\`\`✓ ${item._id} marked active again\`\`\``)
    }

    if (sub === "history") {
      const history = item.postHistory || []
      if (!history.length) return await m.send(`_${item._id} has no post history yet_`)
      const lines = history.slice().reverse().map(h => {
        if (h.missed) return `${new Date(h.reason ? Date.now() : Date.now()).toLocaleDateString()} — missed (${h.reason})`
        const okCount = h.results?.filter(r => r.ok).length || 0
        return `${new Date(h.postedAt).toLocaleString()} — ${okCount}/${h.targets.length} groups (${h.triggeredBy})`
      })
      return await m.send(`\`\`\`┌─────────❖\n│▸ ${item._id} HISTORY\n└─────────❖\n${lines.join("\n")}\`\`\``)
    }

    if (sub === "delete") {
      if (timers.has(item._id)) { clearTimeout(timers.get(item._id)); timers.delete(item._id) }
      await deleteItemDoc(item._id)
      return await m.send(`\`\`\`✓ ${item._id} deleted\`\`\``)
    }

    if (sub === "cancelpost") {
      if (!item.schedule) return await m.send(`_${item._id} isn't scheduled_`)
      if (timers.has(item._id)) { clearTimeout(timers.get(item._id)); timers.delete(item._id) }
      await updateItem(item._id, { schedule: null })
      return await m.send(`\`\`\`✓ ${item._id} scheduled post cancelled\`\`\``)
    }

    if (sub === "post") {
      if (item.status === "sold") return await m.send(`_${item._id} is marked sold — run ${c} ${item._id} unsold first if you want to keep advertising it_`)
      if (!value) return await m.send(`_Usage: ${c} ${item._id} post <targets> <now|at 18:00|30m|2h>_`)

      const postText = item.caption || item.description || ""
      if (!postText) return await m.send(`_✘ ${item._id} has no caption or description — set one first, nothing to post_`)

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

      if (when.type === "now") {
        await m.send(`\`\`\`⏳ Posting ${item._id} to ${jids.length} group(s)...\`\`\``)
        await performPost(item._id, "manual", jids).catch(async (e) => {
          console.log("marketplace immediate post error", e)
          await m.send(`_✘ Posting failed: ${e.message}_`)
        })
        return
      }

      if (item.schedule) return await m.send(`_✘ ${item._id} already has a pending scheduled post — cancel it first with ${c} ${item._id} cancelpost_`)

      const delayMs = when.type === "delay" ? when.ms : when.date.getTime() - Date.now()
      const scheduledFor = Date.now() + delayMs
      await updateItem(item._id, { schedule: { targets: jids, scheduledFor } })
      scheduleItemPost(item._id, delayMs)
      return await m.send(`\`\`\`✓ ${item._id} scheduled for ${new Date(scheduledFor).toLocaleString()}\nTargets: ${jids.length} group(s)\`\`\``)
    }

    return await m.send(`_✘ Unknown subcommand "${sub}" for ${item._id} — use ${c} for help_`)
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

    if (sub === "list") {
      const cats = await listCategories()
      if (!cats.length) return await m.send("_No categories set up yet_")
      const lines = cats.map(c2 => `${c2.displayName || c2._id}: ${(c2.groups || []).length} group(s)`)
      return await m.send(`\`\`\`┌─────────❖\n│▸ CATEGORIES\n└─────────❖\n${lines.join("\n")}\`\`\``)
    }

    if (sub === "add") {
      const name = parts[1]
      const groupsStr = parts.slice(2).join(" ")
      if (!name || !groupsStr) return await m.send(`_Usage: ${c} add electronics 12036xxx@g.us,12036yyy@g.us_`)
      const groupJids = groupsStr.split(",").map(g => g.trim()).filter(g => g.endsWith("@g.us"))
      if (!groupJids.length) return await m.send("_✘ No valid group JIDs found (must end in @g.us)_")
      await addToCategory(name, groupJids)
      const cat = await getCategory(name)
      return await m.send(`\`\`\`✓ Category "${name}" now has ${(cat.groups || []).length} group(s)\`\`\``)
    }

    if (sub === "addhere") {
      if (!m.isGroup) return await m.send("_✘ Run this inside the group you want to add_")
      const name = parts[1]
      if (!name) return await m.send(`_Usage: ${c} addhere electronics_`)
      await addToCategory(name, [m.chat])
      const cat = await getCategory(name)
      return await m.send(`\`\`\`✓ This group added to "${name}" (${(cat.groups || []).length} group(s) total)\`\`\``)
    }

    if (sub === "removegroup") {
      const name = parts[1]
      const jid = parts[2]
      if (!name || !jid) return await m.send(`_Usage: ${c} removegroup electronics 12036xxx@g.us_`)
      const cat = await getCategory(name)
      if (!cat) return await m.send(`_✘ Category "${name}" not found_`)
      await removeFromCategory(name, jid)
      const updated = await getCategory(name)
      return await m.send(`\`\`\`✓ Removed from "${name}" (${(updated.groups || []).length} group(s) left)\`\`\``)
    }

    if (sub === "remove") {
      const name = parts[1]
      if (!name) return await m.send(`_Usage: ${c} remove electronics_`)
      const cat = await getCategory(name)
      if (!cat) return await m.send(`_✘ Category "${name}" not found_`)
      await deleteCategory(name)
      return await m.send(`\`\`\`✓ Category "${name}" deleted\`\`\``)
    }

    return await m.send(`_✘ Unknown option "${sub}" — use ${c} for help_`)
  } catch (e) {
    console.log("groupcat cmd error", e)
    return await m.sendErr(e)
  }
})
