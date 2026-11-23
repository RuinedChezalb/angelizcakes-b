/* ============================================================
   MOCK DATA (Auto-pulled from session & inventory module)
   ============================================================ */
const SESSION = {
  managerName: 'Maria Santos',
  branchName: 'Yashano Mall Branch'
};

const MOCK_DELIVERY = [
  { name: 'Chocolate Fudge Cake 8"', qty: 12 },
  { name: 'Ube Cake 8"', qty: 8 },
  { name: 'Butter Croissant (box of 6)', qty: 20 }
];

/* ============================================================
   INITIALIZATION
   ============================================================ */
(() => {
  
  // 1. Auto-populate header
  document.getElementById('headerBranch').textContent = SESSION.branchName;
  document.getElementById('headerManager').textContent = SESSION.managerName;
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // 2. Populate Delivery Log automatically
  const delBox = document.getElementById('deliveryLogBox');
  let totalItems = 0;
  let html = '';
  
  MOCK_DELIVERY.forEach(item => {
    html += `
      <div class="auto-row">
        <span class="auto-label">${item.name}</span>
        <span class="auto-value">${item.qty} pcs</span>
      </div>
    `;
    totalItems += item.qty;
  });

  html += `
    <div class="auto-total">
      <span>Total Items Received:</span>
      <span>${totalItems} pcs</span>
    </div>
  `;
  delBox.innerHTML = html;

  // 3. Form submission handler
  document.getElementById('dailyReportForm').addEventListener('submit', handleSubmit);

  // 4. Cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    if (confirm('Discard this report?')) {
      document.getElementById('dailyReportForm').reset();
    }
  });
})();

document.addEventListener('ac:quickaction', event => {
  if(event.detail && event.detail.action === 'submit-report'){
    document.getElementById('successCake').focus();
  }
});

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 320);
  }, 2800);
}

/* ============================================================
   SUBMIT HANDLER
   ============================================================ */
function handleSubmit(e) {
  e.preventDefault();

  if (!document.getElementById('confirmCheck').checked) {
    showToast('Please check the confirmation box to proceed.', 'error');
    return;
  }

  const reportData = {
    branchName: SESSION.branchName,
    branchManager: SESSION.managerName,
    date: new Date().toISOString(),
    successfulOrders: {
      customCakes: parseInt(document.getElementById('successCake').value) || 0,
      grazingTables: parseInt(document.getElementById('successGrazing').value) || 0,
      pastryBuffets: parseInt(document.getElementById('successBuffet').value) || 0,
      foodBundles: parseInt(document.getElementById('successBundles').value) || 0,
      partyPackages: parseInt(document.getElementById('successPackages').value) || 0
    },
    sales: {
      totalSales: parseFloat(document.getElementById('totalSales').value) || 0,
      actualCash: parseFloat(document.getElementById('actualCash').value) || 0
    },
    deliveryLog: MOCK_DELIVERY,
    notes: document.getElementById('closingNotes').value.trim()
  };

  console.log('Report Submitted:', reportData);

  // Show success toast and reset form
  showToast('Daily report submitted successfully!', 'success');
  
  setTimeout(() => {
    document.getElementById('dailyReportForm').reset();
    // Re-apply defaults for numbers
    document.querySelectorAll('input[type="number"]').forEach(inp => inp.value = '0');
    document.getElementById('totalSales').value = '0.00';
    document.getElementById('actualCash').value = '0.00';
  }, 1000);
}
