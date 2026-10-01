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
 * Marketplace system for Kord-Ai (fixed version)
 * Paste at the bottom of an existing cmds file
 */


const MEDIA_DIR = path.join(__dirname, "..", "media", "marketplace")
const DATA_KEY = "marketplace_listings"
const GROUPS_KEY = "marketplace_groups"
const MSGMAP_KEY = "marketplace_msgmap" // sent message id -> item id (for mpdelete by reply)
const MSGMAP_MAX = 3000
const INACTIVE_DAYS = 3
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // hourly

// ── Anti-ban settings for mppost (tweak to taste) ────────
const MAX_ITEMS_PER_RUN = 10          // max items posted per "mppost go"
const MAX_MEDIA_PER_POST = 10         // max media per album (WhatsApp album limit is 10)
const MEDIA_DELAY = [2500, 4500]      // ms between media in the same post
const GROUP_DELAY = [8000, 15000]     // ms between groups
const ITEM_DELAY = [15000, 30000]     // ms between items
const MAX_CONSECUTIVE_FAILS = 3       // abort the run after this many failures in a row
const REQUEST_REPEAT_COUNT = 3        // plain-text requests are sent this many times in a row per group
const REQUEST_REPEAT_DELAY = [1500, 3000] // ms between repeats

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"]
const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4"
}

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
}

// ── Optional MongoDB persistence ─────────────────────────
// Product photos/videos stay on local disk exactly as before (nothing below
// touches that). Only the lightweight JSON records — listings, groups, and
// the reply->product message map — move here when MONGODB_URI is set, so a
// bot restart or redeploy doesn't wipe them. Without MONGODB_URI, or if the
// connection fails, everything falls back to the bot's normal local storage
// automatically, so nothing breaks for people who don't set it up.
let mongoose = null
try { mongoose = require("mongoose") } catch {}

const MP_MONGO_RETRY_MS = 5 * 60 * 1000 // don't hammer a broken URI more than once per 5 min
let mpMongo = { model: null, connecting: null, failed: false, failedAt: 0, uri: null }

async function getMpMongoModel() {
  if (!mongoose) return null
  const uri = config().MONGODB_URI
  if (!uri) return null

  // Reconnect if the configured URI changed since we last connected (e.g. via setvar)
  if (mpMongo.uri && mpMongo.uri !== uri) {
    mpMongo = { model: null, connecting: null, failed: false, failedAt: 0, uri: null }
  }

  if (mpMongo.model) return mpMongo.model
  if (mpMongo.failed && Date.now() - mpMongo.failedAt < MP_MONGO_RETRY_MS) return null
  mpMongo.failed = false

  if (!mpMongo.connecting) {
    mpMongo.uri = uri
    mpMongo.connecting = (async () => {
      const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 })
      await conn.asPromise()
      const schema = new mongoose.Schema({
        key: { type: String, required: true, unique: true, index: true },
        value: mongoose.Schema.Types.Mixed
      }, { collection: "marketplace_kv", timestamps: true })
      mpMongo.model = conn.model("MarketplaceKV", schema)
      console.log("marketplace: connected to MongoDB for persistent storage")
      return mpMongo.model
    })().catch((e) => {
      console.log("marketplace: MongoDB connection failed, using local storage instead:", e.message)
      mpMongo.failed = true
      mpMongo.failedAt = Date.now()
      mpMongo.connecting = null
      return null
    })
  }
  return mpMongo.connecting
}

// Drop-in replacements for the bot's built-in getData/storeData, used only by marketplace
// data. Same contract as the originals (value is a JSON string) so nothing else about the
// listings/groups/msgmap code below needs to change.
async function mpGetData(key) {
  const Model = await getMpMongoModel()
  if (Model) {
    try {
      const doc = await Model.findOne({ key }).lean()
      return doc ? doc.value : null
    } catch (e) {
      console.log("marketplace: MongoDB read failed, falling back to local storage:", e.message)
    }
  }
  return await getData(key)
}

async function mpStoreData(key, value) {
  const Model = await getMpMongoModel()
  if (Model) {
    try {
      await Model.updateOne({ key }, { $set: { value } }, { upsert: true })
      return
    } catch (e) {
      console.log("marketplace: MongoDB write failed, falling back to local storage:", e.message)
    }
  }
  return await storeData(key, value)
}

const NO_MEDIA_MSG =
  `_No photo/video found to save._\n` +
  `_If you replied to an album: the bot only sees albums that arrived after it started and after a marketplace command was run once (try *${prefix}mp*, then resend the album). Or reply to a single photo._`

// ── Helpers ──────────────────────────────────────────────

// Simple promise-queue lock: runs tasks one at a time, in order
function createLock() {
  let chain = Promise.resolve()
  return (fn) => {
    const run = chain.then(() => fn())
    chain = run.catch(() => {})
    return run
  }
}

const listingsLock = createLock()
const groupsLock = createLock()
const msgMapLock = createLock()

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function randomBetween([min, max]) {
  return Math.floor(min + Math.random() * (max - min))
}

function generateId(type) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let id = ""
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return (type === "request" ? "R" : "S") + id
}

async function loadListings() {
  let data = await mpGetData(DATA_KEY)
  if (!data) return {}
  if (typeof data === "string") {
    try { return JSON.parse(data) } catch { return {} }
  }
  return data
}

async function saveListings(listings) {
  await mpStoreData(DATA_KEY, JSON.stringify(listings, null, 2))
}

async function loadGroups() {
  let data = await mpGetData(GROUPS_KEY)
  if (!data) return []
  if (typeof data === "string") {
    try { return JSON.parse(data) } catch { return [] }
  }
  return Array.isArray(data) ? data : []
}

async function saveGroups(groups) {
  await mpStoreData(GROUPS_KEY, JSON.stringify(groups, null, 2))
}

/*
 * Safe read-modify-write. Every change to listings goes through here so
 * two commands can never overwrite each other.
 * The mutator receives the listings object, may change it, and returns a
 * result. Return { skipSave: true, ... } to skip writing back.
 * Do NOT call mutateListings from inside a mutator (deadlock).
 */
function mutateListings(mutator) {
  return listingsLock(async () => {
    const listings = await loadListings()
    const result = await mutator(listings)
    if (!(result && result.skipSave)) await saveListings(listings)
    return result
  })
}

function mutateGroups(mutator) {
  return groupsLock(async () => {
    const groups = await loadGroups()
    const result = await mutator(groups)
    if (!(result && result.skipSave)) await saveGroups(groups)
    return result
  })
}

async function loadMsgMap() {
  let data = await mpGetData(MSGMAP_KEY)
  if (!data) return {}
  if (typeof data === "string") {
    try { return JSON.parse(data) } catch { return {} }
  }
  return data
}

async function saveMsgMap(map) {
  await mpStoreData(MSGMAP_KEY, JSON.stringify(map))
}

