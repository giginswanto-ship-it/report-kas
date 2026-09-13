/**
 * PROGRAM PEMBACA REKAPITULASI KAS & OMSET DARI FOLDER UANG TUNAI
 * Standalone Node.js CLI Script
 * 
 * Penggunaan:
 *   node baca-rekap.js
 *   node baca-rekap.js --bulan 2026-09
 *   node baca-rekap.js --kasir Ahmad
 *   node baca-rekap.js --json
 *   node baca-rekap.js --path "C:\Path\Ke\Folder UANG TUNAI"
 */

const fs = require('fs');
const path = require('path');

// ANSI Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function formatRupiah(num) {
  const val = Number(num) || 0;
  return 'Rp ' + Math.floor(val).toLocaleString('id-ID');
}

function findUangTunaiFolder(customPath) {
  if (customPath && fs.existsSync(customPath)) {
    return path.resolve(customPath);
  }
  const candidatePaths = [
    path.join(__dirname, '..', 'UANG TUNAI'),
    path.join(__dirname, 'UANG TUNAI'),
    path.join('c:', 'Users', 'Swanto', 'OneDrive', 'Desktop', 'UANG TUNAI'),
    path.join(process.cwd(), '..', 'UANG TUNAI'),
    path.join(process.cwd(), 'UANG TUNAI')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return path.resolve(p);
    }
  }
  return null;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    if (cols.length < 3 || !cols[0] || cols[0].startsWith('=')) continue;

    const parseNum = (val) => {
      if (!val || typeof val !== 'string') return Number(val) || 0;
      if (val.startsWith('=')) return 0;
      const clean = val.replace(/[^0-9-]/g, '');
      return parseInt(clean, 10) || 0;
    };

    const tanggal = cols[0];
    const kasir = cols[1] || 'Kasir (Shift 1)';
    const saldoAwal = parseNum(cols[2]);
    const shopDrive = parseNum(cols[3]);
    const bimaMotor = parseNum(cols[4]);
    const totalPemasukan = (shopDrive + bimaMotor) || parseNum(cols[5]);
    const mandiri = parseNum(cols[6]);
    const cardEdc = parseNum(cols[7]);
    const tradeIn = parseNum(cols[8]);
    const biayaOps = parseNum(cols[9]);
    const totalPengeluaran = (mandiri + cardEdc + tradeIn + biayaOps) || parseNum(cols[10]);
    const sisaUang = ((saldoAwal + totalPemasukan) - totalPengeluaran) || parseNum(cols[11]);
    const fisikRiil = parseNum(cols[12]);
    const selisih = (fisikRiil - sisaUang) || parseNum(cols[13]);
    const catatan = cols[14] || '';

    // Extract expenses from note if possible
    const expenses = [];
    if (catatan) {
      const parts = catatan.split(/[,;]/);
      parts.forEach((p, idx) => {
        const match = p.match(/(.+?)(?:Rp\s*|:)?([0-9.,]+)/);
        if (match) {
          expenses.push({
            id: idx + 1,
            desc: match[1].trim(),
            amount: parseNum(match[2])
          });
        }
      });
    }

    records.push({
      id: 'CSV-' + tanggal + '-' + i,
      tanggal,
      kasir,
      saldoAwal,
      penjualanShopDrive: shopDrive,
      penjualanBimaMotor: bimaMotor,
      totalPemasukan,
      transferMandiri: mandiri,
      cardEdc,
      penghematanTradeIn: tradeIn,
      biayaOperasional: biayaOps,
      totalPengeluaranKas: totalPengeluaran,
      sisaUangKasKecil: sisaUang,
      fisikRiil,
      selisih,
      catatan,
      expenses,
      sumber: 'CSV File'
    });
  }

  return records;
}

