/* ============================================================
   PRODUCT CATALOG — properly categorized per business data
   ============================================================ */
const IMG = {
  cake:      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=300&fit=crop&q=70',
  redvelvet: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=300&h=300&fit=crop&q=70',
  chiffon:   'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&h=300&fit=crop&q=70',
  cakeroll:  'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=300&h=300&fit=crop&q=70',
  bread:     'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop&q=70',
  croissant: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&h=300&fit=crop&q=70',
  cookie:    'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&h=300&fit=crop&q=70',
  eggtart:   'https://images.unsplash.com/photo-1587733494359-4c6a5a3f15e5?w=300&h=300&fit=crop&q=70',
  meringue:  'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=300&fit=crop&q=70',
  flan:      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop&q=70',
  dessert:   'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop&q=70',
  cheesecake:'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=300&h=300&fit=crop&q=70',
  halo:      'https://images.unsplash.com/photo-1541599468348-e96984315921?w=300&h=300&fit=crop&q=70',
  rice:      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&h=300&fit=crop&q=70',
  burger:    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&q=70',
  pizza:     'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop&q=70',
  dumpling:  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300&h=300&fit=crop&q=70',
  pasta:     'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop&q=70',
  coffee:    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop&q=70',
  milktea:   'https://images.unsplash.com/photo-1558857563-b371033873b8?w=300&h=300&fit=crop&q=70',
  frappe:    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&h=300&fit=crop&q=70',
  shake:     'https://images.unsplash.com/photo-1546173159-315724a31696?w=300&h=300&fit=crop&q=70'
};

