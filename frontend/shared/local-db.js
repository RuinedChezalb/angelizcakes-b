"use strict";

/*
  Shared local database for the storefront, branch admin, and owner admin.
  All three front ends run from the same origin (serve the `frontend` folder as the web root),
  so they exchange records through browser localStorage. Swap the read/write helpers for API
  calls when a real backend is available; every consumer goes through window.AngelizDB.
*/
(function () {
  const keys = Object.freeze({
    orders: "angelizCakes.db.orders.v1",
    customers: "angelizCakes.db.customers.v1",
    loginAttempts: "angelizCakes.db.loginAttempts.v1",
    products: "angelizCakes.db.catalog.products.v1",
    presets: "angelizCakes.db.catalog.presets.v1",
    packages: "angelizCakes.db.catalog.packages.v1",
    stockRequests: "angelizCakes.db.stockRequests.v1",
    inquiries: "angelizCakes.storefrontInquiries.v1",
    posTransactions: "angeliz_pos_transactions",
    inventoryBatches: "angeliz_branch_inventory_batches_v1"
  });
  const CHANGE_EVENT = "angeliz:db-changed";
  let remoteData = Object.create(null);

  function setRemoteData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    remoteData = { ...remoteData, ...data };
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key: "remote" } }));
  }

  function remoteList(name) {
    return Array.isArray(remoteData[name]) ? remoteData[name] : null;
  }
  const PICKUP_LOCATION = "Cabangan Branch — Main Hub & Production Studio, Cabangan, Legazpi City";
  const BRANCH_NAME = "Yashano Mall Branch";
  const MAIN_BRANCH_NAME = "Main Branch";
  const PACKAGE_CATEGORIES = {
    grazing: "Grazing Tables",
    pastry: "Pastry Buffets",
    party: "Party Packages",
    bundle: "Food Bundles"
  };
  const PRODUCT_CATEGORY_MAP = {
    "Whole Cakes": "Cakes",
    Slices: "Desserts",
    Pastries: "Pastries",
    Breads: "Foods",
    Beverages: "Beverages"
  };
  const PRODUCTION_STATUS_TO_BRANCH = {
    Preparing: "Pending",
    Baking: "Processing",
    Decorating: "Processing",
    Ready: "Ready",
    Completed: "Completed"
  };

  /* ---------- storage primitives ---------- */
  function read(key, fallback) {
    const remoteKey = {
      [keys.orders]: "orders", [keys.customers]: "customers",
      [keys.products]: "products", [keys.presets]: "presets",
      [keys.packages]: "packages", [keys.stockRequests]: "stockRequests",
      [keys.inquiries]: "inquiries", [keys.posTransactions]: "posTransactions",
      [keys.inventoryBatches]: "inventoryBatches"
    }[key];
    if (remoteKey && remoteData[remoteKey] !== undefined) return remoteData[remoteKey];
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      console.error(`Could not read ${key} from the local database.`, error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Could not write ${key} to the local database.`, error);
      return false;
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
    return true;
  }

  function readList(key) {
    const value = read(key, []);
    return Array.isArray(value) ? value : [];
  }

  /* Calls back when another tab/app, or this page, changes one of the watched keys. */
  function onChange(watchedKeys, callback) {
    const watched = [].concat(watchedKeys);
    window.addEventListener("storage", event => {
      if (event.key === null || watched.includes(event.key)) callback(event.key);
    });
    window.addEventListener(CHANGE_EVENT, event => {
      if (watched.includes(event.detail.key)) callback(event.detail.key);
    });
  }

  /* ---------- formatting helpers ---------- */
  function parseAmount(text) {
    const match = String(text || "").match(/[\d,]+(?:\.\d{1,2})?/);
    return match ? Number(match[0].replace(/,/g, "")) : 0;
  }

  function formatPeso(amount, decimals = 2) {
    return `₱${Number(amount).toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  }

  function longDate(value) {
    if (!value) return "To be confirmed";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  function shortDate(value) {
    if (!value) return "To be confirmed";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function clockTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
    if (!match) return value || "To be confirmed";
    const hours = Number(match[1]);
    return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
  }

  function assetUrl(image, base = "assets/") {
    const value = String(image || "");
    return /^(data:|https?:|\/)/.test(value) ? value : `${base}${value}`;
  }

  function storefrontImageName(image, fallback) {
    const value = String(image || "");
    if (!value || value.includes("placehold.co")) return fallback;
    if (/^(data:|https?:)/.test(value)) return value;
    const marker = value.lastIndexOf("assets/");
    return marker >= 0 ? value.slice(marker + "assets/".length) : value;
  }

  /* ---------- customers ---------- */
  function listCustomers() {
    return readList(keys.customers);
  }

  function upsertCustomer({ name, email, phone, address }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return null;
    const customers = listCustomers();
    const existing = customers.find(customer => customer.email === cleanEmail);
    if (existing) {
      if (name && !existing.name) existing.name = name;
      if (phone && !existing.phone) existing.phone = phone;
      if (address) existing.address = address;
      write(keys.customers, customers);
      return existing;
    }
    const customer = {
      id: `C-${Date.now()}`,
      name: name || cleanEmail,
      email: cleanEmail,
      phone: phone || "",
      address: address || "",
      registeredAt: new Date().toISOString()
    };
    customers.push(customer);
    write(keys.customers, customers);
    return customer;
  }

  function recordLogin({ name, email, result = "Successful" }) {
    const attempts = readList(keys.loginAttempts);
    attempts.unshift({
      name: name || email,
      email,
      at: new Date().toISOString(),
      device: /Mobi|Android/i.test(window.navigator.userAgent) ? "Mobile browser" : "Desktop browser",
      result
    });
    write(keys.loginAttempts, attempts.slice(0, 50));
  }

  /* ---------- orders ---------- */
  function listOrders() {
    return readList(keys.orders);
  }

  function field(label, value) {
    return { label, value: value || "Not provided" };
  }

  function contactFields(person, labels = ["Full name", "Email", "Phone"]) {
    return [
      field(labels[0], person.customerName),
      field(labels[1], person.email),
      field(labels[2], person.phone)
    ];
  }

  function recipientBlock(person) {
    const hasRecipient = Boolean(person.recipientName || person.recipientContact || person.recipientAddress);
    return {
      value: hasRecipient ? "Yes" : "No",
      fields: hasRecipient
        ? [
          field("Recipient name", person.recipientName),
          field("Recipient email or phone", person.recipientContact),
          field("Recipient address", person.recipientAddress),
          field("Gift message", person.giftMessage)
        ]
        : []
    };
  }

  function scheduleFields(person, extraFields = []) {
    const isPickup = person.fulfillment === "pickup";
    return [
      field("Delivery or pickup", isPickup ? "Pick up" : "Delivery"),
      isPickup
        ? field("Pickup location", PICKUP_LOCATION)
        : field("Delivery address", person.address || person.recipientAddress),
      field("Preferred date", longDate(person.date)),
      field("Preferred time", clockTime(person.time)),
      field("Payment method", person.payment),
      ...extraFields
    ];
  }

  function summaryFor(person, { item, amount, notes }) {
    return {
      item,
      date: shortDate(person.date),
      time: person.time ? clockTime(person.time) : "",
      payment: person.payment || "Pending",
      amount: amount || "To be confirmed",
      contact: person.phone || "",
      email: person.email || "",
      fulfillment: person.fulfillment === "pickup" ? "Pickup" : "Delivery",
      address: person.address || person.recipientAddress || "",
      recipient: [person.recipientName, person.recipientContact, person.recipientAddress]
        .filter(Boolean)
        .join(" · "),
      notes: notes.filter(Boolean).join("; ")
    };
  }

  function saveOrder(partial, person, context) {
    const orders = listOrders();
    const seq = Math.max(1024, ...orders.map(order => Number(order.seq) || 0)) + 1;
    const isBranch = context.source === "branch";
    const record = {
      id: `#${isBranch ? "B" : "W"}-${seq}`,
      seq,
      source: isBranch ? "branch" : "storefront",
      branch: isBranch ? BRANCH_NAME : MAIN_BRANCH_NAME,
      branchKey: isBranch ? "yashano" : "main",
      placedAt: new Date().toISOString(),
      referenceNo: `AC-REF-${Date.now()}`,
      customer: person.customerName || "Customer",
      customerEmail: String(person.email || "").trim().toLowerCase(),
      customerPhone: person.phone || "",
      productionStatus: "Preparing",
      ...partial
    };
    orders.push(record);
    if (!write(keys.orders, orders)) {
      throw new Error("The order could not be saved in this browser.");
    }
    upsertCustomer({
      name: person.customerName,
      email: person.email,
      phone: person.phone,
      address: person.address
    });
    return { orderNumber: record.id, referenceNumber: record.referenceNo, record };
  }

  function placeMenuOrder(payload, context = {}) {
    const product = payload.product || {};
    const details = product.details || {};
    const person = {
      customerName: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
      recipientName: payload.recipientName,
      recipientContact: payload.recipientContact,
      recipientAddress: payload.recipientAddress,
      giftMessage: payload.giftMessage,
      date: payload.deliveryDate,
      time: payload.deliveryTime,
      fulfillment: payload.fulfillment,
      address: payload.deliveryAddress,
      payment: payload.paymentMethod
    };
    const isPickup = person.fulfillment === "pickup";
    const price = product.price || "To be confirmed";
    const total = payload.orderTotal || price;
    const retouchLines = [
      payload.cakeAge && `Age: ${payload.cakeAge}`,
      payload.dedicationName && `Dedication: ${payload.dedicationName}`,
      payload.cakeCharacter && `Character: ${payload.cakeCharacter}`
    ].filter(Boolean);
    return saveOrder({
      type: "Menu Preset",
      branchType: context.source === "branch" ? "Custom" : "Website",
      flow: "menu",
      amount: total,
      amountValue: parseAmount(total),
      product: {
        name: product.name,
        category: product.category || "Cakes",
        image: product.image,
        price,
        classification: details.classification || product.category,
        ingredients: details.ingredients || "Contact the bakery for the current ingredient list.",
        allergens: details.allergens || "Contact the bakery to confirm allergen information before ordering.",
        customization: Array.isArray(details.customization) ? details.customization : []
      },
      pricing: [
        field("Price", price),
        field("Shipping", isPickup ? "₱0.00 (pickup)" : "To be confirmed"),
        field("Total", total)
      ],
      priceNote: isPickup
        ? "Pickup is free. The bakery will confirm availability and the order schedule."
        : "Delivery fee and final total will be confirmed by the bakery before the order is accepted.",
      retouches: [
        field("Age", payload.cakeAge),
        field("Name for dedication", payload.dedicationName),
        field("Character", payload.cakeCharacter),
        field("Other specifications", payload.itemSpecifications)
      ],
      contact: contactFields(person),
      recipient: recipientBlock(person),
      schedule: scheduleFields(person, [field("Additional information", payload.additionalInformation)]),
      summary: summaryFor(person, {
        item: [product.name, retouchLines.join("; ")].filter(Boolean).join(" · "),
        amount: total,
        notes: [
          payload.itemSpecifications,
          payload.additionalInformation,
          payload.giftMessage && `Gift message: ${payload.giftMessage}`
        ]
      })
    }, person, context);
  }

  function placeCustomCakeOrder(payload, context = {}) {
    const person = {
      customerName: payload.customerName,
      email: payload.email,
      phone: payload.contactNumber,
      recipientName: payload.recipientName,
      recipientContact: payload.recipientContact,
      recipientAddress: payload.recipientAddress,
      giftMessage: payload.giftMessage,
      date: payload.dateNeeded,
      time: payload.timeNeeded,
      fulfillment: payload.fulfillment,
      address: payload.deliveryAddress,
      payment: payload.paymentMethod
    };
    const selections = (payload.selections || []).map(selection => {
      const measurements = (selection.sizes || []).map((size, index) => {
        const parts = [
          size.height && `height ${size.height} inches`,
          size.width && `width ${size.width} inches`
        ].filter(Boolean).join(", ");
        return parts ? `Tier ${size.tier || index + 1}: ${parts}` : "";
      }).filter(Boolean).join("; ");
      const sizeNote = selection.letBakerDecideSizes
        ? "Baker decides sizes"
        : measurements ? `Sizes specified — ${measurements}` : "";
      return {
        label: selection.label,
        value: [selection.value, sizeNote].filter(Boolean).join(" · ")
      };
    });
    const referenceImages = Array.isArray(payload.referenceImages) ? payload.referenceImages : [];
    return saveOrder({
      type: "Customized Cake",
      branchType: "Custom",
      flow: "customized",
      amount: "To be confirmed",
      amountValue: 0,
      selections,
      previewUsedAsReference: false,
      referenceImage: null,
      contact: [
        field("Cake dedication text", payload.dedication),
        field("Your full name", payload.customerName),
        field("Email", payload.email),
        field("Phone", payload.contactNumber)
      ],
      recipient: recipientBlock(person),
      schedule: scheduleFields(person, [
        field("Reference images", referenceImages.join(", ")),
        field("Extra notes for our bakers", payload.notes)
      ]),
      summary: summaryFor(person, {
        item: [
          payload.title || "Fully Custom Cake",
          selections.map(selection => `${selection.label}: ${selection.value}`).join("; "),
          payload.dedication
        ].filter(Boolean).join(" · "),
        notes: [
          payload.notes,
          payload.giftMessage && `Gift message: ${payload.giftMessage}`,
          referenceImages.length && `Reference images: ${referenceImages.join(", ")}`
        ]
      })
    }, person, context);
  }

  function placePackageOrder(placement, context = {}) {
    const order = placement.order || {};
    const offering = placement.packageOffering || {};
    const products = Array.isArray(window.angelizStorefrontProducts) ? window.angelizStorefrontProducts : [];
    const person = {
      customerName: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      recipientName: order.recipientName,
      recipientContact: order.recipientContact,
      recipientAddress: order.recipientAddress,
      giftMessage: order.giftMessage,
      date: order.deliveryDate,
      time: order.deliveryTime,
      fulfillment: order.fulfillment,
      address: order.deliveryAddress,
      payment: order.paymentMethod
    };
    const itemLines = (placement.items || []).map(item => {
      const product = products.find(candidate => candidate.id === item.productId);
      return { quantity: `${item.quantity}`, name: product ? product.name : "Package item" };
    });
    const chosenInclusions = placement.inclusions && placement.inclusions.length
      ? placement.inclusions
      : offering.inclusions || [];
    const inclusions = itemLines.length
      ? itemLines
      : chosenInclusions.map(item => ({ quantity: item.quantity, name: item.name }));
    const amount = offering.price || "To be confirmed";
    return saveOrder({
      type: "Package",
      branchType: "Package",
      flow: "package",
      amount,
      amountValue: parseAmount(amount),
      package: {
        name: offering.title,
        category: PACKAGE_CATEGORIES[offering.category] || "Packages",
        description: offering.description || "",
        price: amount,
        priceNote: "Final package pricing is confirmed by the bakery.",
        image: offering.image || "catering.jpg",
        inclusions
      },
      contact: contactFields(person),
      recipient: recipientBlock(person),
      schedule: scheduleFields(person, [field("Additional information", order.additionalInformation)]),
      summary: summaryFor(person, {
        item: [offering.title, ...inclusions.map(item => `${item.quantity} ${item.name}`)]
          .filter(Boolean)
          .join(" · "),
        amount,
        notes: [
          order.additionalInformation,
          order.giftMessage && `Gift message: ${order.giftMessage}`
        ]
      })
    }, person, context);
  }

  function updateOrder(id, patch) {
    const orders = listOrders();
    const order = orders.find(item => item.id === id);
    if (!order) return null;
    Object.assign(order, patch);
    write(keys.orders, orders);
    return order;
  }

  function ordersForCustomer(email) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return [];
    return listOrders()
      .filter(order => order.customerEmail === cleanEmail)
      .sort((left, right) => right.placedAt.localeCompare(left.placedAt));
  }

  /* ---------- stock requests ---------- */
  function listStockRequests() {
    return readList(keys.stockRequests);
  }

  function addStockRequest(request) {
    const requests = listStockRequests();
    const ref = `REQ-${String(requests.length + 1).padStart(4, "0")}`;
    const record = {
      ...request,
      ref,
      branch: BRANCH_NAME,
      status: "Submitted",
      submittedAt: new Date().toISOString()
    };
    requests.push(record);
    write(keys.stockRequests, requests);
    return record;
  }

  function updateStockRequest(ref, patch) {
    const requests = listStockRequests();
    const request = requests.find(item => item.ref === ref);
    if (!request) return null;
    Object.assign(request, patch);
    write(keys.stockRequests, requests);
    return request;
  }

  /* ---------- catalog managed by the owner, shown on the storefront ---------- */
  function defaultProductDetails(extra = {}) {
    return {
      description: "",
      classification: "",
      ingredients: "Contact the bakery for the current ingredient list.",
      allergens: "Contact the bakery to confirm allergen information before ordering.",
      customization: [],
      reviews: [],
      ...extra
    };
  }

  function productFromOwner(product) {
    return {
      id: product.id,
      name: product.name,
      category: PRODUCT_CATEGORY_MAP[product.category] || product.category,
      price: formatPeso(product.price),
      image: storefrontImageName(product.image, "cakes.jpg"),
      managed: true,
      details: defaultProductDetails({
        description: product.description || "",
        classification: product.category
      })
    };
  }

  function productFromPreset(preset) {
    const details = preset.details || {};
    const labels = {
      occasion: "Occasion",
      theme: "Theme",
      canvas: "Size (per tier)",
      layers: "Layer",
      flavor: "Flavor",
      frosting: "Frosting"
    };
    return {
      id: `preset-${preset.id}`,
      name: preset.name,
      category: "Cakes",
      price: formatPeso(preset.price),
      image: storefrontImageName(preset.image, "signature-cake.jpg"),
      managed: true,
      details: defaultProductDetails({
        classification: preset.classification,
        ingredients: preset.ingredients || "Contact the bakery for the current ingredient list.",
        allergens: preset.allergens || "Contact the bakery to confirm allergen information before ordering.",
        customization: Object.keys(labels)
          .filter(key => details[key])
          .map(key => ({ label: labels[key], value: details[key] }))
      })
    };
  }

  function normalizeInclusion(inclusion) {
    const quantity = String(inclusion.qty || "").trim();
    const name = String(inclusion.name || "").trim();
    const match = /^([1-9]\d?)(?:\s+([A-Za-z].*))?$/.exec(quantity);
    if (match) return { quantity: `${match[1]}${match[2] ? ` ${match[2]}` : ""}`, name };
    return { quantity: "1", name: [quantity, name].filter(Boolean).join(" ") };
  }

  function servicesFromOwner(packages) {
    return Object.keys(PACKAGE_CATEGORIES).flatMap(type =>
      (packages[type] || [])
        .filter(item => Array.isArray(item.inclusions) && item.inclusions.some(inclusion => inclusion.name))
        .map(item => ({
          id: `pkg-${item.id}`,
          category: type,
          title: item.name,
          description: item.desc || `${item.name} for ${item.pax} guests.`,
          image: storefrontImageName(item.image, "catering.jpg"),
          price: formatPeso(item.price, 0),
          inclusions: item.inclusions.filter(inclusion => inclusion.name).map(normalizeInclusion)
        }))
    );
  }

  /* Mutates the storefront catalog arrays so owner-managed items replace or extend the static samples. */
  function applyCatalog(products, services) {
    products.forEach(product => {
      if (!product.details) product.details = defaultProductDetails({ classification: product.category });
    });

    const managed = [];
    const ownerProducts = read(keys.products, null);
    if (Array.isArray(ownerProducts)) managed.push(...ownerProducts.map(productFromOwner));
    const ownerPresets = read(keys.presets, null);
    if (Array.isArray(ownerPresets)) {
      managed.push(...ownerPresets.filter(preset => preset.status === "Active").map(productFromPreset));
    }
    managed.forEach(product => {
      const index = products.findIndex(existing => existing.id === product.id);
      if (index >= 0) products[index] = product;
      else products.push(product);
    });

    const ownerPackages = read(keys.packages, null);
    if (ownerPackages && typeof ownerPackages === "object" && !Array.isArray(ownerPackages)) {
      services.splice(0, services.length, ...servicesFromOwner(ownerPackages));
    }
  }

  window.AngelizDB = Object.freeze({
    keys,
    setRemoteData,
    remote: Object.freeze({ list: remoteList }),
    read,
    write,
    readList,
    onChange,
    format: Object.freeze({ parseAmount, formatPeso, shortDate, longDate, clockTime, assetUrl }),
    branchNames: Object.freeze({ main: MAIN_BRANCH_NAME, yashano: BRANCH_NAME }),
    customers: Object.freeze({
      list: listCustomers,
      upsert: upsertCustomer,
      recordLogin,
      loginAttempts: () => readList(keys.loginAttempts)
    }),
    orders: Object.freeze({
      list: listOrders,
      placeMenuOrder,
      placeCustomCakeOrder,
      placePackageOrder,
      update: updateOrder,
      forCustomer: ordersForCustomer,
      branchStatus: status => PRODUCTION_STATUS_TO_BRANCH[status] || "Pending"
    }),
    stockRequests: Object.freeze({
      list: listStockRequests,
      add: addStockRequest,
      update: updateStockRequest
    }),
    inquiries: Object.freeze({
      list: () => readList(keys.inquiries),
      forEmail: email => readList(keys.inquiries).filter(
        inquiry => String(inquiry.email || "").trim().toLowerCase() === String(email || "").trim().toLowerCase()
      )
    }),
    pos: Object.freeze({ transactions: () => readList(keys.posTransactions) }),
    inventory: Object.freeze({ catalog: () => readList(keys.inventoryBatches) }),
    catalog: Object.freeze({
      apply: applyCatalog,
      saveProducts: products => write(keys.products, products),
      savePresets: presets => write(keys.presets, presets),
      savePackages: packages => write(keys.packages, packages),
      readProducts: fallback => remoteData.products || read(keys.products, fallback),
      readPresets: fallback => remoteData.presets || read(keys.presets, fallback),
      readPackages: fallback => remoteData.packages || read(keys.packages, fallback)
    })
  });
})();