function mutateMsgMap(mutator) {
  return msgMapLock(async () => {
    const map = await loadMsgMap()
    await mutator(map)
    await saveMsgMap(map)
  })
}

// Remember which WhatsApp messages belong to which item, so replying to a post with mpdelete works
async function recordSent(itemId, ids) {
  ids = (ids || []).filter(Boolean)
  if (!ids.length) return
  try {
    await mutateMsgMap(async (map) => {
      for (const id of ids) map[id] = itemId
      const keys = Object.keys(map)
      if (keys.length > MSGMAP_MAX) {
        for (const k of keys.slice(0, keys.length - MSGMAP_MAX)) delete map[k]
      }
    })
  } catch (e) {
    console.log("marketplace msgmap error:", e.message)
  }
}

// Reuses the bot's own Baileys loader (same one .gcstatus etc. use — it shares the
// cached import across the whole bot) when available. Falls back to loading baileys
// directly if core doesn't export it, so this still works on older setups.
let baileysLibPromise = null
function getBaileys() {
  if (typeof Baileys === "function") return Baileys()
  if (!baileysLibPromise) {
    baileysLibPromise = (async () => {
      let lastErr = null
      for (const name of ["baileys", "@whiskeysockets/baileys", "@adiwajshing/baileys"]) {
        try {
          const mod = await import(name)
          if (mod.generateWAMessageFromContent) return mod
          if (mod.default && mod.default.generateWAMessageFromContent) return mod.default
        } catch (e) {
          lastErr = e
        }
      }
      console.log("marketplace: could not load baileys:", lastErr ? lastErr.message : "no exports found")
      return null
    })()
  }
  return baileysLibPromise
}

// ── Album support ────────────────────────────────────────
// When you reply to a WhatsApp album, the quoted message is only an empty "album" parent.
// The real photos/videos arrive as separate messages linked to that parent, so we watch
// incoming messages, remember those children, and download them when you reply to the album.
const albumCache = new Map() // parentMessageId -> [child messages]
const ALBUM_CACHE_MAX = 300
const silentLogger = {
  level: "silent",
  info() {}, debug() {}, warn() {}, error() {}, trace() {}, fatal() {},
  child() { return silentLogger }
}

function unwrapContent(content) {
  if (!content) return {}
  return content.ephemeralMessage?.message ||
    content.viewOnceMessage?.message ||
    content.viewOnceMessageV2?.message ||
    content.documentWithCaptionMessage?.message ||
    content
}

function trackAlbumChild(msg) {
  try {
    const content = msg?.message
    if (!content) return
    const inner = unwrapContent(content)
    if (!(inner.imageMessage || inner.videoMessage)) return

    const assoc = content.messageContextInfo?.messageAssociation ||
      inner.messageContextInfo?.messageAssociation
    const parentId = assoc?.parentMessageKey?.id
    if (!parentId) return

    const list = albumCache.get(parentId) || []
    if (list.some(x => x.key?.id === msg.key?.id)) return
    list.push(msg)
    albumCache.set(parentId, list)

    if (albumCache.size > ALBUM_CACHE_MAX) {
      albumCache.delete(albumCache.keys().next().value)
    }
  } catch (e) {
    console.log("marketplace album track error:", e.message)
  }
}

// Attach once per socket. Called from marketplace commands.
function ensureAlbumListener(client) {
  try {
    if (!client || !client.ev || client.__mpAlbumListener) return
    client.__mpAlbumListener = true
    client.ev.on("messages.upsert", ({ messages }) => {
      for (const msg of messages || []) trackAlbumChild(msg)
    })
  } catch (e) {
    console.log("marketplace album listener error:", e.message)
  }
}

function quotedIds(m) {
  return [
    m.quoted?.id,
    m.quoted?.key?.id,
    m.quoted?.stanzaId,
    m.msg?.contextInfo?.stanzaId,
    m.message?.extendedTextMessage?.contextInfo?.stanzaId
  ].filter(Boolean)
}

async function downloadAlbumChildren(client, parentIds) {
  const lib = await getBaileys()
  if (!lib || !lib.downloadMediaMessage) return []

  for (const pid of parentIds) {
    const children = albumCache.get(pid)
    if (!children || !children.length) continue

    const files = []
    for (const msg of children) {
      try {
        const buffer = await lib.downloadMediaMessage(
          msg,
          "buffer",
          {},
          { logger: silentLogger, reuploadRequest: client.updateMediaMessage }
        )
        const inner = unwrapContent(msg.message)
        const kind = inner.videoMessage ? "video" : "image"
        const mime = (inner.videoMessage || inner.imageMessage)?.mimetype
        if (buffer && buffer.length > 100) {
          const ext = extFromMime(mime, kind)
          files.push({ buffer, ext, kind, mimetype: MIME_BY_EXT[ext] })
        }
      } catch (e) {
        console.log("marketplace album download error:", e.message)
      }
    }
    return files
  }
  return []
}

function mediaContent(file, caption) {
  const content = file.kind === "video"
    ? { video: file.buffer, mimetype: file.mimetype }
    : { image: file.buffer, mimetype: file.mimetype }
  if (caption) content.caption = caption
  return content
}

// Sends all media as ONE album message with a single caption
async function sendAlbumManual(client, jid, files, caption) {
  const lib = await getBaileys()
  if (!lib || !lib.generateWAMessageFromContent || !lib.generateWAMessage) {
    throw new Error("baileys helpers not found")
  }
  const { generateWAMessageFromContent, generateWAMessage } = lib

  const imageCount = files.filter(f => f.kind === "image").length
  const videoCount = files.length - imageCount

  const parent = generateWAMessageFromContent(jid, {
    messageContextInfo: {},
    albumMessage: {
      expectedImageCount: imageCount,
      expectedVideoCount: videoCount
    }
  }, { userJid: client.user.id })

  await client.relayMessage(jid, parent.message, { messageId: parent.key.id })
  const ids = [parent.key.id]

  try {
    for (let i = 0; i < files.length; i++) {
      const msg = await generateWAMessage(
        jid,
        mediaContent(files[i], i === 0 ? caption : ""),
        { upload: client.waUploadToServer }
      )
      msg.message.messageContextInfo = {
        messageAssociation: { associationType: 1, parentMessageKey: parent.key }
      }
      await client.relayMessage(jid, msg.message, { messageId: msg.key.id })
      ids.push(msg.key.id)
      if (i < files.length - 1) await sleep(500)
    }
  } catch (e) {
    e.partial = true // something already went out, don't resend
    throw e
  }
  return ids
}