const products = [
  /* ---------- CAKES ---------- */
  { id:'CK-001', name:'Bento Cake', category:'Cakes', price:250, stock:12, img:IMG.cake, icon:'cake', c1:'#ffd1da', c2:'#b65272' },
  { id:'CK-002', name:'8" Chocolate Fudge Cake', category:'Cakes', price:850, stock:8, img:IMG.cake, icon:'cake', c1:'#ffd1da', c2:'#b65272' },
  { id:'CK-003', name:'8" Red Velvet Cake', category:'Cakes', price:1600, stock:3, img:IMG.redvelvet, icon:'cake', c1:'#ffe0e6', c2:'#e60023' },
  { id:'CK-004', name:'Chiffon Cake', category:'Cakes', price:210, stock:6, img:IMG.chiffon, icon:'cake', c1:'#fff4d1', c2:'#e5a24a' },
  { id:'CK-005', name:'Chocolate Cake Slice', category:'Cakes', price:150, stock:10, img:IMG.chiffon, icon:'slice', c1:'#e0e6ff', c2:'#4a5aaa' },
  { id:'CK-008', name:'Mocha Cake Roll', category:'Cakes', price:350, stock:7, img:IMG.cakeroll, icon:'cake', c1:'#f3e6d4', c2:'#8a5a2b' },

  /* ---------- PASTRIES ---------- */
  { id:'PS-001', name:'Meringue Cups', category:'Pastries', price:65, stock:20, img:IMG.meringue, icon:'pastry', c1:'#fff4d1', c2:'#a06c1f' },
  { id:'PS-002', name:'Egg Tart', category:'Pastries', price:380, stock:8, img:IMG.eggtart, icon:'pastry', c1:'#fff4d1', c2:'#a06c1f' },
  { id:'PS-003', name:'Giant Chocolate Chip Cookie', category:'Pastries', price:85, stock:15, img:IMG.cookie, icon:'pastry', c1:'#f3e6d4', c2:'#8a5a2b' },
  { id:'PS-006', name:'Pandesal (Pack of 12)', category:'Pastries', price:95, stock:20, img:IMG.bread, icon:'bread', c1:'#f3e6d4', c2:'#8a5a2b' },

  /* ---------- DESSERTS ---------- */
  { id:'DS-001', name:'Leche Flan', category:'Desserts', price:100, stock:10, img:IMG.flan, icon:'slice', c1:'#ffe4ea', c2:'#e27396' },
  { id:'DS-002', name:'Choco Mousse', category:'Desserts', price:150, stock:8, img:IMG.dessert, icon:'slice', c1:'#e8d5c4', c2:'#4a2f1e' },
  { id:'DS-003', name:'Cake Parfait', category:'Desserts', price:190, stock:6, img:IMG.dessert, icon:'slice', c1:'#ffe4ea', c2:'#e27396' },
  { id:'DS-004', name:'Blueberry Cheesecake', category:'Desserts', price:130, stock:9, img:IMG.cheesecake, icon:'slice', c1:'#e0e6ff', c2:'#4a5aaa' },
  { id:'DS-006', name:'Halo-Halo', category:'Desserts', price:139, stock:12, img:IMG.halo, icon:'slice', c1:'#ddf5dc', c2:'#5fbf8a' },

  /* ---------- FOODS AND MEALS ---------- */
  { id:'FM-001', name:'Tapsilog', category:'Foods and Meals', price:99, stock:15, img:IMG.rice, icon:'bread', c1:'#fff4d1', c2:'#a06c1f' },
  { id:'FM-002', name:'Longsilog', category:'Foods and Meals', price:99, stock:12, img:IMG.rice, icon:'bread', c1:'#fff4d1', c2:'#a06c1f' },
  { id:'FM-003', name:'Cheeseburger', category:'Foods and Meals', price:69, stock:20, img:IMG.burger, icon:'pastry', c1:'#f3e6d4', c2:'#8a5a2b' },
  { id:'FM-005', name:'9" Hawaiian Pizza', category:'Foods and Meals', price:180, stock:8, img:IMG.pizza, icon:'bread', c1:'#ffe4ea', c2:'#e27396' },
  { id:'FM-007', name:'Cheese Sticks (8 pcs)', category:'Foods and Meals', price:49, stock:20, img:IMG.dumpling, icon:'pastry', c1:'#fff4d1', c2:'#a06c1f' },
  { id:'FM-008', name:'Spaghetti Combo', category:'Foods and Meals', price:159, stock:10, img:IMG.pasta, icon:'bread', c1:'#ffe4ea', c2:'#e27396' },

  /* ---------- BEVERAGES ---------- */
  { id:'BV-001', name:'Milk Tea (Buy 1 Take 1)', category:'Beverages', price:99, stock:20, img:IMG.milktea, icon:'beverage', c1:'#e8d5c4', c2:'#6b3a2b' },
  { id:'BV-002', name:'Fruit Soda', category:'Beverages', price:59, stock:25, img:IMG.shake, icon:'beverage', c1:'#e8d5c4', c2:'#6b3a2b' },
  { id:'BV-003', name:'Iced Americano', category:'Beverages', price:70, stock:15, img:IMG.coffee, icon:'beverage', c1:'#e8d5c4', c2:'#6b3a2b' },
  { id:'BV-004', name:'Caramel Latte', category:'Beverages', price:90, stock:15, img:IMG.coffee, icon:'beverage', c1:'#e8d5c4', c2:'#6b3a2b' },
  { id:'BV-006', name:'Matcha Latte Frappe', category:'Beverages', price:140, stock:8, img:IMG.frappe, icon:'beverage', c1:'#ddf5dc', c2:'#5fbf8a' },
  { id:'BV-007', name:'Mango Fruit Shake', category:'Beverages', price:89, stock:12, img:IMG.shake, icon:'beverage', c1:'#fff4d1', c2:'#e5a24a' }
];

const inventoryStore = window.BranchInventoryStore;

function syncBatchProductStock() {
  const stockCounts = inventoryStore.getPosStockCounts();
  products.forEach(product => {
    if (inventoryStore.hasPosMapping(product.id)) {
      product.stock = stockCounts[product.id];
    }
  });
}

function refreshPosInventoryStock() {
  try {
    syncBatchProductStock();
    if (document.getElementById('productGrid')) renderProducts();
  } catch (error) {
    showToast(`Perishable stock could not be refreshed: ${error.message}`, 'error');
  }
}

window.refreshPosInventoryStock = refreshPosInventoryStock;

/* ============================================================
   STATE
   ============================================================ */
let cart = [];
let searchQuery = '';

/* Transaction persistence */
const TXN_STORAGE_KEY = 'angeliz_pos_transactions';
let transactions = [];

function loadTransactions() {
  try {
    const raw = localStorage.getItem(TXN_STORAGE_KEY);
    if (raw) transactions = JSON.parse(raw);
  } catch (e) { transactions = []; }
}
function saveTransactions() {
  try { localStorage.setItem(TXN_STORAGE_KEY, JSON.stringify(transactions)); } catch (e) {}
}
function isToday(iso) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() &&
         d.getMonth() === n.getMonth() &&
         d.getDate() === n.getDate();
}
function todayTransactions() {
  return transactions.filter(t => isToday(t.timestamp));
}

