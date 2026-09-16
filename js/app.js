/**
 * PROGRAM PEMBACA REKAPITULASI KAS & OMSET BENGKEL
 * Frontend Core Application (Tailwind CSS + Chart.js + Dynamic Analytics)
 */

// Storage Key for Cash Taken Status
const STORAGE_KEY_CASH_TAKEN = 'rekap_kas_cash_taken_status_v1';

function getCashTakenMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CASH_TAKEN);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function isRecordCashTaken(record) {
  if (!record) return false;
  const map = getCashTakenMap();
  const key = record.id || record.tanggal;
  return map[key]?.taken === true;
}

function setRecordCashTaken(recordKey, isTaken) {
  const map = getCashTakenMap();
  map[recordKey] = {
    taken: Boolean(isTaken),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_CASH_TAKEN, JSON.stringify(map));
}

// Application State
const state = {
  allRecords: [],
  filteredRecords: [],
  scannedFiles: [],
  targetFolder: '',
  liveApiConnected: false,
  activeFilter: 'all', // 'all', 'today', '7days', 'this_month', 'last_month', 'custom'
  customStartDate: '',
  customEndDate: '',
  cashierFilter: 'all',
  statusFilter: 'all',
  cashTakenFilter: 'all', // 'all', 'taken', 'not_taken'
  searchQuery: '',
  selectedRecord: null,
  charts: {
    revenueTrend: null,
    paymentMethod: null,
    expenseCategory: null,
    cashAccuracy: null
  }
};

// Utilities
const utils = {
  formatRupiah(num) {
    const val = Number(num) || 0;
    return 'Rp ' + Math.floor(val).toLocaleString('id-ID');
  },
  parseNumber(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = str.toString().replace(/[^0-9-]/g, '');
    return parseInt(clean, 10) || 0;
  },
  formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }
};

// --- DATA INITIALIZATION & LOADERS ---
async function initializeData() {
  showLoading(true);
  try {
    // 1. Try fetching from internal server (server.js port 3500)
    const res = await fetch('/api/rekap').catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      state.allRecords = data.records || [];
      state.scannedFiles = data.scannedFiles || [];
      state.targetFolder = data.targetFolder || '';
      state.liveApiConnected = data.liveApiConnected || false;
      renderApp();
      showToast('Data berhasil dimuat dari server & folder UANG TUNAI', 'success');
      showLoading(false);
      return;
    }
  } catch (e) {
    console.warn('Backend server /api/rekap unavailable, checking direct connections...');
  }

  // 2. Try fetching from UANG TUNAI localhost:3000
  try {
    const directRes = await fetch('http://localhost:3000/api/records').catch(() => null);
    if (directRes && directRes.ok) {
      const records = await directRes.json();
      if (Array.isArray(records) && records.length > 0) {
        state.allRecords = records;
        state.targetFolder = 'http://localhost:3000 (Live REST API)';
        state.liveApiConnected = true;
        renderApp();
        showToast('Terhubung langsung ke Database Server Kas Bengkel (Port 3000)', 'success');
        showLoading(false);
        return;
      }
    }
  } catch (e) {
    console.warn('Direct localhost:3000 unavailable.');
  }

  // 3. Try reading from browser LocalStorage
  try {
    const rawLocal = localStorage.getItem('kas_bengkel_shop_drive_bima_v1');
    if (rawLocal) {
      const records = JSON.parse(rawLocal);
      if (Array.isArray(records) && records.length > 0) {
        state.allRecords = records;
        state.targetFolder = 'LocalStorage Browser Cache';
        renderApp();
        showToast('Memuat data dari riwayat cache browser lokal', 'info');
        showLoading(false);
        return;
      }
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  // 4. Default Sample Data if none loaded
  loadSampleFallbackData();
  showLoading(false);
}

function loadSampleFallbackData() {
  state.allRecords = [
    {
      id: 'REC-001',
      tanggal: '2026-09-12',
      kasir: 'Shift 1 (Ahmad)',
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
      catatan: 'Bensin Operasional Rp 50.000, Makan Siang Rp 75.000',
      expenses: [
        { id: 1, desc: 'Bensin Operasional Antar Aki', amount: 50000 },
        { id: 2, desc: 'Makan Siang Mekanik Shift 1', amount: 75000 }
      ],
      sumber: 'Template Kas UANG TUNAI'
    },
    {
      id: 'REC-002',
      tanggal: '2026-09-11',
      kasir: 'Shift 1 (Budi)',
      saldoAwal: 500000,
      penjualanShopDrive: 5200000,
      penjualanBimaMotor: 4100000,
      totalPemasukan: 9300000,
      transferMandiri: 4100000,
      cardEdc: 2100000,
      penghematanTradeIn: 300000,
      biayaOperasional: 180000,
      totalPengeluaranKas: 6680000,
      sisaUangKasKecil: 3120000,
      fisikRiil: 3120000,
      selisih: 0,
      catatan: 'Beli ATK dan sabun cuci tangan bengkel',
      expenses: [
        { id: 1, desc: 'Beli ATK Kertas Struk Kasir', amount: 80000 },
        { id: 2, desc: 'Sabun Cuci & Pembersih Bengkel', amount: 100000 }
      ],
      sumber: 'Database Kas Bengkel'
    },
    {
      id: 'REC-003',
      tanggal: '2026-09-10',
      kasir: 'Shift 2 (Rian)',
      saldoAwal: 500000,
      penjualanShopDrive: 3800000,
      penjualanBimaMotor: 2900000,
      totalPemasukan: 6700000,
      transferMandiri: 2500000,
      cardEdc: 1600000,
      penghematanTradeIn: 150000,
      biayaOperasional: 95000,
      totalPengeluaranKas: 4345000,
      sisaUangKasKecil: 2855000,
      fisikRiil: 2855000,
      selisih: 0,
      catatan: 'Galon air minum mekanik & snack',
      expenses: [
        { id: 1, desc: 'Isi Ulang 3 Galon Air Minum', amount: 60000 },
        { id: 2, desc: 'Snack & Kopi Mekanik', amount: 35000 }
      ],
      sumber: 'Database Kas Bengkel'
    }
  ];
  state.targetFolder = 'Folder UANG TUNAI (Contoh Pembukuan Aktif)';
  renderApp();
}

// --- FILTERING LOGIC ---
function applyFilters() {
  let list = [...state.allRecords];
  const now = new Date();

  // Date Filter
  if (state.activeFilter === 'today') {
    const todayStr = now.toISOString().split('T')[0];
    list = list.filter(r => r.tanggal === todayStr);
  } else if (state.activeFilter === '7days') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    list = list.filter(r => new Date(r.tanggal) >= sevenDaysAgo);
  } else if (state.activeFilter === 'this_month') {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yyyy}-${mm}`;
    list = list.filter(r => r.tanggal && r.tanggal.startsWith(prefix));
  } else if (state.activeFilter === 'last_month') {
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const yyyy = lastMonthDate.getFullYear();
    const mm = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${yyyy}-${mm}`;
    list = list.filter(r => r.tanggal && r.tanggal.startsWith(prefix));
  } else if (state.activeFilter === 'custom') {
    if (state.customStartDate) {
      list = list.filter(r => r.tanggal >= state.customStartDate);
    }
    if (state.customEndDate) {
      list = list.filter(r => r.tanggal <= state.customEndDate);
    }
  }

  // Cashier Filter
  if (state.cashierFilter !== 'all') {
    list = list.filter(r => r.kasir && r.kasir.toLowerCase().includes(state.cashierFilter.toLowerCase()));
  }

  // Selisih Status Filter
  if (state.statusFilter === 'pas') {
    list = list.filter(r => Number(r.selisih) === 0);
  } else if (state.statusFilter === 'lebih') {
    list = list.filter(r => Number(r.selisih) > 0);
  } else if (state.statusFilter === 'kurang') {
    list = list.filter(r => Number(r.selisih) < 0);
  }

  // Cash Taken Status Filter
  if (state.cashTakenFilter === 'taken') {
    list = list.filter(r => isRecordCashTaken(r));
  } else if (state.cashTakenFilter === 'not_taken') {
    list = list.filter(r => !isRecordCashTaken(r));
  }

  // Search Query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter(r => 
      (r.tanggal && r.tanggal.toLowerCase().includes(q)) ||
      (r.kasir && r.kasir.toLowerCase().includes(q)) ||
      (r.catatan && r.catatan.toLowerCase().includes(q)) ||
      (r.sumber && r.sumber.toLowerCase().includes(q))
    );
  }

  state.filteredRecords = list;
}