// One item -> one post in one group. Returns the sent message ids.
async function sendPost(client, jid, files, caption) {
  if (!files.length) {
    const r = await client.sendMessage(jid, { text: caption })
    return [r?.key?.id]
  }

  if (files.length === 1) {
    const r = await client.sendMessage(jid, mediaContent(files[0], caption))
    return [r?.key?.id]
  }

  try {
    return await sendAlbumManual(client, jid, files, caption)
  } catch (e) {
    if (e.partial) throw e
    console.log("marketplace album failed, falling back to separate messages:", e.message)
  }

  // Fallback: separate messages (caption on the first one only)
  const ids = []
  for (let i = 0; i < files.length; i++) {
    const r = await client.sendMessage(jid, mediaContent(files[i], i === 0 ? caption : ""))
    ids.push(r?.key?.id)
    if (i < files.length - 1) await sleep(randomBetween(MEDIA_DELAY))
  }
  return ids
}

function cleanNumber(num) {
  if (!num) return ""
  return String(num).replace(/\D/g, "")
}

// In a group, react instead of posting the full result publicly, and DM the owner the details.
// In a DM (owner chatting with the bot directly), just reply normally.
async function replyDiscreet(m, fullText, emoji = "✅") {
  const isGroup = m.chat.endsWith("@g.us")
  if (!isGroup) {
    return await m.send(fullText)
  }
  const ownerJid = m.ownerJid || m.sender
  try {
    await m.client.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
  } catch {}
  try {
    await m.client.sendMessage(ownerJid, { text: fullText })
  } catch {}
}

function cleanId(text) {
  return String(text || "").trim().replace(/^#/, "").toUpperCase()
}

function hasMediaInput(m) {
  return !!(m.quoted || m.image || m.video)
}

function extFromMime(mime, kind) {
  if (kind === "video") return ".mp4"
  const mt = String(mime || "").toLowerCase()
  if (mt.includes("png")) return ".png"
  if (mt.includes("webp")) return ".webp"
  return ".jpg"
}

function getFileKind(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === ".mp4") return "video"
  if (IMAGE_EXTS.includes(ext)) return "image"
  return null
}

// Only photos and videos are supported. Audio, stickers and documents are ignored.
async function downloadMedia(m) {
  const files = []
  try {
    ensureAlbumListener(m.client)
    if (m.quoted) {
      const q = m.quoted
      if (!(q.image || q.video)) {
        // Possibly a reply to an album
        files.push(...await downloadAlbumChildren(m.client, quotedIds(m)))
      }
      if (q.image || q.video) {
        const kind = q.video ? "video" : "image"
        const buffer = await q.download()
        if (buffer && buffer.length > 100) {
          const ext = extFromMime(q.mimetype, kind)
          files.push({ buffer, ext, kind, mimetype: MIME_BY_EXT[ext] })
        }
      }
    }
    if (m.image || m.video) {
      const kind = m.video ? "video" : "image"
      const buffer = await m.download()
      if (buffer && buffer.length > 100) {
        const ext = extFromMime(m.mimetype, kind)
        files.push({ buffer, ext, kind, mimetype: MIME_BY_EXT[ext] })
      }
    }
  } catch (e) {
    console.log("marketplace media download error:", e.message)
  }
  return files
}

// ── Optional Cloudinary persistence for the actual photos/videos ────
// Render's free tier wipes local disk on every restart/redeploy, so on its own
// MEDIA_DIR does not survive. When CLOUDINARY_CLOUD_NAME and
// CLOUDINARY_UPLOAD_PRESET are set (see setup notes), every file saved below is
// also uploaded to Cloudinary's free tier, and the returned URL is stored on the
// listing itself (which already persists via Mongo/local storage above). After a
// restart, resolveItemMedia() downloads from that URL to rebuild the local copy.
// Without those two env vars, this section does nothing and disk works as before.
let axiosLib = null
try { axiosLib = require("axios") } catch {}
let FormDataLib = null
try { FormDataLib = require("form-data") } catch {}

function cloudUploadEnabled() {
  return !!(axiosLib && FormDataLib && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET)
}