/* ============================================================
   HELPERS & LOGIC
   ============================================================ */
function productIcon(type) {
  if (type === 'cake') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 5v6"/><path d="M17 8v3"/></svg>';
  if (type === 'slice') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 20H2L12 2z"/></svg>';
  if (type === 'pastry') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
  if (type === 'bread') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M9 7c1 1 2 2 5 2s4-1 5-2"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  filtered.forEach(p => {
    const tile = document.createElement('div');
    tile.className = `product-tile ${p.stock === 0 ? 'out-of-stock' : ''}`;
    
    let stockBadgeClass = 'in-stock';
    let stockLabel = `${p.stock} in stock`;
    if (p.stock === 0) {
      stockBadgeClass = 'out';
      stockLabel = 'Out of Stock';
    } else if (p.stock <= 3) {
      stockBadgeClass = 'low';
      stockLabel = `Low: ${p.stock}`;
    }

    tile.innerHTML = `
      <div class="tile-image">
        <div class="tile-svg-fallback" style="background:linear-gradient(135deg, ${p.c1}, ${p.c2}); color:#fff">
          ${productIcon(p.icon)}
        </div>
        <img class="tile-photo" src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
        <span class="stock-badge ${stockBadgeClass}">${stockLabel}</span>
      </div>
      <div class="tile-body">
        <span class="tile-name">${p.name}</span>
        <span class="tile-price">₱${p.price.toLocaleString()}</span>
      </div>
    `;

    if (p.stock > 0) {
      tile.addEventListener('click', () => addToCart(p));
    }
    grid.appendChild(tile);
  });
}

function addToCart(product, qty = 1) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast(`Cannot add more. Stock limit reached (${product.stock}).`, 'error');
      return;
    }
    existing.quantity += qty;
  } else {
    cart.push({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      img: product.img,
      c1: product.c1,
      c2: product.c2,
      icon: product.icon
    });
  }
  renderCart();
  updateKPIs();
}

function renderCart() {
  const list = document.getElementById('cartList');
  const countSpan = document.getElementById('cartCount');
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  
  countSpan.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty">
        <svg class="ico" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <h4>Cart is empty</h4>
        <p>Tap products on the left to add them to this order.</p>
      </div>
    `;
    document.getElementById('chargeBtn').disabled = true;
    updateTotals();
    return;
  }

  document.getElementById('chargeBtn').disabled = false;

  list.innerHTML = '';
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-img" style="background:linear-gradient(135deg, ${item.c1}, ${item.c2}); color:#fff">
        ${productIcon(item.icon)}
        <img src="${item.img}" alt="" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name" title="${item.name}">${item.name}</div>
        <div class="cart-item-price">₱${(item.price * item.quantity).toLocaleString()}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove">
        <svg class="ico" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    list.appendChild(div);
  });

  updateTotals();
}

function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  if (item.productId) {
    const prod = products.find(p => p.id === item.productId);
    if (delta > 0 && prod && item.quantity >= prod.stock) {
      showToast(`Stock limit reached (${prod.stock}).`, 'error');
      return;
    }
  }

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(id);
  } else {
    renderCart();
    updateKPIs();
  }
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  renderCart();
  updateKPIs();
}

function calcSubtotal() {
  return cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
}

function updateTotals() {
  const total = calcSubtotal();
  document.getElementById('totalAmount').textContent = `₱${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}

function updateKPIs() {
  const todays = todayTransactions();
  const sales = todays.reduce((sum, t) => sum + t.total, 0);
  const txnCount = todays.length;
  const itemsSold = todays.reduce((sum, t) => sum + t.itemsCount, 0);
  
  document.getElementById('kpiSales').textContent = sales.toLocaleString();
  document.getElementById('kpiTxn').textContent = txnCount;
  document.getElementById('kpiItems').textContent = itemsSold;
}

/* Modal Helpers */
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById('genericModal').classList.add('show');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('show');
  document.getElementById('genericModal').classList.remove('show');
}

document.getElementById('modalBackdrop').addEventListener('click', closeModal);

