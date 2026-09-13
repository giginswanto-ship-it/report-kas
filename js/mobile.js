/**
 * PROGRAM PEMBACA REKAPITULASI KAS BENGKEL - MOBILE ENGINE
 */

const mState = {
  allRecords: [],
  filteredRecords: [],
  activeFilter: 'all', // 'all', 'today', '7days', 'this_month'
  activeTab: 'navRekap', // 'navRekap', 'navCharts', 'navExpenses', 'navShare', 'navSettings'
  selectedRecord: null,
  charts: {
    mobileTrend: null,
    mobilePayment: null
  }
};

const mUtils = {
  formatRupiah(num) {
    const val = Number(num) || 0;
    return 'Rp ' + Math.floor(val).toLocaleString('id-ID');
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

async function initMobileData() {
  showMobileSpinner(true);
  try {
    const res = await fetch('/api/rekap').catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      mState.allRecords = data.records || [];
      renderMobileView();
      showMobileToast('Data kas berhasil disinkronkan', 'success');
      showMobileSpinner(false);
      return;
    }
  } catch (e) {
    console.warn('API error, checking direct localhost:3000...');
  }

  // Fallback to localhost:3000 direct
  try {
    const directRes = await fetch('http://localhost:3000/api/records').catch(() => null);
    if (directRes && directRes.ok) {
      const records = await directRes.json();
      if (Array.isArray(records) && records.length > 0) {
        mState.allRecords = records;
        renderMobileView();
        showMobileToast('Terhubung ke Server Kas Bengkel', 'success');
        showMobileSpinner(false);
        return;
      }
    }
  } catch (e) {
    console.warn('Direct connect failed');
  }

  // Fallback sample data
  mState.allRecords = [
    {
      id: 'REC-M01',
      tanggal: '2026-09-13',
      kasir: 'Adis Setiawan',
      saldoAwal: 500000,
      penjualanShopDrive: 18319530,
      penjualanBimaMotor: 500000,
      totalPemasukan: 18819530,
      transferMandiri: 12000000,
      cardEdc: 5500000,
      penghematanTradeIn: 250000,
      biayaOperasional: 75000,
      totalPengeluaranKas: 17825000,
      sisaUangKasKecil: 585020,
      fisikRiil: 585000,
      selisih: -20,
      catatan: 'Bensin antar aki dan makan siang tim mekanik',
      expenses: [
        { id: 1, desc: 'Bensin Antar Aki', amount: 35000 },
        { id: 2, desc: 'Makan Siang Mekanik', amount: 40000 }
      ],
      sumber: 'Folder UANG TUNAI'
    },
    {
      id: 'REC-M02',
      tanggal: '2026-09-12',
      kasir: 'Kasir Shift 1',
      saldoAwal: 500000,
      penjualanShopDrive: 19063058,
      penjualanBimaMotor: 600000,
      totalPemasukan: 19663058,
      transferMandiri: 14000000,
      cardEdc: 4800000,
      penghematanTradeIn: 250000,
      biayaOperasional: 30000,
      totalPengeluaranKas: 19080000,
      sisaUangKasKecil: 157508,
      fisikRiil: 1585000,
      selisih: 992,
      catatan: 'Nota ATK struk kasir',
      expenses: [
        { id: 1, desc: 'Kertas Struk Kasir', amount: 30000 }
      ],
      sumber: 'Folder UANG TUNAI'
    },
    {
      id: 'REC-M03',
      tanggal: '2026-09-11',
      kasir: 'Kasir Shift 2',
      saldoAwal: 500000,
      penjualanShopDrive: 13140040,
      penjualanBimaMotor: 100000,
      totalPemasukan: 13240040,
      transferMandiri: 9000000,
      cardEdc: 2500000,
      penghematanTradeIn: 200000,
      biayaOperasional: 0,
      totalPengeluaranKas: 11700000,
      sisaUangKasKecil: 1975020,
      fisikRiil: 1975000,
      selisih: -20,
      catatan: 'Serah terima kasir lengkap',
      expenses: [],
      sumber: 'Folder UANG TUNAI'
    }
  ];
  renderMobileView();
  showMobileSpinner(false);
}

function applyMobileFilters() {
  let list = [...mState.allRecords];
  const now = new Date();

  if (mState.activeFilter === 'today') {
    const todayStr = now.toISOString().split('T')[0];
    list = list.filter(r => r.tanggal === todayStr);
  } else if (mState.activeFilter === '7days') {
    const sevenAgo = new Date();
    sevenAgo.setDate(now.getDate() - 7);
    list = list.filter(r => new Date(r.tanggal) >= sevenAgo);
  } else if (mState.activeFilter === 'this_month') {
    const prefix = now.toISOString().substring(0, 7);
    list = list.filter(r => r.tanggal && r.tanggal.startsWith(prefix));
  }

  mState.filteredRecords = list;
}

function renderMobileView() {
  applyMobileFilters();
  renderMobileKpi();
  renderMobileCards();
  renderMobileExpenses();
  renderMobileCharts();
}

function renderMobileKpi() {
  let sumFisik = 0;
  let sumOmset = 0;
  let sumSD = 0;
  let sumBM = 0;
  let sumOps = 0;
  let sumSisa = 0;
  let sumSelisih = 0;

  mState.filteredRecords.forEach(r => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    sumOmset += totalPemasukan;
    sumSD += Number(r.penjualanShopDrive) || 0;
    sumBM += Number(r.penjualanBimaMotor) || 0;
    sumOps += Number(r.biayaOperasional) || 0;
    sumSisa += Number(r.sisaUangKasKecil) || 0;
    sumFisik += Number(r.fisikRiil) || 0;
    sumSelisih += Number(r.selisih) || 0;
  });

  const pSD = sumOmset > 0 ? ((sumSD / sumOmset) * 100).toFixed(0) : 0;
  const pBM = sumOmset > 0 ? ((sumBM / sumOmset) * 100).toFixed(0) : 0;

  // Header & Top Cards
  setEl('mKpiFisikRiil', mUtils.formatRupiah(sumFisik));
  setEl('mKpiSisaKas', mUtils.formatRupiah(sumSisa));
  setEl('mKpiTotalOmset', mUtils.formatRupiah(sumOmset));
  setEl('mKpiShopDrive', mUtils.formatRupiah(sumSD));
  setEl('mKpiPorsiSD', pSD + '%');
  setEl('mKpiBimaMotor', mUtils.formatRupiah(sumBM));
  setEl('mKpiPorsiBM', pBM + '%');
  setEl('mKpiBiayaOps', mUtils.formatRupiah(sumOps));

  const selisihEl = document.getElementById('mKpiSelisih');
  if (selisihEl) {
    selisihEl.innerText = mUtils.formatRupiah(sumSelisih);
    if (sumSelisih === 0) selisihEl.className = 'text-xs font-black text-emerald-400';
    else if (sumSelisih > 0) selisihEl.className = 'text-xs font-black text-blue-400';
    else selisihEl.className = 'text-xs font-black text-rose-400';
  }

  setEl('mRecordCount', mState.filteredRecords.length + ' Transaksi');
}