async function uploadToCloudinary(buffer, kind, ext) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET
  const resourceType = kind === "video" ? "video" : "image"
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`

  const form = new FormDataLib()
  form.append("file", buffer, { filename: `mp_${Date.now()}${ext}` })
  form.append("upload_preset", preset)
  form.append("folder", "marketplace")

  const res = await axiosLib.post(endpoint, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30000
  })
  return { url: res.data.secure_url, publicId: res.data.public_id }
}

async function saveMediaFiles(id, mediaFiles) {
  const dir = path.join(MEDIA_DIR, id)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const saved = []
  const existing = fs.readdirSync(dir).filter(f => !f.startsWith(".")).length
  const cloudOn = cloudUploadEnabled()

  for (let i = 0; i < mediaFiles.length; i++) {
    const f = mediaFiles[i]
    if (!f.buffer || f.buffer.length < 100) continue

    const filename = `${Date.now()}_${existing + i + 1}${f.ext}`
    const filepath = path.join(dir, filename)
    fs.writeFileSync(filepath, f.buffer)

    const entry = {
      path: filepath,
      filename,
      mimetype: f.mimetype,
      ext: f.ext,
      kind: f.kind,
      url: null,
      publicId: null
    }

    if (cloudOn) {
      try {
        const up = await uploadToCloudinary(f.buffer, f.kind, f.ext)
        entry.url = up.url
        entry.publicId = up.publicId
      } catch (e) {
        console.log("marketplace cloud upload failed (kept locally only):", e.response?.data?.error?.message || e.message)
      }
    }

    saved.push(entry)
  }
  return saved
}

function getMediaList(id) {
  const dir = path.join(MEDIA_DIR, id)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => !f.startsWith("."))
    .sort()
    .map(f => ({ path: path.join(dir, f), filename: f }))
}

// Builds the list of {buffer, kind, mimetype} for an item, preferring the local
// disk cache and falling back to Cloudinary (via item.media) if the disk copy is
// gone — which is what makes media survive a Render restart.
async function resolveItemMedia(item) {
  const result = []
  const id = item.id

  if (Array.isArray(item.media) && item.media.length) {
    for (const entry of item.media) {
      if (result.length >= MAX_MEDIA_PER_POST) break
      try {
        let buffer = null
        if (entry.filename) {
          const localPath = path.join(MEDIA_DIR, id, entry.filename)
          if (fs.existsSync(localPath)) {
            try { buffer = fs.readFileSync(localPath) } catch {}
          }
        }
        if ((!buffer || buffer.length < 100) && entry.url && axiosLib) {
          const resp = await axiosLib.get(entry.url, { responseType: "arraybuffer", timeout: 20000 })
          buffer = Buffer.from(resp.data)
          try {
            const dir = path.join(MEDIA_DIR, id)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            if (entry.filename) fs.writeFileSync(path.join(dir, entry.filename), buffer)
          } catch {}
        }
        if (buffer && buffer.length > 100) {
          result.push({ buffer, kind: entry.kind, mimetype: entry.mimetype })
        }
      } catch (e) {
        console.log("marketplace media resolve error:", e.message)
      }
    }
    return result
  }

  // Items saved before this update (or with cloud upload off): disk only, as before
  for (const f of getMediaList(id)) {
    if (result.length >= MAX_MEDIA_PER_POST) break
    const kind = getFileKind(f.filename)
    if (!kind) continue
    try {
      const buffer = fs.readFileSync(f.path)
      if (buffer && buffer.length > 100) {
        result.push({ buffer, kind, mimetype: MIME_BY_EXT[path.extname(f.filename).toLowerCase()] })
      }
    } catch (e) {
      console.log("marketplace media read error:", e.message)
    }
  }
  return result
}

// Records newly saved files on the listing itself, so resolveItemMedia can find them
// again after a restart. Returns how many of them have no cloud URL (i.e. will be
// lost if the disk gets wiped), so callers can warn the user.
function attachMediaEntries(item, saved) {
  if (!Array.isArray(item.media)) item.media = []
  let missingCloud = 0
  for (const s of saved) {
    item.media.push({
      filename: s.filename,
      kind: s.kind,
      mimetype: s.mimetype,
      url: s.url || null,
      publicId: s.publicId || null
    })
    if (cloudUploadEnabled() && !s.url) missingCloud++
  }
  return missingCloud
}

function getLatestProduct(listings) {
  const active = Object.values(listings)
    .filter(i => i.status === "active" && i.type === "sell")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return active[0] || null
}

// Posts use the caption only. No product ID is added.
function buildPostCaption(item) {
  return item.caption || ""
}

async function cleanupInactive() {
  const res = await mutateListings(async (listings) => {
    const now = Date.now()
    const limit = INACTIVE_DAYS * 24 * 60 * 60 * 1000
    const deleted = []

    for (const id of Object.keys(listings)) {
      const item = listings[id]
      if (item.status === "inactive" && item.inactiveAt) {
        if (now - item.inactiveAt > limit) {
          const dir = path.join(MEDIA_DIR, id)
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true })
          }
          delete listings[id]
          deleted.push(id)
        }
      }
    }
    return { skipSave: !deleted.length, deleted }
  })

  if (res.deleted.length) {
    await mutateMsgMap(async (map) => {
      for (const k of Object.keys(map)) {
        if (res.deleted.includes(map[k])) delete map[k]
      }
    })
  }
}

// Runs on a timer instead of before every command.
// The global handle stops duplicate timers if this file is reloaded.
function startCleanupScheduler() {
  if (global.__mpCleanupTimer) clearInterval(global.__mpCleanupTimer)
  if (global.__mpCleanupBoot) clearTimeout(global.__mpCleanupBoot)

  const run = () => cleanupInactive().catch(e => console.log("marketplace cleanup error:", e.message))

  global.__mpCleanupBoot = setTimeout(run, 30 * 1000) // first run after startup settles
  global.__mpCleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS)
  if (global.__mpCleanupBoot.unref) global.__mpCleanupBoot.unref()
  if (global.__mpCleanupTimer.unref) global.__mpCleanupTimer.unref()
}

startCleanupScheduler()

// ── Commands ─────────────────────────────────────────────

// MPHELP
kord({
  cmd: "mphelp|mp",
  desc: "List all marketplace commands",
  fromMe: true,
  type: "marketplace",
}, async (m) => {
  ensureAlbumListener(m.client)
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
• *${prefix}mpgroup add JID1 JID2 ...* — add by JID(s), no need to join the group
• *${prefix}mpgroup remove JID1 JID2 ...* — remove by JID(s)
• *${prefix}mpgroup list*
• *${prefix}mpgroup clear*

*Post*
• *${prefix}mppost* — preview
• *${prefix}mppost go* — post all
• *${prefix}mppost go ID* — post one item
• *${prefix}mppost go to JID/link* — post to one group only
• *${prefix}mppost cancel* / *${prefix}mpcancel* — stop a run in progress

*Broadcast*
• *${prefix}mpbroadcast text* — one message, no media
• *${prefix}mpbroadcast ID* — broadcast an existing listing
• _reply to media with *${prefix}mpbroadcast caption*_
• sends as a normal message AND to the group's status
• add *" to JID/link"* to target one group only

*Stickers tip*
.setcmd mpsell
.setcmd mpadd
.setcmd mpdelete
.setcmd mpgadd
.setcmd mpgremove`
  return await m.send(msg)
})

