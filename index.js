/*
 *
 * WHATSAPP QURAN BOT
 * AUTHOR: ASMIN | ZETT ID
 * TEAM: XIUZCODE
 * WE LOVE OPEN SOURCE
 *
 *
 */
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const moment = require('moment');
const { WAConnection, MessageType, WA_MESSAGE_STUB_TYPE } = require('@adiwajshing/baileys');

const jam = moment().format('HH:mm:ss');
const express = require('express');
const path = require('path');
const { setMaxListeners } = require('process');
const handle = require('./lib/init');

const app = express();

app.use(express.static(`${__dirname}/`));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './src/index.html'));
});
app.listen(process.env.PORT || 8080);

// initialized WAh
const con = new WAConnection();

// Startwith scan qr code
con.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  con.regenerateQRIntervalMs = null;
  console.log(`[${moment().format('HH:mm:ss')}] Scan the Qr code with app!`);
});
con.on('credentials-updated', () => {
  // save credentials whenever updated
  console.log(`[${jam}] Credentials update`);
  // get all the auth info we need to restore this session
  const authInfo = con.base64EncodedAuthInfo();
  fs.writeFileSync('./session.json', JSON.stringify(authInfo, null, '\t')); // save this info to a file
});
fs.existsSync('./session.json') && con.loadAuthInfo('./session.json');
con.connect();

// get messages
const split = (string) => [
  string.split(' ', 1).toString(),
  string.split(' ').slice(1).join(' '),
];

async function handlerMessages(msg) {
  if (msg.message !== null) {
    let user = '';
    const nomor = msg.key.remoteJid;
    const pesan = msg.message.extendedTextMessage !== null && !msg.key.fromMe
      ? msg.message.extendedTextMessage.text
      : msg.message.conversation;
    const nama = con.chats.get(msg.participant) === undefined
      ? con.chats.get(nomor).name
      : con.chats.get(msg.participant).name;
    if (nomor.endsWith('us')) {
      user = `${nama} di grub ${con.chats.get(nomor).name}`;
    } else if (nomor.endsWith('net')) {
      user = `[${nomor.replace('@s.whatsapp.net', '')}] ${nama}`;
    }
    const [cmd, value] = split(pesan);
    const command = cmd.toLowerCase();
    const badword = [
      'ajg',
      'anjing',
      'anjink',
      'anjinc',
      'jancok',
      'jncok',
      'jancok',
      'asu',
      'asw',
      'kntl',
      'kontol',
      'memek',
      'bangsat',
      'bgst',
      'bangst',
      'bgsat',
      'ngtd',
      'ngntod',
      'ngentod',
      'telaso',
      'tlso',
      'babi',
    ];

    // Handler if received new message
    // message startsWith quran
    if (command === '!quran') {
      process.stdout.write(
        `\r [${jam}] ${user} Mengirim permintaan: ${pesan} `,
      );
      const textToSend = handle.quranSurah(value);
      await con.sendMessage(nomor, textToSend, MessageType.text, {
        quoted: msg,
      });
      await con.chatRead(nomor);
      console.log(' ..done');

      // if message startsWith select
    } else if (command === '!select') {
      process.stdout.write(
        `\r [${jam}] ${user} Mengirim permintaan: ${pesan} `,
      );
      const textToSend = handle.select(value);
      await con.sendMessage(nomor, textToSend, MessageType.text, {
        quoted: msg,
      });
      await con.chatRead(nomor);
      console.log(' ..done');
    } else if (command === '!search') {
      process.stdout.write(
        `\r [${jam}] ${user} Mengirim permintaan: ${pesan} `,
      );
      process.stdout.write(
        `\r [${jam}] ${user} Mengirim permintaan: ${pesan} `,
      );
      const textToSend = handle.search(value.toLowerCase());
      if (textToSend.length === 1) {
        await con.sendMessage(nomor, textToSend[0], MessageType.text, {
          quoted: msg,
        });
      } else {
        textToSend.forEach(async (mainText) => {
          await con.sendMessage(nomor, mainText, MessageType.text);
        });
      }
      await con.chatRead(nomor);
      console.log(' ..done');
    } else if (command === '!specify') {
      process.stdout.write(
        `\r [${jam}] ${user} Mengirim permintaan: ${pesan} `,
      );
      const textToSend = handle.specify(value);
      await con.sendMessage(nomor, textToSend, MessageType.text, {
        quoted: msg,
      });
      await con.chatRead(nomor);
      console.log(' ..done');
    } else if (command === '!command') {
      process.stdout.write(
        `\r [${jam}] ${user} Mengirim permintaan: ${pesan} `,
      );
      const textToSend = handle.command(nama);
      await con.sendMessage(nomor, textToSend, MessageType.text, {
        quoted: msg,
      });
      await con.chatRead(nomor);
      console.log(' ..done');
    } else if (command === '!broadcast') {
      let broadcast = '\n';
      if (nomor === '6281242873775@s.whatsapp.net' || msg.participant === '6281242873775@s.whatsapp.net') {
        if (value === '') {
          con.sendMessage(nomor, 'Text nya bang jago', MessageType.text);
          con.chatRead(nomor);
        } else {
          broadcast += '\n*[ OWNER BROADCAST ]*\n';
          broadcast += `\n${value}`;
          const allUser = fs.readFileSync('./users.txt', 'utf-8').split('\n');
          allUser.pop();
          await allUser.forEach(async (pengguna) => {
            await con.sendMessage(pengguna, broadcast, MessageType.text);
            await con.chatRead(nomor);
          });
        }
      } else {
        con.sendMessage(
          nomor,
          '*Maaf, kamu bukan bos saya!*',
          MessageType.text,
        );
        await con.chatRead(nomor);
      }
    } else if (pesan !== '') {
      let textToSend = '';
      const pesanlist = pesan.toLowerCase().split(' ');
      pesanlist.forEach((kata) => {
        if (badword.includes(kata)) {
          process.stdout.write(
            `\r [${jam}] ${user} badword detected: ${pesan} `,
          );
          textToSend = 'Astagfirullah, jangan selalu ngebadword kawan. Itu sangat tidak baik';
          return;
        }
        if (nomor.endsWith('net') && textToSend === '') {
          textToSend = `Command *${pesan}* tidak terdaftar\nType *!command* untuk melihat daftar perintah`;
        }
      });

      if (textToSend !== '') {
        con.sendMessage(nomor, textToSend, MessageType.text, { quoted: msg });
        await con.chatRead(nomor);
      }
    }
  }
}

