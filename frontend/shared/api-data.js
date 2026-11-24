"use strict";

(function () {
  const PAGE_RESOURCES = {
    storefront: ["catalog", "public/feedback"],
    "owner:dashboard": ["orders", "products", "customers?registeredOnly=true", "branches", "inventory-lots", "sales-reports", "feedback"],
    "owner:branch-management": ["branches", "staff", "orders", "branch-inventory", "inventory-lots", "branch-reports"],
    "owner:order-management": ["orders", "branches", "custom-cake-requests", "inquiries", "catering-bookings"],
    "owner:service-management": ["products", "promotions", "customization-options", "catering-packages", "branches", "branch-inventory", "inventory-lots"],
    "owner:customer-management": ["customers?registeredOnly=true", "branches"],
    "owner:sales-financial-reports": ["sales-reports", "orders", "products", "branches"],
    "owner:communication": ["conversations", "inquiries", "customers?registeredOnly=true"],
    "owner:system-management": ["branches", "audit-logs"],
    "branch:dashboard": ["orders", "branch-inventory", "inventory-lots", "feedback"],
    "branch:order-management": ["orders", "custom-cake-requests", "catering-bookings"],
    "branch:customer-records": ["customers?registeredOnly=true"],
    "branch:branch-inventory": ["products", "branch-inventory", "inventory-lots"],
    "branch:pos-terminal": ["products", "branch-inventory", "inventory-lots", "orders"],
    "branch:sales-financial-reports": ["sales-reports", "orders", "products"],
    "branch:daily-branch-report": ["branch-reports", "orders"],
    "branch:staff-shift-management": ["staff", "staff-shifts"],
    "branch:communication": ["conversations", "inquiries", "customers?registeredOnly=true"]
  };

  const loaded = new Set();
  const inFlight = new Map();
  const cache = {};
  const errors = {};

  function keyFor(resource) {
    return resource.split("?", 1)[0];
  }

  async function list(resource, branchId) {
    if (!window.angelizApi) throw new Error("Database API client is unavailable.");
    const [name, queryString] = resource.split("?", 2);
    const params = new URLSearchParams(queryString || "");
    params.set("limit", "500");
    params.set("offset", "0");
    if (branchId != null && !params.has("branchId")) params.set("branchId", String(branchId));
    const response = await window.angelizApi.request(`/admin/${encodeURIComponent(name)}?${params}`);
    if (!Array.isArray(response?.items)) throw new Error(`${name} returned an invalid list response.`);
    return response.items;
  }

  function legacyOrder(order, branchMap) {
    const orderNumber = String(order.orderNumber || order.id);
    const statusMap = { pending: "Preparing", confirmed: "Preparing", processing: "Baking", ready: "Ready", completed: "Completed", cancelled: "Cancelled" };
    const fulfillment = order.isPickup ? "Pickup" : "Delivery";
    const items = (order.items || []).map(item => ({
      quantity: Number(item.quantity) || 1,
      name: item.product?.name || item.customCakeRequest?.theme || "Product",
      price: Number(item.pricePerUnit) || 0,
      details: item.customizations || ""
    }));
    const amount = Number(order.totalAmount) || 0;
    const firstItem = items[0]?.name || order.customCakeRequest?.theme || order.channel || "Order";
    return {
      id: orderNumber,
      seq: Number(order.id) || 0,
      source: order.channel === "pos" ? "branch" : "storefront",
      branch: order.branch?.name || branchMap.get(Number(order.branchId)) || "Branch",
      branchKey: String(order.branchId || "branch"),
      placedAt: order.orderDate || order.createdAt || new Date().toISOString(),
      referenceNo: order.orderNumber || order.id,
      customer: order.customer?.name || order.recipientName || "Customer",
      customerEmail: order.customer?.email || "",
      customerPhone: order.customer?.phone || order.recipientPhone || "",
      productionStatus: statusMap[String(order.status || "pending").toLowerCase()] || "Preparing",
      status: order.status,
      channel: order.channel,
      type: order.channel === "pos" ? "POS" : order.isPickup ? "Pickup" : "Website",
      branchType: order.channel === "pos" ? "POS" : "Website",
      flow: "menu",
      amount: `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      amountValue: amount,
      product: { name: firstItem, category: items[0]?.category || "Product", image: items[0]?.image || "", price: String(amount), customization: [] },
      pricing: [{ label: "Total", value: `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` }],
      contact: [{ label: "Full name", value: order.customer?.name || "Not provided" }, { label: "Email", value: order.customer?.email || "Not provided" }, { label: "Phone", value: order.customer?.phone || "Not provided" }],
      recipient: { value: order.isForSomeoneElse ? "Yes" : "No", fields: [] },
      schedule: [{ label: "Delivery or pickup", value: fulfillment }, { label: "Delivery address", value: order.deliveryAddress || "Not provided" }, { label: "Preferred date", value: order.deliveryDate || "Not provided" }, { label: "Preferred time", value: order.deliveryTime || "Not provided" }, { label: "Payment method", value: order.paymentMethod || "Not provided" }],
      summary: { item: firstItem, date: order.deliveryDate || "", time: order.deliveryTime || "", payment: order.paymentStatus || "", amount: `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, contact: order.customer?.phone || "", email: order.customer?.email || "", fulfillment, address: order.deliveryAddress || "", recipient: order.recipientName || "", notes: order.specialInstructions || "" },
      items
    };
  }

  function hydrate(resourceData) {
    const branches = resourceData.branches || [];
    const branchMap = new Map(branches.map(branch => [Number(branch.id), branch.name]));
    if (resourceData.catalog) {
      const catalog = resourceData.catalog;
      const products = (catalog.products || []).map(product => ({
        id: String(product.sku || product.id), databaseId: product.id, sku: product.sku,
        name: product.name, category: product.category || product.subCategory || "Other",
        price: Number(product.basePrice) || 0, basePrice: Number(product.basePrice) || 0,
        description: product.description || "", image: product.imageUrl || product.imageUrls?.[0] || "",
        imageUrls: product.imageUrls || [], isActive: product.isActive, showPOS: product.showPOS,
        showOnline: product.showOnline, allowCustomization: product.allowCustomization,
        ingredients: product.ingredients, allergens: product.allergens, classification: product.classification,
        branchAvailability: product.branchAvailability || []
      }));
      const packages = (catalog.cateringPackages || []).map(item => ({
        id: String(item.id), title: item.title, category: item.category,
        description: item.description, image: item.imageUrl, price: item.priceOptions?.[0]?.price || 0,
        inclusions: item.includes || [], status: item.isActive ? "Active" : "Inactive"
      }));
      cache.catalog = catalog;
      cache.products = products;
      cache.presets = [];
      cache.packages = { grazing: packages.filter(p => p.category === "grazing"), pastry: packages.filter(p => p.category === "pastry"), party: packages.filter(p => p.category === "party"), bundle: packages.filter(p => p.category === "bundle") };
    }
    if (resourceData.products) cache.products = resourceData.products.map(product => ({
      id: product.id, databaseId: product.id, sku: product.sku, name: product.name,
      category: product.category || product.subCategory || "Other", price: Number(product.basePrice) || 0,
      basePrice: Number(product.basePrice) || 0, description: product.description || "",
      image: product.imageUrl || "", imageUrls: product.imageUrls || [], isActive: product.isActive,
      showPOS: product.showPOS, showOnline: product.showOnline, allowCustomization: product.allowCustomization,
      ingredients: product.ingredients, allergens: product.allergens, classification: product.classification
    }));
    if (resourceData.orders) {
      cache.orders = resourceData.orders.map(order => legacyOrder(order, branchMap));
      cache.posTransactions = resourceData.orders.filter(order => order.channel === "pos").map(order => ({
        id: order.id, timestamp: order.orderDate || order.createdAt,
        customer: order.customer?.name || "Walk-in Customer", total: Number(order.totalAmount) || 0,
        itemsCount: (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        items: (order.items || []).map(item => ({ id: item.productId, name: item.product?.name || "Product", price: Number(item.pricePerUnit) || 0, quantity: Number(item.quantity) || 1 }))
      }));
    }
    if (resourceData.customers) cache.customers = resourceData.customers.map(customer => ({ ...customer, registeredAt: customer.customerSince || customer.createdAt }));
    if (resourceData["inventory-lots"]) cache.inventoryBatches = resourceData["inventory-lots"];
    if (resourceData["branch-inventory"]) cache.branchInventory = resourceData["branch-inventory"];
    if (resourceData["custom-cake-requests"]) cache.customCakeRequests = resourceData["custom-cake-requests"];
    if (resourceData.inquiries) cache.inquiries = resourceData.inquiries;
    if (resourceData["catering-bookings"]) cache.cateringBookings = resourceData["catering-bookings"];
    if (resourceData.promotions) cache.promotions = resourceData.promotions;
    if (resourceData["customization-options"]) cache.customizationOptions = resourceData["customization-options"];
    if (resourceData["catering-packages"]) cache.cateringPackages = resourceData["catering-packages"];
    if (resourceData.branches) cache.branches = resourceData.branches;
    if (resourceData["sales-reports"]) cache.salesReports = resourceData["sales-reports"];
    if (resourceData["branch-reports"]) cache.branchReports = resourceData["branch-reports"];
    if (resourceData.staff) cache.staff = resourceData.staff;
    if (resourceData["staff-shifts"]) cache.staffShifts = resourceData["staff-shifts"];
    if (resourceData.feedback) cache.feedback = resourceData.feedback;
    if (resourceData.conversations) cache.conversations = resourceData.conversations;
    if (resourceData["audit-logs"]) cache.auditLogs = resourceData["audit-logs"];
    Object.keys(cache).forEach(key => loaded.add(key));
    window.AngelizDB?.setRemoteData?.(cache);
    window.dispatchEvent(new CustomEvent("angeliz:api-data-loaded", { detail: { keys: [...loaded] } }));
  }

  async function loadStorefront() {
    const catalog = await window.angelizApi.request("/catalog");
    const reviews = await window.angelizApi.request("/public/feedback");
    const optionsByStep = new Map();
    (catalog.customizationOptions || []).filter(option => option.isActive).forEach(option => {
      const step = String(option.step || option.field || "options");
      if (!optionsByStep.has(step)) optionsByStep.set(step, []);
      optionsByStep.get(step).push({ label: option.displayName || option.value, value: option.value, price: option.price, field: option.field, step: option.step });
    });
    const products = (catalog.products || []).map(product => ({
      id: String(product.sku || product.id), sku: product.sku || String(product.id),
      name: product.name, category: product.category || product.subCategory || "Other",
      price: `₱${Number(product.basePrice || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      image: product.imageUrl || product.imageUrls?.[0] || "",
      details: { description: product.description || "", classification: product.classification || "", ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(", ") : product.ingredients || "", allergens: product.allergens || "", customization: [] },
      branchAvailability: product.branchAvailability || []
    }));
    const packages = (catalog.cateringPackages || []).map(item => ({
      id: String(item.id), category: String(item.category || "party").toLowerCase(),
      title: item.title, description: item.description || "", image: item.imageUrl || "",
      price: `₱${Number(item.priceOptions?.[0]?.price || 0).toLocaleString("en-PH")}`,
      inclusions: (item.includes || []).map(inclusion => ({ quantity: String(inclusion.quantity || inclusion.qty || 1), name: inclusion.name || inclusion.product?.name || "Included item" })),
      itemIds: (item.includes || []).map(inclusion => inclusion.productId).filter(Boolean)
    }));
    window.angelizStorefrontProducts.splice(0, window.angelizStorefrontProducts.length, ...products);
    window.angelizStorefrontServices.splice(0, window.angelizStorefrontServices.length, ...packages);
    cache.catalog = catalog;
    cache.products = products;
    cache.cateringPackages = packages;
    cache.feedback = reviews.reviews || [];
    loaded.add("catalog");
    loaded.add("feedback");
    window.AngelizDB?.setRemoteData?.({ products, packages: {}, feedback: cache.feedback });
    return { catalog, reviews };
  }

  async function preload(role, page = "dashboard") {
    const scope = `${role}:${page}`;
    if (inFlight.has(scope)) return inFlight.get(scope);
    const resources = PAGE_RESOURCES[scope] || [];
    const task = Promise.all(resources.map(async resource => {
      const key = keyFor(resource);
      if (loaded.has(key)) return [key, cache[key] || []];
      try {
        const result = key === "catalog" || key === "public/feedback"
          ? await window.angelizApi.request(`/${resource}`)
          : await list(resource, window.AdminSession?.context?.activeBranchId);
        return [key, key === "catalog" ? { catalog: result } : key === "public/feedback" ? { feedback: result.reviews || [] } : result, null];
      } catch (error) {
        errors[scope] ||= {};
        errors[scope][resource] = error.message;
        console.error(`GET ${resource} failed for ${scope}.`, error);
        return [key, key === "catalog" ? { catalog: null } : key === "public/feedback" ? { feedback: [] } : [], error];
      }
    })).then(rows => {
      const data = {};
      rows.forEach(([key, value]) => {
        if (key === "catalog" && value.catalog) Object.assign(data, value);
        else if (key === "public/feedback") Object.assign(data, value);
        else if (key !== "catalog") data[key] = value;
        loaded.add(key);
      });
      hydrate(data);
      return { data, errors: errors[scope] || {} };
    }).finally(() => inFlight.delete(scope));
    inFlight.set(scope, task);
    return task;
  }

  window.AngelizApiData = Object.freeze({ preload, loadStorefront, list, get: key => cache[key], errors: scope => errors[scope] || {} });
})();