// MPSELL
kord({
  cmd: "mpsell",
  desc: "Create product or add media to specific ID",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const arg = (text || "").trim()
    const argId = cleanId(arg)
    const existing = arg ? (await loadListings())[argId] : null

    // Add media to an existing product
    if (existing) {
      const id = argId
      if (existing.type !== "sell") {
        return await m.send(`_#${id} is a request. Use mprequest ${id}_`)
      }
      if (!hasMediaInput(m)) {
        return await m.send(`_Reply to a photo/video with *${prefix}mpsell ${id}*_`)
      }
      const mediaFiles = await downloadMedia(m)
      if (!mediaFiles.length) return await m.send(NO_MEDIA_MSG)

      const res = await mutateListings(async (listings) => {
        const item = listings[id]
        if (!item) return { missing: true, skipSave: true }
        const saved = await saveMediaFiles(id, mediaFiles)
        const missingCloud = attachMediaEntries(item, saved)
        item.mediaCount = (item.mediaCount || 0) + saved.length
        item.updatedAt = Date.now()
        return { count: saved.length, total: item.mediaCount, missingCloud }
      })

      if (res.missing) return await m.send(`_No item found with ID *#${id}*_`)
      let addMsg = `✓ Added *${res.count}* media to *#${id}*\n_Total media: ${res.total}_`
      if (res.missingCloud) addMsg += `\n⚠ _${res.missingCloud} file(s) only saved locally — cloud upload failed, they may be lost on restart_`
      return await m.send(addMsg)
    }

    // Create a new product
    if (!hasMediaInput(m)) {
      return await m.send(
        `_Reply to a photo/video with *${prefix}mpsell*_\n` +
        `_Or *${prefix}mpsell ID* to add to existing_\n` +
        `_Or *${prefix}mpadd* to add to latest product_`
      )
    }

    const mediaFiles = await downloadMedia(m)
    if (!mediaFiles.length) return await m.send(NO_MEDIA_MSG)

    let ownerNumber = cleanNumber(arg)
    if (!ownerNumber && m.quoted?.participant) ownerNumber = cleanNumber(m.quoted.participant)
    if (!ownerNumber && m.quoted?.sender) ownerNumber = cleanNumber(m.quoted.sender)

    const res = await mutateListings(async (listings) => {
      let id = generateId("sell")
      while (listings[id]) id = generateId("sell")

      const saved = await saveMediaFiles(id, mediaFiles)
      const item = {
        id,
        type: "sell",
        caption: "",
        ownerNumber: ownerNumber || "",
        mediaCount: saved.length,
        media: [],
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        inactiveAt: null
      }
      const missingCloud = attachMediaEntries(item, saved)
      listings[id] = item
      return { id, count: saved.length, missingCloud }
    })

    let msg = `✓ Product added\n\n*ID:* ${res.id}\n_Media: ${res.count}_`
    if (ownerNumber) msg += `\n_Owner: ${ownerNumber}_`
    msg += `\n\n_Set caption:_ *${prefix}mpedit ${res.id} Your caption*`
    if (!ownerNumber) msg += `\n_Set owner:_ *${prefix}mpowner ${res.id} 234xxxxxxxxxx*`
    msg += `\n\n_Add more media with *${prefix}mpadd*_`
    if (res.missingCloud) msg += `\n⚠ _${res.missingCloud} file(s) only saved locally — cloud upload failed, they may be lost on restart_`
    await m.send(msg)
    return await m.send(res.id) // bare ID, easy to copy
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
    const latestNow = getLatestProduct(await loadListings())
    if (!latestNow) {
      return await m.send(`_No active product found._\n_Create one with *${prefix}mpsell*_`)
    }
    if (!hasMediaInput(m)) {
      return await m.send(`_Reply to a photo/video with *${prefix}mpadd*_\n_Latest product: *#${latestNow.id}*_`)
    }

    const mediaFiles = await downloadMedia(m)
    if (!mediaFiles.length) return await m.send(NO_MEDIA_MSG)

    const res = await mutateListings(async (listings) => {
      const latest = getLatestProduct(listings)
      if (!latest) return { none: true, skipSave: true }
      const saved = await saveMediaFiles(latest.id, mediaFiles)
      const missingCloud = attachMediaEntries(latest, saved)
      latest.mediaCount = (latest.mediaCount || 0) + saved.length
      latest.updatedAt = Date.now()
      return { id: latest.id, count: saved.length, total: latest.mediaCount, missingCloud }
    })

    if (res.none) {
      return await m.send(`_No active product found._\n_Create one with *${prefix}mpsell*_`)
    }
    let addMsg = `✓ Added *${res.count}* media to *#${res.id}*\n_Total media: ${res.total}_`
    if (res.missingCloud) addMsg += `\n⚠ _${res.missingCloud} file(s) only saved locally — cloud upload failed, they may be lost on restart_`
    return await m.send(addMsg)
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
    const arg = (text || "").trim()
    const argId = cleanId(arg)
    const existing = arg ? (await loadListings())[argId] : null

    // Add media to an existing request
    if (existing) {
      const id = argId
      if (existing.type !== "request") {
        return await m.send(`_#${id} is a sell product. Use mpsell ${id}_`)
      }
      if (!hasMediaInput(m)) {
        return await m.send(`_Reply to a photo/video with *${prefix}mprequest ${id}*_`)
      }
      const mediaFiles = await downloadMedia(m)
      if (!mediaFiles.length) return await m.send(NO_MEDIA_MSG)

      const res = await mutateListings(async (listings) => {
        const item = listings[id]
        if (!item) return { missing: true, skipSave: true }
        const saved = await saveMediaFiles(id, mediaFiles)
        const missingCloud = attachMediaEntries(item, saved)
        item.mediaCount = (item.mediaCount || 0) + saved.length
        item.updatedAt = Date.now()
        return { count: saved.length, total: item.mediaCount, missingCloud }
      })

      if (res.missing) return await m.send(`_No item found with ID *#${id}*_`)
      let addMsg = `✓ Added *${res.count}* media to request *#${id}*\n_Total: ${res.total}_`
      if (res.missingCloud) addMsg += `\n⚠ _${res.missingCloud} file(s) only saved locally — cloud upload failed, they may be lost on restart_`
      return await m.send(addMsg)
    }

    // Create a new request
    const hasMedia = hasMediaInput(m)
    const captionText = arg || (m.quoted?.text || "")

    if (!hasMedia && !captionText) {
      return await m.send(
        `_Usage:_\n*${prefix}mprequest Looking for PS5*\n` +
        `_Or reply to media with *${prefix}mprequest*_`
      )
    }

    const mediaFiles = hasMedia ? await downloadMedia(m) : []

    let ownerNumber = ""
    if (m.quoted?.participant) ownerNumber = cleanNumber(m.quoted.participant)
    else if (m.quoted?.sender) ownerNumber = cleanNumber(m.quoted.sender)

    const res = await mutateListings(async (listings) => {
      let id = generateId("request")
      while (listings[id]) id = generateId("request")

      const item = {
        id,
        type: "request",
        caption: captionText || "",
        ownerNumber: ownerNumber || "",
        mediaCount: 0,
        media: [],
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        inactiveAt: null
      }

      let missingCloud = 0
      if (mediaFiles.length) {
        const saved = await saveMediaFiles(id, mediaFiles)
        missingCloud = attachMediaEntries(item, saved)
        item.mediaCount = saved.length
      }

      listings[id] = item
      return { id, mediaCount: item.mediaCount, missingCloud }
    })

    let msg = `✓ Request added\n\n*ID:* ${res.id}`
    if (captionText) msg += `\n_${captionText}_`
    if (res.mediaCount) msg += `\n_Media: ${res.mediaCount}_`
    if (!captionText) msg += `\n\n_Set caption:_ *${prefix}mpedit ${res.id} Looking for ...*`
    if (res.missingCloud) msg += `\n⚠ _${res.missingCloud} file(s) only saved locally — cloud upload failed, they may be lost on restart_`
    await m.send(msg)
    return await m.send(res.id) // bare ID, easy to copy
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
    const id = cleanId(parts[0])
    const caption = parts.slice(1).join(" ").trim()

    if (!id || !caption) {
      return await m.send(`_Usage: *${prefix}mpedit SUSYY iPhone 13 for sale*_`)
    }

    const res = await mutateListings(async (listings) => {
      if (!listings[id]) return { missing: true, skipSave: true }
      listings[id].caption = caption
      listings[id].updatedAt = Date.now()
      return { ok: true }
    })

    if (res.missing) return await m.send(`_No item found with ID *#${id}*_`)
    return await m.send(`✓ Caption updated for *#${id}*\n\n${caption}`)
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
    const id = cleanId(parts[0])
    const number = cleanNumber(parts[1] || "")

    if (!id) {
      return await m.send(`_Usage:_\n*${prefix}mpowner SUSYY*\n*${prefix}mpowner SUSYY 234xxxxxxxxxx*`)
    }

    if (number) {
      const res = await mutateListings(async (listings) => {
        if (!listings[id]) return { missing: true, skipSave: true }
        listings[id].ownerNumber = number
        listings[id].updatedAt = Date.now()
        return { ok: true }
      })
      if (res.missing) return await m.send(`_No item found with ID *#${id}*_`)
      return await m.send(`✓ Owner set for *#${id}*\n\`${number}\``)
    }

    const listings = await loadListings()
    if (!listings[id]) return await m.send(`_No item found with ID *#${id}*_`)

    const owner = listings[id].ownerNumber
    if (!owner) {
      return await m.send(`_No owner saved for *#${id}*_\n_Set with: *${prefix}mpowner ${id} 234xxxxxxxxxx*_`)
    }
    return await m.send(`*Owner of #${id}:*\n\`${owner}\``)
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
    const id = cleanId(text)
    if (!id) return await m.send(`_Usage: *${prefix}mpremove SUSYY*_`)

    const res = await mutateListings(async (listings) => {
      if (!listings[id]) return { missing: true, skipSave: true }
      listings[id].status = "inactive"
      listings[id].inactiveAt = Date.now()
      listings[id].updatedAt = Date.now()
      return { ok: true }
    })

    if (res.missing) return await replyDiscreet(m, `_No item found with ID *#${id}*_`, "⚠️")
    return await replyDiscreet(m, `✓ *#${id}* marked inactive\n_Auto-deleted after ${INACTIVE_DAYS} days_`)
  } catch (e) {
    console.log("mpremove error", e)
    return await m.sendErr(e)
  }
})

