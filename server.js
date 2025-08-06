const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const Busboy = require('busboy');
const basicAuth = require('express-basic-auth');
const dotenv = require('dotenv');
const { moveFile } = require('./utils/fileMover');

dotenv.config();

const app = express();
const PORT = 3000;

const uploadsDir = path.join(__dirname, 'uploads');
const ramdiskDir = path.join(__dirname, 'ramdisk');
const publicDir = path.join(__dirname, 'public');

const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;

if (!adminUser || !adminPass) {
  console.error('ADMIN_USER veya ADMIN_PASS eksik!');
  process.exit(1);
}

[uploadsDir, ramdiskDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/admin', basicAuth({
  users: { [adminUser]: adminPass },
  challenge: true
}), (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.post('/api/upload', (req, res) => {
  const busboy = Busboy({ headers: req.headers, limits: { fileSize: 1024 * 1024 * 1024 } });
  const uploadedFiles = [];

  busboy.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    const safeName = Date.now() + '-' + path.basename(filename);
    const tempPath = path.join(ramdiskDir, safeName);
    const finalPath = path.join(uploadsDir, safeName);
    const writeStream = fs.createWriteStream(tempPath);
    file.pipe(writeStream);

    writeStream.on('close', async () => {
      await moveFile(tempPath, finalPath);
      uploadedFiles.push(safeName);
    });

  });

  busboy.on('finish', () => {
    res.json({ success: true, files: uploadedFiles });
  });

  req.pipe(busboy);
});

app.get('/uploads', async (req, res) => {
  try {
    const files = await fsp.readdir(uploadsDir);
    res.json(files);
  } catch {
    res.status(500).json({ error: 'Dosyalar listelenemedi' });
  }
});

app.post('/api/delete', express.json(), async (req, res) => {
  const files = req.body.files;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'Geçersiz veri' });

  const results = await Promise.allSettled(files.map(f => fsp.unlink(path.join(uploadsDir, f))));
  const failed = results
    .map((r, i) => r.status === 'rejected' ? files[i] : null)
    .filter(Boolean);

  if (failed.length > 0) res.status(500).json({ error: 'Bazı dosyalar silinemedi', failed });
  else res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
