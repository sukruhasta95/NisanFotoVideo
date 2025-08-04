const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
require('dotenv').config();

const app = express();
const PORT = 3000;

const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');

const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(express.static(publicDir));
app.use('/upload', express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));
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
  upload.array('media', 1000)(req, res, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!req.files) return res.status(400).json({ success: false, error: 'Dosya alınamadı' });
    res.json({ success: true, files: req.files.map(f => f.filename) });
  });
});

app.get('/uploads', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Dosyalar listelenemedi' });
    res.json(files);
  });
});

app.post('/api/delete', (req, res) => {
  const filesToDelete = req.body.files;
  if (!Array.isArray(filesToDelete)) {
    return res.status(400).json({ error: 'Geçersiz veri formatı' });
  }
  let errors = [];
  filesToDelete.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    fs.unlink(filePath, err => {
      if (err) errors.push(file);
    });
  });
  setTimeout(() => {
    if (errors.length > 0) res.status(500).json({ error: 'Bazı dosyalar silinemedi', failed: errors });
    else res.json({ success: true });
  }, 300);
});

app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
