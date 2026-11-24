"use strict";

(function initializeBranchCustomerRecords() {
  const search = document.getElementById("accountSearch");
  const body = document.getElementById("registeredAccountRows");
  const empty = document.getElementById("accountSearchEmpty");
  const total = document.getElementById("kpiTotal");
  const newCount = document.getElementById("kpiNew");
  let customers = [];

  function cell(value, className) {
    const node = document.createElement("td");
    node.textContent = value || "Not provided";
    if (className) node.className = className;
    return node;
  }

  function render() {
    const term = search.value.trim().toLowerCase();
    const filtered = customers.filter(customer => [customer.name, customer.email, customer.phone, customer.address, customer.registeredAt]
      .some(value => String(value || "").toLowerCase().includes(term)));
    body.querySelectorAll("[data-api-customer]").forEach(row => row.remove());
    filtered.forEach(customer => {
      const row = document.createElement("tr");
      row.dataset.apiCustomer = String(customer.id);
      const date = customer.registeredAt ? new Date(customer.registeredAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "Not provided";
      row.append(cell(customer.name, "strong"), cell(customer.email), cell(date), cell(customer.phone), cell(customer.address));
      body.insertBefore(row, empty);
    });
    empty.hidden = filtered.length > 0;
    total.textContent = String(customers.length);
    const now = new Date();
    newCount.textContent = String(customers.filter(customer => {
      const date = new Date(customer.registeredAt);
      return Number.isFinite(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length);
  }

  async function refreshCustomerRecords() {
    const response = await window.angelizApi.request("/admin/customers?registeredOnly=true&limit=500&offset=0");
    if (!Array.isArray(response.items)) throw new Error("Customer endpoint returned invalid data.");
    customers = response.items;
    render();
  }

  search.addEventListener("input", render);
  window.refreshCustomerRecords = refreshCustomerRecords;
  refreshCustomerRecords().catch(error => {
    console.error("Could not load branch customer GET data.", error);
    body.querySelectorAll("[data-api-customer]").forEach(row => row.remove());
    empty.hidden = false;
    empty.firstElementChild?.replaceChildren(document.createTextNode(error.message || "Customer data is unavailable."));
  });
})();