// --- RENDERING VIEWS ---
function renderApp() {
  applyFilters();
  populateCashierOptions();
  renderKpiCards();
  renderCharts();
  renderRekapTable();
  renderExpensesTab();
  renderComparisonTab();
  renderSourceInfoTab();
  updateStatusBadges();
}

function updateStatusBadges() {
  const folderEl = document.getElementById('statusTargetFolder');
  if (folderEl) {
    folderEl.innerText = state.targetFolder || 'Folder UANG TUNAI Terhubung';
  }

  const badgeEl = document.getElementById('dbLiveBadge');
  if (badgeEl) {
    if (state.liveApiConnected) {
      badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live API Terhubung';
      badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40';
    } else {
      badgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-400"></span> File Reader Aktif';
      badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40';
    }
  }

  const recordCountEl = document.getElementById('recordCountBadge');
  if (recordCountEl) {
    recordCountEl.innerText = `${state.filteredRecords.length} dari ${state.allRecords.length} Transaksi`;
  }
}

function populateCashierOptions() {
  const select = document.getElementById('selectKasir');
  if (!select) return;

  const current = select.value;
  const kasirSet = new Set();
  state.allRecords.forEach(r => {
    if (r.kasir) kasirSet.add(r.kasir);
  });

  select.innerHTML = '<option value="all">Semua Kasir & Shift</option>';
  kasirSet.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.innerText = k;
    if (k === current) opt.selected = true;
    select.appendChild(opt);
  });
}

// Render Executive KPI Cards
function renderKpiCards() {
  let sumTotalOmset = 0;
  let sumShopDrive = 0;
  let sumBimaMotor = 0;
  let sumMandiri = 0;
  let sumCardEdc = 0;
  let sumTradeIn = 0;
  let sumBiayaOps = 0;
  let sumPengeluaranKas = 0;
  let sumSisaKas = 0;
  let sumFisikRiil = 0;
  let sumFisikBelumDiambil = 0;
  let countBelumDiambil = 0;
  let sumFisikSudahDiambil = 0;
  let countSudahDiambil = 0;
  let sumSelisih = 0;
  let pasCount = 0;

  state.filteredRecords.forEach(r => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    sumTotalOmset += totalPemasukan;
    sumShopDrive += Number(r.penjualanShopDrive) || 0;
    sumBimaMotor += Number(r.penjualanBimaMotor) || 0;
    sumMandiri += Number(r.transferMandiri) || 0;
    sumCardEdc += Number(r.cardEdc) || 0;
    sumTradeIn += Number(r.penghematanTradeIn) || 0;
    sumBiayaOps += Number(r.biayaOperasional) || 0;
    sumPengeluaranKas += Number(r.totalPengeluaranKas) || 0;
    sumSisaKas += Number(r.sisaUangKasKecil) || 0;
    const fisik = Number(r.fisikRiil) || 0;
    sumFisikRiil += fisik;
    
    // Track Cash Taken vs Not Taken
    const isTaken = isRecordCashTaken(r);
    if (isTaken) {
      sumFisikSudahDiambil += fisik;
      countSudahDiambil++;
    } else {
      sumFisikBelumDiambil += fisik;
      countBelumDiambil++;
    }

    const diff = Number(r.selisih) || 0;
    sumSelisih += diff;
    if (diff === 0) pasCount++;
  });

  const porsiSD = sumTotalOmset > 0 ? ((sumShopDrive / sumTotalOmset) * 100).toFixed(1) : 0;
  const porsiBM = sumTotalOmset > 0 ? ((sumBimaMotor / sumTotalOmset) * 100).toFixed(1) : 0;
  const accuracyPct = state.filteredRecords.length > 0 ? ((pasCount / state.filteredRecords.length) * 100).toFixed(0) : 100;
  const avgDaily = state.filteredRecords.length > 0 ? Math.round(sumTotalOmset / state.filteredRecords.length) : 0;

  // Set element values
  setElText('kpiTotalOmset', utils.formatRupiah(sumTotalOmset));
  setElText('kpiPorsiShopDrive', `${utils.formatRupiah(sumShopDrive)} (${porsiSD}%)`);
  setElText('kpiPorsiBimaMotor', `${utils.formatRupiah(sumBimaMotor)} (${porsiBM}%)`);

  setElText('kpiShopDriveAmount', utils.formatRupiah(sumShopDrive));
  setElText('kpiShopDrivePct', `${porsiSD}% Dari Total`);

  setElText('kpiBimaMotorAmount', utils.formatRupiah(sumBimaMotor));
  setElText('kpiBimaMotorPct', `${porsiBM}% Dari Total`);

  setElText('kpiTransferMandiri', utils.formatRupiah(sumMandiri));
  setElText('kpiCardEdc', utils.formatRupiah(sumCardEdc));
  setElText('kpiTradeIn', utils.formatRupiah(sumTradeIn));

  setElText('kpiNonTunai', utils.formatRupiah(sumMandiri + sumCardEdc + sumTradeIn));
  setElText('kpiBiayaOps', utils.formatRupiah(sumBiayaOps));
  setElText('kpiBiayaOpsAlt', utils.formatRupiah(sumBiayaOps));
  setElText('kpiPengeluaranKas', utils.formatRupiah(sumPengeluaranKas));
  setElText('kpiSisaKas', utils.formatRupiah(sumSisaKas));
  setElText('kpiFisikRiil', utils.formatRupiah(sumFisikRiil));
  setElText('kpiKasBelumDiambil', utils.formatRupiah(sumFisikBelumDiambil));
  setElText('kpiCountBelumDiambil', `${countBelumDiambil} Shift Belum`);
  setElText('kpiKasSudahDiambil', utils.formatRupiah(sumFisikSudahDiambil));
  setElText('kpiCountSudahDiambil', `${countSudahDiambil} Shift Diambil`);
  renderTableFooter(sumShopDrive, sumBimaMotor, sumTotalOmset, sumMandiri, sumCardEdc, sumTradeIn, sumBiayaOps, sumSisaKas, sumFisikRiil, sumSelisih);
  setElText('kpiAvgDaily', utils.formatRupiah(avgDaily));

  const selisihEl = document.getElementById('kpiSelisih');
  if (selisihEl) {
    selisihEl.innerText = utils.formatRupiah(sumSelisih);
    if (sumSelisih === 0) {
      selisihEl.className = 'text-lg sm:text-xl font-black text-emerald-400 tracking-tight mt-1';
    } else if (sumSelisih > 0) {
      selisihEl.className = 'text-lg sm:text-xl font-black text-cyan-300 tracking-tight mt-1';
    } else {
      selisihEl.className = 'text-lg sm:text-xl font-black text-rose-400 tracking-tight mt-1';
    }
  }

  const accuracyBadge = document.getElementById('kpiAccuracyBadge');
  if (accuracyBadge) {
    accuracyBadge.innerText = `${accuracyPct}% Akurat (${pasCount}/${state.filteredRecords.length} Shift Pas)`;
  }
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