function renderMobileCards() {
  const container = document.getElementById('mCardsContainer');
  if (!container) return;

  container.innerHTML = '';

  if (mState.filteredRecords.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200">
        <i class="fa-solid fa-receipt text-4xl text-slate-300 mb-3"></i>
        <p class="text-xs font-bold text-slate-600">Tidak ada data transaksi</p>
        <p class="text-[11px] text-slate-400 mt-1">Coba ubah filter periode waktu di atas</p>
      </div>
    `;
    return;
  }

  mState.filteredRecords.forEach((r) => {
    const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
    const selisih = Number(r.selisih) || 0;

    let badge = '';
    if (selisih === 0) {
      badge = '<span class="badge-pas px-2 py-0.5 rounded-full text-[10px] font-bold"><i class="fa-solid fa-check mr-0.5"></i> Pas</span>';
    } else if (selisih > 0) {
      badge = '<span class="badge-lebih px-2 py-0.5 rounded-full text-[10px] font-bold"><i class="fa-solid fa-arrow-up mr-0.5"></i> +' + mUtils.formatRupiah(selisih) + '</span>';
    } else {
      badge = '<span class="badge-kurang px-2 py-0.5 rounded-full text-[10px] font-bold"><i class="fa-solid fa-arrow-down mr-0.5"></i> -' + mUtils.formatRupiah(Math.abs(selisih)) + '</span>';
    }

    const card = document.createElement('div');
    card.className = 'touch-card bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-3 cursor-pointer hover:border-blue-400';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">${mUtils.formatDateIndo(r.tanggal)}</span>
          <h3 class="text-sm font-black text-slate-900 mt-0.5">${r.kasir || 'Kasir'}</h3>
        </div>
        <div>${badge}</div>
      </div>

      <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl text-xs border border-slate-100">
        <div>
          <span class="text-[10px] text-amber-700 font-bold block">Shop & Drive</span>
          <span class="font-extrabold text-slate-800 text-xs">${mUtils.formatRupiah(r.penjualanShopDrive)}</span>
        </div>
        <div>
          <span class="text-[10px] text-blue-700 font-bold block">Bima Motor</span>
          <span class="font-extrabold text-slate-800 text-xs">${mUtils.formatRupiah(r.penjualanBimaMotor)}</span>
        </div>
      </div>

      <div class="flex justify-between items-center pt-1 text-xs">
        <div>
          <span class="text-[10px] text-slate-400 font-medium block">Total Omset</span>
          <span class="font-black text-slate-900">${mUtils.formatRupiah(totalPemasukan)}</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-emerald-600 font-bold block">Fisik Riil Laci</span>
          <span class="font-black text-emerald-700">${mUtils.formatRupiah(r.fisikRiil)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openMobileDrawer(r));
    container.appendChild(card);
  });
}

function renderMobileExpenses() {
  const container = document.getElementById('mExpenseListContainer');
  if (!container) return;

  const allExp = [];
  mState.filteredRecords.forEach(r => {
    if (r.expenses && Array.isArray(r.expenses)) {
      r.expenses.forEach(e => allExp.push({ ...e, tanggal: r.tanggal, kasir: r.kasir }));
    }
  });

  container.innerHTML = '';
  if (allExp.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400 bg-white rounded-3xl border border-slate-200 p-4">
        <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300"></i>
        <p class="text-xs">Tidak ada bon operasional pada periode ini.</p>
      </div>
    `;
    return;
  }

  let totalExp = 0;
  allExp.forEach((e, idx) => {
    totalExp += Number(e.amount) || 0;
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm';
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center">
          ${idx + 1}
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-800">${e.desc}</h4>
          <span class="text-[10px] text-slate-400">${e.tanggal} • ${e.kasir || 'Kasir'}</span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs font-black text-rose-600">${mUtils.formatRupiah(e.amount)}</span>
      </div>
    `;
    container.appendChild(item);
  });

  setEl('mTotalExpenseTab', mUtils.formatRupiah(totalExp));
}

function renderMobileCharts() {
  if (typeof Chart === 'undefined') return;

  const sorted = [...mState.filteredRecords].sort((a, b) => new Date(a.tanggal || 0) - new Date(b.tanggal || 0));
  const labels = sorted.map(r => r.tanggal ? r.tanggal.substring(5) : '-');
  const dataSD = sorted.map(r => Number(r.penjualanShopDrive) || 0);
  const dataBM = sorted.map(r => Number(r.penjualanBimaMotor) || 0);

  const ctxTrend = document.getElementById('mChartTrend')?.getContext('2d');
  if (ctxTrend) {
    if (mState.charts.mobileTrend) mState.charts.mobileTrend.destroy();
    mState.charts.mobileTrend = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Shop & Drive', data: dataSD, backgroundColor: '#f59e0b', borderRadius: 4 },
          { label: 'Bima Motor', data: dataBM, backgroundColor: '#3b82f6', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: {
          x: { ticks: { font: { size: 9 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { font: { size: 9 }, callback: v => (v / 1000000).toFixed(1) + 'M' } }
        }
      }
    });
  }
}

// Drawer Bottom Sheet
function openMobileDrawer(r) {
  mState.selectedRecord = r;
  const sheet = document.getElementById('mDetailBottomSheet');
  const backdrop = document.getElementById('mDrawerBackdrop');
  if (!sheet || !backdrop) return;

  const totalPemasukan = Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0;
  const totalPengeluaran = Number(r.totalPengeluaranKas) || (Number(r.transferMandiri) + Number(r.cardEdc) + Number(r.penghematanTradeIn) + Number(r.biayaOperasional)) || 0;
  const sisaKas = Number(r.sisaUangKasKecil) || 0;
  const selisih = Number(r.selisih) || 0;

  setEl('drwTanggal', mUtils.formatDateIndo(r.tanggal));
  setEl('drwKasir', r.kasir || 'Kasir');
  setEl('drwSaldoAwal', mUtils.formatRupiah(r.saldoAwal));
  setEl('drwShopDrive', mUtils.formatRupiah(r.penjualanShopDrive));
  setEl('drwBimaMotor', mUtils.formatRupiah(r.penjualanBimaMotor));
  setEl('drwTotalOmset', mUtils.formatRupiah(totalPemasukan));

  setEl('drwMandiri', mUtils.formatRupiah(r.transferMandiri));
  setEl('drwEdc', mUtils.formatRupiah(r.cardEdc));
  setEl('drwTradeIn', mUtils.formatRupiah(r.penghematanTradeIn));
  setEl('drwBiayaOps', mUtils.formatRupiah(r.biayaOperasional));
  setEl('drwTotalPengeluaran', mUtils.formatRupiah(totalPengeluaran));

  setEl('drwSisaKas', mUtils.formatRupiah(sisaKas));
  setEl('drwFisikRiil', mUtils.formatRupiah(r.fisikRiil));

  const selEl = document.getElementById('drwSelisih');
  if (selEl) {
    selEl.innerText = mUtils.formatRupiah(selisih);
    selEl.className = selisih === 0 ? 'text-sm font-black text-emerald-600' : (selisih > 0 ? 'text-sm font-black text-blue-600' : 'text-sm font-black text-rose-600');
  }

  // Bon items in drawer
  const expBox = document.getElementById('drwExpensesContainer');
  if (expBox) {
    expBox.innerHTML = '';
    if (r.expenses && Array.isArray(r.expenses) && r.expenses.length > 0) {
      r.expenses.forEach(e => {
        const d = document.createElement('div');
        d.className = 'flex justify-between items-center text-xs py-1 border-b border-slate-100';
        d.innerHTML = `<span>${e.desc}</span><span class="font-bold text-rose-600">${mUtils.formatRupiah(e.amount)}</span>`;
        expBox.appendChild(d);
      });
    } else {
      expBox.innerHTML = '<span class="text-[11px] text-slate-400 italic">Tidak ada bon operasional</span>';
    }
  }

  setEl('drwCatatan', r.catatan || 'Tidak ada catatan tambahan.');

  backdrop.classList.remove('hidden');
  sheet.classList.remove('closed');
  sheet.classList.add('open');
}

function closeMobileDrawer() {
  const sheet = document.getElementById('mDetailBottomSheet');
  const backdrop = document.getElementById('mDrawerBackdrop');
  if (sheet) {
    sheet.classList.remove('open');
    sheet.classList.add('closed');
  }
  if (backdrop) backdrop.classList.add('hidden');
}

// WhatsApp Summary Share
function shareToWhatsApp() {
  let sumOmset = 0, sumSD = 0, sumBM = 0, sumOps = 0, sumFisik = 0, sumSelisih = 0;
  mState.filteredRecords.forEach(r => {
    sumOmset += (Number(r.totalPemasukan) || (Number(r.penjualanShopDrive) + Number(r.penjualanBimaMotor)) || 0);
    sumSD += Number(r.penjualanShopDrive) || 0;
    sumBM += Number(r.penjualanBimaMotor) || 0;
    sumOps += Number(r.biayaOperasional) || 0;
    sumFisik += Number(r.fisikRiil) || 0;
    sumSelisih += Number(r.selisih) || 0;
  });

  const periodName = mState.activeFilter === 'today' ? 'Hari Ini' : (mState.activeFilter === 'this_month' ? 'Bulan Ini' : 'Semua Periode');
  const text = `*📊 LAPORAN REKAPITULASI KAS BENGKEL*
*Shop & Drive & Bima Motor*
📅 Periode: ${periodName} (${new Date().toLocaleDateString('id-ID')})

💰 *Total Omset:* ${mUtils.formatRupiah(sumOmset)}
• Shop & Drive: ${mUtils.formatRupiah(sumSD)}
• Bima Motor: ${mUtils.formatRupiah(sumBM)}

🧾 *Biaya Bon Operasional:* ${mUtils.formatRupiah(sumOps)}
💵 *JUMLAH FISIK RIIL LACI:* ${mUtils.formatRupiah(sumFisik)}
⚖️ *Total Selisih:* ${mUtils.formatRupiah(sumSelisih)} (${sumSelisih === 0 ? 'SESUAI/PAS' : (sumSelisih > 0 ? 'SURPLUS' : 'DEFISIT')})

_Laporan otomatis dari Aplikasi Mobile Rekap Kas Bengkel_`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}

function showMobileToast(msg, type = 'info') {
  const toast = document.getElementById('mToast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.remove('hidden', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

function showMobileSpinner(show) {
  const s = document.getElementById('mSpinner');
  if (s) {
    if (show) s.classList.remove('hidden');
    else s.classList.add('hidden');
  }
}

// Navigation Tabs
document.addEventListener('DOMContentLoaded', () => {
  initMobileData();

  // Bottom Nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetView = btn.dataset.view;
      document.querySelectorAll('.mobile-view-section').forEach(v => v.classList.add('hidden'));
      document.getElementById(targetView)?.classList.remove('hidden');
    });
  });

  // Filter Pills
  document.querySelectorAll('.m-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.m-filter-pill').forEach(p => {
        p.classList.remove('bg-blue-600', 'text-white');
        p.classList.add('bg-white', 'text-slate-600');
      });
      pill.classList.add('bg-blue-600', 'text-white');
      pill.classList.remove('bg-white', 'text-slate-600');

      mState.activeFilter = pill.dataset.filter;
      renderMobileView();
    });
  });

  // Sync Button
  document.getElementById('mBtnSync')?.addEventListener('click', () => {
    initMobileData();
  });

  // WhatsApp Share Button
  document.getElementById('mBtnShareWa')?.addEventListener('click', shareToWhatsApp);
  document.getElementById('mBtnQuickWa')?.addEventListener('click', shareToWhatsApp);

  // Drawer Close
  document.getElementById('mBtnCloseDrawer')?.addEventListener('click', closeMobileDrawer);
  document.getElementById('mDrawerBackdrop')?.addEventListener('click', closeMobileDrawer);
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA Service Worker registered:', reg.scope))
      .catch(err => console.warn('PWA registration failed:', err));
  });
}
