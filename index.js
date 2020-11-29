const fs = require('fs');
const qrcode = require('qrcode-terminal');
const moment = require('moment');
const {
  WAConnection,
  MessageType,
  Presence,
  MessageOptions,
  Mimetype,
  WALocationMessage,
  WA_MESSAGE_STUB_TYPES,
  ReconnectMode,
  ProxyAgent,
  waChatKey,
} = require('@adiwajshing/baileys');

const jam = moment().format('HH:mm:ss');
const express = require('express');
const parsing = require('./send.js');
const quran = require('./read.js');

const app = express();
const path = require('path');

app.use(express.static(`${__dirname}/`));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './src/index.html'));
});
app.listen(process.env.PORT || 8080);

// initialized WA
const con = new WAConnection();

// Startwith scan qr code
con.on('qr', (qr) => {
  qrcode.generate(qr, {
    small: true,
  });
  con.regenerateQRIntervalMs = 1000; // no QR regen
  console.log(`[${moment().format('HH:mm:ss')}] Scan the Qr code with app!`);
});
con.on('credentials-updated', () => {
  // save credentials whenever updated
  console.log('credentials updated!');
  // get all the auth info we need to restore this session
  const authInfo = con.base64EncodedAuthInfo();
  fs.writeFileSync('./session.json', JSON.stringify(authInfo, null, '\t')); // save this info to a file
});
fs.existsSync('./session.json') && con.loadAuthInfo('./session.json');
// uncomment the following line to proxy the connection; some random proxy I got off of: https://proxyscrape.com/free-proxy-list
// conn.connectOptions.agent = ProxyAgent ('http://1.0.180.120:8080')
con.connect();

// get messages
const split = (string) => [string.split(' ', 1).toString(), string.split(' ').slice(1).join(' ')];
con.on('message-new', async (msg) => {
  // const messageContent = msg.message;
  const pesan = msg.message.conversation;
  const nomor = msg.key.remoteJid;
  const [cmd, value] = split(pesan);
  const command = cmd.toLowerCase();
  const badword = ['ajg', 'anjing', 'jancok', 'asu', 'asw'];

  // Handler if received new message

  // message startsWith quran
  if (command === '!quran') {
    let textToSend = '';
    if (isNaN(value)) {
      console.log(`[${jam}] memgirim permintaan: ${pesan}`);
      const surah = quran.selectSurah(value);
      if (surah) {
        textToSend += parsing.sendSelectSurah(surah);
      } else {
        textToSend += `Surah *${value}* tidak ada`;
      }
    } else {
      const surah = quran.selectSurah(value);
      if (surah) {
        textToSend += parsing.sendSelectSurah(surah);
      } else {
        textToSend += `Surah ke- *${value}* tidak ada`;
      }
    }
    await con.sendMessage(nomor, textToSend, MessageType.text, { quoted: msg });

    // if message startsWith select
  } else if (command === '!select') {
    console.log(`[${jam}] memgirim permintaan: ${pesan}`);
    let textToSend = '';
    const [keyword, ayat] = value.split(' ');
    const surah = quran.selectAyat(keyword, ayat);
    if (!surah.surah) {
      textToSend += `Surah *${keyword}* tidak ditemukan\n\nPastikan format benar`;
    } else if (surah.data.length !== 0) {
      textToSend += parsing.sendSelectSurah(surah);
    } else if (surah.surah) {
      textToSend += `Ayat *${ayat}* tidak ada di surah *${surah.surah}*`;
    }
    await con.sendMessage(nomor, textToSend, MessageType.text);
  } else if (command === '!search') {
    console.log(`[${jam}] memgirim permintaan: ${pesan}`);
    let textToSend = '';
    const arr = quran.findAyat(value);
    if (arr.length === 0) {
      textToSend += `Keyword ${value} tidak ditemukan`;
      await con.sendMessage(nomor, textToSend, MessageType.text);
    } else {
      arr.forEach(async (ayat) => {
        textToSend = parsing.sendFindAyat(ayat);
        await con.sendMessage(nomor, textToSend, MessageType.text);
      });
    }
  } else if (command === '!specify') {
    console.log(`[${jam}] memgirim permintaan: ${pesan}`);
    let textToSend = '';
    const [surah, range] = split(value);
    if (range.includes('-')) {
      if (range.startsWith('-')) { // handler message if startsWith "-"
        const result = quran.selectRange(surah, undefined, range.replace('-', ''));
        if (result.data.length === 0) {
          textToSend += `Ayat *${range.replace('-', '')}* tidak di temukan`;
        } else {
          textToSend += parsing.sendSelectSurah(result);
        }
      } else if (range.endsWith('-')) {
        const result = quran.selectRange(surah, range.replace('-', ''));
        textToSend += parsing.sendSelectSurah(result);
      } else {
        const [start, end] = range.split('-');
        const result = quran.selectRange(surah, start, end);
        if (result.data.length === 0) {
          textToSend += 'Format salah!, ayat mulai lebih besar dari ayat akhir';
        } else {
          textToSend += parsing.sendSelectSurah(result);
        }
      }
    } else {
      textToSend += 'Format salah!';
    }
    await con.sendMessage(nomor, textToSend, MessageType.text);
  } else if (command === '!command') {
    console.log(`[${jam}] memgirim permintaan: ${pesan}`);
    let text = '';
    text += '\n\nHi, Saya Quran bot\n';
    text += 'Saya punya beberapa perintah disini\n\n';
    text += 'Penggunaan:\n';
    text += '   *!quran <nama surah/nomor surah>*\n';
    text += 'Contoh:\n';
    text += '   *!quran alfatihah* atau *!quran 1*\n\n';
    text += 'Mendaptkan surah secara spesifik\n';
    text += 'Penggunaan: \n';
    text += '  *!specify <nama surah/nomor surah>* ayat yang mau di tampilkan\n';
    text += 'Contoh:\n';
    text += '  *!specify 1 5-*  => Mulai dari ayat 5 sampai selesai\n';
    text += '  *!specify 1 -5*  => Mulai dari ayat 1 sampai 5\n';
    text += '  *!specify 2 5-10*  => Mulai dari ayat 5 sampai 10\n\n';
    text += 'Cari kata tertentu di alquran\n';
    text += 'Penggunaan\n';
    text += '  *!search <kata>*\n';
    text += 'Contoh: \n';
    text += '  *!search surga*\n\n';
    text += 'Tampilkan ayat tertentu pada surah\n';
    text += 'Penggunaan:\n';
    text += '  *!select <nama surah/nomor surah> <nomor ayat>*\n';
    text += 'Contoh:\n';
    text += '  *!select Ar rahman 57*\n\n';
    text += 'Ok, saat ini saya baru itu\n';
    text += 'Jika kamu bersedia, Bisahkah kamu untuk membagikan aku dikontakmu\n';
    text += 'Kamu bisa mensupport saya dengan membelikan aku kopi\n';
    text += '\n';
    await con.sendMessage(nomor, text, MessageType.text);
  } else if (command !== '') {
    badword.forEach((word) => {
      if (command.includes(word)) {
        con.sendMessage(nomor, 'Jangan selalu ngebadword kawan. Itu sangat tidak baik', { quoted: msg });
      }
    });
  }
});
