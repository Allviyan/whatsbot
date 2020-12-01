const fs = require('fs');
const qrcode = require('qrcode-terminal');
const moment = require('moment');
const {
  WAConnection,
  MessageType,
} = require('@adiwajshing/baileys');

const jam = moment().format('HH:mm:ss');
const express = require('express');
const { text } = require('express');
const path = require('path');
const parsing = require('./send.js'); // module buatan gw
const quran = require('./read.js'); // module buatan gw

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
async function messagesHandler() {
  con.on('message-new', async (msg) => {
  // const messageContent = msg.message;
    const pesan = msg.message.conversation;
    const nomor = msg.key.remoteJid;
    const [cmd, value] = split(pesan);
    const command = cmd.toLowerCase();
    const badword = ['ajg', 'anjing', 'jancok', 'asu', 'asw', 'kntl', 'kontol', 'memek'];
    con.chatRead(msg.key.remoteJid);

    // Handler if received new message
    // message startsWith quran
    if (command === '!quran') {
      let textToSend = '';
      if (!parseInt(value)) {
        console.log(`[${jam}] mengirim permintaan: ${pesan}`);
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
      console.log(`[${jam}] mengirim permintaan: ${pesan}`);
      let textToSend = '';
      const [keyword, ayat] = value.split(' ');
      const surah = quran.selectAyat(keyword, ayat);
      if (!surah.surah) {
        textToSend += `\nSurah *${keyword}* tidak ditemukan\n\nPastikan format benar`;
      } else if (surah.data.length !== 0) {
        textToSend += parsing.sendSelectSurah(surah);
      } else if (surah.surah) {
        textToSend += `Ayat *${ayat}* tidak ada di surah *${surah.surah}*`;
      }
      await con.sendMessage(nomor, textToSend, MessageType.text);
    } else if (command === '!search') {
      console.log(`[${jam}] mengirim permintaan: ${pesan}`);
      let textToSend = '';
      if (value !== '') {
        const arr = quran.findAyat(value.toLowerCase());
        if (arr.length === 0) {
          textToSend += `Keyword *${value}* tidak ditemukan`;
          await con.sendMessage(nomor, textToSend, MessageType.text, { quoted: msg });
        } else {
          arr.forEach(async (ayat) => {
            textToSend = parsing.sendFindAyat(ayat);
            const replacer = new RegExp(` ${value} `, 'gi');
            const textSend = textToSend.replace(replacer, ` *${value}* `);
            await con.sendMessage(nomor, textSend, MessageType.text);
          });
        }
      } else {
        textToSend += '\nPastikan format benar\nContoh *!search Adam*\n';
        con.sendMessage(nomor, textToSend, MessageType.text, { quoted: msg });
      }
    } else if (command === '!specify') {
      console.log(`[${jam}] mengirim permintaan: ${pesan}`);
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
        textToSend += '*Format salah!*\n';
        textToSend += 'Penggunaan:\n  *!specify <nama surah/nomor surah> <ayat>*\n\n';
        textToSend += 'Contoh:\n  *!specify 1 -2* => Menampilkan Surah Alfatiha dari ayat 1 sampai 2\n';
        textToSend += '  *!specify 1 2-* => Menampilkan surah alfatihah dari ayat 2 sampai ayat akhir\n';
        textToSend += '  *!specify 1 2-5* => Menampilkan surah alfatihah dari ayat 2 spai 5\n';
      }
      await con.sendMessage(nomor, textToSend, MessageType.text, { quoted: msg });
    } else if (command === '!command') {
      console.log(`[${jam}] mengirim permintaan: ${pesan}`);
      let textToSend = '';
      textToSend += '\n\nHi *Jagoan*, Saya Quran bot\n';
      textToSend += 'Saya punya beberapa perintah disini\n\n';
      textToSend += 'Penggunaan:\n';
      textToSend += '   *!quran <nama surah/nomor surah>*\n';
      textToSend += 'Contoh:\n';
      textToSend += '   *!quran alfatihah* atau *!quran 1*\n\n';
      textToSend += 'Mendaptkan surah secara spesifik\n';
      textToSend += 'Penggunaan: \n';
      textToSend += '  *!specify <nama surah/nomor surah>* ayat yang mau di tampilkan\n';
      textToSend += 'Contoh:\n';
      textToSend += '  *!specify 1 5-*  => Mulai dari ayat 5 sampai selesai\n';
      textToSend += '  *!specify 1 -5*  => Mulai dari ayat 1 sampai 5\n';
      textToSend += '  *!specify 2 5-10*  => Mulai dari ayat 5 sampai 10\n\n';
      textToSend += 'Cari kata tertentu di alquran\n';
      textToSend += 'Penggunaan\n';
      textToSend += '  *!search <kata>*\n';
      textToSend += 'Contoh: \n';
      textToSend += '  *!search surga*\n\n';
      textToSend += 'Tampilkan ayat tertentu pada surah\n';
      textToSend += 'Penggunaan:\n';
      textToSend += '  *!select <nama surah/nomor surah> <nomor ayat>*\n';
      textToSend += 'Contoh:\n';
      textToSend += '  *!select Arrahman 57*\n\n';
      textToSend += '*[ NOTE ] PENULISAN NAMA SURAH JANGAN PAKAI SPASI*\n\n';
      textToSend += 'Ok, saat ini saya baru itu\n';
      textToSend += 'Jika kamu bersedia, Bisahkah kamu untuk membagikan aku dikontakmu\n';
      textToSend += 'Kamu bisa mensupport saya dengan membelikan aku kopi\n';
      textToSend += '\n';
      await con.sendMessage(nomor, textToSend, MessageType.text);
    } else if (pesan !== '') {
      let textToSend = '';
      const pesanlist = pesan.toLowerCase().split(' ');
      pesanlist.forEach((kata) => {
        if (badword.includes(kata)) {
          textToSend = 'Jangan selalu ngebadword kawan. Itu sangat tidak baik';
        } else if (nomor.endsWith('net')) {
          con.sendMessage(nomor, `Command *${pesan}* tidak terdaftar\nType *!command* untuk melihat daftar perintah`, MessageType.text, { quoted: msg });
        }
      });
      if (textToSend !== '') {
        await con.sendMessage(nomor, textToSend, MessageType.text, { quoted: msg });
      }
    }
  });
}
messagesHandler().catch((err) => console.log(`[${jam}] Error: ${err}`));
