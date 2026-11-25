"use strict";

window.initializeServicePackageFragment = function initializeServicePackageFragment(
  root,
  packageOffering,
  products,
  imageUrl,
  onOrderPlaced
) {
  if (!(root instanceof HTMLElement)) throw new TypeError("The service package fragment is missing.");
  if (
    !packageOffering
    || typeof packageOffering.id !== "string"
    || !Array.isArray(products)
    || typeof imageUrl !== "string"
    || !imageUrl
  ) {
    throw new TypeError("The selected package is missing static storefront data.");
  }
  if (onOrderPlaced !== undefined && typeof onOrderPlaced !== "function") {
    throw new TypeError("The package order callback must be a function.");
  }

  const image = root.querySelector("[data-package-image]");
  const title = root.querySelector("[data-package-title]");
  const description = root.querySelector("[data-package-description]");
  const price = root.querySelector("[data-package-price]");
  const itemsContainer = root.querySelector("[data-package-items]");
  const editItemsContainer = root.querySelector("[data-package-edit-items]");
  const optionsContainer = root.querySelector("[data-package-options]");
  const selectedTab = root.querySelector('[data-package-list-tab="selected"]');
  const availableTab = root.querySelector('[data-package-list-tab="available"]');
  const includedPanel = root.querySelector("[data-package-included-panel]");
  const customizer = root.querySelector("[data-package-customizer]");
  const picker = root.querySelector("[data-package-picker]");
  const orderInfo = root.querySelector("[data-package-order-info]");
  const receipt = root.querySelector("[data-package-receipt]");
  const toolbar = root.querySelector(".service-package-toolbar");
  const orderForm = root.querySelector("[data-package-order-form]");
  const status = root.querySelector("[data-package-status]");
  const paymentMethodField = root.querySelector("#packagePaymentMethod")?.closest(".service-package-field");
  const customerEmail = root.querySelector("#packageCustomerEmail");
  const customerPhone = root.querySelector("#packageCustomerPhone");
  const recipientContact = root.querySelector("#packageRecipientContact");
  const recipientToggle = root.querySelector("[data-recipient-toggle]");
  const recipientFields = root.querySelector("[data-recipient-fields]");
  const deliveryAddressField = root.querySelector("[data-delivery-address-field]");
  const deliveryAddress = root.querySelector("#packageDeliveryAddress");
  const pickupLocationField = root.querySelector("[data-pickup-location-field]");
  const placeOrderButton = root.querySelector("[data-package-place-order]");
  const receiptOrder = root.querySelector("[data-receipt-order]");
  const receiptReference = root.querySelector("[data-receipt-reference]");
  const receiptDate = root.querySelector("[data-receipt-date]");
  const receiptMethod = root.querySelector("[data-receipt-method]");
  const receiptPrice = root.querySelector("[data-receipt-price]");
  const receiptTitle = root.querySelector("#packageReceiptTitle");
  const requiredElements = [
    image, title, description, price, paymentMethodField, itemsContainer, editItemsContainer, optionsContainer,
    includedPanel, customizer, picker, orderInfo, receipt, toolbar, orderForm, status,
    selectedTab, availableTab,
    customerEmail, customerPhone, recipientContact, recipientToggle, recipientFields,
    deliveryAddressField, deliveryAddress, pickupLocationField,
    placeOrderButton, receiptOrder, receiptReference, receiptDate, receiptMethod, receiptPrice, receiptTitle
  ];
  if (requiredElements.some(element => !element)) {
    throw new TypeError("The service package view is missing required content.");
  }

  const productById = id => products.find(product => product.id === id);
  const isValidEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  const isValidPhone = value => /^09[0-9]{9}$/.test(value);
  const parseInclusionQuantity = quantity => {
    const match = /^([1-9]\d*)(?:\s+(.+))?$/.exec(quantity.trim());
    if (!match || Number(match[1]) > 99) return null;
    return { quantityValue: Number(match[1]), quantityUnit: match[2] || "" };
  };
  const formatInclusionQuantity = item =>
    `${item.quantityValue}${item.quantityUnit ? ` ${item.quantityUnit}` : ""}`;
  const hasProductItems = Array.isArray(packageOffering.itemIds);
  const fixedInclusions = packageOffering.inclusions || [];
  const inclusionIsQuantityEditable = index => Boolean(packageOffering.allowQuantityChanges && parseInclusionQuantity(fixedInclusions[index]?.quantity));
  let selectedListTab = "selected";
  if (hasProductItems && (
    packageOffering.itemIds.length === 0
    || packageOffering.itemIds.some(id => typeof id !== "string" || !productById(id))
  )) {
    throw new TypeError("The package contains an item that is missing from static storefront data.");
  }
  if (!hasProductItems && (
    !Array.isArray(fixedInclusions)
    || fixedInclusions.length === 0
    || fixedInclusions.some(item => !item || typeof item.name !== "string" || !item.name.trim())
  )) {
    throw new TypeError("The package is missing valid included item data.");
  }

  image.src = imageUrl;
  image.alt = packageOffering.title;
  title.textContent = packageOffering.title;
  description.textContent = packageOffering.bookingOnly && packageOffering.pax
    ? `${packageOffering.pax} · ${packageOffering.description}`
    : packageOffering.description;
  const bookingOnly = packageOffering.bookingOnly === true;
  const priceRow = price.closest(".service-package-price");
  if (priceRow) priceRow.hidden = bookingOnly;
  price.textContent = bookingOnly ? "" : packageOffering.price || "";
  paymentMethodField.hidden = bookingOnly;
  orderForm.elements.paymentMethod.required = !bookingOnly;
  const storageKey = `angeliz_service_package_${packageOffering.id}`;
  let savedItems = hasProductItems
    ? packageOffering.itemIds.map(productId => ({ productId, quantity: 1 }))
    : [];
  let draftItems = savedItems.map(item => ({ ...item }));
  let savedInclusions = !hasProductItems
    ? fixedInclusions.map((item, index) => ({
      ...item,
      quantityEditable: inclusionIsQuantityEditable(index),
      ...(inclusionIsQuantityEditable(index) ? parseInclusionQuantity(item.quantity) : {})
    }))
    : [];
  let draftInclusions = savedInclusions.map(item => ({ ...item }));
  const selectedInclusionKeys = new Set(savedInclusions.map((item, index) => String(index)));
  let editingSlot = -1;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (hasProductItems) {
        if (
          !Array.isArray(parsed)
          || parsed.length !== packageOffering.itemIds.length
          || parsed.some(item =>
            !item
            || typeof item.productId !== "string"
            || !productById(item.productId)
            || !Number.isInteger(item.quantity)
            || item.quantity < 1
            || item.quantity > 99
          )
        ) {
          throw new TypeError("Saved package selections are invalid.");
        }
        savedItems = parsed.map(item => ({ ...item }));
        draftItems = savedItems.map(item => ({ ...item }));
      } else {
        if (
          !Array.isArray(parsed)
          || parsed.length !== fixedInclusions.length
          || parsed.some(quantity => !Number.isInteger(quantity) || quantity < 1 || quantity > 99)
        ) {
          throw new TypeError("Saved package quantities are invalid.");
        }
        savedInclusions = fixedInclusions.map((item, index) => ({
          ...item,
          ...parseInclusionQuantity(item.quantity),
          quantityValue: parsed[index]
        }));
        draftInclusions = savedInclusions.map(item => ({ ...item }));
      }
    }
  } catch (error) {
    console.error("Could not read saved package selections.", error);
    status.textContent = "Saved package choices could not be loaded. Showing the original items.";
    status.classList.add("is-error");
  }

  function makeItem(item, index, editable) {
    const product = productById(item.productId);
    const selected = draftItems.some(saved => saved.productId === product.id);
    const card = document.createElement("article");
    card.className = `service-package-item${selected ? " is-selected" : " is-not-selected"}`;

    const imageWrap = document.createElement("div");
    imageWrap.className = "service-package-item-image";
    if (product.image) {
      const productImage = document.createElement("img");
      productImage.src = new URL(product.image, imageUrl).href;
      productImage.alt = "";
      productImage.loading = "lazy";
      imageWrap.append(productImage);
    } else {
      imageWrap.innerHTML = '<i class="fa-solid fa-cake-candles" aria-hidden="true"></i>';
    }

    const copy = document.createElement("div");
    copy.className = "service-package-item-copy";
    const name = document.createElement("strong");
    name.textContent = product.name;
    const itemDescription = document.createElement("p");
    itemDescription.textContent = product.details?.description || product.category || "Menu item";
    copy.append(name, itemDescription);

    const meta = document.createElement("div");
    meta.className = "service-package-item-meta";
    const itemPrice = document.createElement("span");
    itemPrice.textContent = `Price: ${product.price || "To be confirmed"}`;
    meta.append(itemPrice);

    if (editable && selected && packageOffering.allowQuantityChanges) {
      const quantityLabel = document.createElement("label");
      quantityLabel.className = "service-package-item-quantity";
      quantityLabel.append(document.createTextNode("Quantity"));
      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "1";
      quantity.max = "999";
      quantity.step = "1";
      quantity.value = String(item.quantity);
      quantity.dataset.packageQuantity = String(index);
      quantity.setAttribute("aria-label", `Quantity for ${product.name}`);
      quantityLabel.append(quantity);
      meta.append(quantityLabel);
    } else {
      const quantity = document.createElement("span");
      quantity.textContent = `Quantity: ${item.quantity}`;
      meta.append(quantity);
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = selected ? "service-package-selection-toggle is-selected" : "service-package-selection-toggle";
    toggle.dataset.togglePackageProduct = product.id;
    toggle.setAttribute("aria-pressed", String(selected));
    toggle.textContent = selected ? "Remove" : "Add to package";
    card.append(imageWrap, copy, meta, toggle);
    return card;
  }

  function makeFixedInclusion(item, index, editable) {
    const key = String(index);
    const selected = selectedInclusionKeys.has(key);
    const card = document.createElement("article");
    card.className = `service-package-item service-package-fixed-item${selected ? " is-selected" : " is-not-selected"}`;

    const imageWrap = document.createElement("div");
    imageWrap.className = "service-package-item-image";
    imageWrap.setAttribute("aria-hidden", "true");
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-box";
    imageWrap.append(icon);

    const copy = document.createElement("div");
    copy.className = "service-package-item-copy";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const itemDescription = document.createElement("p");
    itemDescription.textContent = "Included in this package";
    copy.append(name, itemDescription);

    const meta = document.createElement("div");
    meta.className = "service-package-item-meta";
    if (item.quantityEditable && editable && selected) {
      const quantityLabel = document.createElement("label");
      quantityLabel.className = "service-package-item-quantity";
      quantityLabel.append(document.createTextNode("Quantity"));
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.min = "1";
      quantityInput.max = "999";
      quantityInput.step = "1";
      quantityInput.value = String(item.quantityValue);
      quantityInput.dataset.packageInclusionQuantity = String(index);
      quantityInput.setAttribute("aria-label", `Quantity for ${item.name}`);
      quantityLabel.append(quantityInput);
      if (item.quantityUnit) quantityLabel.append(document.createTextNode(` ${item.quantityUnit}`));
      meta.append(quantityLabel);
    } else {
      const quantity = document.createElement("span");
      quantity.textContent = item.quantityEditable && selected
        ? `${formatInclusionQuantity(item)} selected`
        : item.quantity;
      meta.append(quantity);
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = selected ? "service-package-selection-toggle is-selected" : "service-package-selection-toggle";
    toggle.dataset.togglePackageInclusion = key;
    toggle.setAttribute("aria-pressed", String(selected));
    toggle.textContent = selected ? "Remove" : "Add to package";
    card.append(imageWrap, copy, meta, toggle);
    return card;
  }

  function renderItems() {
    if (!hasProductItems) {
      const selected = draftInclusions.filter((item, index) => selectedInclusionKeys.has(String(index)));
      const notSelected = draftInclusions.filter((item, index) => !selectedInclusionKeys.has(String(index)));
      itemsContainer.replaceChildren(...(selectedListTab === "selected" ? selected : notSelected).map(item => {
        const index = draftInclusions.indexOf(item);
        return makeFixedInclusion(item, index, selectedListTab === "selected");
      }));
      editItemsContainer.replaceChildren();
      const count = `${selected.length} selected of ${draftInclusions.length} items`;
      root.querySelectorAll("[data-package-count]").forEach(element => { element.textContent = count; });
      return;
    }

    const selectedIds = new Set(draftItems.map(item => item.productId));
    const candidates = products.map(product => ({
      productId: product.id,
      quantity: draftItems.find(item => item.productId === product.id)?.quantity || 1
    })).filter(item => (
      selectedListTab === "selected" ? selectedIds.has(item.productId) : !selectedIds.has(item.productId)
    ));
    itemsContainer.replaceChildren(...candidates.map((item, index) => makeItem(item, index, selectedListTab === "selected")));
    editItemsContainer.replaceChildren();
    const count = `${selectedIds.size} selected of ${products.length} available items`;
    root.querySelectorAll("[data-package-count]").forEach(element => { element.textContent = count; });
  }

  selectedTab.addEventListener("click", () => {
    selectedListTab = "selected";
    selectedTab.setAttribute("aria-selected", "true");
    availableTab.setAttribute("aria-selected", "false");
    renderItems();
  });
  availableTab.addEventListener("click", () => {
    selectedListTab = "available";
    selectedTab.setAttribute("aria-selected", "false");
    availableTab.setAttribute("aria-selected", "true");
    renderItems();
  });
  function showPanel(panel) {
    includedPanel.hidden = panel !== "included";
    customizer.hidden = panel !== "customize";
    picker.hidden = panel !== "picker";
    orderInfo.hidden = panel !== "order";
    receipt.hidden = panel !== "receipt";
    title.closest(".service-package-summary").hidden = panel === "order" || panel === "receipt";
    status.hidden = panel === "receipt";
    toolbar.hidden = panel === "receipt";
    root.setAttribute("aria-labelledby", panel === "receipt" ? "packageReceiptTitle" : "servicePackageTitle");
  }

  function renderOptions() {
    optionsContainer.replaceChildren();
    products.forEach(product => {
      const card = document.createElement("article");
      card.className = "service-package-option";
      const productImageWrap = document.createElement("div");
      productImageWrap.className = "service-package-item-image";
      if (product.image) {
        const productImage = document.createElement("img");
        productImage.src = new URL(product.image, imageUrl).href;
        productImage.alt = "";
        productImage.loading = "lazy";
        productImageWrap.append(productImage);
      }
      const copy = document.createElement("div");
      copy.className = "service-package-item-copy";
      const name = document.createElement("strong");
      name.textContent = product.name;
      const itemDescription = document.createElement("p");
      itemDescription.textContent = product.details?.description || product.category || "Menu item";
      copy.append(name, itemDescription);
      const meta = document.createElement("div");
      meta.className = "service-package-item-meta";
      meta.textContent = `Price: ${product.price || "To be confirmed"}`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.replacePackageItem = product.id;
      const isSelected = draftItems[editingSlot].productId === product.id;
      button.textContent = isSelected ? "Selected" : "Replace";
      button.disabled = isSelected;
      card.append(productImageWrap, copy, meta, button);
      optionsContainer.append(card);
    });
  }

  function updateRecipientFields() {
    const isForSomeoneElse = recipientToggle.checked;
    recipientFields.hidden = !isForSomeoneElse;
    orderForm.elements.recipientName.required = isForSomeoneElse;
    recipientContact.required = isForSomeoneElse;
    orderForm.elements.recipientAddress.required = isForSomeoneElse;
    updateRecipientContactValidity();
  }

  function updateFulfillmentFields() {
    const pickup = orderForm.elements.fulfillment.value === "pickup";
    deliveryAddressField.hidden = pickup;
    pickupLocationField.hidden = !pickup;
    deliveryAddress.required = !pickup;
  }

  function setFormatValidity(input, isValid, message) {
    if (!input.required) {
      input.setCustomValidity("");
      return;
    }

    const value = input.value.trim();
    if (!value) {
      input.setCustomValidity(input.value ? message : "");
      return;
    }
    input.setCustomValidity(isValid(value) ? "" : message);
  }

  function updateCustomerContactValidity() {
    setFormatValidity(customerEmail, isValidEmail, "Enter a valid email address.");
    setFormatValidity(
      customerPhone,
      isValidPhone,
      "Enter an 11-digit Philippine mobile number starting with 09."
    );
  }

  function updateRecipientContactValidity() {
    setFormatValidity(
      recipientContact,
      value => isValidEmail(value) || isValidPhone(value),
      "Enter a valid email address or an 11-digit Philippine mobile number starting with 09."
    );
  }

  renderItems();
  showPanel("included");
  updateRecipientFields();
  updateFulfillmentFields();

  root.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-package-avail]")) {
      const selectionPayload = {
        packageId: packageOffering.id,
        pax: packageOffering.pax || "",
        bookingOnly,
        packagePrice: bookingOnly ? "Booking · Price confirmed by bakery" : packageOffering.price || "To be confirmed",
        selectedInclusions: draftInclusions.filter((item, index) => selectedInclusionKeys.has(String(index))).map(item => ({
          name: item.name,
          quantity: item.quantityEditable ? formatInclusionQuantity(item) : item.quantity
        })),
        unselectedInclusions: draftInclusions.filter((item, index) => !selectedInclusionKeys.has(String(index))).map(item => item.name),
        selectedItems: draftItems.map(item => ({ ...item }))
      };
      window.storefrontApi.post("/api/storefront/package-selections", selectionPayload)
        .then(() => {
          showPanel("order");
          root.querySelector("#packageOrderTitle").focus({ preventScroll: true });
        })
        .catch(error => {
          console.error("Could not save selected package items.", error);
          status.classList.add("is-error");
          status.textContent = "Package selections could not be saved. Please try again.";
        });
    } else {
      const productToggle = event.target.closest("[data-toggle-package-product]");
      if (productToggle) {
        const productId = productToggle.dataset.togglePackageProduct;
        const existing = draftItems.findIndex(item => item.productId === productId);
        if (existing >= 0) draftItems.splice(existing, 1);
        else draftItems.push({ productId, quantity: 1 });
        renderItems();
        return;
      }
      const inclusionToggle = event.target.closest("[data-toggle-package-inclusion]");
      if (inclusionToggle) {
        const key = inclusionToggle.dataset.togglePackageInclusion;
        if (selectedInclusionKeys.has(key)) selectedInclusionKeys.delete(key);
        else selectedInclusionKeys.add(key);
        renderItems();
        return;
      }
      if (event.target.closest("[data-package-place-order]")) {
        if (!orderForm.reportValidity()) return;
        const placedAt = new Date();
        const fulfillment = orderForm.elements.fulfillment.value === "pickup" ? "Pickup" : "Delivery";
        const orderValues = Object.fromEntries(new FormData(orderForm).entries());
        orderValues.forSomeoneElse = recipientToggle.checked;
        orderValues.pax = packageOffering.pax || "";
        orderValues.bookingOnly = bookingOnly;
        orderValues.priceStatus = bookingOnly ? "pending-bakery-confirmation" : "fixed-package-price";
        orderValues.paymentStatus = bookingOnly ? "unpaid-booking" : "unpaid-preview";
        orderValues.packagePrice = bookingOnly ? "" : packageOffering.price || "";
        orderValues.total = bookingOnly ? "Price to be confirmed" : packageOffering.price || "Price to be confirmed";
        placeOrderButton.disabled = true;
        Promise.resolve(onOrderPlaced?.({
          packageOffering,
          pax: packageOffering.pax || "",
          bookingOnly,
          priceStatus: orderValues.priceStatus,
          paymentStatus: orderValues.paymentStatus,
          packagePrice: orderValues.packagePrice,
          total: orderValues.total,
          items: draftItems.map(item => ({ ...item })),
          inclusions: draftInclusions.filter((item, index) => selectedInclusionKeys.has(String(index))).map(item => ({
            name: item.name,
            quantity: item.quantityEditable ? formatInclusionQuantity(item) : item.quantity
          })),
          unselectedInclusions: draftInclusions.filter((item, index) => !selectedInclusionKeys.has(String(index))).map(item => item.name),
          order: orderValues,
          placedAt
        })).then(placement => {
          receiptOrder.textContent = placement?.orderNumber || "AC-PREVIEW-001";
          receiptReference.textContent = placement?.referenceNumber || `AC-REF-${placedAt.getTime()}`;
          receiptDate.textContent = new Intl.DateTimeFormat("en-PH", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(placedAt);
          receiptMethod.textContent = bookingOnly
          ? `${fulfillment} · Booking pending confirmation · Unpaid`
          : `${fulfillment} · ${orderForm.elements.paymentMethod.value}`;
          receiptPrice.textContent = bookingOnly ? "Price to be confirmed · Unpaid" : price.textContent;
          showPanel("receipt");
          receiptTitle.focus({ preventScroll: true });
          receiptTitle.scrollIntoView({ behavior: "instant", block: "center" });
        }).catch(error => {
          console.error("Could not save the package order.", error);
          status.classList.add("is-error");
          status.textContent = "The package order could not be saved. Please try again.";
          placeOrderButton.disabled = false;
        });
      }
    }
  });

  root.addEventListener("change", event => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target === recipientToggle) {
      updateRecipientFields();
      return;
    }
    if (event.target.name === "fulfillment") {
      updateFulfillmentFields();
      return;
    }
    if (event.target.matches("[data-package-inclusion-quantity]")) {
      const slot = Number(event.target.dataset.packageInclusionQuantity);
      const quantity = Number(event.target.value);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        event.target.value = String(draftInclusions[slot].quantityValue);
        return;
      }
      draftInclusions[slot].quantityValue = quantity;
      return;
    }
    if (!event.target.matches("[data-package-quantity]")) return;
    const slot = Number(event.target.dataset.packageQuantity);
    const quantity = Number(event.target.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      event.target.value = String(draftItems[slot].quantity);
      return;
    }
    draftItems[slot].quantity = quantity;
    renderItems();
  });

  customerEmail.addEventListener("input", updateCustomerContactValidity);
  customerPhone.addEventListener("input", updateCustomerContactValidity);
  recipientContact.addEventListener("input", updateRecipientContactValidity);

  try {
    const profile = JSON.parse(localStorage.getItem("angeliz_customer_profile") || "{}");
    const session = JSON.parse(localStorage.getItem("angeliz_customer_session") || "{}");
    orderForm.elements.customerName.value = typeof profile.fullName === "string" ? profile.fullName : "";
    orderForm.elements.customerEmail.value = typeof profile.email === "string"
      ? profile.email
      : typeof session.email === "string" ? session.email : "";
    orderForm.elements.customerPhone.value = typeof profile.phone === "string" ? profile.phone : "";
    updateCustomerContactValidity();
  } catch (error) {
    console.error("Could not read saved customer details for the package form.", error);
  }
};