function loadAllRecordsFromFolder(folderPath) {
  const results = {
    folderPath,
    scannedFiles: [],
    records: []
  };

  if (!folderPath || !fs.existsSync(folderPath)) {
    return results;
  }

  const files = fs.readdirSync(folderPath);

  // 1. Check JSON files
  files.filter(f => f.endsWith('.json')).forEach(f => {
    const fullPath = path.join(folderPath, f);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(raw);
      results.scannedFiles.push({ name: f, path: fullPath, type: 'JSON', size: fs.statSync(fullPath).size });

      if (Array.isArray(data)) {
        data.forEach(r => {
          r.sumber = f;
          results.records.push(r);
        });
      } else if (data.records && Array.isArray(data.records)) {
        data.records.forEach(r => {
          r.sumber = f;
          results.records.push(r);
        });
      }
    } catch (e) {
      // skip invalid json
    }
  });

  // 2. Check CSV files
  files.filter(f => f.endsWith('.csv')).forEach(f => {
    const fullPath = path.join(folderPath, f);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseCSV(raw);
      results.scannedFiles.push({ name: f, path: fullPath, type: 'CSV', size: fs.statSync(fullPath).size });
      parsed.forEach(r => {
        r.sumber = f;
        const exists = results.records.some(existing => existing.tanggal === r.tanggal);
        if (!exists) {
          results.records.push(r);
        }
      });
    } catch (e) {
      // skip
    }
  });

  // If records is empty, add sample demo record
  if (results.records.length === 0) {
    results.records.push({
      id: 'SAMPLE-1',
      tanggal: '2026-09-12',
      kasir: 'Ahmad (Shift 1)',
      catatan: 'Serah terima kasir lengkap, nota & struk EDC terlampir',
      saldoAwal: 500000,
      penjualanShopDrive: 4500000,
      penjualanBimaMotor: 3750000,
      totalPemasukan: 8250000,
      transferMandiri: 3400000,
      cardEdc: 1850000,
      penghematanTradeIn: 250000,
      biayaOperasional: 125000,
      totalPengeluaranKas: 5625000,
      sisaUangKasKecil: 3125000,
      fisikRiil: 3125000,
      selisih: 0,
      expenses: [
        { id: 1, desc: 'Bensin Operasional / Antar Barang', amount: 50000 },
        { id: 2, desc: 'Makan Siang Mekanik & Staff', amount: 75000 }
      ],
      sumber: 'Default Template Record'
    });
  }

  // Sort by date descending
  results.records.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));

  return results;
}

