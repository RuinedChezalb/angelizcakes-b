"use strict";

(() => {
  // Sample orders cover each storefront order flow; real orders come from the shared local database.
  const seededWebsiteOrders = [
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
  const rows = document.getElementById("websiteOrderRows");
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
    || closeButtons.length === 0
  ) {
    throw new TypeError("The website order table or details dialog is missing required elements.");
  }

  productionStatuses.forEach(status => {
    const option = document.createElement("option");
    option.value = status.value;
    option.textContent = status.value;
    productionStatusSelect.append(option);
  });

  const assetBase = new URL("../../store-front/assets/", document.currentScript.src);
  let activeTrigger = null;
  let activeOrder = null;
  let websiteOrders = [];

  function loadWebsiteOrders() {
    const storedOrders = window.AngelizDB.orders.list()
      .slice()
      .sort((left, right) => right.seq - left.seq)
      .map(order => ({ ...order, stored: true }));
    return [...storedOrders, ...seededWebsiteOrders];
  }

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
    image.src = product.image.startsWith("data:")
      ? product.image
      : new URL(product.image, assetBase).href;
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
    details.append(createOrderCard("Cake Customization", order.selections));
    if (order.referenceImage) {
      const previewCard = document.createElement("section");
      previewCard.className = "storefront-order-card storefront-order-custom-preview";
      const image = document.createElement("img");
      image.src = new URL(order.referenceImage.asset, assetBase).href;
      image.alt = `${order.referenceImage.name} reference image`;
      const previewContent = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = "Reference Image";
      const reference = document.createElement("p");
      reference.textContent = `Use as reference: ${order.previewUsedAsReference ? "Yes" : "No"}`;
      previewContent.append(heading, reference);
      previewCard.append(image, previewContent);
      details.append(previewCard);
    }
    details.append(createOrderCard("Personalize & Schedule", order.contact));
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
  }

  function renderRows() {
    websiteOrders = loadWebsiteOrders();
    rows.replaceChildren(...websiteOrders.map(order => {
      const row = document.createElement("tr");
      row.dataset.websiteOrderId = order.id;
      [order.id, order.customer, order.type, order.amount].forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (index === 0) cell.className = "strong";
        row.append(cell);
      });

      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `badge ${getStatusStyle(order.productionStatus)}`;
      statusBadge.textContent = order.productionStatus;
      statusBadge.dataset.productionStatus = "";
      statusCell.append(statusBadge);
      row.append(statusCell);

      const actionCell = document.createElement("td");
      const viewButton = document.createElement("button");
      viewButton.className = "btn btn-outline btn-sm";
      viewButton.type = "button";
      viewButton.textContent = "View";
      viewButton.setAttribute("aria-label", `View order ${order.id}`);
      viewButton.dataset.viewWebsiteOrder = order.id;
      actionCell.append(viewButton);
      row.append(actionCell);
      return row;
    }));
  }

  rows.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest("[data-view-website-order]");
    if (!trigger) return;
    const order = websiteOrders.find(item => item.id === trigger.dataset.viewWebsiteOrder);
    if (!order) throw new RangeError(`Unknown website order ID: ${trigger.dataset.viewWebsiteOrder}`);
    activeTrigger = trigger;
    activeOrder = order;
    renderOrderDetails(order);
    modal.classList.add("show");
    productionStatusSelect.focus();
  });

  updateProductionStatusButton.addEventListener("click", () => {
    if (!activeOrder) throw new Error("A website order must be open before updating its production status.");
    const status = productionStatuses.find(item => item.value === productionStatusSelect.value);
    if (!status) throw new RangeError(`Unknown production status: ${productionStatusSelect.value}`);
    const row = [...rows.querySelectorAll("tr")]
      .find(item => item.dataset.websiteOrderId === activeOrder.id);
    const statusBadge = row?.querySelector("[data-production-status]");
    if (!statusBadge) throw new Error(`The production status cell for ${activeOrder.id} is missing.`);

    activeOrder.productionStatus = status.value;
    if (activeOrder.stored) window.AngelizDB.orders.update(activeOrder.id, { productionStatus: status.value });
    statusBadge.className = `badge ${status.badgeClass}`;
    statusBadge.textContent = status.value;
    statusFeedback.textContent = `Production status updated to ${status.value}.`;
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

  const posRows = document.getElementById("posOrderRows");
  if (!posRows) throw new TypeError("The walk-in order table is missing.");

  function renderPosRows() {
    posRows.querySelectorAll("[data-pos-transaction]").forEach(row => row.remove());
    const transactionRows = window.AngelizDB.pos.transactions().map(transaction => {
      const row = document.createElement("tr");
      row.dataset.posTransaction = transaction.id;
      const reference = document.createElement("td");
      reference.className = "strong";
      reference.textContent = `#${transaction.id}`;
      const customer = document.createElement("td");
      customer.textContent = transaction.customer || "Walk-in Customer";
      const branch = document.createElement("td");
      branch.textContent = window.AngelizDB.branchNames.yashano;
      const amount = document.createElement("td");
      amount.textContent = window.AngelizDB.format.formatPeso(transaction.total);
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge badge-teal";
      badge.textContent = "Paid / Completed";
      statusCell.append(badge);
      row.append(reference, customer, branch, amount, statusCell);
      return row;
    });
    posRows.prepend(...transactionRows);
  }

  renderRows();
  renderPosRows();
  window.AngelizDB.onChange(window.AngelizDB.keys.orders, () => {
    if (!modal.classList.contains("show")) renderRows();
  });
  window.AngelizDB.onChange(window.AngelizDB.keys.posTransactions, renderPosRows);
})();