// MPDELETE - by ID or reply to a posted message
kord({
  cmd: "mpdelete",
  desc: "Remove product by ID or by replying to a post",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    let id = cleanId(text)

    if (!id && m.quoted) {
      // Look up the replied-to message in the sent-message map
      const qids = [m.quoted.id, m.quoted.key?.id, m.quoted.stanzaId].filter(Boolean)
      if (qids.length) {
        const map = await loadMsgMap()
        for (const q of qids) {
          if (map[q]) { id = map[q]; break }
        }
      }

      // Older posts (sent before IDs were removed) still carry "#SXXXX" in the caption
      if (!id) {
        const quotedText = m.quoted.text || m.quoted.caption || ""
        const matches = [...quotedText.matchAll(/#([SR][A-HJ-NP-Z2-9]{4})\b/g)]
        if (matches.length) id = matches[matches.length - 1][1]
      }
    }

    if (!id) {
      return await m.send(
        `_Reply to a posted product with *${prefix}mpdelete*_\n` +
        `_Or use *${prefix}mpdelete SUSYY*_`
      )
    }

    const res = await mutateListings(async (listings) => {
      if (!listings[id]) return { missing: true, skipSave: true }
      listings[id].status = "inactive"
      listings[id].inactiveAt = Date.now()
      listings[id].updatedAt = Date.now()
      return { ok: true }
    })

    if (res.missing) return await replyDiscreet(m, `_No item found with ID *#${id}*_`, "⚠️")
    return await replyDiscreet(m, `✓ *#${id}* removed\n_Will be auto-deleted after ${INACTIVE_DAYS} days_`)
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
    ensureAlbumListener(m.client)
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
        msg += `*#${item.id}* [${typeLabel}]\n`
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
      msg += `*#${item.id}* [${typeLabel}] ${cap} · ${item.mediaCount || 0} media\n`
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
    const id = cleanId(text)
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

    const files = await resolveItemMedia(item)
    for (const file of files) {
      try {
        await m.send(file.buffer, { caption: `#${id}`, mimetype: file.mimetype }, file.kind)
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

  const res = await mutateGroups(async (groups) => {
    if (groups.includes(m.chat)) return { exists: true, skipSave: true }
    groups.push(m.chat)
    return { total: groups.length }
  })

  if (res.exists) {
    await silentReact("⚠️")
    await notifyOwner(`⚠ Group already in list\n\`${m.chat}\``)
    return
  }

  let gName = m.chat
  try {
    const meta = await m.client.groupMetadata(m.chat)
    gName = meta.subject || m.chat
  } catch {}

  await silentReact("✅")
  await notifyOwner(`✓ Group added\n*${gName}*\n\`${m.chat}\`\n\nTotal: ${res.total}`)
}

async function handleGroupRemove(m) {
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

  const res = await mutateGroups(async (groups) => {
    const idx = groups.indexOf(m.chat)
    if (idx === -1) return { missing: true, skipSave: true }
    groups.splice(idx, 1)
    return { total: groups.length }
  })

  if (res.missing) {
    await silentReact("⚠️")
    await notifyOwner(`⚠ Group not in list\n\`${m.chat}\``)
    return
  }

  await silentReact("✅")
  await notifyOwner(`✓ Group removed\n\`${m.chat}\`\n\nTotal: ${res.total}`)
}

// Pulls group JIDs out of free text — space, comma, or newline separated,
// so you can paste a whole list at once. Anything not ending in @g.us is dropped.
function extractJids(text) {
  return (text || "")
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => s.endsWith("@g.us"))
}

// Lets mppost/mpbroadcast target specific group(s) instead of every saved group, by
// appending " to <jid-or-link>[, <jid-or-link>...]" to the command. Resolves invite
// links (https://chat.whatsapp.com/XXXX) to a JID via groupGetInviteInfo — the bot
// does NOT need to already be a member just to resolve the link, but sending will
// still fail if it isn't actually in that group.
// Returns { text: <command text with the "to ..." clause removed>, groups: <JIDs> | null }.
// null groups means no valid target was found, so the caller should fall back to the
// saved groups list — this also means an ordinary caption that happens to contain the
// word "to" (e.g. "free delivery to Lagos") is left alone, since it won't resolve to
// any JID or invite link.
async function extractTargetClause(client, text) {
  const raw = text || ""
  const match = raw.match(/\bto\s+(.+)$/i)
  if (!match) return { text: raw, groups: null }

  const pieces = match[1].trim().split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
  const resolved = []

  for (const piece of pieces) {
    if (piece.endsWith("@g.us")) {
      resolved.push(piece)
      continue
    }
    const linkMatch = piece.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/i)
    if (linkMatch) {
      try {
        const info = await client.groupGetInviteInfo(linkMatch[1])
        const jid = info?.id || info?.jid
        if (jid) resolved.push(jid)
      } catch (e) {
        console.log("marketplace invite resolve error:", e.message)
      }
    }
  }

  if (!resolved.length) return { text: raw, groups: null }

  return { text: raw.slice(0, match.index).trim(), groups: [...new Set(resolved)] }
}

// Posts to a group's own Status tab — the same WhatsApp "group status" feature this
// bot's .gcstatus command uses. Only the first media file is used, since a status
// update only carries one.
async function sendGroupStatus(client, groupJid, { files, caption }) {
  const lib = await getBaileys()
  if (!lib || !lib.generateWAMessageFromContent || !lib.proto) {
    throw new Error("baileys helpers not found")
  }
  const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = lib

  let messagePayload
  const file = files && files[0]

  if (file) {
    if (!prepareWAMessageMedia) throw new Error("prepareWAMessageMedia not found")
    const mediaOptions = file.kind === "video"
      ? { video: file.buffer, caption: caption || "" }
      : { image: file.buffer, caption: caption || "" }
    const prepared = await prepareWAMessageMedia(mediaOptions, { upload: client.waUploadToServer })
    const mediaMessage = file.kind === "video"
      ? { videoMessage: prepared.videoMessage }
      : { imageMessage: prepared.imageMessage }
    messagePayload = { groupStatusMessageV2: { message: mediaMessage } }
  } else {
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")
    const bgColor = 0xff000000 + parseInt(randomHex, 16)
    messagePayload = {
      groupStatusMessageV2: {
        message: {
          extendedTextMessage: { text: caption || "", backgroundArgb: bgColor, font: 2 }
        }
      }
    }
  }

  const msg = generateWAMessageFromContent(
    groupJid,
    proto.Message.fromObject(messagePayload),
    { userJid: client.user.id }
  )
  await client.relayMessage(groupJid, msg.message, { messageId: msg.key.id })
}

// Add one or more groups by JID directly — no need to be inside the group.
// Usage: mpgroup add 1203xxxxxxxxx@g.us 1203yyyyyyyyy@g.us (or one per line)
async function handleGroupAddByJid(m, text) {
  const jids = [...new Set(extractJids(text))]
  if (!jids.length) {
    return await m.send(
      `_No valid group JIDs found._\n` +
      `_A group JID looks like *1203xxxxxxxxx@g.us*_\n` +
      `_Usage: *${prefix}mpgroup add JID1 JID2 ...* (one per line also works)_`
    )
  }

  const res = await mutateGroups(async (groups) => {
    const added = []
    const already = []
    for (const jid of jids) {
      if (groups.includes(jid)) { already.push(jid); continue }
      groups.push(jid)
      added.push(jid)
    }
    return { skipSave: !added.length, added, already, total: groups.length }
  })

  let msg = `✓ Added *${res.added.length}* group(s) by JID\n_Total groups: ${res.total}_`
  if (res.already.length) msg += `\n_Already saved: ${res.already.length}_`
  return await m.send(msg)
}

// Remove one or more groups by JID directly. Same input format as add.
async function handleGroupRemoveByJid(m, text) {
  const jids = [...new Set(extractJids(text))]
  if (!jids.length) {
    return await m.send(
      `_No valid group JIDs found._\n` +
      `_Usage: *${prefix}mpgroup remove JID1 JID2 ...* (one per line also works)_`
    )
  }

  const res = await mutateGroups(async (groups) => {
    let removedCount = 0
    for (const jid of jids) {
      const idx = groups.indexOf(jid)
      if (idx !== -1) { groups.splice(idx, 1); removedCount++ }
    }
    return { skipSave: !removedCount, removedCount, total: groups.length }
  })

  return await m.send(`✓ Removed *${res.removedCount}* group(s) by JID\n_Total groups: ${res.total}_`)
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
    const rawArg = (text || "").trim()
    const arg = rawArg.toLowerCase()

    if (arg === "add") return await handleGroupAdd(m)
    if (arg.startsWith("add ")) return await handleGroupAddByJid(m, rawArg.slice(4))

    if (arg === "remove") return await handleGroupRemove(m)
    if (arg.startsWith("remove ")) return await handleGroupRemoveByJid(m, rawArg.slice(7))

    if (arg === "list" || !arg) {
      const groups = await loadGroups()
      if (!groups.length) return await m.send("_No groups added yet_")
      let msg = `*Marketplace Groups (${groups.length})*\n\n`
      for (let i = 0; i < groups.length; i++) {
        let name = groups[i]
        try {
          const meta = await m.client.groupMetadata(groups[i])
          name = meta.subject || groups[i]
        } catch {}
        msg += `${i + 1}. ${name}\n\`${groups[i]}\`\n\n`
      }
      return await m.send(msg.trim())
    }

    if (arg === "clear") {
      await groupsLock(() => saveGroups([]))
      return await m.send("_All marketplace groups cleared_")
    }

    return await m.send(
      `*mpgroup* usage:\n` +
      `• *${prefix}mpgadd* / *${prefix}mpgroup add*\n` +
      `• *${prefix}mpgroup add JID1 JID2 ...* — add by JID, no need to be in the group\n` +
      `• *${prefix}mpgremove* / *${prefix}mpgroup remove*\n` +
      `• *${prefix}mpgroup remove JID1 JID2 ...* — remove by JID\n` +
      `• *${prefix}mpgroup list*\n` +
      `• *${prefix}mpgroup clear*`
    )
  } catch (e) {
    console.log("mpgroup error", e)
    return await m.sendErr(e)
  }
})

// MPPOST
let mpPosting = false
let mpCancelRequested = false

kord({
  cmd: "mppost",
  desc: "Post items to saved (or targeted) groups",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const { text: cleanedText, groups: targetGroups } = await extractTargetClause(m.client, text || "")
    const arg = cleanedText.trim().toLowerCase()

    if (arg === "cancel" || arg === "stop") {
      if (!mpPosting) return await m.send("_No posting run in progress_")
      mpCancelRequested = true
      return await m.send("_Cancelling after the current send finishes..._")
    }

    const listings = await loadListings()
    const groups = targetGroups || await loadGroups()
    const active = Object.values(listings).filter(i => i.status === "active")

    if (!active.length) return await m.send("_No active items to post_")
    if (!groups.length) {
      return await m.send(targetGroups
        ? "_Couldn't resolve a group from that JID/link_"
        : "_No groups saved. Use *mpgadd* first_")
    }

    if (!arg || arg === "preview") {
      let msg = `*Ready to post*\n\n`
      msg += `Active items: *${active.length}*\n`
      msg += `Groups: *${groups.length}*${targetGroups ? " (targeted)" : ""}\n\n`
      msg += `Items:\n`
      for (const item of active.slice(0, 15)) {
        const t = item.type === "sell" ? "S" : "R"
        const cap = item.caption ? item.caption.slice(0, 30) : "_no caption_"
        msg += `• #${item.id} [${t}] ${cap}\n`
      }
      if (active.length > 15) msg += `... +${active.length - 15} more\n`
      msg += `\n_Max ${MAX_ITEMS_PER_RUN} items per run_\n`
      msg += `_Reply *${prefix}mppost go* to post all_\n`
      msg += `_Or *${prefix}mppost go SUSYY* for one item_\n`
      msg += `_Add " to JID/link" to post to one group only, e.g. *${prefix}mppost go to 1203xxx@g.us*_\n`
      msg += `_*${prefix}mppost cancel* stops a run in progress_`
      return await m.send(msg)
    }

    let toPost = active
    if (arg.startsWith("go")) {
      const parts = arg.split(/\s+/).slice(1)
      if (parts.length) {
        toPost = parts
          .map(p => listings[cleanId(p)])
          .filter(i => i && i.status === "active")
        if (!toPost.length) return await m.send("_None of those IDs are active_")
      }
    } else {
      return await m.send(`_Use *${prefix}mppost* or *${prefix}mppost go*_`)
    }

    if (mpPosting) {
      return await m.send("_A posting run is already in progress. Wait for it to finish, or use *mppost cancel*._")
    }

    let leftover = 0
    if (toPost.length > MAX_ITEMS_PER_RUN) {
      leftover = toPost.length - MAX_ITEMS_PER_RUN
      toPost = toPost.slice(0, MAX_ITEMS_PER_RUN)
    }

    mpPosting = true
    mpCancelRequested = false
    try {
      await m.send(`_Posting *${toPost.length}* item(s) to *${groups.length}* group(s)... this is slow on purpose to avoid bans._`)

      let success = 0
      let fail = 0
      let skipped = 0
      let consecutiveFails = 0
      let aborted = false
      let cancelled = false

      outer: for (let ii = 0; ii < toPost.length; ii++) {
        if (mpCancelRequested) { cancelled = true; break }

        const item = toPost[ii]
        const caption = buildPostCaption(item)

        // Read each media file once per item (not once per group). Falls back to
        // Cloudinary automatically if the local disk copy is gone (e.g. after a restart).
        const files = await resolveItemMedia(item)

        if (!files.length && !caption) {
          console.log(`mppost skip #${item.id}: no media and no caption`)
          skipped++
          continue
        }

        const isPlainTextRequest = item.type === "request" && !files.length && !!caption

        for (let gi = 0; gi < groups.length; gi++) {
          if (mpCancelRequested) { cancelled = true; break outer }

          const groupJid = groups[gi]
          try {
            if (isPlainTextRequest) {
              // Plain-text requests are easy to scroll past, so send it a few times in a row
              const sentIds = []
              for (let r = 0; r < REQUEST_REPEAT_COUNT; r++) {
                const res = await m.client.sendMessage(groupJid, { text: caption })
                sentIds.push(res?.key?.id)
                if (r < REQUEST_REPEAT_COUNT - 1) await sleep(randomBetween(REQUEST_REPEAT_DELAY))
              }
              await recordSent(item.id, sentIds)
            } else {
              const sentIds = await sendPost(m.client, groupJid, files, caption)
              await recordSent(item.id, sentIds)
            }
            success++
            consecutiveFails = 0
          } catch (e) {
            console.log(`mppost fail ${groupJid}:`, e.message)
            fail++
            consecutiveFails++
            if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
              aborted = true
              break outer
            }
          }

          const isLastGroup = gi === groups.length - 1
          const isLastItem = ii === toPost.length - 1
          if (!(isLastGroup && isLastItem)) {
            await sleep(randomBetween(isLastGroup ? ITEM_DELAY : GROUP_DELAY))
          }
        }
      }

      let msg = `✓ Posting done\n_Success: ${success}_\n_Failed: ${fail}_`
      if (skipped) msg += `\n_Skipped (nothing to send): ${skipped}_`
      if (cancelled) msg += `\n\n⏹ _Cancelled by request._`
      if (aborted) msg += `\n\n⚠ _Stopped early after ${MAX_CONSECUTIVE_FAILS} failures in a row. Check your connection/groups and try again later._`
      if (leftover) msg += `\n\n_${leftover} item(s) not posted (max ${MAX_ITEMS_PER_RUN} per run). Run *${prefix}mppost go* again later._`
      return await m.send(msg)
    } finally {
      mpPosting = false
      mpCancelRequested = false
    }
  } catch (e) {
    console.log("mppost error", e)
    return await m.sendErr(e)
  }
})

