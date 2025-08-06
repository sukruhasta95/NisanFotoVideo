const fs = require('fs');
const fsp = require('fs/promises');

async function moveFile(src, dest) {
  try {
    await fsp.rename(src, dest); // hızlıdır
  } catch (err) {
    // Eğer farklı dosya sistemiyse fallback yap
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    await fsp.unlink(src);
  }
}

module.exports = { moveFile };