con.setMaxListeners(50);
async function messagesHandler() {
  await con.on('open', async () => {
    // firstly running, it will be get all unread messages
    const allChat = await con.chats.toJSON();
    await allChat.forEach((chat) => {
      const content = fs.readFileSync('users.txt', 'utf-8');
      if (
        content.includes(chat.jid) === false
        && chat.jid.includes('status') === false
      ) {
        console.log(`[${jam}] Added new user`);
        fs.writeFileSync('users.txt', `${chat.jid}\n`, { flag: 'a+' });
      }
    });
    const getunread = await con.loadAllUnreadMessages();
    const unread = [...new Set(getunread)];
    if (unread.length !== 0) {
      unread.forEach(async (m) => {
        try {
          await handlerMessages(m);
          if (m.key.remoteJid.endsWith('.us')) {
            con.chatRead(m.key.remoteJid);
          }
        } catch (err) {
          console.log(`[${jam}] ${err}`);
        }
      });
    }
  });
  await con.on('message-new', async (msg) => {
    try {
      const content = fs.readFileSync('users.txt', 'utf-8');
      if (content.includes(msg.key.remoteJid) === false && msg.key.remoteJid !== 'status@broadcast') {
        console.log(`[${jam}] Added new user`);
        fs.writeFileSync('users.txt', `${msg.key.remoteJid}\n`, { flag: 'a+' });
      }
      if (msg.key.remoteJid !== 'status@broadcast') {
        handlerMessages(msg);
        if (msg.key.remoteJid.endsWith('.us')) {
          con.chatRead(msg.key.remoteJid);
        }
      }
    } catch (err) {
      console.log(`[${jam}] ${err}`);
    }
  });
}
try {
  messagesHandler();
} catch (err) {
  console.log(`[${jam}] ${err}`);
}
