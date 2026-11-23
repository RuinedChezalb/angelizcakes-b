"use strict";

// Cake choices use static samples; final-step details end with a local preview receipt.
const customizationSamples = [
  {
    field: "Occasion",
    title: "What's the occasion?",
    sample: "Birthday",
    sampleDescription: "A cheerful cake for a birthday celebration."
  },
  {
    field: "Theme & Color",
    title: "Pick your theme & color",
    sample: "Floral Elegance · Pink & White",
    sampleDescription: "Fresh floral details in a soft pink-and-white palette."
  },
  {
    field: "Layers per tier",
    title: "How many cake layers?",
    sample: "2 layers per tier",
    sampleDescription: "Two sponge layers in each tier."
  },
  {
    field: "Tiers",
    title: "How many cake tiers?",
    sample: "2 tiers",
    sampleDescription: "An elegant two-tier cake.",
    tierSizes: true
  },
  {
    field: "Flavor",
    title: "Pick your flavor",
    sample: "Vanilla",
    sampleDescription: "Classic vanilla cake."
  },
  {
    field: "Frosting",
    title: "Choose your frosting",
    sample: "Buttercream",
    sampleDescription: "Smooth buttercream frosting."
  },
  {
    field: "Personalize & Schedule",
    title: "Personalize & schedule",
    form: true,
    fields: [
      {
        name: "dedication",
        label: "Cake dedication text (optional)",
        type: "textarea",
        placeholder: "e.g., Happy 18th Birthday, Maria! 💗",
        maxLength: 120,
        rows: 1,
        wide: true
      },
      {
        name: "customerName",
        label: "Your full name *",
        type: "text",
        placeholder: "Juan Dela Cruz",
        required: true,
        gridSpan: 2
      },
      { name: "email", label: "Email *", type: "email", placeholder: "you@example.com", required: true, gridSpan: 2 },
      {
        name: "contactNumber",
        label: "Phone *",
        type: "tel",
        placeholder: "09XXXXXXXXX",
        inputMode: "numeric",
        pattern: "09[0-9]{9}",
        title: "Enter an 11-digit Philippine mobile number starting with 09.",
        maxLength: 11,
        gridSpan: 2,
        required: true
      },
      {
        type: "recipient-toggle",
        label: "Ordering for someone else?",
        fields: [
          { name: "recipientName", label: "Recipient name *", type: "text", required: true, maxLength: 120 },
          {
            name: "recipientContact",
            label: "Recipient email or phone *",
            type: "text",
            placeholder: "Email or 09XXXXXXXXX",
            required: true,
            maxLength: 254
          },
          {
            name: "recipientAddress",
            label: "Recipient address *",
            type: "text",
            required: true,
            maxLength: 250
          },
          { name: "giftMessage", label: "Gift message (optional)", type: "textarea", maxLength: 500, rows: 2 }
        ]
      },
      { name: "dateNeeded", label: "Preferred date *", type: "date", required: true, gridSpan: 2 },
      { name: "timeNeeded", label: "Preferred time *", type: "time", required: true, gridSpan: 2 },
      {
        name: "paymentMethod",
        label: "Payment method *",
        type: "select",
        options: [
          "Cash on delivery / pickup",
          "GCash",
          "Maya",
          "QRPh",
          "Tonik",
          "BPI",
          "GoTyme",
          "MariBank",
          "Credit or debit card"
        ],
        gridSpan: 2,
        required: true
      },
      {
        type: "fulfillment",
        label: "Delivery or pickup *",
        options: [
          { value: "delivery", label: "Delivery" },
          { value: "pickup", label: "Pick up" }
        ],
        gridSpan: 3
      },
      {
        name: "deliveryAddress",
        label: "Delivery address *",
        type: "text",
        placeholder: "House/building, street, barangay, city",
        required: true,
        conditional: "delivery",
        gridSpan: 3
      },
      {
        type: "pickup-location",
        label: "Pickup location",
        gridSpan: 3
      },
      {
        name: "referenceImages",
        label: "Insert image for reference (optional)",
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        multiple: true,
        wide: true
      },
      {
        name: "notes",
        label: "Extra notes for our bakers (optional)",
        type: "textarea",
        placeholder: "Reference images, allergy concerns, texture preferences…",
        rows: 2,
        maxLength: 1000,
        wide: true
      }
    ]
  }
];

