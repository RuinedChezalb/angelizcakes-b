(function () {
  'use strict';

  const STORAGE_KEY = 'angeliz_branch_inventory_batches_v1';
  const UPDATE_EVENT = 'angeliz-branch-inventory-updated';
  // POS entries map to their corresponding batch-tracked inventory records.
  const posInventoryMap = {
    'CK-001': 'P-1005',
    'CK-002': 'P-1002',
    'CK-003': 'P-1003',
    'CK-008': 'P-1009',
    'DS-001': 'P-1010',
    'PS-006': 'P-1012'
  };
  let catalogCache = null;

  function isoDate(offsetDays) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function createSeedCatalog() {
    return [
      {
        id: 'P-1001', name: 'Classic Birthday Cake (8")', category: 'Cakes', reorder: 8,
        batches: [
          { batch: 'B-2401', qty: 6, expiry: isoDate(4) },
          { batch: 'B-2402', qty: 5, expiry: isoDate(12) }
        ],
        lastDelivery: isoDate(-2)
      },
      {
        id: 'P-1002', name: 'Chocolate Fudge Cake (8")', category: 'Cakes', reorder: 5,
        batches: [{ batch: 'B-2403', qty: 3, expiry: isoDate(6) }],
        lastDelivery: isoDate(-3)
      },
      {
        id: 'P-1003', name: 'Red Velvet Cake (8")', category: 'Cakes', reorder: 4,
        batches: [{ batch: 'B-2404', qty: 4, expiry: isoDate(9) }],
        lastDelivery: isoDate(-1)
      },
      {
        id: 'P-1004', name: 'Ube Cake Slice', category: 'Slices', reorder: 10,
        batches: [{ batch: 'B-2405', qty: 8, expiry: isoDate(2) }],
        lastDelivery: isoDate(-4)
      },
      {
        id: 'P-1005', name: 'Bento Cake Set', category: 'Bento', reorder: 6,
        batches: [{ batch: 'B-2406', qty: 14, expiry: isoDate(11) }],
        lastDelivery: isoDate(-2)
      },
      { id: 'P-1006', name: 'Butter Croissant (6 pcs)', category: 'Pastries', reorder: 6, batches: [], lastDelivery: isoDate(-5) },
      { id: 'P-1007', name: 'Ensaymada Box (4 pcs)', category: 'Pastries', reorder: 5, batches: [], lastDelivery: isoDate(-6) },
      {
        id: 'P-1008', name: 'Strawberry Shortcake', category: 'Cakes', reorder: 4,
        batches: [{ batch: 'B-2407', qty: 7, expiry: isoDate(15) }],
        lastDelivery: isoDate(-1)
      },
      { id: 'P-1009', name: 'Mocha Roll', category: 'Cakes', reorder: 4, batches: [], lastDelivery: null },
      { id: 'P-1010', name: 'Leche Flan', category: 'Desserts', reorder: 6, batches: [], lastDelivery: null },
      { id: 'P-1011', name: 'Chocolate Chip Cookies (12 pcs)', category: 'Cookies', reorder: 8, batches: [], lastDelivery: null },
      { id: 'P-1012', name: 'Pandesal Pack (12 pcs)', category: 'Bread', reorder: 10, batches: [], lastDelivery: null }
    ];
  }

  function isValidCatalog(catalog) {
    return Array.isArray(catalog) && catalog.every(product =>
      product &&
      typeof product.id === 'string' &&
      typeof product.name === 'string' &&
      Array.isArray(product.batches) &&
      product.batches.every(batch =>
        batch &&
        typeof batch.batch === 'string' &&
        Number.isFinite(Number(batch.qty)) &&
        Number(batch.qty) >= 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(batch.expiry)
      )
    );
  }

  function loadCatalog() {
    if (catalogCache) return catalogCache;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      const seededCatalog = createSeedCatalog();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seededCatalog));
      catalogCache = seededCatalog;
      return catalogCache;
    }

    let catalog;
    try {
      catalog = JSON.parse(stored);
    } catch (error) {
      throw new Error('Saved inventory batches are not valid JSON.');
    }

    if (!isValidCatalog(catalog)) {
      throw new Error('Saved inventory batches have an unrecognized format.');
    }

    catalogCache = catalog;
    return catalogCache;
  }

  function saveCatalog(catalog) {
    if (!isValidCatalog(catalog)) {
      throw new Error('Inventory batches have an invalid format and were not saved.');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    catalogCache = catalog;
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }

  function availableQty(product, today) {
    return product.batches.reduce((total, batch) => (
      batch.expiry >= today ? total + Number(batch.qty) : total
    ), 0);
  }

  function getAvailableQty(product) {
    return availableQty(product, isoDate(0));
  }

  function getPosStockCounts() {
    const catalog = loadCatalog();
    const counts = {};

    Object.keys(posInventoryMap).forEach(posId => {
      const product = catalog.find(item => item.id === posInventoryMap[posId]);
      if (!product) throw new Error('A POS product has no matching inventory record.');
      counts[posId] = getAvailableQty(product);
    });

    return counts;
  }

  function consumePosCart(items) {
    const catalog = JSON.parse(JSON.stringify(loadCatalog()));
    const today = isoDate(0);
    const requirements = new Map();

    items.forEach(item => {
      const posId = item.productId || item.id;
      const inventoryId = posInventoryMap[posId];
      if (!inventoryId) return;

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Checkout contains an invalid product quantity.');
      }

      const requirement = requirements.get(inventoryId) || { quantity: 0 };
      requirement.quantity += quantity;
      requirements.set(inventoryId, requirement);
    });

    const deductions = [];
    requirements.forEach((requirement, inventoryId) => {
      const product = catalog.find(item => item.id === inventoryId);
      if (!product) throw new Error('A POS product has no matching inventory record.');

      const eligibleBatches = product.batches
        .map((batch, index) => ({ batch, index }))
        .filter(item => item.batch.expiry >= today && Number(item.batch.qty) > 0)
        .sort((a, b) => a.batch.expiry.localeCompare(b.batch.expiry) || a.index - b.index);
      const available = eligibleBatches.reduce((total, item) => total + Number(item.batch.qty), 0);

      if (available < requirement.quantity) {
        throw new Error(
          `Not enough unexpired ${product.name} stock. ${available} available; ${requirement.quantity} requested.`
        );
      }

      let remaining = requirement.quantity;
      eligibleBatches.forEach(item => {
        if (remaining === 0) return;
        const deduction = Math.min(Number(item.batch.qty), remaining);
        deductions.push({ batch: item.batch, quantity: deduction });
        remaining -= deduction;
      });
    });

    deductions.forEach(item => {
      item.batch.qty = Number(item.batch.qty) - item.quantity;
    });
    if (deductions.length) saveCatalog(catalog);

    return getPosStockCounts();
  }

  window.BranchInventoryStore = {
    updateEvent: UPDATE_EVENT,
    getCatalog: loadCatalog,
    saveCatalog,
    getAvailableQty,
    hasPosMapping: posId => Boolean(posInventoryMap[posId]),
    getPosStockCounts,
    consumePosCart
  };
})();
