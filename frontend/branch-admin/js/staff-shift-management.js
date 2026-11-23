(function(){
  'use strict';

  /* ============================================================
     helpers
     ============================================================ */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v==null?'':v).replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
  const peso = n => '₱' + Number(n).toLocaleString('en-PH', {maximumFractionDigits:0});

  function toast(msg, type){
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'warn' ? ' warn' : '');
    el.innerHTML = '<span class="toast-dot"></span><span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 320);
    }, 3600);
  }

  /* ============================================================
     STATE
     ============================================================ */
  let historyData = [
    { name:'Maria Santos', date:'Nov 20, 2026', duration:'8h 0m', tx:16, sales:21400, status:'Completed', badge:'badge-green' },
    { name:'Juan Dela Cruz', date:'Nov 20, 2026', duration:'8h 0m', tx:12, sales:15800, status:'Completed', badge:'badge-green' },
    { name:'Ana Reyes', date:'Nov 19, 2026', duration:'8h 0m', tx:9, sales:11200, status:'Completed', badge:'badge-green' },
    { name:'Maria Santos', date:'Nov 19, 2026', duration:'8h 0m', tx:14, sales:18750, status:'Completed', badge:'badge-green' },
    { name:'Juan Dela Cruz', date:'Nov 18, 2026', duration:'8h 0m', tx:11, sales:14300, status:'Completed', badge:'badge-green' },
  ];

  let currentHandover = {
    submittedBy: 'Maria Santos',
    date: new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}),
    start: '8:00 AM',
    end: '4:00 PM',
    tx: 14,
    sales: 18450,
    inquiries: 2,
    orders: 1,
    inventory: 'Low stock: Chocolate Fudge Cake 8", Ube Cake 8", Butter Croissant. Out of Stock: Red Velvet Cake 6".',
    remarks: 'Customer requested follow-up on custom cake quotation (INQ-0021).'
  };
  $('#outgoingShiftDate').textContent = currentHandover.date;
  $('#incomingShiftDate').textContent = currentHandover.date;

  /* ============================================================
     RENDER HISTORY TABLE
     ============================================================ */
  function renderHistory(){
    const tbody = $('#historyBody');
    tbody.innerHTML = historyData.map(h => (
      '<tr>' +
        '<td>' + esc(h.name) + '</td>' +
        '<td>' + esc(h.date) + '</td>' +
        '<td>' + esc(h.duration) + '</td>' +
        '<td class="num">' + h.tx + '</td>' +
        '<td class="num">' + peso(h.sales) + '</td>' +
        '<td><span class="status-badge ' + h.badge + '">' + esc(h.status) + '</span></td>' +
      '</tr>'
    )).join('');
  }

  /* ============================================================
     RENDER VIEW REPORT MODAL
     ============================================================ */
  function renderViewReport(){
    const h = currentHandover;
    $('#viewReportSubtitle').textContent = 'Submitted by ' + h.submittedBy + ' · ' + h.date;
    $('#viewReportBody').innerHTML =
      '<div class="frow">' +
        '<div class="field"><label>Staff Member</label><div style="font-weight:800;font-size:13px;">' + esc(h.submittedBy) + '</div></div>' +
        '<div class="field"><label>Shift Date</label><div style="font-weight:800;font-size:13px;">' + esc(h.date) + '</div></div>' +
      '</div>' +
      '<div class="frow">' +
        '<div class="field"><label>Shift Start</label><div style="font-weight:800;font-size:13px;">' + esc(h.start) + '</div></div>' +
        '<div class="field"><label>Shift End</label><div style="font-weight:800;font-size:13px;">' + esc(h.end) + '</div></div>' +
      '</div>' +
      '<div class="frow">' +
        '<div class="field"><label>Completed POS Transactions</label><div style="font-weight:800;font-size:13px;">' + h.tx + '</div></div>' +
        '<div class="field"><label>Total Sales Collected</label><div style="font-weight:800;font-size:13px;">' + peso(h.sales) + '</div></div>' +
      '</div>' +
      '<div class="frow">' +
        '<div class="field"><label>Pending Inquiries</label><div style="font-weight:800;font-size:13px;">' + h.inquiries + '</div></div>' +
        '<div class="field"><label>Pending Orders</label><div style="font-weight:800;font-size:13px;">' + h.orders + '</div></div>' +
      '</div>' +
      '<div class="field"><label>Inventory Issues</label><div style="font-weight:800;font-size:13px;line-height:1.6;">' + esc(h.inventory) + '</div></div>' +
      '<div class="field"><label>Remarks / Other Matters</label><div style="font-weight:800;font-size:13px;line-height:1.6;">' + esc(h.remarks) + '</div></div>';
  }

  /* ============================================================
     OVERLAYS
     ============================================================ */
  function showOverlay(sel){ const el = $(sel); if(el) el.classList.add('show'); }
  function hideOverlay(sel){ const el = $(sel); if(el) el.classList.remove('show'); }

  document.addEventListener('click', e => {
    const closer = e.target.closest('[data-close]');
    if(closer){
      const ov = closer.closest('.modal-overlay');
      if(ov) ov.classList.remove('show');
    }
  });

  $$('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if(e.target === ov) ov.classList.remove('show'); });
  });

  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    const open = $$('.modal-overlay.show');
    if(open.length) open[open.length - 1].classList.remove('show');
  });

  /* ============================================================
     ACTIONS
     ============================================================ */
  $('#newHandoverBtn').addEventListener('click', () => {
    showOverlay('#handoverModal');
  });
  $('#viewReportBtn').addEventListener('click', () => {
    renderViewReport();
    showOverlay('#viewReportModal');
  });

  $('#submitHandoverBtn').addEventListener('click', () => {
    const incomingManager = $('#hoIncoming').value;
    
    const date = new Date();
    const start = '08:00';
    const end = '16:00'; 

    const tx = parseInt($('#hoTx').value) || 0;
    const sales = parseFloat($('#hoSales').value) || 0;
    const inquiries = parseInt($('#hoInquiries').value) || 0;
    const orders = parseInt($('#hoOrders').value) || 0;
    
    // Auto-pulled inventory (simulating system detection)
    const inventory = 'Low stock: Chocolate Fudge Cake 8", Ube Cake 8", Butter Croissant. Out of Stock: Red Velvet Cake 6".';
    const remarks = $('#hoRemarks').value.trim();

    // Format date and time for display
    const dateStr = date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
    
    function formatTime(t){
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return h12 + ':' + m + ' ' + ampm;
    }

    currentHandover = {
      submittedBy: 'Maria Santos',
      date: dateStr,
      start: formatTime(start),
      end: formatTime(end),
      tx, sales, inquiries, orders, inventory, remarks
    };

    // Update the handover panel display (Outgoing)
    const outgoingRows = $$('.handover-box')[0].querySelectorAll('.handover-row');
    outgoingRows[0].querySelector('.handover-value').textContent = 'Maria Santos';
    outgoingRows[1].querySelector('.handover-value').textContent = dateStr;
    outgoingRows[2].querySelector('.handover-value').textContent = formatTime(start) + ' – ' + formatTime(end);
    outgoingRows[3].querySelector('.handover-value').textContent = tx;
    outgoingRows[4].querySelector('.handover-value').textContent = peso(sales);
    outgoingRows[5].querySelector('.handover-value').textContent = inquiries;
    outgoingRows[6].querySelector('.handover-value').textContent = 'Low stock: 3 items'; // Shortened for display

    // Update the handover panel display (Incoming)
    const incomingRows = $$('.handover-box')[1].querySelectorAll('.handover-row');
    incomingRows[0].querySelector('.handover-value').textContent = incomingManager;
    incomingRows[1].querySelector('.handover-value').textContent = dateStr;

    // Add to history
    historyData.unshift({
      name: 'Maria Santos',
      date: dateStr,
      duration: '8h 0m',
      tx, sales,
      status: 'Completed',
      badge: 'badge-green'
    });
    renderHistory();

    hideOverlay('#handoverModal');
    toast('Shift handover submitted successfully.');
  });

  $('#acknowledgeBtn').addEventListener('click', () => {
    // Update handover badge
    $('#handoverBadge').textContent = 'Acknowledged';
    $('#handoverBadge').className = 'status-badge badge-green';

    // Update incoming confirmation statuses
    const incomingBox = $$('.handover-box')[1];
    const yesBadges = incomingBox.querySelectorAll('.status-badge.badge-green');
    yesBadges.forEach(b => b.textContent = 'Confirmed');

    toast('Shift handover acknowledged successfully.');
  });

  /* ============================================================
     INIT
     ============================================================ */
  renderHistory();

})();
