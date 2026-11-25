"use strict";

/* Initialize profile forms and dashboard navigation on the standalone account page. */
function renderProfileReviews(panel, reviews) {
  const placeholder = panel.querySelector(".profile-empty-state");
  if (placeholder) placeholder.remove();
  let list = panel.querySelector("[data-profile-reviews]");
  if (!list) {
    list = document.createElement("div");
    list.dataset.profileReviews = "";
    list.className = "profile-favorites-list";
    panel.append(list);
  }
  list.replaceChildren();
  if (!reviews.length) {
    const empty = document.createElement("p");
    empty.className = "profile-empty-state";
    empty.textContent = "You have not submitted any reviews yet.";
    list.append(empty);
    return;
  }
  reviews.forEach(review => {
    const card = document.createElement("article");
    card.className = "profile-review-card";
    const product = storefront.products.find(item => item.id === review.productId);
    const packageOffering = storefront.services.find(item => item.id === review.packageId);
    const order = review.orderId ? storefront.orders?.find(item => item.id === review.orderId) : null;
    const referenceImage = order?.referenceImages?.find(image => typeof image.dataUrl === "string" && image.dataUrl.startsWith("data:image/"));
    const heading = document.createElement("div");
    heading.className = "profile-review-heading";
    const identity = document.createElement("div");
    identity.className = "profile-review-product";
    const imageUrl = referenceImage?.dataUrl
      || review.productImage
      || (product?.image ? `../assets/${product.image}` : "")
      || (packageOffering?.image ? `../assets/${packageOffering.image}` : "");
    const productImage = document.createElement("img");
    productImage.className = "profile-review-product-image";
    productImage.alt = "";
    productImage.loading = "lazy";
    if (imageUrl) productImage.src = imageUrl;
    else {
      productImage.classList.add("is-placeholder");
      productImage.setAttribute("aria-hidden", "true");
    }
    const title = document.createElement("strong");
    title.textContent = product?.name || packageOffering?.title || review.productName || review.orderTitle || "Your order";
    identity.append(productImage, title);
    const rating = document.createElement("span");
    rating.className = "profile-review-rating";
    rating.setAttribute("role", "img");
    rating.setAttribute("aria-label", `${review.rating} out of 5 stars`);
    rating.textContent = `${"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}${"☆".repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}`;
    heading.append(identity, rating);
    const comment = document.createElement("p");
    comment.textContent = review.comment;
    const date = document.createElement("time");
    date.className = "profile-review-date";
    if (review.createdAt) date.dateTime = review.createdAt;
    date.textContent = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "";
    card.append(heading, comment, date);
    list.append(card);
  });
}

