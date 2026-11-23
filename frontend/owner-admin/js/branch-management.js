
function openModal(id){document.getElementById(id).classList.add('show');}
function closeModal(id){document.getElementById(id).classList.remove('show');}

const branchList = document.getElementById('branchList');
const branchCount = document.getElementById('branchCount');
const branchStatusSummary = document.getElementById('branchStatusSummary');
const branchEmptyState = document.getElementById('branchEmptyState');
let branchSequence = 0;
let editingBranchId = null;
let nextBranchCodeNumber = Math.max(
  0,
  ...[...branchList.querySelectorAll('.branch-card')].map(card => {
    const match = /^BR-(\d+)$/.exec(card.dataset.branchCode || '');
    return match ? Number(match[1]) : 0;
  })
) + 1;

function nextBranchCode(){
  return `BR-${String(nextBranchCodeNumber).padStart(3, '0')}`;
}

function updateBranchListLayout(){
  const count = branchList.querySelectorAll('.branch-card').length;
  branchList.dataset.branchCount = String(count);
  branchList.classList.toggle('is-scrollable', count > 3);
  branchCount.textContent = String(count);
  const openCount = [...branchList.querySelectorAll('.branch-status')]
    .filter(status => status.textContent.replace(/^●\s*/, '') === 'Open').length;
  branchStatusSummary.textContent = count > 0 && openCount === count
    ? 'All branches open today'
    : openCount === 0
      ? 'No branches open today'
      : `${openCount} ${openCount === 1 ? 'branch' : 'branches'} open today`;
  branchEmptyState.hidden = count !== 0;
}

function branchStatusClass(status){
  if(status === 'Open') return 'badge-teal';
  if(status === 'Closed') return 'badge-gray';
  return 'badge-amber';
}

function appendBranchAction(actions, action, label, name){
  const button = document.createElement('button');
  button.className = 'btn btn-outline btn-sm';
  button.type = 'button';
  button.dataset.branchAction = action;
  button.setAttribute('aria-label', `${label} ${name}`);
  button.textContent = label;
  actions.appendChild(button);
}

function appendBranchStat(container, label, value){
  const item = document.createElement('div');
  const itemLabel = document.createElement('div');
  itemLabel.className = 'kpi-label';
  itemLabel.textContent = label;
  const itemValue = document.createElement('div');
  itemValue.className = 'strong';
  itemValue.style.fontSize = '16px';
  itemValue.textContent = value;
  item.append(itemLabel, itemValue);
  container.appendChild(item);
}

function createBranchCard(branch){
  const card = document.createElement('article');
  card.className = 'card branch-card';
  card.dataset.branchId = branch.id;
  card.dataset.branchCode = branch.code || '';
  card.dataset.branchPhone = branch.phone || '';
  card.dataset.branchEmail = branch.email || '';
  card.dataset.branchHours = branch.hours || '';
  card.dataset.branchDate = branch.date || '';

  const header = document.createElement('div');
  header.className = 'branch-card-header';
  const details = document.createElement('div');
  details.className = 'branch-main-details';
  const name = document.createElement('div');
  name.className = 'strong branch-name';
  name.textContent = branch.name;
  const code = document.createElement('div');
  code.className = 'branch-code';
  code.textContent = branch.code;
  const address = document.createElement('div');
  address.className = 'muted branch-address';
  address.textContent = branch.address;
  const extra = document.createElement('div');
  extra.className = 'branch-extra';
  extra.textContent = [branch.phone, branch.hours].filter(Boolean).join(' · ');
  extra.hidden = !extra.textContent;
  details.append(name, code, address, extra);

  const actions = document.createElement('div');
  actions.className = 'branch-card-actions';
  const status = document.createElement('span');
  status.className = `badge ${branchStatusClass(branch.status)} branch-status`;
  status.textContent = `● ${branch.status}`;
  actions.appendChild(status);
  appendBranchAction(actions, 'edit', 'Edit', branch.name);
  appendBranchAction(actions, 'remove', 'Remove', branch.name);
  header.append(details, actions);

  const divider = document.createElement('div');
  divider.className = 'divider';
  const stats = document.createElement('div');
  stats.className = 'branch-card-stats';
  appendBranchStat(stats, 'Sales', branch.sales || '₱0');
  appendBranchStat(stats, 'Orders', branch.orders || '0');
  appendBranchStat(stats, 'Manager', branch.manager || '—');
  card.append(header, divider, stats);
  return card;
}

