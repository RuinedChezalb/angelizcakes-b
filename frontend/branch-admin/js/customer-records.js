(function () {
  'use strict';

  const customers = [
    { name: 'Maria Santos', email: 'maria.santos@email.com', phone: '0917 234 5678', registered: -45 },
    { name: 'Paolo Garcia', email: 'paolo.garcia@email.com', phone: '0920 331 8842', registered: -1 },
    { name: 'Mark Aquino', email: 'mark.aquino@email.com', phone: '0915 447 6620', registered: -6 },
    { name: 'Daniel Cruz', email: 'daniel.cruz@email.com', phone: '0919 883 1207', registered: 0 },
    { name: 'Kevin Salazar', email: 'kevin.salazar@email.com', phone: '0918 990 2276', registered: -2 },
    { name: 'Trisha Gonzales', email: 'trisha.gonzales@email.com', phone: '0921 118 6640', registered: 0 },
    { name: 'Hannah Villareal', email: 'hannah.villareal@email.com', phone: '0915 774 3308', registered: -4 },
    { name: 'Miguel Santos', email: 'miguel.santos@email.com', phone: '0917 220 8854', registered: -3 }
  ];

  const accountSearch = document.getElementById('accountSearch');
  const accountRows = document.getElementById('registeredAccountRows');
  const emptyRow = document.getElementById('accountSearchEmpty');
  const currentDate = new Date();

  function registrationDate(offsetDays) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return date;
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  function isRegisteredThisMonth(date) {
    return date.getFullYear() === currentDate.getFullYear()
      && date.getMonth() === currentDate.getMonth();
  }

  function makeCell(text, className) {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  const rows = customers.map(customer => {
    const date = registrationDate(customer.registered);
    const row = document.createElement('tr');
    row.dataset.accountRow = '';
    row.append(
      makeCell(customer.name, 'strong'),
      makeCell(customer.email),
      makeCell(formatDate(date)),
      makeCell(customer.phone),
      makeCell('Not provided')
    );
    accountRows.insertBefore(row, emptyRow);
    return row;
  });

  document.getElementById('kpiTotal').textContent = String(customers.length);
  document.getElementById('kpiNew').textContent = String(
    customers.filter(customer => isRegisteredThisMonth(registrationDate(customer.registered))).length
  );

  accountSearch.addEventListener('input', () => {
    const query = accountSearch.value.trim().toLowerCase();
    let visibleRows = 0;

    rows.forEach(row => {
      const searchableText = [row.cells[1], row.cells[2], row.cells[3]]
        .map(cell => cell.textContent.toLowerCase())
        .join(' ');
      const matches = searchableText.includes(query);
      row.hidden = !matches;
      if (matches) visibleRows += 1;
    });

    emptyRow.hidden = visibleRows > 0;
  });
})();
