(function () {
  const storageKey = "angelizCakes.storefrontInquiries.v1";
  const list = document.getElementById("storefrontInquiryList");
  const detail = document.getElementById("storefrontInquiryDetail");
  const status = document.getElementById("communicationStatus");
  const inboxTab = document.getElementById("inboxTab");
  const archivedTab = document.getElementById("archivedTab");
  const sampleInquiry = {
    id: "sample-storefront-inquiry",
    name: "Sample Customer",
    email: "sample.customer@example.com",
    subject: "Custom birthday cake inquiry",
    details: "Hello! I would like to ask about ordering a custom birthday cake for 20 guests on December 12. Could you please share the available designs and pricing?",
    submittedAt: "2026-11-23T09:00:00+08:00",
    sample: true,
  };
  let selectedInquiryId = "";
  let activeFolder = "inbox";
  let inquiries = [];

  function readInquiries() {
    let savedInquiries;
    try {
      savedInquiries = window.localStorage.getItem(storageKey);
    } catch (error) {
      console.error("Could not read storefront inquiries:", error);
      return { items: [], error: "Storefront messages are unavailable." };
    }

    if (!savedInquiries) {
      return { items: [sampleInquiry], error: "" };
    }

    let parsed;
    try {
      parsed = JSON.parse(savedInquiries);
    } catch (error) {
      console.error("Storefront inquiry data is invalid JSON:", error);
      return { items: [], error: "Storefront message data could not be read." };
    }

    if (!Array.isArray(parsed)) {
      console.error("Storefront inquiry data must be an array.");
      return { items: [], error: "Storefront message data has an invalid format." };
    }

    const hasInvalidInquiry = parsed.some((inquiry) =>
      !inquiry
      || (
        typeof inquiry.id !== "string"
        || typeof inquiry.name !== "string"
        || typeof inquiry.email !== "string"
        || typeof inquiry.subject !== "string"
        || typeof inquiry.details !== "string"
        || typeof inquiry.submittedAt !== "string"
        || (inquiry.reply !== undefined && typeof inquiry.reply !== "string")
        || (inquiry.repliedAt !== undefined && typeof inquiry.repliedAt !== "string")
        || (inquiry.archived !== undefined && typeof inquiry.archived !== "boolean")
      )
    );
    if (hasInvalidInquiry) {
      console.error("Storefront inquiry data contains an invalid message record.");
      return { items: [], error: "A storefront message has invalid data and could not be displayed." };
    }

    return { items: parsed.length ? parsed : [sampleInquiry], error: "" };
  }

  function showEmptyDetail(message) {
    detail.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "communication-empty-detail";
    empty.textContent = message || (activeFolder === "archived"
      ? "Select an archived conversation to view its details."
      : "Select a storefront message to view its details.");
    detail.append(empty);
  }

  function renderSelectedInquiry() {
    const inquiry = inquiries.find((item) => item.id === selectedInquiryId);
    if (!inquiry) {
      selectedInquiryId = "";
      showEmptyDetail();
      return;
    }

    detail.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "communication-detail-heading";

    const title = document.createElement("h3");
    title.textContent = inquiry.subject;
    heading.append(title);
    if (inquiry.archived) {
      const archivedLabel = document.createElement("span");
      archivedLabel.className = "communication-archived-label";
      archivedLabel.textContent = "Archived";
      heading.append(archivedLabel);
    }

    const date = document.createElement("time");
    date.dateTime = inquiry.submittedAt;
    const submittedAt = new Date(inquiry.submittedAt);
    date.textContent = Number.isNaN(submittedAt.getTime())
      ? inquiry.submittedAt
      : submittedAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

    const sender = document.createElement("p");
    sender.className = "communication-sender";
    sender.textContent = `${inquiry.name} · ${inquiry.email}`;

    const message = document.createElement("p");
    message.className = "communication-detail-message";
    message.textContent = inquiry.details;

    detail.append(heading, date, sender, message);

    if (inquiry.archived || typeof inquiry.reply === "string") {
      const savedReply = document.createElement("section");
      savedReply.className = "communication-saved-reply";
      const replyHeading = document.createElement("h4");
      replyHeading.textContent = "Your reply";
      const replyMessage = document.createElement("p");
      replyMessage.textContent = inquiry.reply || "No reply text was saved.";
      savedReply.append(replyHeading, replyMessage);
      detail.append(savedReply);
    } else {
      const form = document.createElement("form");
      form.className = "communication-reply-form";
      const label = document.createElement("label");
      label.htmlFor = "communicationReplyMessage";
      label.textContent = `Reply to ${inquiry.email}`;
      const replyInput = document.createElement("textarea");
      replyInput.id = "communicationReplyMessage";
      replyInput.name = "reply";
      replyInput.rows = 5;
      replyInput.required = true;
      replyInput.maxLength = 5000;
      replyInput.placeholder = "Write your reply...";
      const submit = document.createElement("button");
      submit.className = "communication-reply";
      submit.type = "submit";
      submit.textContent = "Save Reply & Archive";
      form.append(label, replyInput, submit);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (inquiry.archived || typeof inquiry.reply === "string") {
          renderInbox();
          return;
        }

        const replyText = replyInput.value.trim();
        if (!replyText) {
          replyInput.setCustomValidity("Enter a reply before archiving this message.");
          replyInput.reportValidity();
          replyInput.addEventListener("input", () => replyInput.setCustomValidity(""), { once: true });
          return;
        }

        const updatedInquiries = inquiries.map((item) => item.id === inquiry.id
          ? { ...item, reply: replyText, repliedAt: new Date().toISOString(), archived: true }
          : item);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(updatedInquiries));
        } catch (error) {
          console.error("Could not save reply and archive storefront inquiry:", error);
          status.textContent = "Could not save the reply. Please try again.";
          return;
        }

        inquiries = updatedInquiries;
        activeFolder = "archived";
        selectedInquiryId = inquiry.id;
        renderInbox();
        status.textContent = "Reply recorded and message archived.";
      });
      detail.append(form);
    }
  }

  function renderInbox() {
    const result = readInquiries();
    inquiries = result.items;
    list.replaceChildren();
    inboxTab.setAttribute("aria-pressed", String(activeFolder === "inbox"));
    archivedTab.setAttribute("aria-pressed", String(activeFolder === "archived"));
    const visibleInquiries = inquiries.filter((inquiry) =>
      activeFolder === "archived" ? inquiry.archived === true : inquiry.archived !== true
    );
    status.textContent = result.error || `${visibleInquiries.length} ${activeFolder === "archived" ? "archived " : ""}storefront message${visibleInquiries.length === 1 ? "" : "s"}`;

    if (!visibleInquiries.length) {
      const empty = document.createElement("p");
      empty.className = "communication-empty-list";
      empty.textContent = result.error
        ? "Messages cannot be displayed."
        : activeFolder === "archived" ? "No archived messages yet." : "No storefront messages yet.";
      list.append(empty);
      showEmptyDetail(result.error
        ? "Message details are unavailable."
        : activeFolder === "archived" ? "No archived conversations yet." : "No storefront messages yet.");
      return;
    }

    const sortedInquiries = visibleInquiries
      .slice()
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
    sortedInquiries.forEach((inquiry) => {
      const button = document.createElement("button");
      button.className = "communication-inquiry";
      button.type = "button";
      button.dataset.inquiryId = inquiry.id;
      button.setAttribute("aria-pressed", String(inquiry.id === selectedInquiryId));

      const name = document.createElement("strong");
      name.textContent = inquiry.name;
      const subject = document.createElement("span");
      subject.textContent = inquiry.subject;
      button.append(name, subject);
      button.addEventListener("click", () => {
        selectedInquiryId = inquiry.id;
        list.querySelectorAll(".communication-inquiry").forEach((item) => {
          item.setAttribute("aria-pressed", String(item.dataset.inquiryId === selectedInquiryId));
        });
        renderSelectedInquiry();
      });
      list.append(button);
    });

    if (!sortedInquiries.some((inquiry) => inquiry.id === selectedInquiryId)) {
      selectedInquiryId = sortedInquiries[0].id;
    }
    Array.from(list.querySelectorAll(".communication-inquiry"))
      .find((button) => button.dataset.inquiryId === selectedInquiryId)
      ?.setAttribute("aria-pressed", "true");
    renderSelectedInquiry();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) {
      renderInbox();
    }
  });

  inboxTab.addEventListener("click", () => {
    activeFolder = "inbox";
    selectedInquiryId = "";
    renderInbox();
  });
  archivedTab.addEventListener("click", () => {
    activeFolder = "archived";
    selectedInquiryId = "";
    renderInbox();
  });

  renderInbox();
})();