function findBranchCard(id){
  return [...branchList.querySelectorAll('.branch-card')].find(card => card.dataset.branchId === id);
}

function openBranchEdit(id){
  const card = findBranchCard(id);
  if(!card) throw new RangeError(`Unknown branch ID: ${id}`);
  editingBranchId = id;
  document.getElementById('editBranchTitle').textContent = `Edit ${card.querySelector('.branch-name').textContent}`;
  document.getElementById('editBranchName').value = card.querySelector('.branch-name').textContent;
  document.getElementById('editBranchCode').value = card.dataset.branchCode || '';
  document.getElementById('editBranchAddress').value = card.querySelector('.branch-address').textContent;
  document.getElementById('editBranchPhone').value = card.dataset.branchPhone || '';
  document.getElementById('editBranchEmail').value = card.dataset.branchEmail || '';
  document.getElementById('editBranchHours').value = card.dataset.branchHours || '';
  document.getElementById('editBranchDate').value = card.dataset.branchDate || '';
  document.getElementById('editBranchStatus').value =
    card.querySelector('.branch-status').textContent.replace(/^●\s*/, '');
  openModal('editBranchModal');
}

function saveBranchEdits(){
  const card = findBranchCard(editingBranchId);
  if(!card) throw new RangeError(`Unknown branch ID: ${editingBranchId}`);

  const name = document.getElementById('editBranchName').value.trim();
  const address = document.getElementById('editBranchAddress').value.trim();
  const email = document.getElementById('editBranchEmail');
  if(!name || !address){
    alert('Please enter a branch name and full address.');
    return;
  }
  if(!email.checkValidity()){
    alert('Please enter a valid branch email address.');
    return;
  }

  card.querySelector('.branch-name').textContent = name;
  card.querySelector('.branch-address').textContent = address;
  card.dataset.branchPhone = document.getElementById('editBranchPhone').value.trim();
  card.dataset.branchEmail = email.value.trim();
  card.dataset.branchHours = document.getElementById('editBranchHours').value.trim();
  card.dataset.branchDate = document.getElementById('editBranchDate').value;

  const extra = card.querySelector('.branch-extra') || document.createElement('div');
  extra.className = 'branch-extra';
  extra.textContent = [card.dataset.branchPhone, card.dataset.branchHours].filter(Boolean).join(' · ');
  extra.hidden = !extra.textContent;
  if(!extra.parentElement) card.querySelector('.branch-main-details').appendChild(extra);

  const status = document.getElementById('editBranchStatus').value;
  const badge = card.querySelector('.branch-status');
  badge.className = `badge ${branchStatusClass(status)} branch-status`;
  badge.textContent = `● ${status}`;
  card.querySelector('[data-branch-action="edit"]').setAttribute('aria-label', `Edit ${name}`);
  card.querySelector('[data-branch-action="remove"]').setAttribute('aria-label', `Remove ${name}`);
  updateBranchListLayout();
  closeModal('editBranchModal');
  editingBranchId = null;
}

function removeBranch(card){
  const name = card.querySelector('.branch-name').textContent;
  if(!confirm(`Remove ${name} from the branch list?`)) return;
  if(editingBranchId === card.dataset.branchId){
    closeModal('editBranchModal');
    editingBranchId = null;
  }
  card.remove();
  updateBranchListLayout();
}

branchList.addEventListener('click', event => {
  if(!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-branch-action]');
  const card = button?.closest('.branch-card');
  if(!button || !card) return;
  if(button.dataset.branchAction === 'edit') openBranchEdit(card.dataset.branchId);
  if(button.dataset.branchAction === 'remove') removeBranch(card);
});
updateBranchListLayout();

