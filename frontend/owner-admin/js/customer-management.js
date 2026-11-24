"use strict";

(function initializeOwnerCustomers() {
  const search = document.getElementById("accountSearch");
  const customerBody = document.getElementById("registeredAccountRows");
  const loginBody = document.getElementById("loginAttemptRows");
  const total = document.getElementById("customerTotalAccounts");
  const monthly = document.getElementById("customerNewThisMonth");
  let customers = [];

  function appendCell(row, value, className) {
    const cell = document.createElement("td");
    cell.textContent = value || "Not provided";
    if (className) cell.className = className;
    row.append(cell);
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    customerBody.querySelectorAll("[data-api-customer]").forEach(row => row.remove());
    const filtered = customers.filter(customer => [customer.name, customer.email, customer.phone, customer.address, customer.customerSince]
      .some(value => String(value || "").toLowerCase().includes(query)));
    filtered.forEach(customer => {
      const row = document.createElement("tr");
      row.dataset.apiCustomer = String(customer.id);
      const registered = customer.customerSince || customer.createdAt;
      const date = registered ? new Date(registered).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "Not provided";
      appendCell(row, customer.name, "strong");
      appendCell(row, customer.email);
      appendCell(row, date);
      appendCell(row, customer.phone);
      appendCell(row, customer.address);
      customerBody.append(row);
    });
    const now = new Date();
    total.textContent = String(customers.length);
    monthly.textContent = String(customers.filter(customer => {
      const date = new Date(customer.customerSince || customer.createdAt);
      return Number.isFinite(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length);
    customerBody.querySelector("#accountSearchEmpty")?.toggleAttribute("hidden", filtered.length > 0);
  }

  async function refreshCustomers() {
    const response = await window.angelizApi.request("/admin/customers?registeredOnly=true&limit=500&offset=0");
    if (!Array.isArray(response.items)) throw new Error("Customer endpoint returned invalid data.");
    customers = response.items;
    render();
  }

  search.addEventListener("input", render);
  window.refreshOwnerCustomers = refreshCustomers;
  refreshCustomers().catch(error => {
    console.error("Could not load registered customer GET data.", error);
    customerBody.querySelectorAll("[data-api-customer]").forEach(row => row.remove());
    const row = document.createElement("tr");
    row.dataset.apiCustomer = "unavailable";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = error.message || "Customer data is unavailable.";
    row.append(cell);
    customerBody.prepend(row);
    loginBody.replaceChildren();
    const loginRow = document.createElement("tr");
    const loginCell = document.createElement("td");
    loginCell.colSpan = 5;
    loginCell.textContent = "Login attempts are not exposed by the current API.";
    loginRow.append(loginCell);
    loginBody.append(loginRow);
  });
})();
