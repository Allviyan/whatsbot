function sendSelectSurah(surah) {
  let text = '';
  text = `(${surah.nomor}) *${surah.surah}*\n\n`;
  surah.data.forEach((ayat) => {
    text += `(${ayat.ayat})\n${ayat.arab}\n${ayat.latin}\n${ayat.arti}\n`;
    text += '----------------------------------------\n';
  });
  return text;
}
function sendFindAyat(ayat) {
  let text = '';
  text += `(${ayat.nomor}) *${ayat.surah}* \n\n ${ayat.data.ayat}\n${ayat.data.arab}\n${ayat.data.latin}\n${ayat.data.arti}\n`;
  text += '----------------------------------------\n';
  return text;
}

module.exports = {
  sendSelectSurah,
  sendFindAyat,
};