// CLI Execution
function main() {
  const args = process.argv.slice(2);
  let customPath = null;
  let filterBulan = null;
  let filterKasir = null;
  let isJsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      customPath = args[i + 1];
      i++;
    } else if (args[i] === '--bulan' && args[i + 1]) {
      filterBulan = args[i + 1];
      i++;
    } else if (args[i] === '--kasir' && args[i + 1]) {
      filterKasir = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--json') {
      isJsonOutput = true;
    }
  }

  const folder = findUangTunaiFolder(customPath);
  const data = loadAllRecordsFromFolder(folder);

  let filtered = data.records;
  if (filterBulan) {
    filtered = filtered.filter(r => r.tanggal && r.tanggal.startsWith(filterBulan));
  }
  if (filterKasir) {
    filtered = filtered.filter(r => r.kasir && r.kasir.toLowerCase().includes(filterKasir));
  }

  if (isJsonOutput) {
    console.log(JSON.stringify({
      targetFolder: folder,
      scannedFiles: data.scannedFiles,
      totalRecords: filtered.length,
      records: filtered
    }, null, 2));
    return;
  }

  // Compute Aggregates
  let sumShopDrive = 0;
  let sumBimaMotor = 0;
  let sumTotalPemasukan = 0;
  let sumMandiri = 0;
  let sumCardEdc = 0;
  let sumTradeIn = 0;
  let sumBiayaOps = 0;
  let sumTotalPengeluaran = 0;
  let sumSisaKas = 0;
  let sumFisikRiil = 0;
  let sumSelisih = 0;
  let allExpenses = [];

  filtered.forEach(r => {
    sumShopDrive += Number(r.penjualanShopDrive) || 0;
    sumBimaMotor += Number(r.penjualanBimaMotor) || 0;
    sumTotalPemasukan += Number(r.totalPemasukan) || 0;
    sumMandiri += Number(r.transferMandiri) || 0;
    sumCardEdc += Number(r.cardEdc) || 0;
    sumTradeIn += Number(r.penghematanTradeIn) || 0;
    sumBiayaOps += Number(r.biayaOperasional) || 0;
    sumTotalPengeluaran += Number(r.totalPengeluaranKas) || 0;
    sumSisaKas += Number(r.sisaUangKasKecil) || 0;
    sumFisikRiil += Number(r.fisikRiil) || 0;
    sumSelisih += Number(r.selisih) || 0;
    if (r.expenses && Array.isArray(r.expenses)) {
      r.expenses.forEach(e => allExpenses.push({ ...e, tanggal: r.tanggal }));
    }
  });

  const porsiSD = sumTotalPemasukan > 0 ? ((sumShopDrive / sumTotalPemasukan) * 100).toFixed(1) : 0;
  const porsiBM = sumTotalPemasukan > 0 ? ((sumBimaMotor / sumTotalPemasukan) * 100).toFixed(1) : 0;

  console.log(`\n${colors.bright}${colors.cyan}========================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.white}   PROGRAM PEMBACA REKAPITULASI OMSET & KAS KECIL BENGKEL${colors.reset}`);
  console.log(`${colors.yellow}   Shop & Drive & Bima Motor | Pembaca Sumber Data Folder: UANG TUNAI${colors.reset}`);
  console.log(`${colors.cyan}========================================================================================${colors.reset}`);
  
  console.log(`\n${colors.bright}📁 Direktori Sumber :${colors.reset} ${folder || colors.red + 'Folder UANG TUNAI tidak ditemukan!' + colors.reset}`);
  console.log(`📄 File Terpindai   : ${data.scannedFiles.map(f => f.name + ' (' + f.type + ')').join(', ') || 'None'}`);
  console.log(`📊 Jumlah Rekap Data : ${colors.green}${filtered.length} Transaksi${colors.reset}${filterBulan ? ' [Filter Bulan: ' + filterBulan + ']' : ''}${filterKasir ? ' [Filter Kasir: ' + filterKasir + ']' : ''}`);
  
  console.log(`\n${colors.bright}${colors.magenta}--- RINGKASAN EKSEKUTIF KEUANGAN (AGREGAT) ---${colors.reset}`);
  console.log(`💰 ${colors.bright}Total Pemasukan (Omset)    :${colors.reset} ${colors.green}${formatRupiah(sumTotalPemasukan)}${colors.reset}`);
  console.log(`   ├── Penjualan Shop & Drive : ${formatRupiah(sumShopDrive)} (${porsiSD}%)`);
  console.log(`   └── Penjualan Bima Motor   : ${formatRupiah(sumBimaMotor)} (${porsiBM}%)`);
  console.log(`💳 ${colors.bright}Total Non-Tunai (Bank/EDC) :${colors.reset} ${formatRupiah(sumMandiri + sumCardEdc + sumTradeIn)}`);
  console.log(`   ├── Transfer Bank Mandiri  : ${formatRupiah(sumMandiri)}`);
  console.log(`   ├── Card / EDC             : ${formatRupiah(sumCardEdc)}`);
  console.log(`   └── Trade In / Penghematan : ${formatRupiah(sumTradeIn)}`);
  console.log(`🧾 ${colors.bright}Total Biaya Operasional    :${colors.reset} ${colors.yellow}${formatRupiah(sumBiayaOps)}${colors.reset}`);
  console.log(`📉 ${colors.bright}Total Pengeluaran Kas      :${colors.reset} ${formatRupiah(sumTotalPengeluaran)}`);
  console.log(`💵 ${colors.bright}Total Sisa Kas Kecil       :${colors.reset} ${formatRupiah(sumSisaKas)}`);
  console.log(`🪙 ${colors.bright}Total Uang Fisik Riil Laci :${colors.reset} ${formatRupiah(sumFisikRiil)}`);
  
  const selisihColor = sumSelisih === 0 ? colors.green : (sumSelisih > 0 ? colors.blue : colors.red);
  const selisihStatus = sumSelisih === 0 ? 'PAS (SESUAI)' : (sumSelisih > 0 ? 'LEBIH (SURPLUS)' : 'KURANG (DEFISIT)');
  console.log(`⚖️  ${colors.bright}Total Selisih Kasir        :${colors.reset} ${selisihColor}${formatRupiah(sumSelisih)} [${selisihStatus}]${colors.reset}`);

  console.log(`\n${colors.bright}${colors.cyan}--- TABEL REKAPITULASI PER TANGGAL ---${colors.reset}`);
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'Tanggal'.padEnd(12) +
    'Kasir'.padEnd(20) +
    'Shop & Drive'.padEnd(16) +
    'Bima Motor'.padEnd(16) +
    'Total Omset'.padEnd(16) +
    'Biaya Ops'.padEnd(13) +
    'Status Selisih'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  filtered.forEach(r => {
    const selTxt = r.selisih === 0 ? '✓ Pas' : (r.selisih > 0 ? '+ Leb ' + formatRupiah(r.selisih) : '- Kur ' + formatRupiah(Math.abs(r.selisih)));
    console.log(
      (r.tanggal || '-').padEnd(12) +
      (r.kasir || '-').substring(0, 18).padEnd(20) +
      formatRupiah(r.penjualanShopDrive).padEnd(16) +
      formatRupiah(r.penjualanBimaMotor).padEnd(16) +
      formatRupiah(r.totalPemasukan).padEnd(16) +
      formatRupiah(r.biayaOperasional).padEnd(13) +
      selTxt
    );
  });
  console.log('---------------------------------------------------------------------------------------------------------');

  if (allExpenses.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}--- DAFTAR RINCIAN BON PENGELUARAN OPERASIONAL ---${colors.reset}`);
    allExpenses.forEach((exp, idx) => {
      console.log(`  ${idx + 1}. [${exp.tanggal || '-'}] ${(exp.desc || '').padEnd(35)} : ${colors.yellow}${formatRupiah(exp.amount)}${colors.reset}`);
    });
  }

  console.log(`\n${colors.bright}${colors.green}💡 Tip:${colors.reset} Jalankan ${colors.bright}npm start${colors.reset} atau ${colors.bright}start.bat${colors.reset} untuk membuka Visual Interactive Dashboard di web browser!\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  findUangTunaiFolder,
  loadAllRecordsFromFolder,
  parseCSV
};