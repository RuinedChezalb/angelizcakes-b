
/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function showToast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

const trustedDevices = [
  {id:'sample-desktop', name:'Desktop browser', detail:'Sample device record'},
  {id:'sample-mobile', name:'Mobile browser', detail:'Sample device record'}
];

function renderTrustedDevices(){
  const list = $('trustedDeviceList');
  list.innerHTML = trustedDevices.length ? trustedDevices.map(device => `
    <div class="device-row">
      <div>
        <div class="strong">${esc(device.name)}</div>
        <div class="muted">${esc(device.detail)}</div>
      </div>
      <button class="btn btn-outline btn-sm" type="button" data-remove-device="${esc(device.id)}">Delete</button>
    </div>`).join('') : '<p class="device-empty">No devices in this sample list.</p>';
}

function showDeviceManager(){
  openModal('Manage Devices', `
    <p class="device-note">Prototype only: these are sample entries. Device verification and automatic registration are not connected; changes reset when this page reloads.</p>
    <div class="device-list" id="trustedDeviceList"></div>
  `, null, 'Close');
  renderTrustedDevices();
}

/* ---------- settings ---------- */
$('manageDevices').addEventListener('click', showDeviceManager);

$('editSettings').addEventListener('click', () => {
  openModal('Edit System Settings', `
    <label class="field">Business name<input id="s-business" value="${esc($('set-business').textContent)}"></label>
    <label class="field">Currency<input id="s-currency" value="${esc($('set-currency').textContent)}"></label>
    <label class="field">Timezone<input id="s-timezone" value="${esc($('set-timezone').textContent)}"></label>
  `, () => {
    $('set-business').textContent = $('s-business').value.trim() || 'Angeliz Cakes';
    $('set-currency').textContent = $('s-currency').value.trim() || 'PHP (₱)';
    $('set-timezone').textContent = $('s-timezone').value.trim() || 'Asia/Manila';
    showToast('Settings saved');
  });
});

/* ---------- security ---------- */
$('manageSecurity').addEventListener('click', () => {
  openModal('Security & Access', `
    <label class="field">Two-Factor Authentication
      <select id="sec-f-twofa">
        <option>Required for Admins</option>
        <option>Required for All</option>
        <option>Optional</option>
      </select>
    </label>
    <label class="field">Password Policy<input id="sec-f-password" value="${esc($('sec-password').textContent)}"></label>
    <label class="field">Session Timeout
      <select id="sec-f-session">
        <option>15 min idle</option>
        <option>30 min idle</option>
        <option>60 min idle</option>
      </select>
    </label>
  `, () => {
    $('sec-twofa').textContent = $('sec-f-twofa').value;
    $('sec-password').textContent = $('sec-f-password').value.trim() || 'Min 8 chars';
    $('sec-session').textContent = $('sec-f-session').value;
    showToast('Security settings saved');
  });
});

/* ---------- modal engine ---------- */
let onSaveHandler = null;
function openModal(title, bodyHTML, onSave, saveLabel = 'Save changes'){
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHTML;
  $('modalSave').textContent = saveLabel;
  onSaveHandler = onSave;
  $('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  $('modal').classList.remove('open');
  document.body.style.overflow = '';
  onSaveHandler = null;
}
$('modalSave').addEventListener('click', () => {
  if (!onSaveHandler) return closeModal();
  if (onSaveHandler() !== false) closeModal();
});
$('modalCancel').addEventListener('click', closeModal);
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('modalBody').addEventListener('click', e => {
  const button = e.target.closest('button[data-remove-device]');
  if (!button) return;
  const index = trustedDevices.findIndex(device => device.id === button.dataset.removeDevice);
  if (index < 0) {
    showToast('Device entry was not found');
    return;
  }
  const [removedDevice] = trustedDevices.splice(index, 1);
  renderTrustedDevices();
  showToast(`${removedDevice.name} removed from the sample list`);
});

