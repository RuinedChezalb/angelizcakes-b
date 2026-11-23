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

  const DAY = 86400000;

  function isoDate(offsetDays){
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + dd;
  }

  function daysUntil(iso){
    if(!iso) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(iso + 'T00:00:00');
    if(isNaN(d.getTime())) return null;
    return Math.round((d - today) / DAY);
  }

  function fmtDate(iso){
    if(!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if(isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

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
    }, 3800);
  }

  function genBatch(){
    return 'B-' + Math.floor(1000 + Math.random() * 9000);
  }

  const inventoryStore = window.BranchInventoryStore;
  let catalog = inventoryStore.getCatalog();

  const requests = window.AngelizDB.stockRequests.list().slice().reverse();

  let deliveryItems = [];
  let deliverySeq = 1;
  let requestSeq = requests.length + 1;

  function renderRequests(){
    const body = $('#requestBody');
    const stored = window.AngelizDB.stockRequests.list().slice().reverse();
    requests.splice(0, requests.length, ...stored);
    requestSeq = requests.length + 1;
    if(!requests.length){
      body.innerHTML = '<tr><td colspan="5" class="table-empty">No stock requests yet.</td></tr>';
      return;
    }
    body.innerHTML = requests.map(r =>
      '<tr><td>' + esc(r.ref) + '</td><td>' + esc(r.productName) + '</td><td>' + esc(r.qty) +
      '</td><td>' + esc(fmtDate(r.date)) + '</td><td>' + esc(r.status) + '</td></tr>'
    ).join('');
  }

  /* ============================================================
     stock logic
     ============================================================ */
  function totalQty(p){
    return inventoryStore.getAvailableQty(p);
  }

  function nearestExpiry(p){
    const today = isoDate(0);
    const active = p.batches.filter(b => Number(b.qty) > 0 && b.expiry >= today);
    if(!active.length) return null;
    return active.map(b => b.expiry).sort()[0];
  }

  function nearestExpiredExpiry(p){
    const today = isoDate(0);
    const expired = p.batches.filter(b => Number(b.qty) > 0 && b.expiry < today);
    if(!expired.length) return null;
    return expired.map(b => b.expiry).sort()[0];
  }

  function stockStatus(p){
    const qty = totalQty(p);
    if(qty === 0) return 'Out of Stock';
    if(qty <= p.reorder) return 'Low Stock';
    return 'In Stock';
  }

  function isExpiringSoon(p){
    const e = nearestExpiry(p);
    if(!e) return false;
    const d = daysUntil(e);
    return d !== null && d >= 0 && d <= 7;
  }

  function suggestedQty(p){
    const onHand = totalQty(p);
    return Math.max(p.reorder * 2 - onHand, p.reorder);
  }

  /* ============================================================
     render KPIs
     ============================================================ */
  function renderKpis(){
    const units = catalog.reduce((sum, p) => sum + totalQty(p), 0);

    const outCount = catalog.filter(p => totalQty(p) === 0).length;
    const lowCount = catalog.filter(p => {
      const q = totalQty(p);
      return q > 0 && q <= p.reorder;
    }).length;

    const expiring = catalog.filter(p => totalQty(p) > 0 && isExpiringSoon(p));
    const earliest = expiring
      .map(p => daysUntil(nearestExpiry(p)))
      .filter(d => d !== null)
      .sort((a,b) => a - b)[0];

    $('#kpiUnits').textContent = units;
    $('#kpiUnitsFoot').textContent = 'Across ' + catalog.length + ' products';

    $('#kpiRestock').textContent = outCount + lowCount;
    $('#kpiRestockFoot').textContent = outCount + ' out of stock · ' + lowCount + ' low stock';

    $('#kpiExpiring').textContent = expiring.length;
    $('#kpiExpiringFoot').textContent = expiring.length
      ? 'Earliest: ' + (earliest <= 0 ? 'expired today' : 'in ' + earliest + ' day' + (earliest === 1 ? '' : 's'))
      : 'Nothing expiring within 7 days';
  }

  /* ============================================================
     render product table
     ============================================================ */
  function renderTable(){
    const term = $('#invSearch').value.toLowerCase().trim();
    const filter = $('#invFilter').value;

    const rows = catalog.filter(p => {
      const status = stockStatus(p);
      if(filter === 'Expiring'){ if(!isExpiringSoon(p)) return false; }
      else if(filter && status !== filter) return false;

      if(term){
        const hay = (p.name + ' ' + p.category).toLowerCase();
        if(hay.indexOf(term) === -1) return false;
      }
      return true;
    });

    const tbody = $('#productBody');

    if(!rows.length){
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No products match this search or filter.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(p => {
      const qty = totalQty(p);
      const status = stockStatus(p);
      const expiry = nearestExpiry(p) || nearestExpiredExpiry(p);
      const days = daysUntil(expiry);

      let badgeClass = 'badge-green';
      if(status === 'Low Stock') badgeClass = 'badge-amber';
      if(status === 'Out of Stock') badgeClass = 'badge-red';

      let expiryCell = '<span class="cell-sub">No batch yet</span>';
      if(expiry){
        const timeLeft = days === null
          ? ''
          : days < 0
            ? 'Expired'
            : days + (days === 1 ? ' day left' : ' days left');
        expiryCell = '<span class="num" style="font-size:12px;">' + fmtDate(expiry) + '</span>' +
          (timeLeft ? '<div class="cell-sub">' + timeLeft + '</div>' : '');
      }

      return '' +
        '<tr>' +
          '<td class="cell-name">' + esc(p.name) +
            '<div class="cell-sub">Last delivery: ' + fmtDate(p.lastDelivery) + '</div>' +
          '</td>' +
          '<td>' + esc(p.category) + '</td>' +
          '<td class="num">' + qty + ' <span class="unit">pcs</span></td>' +
          '<td>' + expiryCell + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + status + '</span></td>' +
          '<td><button type="button" class="btn-mini" data-request="' + p.id + '">Request</button></td>' +
        '</tr>';
    }).join('');
  }

  function renderAll(){
    renderKpis();
    renderTable();
    renderRequests();
  }

  function refreshBranchInventory(){
    catalog = inventoryStore.getCatalog();
    if ($('#productBody')) renderAll();
  }

  window.AngelizDB.onChange(window.AngelizDB.keys.stockRequests, () => {
    if ($('#requestBody')) renderRequests();
  });

  window.refreshBranchInventory = refreshBranchInventory;
  window.addEventListener(inventoryStore.updateEvent, refreshBranchInventory);

  /* ============================================================
     overlays
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
     product dropdowns
     ============================================================ */
  function optionHtml(p, includeStockCount){
    const stockCount = includeStockCount ? ' — ' + totalQty(p) + ' in stock' : '';
    return '<option value="' + p.id + '">' + esc(p.name) + stockCount + '</option>';
  }

  /* Log Delivery: previously delivered products first, then every
     other product the owner created. */
  function fillDeliverySelect(){
    const delivered = catalog
      .filter(p => p.lastDelivery)
      .sort((a,b) => (a.lastDelivery < b.lastDelivery ? 1 : -1));
    const others = catalog.filter(p => !p.lastDelivery);

    let html = '<option value="">Select a product…</option>';

    if(delivered.length){
      html += '<optgroup label="Previously delivered">' +
              delivered.map(p => optionHtml(p, true)).join('') + '</optgroup>';
    }
    if(others.length){
      html += '<optgroup label="' + (delivered.length ? 'Other products from the owner' : 'All products from the owner') + '">' +
              others.map(p => optionHtml(p, true)).join('') + '</optgroup>';
    }

    $('#delProduct').innerHTML = html;
  }

  /* Request Stock: products already requested before, most requested first. */
  function fillRequestSelect(){
    const counts = {};
    requests.forEach(r => { counts[r.productId] = (counts[r.productId] || 0) + 1; });

    const frequent = catalog
      .filter(p => counts[p.id])
      .sort((a,b) => (counts[b.id] - counts[a.id]) || a.name.localeCompare(b.name));
    const others = catalog
      .filter(p => !counts[p.id])
      .sort((a,b) => a.name.localeCompare(b.name));

    let html = '<option value="">Select a product…</option>';

    if(frequent.length){
      html += '<optgroup label="Frequently requested">' +
              frequent.map(p => optionHtml(p, false)).join('') + '</optgroup>';
    }
    if(others.length){
      html += '<optgroup label="' + (frequent.length ? 'All other products' : 'All products') + '">' +
              others.map(p => optionHtml(p, false)).join('') + '</optgroup>';
    }

    $('#reqProduct').innerHTML = html;
  }

  /* ============================================================
     LOG DELIVERY
     ============================================================ */
  function openDeliveryModal(){
    deliveryItems = [];

    $('#delRef').value = 'DLV-' + String(deliverySeq).padStart(4,'0');
    $('#delDate').value = isoDate(0);
    $('#delQty').value = '';
    $('#delExpiry').value = '';

    fillDeliverySelect();
    renderDeliveryItems();
    showOverlay('#deliveryModal');
  }

  function renderDeliveryItems(){
    const box = $('#deliveryItems');

    if(!deliveryItems.length){
      box.innerHTML = '<div class="empty-mini">No products added yet. Choose a product above, then tap Add.</div>';
      return;
    }

    box.innerHTML = deliveryItems.map((it, i) => (
      '<div class="delivery-item">' +
        '<div>' +
          '<div class="delivery-item-name">' + esc(it.name) + '</div>' +
          '<div class="delivery-item-meta">Qty ' + it.qty + ' · Expires ' + fmtDate(it.expiry) + '</div>' +
        '</div>' +
        '<button type="button" class="btn-remove" data-remove="' + i + '">Remove</button>' +
      '</div>'
    )).join('');
  }

  $('#addItemBtn').addEventListener('click', () => {
    const productId = $('#delProduct').value;
    const qty = parseInt($('#delQty').value, 10);
    const expiry = $('#delExpiry').value;

    if(!productId){ toast('Please choose a product first.', 'warn'); return; }
    if(!qty || qty < 1){ toast('Please enter a valid quantity.', 'warn'); return; }
    if(!expiry){ toast('Please enter the expiry date.', 'warn'); return; }
    if(daysUntil(expiry) < 0){ toast('Expiry date cannot be in the past.', 'warn'); return; }

    const product = catalog.find(p => p.id === productId);
    if(!product) return;

    const existing = deliveryItems.find(it => it.productId === productId && it.expiry === expiry);
    if(existing){
      existing.qty += qty;
    } else {
      deliveryItems.push({ productId, name: product.name, qty, expiry });
    }

    $('#delProduct').value = '';
    $('#delQty').value = '';
    $('#delExpiry').value = '';

    renderDeliveryItems();
    toast('Product added to this delivery.');
  });

  $('#deliveryItems').addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if(!btn) return;
    deliveryItems.splice(Number(btn.dataset.remove), 1);
    renderDeliveryItems();
  });

  $('#confirmDeliveryBtn').addEventListener('click', () => {
    if(!deliveryItems.length){
      toast('Add at least one product before confirming.', 'warn');
      return;
    }

    const deliveryDate = $('#delDate').value || isoDate(0);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    let totalUnits = 0;

    deliveryItems.forEach(item => {
      const product = updatedCatalog.find(p => p.id === item.productId);
      if(!product) return;
      product.batches.push({
        batch: genBatch(),
        qty: item.qty,
        expiry: item.expiry
      });
      product.lastDelivery = deliveryDate;
      totalUnits += item.qty;
    });

    try {
      inventoryStore.saveCatalog(updatedCatalog);
    } catch (error) {
      toast('Delivery could not be saved: ' + error.message, 'warn');
      return;
    }

    catalog = updatedCatalog;
    deliverySeq++;
    deliveryItems = [];

    hideOverlay('#deliveryModal');
    renderAll();
    toast('Delivery logged. ' + totalUnits + ' units added and expiry dates saved.');
  });

  /* ============================================================
     REQUEST STOCK
     ============================================================ */
  function updateRequestInfo(){
    const productId = $('#reqProduct').value;
    const product = catalog.find(p => p.id === productId);

    if(!product){
      $('#reqQty').placeholder = 'e.g. 20';
      return;
    }

    const suggest = suggestedQty(product);
    $('#reqQty').placeholder = 'e.g. ' + suggest;
  }

  function openRequestModal(productId){
    $('#reqRef').value = 'REQ-' + String(requestSeq).padStart(4,'0');
    $('#reqQty').value = '';
    $('#reqReason').value = '';
    $('#reqUrgency').value = 'Normal';
    $('#reqDate').value = isoDate(3);

    fillRequestSelect();

    if(productId){
      $('#reqProduct').value = productId;
    }

    updateRequestInfo();
    showOverlay('#requestModal');
  }

  $('#reqProduct').addEventListener('change', updateRequestInfo);

  $('#submitRequestBtn').addEventListener('click', () => {
    const productId = $('#reqProduct').value;
    const qty = parseInt($('#reqQty').value, 10);

    if(!productId){ toast('Please choose a product first.', 'warn'); return; }
    if(!qty || qty < 1){ toast('Please enter how many units you need.', 'warn'); return; }

    const product = catalog.find(p => p.id === productId);
    if(!product) return;

    window.AngelizDB.stockRequests.add({
      productId: product.id,
      productName: product.name,
      qty: qty,
      urgency: $('#reqUrgency').value,
      date: $('#reqDate').value || isoDate(3),
      reason: $('#reqReason').value.trim()
    });
    renderRequests();

    hideOverlay('#requestModal');
    toast('Stock request sent to the owner.');
  });

  /* ============================================================
     events
     ============================================================ */
  $('#logDeliveryBtn').addEventListener('click', openDeliveryModal);
  $('#requestStockBtn').addEventListener('click', () => openRequestModal(''));
  document.addEventListener('ac:quickaction', event => {
    if(event.detail && event.detail.action === 'request-stock') openRequestModal('');
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-request]');
    if(!btn) return;
    openRequestModal(btn.dataset.request);
  });

  $('#invSearch').addEventListener('input', renderTable);
  $('#invFilter').addEventListener('change', renderTable);

  /* ============================================================
     init
     ============================================================ */
  renderAll();

})();
