"use strict";

/* Browser-backed mock REST API. Replace this adapter with fetch() to a real backend when ready. */
(function initializeStorefrontMockApi() {
  const database = window.angelizStorefrontDatabase;
  if (!database) throw new Error("Storefront mock database has not been loaded.");

  const storageKey = "angeliz_storefront_mock_database_v1";
  const makeId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = value => JSON.parse(JSON.stringify(value));

  function restorePersistentCollections() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      ["favorites", "profiles", "orders", "inquiries", "reviews", "feedbacks", "savedDesigns", "packageSelections"].forEach(key => {
        if (Array.isArray(saved[key])) {
          if (key === "orders") {
            const savedOrderIds = new Set(saved.orders.map(order => order.id));
            database.orders = [...saved.orders, ...database.orders.filter(order => !savedOrderIds.has(order.id))];
          } else {
            database[key] = saved[key];
          }
        }
      });
    } catch (error) {
      console.warn("Mock database storage was invalid; using seed records.", error);
    }
  }

  function persist() {
    const snapshot = {};
    ["favorites", "profiles", "orders", "inquiries", "reviews", "savedDesigns", "packageSelections"].forEach(key => {
      snapshot[key] = database[key] || [];
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (error) {
      console.error("Could not persist mock storefront database changes.", error);
      throw new Error("Mock database storage is unavailable in this browser.");
    }
  }

  restorePersistentCollections();

  const getRoutes = new Map([
    ["/api/storefront", () => database],
    ["/api/storefront/settings", () => database.settings],
    ["/api/storefront/categories", () => database.categories],
    ["/api/storefront/products", () => database.products],
    ["/api/storefront/services", () => database.services],
    ["/api/storefront/service-categories", () => database.serviceCategories],
    ["/api/storefront/gallery", () => database.gallery],
    ["/api/storefront/reviews", () => database.feedbacks],
    ["/api/storefront/location", () => database.location],
    ["/api/storefront/locations", () => database.locations],
    ["/api/storefront/about", () => database.about],
    ["/api/storefront/contact", () => database.contact],
    ["/api/storefront/payment-methods", () => database.paymentMethods],
    ["/api/storefront/favorites", () => database.favorites],
    ["/api/storefront/profiles", () => database.profiles],
    ["/api/storefront/orders", () => database.orders],
    ["/api/storefront/inquiries", () => database.inquiries],
    ["/api/storefront/reviews/customer", () => database.reviews],
    ["/api/storefront/saved-designs", () => database.savedDesigns],
    ["/api/storefront/packages", () => database.services],
    ["/api/storefront/package-selections", () => database.packageSelections || []],
    ["/api/storefront/customization-options", () => database.customization],
    ["/api/storefront/session", () => JSON.parse(localStorage.getItem("angeliz_customer_session") || "null")]
  ]);

  function post(path, payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("POST data must be a JSON object.");
    }

    if (path === "/api/storefront/favorites") {
      if (!Array.isArray(payload.productIds)) throw new TypeError("Favorites must be an array of product IDs.");
      const productIds = new Set(database.products.map(product => product.id));
      database.favorites = [...new Set(payload.productIds.filter(id => productIds.has(id)))];
      persist();
      return { productIds: clone(database.favorites) };
    }

    if (path === "/api/storefront/session") {
      const session = Object.prototype.hasOwnProperty.call(payload, "session") ? payload.session : payload;
      if (session === null) {
        localStorage.removeItem("angeliz_customer_session");
        return { signedOut: true };
      }
      if (typeof session.email !== "string" || !session.email.trim()) throw new TypeError("Session email is required.");
      const savedSession = { mode: "mock", signedInAt: new Date().toISOString(), ...clone(session) };
      localStorage.setItem("angeliz_customer_session", JSON.stringify(savedSession));
      return clone(savedSession);
    }

    if (path === "/api/storefront/profiles") {
      const profile = payload.profile || payload;
      if (typeof profile.email !== "string" || !profile.email.trim()) {
        throw new TypeError("A profile email is required.");
      }
      const normalizedEmail = profile.email.trim().toLowerCase();
      const existingIndex = database.profiles.findIndex(item => item.email.toLowerCase() === normalizedEmail);
      const savedProfile = {
        ...(existingIndex >= 0 ? database.profiles[existingIndex] : {}),
        ...clone(profile),
        email: normalizedEmail,
        updatedAt: new Date().toISOString()
      };
      if (existingIndex >= 0) database.profiles[existingIndex] = savedProfile;
      else database.profiles.push(savedProfile);
      persist();
      return clone(savedProfile);
    }

    if (path === "/api/storefront/orders") {
      if (typeof payload.type !== "string" || !payload.type.trim()) throw new TypeError("Order type is required.");
      const now = new Date();
      const bookingOnly = Boolean(payload.bookingOnly);
      const submitted = clone(payload);
      if (bookingOnly) {
        submitted.packagePrice = "";
        submitted.total = "Price to be confirmed";
        submitted.paymentStatus = "unpaid-booking";
        submitted.priceStatus = "pending-bakery-confirmation";
      }
      const order = {
        id: makeId("order"),
        orderNumber: `AC-${String(now.getTime()).slice(-8)}`,
        referenceNumber: `AC-REF-${now.getTime()}`,
        type: submitted.type,
        status: bookingOnly ? "booking-requested-preview" : "in-production-preview",
        productionStatus: bookingOnly ? "Booking requested" : "In production",
        received: false,
        paymentStatus: bookingOnly ? "unpaid-booking" : "unpaid-preview",
        priceStatus: submitted.priceStatus || (bookingOnly ? "pending-bakery-confirmation" : "fixed-package-price"),
        createdAt: now.toISOString(),
        ...submitted
      };
      database.orders.unshift(order);
      persist();
      return clone(order);
    }

    if (path === "/api/storefront/orders/received") {
      const order = database.orders.find(item => item.id === payload.orderId);
      if (!order) throw new RangeError("Order not found.");
      order.received = true;
      order.status = "completed-preview";
      order.productionStatus = "Received";
      order.receivedAt = new Date().toISOString();
      persist();
      return clone(order);
    }

    if (path === "/api/storefront/orders/feedback") {
      const order = database.orders.find(item => item.id === payload.orderId);
      const rating = Number(payload.rating);
      if (!order) throw new RangeError("Order not found.");
      if (!String(payload.comment || "").trim() || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new TypeError("A comment and rating from one through five are required.");
      }
      const review = {
        id: makeId("review"),
        orderId: order.id,
        productId: payload.productId || order.productId || "custom-cake",
        productName: payload.productName || order.product?.name || order.title || "",
        productImage: payload.productImage || "",
        packageId: payload.packageId || order.packageId || "",
        name: payload.name || order.customerName || "Customer",
        email: payload.email || order.customerEmail || "",
        rating,
        comment: String(payload.comment).trim(),
        status: "approved-preview",
        createdAt: new Date().toISOString()
      };
      database.reviews.unshift(review);
      database.feedbacks.unshift({ id: review.id, name: review.name, comment: review.comment, rating: review.rating, productId: review.productId, orderId: order.id });
      order.reviewId = review.id;
      order.received = true;
      order.status = "completed-preview";
      order.productionStatus = "Received";
      order.receivedAt = new Date().toISOString();
      persist();
      return { review: clone(review), order: clone(order) };
    }

    if (path === "/api/storefront/inquiries") {
      if (!String(payload.name || "").trim() || !String(payload.email || "").trim() || !String(payload.details || "").trim()) {
        throw new TypeError("Inquiry name, email, and details are required.");
      }
      const inquiry = { id: makeId("inquiry"), status: "new-preview", createdAt: new Date().toISOString(), ...clone(payload) };
      database.inquiries.unshift(inquiry);
      persist();
      return clone(inquiry);
    }

    if (path === "/api/storefront/reviews/customer") {
      const rating = Number(payload.rating);
      if (!String(payload.name || "").trim() || !String(payload.comment || "").trim() || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new TypeError("Review name, comment, and a rating from one to five are required.");
      }
      const review = { id: makeId("review"), status: "pending-preview", createdAt: new Date().toISOString(), ...clone(payload), rating };
      database.reviews.unshift(review);
      persist();
      return clone(review);
    }

    if (path === "/api/storefront/saved-designs") {
      if (!Array.isArray(payload.selections)) throw new TypeError("Saved cake design selections are required.");
      if (!Array.isArray(payload.referenceImages)) throw new TypeError("Saved design reference image records are required.");
      payload.referenceImages.forEach(image => {
        if (
          !image
          || typeof image.name !== "string"
          || typeof image.dataUrl !== "string"
          || !/^data:image\/(?:jpeg|png|webp);base64,/.test(image.dataUrl)
          || image.size > 524288
        ) throw new TypeError("A saved reference image is invalid or exceeds the image size limit.");
      });
      const design = { id: makeId("design"), createdAt: new Date().toISOString(), ...clone(payload) };
      database.savedDesigns.unshift(design);
      persist();
      return clone(design);
    }

    if (path === "/api/storefront/package-selections") {
      const packageOffering = database.services.find(item => item.id === payload.packageId);
      if (!packageOffering) throw new RangeError("The selected package does not exist.");
      if (Array.isArray(payload.selectedInclusions)) {
        const allowedNames = new Set((packageOffering.inclusions || []).map(item => item.name));
        if (payload.selectedInclusions.some(item => !allowedNames.has(item.name))) throw new TypeError("Package selection contains an item outside this package.");
      }
      if (payload.paxOption && !packageOffering.paxOptions?.some(option => option.id === payload.paxOption.id)) {
        throw new TypeError("Selected pax/price option is not available for this package.");
      }
      const selection = { id: makeId("selection"), updatedAt: new Date().toISOString(), ...clone(payload) };
      database.packageSelections ||= [];
      const existingIndex = database.packageSelections.findIndex(item => item.packageId === payload.packageId);
      if (existingIndex >= 0) database.packageSelections[existingIndex] = selection;
      else database.packageSelections.push(selection);
      persist();
      return clone(selection);
    }

    throw new Error(`Mock POST endpoint not found: ${path}`);
  }

  window.storefrontApi = Object.freeze({
    async get(path) {
      const route = getRoutes.get(path);
      if (!route) throw new Error(`Mock GET endpoint not found: ${path}`);
      await new Promise(resolve => window.setTimeout(resolve, 20));
      return clone(route());
    },
    async post(path, payload) {
      await new Promise(resolve => window.setTimeout(resolve, 20));
      return clone(post(path, payload));
    }
  });
})();
