(() => {
  'use strict';

  const REPORT_STORAGE_KEY = 'angeliz_branch_daily_reports_v1';
  const DELIVERY_STORAGE_KEY = 'angeliz_branch_deliveries_v1';
  const TRANSACTION_STORAGE_KEY = 'angeliz_pos_transactions';
  const managerName = document.querySelector('.ac-name')?.textContent.trim() || 'Branch Manager';
  const branchName = 'Yashano Mall Branch';
  const form = document.getElementById('dailyReportForm');
  const reportDate = document.getElementById('reportDate');
  const dateLabel = document.getElementById('headerDate');
  const numberFields = ['successCake', 'successGrazing', 'successBuffet', 'successBundles', 'successPackages'];

  function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error(`Could not read ${key}.`, error);
      return [];
    }
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 320);
    }, 2800);
  }

  function transactionsForDate(date) {
    return readArray(TRANSACTION_STORAGE_KEY).filter(transaction => {
      if (!transaction || typeof transaction.timestamp !== 'string') return false;
      const timestamp = new Date(transaction.timestamp);
      return !Number.isNaN(timestamp.getTime()) && localDate(timestamp) === date;
    });
  }

  function renderAutoFields() {
    const transactions = transactionsForDate(reportDate.value);
    const posSales = transactions.reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0);
    document.getElementById('posTxnCount').textContent = String(transactions.length);
    document.getElementById('posSalesTotal').textContent = formatMoney(posSales);

    const deliveries = readArray(DELIVERY_STORAGE_KEY).filter(delivery => delivery?.deliveryDate === reportDate.value);
    const box = document.getElementById('deliveryLogBox');
    box.replaceChildren();
    if (!deliveries.length) {
      const empty = document.createElement('div');
      empty.className = 'auto-label';
      empty.textContent = 'No delivery receipts were recorded for this date.';
      box.appendChild(empty);
      return;
    }

    let totalUnits = 0;
    deliveries.forEach(delivery => {
      const heading = document.createElement('div');
      heading.className = 'auto-row';
      const label = document.createElement('span');
      label.className = 'auto-label';
      label.textContent = `${delivery.reference || 'Delivery'} · ${delivery.source || 'Supplier not specified'}`;
      const total = document.createElement('span');
      total.className = 'auto-value';
      const units = (Array.isArray(delivery.items) ? delivery.items : []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      totalUnits += units;
      total.textContent = `${units} pcs`;
      box.append(heading);
      heading.append(label, total);
      (Array.isArray(delivery.items) ? delivery.items : []).forEach(item => {
        const row = document.createElement('div');
        row.className = 'auto-row';
        const itemLabel = document.createElement('span');
        itemLabel.className = 'auto-label';
        itemLabel.textContent = item.name || 'Item';
        const qty = document.createElement('span');
        qty.className = 'auto-value';
        qty.textContent = `${Number(item.qty) || 0} pcs`;
        row.append(itemLabel, qty);
        box.appendChild(row);
      });
    });
    const totalRow = document.createElement('div');
    totalRow.className = 'auto-total';
    const totalLabel = document.createElement('span');
    totalLabel.textContent = 'Total items received:';
    const totalValue = document.createElement('span');
    totalValue.textContent = `${totalUnits} pcs`;
    totalRow.append(totalLabel, totalValue);
    box.appendChild(totalRow);
  }

  function formatMoney(value) {
    return `₱${(Number(value) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function updateReportDate() {
    const parsed = new Date(`${reportDate.value}T00:00:00`);
    dateLabel.textContent = Number.isNaN(parsed.getTime())
      ? reportDate.value
      : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    renderAutoFields();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!document.getElementById('confirmCheck').checked) {
      showToast('Confirm that today’s orders and cash have been verified.', 'error');
      return;
    }

    const successfulOrders = Object.fromEntries(numberFields.map(id => [id, Number(document.getElementById(id).value)]));
    const sales = {
      totalSales: Number(document.getElementById('totalSales').value),
      actualCash: Number(document.getElementById('actualCash').value),
      cashVariance: Number((Number(document.getElementById('actualCash').value) - Number(document.getElementById('totalSales').value)).toFixed(2)),
      posTransactions: transactionsForDate(reportDate.value).length,
      posSales: transactionsForDate(reportDate.value).reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0)
    };
    const report = {
      id: `BRR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      branchName,
      branchManager: managerName,
      reportDate: reportDate.value,
      submittedAt: new Date().toISOString(),
      status: 'Submitted',
      successfulOrders,
      sales,
      deliveryLog: readArray(DELIVERY_STORAGE_KEY).filter(delivery => delivery?.deliveryDate === reportDate.value),
      notes: document.getElementById('closingNotes').value.trim()
    };

    try {
      const storedReports = localStorage.getItem(REPORT_STORAGE_KEY);
      const reports = storedReports === null ? [] : JSON.parse(storedReports);
      if (!Array.isArray(reports)) throw new TypeError('Saved branch report history has an invalid format.');
      reports.unshift(report);
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
      console.error('Could not submit the branch report.', error);
      showToast('Report could not be saved in this browser. Check storage availability and try again.', 'error');
      return;
    }

    showToast('Daily report submitted to Owner Admin.', 'success');
    form.reset();
    numberFields.forEach(id => { document.getElementById(id).value = '0'; });
    document.getElementById('totalSales').value = '0.00';
    document.getElementById('actualCash').value = '0.00';
    reportDate.value = localDate();
    updateReportDate();
  }

  document.getElementById('headerBranch').textContent = branchName;
  document.getElementById('headerManager').textContent = managerName;
  reportDate.value = localDate();
  updateReportDate();
  reportDate.addEventListener('change', updateReportDate);
  document.getElementById('totalSales').addEventListener('input', updateCashVariance);
  document.getElementById('actualCash').addEventListener('input', updateCashVariance);
  form.addEventListener('submit', handleSubmit);
  document.getElementById('cancelBtn').addEventListener('click', () => {
    if (!window.confirm('Discard this report?')) return;
    form.reset();
    numberFields.forEach(id => { document.getElementById(id).value = '0'; });
    document.getElementById('totalSales').value = '0.00';
    document.getElementById('actualCash').value = '0.00';
    reportDate.value = localDate();
    updateReportDate();
  });
  window.addEventListener('storage', event => {
    if ([TRANSACTION_STORAGE_KEY, DELIVERY_STORAGE_KEY].includes(event.key)) renderAutoFields();
  });
  document.addEventListener('ac:quickaction', event => {
    if (event.detail?.action === 'submit-report') document.getElementById('successCake').focus();
  });

  function updateCashVariance() {
    const sales = Number(document.getElementById('totalSales').value) || 0;
    const cash = Number(document.getElementById('actualCash').value) || 0;
    document.getElementById('cashVariance').textContent = formatMoney(cash - sales);
  }

  window.refreshDailyBranchReport = renderAutoFields;
})();