function openBranchModal(){
  ['branchName','branchAddress','branchPhone','branchEmail','branchHours','branchDate'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('branchCode').value = nextBranchCode();
  document.getElementById('branchStatus').value='Open';
  openModal('branchModal');
}
function saveBranch(){
  const name=document.getElementById('branchName').value.trim();
  const addr=document.getElementById('branchAddress').value.trim();
  const phone=document.getElementById('branchPhone').value.trim();
  const hrs=document.getElementById('branchHours').value.trim();
  const date=document.getElementById('branchDate').value;
  
  if(!name||!addr||!phone||!hrs||!date){
    alert('Please fill in all required fields.');return;
  }
  const code = nextBranchCode();
  document.getElementById('branchCode').value = code;
  const branch = {
    id:`branch-${Date.now()}-${++branchSequence}`,
    name,
    code,
    address:addr,
    phone,
    email:document.getElementById('branchEmail').value.trim(),
    hours:hrs,
    date,
    status:document.getElementById('branchStatus').value
  };
  nextBranchCodeNumber += 1;
  branchList.insertBefore(createBranchCard(branch), branchEmptyState);
  updateBranchListLayout();
  closeModal('branchModal');
  alert('Branch added successfully!');
}

function openAdminModal(){
  ['adminFName','adminLName','adminEmail','adminPhone','adminPassword','adminConfirmPassword'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('adminRole').value='Branch Manager';
  document.getElementById('adminStatus').value='Active';
  openModal('adminModal');
}

function editAdmin(name,branch,email){
  const parts = name.split(' ');
  document.getElementById('adminFName').value = parts[0] || '';
  document.getElementById('adminLName').value = parts.slice(1).join(' ') || '';
  document.getElementById('adminEmail').value = email;
  document.getElementById('adminBranch').value = branch.includes('Main') ? 'Angeliz Cakes Main Branch' : 'Yashano Mall Branch';
  openModal('adminModal');
}

function saveAdmin(){
  const fname=document.getElementById('adminFName').value.trim();
  const lname=document.getElementById('adminLName').value.trim();
  const email=document.getElementById('adminEmail').value.trim();
  const phone=document.getElementById('adminPhone').value.trim();
  const pass=document.getElementById('adminPassword').value;
  const confirmPass=document.getElementById('adminConfirmPassword').value;
  
  if(!fname||!lname||!email||!phone||!pass){
    alert('Please fill in all required fields.'); return;
  }
  if(pass.length < 8){
    alert('Password must be at least 8 characters.'); return;
  }
  if(pass !== confirmPass){
    alert('Passwords do not match.'); return;
  }

  const name = `${fname} ${lname}`;
  const initials = (fname[0] + lname[0]).toUpperCase();
  const role = document.getElementById('adminRole').value;
  const branch = document.getElementById('adminBranch').value;
  const status = document.getElementById('adminStatus').value;
  const badgeClass = status === 'Active' ? 'badge-teal' : 'badge-gray';

  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="flex items-center gap-8"><div class="avatar">${initials}</div><span class="strong">${name}</span></td>
    <td>${branch}</td>
    <td>${role}</td>
    <td><span class="badge ${badgeClass}">${status}</span></td>
    <td><button class="btn btn-outline btn-sm" onclick="editAdmin('${name}','${branch}','${email}')">Edit</button></td>
  `;
  document.getElementById('managerRows').appendChild(row);
  closeModal('adminModal');
  alert('Admin account created successfully!');
}

// Comprehensive Report View Logic
function openReportView(branch, date) {
  document.getElementById('reportViewTitle').textContent = `Operation Summary: ${branch} (${date})`;
  
  const contentDiv = document.getElementById('reportViewContent');
  
  let branchSales = branch.includes('Yashano') ? '₱8,200' : '₱12,450';
  let branchTxns = branch.includes('Yashano') ? '56' : '84';
  let branchStaff = branch.includes('Yashano') ? '3' : '5';
  let branchNotes = branch.includes('Yashano') ? 'Oven 2 maintenance needed' : 'None';

  let deliveriesHTML = '';
  
  if (branch.includes('Yashano')) {
    deliveriesHTML = `
      <table class="table">
        <thead><tr><th>Time</th><th>Item / Product</th><th>Qty</th><th>Source</th><th>Fulfillment Log</th></tr></thead>
        <tbody>
          <tr><td>09:00 AM</td><td>Strawberry Shortcake (Whole)</td><td>3</td><td>Main Branch</td><td><span class="badge badge-teal">Received & Stored</span></td></tr>
          <tr><td>09:00 AM</td><td>Chocolate Mousse Slice</td><td>12</td><td>Main Branch</td><td><span class="badge badge-teal">Received & Stored</span></td></tr>
          <tr><td>02:00 PM</td><td>Sakura Tiramisu</td><td>6</td><td>Main Branch</td><td><span class="badge badge-teal">Received & Stored</span></td></tr>
        </tbody>
      </table>`;
  } else {
    deliveriesHTML = `
      <table class="table">
        <thead><tr><th>Time</th><th>Product Dispatched</th><th>Qty</th><th>Destination</th><th>Dispatch Log</th></tr></thead>
        <tbody>
          <tr><td>08:30 AM</td><td>Assorted Pastries Box</td><td>15</td><td>Yashano Booth</td><td><span class="badge badge-teal">Dispatched & Received</span></td></tr>
          <tr><td>01:00 PM</td><td>Strawberry Shortcake (Whole)</td><td>5</td><td>Yashano Booth</td><td><span class="badge badge-teal">Dispatched & Received</span></td></tr>
        </tbody>
      </table>`;
  }

  contentDiv.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--sakura-100);">
      <div>
        <div class="kpi-label">Branch</div>
        <div class="strong">${branch}</div>
      </div>
      <div>
        <div class="kpi-label">Date</div>
        <div class="strong">${date}</div>
      </div>
      <div>
        <div class="kpi-label">Reported By</div>
        <div class="strong">Branch Admin</div>
      </div>
    </div>

    <div class="report-block">
      <div class="report-block-title">1. Daily Operations & Sales</div>
      <div class="metric-row"><span class="metric-label">Total Sales Recorded</span><span class="metric-value">${branchSales}</span></div>
      <div class="metric-row"><span class="metric-label">Walk-in & Payment Transactions</span><span class="metric-value">${branchTxns} transactions</span></div>
      <div class="metric-row"><span class="metric-label">Staff on Duty</span><span class="metric-value">${branchStaff}</span></div>
      <div class="metric-row"><span class="metric-label">Issues / Notes</span><span class="metric-value" style="color:#B91C1C;">${branchNotes}</span></div>
    </div>

    <div class="report-block">
      <div class="report-block-title">2. Delivery Logs (Ready-Made Products)</div>
      ${deliveriesHTML}
    </div>
  `;
  
  openModal('reportViewModal');
}

/* Stock requests sent from Branch Inventory; the owner's decision is saved back for the branch to see. */
(() => {
  const requestRows = document.getElementById('stockRequestRows');
  if (!requestRows) throw new TypeError('The branch stock request table is missing.');
  const requestStatuses = ['Submitted', 'Approved', 'Declined', 'Delivered'];

  function createCell(text, className) {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function renderStockRequests() {
    const requests = window.AngelizDB.stockRequests.list().slice().reverse();
    if (!requests.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = createCell('No stock requests from branches yet.', 'muted');
      emptyCell.colSpan = 7;
      emptyRow.append(emptyCell);
      requestRows.replaceChildren(emptyRow);
      return;
    }

    requestRows.replaceChildren(...requests.map(request => {
      const row = document.createElement('tr');
      const statusCell = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'form-select';
      select.setAttribute('aria-label', `Status for stock request ${request.ref}`);
      requestStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        select.append(option);
      });
      select.value = request.status;
      select.addEventListener('change', () => {
        window.AngelizDB.stockRequests.update(request.ref, { status: select.value });
      });
      statusCell.append(select);
      row.append(
        createCell(request.ref, 'strong'),
        createCell(request.branch),
        createCell(request.productName),
        createCell(String(request.qty)),
        createCell(window.AngelizDB.format.shortDate(request.date)),
        createCell(request.urgency),
        statusCell
      );
      return row;
    }));
  }

  window.AngelizDB.onChange(window.AngelizDB.keys.stockRequests, renderStockRequests);
  renderStockRequests();
})();