// MPCANCEL (shortcut for "mppost cancel")
kord({
  cmd: "mpcancel",
  desc: "Cancel a posting run in progress",
  fromMe: true,
  type: "marketplace",
}, async (m) => {
  try {
    if (!mpPosting) return await m.send("_No posting run in progress_")
    mpCancelRequested = true
    return await m.send("_Cancelling after the current send finishes..._")
  } catch (e) {
    console.log("mpcancel error", e)
    return await m.sendErr(e)
  }
})

// MPBROADCAST — one message + one group-status update, to saved (or targeted) groups
kord({
  cmd: "mpbroadcast|mpbc",
  desc: "Send one message and one group status update to saved (or targeted) groups",
  fromMe: true,
  type: "marketplace",
}, async (m, text) => {
  try {
    const { text: cleanedText, groups: targetGroups } = await extractTargetClause(m.client, text || "")
    const arg = cleanedText.trim()

    const groups = targetGroups || await loadGroups()
    if (!groups.length) {
      return await m.send(targetGroups
        ? "_Couldn't resolve a group from that JID/link_"
        : "_No groups saved. Use *mpgadd* first_")
    }

    const listings = await loadListings()
    const maybeId = cleanId(arg)
    const existing = arg && listings[maybeId] ? listings[maybeId] : null

    let files = []
    let caption = ""

    if (existing) {
      files = await resolveItemMedia(existing)
      caption = existing.caption || ""
    } else if (hasMediaInput(m)) {
      files = await downloadMedia(m)
      caption = arg || m.quoted?.text || ""
    } else {
      caption = arg
    }

    if (!files.length && !caption) {
      return await m.send(
        `_Usage:_\n` +
        `*${prefix}mpbroadcast Your text* — text only\n` +
        `_Reply to a photo/video with *${prefix}mpbroadcast caption*_\n` +
        `*${prefix}mpbroadcast SUSYY* — broadcast an existing listing\n` +
        `_Add " to JID/link" to target one group, e.g. *${prefix}mpbroadcast SUSYY to 1203xxx@g.us*_`
      )
    }

    await m.send(`_Broadcasting to *${groups.length}* group(s) — message + group status..._`)

    let msgOk = 0, msgFail = 0, statusOk = 0, statusFail = 0

    for (let gi = 0; gi < groups.length; gi++) {
      const groupJid = groups[gi]

      try {
        const sentIds = await sendPost(m.client, groupJid, files, caption)
        if (existing) await recordSent(existing.id, sentIds)
        msgOk++
      } catch (e) {
        console.log(`mpbroadcast message fail ${groupJid}:`, e.message)
        msgFail++
      }

      try {
        await sendGroupStatus(m.client, groupJid, { files, caption })
        statusOk++
      } catch (e) {
        console.log(`mpbroadcast status fail ${groupJid}:`, e.message)
        statusFail++
      }

      if (gi < groups.length - 1) await sleep(randomBetween(GROUP_DELAY))
    }

    let msg = `✓ Broadcast done\n_Message — sent: ${msgOk}, failed: ${msgFail}_\n_Group status — sent: ${statusOk}, failed: ${statusFail}_`
    return await m.send(msg)
  } catch (e) {
    console.log("mpbroadcast error", e)
    return await m.sendErr(e)
  }
})