// --- RENDER CHARTS (Chart.js) ---
function renderCharts() {
  if (typeof Chart === 'undefined') return;

  // 1. Revenue Trend Chart (Chronological order)
  const sortedForChart = [...state.filteredRecords].sort((a, b) => new Date(a.tanggal || 0) - new Date(b.tanggal || 0));
  const labels = sortedForChart.map(r => r.tanggal ? r.tanggal.substring(5) : '-');
  const dataSD = sortedForChart.map(r => Number(r.penjualanShopDrive) || 0);
  const dataBM = sortedForChart.map(r => Number(r.penjualanBimaMotor) || 0);
  const dataTotal = sortedForChart.map(r => (Number(r.penjualanShopDrive) || 0) + (Number(r.penjualanBimaMotor) || 0));

  const ctxTrend = document.getElementById('chartRevenueTrend')?.getContext('2d');
  if (ctxTrend) {
    if (state.charts.revenueTrend) state.charts.revenueTrend.destroy();
    state.charts.revenueTrend = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Shop & Drive',
            data: dataSD,
            backgroundColor: 'rgba(245, 158, 11, 0.85)',
            borderColor: '#f59e0b',
            borderRadius: 6
          },
          {
            label: 'Bima Motor',
            data: dataBM,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderColor: '#3b82f6',
            borderRadius: 6
          },
          {
            type: 'line',
            label: 'Total Omset',
            data: dataTotal,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${utils.formatRupiah(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => 'Rp ' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000) + 'k'),
              font: { family: 'Plus Jakarta Sans', size: 10 }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // 2. Payment & Expense Breakdown Donut Chart
  let totalMandiri = 0, totalEdc = 0, totalTradeIn = 0, totalTunaiBersih = 0, totalBiayaOps = 0;
  state.filteredRecords.forEach(r => {
    totalMandiri += Number(r.transferMandiri) || 0;
    totalEdc += Number(r.cardEdc) || 0;
    totalTradeIn += Number(r.penghematanTradeIn) || 0;
    totalBiayaOps += Number(r.biayaOperasional) || 0;
    totalTunaiBersih += Math.max(0, (Number(r.fisikRiil) || Number(r.sisaUangKasKecil) || 0));
  });

  const ctxPayment = document.getElementById('chartPaymentBreakdown')?.getContext('2d');
  if (ctxPayment) {
    if (state.charts.paymentMethod) state.charts.paymentMethod.destroy();
    state.charts.paymentMethod = new Chart(ctxPayment, {
      type: 'doughnut',
      data: {
        labels: ['Bank Mandiri', 'Card / EDC', 'Trade In / Diskon', 'Biaya Ops Kasir', 'Uang Fisik Kas'],
        datasets: [{
          data: [totalMandiri, totalEdc, totalTradeIn, totalBiayaOps, totalTunaiBersih],
          backgroundColor: [
            '#0284c7', // Mandiri
            '#6366f1', // EDC
            '#f59e0b', // Trade in
            '#ef4444', // Biaya Ops
            '#10b981'  // Kas Tunai
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${utils.formatRupiah(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 3. Top Expense Categories Bar Chart
  const expenseMap = {};
  state.filteredRecords.forEach(r => {
    if (r.expenses && Array.isArray(r.expenses)) {
      r.expenses.forEach(e => {
        const desc = (e.desc || 'Biaya Lainnya').trim();
        expenseMap[desc] = (expenseMap[desc] || 0) + (Number(e.amount) || 0);
      });
    }
  });

  const expenseEntries = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const expLabels = expenseEntries.length > 0 ? expenseEntries.map(e => e[0].length > 18 ? e[0].substring(0, 16) + '..' : e[0]) : ['Bensin', 'Makan Siang', 'ATK'];
  const expValues = expenseEntries.length > 0 ? expenseEntries.map(e => e[1]) : [50000, 75000, 45000];

  const ctxExpense = document.getElementById('chartExpenseTop')?.getContext('2d');
  if (ctxExpense) {
    if (state.charts.expenseCategory) state.charts.expenseCategory.destroy();
    state.charts.expenseCategory = new Chart(ctxExpense, {
      type: 'bar',
      data: {
        labels: expLabels,
        datasets: [{
          label: 'Total Biaya',
          data: expValues,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: '#ef4444',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Pengeluaran: ${utils.formatRupiah(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (val) => 'Rp ' + (val >= 1000 ? (val / 1000) + 'k' : val),
              font: { family: 'Plus Jakarta Sans', size: 9 }
            },
            grid: { color: '#f8fafc' }
          },
          y: {
            ticks: { font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' } }
          }
        }
      }
    });
  }
}

// --- RENDER TABLE REKAPITULASI ---
function renderRekapTable() {
  const tbody = document.getElementById('tableRekapBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (state.filteredRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center py-8 text-slate-400">
          <i class="fa-solid fa-folder-open text-3xl mb-2 block text-slate-300"></i>
          Tidak ada data rekapitulasi yang cocok dengan filter yang dipilih.
        </td>
      </tr>
    `;
    return;
  }

  state.filteredRecords.forEach((r, idx) => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    const selisih = Number(r.selisih) || 0;
    const recordKey = r.id || r.tanggal;
    const isTaken = isRecordCashTaken(r);

    let badgeStatus = '';
    if (selisih === 0) {
      badgeStatus = `<span class="badge-pas px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5"><i class="fa-solid fa-check text-[9px]"></i> Pas (Rp 0)</span>`;
    } else if (selisih > 0) {
      badgeStatus = `<span class="badge-lebih px-1.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5"><i class="fa-solid fa-arrow-trend-up text-[9px]"></i> +${utils.formatRupiah(selisih)}</span>`;
    } else {
      badgeStatus = `<span class="badge-kurang px-1.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5"><i class="fa-solid fa-arrow-trend-down text-[9px]"></i> -${utils.formatRupiah(Math.abs(selisih))}</span>`;
    }

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-blue-50/40 transition cursor-pointer text-[11px]';
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">${r.tanggal || '-'}</td>
      <td class="py-2.5 px-3">
        <div class="font-bold text-slate-800 whitespace-nowrap">${r.kasir || 'Kasir'}</div>
        <div class="text-[9px] text-slate-400 whitespace-nowrap">${r.sumber || 'Folder UANG TUNAI'}</div>
      </td>
      <td class="py-2.5 px-2 font-bold text-amber-600 text-right whitespace-nowrap">${utils.formatRupiah(r.penjualanShopDrive)}</td>
      <td class="py-2.5 px-2 font-bold text-blue-600 text-right whitespace-nowrap">${utils.formatRupiah(r.penjualanBimaMotor)}</td>
      <td class="py-2.5 px-2.5 font-black text-slate-900 text-right bg-slate-50/70 whitespace-nowrap">${utils.formatRupiah(totalPemasukan)}</td>
      <td class="py-2.5 px-2 font-bold text-blue-700 text-right whitespace-nowrap bg-blue-50/20">${utils.formatRupiah(r.transferMandiri)}</td>
      <td class="py-2.5 px-2 font-bold text-indigo-700 text-right whitespace-nowrap bg-indigo-50/20">${utils.formatRupiah(r.cardEdc)}</td>
      <td class="py-2.5 px-2 font-bold text-purple-700 text-right whitespace-nowrap bg-purple-50/20">${utils.formatRupiah(r.penghematanTradeIn)}</td>
      <td class="py-2.5 px-2 font-semibold text-rose-600 text-right whitespace-nowrap">${utils.formatRupiah(r.biayaOperasional)}</td>
      <td class="py-2.5 px-2 font-bold text-slate-700 text-right whitespace-nowrap">${utils.formatRupiah(r.sisaUangKasKecil)}</td>
      <td class="py-2.5 px-2 font-bold text-slate-900 text-right whitespace-nowrap bg-emerald-50/30">${utils.formatRupiah(r.fisikRiil)}</td>
      <td class="py-2.5 px-2 text-center whitespace-nowrap">${badgeStatus}</td>
      <td class="py-2.5 px-1.5 text-center no-print whitespace-nowrap">
        <button type="button" class="btn-detail-row bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white px-2.5 py-1 rounded-lg transition shadow-2xs text-[10px] font-bold inline-flex items-center gap-1" data-id="${recordKey}" title="Lihat Berita Acara & Bon">
          <i class="fa-solid fa-eye text-[10px]"></i> Rincian
        </button>
      </td>
      <td class="py-2.5 px-2.5 text-center whitespace-nowrap">
        <label class="btn-cash-taken-label inline-flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1 rounded-lg border transition shadow-2xs ${isTaken ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}" title="Klik kotak cetrang untuk menandai status uang cash">
          <input type="checkbox" class="checkbox-cash-taken w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer" data-id="${recordKey}" ${isTaken ? 'checked' : ''}>
          <span class="text-[10px] font-bold ${isTaken ? 'text-emerald-700' : 'text-slate-500'}">
            ${isTaken ? '✓ Diambil' : 'Belum'}
          </span>
        </label>
      </td>
    `;

    // Row click handler to open details
    tr.querySelector('.btn-detail-row').addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(r);
    });
    tr.addEventListener('click', () => openDetailModal(r));

    // Checkbox toggle handler
    const chk = tr.querySelector('.checkbox-cash-taken');
    const lbl = tr.querySelector('.btn-cash-taken-label');
    if (chk) {
      chk.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const newStatus = chk.checked;
        setRecordCashTaken(recordKey, newStatus);
        showToast(
          newStatus
            ? `✓ Uang Cash tanggal ${r.tanggal || '-'} (${utils.formatRupiah(r.fisikRiil)}) ditandai SUDAH DIAMBIL`
            : `Uang Cash tanggal ${r.tanggal || '-'} ditandai BELUM DIAMBIL`,
          newStatus ? 'success' : 'info'
        );
        renderApp();
      });
    }
    if (lbl) {
      lbl.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    tbody.appendChild(tr);
  });
}

// --- RENDER EXPENSES TAB ---
function renderExpensesTab() {
  const container = document.getElementById('expenseItemsContainer');
  if (!container) return;

  const allExp = [];
  state.filteredRecords.forEach(r => {
    if (r.expenses && Array.isArray(r.expenses)) {
      r.expenses.forEach(e => {
        allExp.push({
          ...e,
          tanggal: r.tanggal,
          kasir: r.kasir
        });
      });
    }
  });

  container.innerHTML = '';

  if (allExp.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300"></i>
        <p class="text-xs">Belum ada item rincian bon pengeluaran operasional.</p>
      </div>
    `;
    return;
  }

  let sum = 0;
  allExp.forEach((item, idx) => {
    sum += Number(item.amount) || 0;
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-rose-200 transition';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-xs">
          ${idx + 1}
        </div>
        <div>
          <div class="text-xs font-bold text-slate-800">${item.desc || 'Pengeluaran Kasir'}</div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span><i class="fa-regular fa-calendar text-slate-300 mr-1"></i>${item.tanggal || '-'}</span>
            <span>•</span>
            <span><i class="fa-solid fa-user-tag text-slate-300 mr-1"></i>${item.kasir || 'Kasir'}</span>
          </div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-xs font-black text-rose-600">${utils.formatRupiah(item.amount)}</div>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Bon Valid</span>
      </div>
    `;
    container.appendChild(card);
  });

  setElText('totalBonExpenses', utils.formatRupiah(sum));
  setElText('countBonExpenses', `${allExp.length} Item Bon Terverifikasi`);
}

// --- RENDER COMPARISON TAB ---
function renderComparisonTab() {
  let totalSD = 0, totalBM = 0;
  state.filteredRecords.forEach(r => {
    totalSD += Number(r.penjualanShopDrive) || 0;
    totalBM += Number(r.penjualanBimaMotor) || 0;
  });

  const grandTotal = totalSD + totalBM;
  const pctSD = grandTotal > 0 ? ((totalSD / grandTotal) * 100).toFixed(1) : 0;
  const pctBM = grandTotal > 0 ? ((totalBM / grandTotal) * 100).toFixed(1) : 0;

  setElText('compTotalSD', utils.formatRupiah(totalSD));
  setElText('compPctSD', `${pctSD}% Kontribusi`);
  const barSD = document.getElementById('compProgressBarSD');
  if (barSD) barSD.style.width = `${pctSD}%`;

  setElText('compTotalBM', utils.formatRupiah(totalBM));
  setElText('compPctBM', `${pctBM}% Kontribusi`);
  const barBM = document.getElementById('compProgressBarBM');
  if (barBM) barBM.style.width = `${pctBM}%`;
}

// --- RENDER SOURCE INFO TAB ---
function renderSourceInfoTab() {
  const container = document.getElementById('scannedFilesContainer');
  if (!container) return;

  container.innerHTML = '';
  if (state.scannedFiles.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-200">
        Direktori target: <code class="font-bold text-blue-700">${state.targetFolder || 'C:\\Users\\Swanto\\OneDrive\\Desktop\\UANG TUNAI'}</code>
      </div>
    `;
    return;
  }

  state.scannedFiles.forEach(f => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm';
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg ${f.type === 'JSON' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold text-xs">
          ${f.type}
        </div>
        <div>
          <div class="font-bold text-xs text-slate-800">${f.name}</div>
          <div class="text-[10px] text-slate-400">${f.path}</div>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Terbaca</span>
    `;
    container.appendChild(row);
  });
}

// --- DETAIL MODAL (BERITA ACARA) ---
function openDetailModal(record) {
  state.selectedRecord = record;
  const modal = document.getElementById('detailModal');
  if (!modal) return;

  const totalPemasukan = Number(record.totalPemasukan) || (Number(record.penjualanShopDrive) + Number(record.penjualanBimaMotor)) || 0;
  const totalPengeluaran = Number(record.totalPengeluaranKas) || (Number(record.transferMandiri) + Number(record.cardEdc) + Number(record.penghematanTradeIn) + Number(record.biayaOperasional)) || 0;
  const sisaUang = Number(record.sisaUangKasKecil) || ((Number(record.saldoAwal) + totalPemasukan) - totalPengeluaran) || 0;
  const selisih = Number(record.selisih) || (Number(record.fisikRiil) - sisaUang) || 0;

  setElText('modalTanggal', utils.formatDateIndo(record.tanggal));
  setElText('modalKasir', record.kasir || 'Kasir (Shift 1)');
  setElText('modalSaldoAwal', utils.formatRupiah(record.saldoAwal));
  setElText('modalShopDrive', utils.formatRupiah(record.penjualanShopDrive));
  setElText('modalBimaMotor', utils.formatRupiah(record.penjualanBimaMotor));
  setElText('modalTotalPemasukan', utils.formatRupiah(totalPemasukan));

  setElText('modalTransferMandiri', utils.formatRupiah(record.transferMandiri));
  setElText('modalCardEdc', utils.formatRupiah(record.cardEdc));
  setElText('modalTradeIn', utils.formatRupiah(record.penghematanTradeIn));
  setElText('modalBiayaOps', utils.formatRupiah(record.biayaOperasional));
  setElText('modalTotalPengeluaran', utils.formatRupiah(totalPengeluaran));

  setElText('modalSisaKasKecil', utils.formatRupiah(sisaUang));
  setElText('modalFisikRiil', utils.formatRupiah(record.fisikRiil));

  const modalSelisih = document.getElementById('modalSelisih');
  if (modalSelisih) {
    modalSelisih.innerText = utils.formatRupiah(selisih);
    if (selisih === 0) modalSelisih.className = 'text-base font-black text-emerald-600';
    else if (selisih > 0) modalSelisih.className = 'text-base font-black text-blue-600';
    else modalSelisih.className = 'text-base font-black text-rose-600';
  }

  // Render expenses in modal
  const expContainer = document.getElementById('modalExpenseList');
  if (expContainer) {
    expContainer.innerHTML = '';
    if (record.expenses && Array.isArray(record.expenses) && record.expenses.length > 0) {
      record.expenses.forEach(e => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-xs py-1.5 border-b border-slate-100';
        div.innerHTML = `
          <span class="text-slate-700">${e.desc}</span>
          <span class="font-bold text-rose-600">${utils.formatRupiah(e.amount)}</span>
        `;
        expContainer.appendChild(div);
      });
    } else {
      expContainer.innerHTML = '<p class="text-xs text-slate-400 italic">Tidak ada rincian bon pengeluaran kasir.</p>';
    }
  }

  // Update Cash Taken status in modal
  const recordKey = record.id || record.tanggal;
  const isTaken = isRecordCashTaken(record);
  const modalCashContainer = document.getElementById('modalCashTakenContainer');
  const modalCashCheckbox = document.getElementById('modalCashTakenCheckbox');
  const modalCashText = document.getElementById('modalCashTakenText');
  const modalCashLabel = document.getElementById('modalCashTakenLabel');

  if (modalCashContainer && modalCashCheckbox && modalCashText && modalCashLabel) {
    modalCashCheckbox.checked = isTaken;
    if (isTaken) {
      modalCashContainer.className = 'p-3.5 rounded-2xl border bg-emerald-50/90 border-emerald-300 text-emerald-900';
      modalCashLabel.className = 'inline-flex items-center gap-2 cursor-pointer select-none px-3.5 py-1.5 rounded-xl border transition shadow-xs bg-emerald-100 border-emerald-300 text-emerald-800';
      modalCashText.innerText = '✓ Sudah Diambil';
    } else {
      modalCashContainer.className = 'p-3.5 rounded-2xl border bg-slate-50 border-slate-200 text-slate-700';
      modalCashLabel.className = 'inline-flex items-center gap-2 cursor-pointer select-none px-3.5 py-1.5 rounded-xl border transition shadow-xs bg-white border-slate-300 text-slate-600';
      modalCashText.innerText = 'Belum Diambil';
    }

    modalCashCheckbox.onchange = (e) => {
      const newStatus = e.target.checked;
      setRecordCashTaken(recordKey, newStatus);
      showToast(
        newStatus
          ? `✓ Status uang cash tanggal ${record.tanggal || '-'} ditandai SUDAH DIAMBIL`
          : `Status uang cash tanggal ${record.tanggal || '-'} ditandai BELUM DIAMBIL`,
        newStatus ? 'success' : 'info'
      );
      openDetailModal(record);
      renderRekapTable();
      renderKpiCards();
    };
  }

  setElText('modalCatatan', record.catatan || 'Tidak ada catatan serah terima tambahan.');

  modal.classList.remove('hidden');
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden');
}

// --- EXPORT & PRINT FUNCTIONS ---
function exportRekapToExcel() {
  if (state.filteredRecords.length === 0) {
    showToast('Tidak ada data untuk diekspor!', 'warning');
    return;
  }

  const delimiter = ';';
  const headers = [
    'Tanggal',
    'Kasir / Shift',
    'Saldo Awal Kas',
    'Penjualan Shop & Drive',
    'Penjualan Bima Motor',
    'Total Pemasukan',
    'Transfer Bank Mandiri',
    'Card / EDC',
    'Penghematan / Trade In',
    'Pengeluaran Biaya Operasional',
    'Total Pengeluaran Kas',
    'Sisa Uang di Kas Kecil',
    'Uang Fisik Riil Laci',
    'Selisih Kas',
    'Status Uang Cash Diambil',
    'Catatan / Rincian Bon'
  ];

  let csvContent = '\uFEFF' + headers.join(delimiter) + '\r\n';

  state.filteredRecords.forEach(r => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    const totalPengeluaran = Number(r.totalPengeluaranKas) || (Number(r.transferMandiri) + Number(r.cardEdc) + Number(r.penghematanTradeIn) + Number(r.biayaOperasional)) || 0;
    const sisaUang = Number(r.sisaUangKasKecil) || ((Number(r.saldoAwal) + totalPemasukan) - totalPengeluaran) || 0;
    const selisih = Number(r.selisih) || 0;
    const isTaken = isRecordCashTaken(r);

    let notes = r.catatan || '';
    if (r.expenses && Array.isArray(r.expenses) && r.expenses.length > 0) {
      const expStr = r.expenses.map(e => `${e.desc} (Rp ${Number(e.amount).toLocaleString('id-ID')})`).join(', ');
      notes = notes ? `${notes} | Bon: ${expStr}` : `Bon: ${expStr}`;
    }

    const row = [
      r.tanggal || '',
      `"${(r.kasir || '').replace(/"/g, '""')}"`,
      r.saldoAwal || 0,
      r.penjualanShopDrive || 0,
      r.penjualanBimaMotor || 0,
      totalPemasukan,
      r.transferMandiri || 0,
      r.cardEdc || 0,
      r.penghematanTradeIn || 0,
      r.biayaOperasional || 0,
      totalPengeluaran,
      sisaUang,
      r.fisikRiil || 0,
      selisih,
      isTaken ? 'Sudah Diambil' : 'Belum Diambil',
      `"${notes.replace(/"/g, '""')}"`
    ];

    csvContent += row.join(delimiter) + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekapitulasi_Kas_Bengkel_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('File Excel Rekapitulasi berhasil diunduh!', 'success');
}

function printReport() {
  window.print();
}

function buildPrintableReportElement() {
  const container = document.createElement('div');
  container.id = 'tempPdfReportContainer';
  container.style.width = '1040px';
  container.style.maxWidth = '1040px';
  container.style.margin = '0 auto';
  container.style.padding = '12px 14px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";
  container.style.fontSize = '8.5px';
  container.style.lineHeight = '1.3';
  container.style.boxSizing = 'border-box';

  // Calculate Aggregates
  let sumTotalOmset = 0;
  let sumShopDrive = 0;
  let sumBimaMotor = 0;
  let sumMandiri = 0;
  let sumCardEdc = 0;
  let sumTradeIn = 0;
  let sumBiayaOps = 0;
  let sumSisaKas = 0;
  let sumFisikRiil = 0;
  let sumSelisih = 0;
  let takenCount = 0;

  state.filteredRecords.forEach(r => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    sumTotalOmset += totalPemasukan;
    sumShopDrive += Number(r.penjualanShopDrive) || 0;
    sumBimaMotor += Number(r.penjualanBimaMotor) || 0;
    sumMandiri += Number(r.transferMandiri) || 0;
    sumCardEdc += Number(r.cardEdc) || 0;
    sumTradeIn += Number(r.penghematanTradeIn) || 0;
    sumBiayaOps += Number(r.biayaOperasional) || 0;
    sumSisaKas += Number(r.sisaUangKasKecil) || 0;
    sumFisikRiil += Number(r.fisikRiil) || 0;
    sumSelisih += (Number(r.selisih) || 0);
    if (isRecordCashTaken(r)) takenCount++;
  });

  const totalRecords = state.filteredRecords.length;
  const porsiSD = sumTotalOmset > 0 ? ((sumShopDrive / sumTotalOmset) * 100).toFixed(1) : 0;
  const porsiBM = sumTotalOmset > 0 ? ((sumBimaMotor / sumTotalOmset) * 100).toFixed(1) : 0;
  const nonTunaiTotal = sumMandiri + sumCardEdc + sumTradeIn;

  let filterText = 'Semua Periode';
  if (state.activeFilter === 'today') filterText = 'Hari Ini';
  else if (state.activeFilter === '7days') filterText = '7 Hari Terakhir';
  else if (state.activeFilter === 'this_month') filterText = 'Bulan Ini';
  else if (state.activeFilter === 'last_month') filterText = 'Bulan Lalu';
  else if (state.activeFilter === 'custom') filterText = `${state.customStartDate || '-'} s/d ${state.customEndDate || '-'}`;

  const printTime = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let rowsHtml = '';
  state.filteredRecords.forEach((r, idx) => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    const selisih = Number(r.selisih) || 0;
    const isTaken = isRecordCashTaken(r);

    let selBadge = '';
    if (selisih === 0) selBadge = '<span style="color: #047857; font-weight: bold;">✓ Pas</span>';
    else if (selisih > 0) selBadge = `<span style="color: #1d4ed8; font-weight: bold;">+${utils.formatRupiah(selisih)}</span>`;
    else selBadge = `<span style="color: #b91c1c; font-weight: bold;">-${utils.formatRupiah(Math.abs(selisih))}</span>`;

    const takenBadge = isTaken 
      ? '<span style="color: #166534; font-weight: bold;">✓ Ya</span>'
      : '<span style="color: #64748b;">Belum</span>';

    const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    rowsHtml += `
      <tr style="background: ${bgRow}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
        <td style="padding: 4px 3px; font-weight: 600; white-space: nowrap;">${r.tanggal || '-'}</td>
        <td style="padding: 4px 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <div style="font-weight: bold; color: #1e293b;">${r.kasir || 'Kasir'}</div>
        </td>
        <td style="padding: 4px 3px; text-align: right; color: #b45309; font-weight: bold; white-space: nowrap;">${utils.formatRupiah(r.penjualanShopDrive)}</td>
        <td style="padding: 4px 3px; text-align: right; color: #1d4ed8; font-weight: bold; white-space: nowrap;">${utils.formatRupiah(r.penjualanBimaMotor)}</td>
        <td style="padding: 4px 3px; text-align: right; font-weight: 800; color: #0f172a; background: rgba(241,245,249,0.7); white-space: nowrap;">${utils.formatRupiah(totalPemasukan)}</td>
        <td style="padding: 4px 3px; text-align: right; color: #1e40af; font-weight: bold; white-space: nowrap;">${utils.formatRupiah(r.transferMandiri)}</td>
        <td style="padding: 4px 3px; text-align: right; color: #4338ca; font-weight: bold; white-space: nowrap;">${utils.formatRupiah(r.cardEdc)}</td>
        <td style="padding: 4px 3px; text-align: right; color: #7e22ce; font-weight: bold; white-space: nowrap;">${utils.formatRupiah(r.penghematanTradeIn)}</td>
        <td style="padding: 4px 3px; text-align: right; color: #be123c; font-weight: 600; white-space: nowrap;">${utils.formatRupiah(r.biayaOperasional)}</td>
        <td style="padding: 4px 3px; text-align: right; font-weight: bold; color: #334155; white-space: nowrap;">${utils.formatRupiah(r.sisaUangKasKecil)}</td>
        <td style="padding: 4px 3px; text-align: right; font-weight: bold; color: #0f172a; white-space: nowrap;">${utils.formatRupiah(r.fisikRiil)}</td>
        <td style="padding: 4px 3px; text-align: center; white-space: nowrap;">${selBadge}</td>
        <td style="padding: 4px 3px; text-align: center; white-space: nowrap; font-size: 8px;">${takenBadge}</td>
      </tr>
    `;
  });

  const badgeTotalSelisih = sumSelisih === 0 
    ? '<span style="color: #047857; font-weight: 900;">✓ PAS (SESUAI)</span>' 
    : (sumSelisih > 0 ? `<span style="color: #1d4ed8; font-weight: 900;">+${utils.formatRupiah(sumSelisih)}</span>` : `<span style="color: #b91c1c; font-weight: 900;">-${utils.formatRupiah(Math.abs(sumSelisih))}</span>`);

  container.innerHTML = `
    <!-- HEADER LAPORAN -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="font-size: 15px; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">
          LAPORAN REKAPITULASI KAS & OMSET BENGKEL
        </h1>
        <div style="font-size: 11px; font-weight: 700; color: #2563eb; margin-top: 1px;">
          SHOP & DRIVE & BIMA MOTOR
        </div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
          Periode Data: <strong>${filterText}</strong> &nbsp;|&nbsp; Total: <strong>${totalRecords} Transaksi</strong> &nbsp;|&nbsp; Sumber: <strong>${state.targetFolder || 'Folder UANG TUNAI'}</strong>
        </div>
      </div>
      <div style="text-align: right; font-size: 9px; color: #475569;">
        <div>Dicetak: <strong>${printTime}</strong></div>
        <div style="margin-top: 2px; color: #059669; font-weight: bold;">Status: Dokumen Resmi Rekapitulasi Kas</div>
      </div>
    </div>

    <!-- EXECUTIVE SUMMARY CARDS -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;">
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px;">
        <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569;">Total Omset (Pemasukan)</div>
        <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 1px;">${utils.formatRupiah(sumTotalOmset)}</div>
        <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
          S&D: <strong>${utils.formatRupiah(sumShopDrive)} (${porsiSD}%)</strong><br>
          BM: <strong>${utils.formatRupiah(sumBimaMotor)} (${porsiBM}%)</strong>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px;">
        <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569;">Rincian Non-Tunai</div>
        <div style="font-size: 12px; font-weight: 900; color: #2563eb; margin-top: 1px;">${utils.formatRupiah(nonTunaiTotal)}</div>
        <div style="font-size: 8px; color: #64748b; margin-top: 1px; line-height: 1.2;">
          Mandiri: <strong>${utils.formatRupiah(sumMandiri)}</strong> | EDC: <strong>${utils.formatRupiah(sumCardEdc)}</strong><br>
          Tr-In: <strong>${utils.formatRupiah(sumTradeIn)}</strong> | Bon: <strong style="color: #be123c;">${utils.formatRupiah(sumBiayaOps)}</strong>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px;">
        <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569;">Jumlah Fisik Riil (Laci)</div>
        <div style="font-size: 12px; font-weight: 900; color: #047857; margin-top: 1px;">${utils.formatRupiah(sumFisikRiil)}</div>
        <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
          Sisa Kas Buku: <strong>${utils.formatRupiah(sumSisaKas)}</strong><br>
          Audit Selisih: ${badgeTotalSelisih}
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px;">
        <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569;">Status Pengambilan Cash</div>
        <div style="font-size: 12px; font-weight: 900; color: #0284c7; margin-top: 1px;">${takenCount} dari ${totalRecords} Shift</div>
        <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
          Status: <strong>${takenCount === totalRecords && totalRecords > 0 ? 'Semua Diambil (100%)' : `${takenCount} Diambil, ${totalRecords - takenCount} Belum`}</strong>
        </div>
      </div>
    </div>

    <!-- TABEL UTAMA REKAPITULASI (100% FIXED WIDTH, NO CUTOFF) -->
    <table style="width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed; margin-bottom: 12px;">
      <colgroup>
        <col style="width: 8.0%;">
        <col style="width: 9.0%;">
        <col style="width: 8.5%;">
        <col style="width: 8.0%;">
        <col style="width: 9.0%;">
        <col style="width: 8.5%;">
        <col style="width: 8.0%;">
        <col style="width: 7.5%;">
        <col style="width: 7.5%;">
        <col style="width: 8.0%;">
        <col style="width: 8.5%;">
        <col style="width: 5.5%;">
        <col style="width: 4.0%;">
      </colgroup>
      <thead>
        <tr style="background: #0f172a; color: #ffffff; text-align: left;">
          <th style="padding: 5px 3px; font-weight: 800; text-transform: uppercase;">Tanggal</th>
          <th style="padding: 5px 3px; font-weight: 800; text-transform: uppercase;">Kasir</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase;">Shop & Drive</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase;">Bima Motor</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase; background: #1e293b;">Total Omset</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase; color: #93c5fd;">Trf Mandiri</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase; color: #c7d2fe;">Card / EDC</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase; color: #e9d5ff;">Voucher</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase; color: #fca5a5;">Biaya Ops</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase;">Sisa Kas</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: right; text-transform: uppercase; color: #86efac;">Fisik Riil</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: center; text-transform: uppercase;">Audit</th>
          <th style="padding: 5px 3px; font-weight: 800; text-align: center; text-transform: uppercase;">Cash</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #e2e8f0; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a;">
          <td colspan="2" style="padding: 5px 3px; text-transform: uppercase;">TOTAL</td>
          <td style="padding: 5px 3px; text-align: right; color: #b45309;">${utils.formatRupiah(sumShopDrive)}</td>
          <td style="padding: 5px 3px; text-align: right; color: #1d4ed8;">${utils.formatRupiah(sumBimaMotor)}</td>
          <td style="padding: 5px 3px; text-align: right; background: #cbd5e1;">${utils.formatRupiah(sumTotalOmset)}</td>
          <td style="padding: 5px 3px; text-align: right; color: #1e40af;">${utils.formatRupiah(sumMandiri)}</td>
          <td style="padding: 5px 3px; text-align: right; color: #4338ca;">${utils.formatRupiah(sumCardEdc)}</td>
          <td style="padding: 5px 3px; text-align: right; color: #7e22ce;">${utils.formatRupiah(sumTradeIn)}</td>
          <td style="padding: 5px 3px; text-align: right; color: #be123c;">${utils.formatRupiah(sumBiayaOps)}</td>
          <td style="padding: 5px 3px; text-align: right;">${utils.formatRupiah(sumSisaKas)}</td>
          <td style="padding: 5px 3px; text-align: right; color: #047857;">${utils.formatRupiah(sumFisikRiil)}</td>
          <td style="padding: 5px 3px; text-align: center;">${badgeTotalSelisih}</td>
          <td style="padding: 5px 3px; text-align: center; font-size: 7.5px;">${takenCount}/${totalRecords}</td>
        </tr>
      </tfoot>
    </table>

    <!-- TANDA TANGAN / PENGESAHAN -->
    <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #475569; page-break-inside: avoid;">
      <div style="width: 28%;">
        <div>Petugas Kasir / Administrasi</div>
        <div style="height: 38px;"></div>
        <div style="border-top: 1px solid #94a3b8; padding-top: 3px; font-weight: bold; color: #0f172a;">( ${state.cashierFilter !== 'all' ? state.cashierFilter : 'Kasir Shift'} )</div>
      </div>
      <div style="width: 28%;">
        <div>Diperiksa Oleh (Supervisor)</div>
        <div style="height: 38px;"></div>
        <div style="border-top: 1px solid #94a3b8; padding-top: 3px; font-weight: bold; color: #0f172a;">( ........................................ )</div>
      </div>
      <div style="width: 28%;">
        <div>Disetujui Oleh (Pimpinan / Owner)</div>
        <div style="height: 38px;"></div>
        <div style="border-top: 1px solid #94a3b8; padding-top: 3px; font-weight: bold; color: #0f172a;">( ........................................ )</div>
      </div>
    </div>
  `;

  return container;
}

async function downloadReportPdf() {
  if (state.filteredRecords.length === 0) {
    showToast('Tidak ada data rekapitulasi untuk diunduh!', 'warning');
    return;
  }

  showLoading(true);
  showToast('Sedang menyusun Laporan PDF A4 Landscape presisi tinggi...', 'info');

  let wrapper = null;

  try {
    const reportElement = buildPrintableReportElement();

    // Create a temporary container in DOM for html2canvas to render accurately without offset bugs
    wrapper = document.createElement('div');
    wrapper.id = 'tempPdfRenderWrapper';
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '1040px';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.zIndex = '999999';
    wrapper.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.overflow = 'visible';
    wrapper.style.margin = '0 auto';
    wrapper.appendChild(reportElement);
    document.body.appendChild(wrapper);

    // Give DOM a moment to ensure fonts and layout dimensions are fully calculated
    await new Promise(resolve => setTimeout(resolve, 150));

    if (typeof html2pdf !== 'undefined') {
      const filename = `Laporan_Rekapitulasi_Kas_Bengkel_${new Date().toISOString().split('T')[0]}.pdf`;
      const opt = {
        margin: [10, 8, 10, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1040
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(reportElement).save();
      showToast('✓ Laporan PDF berhasil dibuat dan diunduh ke komputer Anda!', 'success');
    } else {
      console.warn('html2pdf library not ready, opening browser print dialog as PDF fallback');
      showToast('Membuka dialog cetak browser (Pilih Simpan sebagai PDF)...', 'info');
      window.print();
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('Membuka dialog cetak browser untuk menyimpan PDF...', 'info');
    window.print();
  } finally {
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    showLoading(false);
  }
}

// --- FILE UPLOAD HANDLER ---
function handleFileUpload(file) {
  if (!file) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target.result;
    if (file.name.endsWith('.json')) {
      try {
        const json = JSON.parse(content);
        const imported = Array.isArray(json) ? json : (json.records || []);
        if (imported.length > 0) {
          state.allRecords = [...imported, ...state.allRecords];
          // deduplicate by id/tanggal
          const unique = [];
          const seen = new Set();
          state.allRecords.forEach(r => {
            const key = r.id || r.tanggal;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(r);
            }
          });
          state.allRecords = unique;
          renderApp();
          showToast(`Berhasil mengimpor ${imported.length} transaksi dari file JSON!`, 'success');
          closeImportModal();
        }
      } catch (err) {
        showToast('Format file JSON tidak valid!', 'error');
      }
    } else if (file.name.endsWith('.csv')) {
      try {
        const parsed = parseCsvClient(content);
        if (parsed.length > 0) {
          state.allRecords = [...parsed, ...state.allRecords];
          renderApp();
          showToast(`Berhasil mengimpor ${parsed.length} transaksi dari CSV!`, 'success');
          closeImportModal();
        }
      } catch (err) {
        showToast('Gagal memproses file CSV!', 'error');
      }
    }
  };

  reader.readAsText(file);
}

function parseCsvClient(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3 || !cols[0] || cols[0].startsWith('=')) continue;

    const parseNum = (v) => {
      if (!v) return 0;
      if (typeof v === 'string' && v.startsWith('=')) return 0;
      const clean = v.toString().replace(/[^0-9-]/g, '');
      return parseInt(clean, 10) || 0;
    };

    records.push({
      id: 'IMPORT-' + Date.now() + '-' + i,
      tanggal: cols[0],
      kasir: cols[1] || 'Kasir',
      saldoAwal: parseNum(cols[2]),
      penjualanShopDrive: parseNum(cols[3]),
      penjualanBimaMotor: parseNum(cols[4]),
      totalPemasukan: parseNum(cols[5]) || (parseNum(cols[3]) + parseNum(cols[4])),
      transferMandiri: parseNum(cols[6]),
      cardEdc: parseNum(cols[7]),
      penghematanTradeIn: parseNum(cols[8]),
      biayaOperasional: parseNum(cols[9]),
      totalPengeluaranKas: parseNum(cols[10]),
      sisaUangKasKecil: parseNum(cols[11]),
      fisikRiil: parseNum(cols[12]),
      selisih: parseNum(cols[13]),
      catatan: cols[14] || '',
      sumber: 'File Import CSV'
    });
  }

  return records;
}

// --- TOAST & LOADING UI ---
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : (type === 'warning' ? 'bg-amber-600' : 'bg-slate-800'));
  toast.className = `${bg} text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold transition-all duration-300`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info')}"></i>
    <span>${msg}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showLoading(show) {
  const el = document.getElementById('globalLoadingSpinner');
  if (el) {
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
}

function openImportModal() {
  document.getElementById('importModal')?.classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('importModal')?.classList.add('hidden');
}

// --- EVENT LISTENERS INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initializeData();

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.target;
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
      document.getElementById(target)?.classList.remove('hidden');
    });
  });

  // Filter Preset Buttons
  document.querySelectorAll('.filter-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-date-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
        b.classList.add('bg-slate-100', 'text-slate-600');
      });
      btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
      btn.classList.remove('bg-slate-100', 'text-slate-600');

      state.activeFilter = btn.dataset.filter;
      const customRangeContainer = document.getElementById('customRangeContainer');
      if (state.activeFilter === 'custom') {
        customRangeContainer?.classList.remove('hidden');
      } else {
        customRangeContainer?.classList.add('hidden');
      }
      renderApp();
    });
  });

  // Custom Date Input Listeners
  document.getElementById('customStartDate')?.addEventListener('change', (e) => {
    state.customStartDate = e.target.value;
    renderApp();
  });
  document.getElementById('customEndDate')?.addEventListener('change', (e) => {
    state.customEndDate = e.target.value;
    renderApp();
  });

  // Select Filters
  document.getElementById('selectKasir')?.addEventListener('change', (e) => {
    state.cashierFilter = e.target.value;
    renderApp();
  });
  document.getElementById('selectStatusSelisih')?.addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    renderApp();
  });
  document.getElementById('selectStatusCash')?.addEventListener('change', (e) => {
    state.cashTakenFilter = e.target.value;
    renderApp();
  });

  // Search Input
  document.getElementById('inputSearchRekap')?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderApp();
  });

  // Reload / Sync Data Button
  document.getElementById('btnReloadData')?.addEventListener('click', () => {
    initializeData();
  });

  // Export & Print Buttons
  document.getElementById('btnExportExcel')?.addEventListener('click', exportRekapToExcel);
  document.getElementById('btnPrintReport')?.addEventListener('click', printReport);
  document.getElementById('btnDownloadPdf')?.addEventListener('click', downloadReportPdf);

  // Modal Close Handlers
  document.getElementById('btnCloseDetailModal')?.addEventListener('click', closeDetailModal);
  document.getElementById('btnImportModal')?.addEventListener('click', openImportModal);
  document.getElementById('btnCloseImportModal')?.addEventListener('click', closeImportModal);

  // Drag & Drop File Upload
  const dropZone = document.getElementById('dropZoneUpload');
  const fileInput = document.getElementById('fileInputUpload');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50/50');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50/50');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }
});

