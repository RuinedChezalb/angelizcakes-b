const accountSearch = document.getElementById('accountSearch');
const accountRows = [...document.querySelectorAll('#registeredAccountRows [data-account-row]')];
const accountSearchEmpty = document.getElementById('accountSearchEmpty');
const currentMonth = new Date();
const registeredThisMonth = accountRows.filter(row => {
  const registeredAt = new Date(row.cells[2].textContent.trim());
  return !Number.isNaN(registeredAt.getTime())
    && registeredAt.getFullYear() === currentMonth.getFullYear()
    && registeredAt.getMonth() === currentMonth.getMonth();
});

document.getElementById('customerTotalAccounts').textContent = String(accountRows.length);
document.getElementById('customerNewThisMonth').textContent = String(registeredThisMonth.length);

accountSearch.addEventListener('input', () => {
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
});