function renderProfileOrders(panel, orders, actions = {}) {
  const placeholder = panel.querySelector(".profile-empty-state");
  if (placeholder) placeholder.remove();
  let list = panel.querySelector("[data-profile-orders]");
  if (!list) {
    list = document.createElement("div");
    list.dataset.profileOrders = "";
    list.className = "profile-favorites-list profile-order-list";
    panel.append(list);
  }
  list.replaceChildren();
  if (!orders.length) {
    const empty = document.createElement("p");
    empty.className = "profile-empty-state";
    empty.textContent = "No orders in this section yet.";
    list.append(empty);
    return;
  }
  orders.forEach(order => {
    const card = document.createElement("article");
    card.className = "profile-favorite-card profile-order-card";
    const summary = document.createElement("div");
    summary.className = "profile-order-summary";
    const purchase = order.order && typeof order.order === "object" ? order.order : order;
    const linkedProduct = order.product || purchase.product || (order.productId ? storefront.products.find(product => product.id === order.productId) : null);
    const linkedPackage = order.packageOffering || purchase.packageOffering || (order.packageId ? storefront.services.find(service => service.id === order.packageId) : null);
    const itemName = linkedProduct?.name || linkedPackage?.title || order.title || order.orderNumber;
    const referenceImages = order.referenceImages || purchase.referenceImages || [];
    const itemImage = linkedProduct?.image
      ? `../assets/${linkedProduct.image}`
      : linkedPackage?.image
        ? `../assets/${linkedPackage.image}`
        : referenceImages.find(image => image.dataUrl?.startsWith("data:image/"))?.dataUrl
          || referenceImages.find(image => image.assetUrl)?.assetUrl
          || "";
    const orderNumber = document.createElement("strong");
    orderNumber.className = "profile-order-number";
    orderNumber.textContent = order.orderNumber || "Order pending";
    const title = document.createElement("span");
    title.className = "profile-order-item-name";
    title.textContent = itemName;
    const reference = document.createElement("span");
    reference.className = "profile-order-reference";
    reference.textContent = order.referenceNumber || "Reference pending";
    const total = document.createElement("span");
    total.className = "profile-order-total";
    total.textContent = order.total || purchase.total || order.orderTotal || purchase.orderTotal || "Price to be confirmed";
    const productionStatus = order.productionStatus || ({
      "in-production-preview": "In production",
      "confirmed-preview": "Confirmed",
      "preparing-preview": "Preparing",
      "completed-preview": "Completed",
      "cancelled-preview": "Cancelled"
    }[order.status] || order.status || "Received");
    const status = document.createElement("span");
    status.className = `profile-order-status is-${String(productionStatus).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    status.textContent = productionStatus;
    if (itemImage) {
      const photo = document.createElement("img");
      photo.className = "profile-order-photo";
      photo.src = itemImage;
      photo.alt = linkedProduct || linkedPackage ? itemName : `Customer reference photo for ${itemName}`;
      photo.loading = "lazy";
      summary.append(photo);
    } else {
      const photoPlaceholder = document.createElement("span");
      photoPlaceholder.className = "profile-order-photo-placeholder";
      photoPlaceholder.setAttribute("aria-hidden", "true");
      photoPlaceholder.textContent = "No photo";
      summary.append(photoPlaceholder);
    }
    summary.append(orderNumber, title, total, reference);
    if (actions.showStatus || actions.onReceived) summary.append(status);

    const details = document.createElement("details");
    details.className = "profile-order-dropdown";
    const toggle = document.createElement("summary");
    toggle.textContent = "Order details";
    const detailList = document.createElement("dl");
    const fields = [
      ["Production status", productionStatus],
      ["Payment status", ({ "pending-preview": "Pending", "paid-preview": "Paid", "unpaid-preview": "Unpaid" }[order.paymentStatus] || order.paymentStatus)],
      ["Date placed", order.createdAt ? new Date(order.createdAt).toLocaleString() : ""],
      ["Requested for", order.requestedFor || [purchase.deliveryDate, purchase.deliveryTime].filter(Boolean).join(" · ")],
      ["Fulfillment", purchase.fulfillment],
      ["Payment method", purchase.paymentMethod],
      ["Price", order.total || purchase.total || purchase.orderTotal],
      ["Recipient", purchase.recipientName],
      ["Recipient contact", purchase.recipientContact],
      ["Recipient address", purchase.recipientAddress],
      ["Delivery address", purchase.deliveryAddress],
      ["Dedication", purchase.dedication || purchase.dedicationName],
      ["Cake age", purchase.cakeAge],
      ["Cake character", purchase.cakeCharacter],
      ["Retouches", purchase.retouches],
      ["Item specifications", purchase.itemSpecifications],
      ["Gift message", purchase.giftMessage],
      ["Additional information", purchase.additionalInformation],
      ["Baker notes", purchase.notes]
    ];
    if (order.product) fields.push(["Product", order.product.name]);
    else if (linkedProduct) fields.push(["Product", linkedProduct.name]);
    if (order.packageOffering) fields.push(["Package", order.packageOffering.title]);
    else if (linkedPackage) fields.push(["Package", linkedPackage.title]);
    if (Array.isArray(order.selections || purchase.selections)) {
      (order.selections || purchase.selections).forEach(selection => {
        const sizeText = (selection.sizes || []).map(tier => `Tier ${tier.tier}: ${[tier.height && `H ${tier.height} in`, tier.width && `W ${tier.width} in`].filter(Boolean).join(", ")}`).join("; ");
        fields.push([selection.label, [selection.value, sizeText].filter(Boolean).join(" · ")]);
      });
    }
    if (linkedProduct) fields.push(["Ordered product", linkedProduct.name]);
    if (linkedPackage) fields.push(["Ordered package", linkedPackage.title]);
    const packageItems = order.items || purchase.items;
    if (Array.isArray(packageItems)) {
      const items = packageItems.map(item => {
        const product = storefront.products.find(candidate => candidate.id === item.productId);
        return product ? `${product.name} × ${item.quantity}` : `${item.productId} × ${item.quantity}`;
      });
      if (items.length) fields.push(["Package items", items.join(", ")]);
    }
    const packageInclusions = order.inclusions || purchase.inclusions;
    if (Array.isArray(packageInclusions) && packageInclusions.length) {
      fields.push(["Package inclusions", packageInclusions.map(item => `${item.quantity} ${item.name}`.trim()).join(", ")]);
    }
    fields.filter(([, value]) => value !== undefined && value !== null && value !== "").forEach(([label, value]) => {
      const row = document.createElement("div");
      const key = document.createElement("dt");
      key.textContent = label;
      const content = document.createElement("dd");
      content.textContent = String(value);
      row.append(key, content);
      detailList.append(row);
    });

    details.append(toggle, detailList);
    card.append(summary, details);

    const canMarkReceived = Boolean(actions.onReceived) && String(order.productionStatus || order.status || "")
      .trim()
      .toLowerCase()
      .replace(/-preview$/, "") === "ready";
    if (!canMarkReceived) {
      list.append(card);
      return;
    }

    const feedbackDialog = document.createElement("dialog");
    feedbackDialog.className = "profile-order-dialog profile-order-feedback-dialog";
    const feedbackForm = document.createElement("form");
    feedbackForm.className = "profile-order-feedback";
    feedbackForm.innerHTML = `<div class="profile-order-dialog-header"><h3>How was your order?</h3><button type="button" data-close-feedback>Cancel</button></div><label>Rating <select name="rating" required><option value="">Select a rating</option><option value="5">5 - Excellent</option><option value="4">4 - Very good</option><option value="3">3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></label><label>Your feedback <textarea name="comment" required maxlength="1000"></textarea></label><button type="submit">Submit feedback</button><p role="status" aria-live="polite"></p>`;
    feedbackForm.querySelector("[data-close-feedback]").addEventListener("click", () => feedbackDialog.close());
    feedbackDialog.append(feedbackForm);
    const receivedButton = document.createElement("button");
    receivedButton.type = "button";
    receivedButton.className = "profile-order-received";
    receivedButton.textContent = "Received";
    receivedButton.addEventListener("click", async () => {
      receivedButton.disabled = true;
      try {
        const updated = await actions.onReceived(order);
        Object.assign(order, updated);
        status.textContent = "Received";
        feedbackDialog.showModal();
      } catch (error) {
        console.error("Could not mark the order received.", error);
        receivedButton.disabled = false;
      }
    });
    feedbackForm.addEventListener("submit", event => {
      event.preventDefault();
      if (!feedbackForm.reportValidity() || !actions.onReview) return;
      const formData = new FormData(feedbackForm);
      const message = feedbackForm.querySelector('[role="status"]');
      const submit = feedbackForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      actions.onReview(order, { rating: Number(formData.get("rating")), comment: String(formData.get("comment") || "").trim() })
        .then(async result => {
          feedbackDialog.close();
          document.dispatchEvent(new CustomEvent("storefront:feedback-submitted", { detail: { review: result.review, order: result.order } }));
          await actions.onRefresh?.();
        })
        .catch(error => {
          console.error("Could not submit order feedback.", error);
          message.textContent = "Feedback could not be submitted. Please try again.";
          submit.disabled = false;
        });
    });
    card.append(summary, details, receivedButton, feedbackDialog);
    list.append(card);
  });
}

window.initializeProfileFragment = async function initializeProfileFragment(root) {
  const form = root.querySelector("#profileFragmentForm");
  if (!form) throw new TypeError("The customer profile form is missing.");

  const profileKey = "angeliz_customer_profile";
  const sessionKey = "angeliz_customer_session";
  const favoritesKey = "angeliz_header_favorites";
  const phoneNumberPattern = /^09[0-9]{9}$/;
  const fields = {
    fullName: form.elements.fullName,
    email: form.elements.email,
    phone: form.elements.phone,
    birthday: form.elements.birthday,
    address: form.elements.address,
    notes: form.elements.notes
  };
  const saveButton = form.querySelector(".profile-save-button");
  const verifyButtons = {
    email: root.querySelector('[data-profile-verify="email"]'),
    phone: root.querySelector('[data-profile-verify="phone"]')
  };
  const verificationCodeInputs = {
    email: root.querySelector('[data-verification-code="email"]'),
    phone: root.querySelector('[data-verification-code="phone"]')
  };
  const status = root.querySelector("#profileStatus");
  const content = root.querySelector(".profile-dashboard-content");
  const mobileLayout = window.matchMedia("(max-width: 800px)");
  if (!saveButton) throw new TypeError("The customer profile save button is missing.");
  if (!verifyButtons.email || !verifyButtons.phone) {
    throw new TypeError("The customer profile verification buttons are missing.");
  }
  if (!verificationCodeInputs.email || !verificationCodeInputs.phone) {
    throw new TypeError("The customer profile verification inputs are missing.");
  }
  let activeProfileTab = "account";
  let profile = {};
  let session = null;

  try {
    const savedProfiles = await window.storefrontApi.get("/api/storefront/profiles");
    const activeEmail = JSON.parse(localStorage.getItem(sessionKey) || "null")?.email || "jamie.reyes@example.test";
    profile = savedProfiles.find(item => item.email === activeEmail) || {};
    const cachedProfile = JSON.parse(localStorage.getItem(profileKey) || "{}");
    if (!cachedProfile || Array.isArray(cachedProfile) || typeof cachedProfile !== "object") {
      throw new TypeError("The saved customer profile must be an object.");
    }
    profile = { ...profile, ...cachedProfile };
    if (profile.email && !savedProfiles.some(item => item.email === profile.email.toLowerCase())) {
      profile = await window.storefrontApi.post("/api/storefront/profiles", { profile });
    }
  } catch (error) {
    console.error("Could not read the saved customer profile.", error);
    status.textContent = "Your saved profile could not be loaded from this browser.";
  }

  try {
    session = JSON.parse(localStorage.getItem(sessionKey) || "null");
  } catch (error) {
    console.error("Could not read the customer session.", error);
    status.textContent = "Your customer session could not be read.";
  }

  let wasExplicitlySignedOut = false;
  try {
    wasExplicitlySignedOut = localStorage.getItem("angeliz_static_customer_signed_out") === "true";
  } catch (error) {
    console.error("Could not check the preview account status.", error);
    status.textContent = "Your preview account status could not be checked.";
  }

  if (!session && !wasExplicitlySignedOut) {
    const defaultProfile = {
      fullName: "Jamie Reyes",
      email: "jamie.reyes@example.test"
    };
    profile = { ...defaultProfile, ...profile };
    session = { mode: "mock", email: defaultProfile.email, signedInAt: new Date().toISOString() };
    try {
      profile = await window.storefrontApi.post("/api/storefront/profiles", { profile });
      localStorage.setItem(profileKey, JSON.stringify(profile));
      const savedSession = await window.storefrontApi.post("/api/storefront/session", { session });
      localStorage.setItem(sessionKey, JSON.stringify(savedSession));
    } catch (error) {
      console.error("Could not initialize the mock customer account.", error);
      status.textContent = "Your preview account could not be saved in this browser.";
    }
  }

  fields.fullName.value = typeof profile.fullName === "string" ? profile.fullName : "";
  fields.email.value = typeof profile.email === "string" && profile.email
    ? profile.email
    : typeof session?.email === "string" ? session.email : "";
  fields.phone.value = typeof profile.phone === "string" ? profile.phone : "";
  fields.birthday.value = typeof profile.birthday === "string" ? profile.birthday : "";
  fields.address.value = typeof profile.address === "string" ? profile.address : "";
  fields.notes.value = typeof profile.notes === "string" ? profile.notes : "";
  fields.email.readOnly = true;
  fields.phone.disabled = phoneNumberPattern.test(fields.phone.value.trim());

  function readFormValues() {
    return {
      fullName: fields.fullName.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
      birthday: fields.birthday.value,
      address: fields.address.value.trim(),
      notes: fields.notes.value.trim()
    };
  }

  let savedFormValues = readFormValues();

  function hasUnsavedChanges() {
    const currentValues = readFormValues();
    return Object.keys(savedFormValues).some(key => (
      savedFormValues[key] !== currentValues[key]
    ));
  }

  function updateSaveButtonVisibility() {
    saveButton.hidden = !hasUnsavedChanges();
    status.textContent = "";
  }

  function updateVerifyButtonVisibility() {
    const emailIsUnset = !fields.email.value.trim();
    const phoneIsUnset = !fields.phone.value.trim();
    verifyButtons.email.hidden = !emailIsUnset;
    verifyButtons.phone.hidden = !phoneIsUnset;
    verificationCodeInputs.email.hidden = !emailIsUnset;
    verificationCodeInputs.phone.hidden = !phoneIsUnset;
  }

  function updateFormControls() {
    updateSaveButtonVisibility();
    updateVerifyButtonVisibility();
  }

  updateVerifyButtonVisibility();
  form.addEventListener("input", updateFormControls);
  form.addEventListener("change", updateFormControls);

  function updateCustomerSummary() {
    const fullName = fields.fullName.value.trim() || "Customer";
    root.querySelector("[data-profile-name]").textContent = fullName;
    root.querySelector("[data-profile-email]").textContent = fields.email.value;
    root.querySelector("[data-profile-avatar]").textContent = fullName
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("");
  }

  let currentFavorites = [...storefront.favorites];
  async function readFavorites() {
    try {
      const saved = await window.storefrontApi.get("/api/storefront/favorites");
      if (!Array.isArray(saved)) throw new TypeError("Saved favorites must be an array of product IDs.");
      const catalog = typeof storefront === "undefined" ? [] : storefront.products;
      const productIds = new Set(catalog.map(product => product.id));
      currentFavorites = saved.filter(id => productIds.has(id));
      return currentFavorites;
    } catch (error) {
      console.error("Could not read saved customer favorites.", error);
      return currentFavorites;
    }
  }

  async function renderFavorites() {
    const list = root.querySelector("[data-profile-favorites]");
    const favorites = await readFavorites();
    const catalog = typeof storefront === "undefined" ? null : storefront.products;
    list.replaceChildren();

    if (!favorites || !Array.isArray(catalog)) {
      list.textContent = "Favorites could not be loaded from this browser.";
      root.querySelector("[data-profile-favorite-count]").textContent = "—";
      return;
    }

    const products = favorites
      .map(id => catalog.find(product => product.id === id))
      .filter(Boolean);
    root.querySelector("[data-profile-favorite-count]").textContent = String(products.length);

    if (products.length === 0) {
      const empty = document.createElement("p");
      empty.className = "profile-empty-state";
      empty.textContent = "Save a menu item with the heart button and it will appear here.";
      list.append(empty);
      return;
    }

    products.forEach(product => {
      const card = document.createElement("article");
      card.className = "profile-favorite-card";
      if (product.image) {
        const image = document.createElement("img");
        image.src = `../assets/${product.image}`;
        image.alt = "";
        image.loading = "lazy";
        card.append(image);
      }

      const details = document.createElement("div");
      details.className = "profile-favorite-details";
      const name = document.createElement("h4");
      name.textContent = product.name;
      const meta = document.createElement("p");
      meta.textContent = [product.category, product.price].filter(Boolean).join(" · ");
      details.append(name, meta);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "profile-favorite-remove";
      remove.dataset.profileRemoveFavorite = product.id;
      remove.setAttribute("aria-label", `Remove ${product.name} from favorites`);
      remove.innerHTML = '<i class="fa-solid fa-heart-crack" aria-hidden="true"></i><span>Remove</span>';
      card.append(details, remove);
      list.append(card);
    });
  }

  function selectProfileTab(tabName) {
    activeProfileTab = tabName;
    root.querySelectorAll("[data-profile-tab]").forEach(button => {
      const isActive = button.dataset.profileTab === tabName;
      button.classList.toggle("is-active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
      if (mobileLayout.matches) button.setAttribute("aria-expanded", String(isActive));
      else button.removeAttribute("aria-expanded");
    });
    root.querySelectorAll("[data-profile-panel]").forEach(panel => {
      panel.hidden = panel.dataset.profilePanel !== tabName;
    });
  }

  function syncProfileLayout() {
    root.querySelectorAll("[data-profile-panel]").forEach(panel => {
      const slot = root.querySelector(`[data-profile-slot="${panel.dataset.profilePanel}"]`);
      if (mobileLayout.matches) slot.append(panel);
      else content.append(panel);
    });
    selectProfileTab(activeProfileTab || "account");
  }

  updateCustomerSummary();
  renderFavorites();
  Promise.all([
    window.storefrontApi.get("/api/storefront/orders"),
    window.storefrontApi.get("/api/storefront/reviews/customer"),
    window.storefrontApi.get("/api/storefront/saved-designs")
  ]).then(([orders, reviews, designs]) => {
    const email = fields.email.value.toLowerCase();
    const customerOrders = orders.filter(order => order.customerEmail?.toLowerCase() === email);
    const customerReviews = reviews.filter(review => review.email?.toLowerCase() === email);
    const orderIsActive = order => !order.received && !["completed-preview", "cancelled-preview"].includes(order.status);
    const orderIsHistory = order => Boolean(order.received) || ["completed-preview", "cancelled-preview"].includes(order.status);
    const activeOrders = customerOrders.filter(orderIsActive);
    const historyOrders = customerOrders.filter(orderIsHistory);
    root.querySelectorAll("[data-profile-order-count]").forEach(count => {
      count.textContent = String(activeOrders.length);
    });
    root.querySelector("[data-profile-review-count]").textContent = String(customerReviews.length);
    const ordersPanel = root.querySelector('[data-profile-panel="active-orders"]');
    const historyPanel = root.querySelector('[data-profile-panel="history"]');
    const savedPanel = root.querySelector('[data-profile-panel="saved"]');
    const reviewsPanel = root.querySelector('[data-profile-panel="reviews"]');
    const refreshCustomerActivity = async () => {
      const [updatedOrders, updatedReviews] = await Promise.all([
        window.storefrontApi.get("/api/storefront/orders"),
        window.storefrontApi.get("/api/storefront/reviews/customer")
      ]);
      const matchingOrders = updatedOrders.filter(order => order.customerEmail?.toLowerCase() === fields.email.value.toLowerCase());
      const updatedActiveOrders = matchingOrders.filter(orderIsActive);
      const updatedHistoryOrders = matchingOrders.filter(orderIsHistory);
      root.querySelectorAll("[data-profile-order-count]").forEach(count => { count.textContent = String(updatedActiveOrders.length); });
      if (ordersPanel) renderProfileOrders(ordersPanel, updatedActiveOrders, orderActions);
      if (historyPanel) renderProfileOrders(historyPanel, updatedHistoryOrders);
      if (reviewsPanel) renderProfileReviews(reviewsPanel, updatedReviews.filter(review => review.email?.toLowerCase() === fields.email.value.toLowerCase()));
    };
    const orderActions = {
      showStatus: true,
      onReceived: order => window.storefrontApi.post("/api/storefront/orders/received", { orderId: order.id }),
      onReview: (order, feedback) => window.storefrontApi.post("/api/storefront/orders/feedback", {
        orderId: order.id,
        email: fields.email.value,
        name: fields.fullName.value,
        productId: order.productId || order.product?.id || "",
        packageId: order.packageId || "",
        productName: order.product?.name || order.packageOffering?.title || order.title || "Custom cake",
        ...feedback
      }),
      onRefresh: refreshCustomerActivity
    };
    if (ordersPanel) renderProfileOrders(ordersPanel, activeOrders, orderActions);
    if (historyPanel) renderProfileOrders(historyPanel, historyOrders);
    if (reviewsPanel) renderProfileReviews(reviewsPanel, customerReviews);
    if (savedPanel && designs.length) {
      const designList = document.createElement("div");
      designList.className = "profile-favorites-list";
      designs.forEach(design => {
        const item = document.createElement("article");
        item.className = "profile-favorite-card profile-saved-design-card";
        const imageList = document.createElement("div");
        imageList.className = "profile-saved-design-images";
        const referenceImages = Array.isArray(design.referenceImages) ? design.referenceImages : [];
        referenceImages.forEach((reference, index) => {
          const imageUrl = typeof reference.dataUrl === "string" && reference.dataUrl.startsWith("data:image/")
            ? reference.dataUrl
            : typeof reference.assetUrl === "string" ? reference.assetUrl : "";
          if (!imageUrl) return;
          const image = document.createElement("img");
          image.src = imageUrl;
          image.alt = `Reference image ${index + 1} for ${design.name || "saved cake design"}`;
          image.loading = "lazy";
          imageList.append(image);
        });
        if (!imageList.childElementCount) {
          const placeholder = document.createElement("span");
          placeholder.className = "profile-saved-design-placeholder";
          placeholder.textContent = "No reference image";
          imageList.append(placeholder);
        }
        const details = document.createElement("div");
        details.className = "profile-saved-design-details";
        const name = document.createElement("strong");
        name.textContent = design.name || "Saved custom cake design";
        const selections = Array.isArray(design.selections) ? design.selections : [];
        const selectionList = document.createElement("dl");
        selectionList.className = "profile-saved-design-selections";
        selections.forEach(choice => {
          const row = document.createElement("div");
          const label = document.createElement("dt");
          label.textContent = choice.label || "Customization";
          const value = document.createElement("dd");
          const tierSizes = Array.isArray(choice.sizes) && choice.sizes.length
            ? choice.sizes
              .map(tier => `Tier ${tier.tier}: ${[tier.height && `H ${tier.height} in`, tier.width && `W ${tier.width} in`].filter(Boolean).join(", ")}`)
              .join("; ")
            : "";
          value.textContent = choice.letBakerDecideSizes
            ? `${choice.value} · Baker decides sizes`
            : [choice.value, tierSizes].filter(Boolean).join(" · ");
          row.append(label, value);
          selectionList.append(row);
        });
        details.append(name, selectionList);
        item.append(imageList, details);
        designList.append(item);
      });
      const designPlaceholder = savedPanel.querySelector(".profile-saved-section:last-child .profile-empty-state");
      designPlaceholder?.replaceWith(designList);
    }
  }).catch(error => console.error("Could not load customer activity from the mock database.", error));
  syncProfileLayout();
  mobileLayout.addEventListener("change", syncProfileLayout);

  root.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-open-signout]")) {
      root.querySelector("[data-signout-status]").textContent = "";
      root.querySelector("[data-signout-dialog]")?.showModal();
      return;
    }
    if (event.target.closest("[data-close-signout]")) {
      root.querySelector("[data-signout-dialog]")?.close();
      return;
    }
    const logoutButton = event.target.closest("[data-customer-logout]");
    if (logoutButton) {
      logoutButton.disabled = true;
      window.storefrontApi.post("/api/storefront/session", { session: null })
        .then(() => {
          localStorage.setItem("angeliz_static_customer_signed_out", "true");
          localStorage.removeItem(sessionKey);
          localStorage.removeItem(profileKey);
          window.location.href = "index.html#home";
        })
        .catch(error => {
          console.error("Could not sign out of the customer account.", error);
          root.querySelector("[data-signout-status]").textContent = "Could not sign out. Please try again.";
          logoutButton.disabled = false;
        });
      return;
    }
    const tabButton = event.target.closest("[data-profile-tab]");
    if (tabButton) {
      const requestedTab = tabButton.dataset.profileTab;
      if (mobileLayout.matches && activeProfileTab === requestedTab) {
        activeProfileTab = null;
        tabButton.classList.remove("is-active");
        tabButton.removeAttribute("aria-current");
        tabButton.setAttribute("aria-expanded", "false");
        root.querySelector(`[data-profile-panel="${requestedTab}"]`).hidden = true;
      } else {
        selectProfileTab(requestedTab);
      }
      return;
    }

    const removeButton = event.target.closest("[data-profile-remove-favorite]");
    if (!removeButton) return;
    const updatedFavorites = currentFavorites.filter(id => id !== removeButton.dataset.profileRemoveFavorite);
    window.storefrontApi.post("/api/storefront/favorites", { productIds: updatedFavorites })
      .then(saved => {
        currentFavorites = saved.productIds;
        localStorage.setItem(favoritesKey, JSON.stringify(currentFavorites));
        document.dispatchEvent(new CustomEvent("header:mock-favorites-updated", {
          detail: { favorites: currentFavorites }
        }));
        return renderFavorites();
      })
      .catch(error => {
        console.error("Could not remove the customer favorite.", error);
        status.textContent = "The favorite could not be removed. Please try again.";
      });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!hasUnsavedChanges()) {
      saveButton.hidden = true;
      return;
    }
    if (!form.reportValidity()) return;

    const formValues = readFormValues();
    const updatedProfile = { ...profile, ...formValues };

    try {
      window.storefrontApi.post("/api/storefront/profiles", { profile: updatedProfile })
        .then(saved => {
          localStorage.setItem(profileKey, JSON.stringify(saved));
          profile = saved;
          savedFormValues = formValues;
          fields.phone.disabled = Boolean(formValues.phone);
          saveButton.hidden = true;
          updateCustomerSummary();
          status.textContent = "Your profile was saved to the mock database.";
          document.dispatchEvent(new CustomEvent("customer:session-changed"));
        })
        .catch(error => {
          console.error("Could not save the customer profile.", error);
          status.textContent = "Your profile could not be saved. Please try again.";
        });
    } catch (error) {
      console.error("Could not save the customer profile.", error);
      status.textContent = "Your profile could not be saved. Check browser storage and try again.";
    }
  });

  document.addEventListener("header:mock-favorites-updated", renderFavorites);
};
