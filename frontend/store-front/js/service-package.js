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
  const includedPanel = root.querySelector("[data-package-included-panel]");
  const customizer = root.querySelector("[data-package-customizer]");
  const picker = root.querySelector("[data-package-picker]");
  const orderInfo = root.querySelector("[data-package-order-info]");
  const receipt = root.querySelector("[data-package-receipt]");
  const toolbar = root.querySelector(".service-package-toolbar");
  const orderForm = root.querySelector("[data-package-order-form]");
  const status = root.querySelector("[data-package-status]");
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
    image, title, description, price, itemsContainer, editItemsContainer, optionsContainer,
    includedPanel, customizer, picker, orderInfo, receipt, toolbar, orderForm, status,
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
  const fixedInclusions = hasProductItems ? null : packageOffering.inclusions;
  if (hasProductItems && (
    packageOffering.itemIds.length === 0
    || packageOffering.itemIds.some(id => typeof id !== "string" || !productById(id))
  )) {
    throw new TypeError("The package contains an item that is missing from static storefront data.");
  }
  if (!hasProductItems && (
    !Array.isArray(fixedInclusions)
    || fixedInclusions.length === 0
    || fixedInclusions.some(item =>
      !item
      || typeof item.name !== "string"
      || !item.name.trim()
      || typeof item.quantity !== "string"
      || !parseInclusionQuantity(item.quantity)
    )
  )) {
    throw new TypeError("The package is missing valid included item data.");
  }

  image.src = imageUrl;
  image.alt = packageOffering.title;
  title.textContent = packageOffering.title;
  description.textContent = packageOffering.description;
  price.textContent = packageOffering.price || "To be confirmed";
  const storageKey = `angeliz_service_package_${packageOffering.id}`;
  let savedItems = hasProductItems
    ? packageOffering.itemIds.map(productId => ({ productId, quantity: 1 }))
    : [];
  let draftItems = savedItems.map(item => ({ ...item }));
  let savedInclusions = fixedInclusions
    ? fixedInclusions.map(item => ({ ...item, ...parseInclusionQuantity(item.quantity) }))
    : [];
  let draftInclusions = savedInclusions.map(item => ({ ...item }));
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
    const card = document.createElement("article");
    card.className = "service-package-item";

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

    if (editable) {
      const quantityLabel = document.createElement("label");
      quantityLabel.className = "service-package-item-quantity";
      quantityLabel.append(document.createTextNode("Quantity"));
      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "1";
      quantity.max = "99";
      quantity.step = "1";
      quantity.value = String(item.quantity);
      quantity.dataset.packageQuantity = String(index);
      quantity.setAttribute("aria-label", `Quantity for ${product.name}`);
      quantityLabel.append(quantity);
      meta.append(quantityLabel);

      const editButton = document.createElement("button");
      editButton.className = "service-package-edit-item";
      editButton.type = "button";
      editButton.dataset.editPackageItem = String(index);
      editButton.textContent = "Edit";
      card.append(imageWrap, copy, meta, editButton);
    } else {
      const quantity = document.createElement("span");
      quantity.textContent = `Quantity: ${item.quantity}`;
      meta.append(quantity);
      card.append(imageWrap, copy, meta);
    }
    return card;
  }

  function makeFixedInclusion(item, index, editable) {
    const card = document.createElement("article");
    card.className = "service-package-item service-package-fixed-item";

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
    if (editable) {
      const quantityLabel = document.createElement("label");
      quantityLabel.className = "service-package-item-quantity";
      quantityLabel.append(document.createTextNode("Quantity"));
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.min = "1";
      quantityInput.max = "99";
      quantityInput.step = "1";
      quantityInput.value = String(item.quantityValue);
      quantityInput.dataset.packageInclusionQuantity = String(index);
      quantityInput.setAttribute("aria-label", `Quantity for ${item.name}`);
      quantityLabel.append(quantityInput);
      if (item.quantityUnit) {
        const unit = document.createElement("span");
        unit.textContent = item.quantityUnit;
        quantityLabel.append(unit);
      }
      meta.append(quantityLabel);
    } else {
      const quantity = document.createElement("span");
      quantity.textContent = `Quantity: ${formatInclusionQuantity(item)}`;
      meta.append(quantity);
    }

    card.append(imageWrap, copy, meta);
    return card;
  }

  function renderItems() {
    if (fixedInclusions) {
      itemsContainer.replaceChildren(...draftInclusions.map((item, index) => (
        makeFixedInclusion(item, index, false)
      )));
      editItemsContainer.replaceChildren(...draftInclusions.map((item, index) => (
        makeFixedInclusion(item, index, true)
      )));
      root.querySelectorAll("[data-package-count]").forEach(count => {
        count.textContent = `${draftInclusions.length} included items`;
      });
      return;
    }

    itemsContainer.replaceChildren(...draftItems.map((item, index) => makeItem(item, index, false)));
    editItemsContainer.replaceChildren(...draftItems.map((item, index) => makeItem(item, index, true)));
    root.querySelectorAll("[data-package-count]").forEach(count => {
      count.textContent = `${draftItems.length} items`;
    });
  }

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
      showPanel("order");
      root.querySelector("#packageOrderTitle").focus({ preventScroll: true });
    } else if (event.target.closest("[data-package-customize]")) {
      renderItems();
      status.textContent = "";
      showPanel("customize");
    } else if (event.target.closest("[data-package-discard]")) {
      if (fixedInclusions) {
        draftInclusions = savedInclusions.map(item => ({ ...item }));
      } else {
        draftItems = savedItems.map(item => ({ ...item }));
      }
      editingSlot = -1;
      renderItems();
      status.textContent = "Package changes discarded.";
      showPanel("included");
    } else if (event.target.closest("[data-package-save]")) {
      try {
        if (fixedInclusions) {
          localStorage.setItem(storageKey, JSON.stringify(draftInclusions.map(item => item.quantityValue)));
          savedInclusions = draftInclusions.map(item => ({ ...item }));
        } else {
          localStorage.setItem(storageKey, JSON.stringify(draftItems));
          savedItems = draftItems.map(item => ({ ...item }));
        }
        status.classList.remove("is-error");
        status.textContent = "Package choices saved in this browser.";
        editingSlot = -1;
        renderItems();
        showPanel("included");
      } catch (error) {
        console.error("Could not save package selections.", error);
        status.classList.add("is-error");
        status.textContent = "Package choices could not be saved in this browser.";
      }
    } else if (event.target.closest("[data-package-picker-back]")) {
      editingSlot = -1;
      showPanel("customize");
    } else {
      const editButton = event.target.closest("[data-edit-package-item]");
      if (editButton) {
        editingSlot = Number(editButton.dataset.editPackageItem);
        renderOptions();
        showPanel("picker");
        return;
      }
      const replaceButton = event.target.closest("[data-replace-package-item]");
      if (replaceButton && editingSlot >= 0) {
        draftItems[editingSlot].productId = replaceButton.dataset.replacePackageItem;
        editingSlot = -1;
        renderItems();
        showPanel("customize");
      } else if (event.target.closest("[data-package-place-order]")) {
        if (!orderForm.reportValidity()) return;
        const placedAt = new Date();
        const fulfillment = orderForm.elements.fulfillment.value === "pickup" ? "Pickup" : "Delivery";
        const orderValues = Object.fromEntries(new FormData(orderForm).entries());
        orderValues.forSomeoneElse = recipientToggle.checked;
        const placement = onOrderPlaced?.({
          packageOffering,
          items: draftItems.map(item => ({ ...item })),
          inclusions: fixedInclusions
            ? draftInclusions.map(item => ({ ...item, quantity: formatInclusionQuantity(item) }))
            : [],
          order: orderValues,
          placedAt
        });
        receiptOrder.textContent = placement?.orderNumber || "AC-PREVIEW-001";
        receiptReference.textContent = placement?.referenceNumber || `AC-REF-${placedAt.getTime()}`;
        receiptDate.textContent = new Intl.DateTimeFormat("en-PH", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(placedAt);
        receiptMethod.textContent = `${fulfillment} · ${orderForm.elements.paymentMethod.value}`;
        receiptPrice.textContent = price.textContent;
        showPanel("receipt");
        receiptTitle.focus({ preventScroll: true });
        receiptTitle.scrollIntoView({ behavior: "instant", block: "center" });
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
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
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
