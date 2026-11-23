const accountSearch = document.getElementById('accountSearch');
const accountBody = document.getElementById('registeredAccountRows');
const accountSearchEmpty = document.getElementById('accountSearchEmpty');
const loginAttemptBody = document.getElementById('loginAttemptRows');
const seededAccountRows = [...accountBody.querySelectorAll('[data-account-row]')];
const currentMonth = new Date();
let accountRows = [...seededAccountRows];

function makeCell(text, className) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function formatAccountDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatAttemptTime(date) {
  const day = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function applyAccountSearch() {
  const query = accountSearch.value.trim().toLowerCase();
  let visibleRows = 0;

  accountRows.forEach(row => {
    const searchableText = [row.cells[1], row.cells[2], row.cells[3]]
      .map(cell => cell.textContent.toLowerCase())
      .join(' ');
    const matches = searchableText.includes(query);
    row.hidden = !matches;
    if (matches) visibleRows += 1;
  });

  accountSearchEmpty.hidden = visibleRows > 0;
}

/* Accounts created by the storefront appear above the sample accounts. */
function renderRegisteredAccounts() {
  accountBody.querySelectorAll('[data-stored-account]').forEach(row => row.remove());
  const storedRows = window.AngelizDB.customers.list().slice().reverse().map(customer => {
    const row = document.createElement('tr');
    row.dataset.accountRow = '';
    row.dataset.storedAccount = customer.email;
    row.append(
      makeCell(customer.name, 'strong'),
      makeCell(customer.email),
      makeCell(formatAccountDate(new Date(customer.registeredAt))),
      makeCell(customer.phone || 'Not provided'),
      makeCell(customer.address || 'Not provided')
    );
    return row;
  });
  accountBody.prepend(...storedRows);
  accountRows = [...storedRows, ...seededAccountRows];

  const registeredThisMonth = accountRows.filter(row => {
    const registeredAt = new Date(row.cells[2].textContent.trim());
    return !Number.isNaN(registeredAt.getTime())
      && registeredAt.getFullYear() === currentMonth.getFullYear()
      && registeredAt.getMonth() === currentMonth.getMonth();
  });

  document.getElementById('customerTotalAccounts').textContent = String(accountRows.length);
  document.getElementById('customerNewThisMonth').textContent = String(registeredThisMonth.length);
  applyAccountSearch();
}

function renderLoginAttempts() {
  loginAttemptBody.querySelectorAll('[data-stored-attempt]').forEach(row => row.remove());
  const attemptRows = window.AngelizDB.customers.loginAttempts().map(attempt => {
    const row = document.createElement('tr');
    row.dataset.storedAttempt = '';
    const result = document.createElement('td');
    const badge = document.createElement('span');
    const succeeded = attempt.result === 'Successful';
    badge.className = `badge ${succeeded ? 'badge-success' : 'badge-failed'}`;
    badge.textContent = attempt.result;
    result.append(badge);
    row.append(
      makeCell(attempt.name, 'strong'),
      makeCell(attempt.email),
      makeCell(formatAttemptTime(new Date(attempt.at))),
      makeCell(attempt.device),
      result
    );
    return row;
  });
  loginAttemptBody.prepend(...attemptRows);
}

accountSearch.addEventListener('input', applyAccountSearch);
window.AngelizDB.onChange(window.AngelizDB.keys.customers, renderRegisteredAccounts);
window.AngelizDB.onChange(window.AngelizDB.keys.loginAttempts, renderLoginAttempts);
renderRegisteredAccounts();
renderLoginAttempts();
