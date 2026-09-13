/**
 * SERVER PEMBACA REKAPITULASI PROGRAM DARI FOLDER UANG TUNAI
 * Standalone Lightweight Web Server & API for Visual Analytics Dashboard
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { findUangTunaiFolder, loadAllRecordsFromFolder } = require('./baca-rekap');

const PORT = process.env.PORT || 3500;
let customTargetFolder = null;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.csv': return 'text/csv; charset=utf-8';
    default: return 'text/plain; charset=utf-8';
  }
}

// Optional: fetch records from localhost:3000 (if UANG TUNAI server is running)
function fetchFromUangTunaiApi() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/api/records', { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json.length > 0) {
            resolve({ available: true, records: json });
          } else {
            resolve({ available: false, records: [] });
          }
        } catch (e) {
          resolve({ available: false, records: [] });
        }
      });
    });
    req.on('error', () => resolve({ available: false, records: [] }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ available: false, records: [] });
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health endpoint
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', app: 'Pembaca Rekapitulasi Kas Bengkel' }));
    return;
  }

  // Get Rekap Data Endpoint
  if (pathname === '/api/rekap' && req.method === 'GET') {
    const targetFolder = findUangTunaiFolder(customTargetFolder);
    const fileResult = loadAllRecordsFromFolder(targetFolder);
    const liveApi = await fetchFromUangTunaiApi();

    // Merge live API records if available
    let allRecords = [...fileResult.records];
    if (liveApi.available && liveApi.records.length > 0) {
      liveApi.records.forEach(apiRec => {
        const idx = allRecords.findIndex(r => r.id === apiRec.id || r.tanggal === apiRec.tanggal);
        if (idx !== -1) {
          allRecords[idx] = { ...allRecords[idx], ...apiRec, sumber: 'Live Server (localhost:3000)' };
        } else {
          allRecords.push({ ...apiRec, sumber: 'Live Server (localhost:3000)' });
        }
      });
    }

    // Sort by date descending
    allRecords.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      targetFolder,
      scannedFiles: fileResult.scannedFiles,
      liveApiConnected: liveApi.available,
      totalRecords: allRecords.length,
      records: allRecords,
      lastScanned: new Date().toISOString()
    }));
    return;
  }

  // Set Custom Folder to Scan
  if (pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.folderPath && fs.existsSync(payload.folderPath)) {
          customTargetFolder = payload.folderPath;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, folderPath: customTargetFolder }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Direktori folder tidak ditemukan!' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Serve static files (HTML, CSS, JS)
  let requestedFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(__dirname, requestedFile);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const contentType = getContentType(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Halaman atau endpoint tidak ditemukan' }));
});

server.listen(PORT, () => {
  console.log('===================================================================');
  console.log(`🚀 Program Pembaca Rekapitulasi Kas Bengkel siap digunakan!`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`📁 Memantau folder : ${findUangTunaiFolder(customTargetFolder) || 'Mencari folder UANG TUNAI...'}`);
  console.log('===================================================================');
});