window.initializeCustomizationWizard = function initializeCustomizationWizard(root, options = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError("The customization wizard root is missing.");
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Customization wizard options must be an object.");
  }
  if (options.onPlaceOrder && typeof options.onPlaceOrder !== "function") {
    throw new TypeError("The custom cake order callback must be a function.");
  }

  const stepper = root.querySelector("[data-wizard-stepper]");
  const stage = root.querySelector("[data-wizard-content]");
  const summary = root.querySelector("[data-wizard-summary]");
  const toolbar = root.querySelector(".customization-wizard-toolbar");
  const pageHeader = root.querySelector(".customization-wizard-header");
  if (!stepper || !stage || !summary || !toolbar || !pageHeader) {
    throw new TypeError("The customization wizard is missing a required container.");
  }

  const selections = new Array(customizationSamples.length).fill(null);
  const tierDimensions = [
    { height: "", width: "" },
    { height: "", width: "" }
  ];
  const finalDetails = {
    dedication: "",
    customerName: "",
    contactNumber: "",
    email: "",
    recipientName: "",
    recipientContact: "",
    recipientAddress: "",
    giftMessage: "",
    dateNeeded: "",
    timeNeeded: "",
    fulfillment: "delivery",
    deliveryAddress: "",
    paymentMethod: "Cash on delivery / pickup",
    notes: ""
  };
  // Keep checkout contact rules while generating a preview receipt without submitting the request.
  const isValidEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  const isValidPhone = value => /^09[0-9]{9}$/.test(value);
  let isForSomeoneElse = false;
  let useCakePreviewAsReference = false;
  let selectedReferenceImages = [];
  let finalStepStatus;
  let deliveryAddressControl;
  let pickupLocationField;
  let letBakeryDecideTierSizes = false;
  let currentStep = 0;

  const stepIndicators = customizationSamples.map((step, index) => {
    const indicator = document.createElement("li");
    indicator.textContent = String(index + 1);
    indicator.setAttribute("aria-label", `Step ${index + 1}: ${step.field}`);
    stepper.append(indicator);
    return indicator;
  });

  function makeButton(label, primary = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `customization-wizard-action${primary ? " is-primary" : ""}`;
    button.textContent = label;
    return button;
  }

  function renderReferenceImages(container) {
    container.replaceChildren();
    selectedReferenceImages.forEach(({ file, url }, index) => {
      const figure = document.createElement("figure");
      figure.className = "customization-wizard-reference-image";
      const image = document.createElement("img");
      image.src = url;
      image.alt = `Reference image ${index + 1}: ${file.name}`;
      const caption = document.createElement("figcaption");
      caption.textContent = file.name;
      figure.append(image, caption);
      container.append(figure);
    });
  }

  function revokeReferenceImageUrls() {
    selectedReferenceImages.forEach(({ url }) => URL.revokeObjectURL(url));
    selectedReferenceImages = [];
  }

  function releaseReferenceImagesOnViewChange(event) {
    if (event.detail?.view === "customization-wizard") return;
    revokeReferenceImageUrls();
    document.removeEventListener("storefront:view-changed", releaseReferenceImagesOnViewChange);
  }

  document.addEventListener("storefront:view-changed", releaseReferenceImagesOnViewChange);

  function setFinalStepStatus(message, invalidField) {
    finalStepStatus.textContent = message;
    if (invalidField) invalidField.focus();
  }

  function validateFinalDetails() {
    const finalStep = customizationSamples[customizationSamples.length - 1];
    const requiredFields = finalStep.fields.flatMap(field => {
      if (field.type === "recipient-toggle") {
        return isForSomeoneElse ? field.fields.filter(recipientField => recipientField.required) : [];
      }
      if (!field.name || !field.required || (field.conditional && field.conditional !== finalDetails.fulfillment)) {
        return [];
      }
      return [field];
    });
    for (const field of requiredFields) {
      const value = finalDetails[field.name];
      if (!value.trim()) {
        const input = stage.querySelector(`[name="${field.name}"]`);
        setFinalStepStatus(`Please complete ${field.label.replace(" *", "").toLowerCase()}.`, input);
        return false;
      }
    }

    Object.keys(finalDetails).forEach(key => {
      finalDetails[key] = finalDetails[key].trim();
    });

    if (!isValidEmail(finalDetails.email)) {
      setFinalStepStatus("Please enter a valid email address.", stage.querySelector('[name="email"]'));
      return false;
    }

    if (!isValidPhone(finalDetails.contactNumber)) {
      setFinalStepStatus(
        "Enter an 11-digit Philippine mobile number starting with 09.",
        stage.querySelector('[name="contactNumber"]')
      );
      return false;
    }

    if (
      isForSomeoneElse
      && !isValidEmail(finalDetails.recipientContact)
      && !isValidPhone(finalDetails.recipientContact)
    ) {
      setFinalStepStatus(
        "Enter a valid recipient email address or an 11-digit Philippine mobile number starting with 09.",
        stage.querySelector('[name="recipientContact"]')
      );
      return false;
    }

    const dateInput = stage.querySelector('[name="dateNeeded"]');
    if (finalDetails.dateNeeded < dateInput.min) {
      setFinalStepStatus("Please choose today or a future date.", dateInput);
      return false;
    }

    setFinalStepStatus("");
    return true;
  }

  function resetFinalDetails() {
    Object.keys(finalDetails).forEach(key => {
      finalDetails[key] = ({
        paymentMethod: "Cash on delivery / pickup",
        fulfillment: "delivery"
      })[key] || "";
    });
    isForSomeoneElse = false;
    deliveryAddressControl = undefined;
    pickupLocationField = undefined;
    revokeReferenceImageUrls();
  }

  function renderEditableField(detail, container, disabled = false, required = detail.required) {
    const field = document.createElement("div");
    field.className = "customization-wizard-detail";
    if (detail.wide) field.classList.add("is-wide");
    else if (detail.gridSpan) field.classList.add(`is-span-${detail.gridSpan}`);

    const fieldId = `customization-${detail.name}`;
    const label = document.createElement("label");
    label.htmlFor = fieldId;
    label.textContent = detail.label;
    let value;

    if (detail.type === "select") {
      value = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select an option…";
      value.append(placeholder);
      detail.options.forEach(optionText => {
        const option = document.createElement("option");
        option.textContent = optionText;
        option.value = optionText;
        value.append(option);
      });
      value.value = finalDetails[detail.name];
    } else if (detail.type === "file") {
      value = document.createElement("input");
      value.type = "file";
      value.accept = detail.accept;
      value.multiple = detail.multiple;
    } else if (detail.type === "textarea") {
      value = document.createElement("textarea");
      if (detail.placeholder) value.placeholder = detail.placeholder;
      if (detail.maxLength) value.maxLength = detail.maxLength;
      if (detail.rows) value.rows = detail.rows;
      value.value = finalDetails[detail.name];
    } else {
      value = document.createElement("input");
      value.type = detail.type;
      if (detail.placeholder) value.placeholder = detail.placeholder;
      if (detail.inputMode) value.inputMode = detail.inputMode;
      if (detail.pattern) value.pattern = detail.pattern;
      if (detail.title) value.title = detail.title;
      if (detail.maxLength) value.maxLength = detail.maxLength;
      value.value = finalDetails[detail.name];
      if (detail.type === "date") {
        const today = new Date();
        value.min = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0")
        ].join("-");
      }
    }

    value.className = "customization-wizard-detail-value";
    value.id = fieldId;
    value.name = detail.name;
    value.required = Boolean(required);
    value.disabled = disabled;
    field.append(label, value);

    if (detail.type === "file") {
      const referencePreview = document.createElement("div");
      referencePreview.className = "customization-wizard-detail-preview";
      referencePreview.setAttribute("aria-live", "polite");
      renderReferenceImages(referencePreview);
      field.append(referencePreview);
      value.addEventListener("change", () => {
        const files = [...value.files];
        const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
        if (files.length > 3) {
          value.value = "";
          revokeReferenceImageUrls();
          renderReferenceImages(referencePreview);
          setFinalStepStatus("Choose up to 3 reference images.");
          return;
        }
        if (files.some(file => !allowedTypes.has(file.type) || file.size > 512 * 1024)) {
          value.value = "";
          revokeReferenceImageUrls();
          renderReferenceImages(referencePreview);
          setFinalStepStatus("Use JPG, PNG, or WebP images up to 512 KB each.");
          return;
        }
        revokeReferenceImageUrls();
        selectedReferenceImages = files.map(file => ({ file, url: URL.createObjectURL(file) }));
        renderReferenceImages(referencePreview);
        setFinalStepStatus("");
      });
    } else {
      const updateValue = () => {
        finalDetails[detail.name] = value.value;
        if (finalStepStatus.textContent) setFinalStepStatus("");
      };
      value.addEventListener("input", updateValue);
      value.addEventListener("change", updateValue);
    }

    container.append(field);
    return { field, value };
  }

  function renderRecipientToggle(detail, container) {
    const group = document.createElement("div");
    group.className = "customization-wizard-recipient-toggle is-wide";
    group.dataset.value = isForSomeoneElse ? "yes" : "no";

    const copy = document.createElement("div");
    copy.className = "customization-wizard-recipient-copy";
    const title = document.createElement("span");
    title.className = "customization-wizard-recipient-title";
    title.textContent = detail.label;
    copy.append(title);

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "customization-wizard-recipient-switch";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "customization-recipient-toggle";
    toggle.checked = isForSomeoneElse;
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-label", "Order for someone else");
    toggle.setAttribute("aria-controls", "customization-recipient-fields");
    const track = document.createElement("span");
    track.className = "customization-wizard-recipient-switch-track";
    track.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("span");
    track.append(thumb);
    toggleLabel.append(toggle, track);

    const toggleOptions = document.createElement("div");
    toggleOptions.className = "customization-wizard-recipient-switch-options";
    const noLabel = document.createElement("button");
    noLabel.type = "button";
    noLabel.className = "customization-wizard-recipient-option";
    noLabel.textContent = "No";
    noLabel.dataset.recipientNo = "";
    const yesLabel = document.createElement("button");
    yesLabel.type = "button";
    yesLabel.className = "customization-wizard-recipient-option";
    yesLabel.textContent = "Yes";
    yesLabel.dataset.recipientYes = "";
    noLabel.setAttribute("aria-pressed", String(!isForSomeoneElse));
    yesLabel.setAttribute("aria-pressed", String(isForSomeoneElse));
    toggle.setAttribute("aria-expanded", String(isForSomeoneElse));
    toggleOptions.append(noLabel, toggleLabel, yesLabel);

    const recipientFields = document.createElement("div");
    recipientFields.className = "customization-wizard-recipient-fields";
    recipientFields.id = "customization-recipient-fields";
    recipientFields.hidden = !isForSomeoneElse;
    const recipientControls = detail.fields.map(field => (
      renderEditableField(field, recipientFields, !isForSomeoneElse, isForSomeoneElse && field.required).value
    ));

    function setRecipientMode(enabled) {
      isForSomeoneElse = enabled;
      toggle.checked = enabled;
      group.dataset.value = isForSomeoneElse ? "yes" : "no";
      recipientFields.hidden = !isForSomeoneElse;
      toggle.setAttribute("aria-expanded", String(isForSomeoneElse));
      recipientControls.forEach((control, index) => {
        control.disabled = !isForSomeoneElse;
        control.required = isForSomeoneElse && detail.fields[index].required;
      });
      noLabel.setAttribute("aria-pressed", String(!isForSomeoneElse));
      yesLabel.setAttribute("aria-pressed", String(isForSomeoneElse));
      if (finalStepStatus.textContent) setFinalStepStatus("");
    }

    noLabel.addEventListener("click", () => setRecipientMode(false));
    yesLabel.addEventListener("click", () => setRecipientMode(true));
    toggle.addEventListener("change", () => setRecipientMode(toggle.checked));

    group.append(copy, toggleOptions, recipientFields);
    container.append(group);
  }

  function updateFulfillmentDisplay() {
    const isDelivery = finalDetails.fulfillment === "delivery";
    if (deliveryAddressControl) {
      deliveryAddressControl.closest(".customization-wizard-detail").hidden = !isDelivery;
      deliveryAddressControl.disabled = !isDelivery;
      deliveryAddressControl.required = isDelivery;
    }
    if (pickupLocationField) pickupLocationField.hidden = isDelivery;
  }

  function renderFulfillmentChoices(detail, container) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = `customization-wizard-fulfillment is-span-${detail.gridSpan || 6}`;
    const legend = document.createElement("legend");
    legend.textContent = detail.label;
    fieldset.append(legend);

    detail.options.forEach(option => {
      const label = document.createElement("label");
      label.className = "customization-wizard-fulfillment-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "fulfillment";
      input.value = option.value;
      input.checked = finalDetails.fulfillment === option.value;
      const text = document.createElement("span");
      text.textContent = option.label;
      input.addEventListener("change", () => {
        if (!input.checked) return;
        finalDetails.fulfillment = input.value;
        updateFulfillmentDisplay();
        if (finalStepStatus.textContent) setFinalStepStatus("");
      });
      label.append(input, text);
      fieldset.append(label);
    });

    container.append(fieldset);
  }

  function renderPickupLocation(detail, container) {
    const field = document.createElement("div");
    field.className = "customization-wizard-detail customization-wizard-pickup-location";
    if (detail.gridSpan) field.classList.add(`is-span-${detail.gridSpan}`);
    else field.classList.add("is-wide");
    field.hidden = finalDetails.fulfillment !== "pickup";
    const label = document.createElement("span");
    label.className = "customization-wizard-pickup-label";
    label.textContent = detail.label;
    const location = document.createElement("address");
    const branch = document.createElement("strong");
    branch.textContent = "Cabangan Branch";
    const address = document.createElement("span");
    address.textContent = "Main Hub & Production Studio, Cabangan, Legazpi City";
    location.append(branch, address);
    field.append(label, location);
    container.append(field);
    pickupLocationField = field;
  }

  function renderStep() {
    const step = customizationSamples[currentStep];
    stepper.hidden = false;
    stage.hidden = false;
    summary.hidden = true;
    stage.replaceChildren();

    stepIndicators.forEach((indicator, index) => {
      if (index === currentStep) indicator.setAttribute("aria-current", "step");
      else indicator.removeAttribute("aria-current");
    });

    const title = document.createElement("h2");
    title.className = "customization-wizard-step-title";
    title.tabIndex = -1;
    title.textContent = step.title;

    let details;
    if (step.form) {
      details = document.createElement("div");
      details.className = "customization-wizard-details";
      finalStepStatus = document.createElement("p");
      finalStepStatus.className = "customization-wizard-form-status";
      finalStepStatus.setAttribute("role", "status");
      finalStepStatus.setAttribute("aria-live", "polite");
      deliveryAddressControl = undefined;
      pickupLocationField = undefined;

      step.fields.forEach(detail => {
        if (detail.type === "recipient-toggle") {
          renderRecipientToggle(detail, details);
          return;
        }
        if (detail.type === "fulfillment") {
          renderFulfillmentChoices(detail, details);
          return;
        }
        if (detail.type === "pickup-location") {
          renderPickupLocation(detail, details);
          return;
        }

        const { value } = renderEditableField(detail, details);
        if (detail.name === "deliveryAddress") deliveryAddressControl = value;
      });
      updateFulfillmentDisplay();
    }

    let tierSelection;
    let tierDecisionLabel;
    let tierSizeFields;
    if (step.tierSizes) {
      tierSelection = document.createElement("div");
      tierSelection.className = "customization-wizard-tier-selection";

      tierDecisionLabel = document.createElement("label");
      tierDecisionLabel.className = "customization-wizard-bakery-choice";
      const decideCheckbox = document.createElement("input");
      decideCheckbox.type = "checkbox";
      decideCheckbox.checked = letBakeryDecideTierSizes;
      const decideText = document.createElement("span");
      decideText.textContent = "Let the baker decide";
      tierDecisionLabel.append(decideCheckbox, decideText);

      tierSizeFields = document.createElement("div");
      tierSizeFields.className = "customization-wizard-tier-sizes";
      tierSizeFields.hidden = letBakeryDecideTierSizes;
      tierDimensions.forEach((dimensions, index) => {
        const row = document.createElement("fieldset");
        row.className = "customization-wizard-tier-size";
        const legend = document.createElement("legend");
        legend.textContent = `Tier ${index + 1}`;
        row.append(legend);

        ["height", "width"].forEach(dimension => {
          const field = document.createElement("label");
          field.className = "customization-wizard-tier-dimension";
          const label = document.createElement("span");
          label.textContent = dimension === "height" ? "Height (inches)" : "Width (inches)";
          const input = document.createElement("input");
          input.type = "number";
          input.min = "1";
          input.step = "any";
          input.inputMode = "decimal";
          input.value = dimensions[dimension];
          input.setAttribute("aria-label", `Tier ${index + 1} ${dimension} in inches`);
          input.addEventListener("input", () => {
            dimensions[dimension] = input.value;
          });
          field.append(label, input);
          row.append(field);
        });
        tierSizeFields.append(row);
      });

      decideCheckbox.addEventListener("change", () => {
        letBakeryDecideTierSizes = decideCheckbox.checked;
        tierSizeFields.hidden = letBakeryDecideTierSizes;
      });
      if (selections[currentStep] === step.sample) {
        tierSelection.classList.add("is-selected");
      }
    }

    let sample;
    if (!step.form) {
      sample = document.createElement("button");
      sample.type = "button";
      sample.className = "customization-wizard-sample";
      sample.setAttribute("aria-pressed", String(selections[currentStep] === step.sample));
      if (selections[currentStep] === step.sample) sample.classList.add("is-selected");

      const sampleTitle = document.createElement("span");
      sampleTitle.className = "customization-wizard-sample-title";
      sampleTitle.textContent = step.sample;
      const sampleDescription = document.createElement("span");
      sampleDescription.className = "customization-wizard-sample-description";
      sampleDescription.textContent = step.sampleDescription;
      sample.append(sampleTitle, sampleDescription);
      sample.addEventListener("click", () => {
        selections[currentStep] = step.sample;
        sample.setAttribute("aria-pressed", "true");
        sample.classList.add("is-selected");
        tierSelection?.classList.add("is-selected");
        nextButton.disabled = false;
      });
    }

    const actions = document.createElement("div");
    actions.className = "customization-wizard-actions";
    const previousButton = makeButton("Previous");
    previousButton.hidden = currentStep === 0;
    previousButton.addEventListener("click", () => {
      currentStep -= 1;
      renderStep();
    });

    const nextButton = makeButton(
      step.form ? "Review My Cake" : "Next",
      true
    );
    nextButton.disabled = !step.form && selections[currentStep] !== step.sample;
    nextButton.addEventListener("click", () => {
      if (step.form) {
        if (validateFinalDetails()) renderSummary();
        return;
      }
      if (selections[currentStep] !== step.sample) return;
      currentStep += 1;
      renderStep();
    });
    actions.append(previousButton, nextButton);
    stage.append(title);
    if (details) stage.append(details);
    if (step.form && finalStepStatus) stage.append(finalStepStatus);
    if (tierSelection) {
      const tierChoiceRow = document.createElement("div");
      tierChoiceRow.className = "customization-wizard-tier-choice-row";
      tierChoiceRow.append(sample, tierDecisionLabel);
      tierSelection.append(tierChoiceRow, tierSizeFields);
      stage.append(tierSelection);
    } else if (sample) {
      stage.append(sample);
    }
    stage.append(actions);
    title.focus({ preventScroll: true });
  }

  function renderSummary() {
    stepper.hidden = true;
    stage.hidden = true;
    summary.hidden = false;
    summary.replaceChildren();

    const title = document.createElement("h2");
    title.textContent = "Your customization";
    const preview = document.createElement("figure");
    preview.className = "customization-wizard-cake-preview";
    const previewImage = document.createElement("img");
    previewImage.dataset.cakePreview = "";
    previewImage.alt = "Cake preview";
    previewImage.src = `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#fff9fa"/><g stroke="#b65272" stroke-width="5"><path d="M225 193h190v100H225z" fill="#f3d9e0"/><path d="M260 128h120v65H260z" fill="#fff"/><path d="M225 215q24 20 48 0t48 0 48 0 46 0" fill="none"/><path d="M280 94v34m40-34v34m40-34v34" fill="none" stroke-linecap="round"/></g><path d="M280 93q0-12 8-12t8 12m24 0q0-12 8-12t8 12m24 0q0-12 8-12t8 12" fill="#e9a43b"/></svg>'
    )}`;
    const recreateButton = document.createElement("button");
    recreateButton.type = "button";
    recreateButton.className = "customization-wizard-cake-preview-recreate";
    recreateButton.setAttribute("aria-label", "Recreate cake preview");
    const recreateIcon = document.createElement("i");
    recreateIcon.className = "fa-solid fa-rotate";
    recreateIcon.setAttribute("aria-hidden", "true");
    const recreateLabel = document.createElement("span");
    recreateLabel.textContent = "Recreate";
    recreateButton.append(recreateIcon, recreateLabel);
    const previewReferenceLabel = document.createElement("label");
    previewReferenceLabel.className = "customization-wizard-cake-preview-reference";
    const previewReferenceToggle = document.createElement("input");
    previewReferenceToggle.type = "checkbox";
    previewReferenceToggle.checked = useCakePreviewAsReference;
    previewReferenceToggle.setAttribute("aria-describedby", "customizationCakePreviewNote");
    const previewReferenceText = document.createElement("span");
    previewReferenceText.textContent = "Use as reference";
    previewReferenceLabel.append(previewReferenceToggle, previewReferenceText);
    previewReferenceToggle.addEventListener("change", () => {
      useCakePreviewAsReference = previewReferenceToggle.checked;
      preview.dataset.useAsReference = String(useCakePreviewAsReference);
    });
    const previewNote = document.createElement("p");
    previewNote.className = "customization-wizard-cake-preview-note";
    previewNote.id = "customizationCakePreviewNote";
    previewNote.textContent =
      "AI-generated previews are for reference only. The finished cake may differ in colors, proportions, decorations, and details.";
    preview.append(previewImage, recreateButton, previewReferenceLabel, previewNote);
    const list = document.createElement("dl");
    list.className = "customization-wizard-summary-list";

    function createSummaryRow(labelText, valueText) {
      const row = document.createElement("div");
      const label = document.createElement("dt");
      label.textContent = labelText;
      const value = document.createElement("dd");
      value.textContent = valueText;
      row.append(label, value);
      return row;
    }

    function appendSummaryRow(labelText, valueText) {
      list.append(createSummaryRow(labelText, valueText));
    }

    let recipientSummaryRow;
    customizationSamples.forEach((step, index) => {
      if (step.form) {
        step.fields.forEach(field => {
          if (field.type === "recipient-toggle") {
            if (!isForSomeoneElse) {
              recipientSummaryRow = createSummaryRow(field.label, "No");
              return;
            }

            const row = document.createElement("div");
            row.className = "customization-wizard-summary-recipient";
            const header = document.createElement("div");
            header.className = "customization-wizard-summary-recipient-header";
            const headerLabel = document.createElement("span");
            headerLabel.textContent = field.label;
            const headerValue = document.createElement("strong");
            headerValue.textContent = "Yes";
            header.append(headerLabel, headerValue);
            const recipientList = document.createElement("dl");
            recipientList.className = "customization-wizard-summary-recipient-list";
            field.fields.forEach(recipientField => {
              const value = finalDetails[recipientField.name];
              if (!value && !recipientField.required) return;
              recipientList.append(
                createSummaryRow(recipientField.label.replace(" *", ""), value || "Not provided")
              );
            });
            row.append(header, recipientList);
            recipientSummaryRow = row;
            return;
          }
          if (field.type === "fulfillment") {
            const option = field.options.find(choice => choice.value === finalDetails.fulfillment);
            appendSummaryRow(field.label.replace(" *", ""), option?.label || "Not provided");
            return;
          }
          if (field.type === "pickup-location") {
            if (finalDetails.fulfillment === "pickup") {
              appendSummaryRow(
                field.label,
                "Cabangan Branch — Main Hub & Production Studio, Cabangan, Legazpi City"
              );
            }
            return;
          }
          if (field.conditional && field.conditional !== finalDetails.fulfillment) return;

          if (field.type === "file" && !selectedReferenceImages.length) return;
          const value = field.type === "file"
            ? selectedReferenceImages.map(({ file }) => file.name).join(", ")
            : finalDetails[field.name];
          if (!value && !field.required) return;
          appendSummaryRow(field.label.replace(" *", ""), value);
        });
        return;
      }

      const label = step.field;
      let value;
      if (step.tierSizes) {
        const tierSizes = tierDimensions.flatMap((dimensions, tierIndex) => {
          const measurements = [];
          if (dimensions.height) measurements.push(`height ${dimensions.height} inches`);
          if (dimensions.width) measurements.push(`width ${dimensions.width} inches`);
          return measurements.length ? `Tier ${tierIndex + 1}: ${measurements.join(", ")}` : [];
        });
        value = letBakeryDecideTierSizes
          ? `${selections[index] || step.sample} · Baker decides sizes`
          : tierSizes.length
            ? `${selections[index] || step.sample} · Sizes specified — ${tierSizes.join("; ")}`
            : selections[index] || step.sample;
      } else {
        value = selections[index] || step.sample;
      }
      appendSummaryRow(label, value);
    });
    if (recipientSummaryRow) list.append(recipientSummaryRow);

    const actions = document.createElement("div");
    actions.className = "customization-wizard-review-actions";
    const restartButton = makeButton("Start over");
    restartButton.addEventListener("click", () => {
      selections.fill(null);
      resetFinalDetails();
      tierDimensions.forEach(dimensions => {
        dimensions.height = "";
        dimensions.width = "";
      });
      letBakeryDecideTierSizes = false;
      useCakePreviewAsReference = false;
      currentStep = 0;
      renderStep();
    });
    const placeOrderButton = makeButton("Place Order", true);
    placeOrderButton.addEventListener("click", renderReceipt);
    actions.append(restartButton, placeOrderButton);
    summary.append(title, preview, list, actions);
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }

  function renderReceipt() {
    const cakeSelections = customizationSamples.flatMap((step, index) => {
      if (step.form) return [];
      if (step.tierSizes) {
        const sizes = tierDimensions.map((dimensions, tierIndex) => ({
          tier: tierIndex + 1,
          height: dimensions.height,
          width: dimensions.width
        }));
        return [{
          label: step.field,
          value: selections[index] || step.sample,
          letBakerDecideSizes: letBakeryDecideTierSizes,
          sizes: letBakeryDecideTierSizes ? [] : sizes
        }];
      }
      return [{ label: step.field, value: selections[index] || step.sample }];
    });
    options.onPlaceOrder?.({
      title: "Fully Custom Cake",
      selections: cakeSelections,
      customerName: finalDetails.customerName,
      email: finalDetails.email,
      contactNumber: finalDetails.contactNumber,
      recipientName: isForSomeoneElse ? finalDetails.recipientName : "",
      recipientContact: isForSomeoneElse ? finalDetails.recipientContact : "",
      recipientAddress: isForSomeoneElse ? finalDetails.recipientAddress : "",
      giftMessage: isForSomeoneElse ? finalDetails.giftMessage : "",
      dedication: finalDetails.dedication,
      dateNeeded: finalDetails.dateNeeded,
      timeNeeded: finalDetails.timeNeeded,
      fulfillment: finalDetails.fulfillment,
      deliveryAddress: finalDetails.fulfillment === "delivery" ? finalDetails.deliveryAddress : "",
      paymentMethod: finalDetails.paymentMethod,
      notes: finalDetails.notes,
      referenceImages: selectedReferenceImages.map(({ file }) => file.name)
    });

    summary.replaceChildren();
    toolbar.hidden = true;
    pageHeader.hidden = true;
    root.setAttribute("aria-labelledby", "customizationWizardReceiptTitle");

    const card = document.createElement("section");
    card.className = "customization-wizard-receipt-card";
    card.setAttribute("aria-labelledby", "customizationWizardReceiptTitle");

    const heading = document.createElement("div");
    heading.className = "customization-wizard-receipt-heading";
    const icon = document.createElement("span");
    icon.className = "customization-wizard-receipt-icon";
    icon.setAttribute("aria-hidden", "true");
    const check = document.createElement("i");
    check.className = "fa-solid fa-check";
    icon.append(check);
    const title = document.createElement("h1");
    title.id = "customizationWizardReceiptTitle";
    title.tabIndex = -1;
    title.textContent = "Receipt";
    heading.append(icon, title);

    const details = document.createElement("dl");
    details.className = "customization-wizard-receipt-details";
    const placedAt = new Date();
    const fulfillment = finalDetails.fulfillment === "pickup" ? "Pick up" : "Delivery";
    const requestedFor = `${finalDetails.dateNeeded} · ${finalDetails.timeNeeded}`;

    function appendReceiptRow(labelText, valueText) {
      const row = document.createElement("div");
      const label = document.createElement("dt");
      label.textContent = labelText;
      const value = document.createElement("dd");
      value.textContent = valueText;
      row.append(label, value);
      details.append(row);
    }

    appendReceiptRow("Order No.", "AC-PREVIEW-001");
    appendReceiptRow("Reference No.", `AC-REF-${placedAt.getTime()}`);
    appendReceiptRow(
      "Date / Time",
      new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(placedAt)
    );
    appendReceiptRow("Customer", finalDetails.customerName);
    appendReceiptRow("Requested for", requestedFor);
    appendReceiptRow("Method", `${fulfillment} · ${finalDetails.paymentMethod}`);

    const note = document.createElement("p");
    note.className = "customization-wizard-receipt-note";
    note.textContent =
      "Preview only — this request has not been sent to the bakery and no payment was processed.";

    const homeLink = document.createElement("a");
    homeLink.className = "customization-wizard-receipt-home";
    homeLink.href = "#home";
    const homeIcon = document.createElement("i");
    homeIcon.className = "fa-solid fa-house";
    homeIcon.setAttribute("aria-hidden", "true");
    const homeLabel = document.createElement("span");
    homeLabel.textContent = "Return to Homepage";
    homeLink.append(homeIcon, homeLabel);

    card.append(heading, details, homeLink, note);
    summary.append(card);
    title.focus({ preventScroll: true });
    title.scrollIntoView({ behavior: "instant", block: "center" });
  }

  renderStep();
};