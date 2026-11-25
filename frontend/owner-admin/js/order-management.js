"use strict";

(() => {
  // The local examples cover each active storefront order flow.
  const websiteOrders = [
    {
      id: "#W-1024",
      customer: "Maria Cruz",
      type: "Customized Cake",
      amount: "To be confirmed",
      productionStatus: "Baking",
      flow: "customized",
      selections: [
        { label: "Occasion", value: "Birthday" },
        { label: "Theme & Color", value: "Floral Elegance · Pink & White" },
        { label: "Layers per tier", value: "2 layers per tier" },
        {
          label: "Tiers",
          value: "2 tiers · Sizes specified — Tier 1: height 4 inches, width 6 inches; Tier 2: height 4 inches, width 4 inches"
        },
        { label: "Flavor", value: "Vanilla" },
        { label: "Frosting", value: "Buttercream" }
      ],
      previewUsedAsReference: true,
      referenceImage: {
        asset: "signature-cake.jpg",
        name: "Signature Celebration Cake"
      },
      contact: [
        { label: "Cake dedication text", value: "Happy 8th Birthday, Lily!" },
        { label: "Your full name", value: "Maria Cruz" },
        { label: "Email", value: "maria.cruz@example.com" },
        { label: "Phone", value: "09171234567" }
      ],
      recipient: {
        value: "Yes",
        fields: [
          { label: "Recipient name", value: "Lily Cruz" },
          { label: "Recipient email or phone", value: "09179876543" },
          { label: "Recipient address", value: "12 Sampaguita Street, Legazpi City" },
          { label: "Gift message", value: "Wishing you a lovely birthday!" }
        ]
      },
      schedule: [
        { label: "Preferred date", value: "August 16" },
        { label: "Preferred time", value: "10:00 AM" },
        { label: "Payment method", value: "GCash" },
        { label: "Delivery or pickup", value: "Delivery" },
        { label: "Delivery address", value: "12 Sampaguita Street, Legazpi City" },
        { label: "Reference images", value: "Signature Celebration Cake" },
        { label: "Extra notes for our bakers", value: "Please use pastel pink flowers and keep the lettering easy to read." }
      ]
    },
    {
      id: "#W-1023",
      customer: "Jose Santos",
      type: "Package",
      amount: "₱8,500",
      productionStatus: "Preparing",
      flow: "package",
      package: {
        name: "Sakura Grazing Table",
        category: "Grazing Tables",
        description: "A curated grazing spread with assorted cheeses and fresh fruit platters.",
        price: "₱8,500",
        priceNote: "Final package pricing is confirmed by the bakery.",
        image: "catering.jpg",
        inclusions: [
          { quantity: "1 set", name: "Assorted Cheeses" },
          { quantity: "2 platters", name: "Fresh Fruits" }
        ]
      },
      contact: [
        { label: "Full name", value: "Jose Santos" },
        { label: "Email", value: "jose.santos@example.com" },
        { label: "Phone", value: "09181234567" }
      ],
      recipient: { value: "No", fields: [] },
      schedule: [
        { label: "Delivery or pickup", value: "Pick up" },
        { label: "Pickup location", value: "Cabangan Branch — Main Hub & Production Studio, Cabangan, Legazpi City" },
        { label: "Preferred date", value: "August 20" },
        { label: "Preferred time", value: "1:00 PM" },
        { label: "Payment method", value: "BPI" },
        { label: "Additional information", value: "Please have the package ready for a small family gathering." }
      ]
    },
    {
      id: "#W-1022",
      customer: "Ana Lim",
      type: "Menu Preset",
      amount: "₱1,850.00",
      productionStatus: "Decorating",
      flow: "menu",
      product: {
        name: "Signature Celebration Cake",
        category: "Cakes",
        image: "signature-cake.jpg",
        price: "₱1,850.00",
        classification: "Celebration cake",
        ingredients: "Contact the bakery for the current ingredient list.",
        allergens: "Contact the bakery to confirm allergen information before ordering.",
        customization: [
          { label: "Occasion", value: "Discuss with the bakery" },
          { label: "Theme", value: "Discuss with the bakery" },
          { label: "Color", value: "Discuss with the bakery" },
          { label: "Layer", value: "Discuss with the bakery" },
          { label: "Tier", value: "Discuss with the bakery" },
          { label: "Size (per tier)", value: "Discuss with the bakery" },
          { label: "Flavor", value: "Discuss with the bakery" },
          { label: "Frosting", value: "Discuss with the bakery" }
        ]
      },
      pricing: [
        { label: "Price", value: "₱1,850.00" },
        { label: "Shipping", value: "₱0.00 (pickup)" },
        { label: "Total", value: "₱1,850.00" }
      ],
      priceNote: "Pickup is free. The bakery will confirm availability and the order schedule.",
      retouches: [
        { label: "Age", value: "18" },
        { label: "Name for dedication", value: "Happy Birthday, Ana!" },
        { label: "Character", value: "Sakura" },
        { label: "Other specifications", value: "Soft pink and white palette; simple floral accents." }
      ],
      contact: [
        { label: "Full name", value: "Ana Lim" },
        { label: "Email", value: "ana.lim@example.com" },
        { label: "Phone", value: "09191234567" }
      ],
      recipient: { value: "No", fields: [] },
      schedule: [
        { label: "Delivery or pickup", value: "Pick up" },
        { label: "Pickup location", value: "Cabangan Branch — Main Hub & Production Studio, Cabangan, Legazpi City" },
        { label: "Preferred date", value: "August 18" },
        { label: "Preferred time", value: "11:30 AM" },
        { label: "Payment method", value: "Cash on delivery / pickup" },
        { label: "Additional information", value: "Not provided" }
      ]
    }
  ];

  const productionStatuses = [
    { value: "Preparing", badgeClass: "badge-blue" },
    { value: "Baking", badgeClass: "badge-amber" },
    { value: "Decorating", badgeClass: "badge-pink" },
    { value: "Ready", badgeClass: "badge-teal" },
    { value: "Completed", badgeClass: "badge-teal" }
  ];
  const sharedOrderStore = window.AngelizOrderBookingStore;
  if (!sharedOrderStore) throw new Error('The shared order and booking store did not load.');
  const sharedDatabase = window.AngelizSharedDatabase;
  if (!sharedDatabase) throw new Error('The shared three-user CRUD database did not load.');
  const rows = document.getElementById("websiteOrderRows");
  const bookingRows = document.getElementById('ownerBookingRows');
  const bookingStatusUpdater = document.getElementById('bookingStatusUpdater');
  const bookingStatusSelect = document.getElementById('bookingStatusSelect');
  const updateBookingStatusButton = document.getElementById('updateBookingStatus');
  const bookingStatusFeedback = document.getElementById('bookingStatusFeedback');
  const modal = document.getElementById("websiteOrderModal");
  const modalTitle = document.getElementById("websiteOrderTitle");
  const modalSubtitle = document.getElementById("websiteOrderSubtitle");
  const details = document.getElementById("websiteOrderDetails");
  const productionStatusSelect = document.getElementById("websiteOrderProductionStatus");
  const updateProductionStatusButton = document.getElementById("updateWebsiteOrderStatus");
  const statusFeedback = document.getElementById("websiteOrderStatusFeedback");
  const closeButtons = [...document.querySelectorAll("[data-close-website-order]")];
  if (
    !rows || !modal || !modalTitle || !modalSubtitle || !details
    || !productionStatusSelect || !updateProductionStatusButton || !statusFeedback
    || !bookingRows || !bookingStatusUpdater || !bookingStatusSelect || !updateBookingStatusButton || !bookingStatusFeedback
    || closeButtons.length === 0
  ) {
    throw new TypeError("The website order table or details dialog is missing required elements.");
  }

  const bookingStatuses = [...productionStatuses.map(status => status.value), 'Confirmed', 'Cancelled'];
  productionStatuses.forEach(status => {
    const option = document.createElement("option");
    option.value = status.value;
    option.textContent = status.value;
    productionStatusSelect.append(option);
  });
  bookingStatuses.forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    bookingStatusSelect.append(option);
  });

  const assetBase = new URL("../../assets/", document.currentScript.src);
  let activeTrigger = null;
  let activeOrder = null;

  function getStatusStyle(statusValue) {
    const status = productionStatuses.find(item => item.value === statusValue);
    if (!status) throw new RangeError(`Unknown production status: ${statusValue}`);
    return status.badgeClass;
  }

  function createFieldList(fields) {
    const list = document.createElement("dl");
    list.className = "storefront-order-fields";
    fields.forEach(field => {
      const row = document.createElement("div");
      const label = document.createElement("dt");
      const value = document.createElement("dd");
      label.textContent = field.label;
      value.textContent = field.value || "Not provided";
      row.append(label, value);
      list.append(row);
    });
    return list;
  }

  function createOrderCard(title, fields, note) {
    const card = document.createElement("section");
    card.className = "storefront-order-card";
    const heading = document.createElement("h3");
    heading.textContent = title;
    card.append(heading);
    if (fields.length) card.append(createFieldList(fields));
    if (note) {
      const noteElement = document.createElement("p");
      noteElement.className = "storefront-order-note";
      noteElement.textContent = note;
      card.append(noteElement);
    }
    return card;
  }

  function createProductSummary(product, includeDescription = false) {
    const card = document.createElement("section");
    card.className = "storefront-order-card storefront-order-product";
    const image = document.createElement("img");
    const imageSource = product.image || '';
    image.src = imageSource.startsWith('data:') || /^https?:/.test(imageSource)
      ? imageSource
      : new URL(imageSource.replace(/^\.\.\/assets\//, ''), assetBase).href;
    image.alt = product.name;
    const content = document.createElement("div");
    const category = document.createElement("p");
    category.className = "storefront-order-eyebrow";
    category.textContent = product.category;
    const name = document.createElement("h3");
    name.textContent = product.name;
    content.append(category, name);
    if (includeDescription && product.description) {
      const description = document.createElement("p");
      description.className = "storefront-order-description";
      description.textContent = product.description;
      content.append(description);
    }
    card.append(image, content);
    return card;
  }

  function createInclusionList(inclusions) {
    const list = document.createElement("ul");
    list.className = "storefront-order-inclusions";
    inclusions.forEach(inclusion => {
      const item = document.createElement("li");
      const quantity = document.createElement("strong");
      quantity.textContent = inclusion.quantity;
      const name = document.createElement("span");
      name.textContent = inclusion.name;
      item.append(quantity, name);
      list.append(item);
    });
    return list;
  }

  function appendRecipientCard(order) {
    const fields = [{ label: "Ordering for someone else?", value: order.recipient.value }];
    if (order.recipient.value === "Yes") fields.push(...order.recipient.fields);
    details.append(createOrderCard("Recipient", fields));
  }

  function renderCustomCake(order) {
    const referenceImages = Array.isArray(order.referenceImages) ? order.referenceImages : [order.referenceImage].filter(Boolean);
    const previewCard = document.createElement("section");
    previewCard.className = "storefront-order-card storefront-order-custom-preview";
    const previewContent = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = "Reference Images";
    const reference = document.createElement("p");
    reference.textContent = `Use as reference: ${order.previewUsedAsReference ? "Yes" : "No"}`;
    previewContent.append(heading, reference);
    const imageGallery = document.createElement('div');
    imageGallery.className = 'storefront-order-reference-gallery';
    referenceImages.forEach((referenceImage, index) => {
      const source = typeof referenceImage === 'string' ? referenceImage : referenceImage.dataUrl || referenceImage.assetUrl || referenceImage.asset;
      if (!source) return;
      const image = document.createElement('img');
      image.alt = `${(typeof referenceImage === 'object' && referenceImage.name) || 'Cake'} reference image ${index + 1}`;
      image.src = source.startsWith('data:') || /^https?:/.test(source) ? source : new URL(source.replace(/^\.\.\/assets\//, ''), assetBase).href;
      image.addEventListener('error', () => image.remove(), { once: true });
      imageGallery.appendChild(image);
    });
    if (!imageGallery.childElementCount) return;
    previewCard.append(previewContent, imageGallery);
    details.append(
      createOrderCard("Cake Customization", order.selections),
      previewCard,
      createOrderCard("Personalize & Schedule", order.contact)
    );
    appendRecipientCard(order);
    details.append(createOrderCard("Order Schedule", order.schedule));
    details.append(createOrderCard("Pricing", [
      { label: "Amount", value: "To be confirmed" }
    ]));
  }

  function renderPackage(order) {
    const packageCard = createProductSummary(order.package, true);
    const inclusionCard = createOrderCard("Package Inclusions", [
      { label: "Package price", value: order.package.price },
      { label: "Included items", value: `${order.package.inclusions.length} items` }
    ], order.package.priceNote);
    inclusionCard.append(createInclusionList(order.package.inclusions));
    details.append(packageCard, inclusionCard);
    details.append(createOrderCard("Customer Information", order.contact));
    appendRecipientCard(order);
    details.append(createOrderCard("Order Schedule", order.schedule));
  }

  function renderMenuOrder(order) {
    details.append(createProductSummary(order.product));
    details.append(createOrderCard("Product Information", [
      { label: "Classification", value: order.product.classification },
      { label: "Ingredients", value: order.product.ingredients },
      { label: "Allergens", value: order.product.allergens }
    ]));
    details.append(createOrderCard("Product Options", order.product.customization));
    details.append(createOrderCard("Price Summary", order.pricing, order.priceNote));
    details.append(createOrderCard("Cake Retouches", order.retouches));
    details.append(createOrderCard("Customer Information", order.contact));
    appendRecipientCard(order);
    details.append(createOrderCard("Order Schedule", order.schedule));
  }

  function renderOrderDetails(order) {
    activeSharedRecord = null;
    bookingStatusUpdater.hidden = true;
    modalTitle.textContent = `Order ${order.id}`;
    modalSubtitle.textContent = `${order.customer} · ${order.type}`;
    productionStatusSelect.value = order.productionStatus;
    statusFeedback.textContent = "";
    details.replaceChildren();

    if (order.flow === "customized") renderCustomCake(order);
    else if (order.flow === "package") renderPackage(order);
    else if (order.flow === "menu") renderMenuOrder(order);
    else throw new RangeError(`Unknown website order flow: ${order.flow}`);
  }

  function closeOrderDetails() {
    if (!modal.classList.contains("show")) return;
    modal.classList.remove("show");
    if (activeTrigger && activeTrigger.isConnected) activeTrigger.focus();
    activeTrigger = null;
    activeOrder = null;
    activeSharedRecord = null;
    bookingStatusUpdater.hidden = true;
  }

  let activeSharedRecord = null;

  function renderSharedBooking(record) {
    details.replaceChildren();
    modalTitle.textContent = `Booking ${record.orderNumber}`;
    modalSubtitle.textContent = `${record.customerName || 'Customer'} · ${record.title}`;
    bookingStatusUpdater.hidden = false;
    bookingStatusSelect.value = record.bookingStatus || 'Booking Requested';
    bookingStatusFeedback.textContent = '';
    productionStatusSelect.value = productionStatuses.some(status => status.value === record.productionStatus) ? record.productionStatus : 'Preparing';
    statusFeedback.textContent = '';
    const fields = [
      ['Order number', record.orderNumber], ['Reference', record.referenceNumber],
      ['Branch', record.branchName], ['Customer', record.customerName], ['Email', record.customerEmail], ['Phone', record.customerPhone],
      ['Package / event', record.title], ['Package ID', record.packageId], ['Guests', record.pax],
      ['Selected items', JSON.stringify(record.items || [])], ['Included items', JSON.stringify(record.inclusions || [])],
      ['Unselected items', JSON.stringify(record.unselectedInclusions || [])], ['Booking status', record.bookingStatus],
      ['Payment status', record.paymentStatus], ['Payment method', record.paymentMethod], ['Price status', record.priceStatus],
      ['Confirmed price', record.confirmedPrice], ['Total', record.total], ['Requested date', record.deliveryDate],
      ['Requested time', record.deliveryTime], ['Fulfillment', record.fulfillment], ['Delivery address', record.deliveryAddress],
      ['Recipient', [record.recipientName, record.recipientContact, record.recipientAddress].filter(Boolean).join(' · ')],
      ['Additional information', record.additionalInformation], ['Gift message', record.giftMessage], ['Notes', record.notes], ['Created', record.createdAt]
    ];
    details.append(createOrderCard('Complete Booking Details', fields.map(([label, value]) => ({ label, value: value || 'Not provided' }))));
    if (record.packageOffering?.image) {
      const image = document.createElement('img');
      image.className = 'shared-order-image';
      image.alt = record.title || 'Package image';
      image.src = new URL(record.packageOffering.image, assetBase).href;
      details.append(image);
    }
  }

  function renderSharedOrders() {
    const records = sharedDatabase.list('orders').filter(record => record.recordType !== 'booking' && !record.bookingOnly);
    rows.replaceChildren(...records.map(record => {
      const order = {
        id: record.orderNumber || record.id,
        customer: record.customerName || 'Customer',
        type: record.type || record.title || 'Order',
        amount: record.total || record.orderTotal || record.amount || 'Price to be confirmed',
        productionStatus: record.productionStatus || 'Preparing'
      };
      const row = document.createElement('tr');
      row.dataset.websiteOrderId = order.id;
      row.dataset.sharedOrderId = record.id;
      [order.id, order.customer, order.type, order.amount].forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 0) cell.className = 'strong';
        row.append(cell);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${productionStatuses.find(item => item.value === order.productionStatus)?.badgeClass || 'badge-blue'}`;
      badge.dataset.productionStatus = '';
      badge.textContent = order.productionStatus;
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      const action = document.createElement('td');
      const view = document.createElement('button');
      view.className = 'btn btn-outline btn-sm';
      view.type = 'button';
      view.dataset.viewSharedOrder = record.id;
      view.textContent = 'View';
      action.appendChild(view);
      row.appendChild(action);
      return row;
    }));
    if (!records.length) rows.replaceChildren(...websiteOrders.map(order => {
      const row = document.createElement('tr');
      row.dataset.websiteOrderId = order.id;
      [order.id, order.customer, order.type, order.amount].forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 0) cell.className = 'strong';
        row.appendChild(cell);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${getStatusStyle(order.productionStatus)}`;
      badge.dataset.productionStatus = '';
      badge.textContent = order.productionStatus;
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      const actionCell = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'btn btn-outline btn-sm';
      button.type = 'button';
      button.dataset.viewWebsiteOrder = order.id;
      button.textContent = 'View';
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      return row;
    }));
  }

  function renderSharedOrderDetails(record) {
    activeSharedRecord = record;
    activeOrder = record;
    modalTitle.textContent = `Order ${record.orderNumber}`;
    modalSubtitle.textContent = `${record.customerName || 'Customer'} · ${record.title || record.type}`;
    productionStatusSelect.value = productionStatuses.some(status => status.value === record.productionStatus) ? record.productionStatus : 'Preparing';
    statusFeedback.textContent = '';
    bookingStatusUpdater.hidden = true;
    details.replaceChildren(createOrderCard('Complete Order Details', Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => ({ label, value: typeof value === 'object' ? JSON.stringify(value, null, 2) : value }))));
  }

  function renderSharedBookings() {
    const records = sharedDatabase.list('orders').filter(record => record.recordType === 'booking' || record.bookingOnly);
    bookingRows.replaceChildren();
    if (!records.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 9;
      cell.textContent = 'No branch bookings have been submitted.';
      row.appendChild(cell);
      bookingRows.appendChild(row);
      return;
    }
    records.forEach(record => {
      const row = document.createElement('tr');
      row.dataset.sharedBookingId = record.id;
      const values = [record.orderNumber, record.customerName, record.branchName, record.title, record.requestedFor, record.confirmedPrice || record.total, record.paymentStatus];
      values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value || 'Not provided';
        row.appendChild(cell);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${record.bookingStatus === 'Cancelled' ? 'badge-red' : record.bookingStatus === 'Confirmed' ? 'badge-teal' : 'badge-amber'}`;
      badge.textContent = record.bookingStatus || 'Booking Requested';
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      const actionCell = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'btn btn-outline btn-sm';
      button.type = 'button';
      button.textContent = 'View / Update';
      button.dataset.viewSharedBooking = record.id;
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      bookingRows.appendChild(row);
    });
  }

  function renderSharedOrders() {
    const records = sharedOrderStore.read().filter(record => record.recordType !== 'booking' && !record.bookingOnly);
    if (!records.length) {
      rows.replaceChildren(...websiteOrders.map(renderSampleOrderRow));
      return;
    }
    rows.replaceChildren(...records.map(record => {
      const row = document.createElement('tr');
      row.dataset.sharedOrderId = record.id;
      row.dataset.websiteOrderId = record.orderNumber || record.id;
      const values = [record.orderNumber || record.id, record.customerName || 'Customer', record.branchName || 'Unassigned', record.type || record.title || 'Order', record.total || record.orderTotal || record.amount || 'Price to be confirmed', record.paymentStatus || 'Not provided'];
      values.forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 0) cell.className = 'strong';
        row.appendChild(cell);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${getStatusStyle(record.productionStatus || 'Preparing')}`;
      badge.dataset.productionStatus = '';
      badge.textContent = record.productionStatus || 'Preparing';
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      const actionCell = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'btn btn-outline btn-sm';
      button.type = 'button';
      button.dataset.viewSharedOrder = record.id;
      button.textContent = 'View';
      actionCell.appendChild(button);
      row.appendChild(actionCell);
      return row;
    }));
  }

  function renderSampleOrderRow(order) {
    const row = document.createElement('tr');
    row.dataset.websiteOrderId = order.id;
    [order.id, order.customer, order.type, order.amount].forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 0) cell.className = 'strong';
      row.appendChild(cell);
    });
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${getStatusStyle(order.productionStatus)}`;
    badge.dataset.productionStatus = '';
    badge.textContent = order.productionStatus;
    statusCell.appendChild(badge);
    row.appendChild(statusCell);
    const actionCell = document.createElement('td');
    const view = document.createElement('button');
    view.className = 'btn btn-outline btn-sm';
    view.type = 'button';
    view.dataset.viewWebsiteOrder = order.id;
    view.textContent = 'View';
    actionCell.appendChild(view);
    row.appendChild(actionCell);
    return row;
  }
  renderSharedOrders();

  rows.addEventListener('click', event => {
    const sharedButton = event.target.closest('[data-view-shared-order]');
    if (sharedButton) {
      activeTrigger = sharedButton;
      activeOrder = null;
      activeSharedRecord = sharedOrderStore.read().find(record => record.id === sharedButton.dataset.viewSharedOrder);
      if (!activeSharedRecord) return;
      renderSharedOrderDetails(activeSharedRecord);
      modal.classList.add('show');
      productionStatusSelect.focus();
      return;
    }
    const trigger = event.target.closest('[data-view-website-order]');
    if (!trigger) return;
    const order = websiteOrders.find(item => item.id === trigger.dataset.viewWebsiteOrder);
    if (!order) return;
    activeTrigger = trigger;
    activeOrder = order;
    activeSharedRecord = null;
    renderOrderDetails(order);
    modal.classList.add('show');
    productionStatusSelect.focus();
  });

  bookingRows.addEventListener('click', event => {
    const button = event.target.closest('[data-view-shared-booking]');
    if (!button) return;
    activeTrigger = button;
    activeOrder = null;
    activeSharedRecord = sharedOrderStore.read().find(record => record.id === button.dataset.viewSharedBooking);
    if (!activeSharedRecord) return;
    renderSharedBooking(activeSharedRecord);
    modal.classList.add('show');
    bookingStatusSelect.focus();
  });

  updateBookingStatusButton.addEventListener('click', () => {
    if (!activeSharedRecord) return;
    try {
      activeSharedRecord = sharedDatabase.updateOrder(activeSharedRecord.id, { bookingStatus: bookingStatusSelect.value, status: bookingStatusSelect.value === 'Cancelled' ? 'cancelled-preview' : bookingStatusSelect.value === 'Confirmed' ? 'confirmed-preview' : `${bookingStatusSelect.value.toLowerCase().replace(/\\s+/g, '-')}-preview` });
      renderSharedBookings();
      renderSharedBooking(activeSharedRecord);
      bookingStatusFeedback.textContent = `Booking status updated to ${bookingStatusSelect.value}.`;
    } catch (error) {
      bookingStatusFeedback.textContent = error.message;
    }
  });

  updateProductionStatusButton.addEventListener('click', () => {
    const status = productionStatuses.find(item => item.value === productionStatusSelect.value);
    if (!status) return;
    if (activeSharedRecord?.recordType === 'order') {
      sharedOrderStore.updateStatus(activeSharedRecord.id, status.value, 'productionStatus');
      activeSharedRecord = sharedOrderStore.read().find(record => record.id === activeSharedRecord.id);
      renderSharedOrders();
      renderSharedOrderDetails(activeSharedRecord);
      statusFeedback.textContent = `Production status updated to ${status.value}.`;
      return;
    }
    if (!activeOrder) throw new Error("A website order must be open before updating its production status.");
    const row = [...rows.querySelectorAll("tr")]
      .find(item => item.dataset.websiteOrderId === activeOrder.id);
    const statusBadge = row?.querySelector("[data-production-status]");
    if (!statusBadge) throw new Error(`The production status cell for ${activeOrder.id} is missing.`);

    activeOrder.productionStatus = status.value;
    statusBadge.className = `badge ${status.badgeClass}`;
    statusBadge.textContent = status.value;
    statusFeedback.textContent = `Production status updated to ${status.value}.`;
  });

  renderSharedOrders();
  renderSharedBookings();
  window.addEventListener(sharedDatabase.eventName, () => { renderSharedOrders(); renderSharedBookings(); });
  window.addEventListener('storage', event => {
    if (event.key === sharedDatabase.key) { renderSharedOrders(); renderSharedBookings(); }
  });
  closeButtons.forEach(button => button.addEventListener("click", closeOrderDetails));
  modal.addEventListener("click", event => {
    if (event.target === modal) closeOrderDetails();
  });
  document.addEventListener("keydown", event => {
    if (!modal.classList.contains("show")) return;
    if (event.key === "Escape") {
      closeOrderDetails();
      return;
    }
    if (event.key !== "Tab") return;

    const focusableElements = [...modal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(element => !element.hidden && element.getClientRects().length > 0);
    if (focusableElements.length === 0) return;
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