function renderTableFooter(sd, bm, total, mandiri, cardEdc, tradeIn, ops, sisa, fisik, selisih) {
  const tfoot = document.getElementById('tableRekapFoot');
  if (!tfoot) return;
  
  let badgeSelisih = '';
  if (selisih === 0) {
    badgeSelisih = '<span class="badge-pas px-2 py-0.5 rounded-full text-[10px] font-bold">✓ Pas</span>';
  } else if (selisih > 0) {
    badgeSelisih = '<span class="badge-lebih px-1.5 py-0.5 rounded-full text-[10px] font-bold">+' + utils.formatRupiah(selisih) + '</span>';
  } else {
    badgeSelisih = '<span class="badge-kurang px-1.5 py-0.5 rounded-full text-[10px] font-bold">-' + utils.formatRupiah(Math.abs(selisih)) + '</span>';
  }

  const totalCount = state.filteredRecords.length;
  const takenCount = state.filteredRecords.filter(r => isRecordCashTaken(r)).length;
  const allTaken = totalCount > 0 && takenCount === totalCount;

  tfoot.innerHTML = `
    <tr class="text-[11px]">
      <td colspan="2" class="py-2.5 px-3 uppercase tracking-wider text-slate-800 whitespace-nowrap">
        <i class="fa-solid fa-calculator mr-1 text-blue-600"></i> TOTAL REKAP
      </td>
      <td class="py-2.5 px-2 text-right text-amber-700 whitespace-nowrap">${utils.formatRupiah(sd)}</td>
      <td class="py-2.5 px-2 text-right text-blue-700 whitespace-nowrap">${utils.formatRupiah(bm)}</td>
      <td class="py-2.5 px-2.5 text-right text-slate-950 bg-slate-200/70 whitespace-nowrap font-black">${utils.formatRupiah(total)}</td>
      <td class="py-2.5 px-2 text-right text-blue-800 whitespace-nowrap font-bold bg-blue-50/40">${utils.formatRupiah(mandiri)}</td>
      <td class="py-2.5 px-2 text-right text-indigo-800 whitespace-nowrap font-bold bg-indigo-50/40">${utils.formatRupiah(cardEdc)}</td>
      <td class="py-2.5 px-2 text-right text-purple-800 whitespace-nowrap font-bold bg-purple-50/40">${utils.formatRupiah(tradeIn)}</td>
      <td class="py-2.5 px-2 text-right text-rose-700 whitespace-nowrap">${utils.formatRupiah(ops)}</td>
      <td class="py-2.5 px-2 text-right text-slate-800 whitespace-nowrap">${utils.formatRupiah(sisa)}</td>
      <td class="py-2.5 px-2 text-right text-emerald-700 bg-emerald-50/50 whitespace-nowrap font-black">${utils.formatRupiah(fisik)}</td>
      <td class="py-2.5 px-2 text-center whitespace-nowrap">${badgeSelisih}</td>
      <td class="py-2.5 px-1.5 text-center no-print whitespace-nowrap">-</td>
      <td class="py-2.5 px-2.5 text-center whitespace-nowrap">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${allTaken ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : (takenCount > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-200/80 text-slate-700')}">
          ${takenCount}/${totalCount} Diambil
        </span>
      </td>
    </tr>
  `;
}
