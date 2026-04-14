const https = require('https');
https.get('https://raw.githubusercontent.com/musescore/MuseScore/master/fonts/bravura/bravura_metadata.json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.substring(0, 100)));
});
