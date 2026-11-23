"use strict";

/* Initialize profile forms and dashboard navigation on the standalone account page. */
window.initializeProfileFragment = function initializeProfileFragment(root) {
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
    const savedProfile = JSON.parse(localStorage.getItem(profileKey) || "{}");
    if (!savedProfile || Array.isArray(savedProfile) || typeof savedProfile !== "object") {
      throw new TypeError("The saved customer profile must be an object.");
    }
    profile = savedProfile;
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
    session = { mode: "static", email: defaultProfile.email, signedInAt: new Date().toISOString() };
    try {
      localStorage.setItem(profileKey, JSON.stringify(profile));
      localStorage.setItem(sessionKey, JSON.stringify(session));
      window.AngelizDB.customers.recordLogin({ name: defaultProfile.fullName, email: defaultProfile.email });
    } catch (error) {
      console.error("Could not initialize the static customer account.", error);
      status.textContent = "Your account could not be saved in this browser.";
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

  function readFavorites() {
    try {
      const storedFavorites = localStorage.getItem(favoritesKey);
      const saved = storedFavorites === null
        ? (typeof storefront === "undefined" ? [] : storefront.favorites)
        : JSON.parse(storedFavorites);
      if (!Array.isArray(saved) || saved.some(id => typeof id !== "string")) {
        throw new TypeError("Saved favorites must be an array of product IDs.");
      }
      const catalog = typeof storefront === "undefined" ? [] : storefront.products;
      const productIds = new Set(catalog.map(product => product.id));
      return saved.filter(id => productIds.has(id));
    } catch (error) {
      console.error("Could not read saved customer favorites.", error);
      return null;
    }
  }

  function renderFavorites() {
    const list = root.querySelector("[data-profile-favorites]");
    const favorites = readFavorites();
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
        image.src = window.AngelizDB.format.assetUrl(product.image);
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

  function syncCustomerRecord() {
    const email = fields.email.value.trim();
    if (!email) return;
    window.AngelizDB.customers.upsert({
      name: fields.fullName.value.trim(),
      email,
      phone: fields.phone.value.trim(),
      address: fields.address.value.trim()
    });
  }

  function formatOrderDate(order) {
    return order.summary?.date && order.summary.date !== "To be confirmed"
      ? `Requested for ${order.summary.date}${order.summary.time ? ` · ${order.summary.time}` : ""}`
      : "Schedule to be confirmed";
  }

  function createRecordCard(title, lines, badge, reply) {
    const card = document.createElement("article");
    card.className = "profile-record-card";
    const body = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = title;
    body.append(heading);
    lines.filter(Boolean).forEach(line => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      body.append(paragraph);
    });
    card.append(body);
    if (badge) {
      const status = document.createElement("span");
      status.className = "profile-record-badge";
      status.textContent = badge;
      card.append(status);
    }
    if (reply) {
      const replyBox = document.createElement("div");
      replyBox.className = "profile-record-reply";
      const replyLabel = document.createElement("strong");
      replyLabel.textContent = "Reply from Angeliz Cakes";
      const replyText = document.createElement("p");
      replyText.textContent = reply;
      replyBox.append(replyLabel, replyText);
      card.append(replyBox);
    }
    return card;
  }

  function fillRecordList(list, cards, emptyMessage) {
    list.replaceChildren();
    if (cards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "profile-empty-state";
      empty.textContent = emptyMessage;
      list.append(empty);
      return;
    }
    list.append(...cards);
  }

  function renderOrders() {
    const orders = window.AngelizDB.orders.forCustomer(fields.email.value);
    const isActive = order => order.productionStatus !== "Completed";
    const toCard = order => createRecordCard(
      `${order.id} · ${order.type}`,
      [order.summary?.item, formatOrderDate(order), order.amount],
      order.productionStatus
    );
    fillRecordList(
      root.querySelector("[data-profile-active-orders]"),
      orders.filter(isActive).map(toCard),
      "Orders submitted to your customer account will appear here. Requests placed by email may not be linked to your account."
    );
    fillRecordList(
      root.querySelector("[data-profile-order-history]"),
      orders.filter(order => !isActive(order)).map(toCard),
      "Completed orders linked to your customer account will appear here."
    );
    root.querySelectorAll("[data-profile-order-count]").forEach(count => {
      count.textContent = String(orders.filter(isActive).length);
    });
  }

  function renderMessages() {
    const messages = window.AngelizDB.inquiries.forEmail(fields.email.value)
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
    fillRecordList(
      root.querySelector("[data-profile-messages]"),
      messages.map(message => createRecordCard(
        message.subject,
        [message.details],
        message.reply ? "Replied" : "Awaiting reply",
        message.reply
      )),
      "Messages you send from the contact form and the bakery's replies will appear here."
    );
    root.querySelector("[data-profile-message-count]").textContent = String(messages.length);
  }

  function renderLinkedRecords() {
    renderOrders();
    renderMessages();
  }

  syncCustomerRecord();
  updateCustomerSummary();
  renderFavorites();
  renderLinkedRecords();
  window.AngelizDB.onChange(
    [window.AngelizDB.keys.orders, window.AngelizDB.keys.inquiries],
    () => {
      if (root.isConnected) renderLinkedRecords();
    }
  );
  root.querySelector("[data-profile-review-count]").textContent = "0";
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
      try {
        localStorage.setItem("angeliz_static_customer_signed_out", "true");
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(profileKey);
        window.location.href = "index.html#home";
      } catch (error) {
        console.error("Could not sign out of the customer account.", error);
        root.querySelector("[data-signout-status]").textContent =
          "Could not sign out. Check browser storage and try again.";
        logoutButton.disabled = false;
      }
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
    const favorites = readFavorites();
    if (!favorites) {
      status.textContent = "Favorites could not be updated. Check browser storage and try again.";
      return;
    }
    const updatedFavorites = favorites.filter(id => id !== removeButton.dataset.profileRemoveFavorite);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(updatedFavorites));
      document.dispatchEvent(new CustomEvent("header:mock-favorites-updated", {
        detail: { favorites: updatedFavorites }
      }));
      renderFavorites();
    } catch (error) {
      console.error("Could not remove the customer favorite.", error);
      status.textContent = "The favorite could not be removed. Check browser storage and try again.";
    }
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
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));
      profile = updatedProfile;
      savedFormValues = formValues;
      fields.phone.disabled = Boolean(formValues.phone);
      saveButton.hidden = true;
      updateCustomerSummary();
      syncCustomerRecord();
      status.textContent = "Your profile has been saved.";
      document.dispatchEvent(new CustomEvent("customer:session-changed"));
    } catch (error) {
      console.error("Could not save the customer profile.", error);
      status.textContent = "Your profile could not be saved. Check browser storage and try again.";
    }
  });

  document.addEventListener("header:mock-favorites-updated", renderFavorites);
};
