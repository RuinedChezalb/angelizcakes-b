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

  function fmtDate(v){
    if(!v) return '';
    const d = new Date(v + 'T00:00:00');
    if(isNaN(d.getTime())) return v;
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

  /* ============================================================
     state
     ============================================================ */
  let inquirySeq = 1;
  let packageFragmentTemplate = null;
  const storefrontAssetPromises = new Map();
  let activeCakeFlow = null;
  let activePresetProduct = null;
  const sharedOrderStore = window.AngelizOrderBookingStore;
  if (!sharedOrderStore) throw new Error('The shared order/booking store did not load.');
  const sharedDatabase = window.AngelizSharedDatabase;
  if (!sharedDatabase) throw new Error('The shared three-user CRUD database did not load.');
  let nextOrderNumber = Math.max(0, ...[...document.querySelectorAll('#ordTable tbody tr')].map(row => {
    const match = /^ORD-(\d+)$/.exec(row.cells[0].textContent.trim());
    return match ? Number(match[1]) : 0;
  })) + 1;
  const bookingRows = $('#bookingRows');

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

  function renderWizard(){
    const body = $('#modalBody');
    body.innerHTML = renderPath();
    body.scrollTop = 0;
    $('#btnBack').hidden = true;
    $('#btnNext').hidden = true;
  }

  /* ---------- step: choose path ---------- */
  function renderPath(){
    return '' +
    '<div class="hint-box">Choose a storefront preset to continue through product details and checkout, or use the customer-facing 7-step wizard for a fully custom cake.</div>' +
    '<div class="path-grid">' +
      '<button type="button" class="path-card" data-path="preset">' +
        '<div class="path-ico"><svg class="ico" viewBox="0 0 24 24"><path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M12 12V9.5"/><circle cx="12" cy="7.5" r="1.6"/></svg></div>' +
        '<div class="path-name">Choose a preset cake</div>' +
        '<div class="path-desc">Choose from the customer storefront cake catalog, review the product, and continue to checkout.</div>' +
      '</button>' +
      '<button type="button" class="path-card" data-path="custom">' +
        '<div class="path-ico"><svg class="ico" viewBox="0 0 24 24"><path d="M12 2l2.9 6.2 6.6.9-4.8 4.6 1.2 6.6L12 17.1 6.1 20.3l1.2-6.6L2.5 9.1l6.6-.9z"/></svg></div>' +
        '<div class="path-name">Fully custom cake</div>' +
        '<div class="path-desc">Use the same occasion, design, cake details, and checkout wizard as storefront customers.</div>' +
      '</button>' +
    '</div>';
  }

  $('#modalBody').addEventListener('click', e => {
    const pathCard = e.target.closest('.path-card');
    if (!pathCard) return;
    if (pathCard.dataset.path === 'preset') openPresetCatalog();
    else if (pathCard.dataset.path === 'custom') openCustomCakeWizard();
  });

  function openCakeModal(){
    activeCakeFlow = null;
    setCakeModalHeader('New Cake Order', 'Choose a storefront preset or build a fully custom cake.');
    $('#cakeModal .modal-foot').hidden = false;
    renderWizard();
    showOverlay('#cakeModal');
  }

  $('#newOrderBtn').addEventListener('click', openCakeModal);
  document.addEventListener('ac:quickaction', event => {
    if(event.detail && event.detail.action === 'custom-cake') openCakeModal();
  });

  function setCakeModalHeader(title, subtitle) {
    $('#cakeModal .modal-title').textContent = title;
    $('#cakeModal .modal-sub').textContent = subtitle;
  }

  function loadStorefrontStylesheet(id, path) {
    if (storefrontAssetPromises.has(id)) return storefrontAssetPromises.get(id);
    const existing = document.getElementById(id);
    if (existing) return Promise.resolve(existing);

    const stylesheet = document.createElement('link');
    stylesheet.id = id;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = path;
    const request = new Promise((resolve, reject) => {
      stylesheet.addEventListener('load', () => resolve(stylesheet), { once:true });
      stylesheet.addEventListener('error', () => reject(new Error(`Could not load ${path}.`)), { once:true });
      document.head.append(stylesheet);
    }).catch(error => {
      stylesheet.remove();
      storefrontAssetPromises.delete(id);
      throw error;
    });
    storefrontAssetPromises.set(id, request);
    return request;
  }

  function loadStorefrontScript(id, initializer, path, expectedType = 'function') {
    if (
      expectedType === 'function' && typeof window[initializer] === 'function'
      || expectedType === 'array' && Array.isArray(window[initializer])
    ) return Promise.resolve();
    if (storefrontAssetPromises.has(id)) return storefrontAssetPromises.get(id);

    const script = document.createElement('script');
    script.id = id;
    script.src = path;
    const request = new Promise((resolve, reject) => {
      script.addEventListener('load', () => resolve(), { once:true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${path}.`)), { once:true });
      document.body.append(script);
    }).then(() => {
      if (
        expectedType === 'function' && typeof window[initializer] !== 'function'
        || expectedType === 'array' && !Array.isArray(window[initializer])
      ) {
        throw new Error(`${path} did not expose ${initializer}.`);
      }
    }).catch(error => {
      script.remove();
      storefrontAssetPromises.delete(id);
      throw error;
    });
    storefrontAssetPromises.set(id, request);
    return request;
  }

  async function loadStorefrontFragment(path, selector) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}.`);
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
    const fragment = source.querySelector(selector);
    if (!fragment) throw new Error(`${path} is missing ${selector}.`);
    fragment.querySelectorAll('[src], [href]').forEach(element => {
      ['src', 'href'].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && value.startsWith('../assets/')) {
          element.setAttribute(attribute, value.replace(/^\.\.\//, ''));
        }
      });
    });
    return document.importNode(fragment, true);
  }

  function showCakePathChooser() {
    activeCakeFlow = null;
    activePresetProduct = null;
    setCakeModalHeader('New Cake Order', 'Choose a storefront preset or build a fully custom cake.');
    $('#cakeModal .modal-foot').hidden = false;
    renderWizard();
  }

  async function openPresetCatalog() {
    activeCakeFlow = 'preset-catalog';
    $('#cakeModal .modal-foot').hidden = true;
    setCakeModalHeader('Choose a Storefront Cake', 'Select a preset cake to open its storefront details and checkout.');
    try {
      await loadStorefrontScript(
        'angelizStorefrontCatalogScript',
        'angelizStorefrontProducts',
        '../store-front/js/catalog-data.js',
        'array'
      );
      const products = window.angelizStorefrontProducts;
      if (!Array.isArray(products)) throw new TypeError('The storefront cake catalog is unavailable.');
      const cakes = products.filter(product => product.category === 'Cakes');
      if (cakes.length === 0) throw new Error('The storefront catalog has no cake presets.');

      const body = $('#modalBody');
      const catalog = document.createElement('section');
      catalog.className = 'branch-cake-catalog';
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn-ghost branch-cake-back';
      back.textContent = 'Back to order type';
      back.addEventListener('click', showCakePathChooser);
      const grid = document.createElement('div');
      grid.className = 'branch-cake-catalog-grid';
      cakes.forEach(product => {
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.className = 'branch-cake-catalog-choice';
        const image = document.createElement('img');
        image.src = `../store-front/assets/${product.image}`;
        image.alt = '';
        const name = document.createElement('strong');
        name.textContent = product.name;
        const price = document.createElement('span');
        price.textContent = product.price || 'To be confirmed';
        choice.append(image, name, price);
        choice.addEventListener('click', () => openPresetProduct(product));
        grid.append(choice);
      });
      catalog.append(back, grid);
      body.replaceChildren(catalog);
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not open the storefront cake catalog.', 'warn');
      showCakePathChooser();
    }
  }

  async function openPresetProduct(product) {
    activeCakeFlow = 'preset-detail';
    activePresetProduct = product;
    setCakeModalHeader(product.name, 'Storefront product details');
    try {
      const [fragment] = await Promise.all([
        loadStorefrontFragment('../store-front/html/product-detail.html', 'main#storefrontProductDetail'),
        loadStorefrontStylesheet('storefrontProductDetailStylesheet', '../store-front/css/product-detail.css'),
        loadStorefrontScript(
          'storefrontProductDetailScript',
          'initializeProductDetailFragment',
          '../store-front/js/product-detail.js'
        )
      ]);
      const back = fragment.querySelector('[data-storefront-back]');
      back.href = '#';
      back.addEventListener('click', event => {
        event.preventDefault();
        openPresetCatalog();
      });
      $('#modalBody').replaceChildren(fragment);
      const imageUrl = new URL(`../store-front/assets/${product.image}`, window.location.href).href;
      window.initializeProductDetailFragment(fragment, product, imageUrl, { favoritesEnabled:false });
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not open the storefront cake details.', 'warn');
      openPresetCatalog();
    }
  }

  document.addEventListener('storefront:show-checkout', event => {
    if (activeCakeFlow !== 'preset-detail') return;
    openPresetCheckout(event.detail);
  });

  async function openPresetCheckout(detail) {
    activeCakeFlow = 'preset-checkout';
    const product = detail?.product || activePresetProduct;
    const imageUrl = detail?.imageUrl;
    if (!product || !imageUrl) {
      toast('The selected storefront cake is missing checkout information.', 'warn');
      openPresetCatalog();
      return;
    }
    setCakeModalHeader('Checkout', 'Complete the storefront checkout details for this cake.');
    try {
      const [fragment] = await Promise.all([
        loadStorefrontFragment('../store-front/html/checkout.html', 'main#storefrontCheckout'),
        loadStorefrontStylesheet('storefrontCheckoutStylesheet', '../store-front/css/checkout.css'),
        loadStorefrontScript(
          'storefrontCheckoutScript',
          'initializeCheckoutFragment',
          '../store-front/js/checkout.js'
        )
      ]);
      const back = fragment.querySelector('[data-storefront-back]');
      back.href = '#';
      back.addEventListener('click', event => {
        event.preventDefault();
        openPresetProduct(product);
      });
      const returnHome = fragment.querySelector('.checkout-receipt-home');
      if (returnHome) {
        returnHome.href = '#';
        returnHome.addEventListener('click', event => {
          event.preventDefault();
          hideOverlay('#cakeModal');
        });
      }
      $('#modalBody').replaceChildren(fragment);
      window.initializeCheckoutFragment(fragment, product, imageUrl, {
        onPlaceOrder: order => {
          addCakeOrderRow('Preset Cake', order);
          toast(`Order created for ${order.customerName || product.name}.`);
        }
      });
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not open storefront checkout.', 'warn');
      openPresetProduct(product);
    }
  }

  async function openCustomCakeWizard() {
    activeCakeFlow = 'custom';
    $('#cakeModal .modal-foot').hidden = true;
    setCakeModalHeader('Fully Custom Cake', 'Complete the same 7-step customization wizard used by storefront customers.');
    try {
      const [fragment] = await Promise.all([
        loadStorefrontFragment('../store-front/html/customization.html', 'main#storefrontCustomizationWizard'),
        loadStorefrontStylesheet('storefrontCustomizationStylesheet', '../store-front/css/customization.css'),
        loadStorefrontScript(
          'storefrontCustomizationScript',
          'initializeCustomizationWizard',
          '../store-front/js/customization.js'
        )
      ]);
      const back = fragment.querySelector('.customization-wizard-back');
      back.href = '#';
      back.addEventListener('click', event => {
        event.preventDefault();
        showCakePathChooser();
      });
      fragment.addEventListener('click', event => {
        const returnLink = event.target.closest('.customization-wizard-receipt-home');
        if (!returnLink) return;
        event.preventDefault();
        hideOverlay('#cakeModal');
      });
      $('#modalBody').replaceChildren(fragment);
      window.initializeCustomizationWizard(fragment, {
        onPlaceOrder: order => {
          addCakeOrderRow('Fully Custom Cake', order);
          toast(`Order created for ${order.customerName}.`);
        }
      });
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not open the storefront customization wizard.', 'warn');
      showCakePathChooser();
    }
  }

  function addCakeOrderRow(type, order) {
    const orderNumber = 'ORD-' + String(nextOrderNumber++).padStart(4, '0');
    const customer = (order.customerName || 'Cake Customer').trim();
    const product = order.product;
    const selections = Array.isArray(order.selections)
      ? order.selections.map(selection => {
        const sizes = selection.sizes?.map((size, index) => {
          const measurements = [
            size.height && `height ${size.height} in`,
            size.width && `width ${size.width} in`
          ].filter(Boolean).join(', ');
          return measurements ? `Tier ${size.tier || index + 1}: ${measurements}` : '';
        }).filter(Boolean).join('; ');
        const sizeNote = selection.letBakerDecideSizes ? 'Baker to decide sizes' : sizes;
        return `${selection.label}: ${selection.value}${sizeNote ? ` (${sizeNote})` : ''}`;
      }).join('; ')
      : '';
    const item = product?.name || order.title || type;
    const retouches = [
      order.cakeAge && `Age: ${order.cakeAge}`,
      order.dedicationName && `Dedication: ${order.dedicationName}`,
      order.cakeCharacter && `Character: ${order.cakeCharacter}`,
      order.dedication
    ].filter(Boolean).join('; ');
    const specifications = [
      order.itemSpecifications,
      order.additionalInformation,
      order.notes,
      order.giftMessage && `Gift message: ${order.giftMessage}`,
      order.referenceImages?.length ? `Reference images: ${order.referenceImages.map(image => typeof image === 'string' ? image : image.name).filter(Boolean).join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('; ');
    const itemDetails = [item, selections, retouches].filter(Boolean).join(' · ');
    const preferredDate = fmtDate(order.deliveryDate || order.dateNeeded || '');
    const sharedRecordId = `branch-ORD-${String(nextOrderNumber).padStart(4, '0')}`;
    const row = document.createElement('tr');
    row.dataset.recordId = sharedRecordId;
    row.dataset.type = 'Custom';
    row.dataset.status = 'Pending';
    row.dataset.item = itemDetails;
    row.dataset.date = preferredDate || 'To be confirmed';
    row.dataset.time = order.deliveryTime || order.timeNeeded || '';
    row.dataset.payment = order.paymentMethod || 'Pending';
    row.dataset.amount = order.orderTotal || product?.price || 'To be confirmed';
    row.dataset.contact = order.customerPhone || order.contactNumber || '';
    row.dataset.email = order.customerEmail || order.email || '';
    row.dataset.fulfillment = order.fulfillment || 'To be confirmed';
    row.dataset.address = order.deliveryAddress || order.recipientAddress || '';
    row.dataset.recipient = [
      order.recipientName,
      order.recipientContact,
      order.recipientAddress
    ].filter(Boolean).join(' · ');
    row.dataset.notes = specifications;
    row.dataset.referenceImages = JSON.stringify(order.referenceImages || []);
    row.dataset.search = `${orderNumber} ${customer} ${itemDetails} ${row.dataset.date} Custom Pending ${row.dataset.payment}`;

    [orderNumber, customer, 'Custom', row.dataset.amount].forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 0) cell.className = 'order-id-cell';
      row.append(cell);
    });
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge badge-amber';
    statusBadge.textContent = 'Pending';
    statusCell.append(statusBadge);
    row.append(statusCell);
    const actionCell = document.createElement('td');
    const viewButton = document.createElement('button');
    viewButton.className = 'order-view-button';
    viewButton.type = 'button';
    viewButton.dataset.viewOrder = '';
    viewButton.setAttribute('aria-label', `View order ${orderNumber}`);
    viewButton.textContent = 'View';
    actionCell.append(viewButton);
    row.append(actionCell);
    const sharedOrderStore = window.AngelizOrderBookingStore;
    if (sharedOrderStore) sharedOrderStore.save({
      id: sharedRecordId,
      orderNumber,
      referenceNumber: order.referenceNumber || sharedRecordId,
      recordSource: 'branch-admin',
      recordType: 'order',
      bookingOnly: false,
      branchName: 'Yashano Mall Branch',
      customerName: customer,
      customerEmail: order.customerEmail || order.email || '',
      customerPhone: order.customerPhone || order.contactNumber || '',
      title: item,
      type,
      product: product || null,
      selections: order.selections || [],
      dedication: order.dedication || '',
      additionalInformation: order.additionalInformation || '',
      notes: specifications,
      giftMessage: order.giftMessage || '',
      recipientName: order.recipientName || '',
      recipientContact: order.recipientContact || '',
      recipientAddress: order.recipientAddress || '',
      deliveryDate: order.deliveryDate || order.dateNeeded || '',
      deliveryTime: order.deliveryTime || order.timeNeeded || '',
      requestedFor: [order.deliveryDate || order.dateNeeded, order.deliveryTime || order.timeNeeded].filter(Boolean).join(' '),
      fulfillment: order.fulfillment || '',
      deliveryAddress: order.deliveryAddress || order.recipientAddress || '',
      paymentMethod: order.paymentMethod || '',
      paymentStatus: order.paymentStatus || 'pending-preview',
      total: order.orderTotal || product?.price || 'Price to be confirmed',
      productionStatus: 'Pending',
      referenceImages: order.referenceImages || []
    });
    if (isBooking) {
      const bookingRow = document.createElement('tr');
      bookingRow.dataset.type = 'Package';
      bookingRow.dataset.status = row.dataset.status;
      bookingRow.dataset.recordId = id;
      bookingRow.dataset.item = itemSummary;
      bookingRow.dataset.date = row.dataset.date;
      bookingRow.dataset.time = row.dataset.time;
      bookingRow.dataset.payment = row.dataset.payment;
      bookingRow.dataset.amount = row.dataset.amount;
      bookingRow.dataset.contact = row.dataset.contact;
      bookingRow.dataset.email = row.dataset.email;
      bookingRow.dataset.fulfillment = row.dataset.fulfillment;
      bookingRow.dataset.address = row.dataset.address;
      bookingRow.dataset.recipient = row.dataset.recipient;
      bookingRow.dataset.notes = row.dataset.notes;
      bookingRow.dataset.branch = row.dataset.branch;
      bookingRow.dataset.referenceNumber = row.dataset.referenceNumber;
      bookingRow.dataset.packageId = row.dataset.packageId;
      bookingRow.dataset.pax = row.dataset.pax;
      bookingRow.dataset.paymentStatus = row.dataset.paymentStatus;
      bookingRow.dataset.search = row.dataset.search;
      [orderNumber, customer, packageOffering.title, row.dataset.date + ' ' + row.dataset.time, row.dataset.amount, row.dataset.payment].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value || '—';
        bookingRow.append(cell);
      });
      const bookingStatusCell = document.createElement('td');
      const bookingBadge = document.createElement('span');
      bookingBadge.className = 'status-badge badge-amber';
      bookingBadge.textContent = 'Booking Requested';
      bookingStatusCell.append(bookingBadge);
      bookingRow.append(bookingStatusCell);
      const bookingAction = document.createElement('td');
      const bookingView = document.createElement('button');
      bookingView.className = 'order-view-button';
      bookingView.type = 'button';
      bookingView.dataset.viewOrder = '';
      bookingView.textContent = 'View';
      bookingAction.append(bookingView);
      bookingRow.append(bookingAction);
      bookingRows.prepend(bookingRow);
    } else {
      $('#ordTable tbody').prepend(row);
    }
    const sharedOrderStore = window.AngelizOrderBookingStore;
    if (sharedOrderStore) {
      sharedOrderStore.save({
        id: sharedRecordId,
        orderNumber,
        referenceNumber: order.referenceNumber || sharedRecordId,
        recordSource: 'branch-admin',
        recordType: 'order',
        bookingOnly: false,
        branchName: 'Yashano Mall Branch',
        customerName: customer,
        customerEmail: order.customerEmail || order.email || '',
        customerPhone: order.customerPhone || order.contactNumber || '',
        title: item,
        type,
        product: product || null,
        selections: order.selections || [],
        dedication: order.dedication || '',
        additionalInformation: order.additionalInformation || '',
        notes: specifications,
        giftMessage: order.giftMessage || '',
        recipientName: order.recipientName || '',
        recipientContact: order.recipientContact || '',
        recipientAddress: order.recipientAddress || '',
        deliveryDate: order.deliveryDate || order.dateNeeded || '',
        deliveryTime: order.deliveryTime || order.timeNeeded || '',
        requestedFor: [order.deliveryDate || order.dateNeeded, order.deliveryTime || order.timeNeeded].filter(Boolean).join(' '),
        fulfillment: order.fulfillment || '',
        deliveryAddress: order.deliveryAddress || order.recipientAddress || '',
        paymentMethod: order.paymentMethod || '',
        paymentStatus: order.paymentStatus || 'pending-preview',
        amount: order.orderTotal || product?.price || 'Price to be confirmed',
        productionStatus: 'Pending',
        referenceImages: order.referenceImages || []
      });
    }
    $('#kpiPending').textContent = String(Number($('#kpiPending').textContent) + 1);
    applyFilters();
    return orderNumber;
  }

  /* ============================================================
     package order wizard
     ============================================================ */
  async function loadPackageAssets() {
    await Promise.all([
      loadStorefrontScript(
        'storefrontServicePackageScript',
        'initializeServicePackageFragment',
        '../store-front/js/service-package.js'
      ),
      loadStorefrontStylesheet(
        'storefrontServicePackageStylesheet',
        '../store-front/css/service-package.css'
      )
    ]);
    await Promise.all([
      loadStorefrontStylesheet(
        'storefrontServicePackageFonts',
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cinzel:wght@600;700;800&family=Great+Vibes&family=Playfair+Display:wght@500;600;700&display=swap'
      ),
      loadStorefrontStylesheet(
        'storefrontServicePackageIcons',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css'
      )
    ]).catch(error => {
      console.warn('Storefront font or icon assets could not be loaded.', error);
      toast('Package styling assets are unavailable; the order flow remains usable.', 'warn');
    });
  }

  function showPackageSelection() {
    const grid = $('#packageSelectionGrid');
    grid.innerHTML = window.angelizStorefrontServices.map(packageOffering => (
      '<button class="package-choice" type="button" data-select-package="' + esc(packageOffering.id) + '">' +
        '<span class="package-choice-image"><img src="../store-front/assets/' + esc(packageOffering.image) +
          '" alt="' + esc(packageOffering.title) + '"></span>' +
        '<span class="package-choice-name">' + esc(packageOffering.title) + '</span>' +
        '<span class="package-choice-description">' + esc(packageOffering.description) + '</span>' +
        '<span class="package-choice-footer"><span>' + esc(packageOffering.price) + '</span><span>Select →</span></span>' +
      '</button>'
    )).join('');
  }

  async function openPackageModal() {
    try {
      await loadStorefrontScript(
        'angelizStorefrontCatalogScript',
        'angelizStorefrontProducts',
        '../store-front/js/catalog-data.js',
        'array'
      );
      if (!Array.isArray(window.angelizStorefrontServices) || window.angelizStorefrontServices.length === 0) {
        throw new TypeError('The storefront package catalog is unavailable.');
      }
      $('#packageSelection').hidden = false;
      $('#packageWizardMount').hidden = true;
      $('#packageOrderModal .package-order-modal').classList.add('is-package-selection');
      showPackageSelection();
      showOverlay('#packageOrderModal');
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not load storefront packages.', 'warn');
    }
  }

  async function openPackageWizard(packageOffering) {
    const mount = $('#packageWizardMount');
    $('#packageOrderModal .package-order-modal').classList.remove('is-package-selection');
    try {
      if (!packageFragmentTemplate) {
        const response = await fetch('../store-front/html/service-package.html');
        if (!response.ok) throw new Error('Could not load the package wizard view.');
        const fragmentDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
        packageFragmentTemplate = fragmentDocument.querySelector('main#storefrontServicePackage');
        if (!packageFragmentTemplate) throw new Error('The package wizard view is missing.');
      }

      await loadPackageAssets();
      mount.replaceChildren(document.importNode(packageFragmentTemplate, true));
      const root = mount.querySelector('#storefrontServicePackage');
      const back = root.querySelector('[data-storefront-back]');
      if (back) {
        back.href = '#';
        back.addEventListener('click', event => {
          event.preventDefault();
          $('#packageWizardMount').hidden = true;
          $('#packageSelection').hidden = false;
          $('#packageOrderModal .package-order-modal').classList.add('is-package-selection');
          showPackageSelection();
        });
      }
      const returnLink = root.querySelector('.service-package-home-link');
      if (returnLink) {
        returnLink.href = '#';
        returnLink.addEventListener('click', event => {
          event.preventDefault();
          $('#packageWizardMount').hidden = true;
          $('#packageSelection').hidden = false;
          $('#packageOrderModal .package-order-modal').classList.add('is-package-selection');
          showPackageSelection();
        });
      }

      const imageUrl = new URL(`../store-front/assets/${packageOffering.image}`, window.location.href).href;
      window.initializeServicePackageFragment(
        root,
        packageOffering,
        window.angelizStorefrontProducts,
        imageUrl,
        placement => addPackageOrderRow(placement)
      );
      showOverlay('#packageOrderModal');
    } catch (error) {
      console.error(error);
      $('#packageWizardMount').hidden = true;
      $('#packageSelection').hidden = false;
      $('#packageOrderModal .package-order-modal').classList.add('is-package-selection');
      showPackageSelection();
      toast(error.message || 'Could not open the package wizard.', 'warn');
    }
  }

  function addPackageOrderRow(placement) {
    const orderNumber = 'ORD-' + String(nextOrderNumber++).padStart(4, '0');
    const id = `branch-${orderNumber}`;
    const order = placement.order;
    const isBooking = Boolean(placement.bookingOnly || placement.packageOffering.bookingOnly);
    const packageOffering = placement.packageOffering;
    const bookingStore = window.AngelizOrderBookingStore;
    if (!bookingStore) throw new Error('The shared order and booking store did not load.');
    const itemNames = placement.items.map(item => {
      const product = window.angelizStorefrontProducts.find(candidate => candidate.id === item.productId);
      return product ? `${product.name} ×${item.quantity}` : 'Package item';
    });
    const packageInclusions = placement.inclusions?.length
      ? placement.inclusions
      : packageOffering.inclusions;
    const includedItems = Array.isArray(packageInclusions)
      ? packageInclusions.map(item => `${item.quantity} ${item.name}`)
      : [];
    const packageDetails = itemNames.length ? itemNames : includedItems;
    const itemSummary = [packageOffering.title, ...packageDetails].filter(Boolean).join(' · ');
    const preferredDate = fmtDate(order.deliveryDate || '');
    const customer = (order.customerName || 'Package Customer').trim();
    const notes = [
      order.additionalInformation,
      order.giftMessage && `Gift message: ${order.giftMessage}`
    ].filter(Boolean).join('; ');
    const record = {
      id,
      orderNumber,
      referenceNumber: `${id}-${placement.placedAt.getTime()}`, 
      recordType: isBooking ? 'booking' : 'order',
      bookingOnly: isBooking,
      branchName: 'Yashano Mall Branch',
      customerName: customer,
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone || '',
      type: 'Package',
      title: packageOffering.title,
      packageId: packageOffering.id,
      packageOffering: { ...packageOffering },
      items: placement.items,
      inclusions: placement.inclusions,
      unselectedInclusions: placement.unselectedInclusions,
      pax: placement.pax || packageOffering.pax || '',
      fulfillment: order.fulfillment || '',
      deliveryAddress: order.deliveryAddress || order.recipientAddress || '',
      recipientName: order.recipientName || '',
      recipientContact: order.recipientContact || '',
      recipientAddress: order.recipientAddress || '',
      deliveryDate: order.deliveryDate || '',
      deliveryTime: order.deliveryTime || '',
      requestedFor: [order.deliveryDate, order.deliveryTime].filter(Boolean).join(' '),
      paymentStatus: placement.paymentStatus || order.paymentStatus || (isBooking ? 'unpaid-booking' : 'pending-preview'),
      paymentMethod: order.paymentMethod || '',
      total: placement.total || packageOffering.price || 'Price to be confirmed',
      confirmedPrice: order.confirmedPrice || '',
      priceStatus: placement.priceStatus || '',
      productionStatus: isBooking ? 'Booking Requested' : 'Pending',
      bookingStatus: isBooking ? 'Booking Requested' : undefined,
      additionalInformation: order.additionalInformation || '',
      giftMessage: order.giftMessage || '',
      notes,
      createdAt: placement.placedAt.toISOString()
    };
    const row = document.createElement('tr');
    row.dataset.type = 'Package';
    row.dataset.status = isBooking ? 'Booking Requested' : 'Pending';
    row.dataset.booking = String(isBooking);
    row.dataset.recordId = id;
    row.dataset.customer = customer;
    row.dataset.item = itemSummary;
    row.dataset.date = preferredDate || 'To be confirmed';
    row.dataset.time = order.deliveryTime || '';
    row.dataset.payment = order.paymentMethod || 'Pending';
    row.dataset.amount = packageOffering.price || 'To be confirmed';
    row.dataset.contact = order.customerPhone || '';
    row.dataset.email = order.customerEmail || '';
    row.dataset.fulfillment = order.fulfillment || 'To be confirmed';
    row.dataset.address = order.deliveryAddress || order.recipientAddress || '';
    row.dataset.recipient = [
      order.recipientName,
      order.recipientContact,
      order.recipientAddress
    ].filter(Boolean).join(' · ');
    row.dataset.notes = notes;
    row.dataset.branch = 'Yashano Mall Branch';
    row.dataset.referenceNumber = `${id}-${placement.placedAt.getTime()}`;
    row.dataset.packageId = packageOffering.id;
    row.dataset.pax = placement.pax || packageOffering.pax || '';
    row.dataset.bookingStatus = isBooking ? 'Booking Requested' : '';
    row.dataset.paymentStatus = placement.paymentStatus || order.paymentStatus || (isBooking ? 'unpaid-booking' : 'pending-preview');
    row.dataset.search = `${orderNumber} ${customer} ${itemSummary} ${row.dataset.date} ${row.dataset.time} Package Pending ${row.dataset.payment}`;

    const values = [orderNumber, customer, 'Package', row.dataset.amount];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 0) cell.className = 'order-id-cell';
      row.append(cell);
    });
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge badge-amber';
    statusBadge.textContent = 'Pending';
    statusCell.append(statusBadge);
    row.append(statusCell);
    const actionCell = document.createElement('td');
    const viewButton = document.createElement('button');
    viewButton.className = 'order-view-button';
    viewButton.type = 'button';
    viewButton.dataset.viewOrder = '';
    viewButton.setAttribute('aria-label', `View order ${orderNumber}`);
    viewButton.textContent = 'View';
    actionCell.append(viewButton);
    row.append(actionCell);
    if (isBooking) {
      const bookingRow = document.createElement('tr');
      bookingRow.dataset.type = row.dataset.type;
      bookingRow.dataset.status = row.dataset.bookingStatus;
      bookingRow.dataset.item = row.dataset.item;
      bookingRow.dataset.date = row.dataset.date;
      bookingRow.dataset.time = row.dataset.time;
      bookingRow.dataset.payment = row.dataset.payment;
      bookingRow.dataset.amount = row.dataset.amount;
      bookingRow.dataset.contact = row.dataset.contact;
      bookingRow.dataset.email = row.dataset.email;
      bookingRow.dataset.fulfillment = row.dataset.fulfillment;
      bookingRow.dataset.address = row.dataset.address;
      bookingRow.dataset.recipient = row.dataset.recipient;
      bookingRow.dataset.notes = row.dataset.notes;
      bookingRow.dataset.search = row.dataset.search;
      bookingRow.dataset.booking = 'true';
      bookingRow.dataset.recordId = id;
      [orderNumber, customer, packageOffering.title, [row.dataset.date, row.dataset.time].filter(Boolean).join(' '), row.dataset.amount, row.dataset.payment].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value || '—';
        bookingRow.append(cell);
      });
      const bookingStatusCell = document.createElement('td');
      const bookingStatusBadge = document.createElement('span');
      bookingStatusBadge.className = 'status-badge badge-amber';
      bookingStatusBadge.textContent = 'Booking Requested';
      bookingStatusCell.append(bookingStatusBadge);
      bookingRow.append(bookingStatusCell);
      const bookingAction = document.createElement('td');
      const bookingView = document.createElement('button');
      bookingView.className = 'order-view-button';
      bookingView.type = 'button';
      bookingView.dataset.viewOrder = '';
      bookingView.textContent = 'View';
      bookingAction.append(bookingView);
      bookingRow.append(bookingAction);
      bookingRows.prepend(bookingRow);
    } else {
      $('#ordTable tbody').prepend(row);
      $('#kpiPending').textContent = String(Number($('#kpiPending').textContent) + 1);
    }
    bookingStore.save({
      id,
      orderNumber,
      referenceNumber: row.dataset.referenceNumber,
      recordType: isBooking ? 'booking' : 'order',
      bookingOnly: isBooking,
      branchName: row.dataset.branch,
      customerName: customer,
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone || '',
      title: packageOffering.title,
      type: 'Package',
      recordSource: 'branch-admin',
      packageId: packageOffering.id,
      packageOffering: { ...packageOffering, selectedItems: placement.items, selectedInclusions: placement.inclusions, unselectedInclusions: placement.unselectedInclusions },
      items: placement.items,
      inclusions: placement.inclusions,
      unselectedInclusions: placement.unselectedInclusions,
      pax: row.dataset.pax,
      fulfillment: order.fulfillment,
      deliveryAddress: order.deliveryAddress || order.recipientAddress || '',
      recipientName: order.recipientName || '',
      recipientContact: order.recipientContact || '',
      recipientAddress: order.recipientAddress || '',
      deliveryDate: order.deliveryDate || '',
      deliveryTime: order.deliveryTime || '',
      requestedFor: [order.deliveryDate, order.deliveryTime].filter(Boolean).join(' '),
      paymentStatus: row.dataset.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      total: placement.total || packageOffering.price || 'Price to be confirmed',
      confirmedPrice: order.confirmedPrice || '',
      priceStatus: placement.priceStatus || '',
      productionStatus: isBooking ? 'Booking Requested' : 'Pending',
      bookingStatus: isBooking ? 'Booking Requested' : '',
      additionalInformation: order.additionalInformation || '',
      giftMessage: order.giftMessage || '',
      notes,
      createdAt: placement.placedAt.toISOString()
    });
    sharedOrderStore.save(record);
    applyFilters();
    toast(`${id} created as ${orderNumber}.`);
    return {
      orderNumber,
      referenceNumber: `${id}-${placement.placedAt.getTime()}`
    };
  }

  $('#newPackageOrderBtn').addEventListener('click', openPackageModal);
  $('#closePackageOrderBtn').addEventListener('click', () => hideOverlay('#packageOrderModal'));
  $('#packageSelectionGrid').addEventListener('click', event => {
    const choice = event.target.closest('[data-select-package]');
    if (!choice) return;
    const packageOffering = window.angelizStorefrontServices.find(
      offering => offering.id === choice.dataset.selectPackage
    );
    if (!packageOffering) {
      toast('The selected storefront package is unavailable.', 'warn');
      return;
    }
    $('#packageSelection').hidden = true;
    $('#packageWizardMount').hidden = false;
    openPackageWizard(packageOffering);
  });

  /* ============================================================
     order table filters
     ============================================================ */
  const q = $('#ordSearch');
  const s = $('#ordStatus');
  const t = $('#ordType');

  function addOrderViewAction(row){
    if(row.querySelector('[data-view-order]')) return;
    const cell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'order-view-button';
    button.type = 'button';
    button.textContent = 'View';
    button.setAttribute('aria-label', `View order ${row.cells[0].textContent.trim()}`);
    button.dataset.viewOrder = '';
    cell.append(button);
    row.append(cell);
  }

  $$('#ordTable tbody tr').forEach(addOrderViewAction);
  const openOrderDetails = event => {
    if (!(event.target instanceof Element)) return;
    const viewButton = event.target.closest('[data-view-order]');
    if (!viewButton) return;
    const row = viewButton.closest('tr');
    if (!row) return;

    const isBooking = row.dataset.booking === 'true';
    const activeTable = isBooking ? $('#bookingTable') : $('#ordTable');
    const labels = $$('#' + activeTable.id + ' thead th').slice(0, -1);
    const fields = $('#orderDetailsFields');
    fields.replaceChildren();
    labels.forEach((header, index) => {
      const field = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      label.textContent = header.textContent;
      value.textContent = row.cells[index]?.textContent.trim() || '—';
      field.append(label, value);
      fields.append(field);
    });
    [
      ['Cake / Item', row.dataset.item],
      ['Preferred Date', row.dataset.date],
      ['Preferred Time', row.dataset.time],
      ['Payment', row.dataset.payment],
      ['Contact', row.dataset.contact],
      ['Email', row.dataset.email],
      ['Fulfillment', row.dataset.fulfillment],
      ['Address', row.dataset.address],
      ['Recipient', row.dataset.recipient],
      ['Notes', row.dataset.notes]
    ].forEach(([name, text]) => {
      const field = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      label.textContent = name;
      value.textContent = text || '—';
      field.append(label, value);
      fields.append(field);
    });
    let referenceImages = [];
    try { referenceImages = JSON.parse(row.dataset.referenceImages || '[]'); } catch (error) { referenceImages = []; }
    if (referenceImages.length) {
      const photoField = document.createElement('div');
      photoField.className = 'order-detail-photo-field';
      const photoLabel = document.createElement('span');
      photoLabel.textContent = 'Reference photos';
      photoField.appendChild(photoLabel);
      referenceImages.forEach((reference, index) => {
        const source = typeof reference === 'string' ? reference : reference.dataUrl || reference.assetUrl || reference.asset;
        if (!source) return;
        const photo = document.createElement('img');
        photo.className = 'order-detail-image';
        photo.alt = (typeof reference === 'object' && reference.name) || `Reference photo ${index + 1}`;
        photo.src = source.startsWith('data:') || /^https?:/.test(source)
          ? source
          : new URL(source.startsWith('../assets/') ? source : `../assets/${source}`, window.location.href).href;
        photo.addEventListener('error', () => photo.remove(), { once: true });
        photoField.appendChild(photo);
      });
      fields.appendChild(photoField);
    }
    $('#orderDetailsTitle').textContent = `${isBooking ? 'Booking' : 'Order'} ${row.cells[0].textContent.trim()}`;
    $('#orderDetailsSubtitle').textContent = `${row.cells[1].textContent.trim()} · ${row.cells[2].textContent.trim()}`;
    showOverlay('#orderDetailsModal');
    $('#closeOrderDetailsBtn').focus();
  };
  $('#ordTable tbody').addEventListener('click', openOrderDetails);
  bookingRows.addEventListener('click', openOrderDetails);
  $('#closeOrderDetailsBtn').addEventListener('click', () => hideOverlay('#orderDetailsModal'));

  function applyFilters(){
    const term = q.value.toLowerCase().trim();
    const st = s.value;
    const tp = t.value;
    let shown = 0;

    $$('#ordTable tbody tr, #bookingRows tr').forEach(tr => {
      const ok =
        (!term || (tr.dataset.search || tr.textContent).toLowerCase().indexOf(term) !== -1) &&
        (!st || tr.dataset.status === st) &&
        (!tp || tr.dataset.type === tp);
      tr.style.display = ok ? '' : 'none';
      if(ok) shown++;
    });

    $('#ordEmpty').style.display = shown ? 'none' : 'block';
  }

  q.addEventListener('input', applyFilters);
  s.addEventListener('change', applyFilters);
  t.addEventListener('change', applyFilters);

  /* ============================================================
     init
     ============================================================ */
})();
