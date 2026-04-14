import https from 'https';
import fs from 'fs';

https.get('https://raw.githubusercontent.com/0xfe/vexflow/master/src/fonts/bravura_glyphs.ts', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const fMatch = data.match(/"fClef":\s*\{[^}]*"d":\s*"([^"]+)"/);
    if (fMatch) {
      console.log("F Clef path:", fMatch[1].substring(0, 50) + '...');
      fs.writeFileSync('fclef.txt', fMatch[1]);
    } else {
      console.log("F Clef not found");
    }
  });
});