/* Checkout */
function checkoutOrder() {
  if (cart.length === 0) return;

  const batchTrackedItems = cart.filter(item => inventoryStore.hasPosMapping(item.productId));
  let batchStockCounts = {};
  if (batchTrackedItems.length) {
    try {
      batchStockCounts = inventoryStore.consumePosCart(batchTrackedItems);
    } catch (error) {
      showToast(`Checkout stopped: ${error.message}`, 'error');
      return;
    }
  }

  const sub = calcSubtotal();
  const total = sub;
  const itemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return;
    if (inventoryStore.hasPosMapping(item.productId)) {
      product.stock = batchStockCounts[item.productId];
    } else {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  });

  const txn = {
    id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(cart)),
    subtotal: sub,
    discount: 0,
    discountType: 'none',
    total: total,
    paymentMethod: 'Cash',
    customer: 'Walk-in Customer',
    itemsCount: itemsCount
  };

  transactions.unshift(txn);
  saveTransactions();

  showReceiptModal(txn);

  cart = [];
  renderCart();
  renderProducts();
  updateKPIs();
  showToast(`Transaction ${txn.id} completed successfully!`, 'success');
}

function showReceiptModal(txn) {
  const dateStr = new Date(txn.timestamp).toLocaleString();
  let itemsHtml = '';
  txn.items.forEach(i => {
    itemsHtml += `
      <div class="receipt-row">
        <span class="item">${i.name} x${i.quantity}</span>
        <span>₱${(i.price * i.quantity).toLocaleString()}</span>
      </div>
    `;
  });

  const body = `
    <div class="receipt" id="printableReceipt">
      <div class="receipt-head">
        <div class="brand">ANGELIZ CAKES</div>
        <div class="sub">Yashano Mall Branch, Legazpi City</div>
        <div class="sub">TIN: 000-123-456-000</div>
      </div>
      <div class="receipt-row"><span>Txn ID:</span><span>${txn.id}</span></div>
      <div class="receipt-row"><span>Date:</span><span>${dateStr}</span></div>
      <div class="receipt-row"><span>Customer:</span><span>${txn.customer}</span></div>
      <div class="receipt-row"><span>Cashier:</span><span>Maria Jensen</span></div>
      <div style="border-bottom:2px dashed var(--pink-300); margin:8px 0"></div>
      ${itemsHtml}
      <div style="border-bottom:2px dashed var(--pink-300); margin:8px 0"></div>
      <div class="receipt-row"><span>Subtotal:</span><span>₱${txn.subtotal.toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>
      ${txn.discount > 0 ? `<div class="receipt-row"><span>Discount (${txn.discountType}):</span><span>-₱${txn.discount.toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>` : ''}
      <div class="receipt-row total-row"><span>TOTAL:</span><span>₱${txn.total.toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>
      <div class="receipt-row" style="margin-top:6px"><span>Payment (${txn.paymentMethod}):</span><span>₱${txn.total.toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>
      <div class="receipt-footer">
        <p>Thank you for choosing Angeliz Cakes!</p>
        <p>Please come again.</p>
      </div>
    </div>
  `;
  // Receipt email delivery is not enabled yet.

  const footer = `
    <button class="btn" onclick="closeModal()">Close</button>
  `;

  openModal('Transaction Receipt', body, footer);
}

/* Event Handlers & Initialization */
function initializePosTerminal() {
  loadTransactions();
  products.forEach(product => {
    if (inventoryStore.hasPosMapping(product.id)) product.stock = 0;
  });
  try {
    syncBatchProductStock();
  } catch (error) {
    showToast(`Perishable stock could not be loaded: ${error.message}`, 'error');
  }
  window.addEventListener(inventoryStore.updateEvent, refreshPosInventoryStock);
  renderProducts();
  renderCart();
  updateKPIs();

  document.getElementById('posSearch').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });

  document.getElementById('chargeBtn').addEventListener('click', checkoutOrder);

  document.querySelectorAll('.footer-links a').forEach(a => {
    a.addEventListener('click', () => {
      const title = a.getAttribute('data-footer');
      let text = `Information regarding ${title} for Angeliz Cakes Yashano Mall Branch. All rights reserved.`;
      if (title === 'Privacy Policy') text = 'We value your privacy. Customer data is handled securely for order fulfillment and loyalty tracking only.';
      if (title === 'Terms of Service') text = 'All sales are final upon completion. Custom cake orders require advance notice and deposit.';
      if (title === 'Support') text = 'For system assistance or branch inquiries, contact IT Support at extension 404 or manager on duty.';
      openModal(title, `<p>${text}</p>`, `<button class="btn btn-primary" onclick="closeModal()">OK</button>`);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePosTerminal, { once: true });
} else {
  initializePosTerminal();
}
