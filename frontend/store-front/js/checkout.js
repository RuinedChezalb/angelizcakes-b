"use strict";

window.initializeCheckoutFragment = function initializeCheckoutFragment(root, product, imageUrl, options = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError("The checkout fragment is missing.");
  if (!product || typeof product.id !== "string" || typeof product.name !== "string") {
    throw new TypeError("The selected product is missing checkout information.");
  }
  if (typeof imageUrl !== "string" || !imageUrl) {
    throw new TypeError("The selected product image is missing.");
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Checkout options must be an object.");
  }
  if (options.onPlaceOrder && typeof options.onPlaceOrder !== "function") {
    throw new TypeError("The checkout order callback must be a function.");
  }

  const form = root.querySelector("[data-checkout-form]");
  const productImage = root.querySelector("[data-checkout-image]");
  const deliveryAddressField = root.querySelector("[data-delivery-address-field]");
  const pickupLocationField = root.querySelector("[data-pickup-location-field]");
  const deliveryAddress = root.querySelector("#deliveryAddress");
  const recipientToggle = root.querySelector("#forSomeoneElse");
  const recipientToggleGroup = root.querySelector("[data-recipient-toggle-group]");
  const recipientFields = root.querySelector("[data-recipient-fields]");
  const productName = root.querySelector("[data-checkout-name]");
  const productPrice = root.querySelector("[data-checkout-price]");
  const paymentMethod = root.querySelector("#paymentMethod");
  const placeOrderButton = root.querySelector(".checkout-submit-button");
  const checkoutToolbar = root.querySelector(".checkout-toolbar");
  const pageTitle = root.querySelector(".checkout-page-title");
  const receipt = root.querySelector("[data-order-receipt]");
  const receiptTitle = root.querySelector("#receiptTitle");
  const receiptOrder = root.querySelector("[data-receipt-order]");
  const receiptReference = root.querySelector("[data-receipt-reference]");
  const receiptDate = root.querySelector("[data-receipt-date]");
  const receiptMethod = root.querySelector("[data-receipt-method]");
  const receiptPrice = root.querySelector("[data-receipt-price]");
  const retouchesTitle = root.querySelector("#retouchesTitle");
  const shippingTotal = root.querySelector("[data-checkout-shipping]");
  const orderTotal = root.querySelector("[data-checkout-total]");
  const priceNote = root.querySelector("[data-checkout-price-note]");
  const submitError = root.querySelector("[data-checkout-error]");
  if (
    !submitError ||
    !form || !productImage || !deliveryAddressField || !pickupLocationField
    || !deliveryAddress || !recipientToggle || !recipientToggleGroup || !recipientFields
    || !form.elements.recipientName || !form.elements.recipientContact || !form.elements.recipientAddress
    || !productName || !productPrice || !retouchesTitle || !shippingTotal
    || !orderTotal || !priceNote || !form.elements.customerName
    || !form.elements.customerEmail || !form.elements.customerPhone
    || !form.elements.deliveryDate || !form.elements.deliveryTime || !form.elements.fulfillment
    || !paymentMethod || !placeOrderButton || !checkoutToolbar || !pageTitle || !receipt || !receiptTitle
    || !receiptOrder || !receiptReference || !receiptDate || !receiptMethod || !receiptPrice
  ) {
    throw new TypeError("The checkout form is missing required fields.");
  }

  const priceMatch = String(product.price || "").match(/[\d,]+(?:\.\d{1,2})?/);
  const priceValue = priceMatch ? Number(priceMatch[0].replace(/,/g, "")) : Number.NaN;
  const hasPrice = Number.isFinite(priceValue) && priceValue >= 0;
  const isValidEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  const isValidPhone = value => /^09[0-9]{9}$/.test(value);
  const formatPrice = amount => `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  productImage.src = imageUrl;
  productImage.alt = product.name;
  productName.textContent = product.name;
  productPrice.textContent = product.price || "To be confirmed";
  retouchesTitle.textContent =
    String(product.category || "").toLowerCase() === "cakes" ? "Cake Retouches" : "Special Requests";
  root.querySelectorAll(".cake-only").forEach(field => {
    field.hidden = String(product.category || "").toLowerCase() !== "cakes";
  });

  const savedProfile = readSavedProfile();
  form.elements.customerName.value = savedProfile.fullName;
  form.elements.customerEmail.value = savedProfile.email;
  form.elements.customerPhone.value = savedProfile.phone;
  updateCustomerContactValidity();

  const localDate = new Date();
  const timezoneOffset = localDate.getTimezoneOffset() * 60000;
  form.elements.deliveryDate.min = new Date(localDate.getTime() - timezoneOffset).toISOString().slice(0, 10);
  placeOrderButton.addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const placedAt = new Date();
    const fulfillmentMethod = form.elements.fulfillment.value === "pickup" ? "Pickup" : "Delivery";
    const orderDetails = {
      product,
      customerName: form.elements.customerName.value.trim(),
      customerEmail: form.elements.customerEmail.value.trim(),
      customerPhone: form.elements.customerPhone.value.trim(),
      cakeAge: form.elements.cakeAge.value.trim(),
      dedicationName: form.elements.dedicationName.value.trim(),
      cakeCharacter: form.elements.cakeCharacter.value.trim(),
      itemSpecifications: form.elements.itemSpecifications.value.trim(),
      recipientName: form.elements.recipientName.value.trim(),
      recipientContact: form.elements.recipientContact.value.trim(),
      recipientAddress: form.elements.recipientAddress.value.trim(),
      giftMessage: form.elements.giftMessage.value.trim(),
      deliveryDate: form.elements.deliveryDate.value,
      deliveryTime: form.elements.deliveryTime.value,
      fulfillment: form.elements.fulfillment.value,
      deliveryAddress: deliveryAddress.value.trim(),
      paymentMethod: paymentMethod.value,
      orderTotal: orderTotal.textContent.trim(),
      additionalInformation: form.elements.additionalInformation.value.trim()
    };

    let placement;
    try {
      placement = options.onPlaceOrder
        ? options.onPlaceOrder(orderDetails)
        : window.AngelizDB.orders.placeMenuOrder(orderDetails, { source: "storefront" });
    } catch (error) {
      console.error("Could not save the order.", error);
      submitError.textContent = "Your order could not be saved. Please try again.";
      submitError.hidden = false;
      return;
    }
    submitError.hidden = true;

    receiptOrder.textContent = placement?.orderNumber || "Pending";
    receiptReference.textContent = placement?.referenceNumber || `AC-REF-${placedAt.getTime()}`;
    receiptDate.textContent = new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(placedAt);
    receiptMethod.textContent = `${fulfillmentMethod} · ${paymentMethod.value}`;
    receiptPrice.textContent = orderTotal.textContent.trim();

    checkoutToolbar.hidden = true;
    pageTitle.hidden = true;
    form.hidden = true;
    receipt.hidden = false;
    root.setAttribute("aria-labelledby", "receiptTitle");
    receiptTitle.focus({ preventScroll: true });
    receiptTitle.scrollIntoView({ behavior: "instant", block: "center" });
  });
  form.addEventListener("submit", event => event.preventDefault());

  function updateFulfillment() {
    const isPickup = form.elements.fulfillment.value === "pickup";
    deliveryAddressField.hidden = isPickup;
    pickupLocationField.hidden = !isPickup;
    deliveryAddress.required = !isPickup;

    shippingTotal.textContent = isPickup ? formatPrice(0) : "To be confirmed";
    orderTotal.textContent = !hasPrice
      ? "To be confirmed"
      : isPickup ? formatPrice(priceValue) : `${formatPrice(priceValue)} + delivery fee`;
    priceNote.textContent = isPickup
      ? "Pickup is free. The bakery will confirm availability and the order schedule."
      : "Delivery fee and final total will be confirmed by the bakery before the order is accepted.";
  }

  function updateRecipientDetails() {
    const isForSomeoneElse = recipientToggle.checked;
    recipientToggleGroup.dataset.value = isForSomeoneElse ? "yes" : "no";
    recipientFields.hidden = !isForSomeoneElse;
    form.elements.recipientName.required = isForSomeoneElse;
    form.elements.recipientContact.required = isForSomeoneElse;
    form.elements.recipientAddress.required = isForSomeoneElse;
    updateRecipientContactValidity();
  }

  function updateRecipientContactValidity() {
    setFormatValidity(
      form.elements.recipientContact,
      value => isValidEmail(value) || isValidPhone(value),
      "Enter a valid email address or an 11-digit Philippine mobile number starting with 09."
    );
  }

  function updateCustomerContactValidity() {
    setFormatValidity(form.elements.customerEmail, isValidEmail, "Enter a valid email address.");
    setFormatValidity(
      form.elements.customerPhone,
      isValidPhone,
      "Enter an 11-digit Philippine mobile number starting with 09."
    );
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

  recipientToggle.addEventListener("change", updateRecipientDetails);
  form.elements.recipientContact.addEventListener("input", updateRecipientContactValidity);
  form.elements.customerEmail.addEventListener("input", updateCustomerContactValidity);
  form.elements.customerPhone.addEventListener("input", updateCustomerContactValidity);
  form.querySelectorAll('input[name="fulfillment"]').forEach(input => {
    input.addEventListener("change", updateFulfillment);
  });
  updateFulfillment();
  updateRecipientDetails();
};

function readSavedProfile() {
  let profile = {};
  let session = {};

  try {
    const saved = JSON.parse(localStorage.getItem("angeliz_customer_profile") || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      throw new TypeError("The saved customer profile must be an object.");
    }
    profile = saved;
  } catch (error) {
    console.error("Could not read the saved customer profile.", error);
  }

  try {
    const savedSession = JSON.parse(localStorage.getItem("angeliz_customer_session") || "{}");
    if (savedSession && typeof savedSession === "object" && !Array.isArray(savedSession)) {
      session = savedSession;
    }
  } catch (error) {
    console.error("Could not read the customer session.", error);
  }

  return {
    fullName: typeof profile.fullName === "string" ? profile.fullName : "",
    email: typeof profile.email === "string" ? profile.email : typeof session.email === "string" ? session.email : "",
    phone: typeof profile.phone === "string" ? profile.phone : ""
  };
}
