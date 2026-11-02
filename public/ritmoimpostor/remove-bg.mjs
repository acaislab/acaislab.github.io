import { Jimp } from 'jimp';

async function countWhite(filePath) {
  try {
    const image = await Jimp.read(filePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    let solidWhiteCount = 0;
    let transparentCount = 0;
    let otherCount = 0;
    
    image.scan((x, y, idx) => {
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx+1];
      const b = image.bitmap.data[idx+2];
      const a = image.bitmap.data[idx+3];
      
      if (a === 0) {
        transparentCount++;
      } else if (r > 240 && g > 240 && b > 240) {
        solidWhiteCount++;
      } else {
        otherCount++;
      }
    });
    
    console.log(`File: ${filePath}`);
    console.log(`Transparent pixels: ${transparentCount}`);
    console.log(`Solid White-ish pixels (r,g,b > 240): ${solidWhiteCount}`);
    console.log(`Other pixels: ${otherCount}`);
  } catch (err) {
    console.error(err);
  }
}

countWhite('public/tripulantes.png');
countWhite('public/naranjo.png');
