/*
 * Thành phần giao diện dùng chung. Bootstrap chỉ cung cấp CSS; mọi hành vi (modal, offcanvas, dropdown, toast)
 * được viết bằng JavaScript thuần ở đây:
 *   [data-open="id"]   mở modal / offcanvas        [data-close]   đóng lớp phủ gần nhất
 *   [data-dropdown]    bật/tắt menu thả xuống       Esc, bấm nền mờ, Tab (giữ tiêu điểm trong hộp thoại)
 * Khung trang (navbar, sidebar, modal tĩnh) nằm sẵn trong từng tệp HTML.
 */
'use strict';

/* ---------- Lớp phủ: modal + offcanvas ---------- */
const layers = [];   // ngăn xếp các lớp đang mở: {el, backdrop, opener}
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const isVisible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
const layerEl = ref => typeof ref === 'string' ? document.getElementById(ref) : ref;

function openLayer(ref) {
  const el = layerEl(ref);
  if (!el || el.classList.contains('show')) return;
  const modal = el.classList.contains('modal');
  el.dispatchEvent(new CustomEvent('layer-show'));
  const backdrop = document.createElement('div');
  backdrop.className = (modal ? 'modal-backdrop' : 'offcanvas-backdrop') + ' fade';
  document.body.appendChild(backdrop);
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.removeAttribute('aria-hidden');
  if (modal) el.style.display = 'block';
  document.body.style.overflow = 'hidden';
  void el.offsetWidth;                       // ép trình duyệt tính lại bố cục để hiệu ứng chuyển động chạy
  el.classList.add('show'); backdrop.classList.add('show');
  layers.push({el, backdrop, opener: document.activeElement});
  const first = [...el.querySelectorAll('.modal-body ' + FOCUSABLE.split(',').join(',.modal-body '))].find(isVisible);
  if (!first) el.setAttribute('tabindex', '-1');
  (first || el).focus({preventScroll: true});
  el.dispatchEvent(new CustomEvent('layer-shown'));
}
function closeLayer(ref) {
  const el = layerEl(ref);
  const i = layers.findIndex(l => l.el === el);
  if (i < 0) return;
  const [l] = layers.splice(i, 1);
  el.classList.remove('show'); l.backdrop.remove();
  el.setAttribute('aria-hidden', 'true'); el.removeAttribute('aria-modal');
  if (el.classList.contains('modal')) el.style.display = 'none';
  if (!layers.length) document.body.style.overflow = '';
  if (l.opener && l.opener.focus && document.contains(l.opener)) l.opener.focus({preventScroll: true});
  el.dispatchEvent(new CustomEvent('layer-hidden'));
}
const showModal = openLayer;
const closeDlg = () => layers.filter(l => l.el.classList.contains('modal')).forEach(l => closeLayer(l.el));

/* ---------- Menu thả xuống ---------- */
function closeDropdowns(except) {
  document.querySelectorAll('.dropdown-menu.show').forEach(m => {
    if (m === except) return;
    m.classList.remove('show');
    const b = m.parentElement.querySelector('[data-dropdown]');
    if (b) { b.classList.remove('show'); b.setAttribute('aria-expanded', 'false'); }
  });
}
function toggleDropdown(btn) {
  const menu = btn.parentElement.querySelector('.dropdown-menu');
  if (!menu) return;
  const open = !menu.classList.contains('show');
  closeDropdowns();
  menu.classList.toggle('show', open); btn.classList.toggle('show', open); btn.setAttribute('aria-expanded', String(open));
}

/* ---------- Sự kiện chung của lớp phủ và menu ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const dd = t.closest('[data-dropdown]');
  if (dd) { toggleDropdown(dd); return; }
  closeDropdowns();
  const opener = t.closest('[data-open]');
  if (opener) { e.preventDefault(); openLayer(opener.dataset.open); return; }
  const closer = t.closest('[data-close]');
  if (closer) { const l = closer.closest('.modal,.offcanvas'); if (l) closeLayer(l); return; }
  const toastClose = t.closest('[data-close-toast]');
  if (toastClose) { toastClose.closest('.toast').remove(); return; }
  if (t.classList.contains('modal') && t.classList.contains('show')) { closeLayer(t); return; }   // bấm vùng ngoài hộp thoại
  const bd = layers.find(l => l.backdrop === t);                                                   // bấm nền mờ của offcanvas
  if (bd) closeLayer(bd.el);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const top = layers[layers.length - 1];
    if (top) { closeLayer(top.el); return; }
    closeDropdowns();
    return;
  }
  if (e.key !== 'Tab') return;
  const top = layers[layers.length - 1];
  if (!top) return;
  const items = [...top.el.querySelectorAll(FOCUSABLE)].filter(isVisible);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1], active = document.activeElement;
  if (e.shiftKey && (active === first || active === top.el)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Hộp thoại xác nhận và hộp thoại nhập văn bản dùng chung ---------- */
let confirmCb = null;
function confirmBox(title, text, ok, cb, danger = true) {
  confirmCb = cb;
  setText('#cfTitle', title); setHtml('#cfBody', text);
  const b = $('#cfOk'); b.textContent = ok; b.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  openLayer('confirmModal');
}
/* opts: {min: số ký tự tối thiểu, withTitle: hiện ô tiêu đề, titleValue, nid} */
function textDialog(kind, title, label, id, value, opts = {}) {
  const f = $('#textForm'); resetValidation(f);
  f.dataset.form = kind; f.dataset.id = id || '';
  setText('#txTitle', title); setText('#txLabel', label);
  f.elements.text.minLength = opts.min || 3;
  f.elements.text.value = value || '';
  f.elements.nid.value = opts.nid || '';
  f.elements.title.disabled = !opts.withTitle;       // ô ẩn phải bị vô hiệu hóa để không chặn việc gửi biểu mẫu
  f.elements.title.value = opts.titleValue || '';
  showEl('#txTitleRow', !!opts.withTitle);
  openLayer('textModal');
}

/* ---------- Toast ---------- */
function toast(msg, bad) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast show align-items-center border-0 text-bg-' + (bad ? 'danger' : 'dark');
  el.setAttribute('role', bad ? 'alert' : 'status'); el.setAttribute('aria-atomic', 'true');
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-close-toast aria-label="Đóng"></button></div>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

/* ---------- Chế độ sáng/tối: Bootstrap đọc thuộc tính data-bs-theme bằng CSS ---------- */
function applyTheme() {
  const t = S.ui.theme;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
}

/* ---------- Thành phần dựng bằng JS ---------- */
const empty = (title, text, action = '') => `<div class="text-center border rounded-3 bg-body p-4 p-md-5"><h3 class="h5">${title}</h3><p class="text-body-secondary mx-auto" style="max-width:44ch">${text}</p>${action}</div>`;
const barRow = (label, pct, n, cls = '') => `<div class="d-flex align-items-center gap-2 mb-2"><span class="small text-truncate" style="width:150px">${label}</span><div class="progress flex-grow-1" style="height:12px" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${cls}" style="width:${pct}%"></div></div><strong class="small text-end" style="width:30px">${n}</strong></div>`;

/* ---------- Thông báo (offcanvas) ---------- */
function refreshBell() {
  const n = myNotifs().filter(x => !x.read).length;
  const b = $('#bellCount'); if (!b) return;
  b.textContent = n; b.classList.toggle('d-none', !n);
}
function fillNotifs() {
  const l = myNotifs();
  setHtml('#notifBody', l.length
    ? `<div class="list-group list-group-flush">${l.map(n => `<div class="list-group-item ${n.read ? '' : 'border-start border-danger border-4'}"><div class="fw-semibold">${esc(n.text)}</div><div class="small text-body-secondary">${ago(n.t)}</div></div>`).join('')}</div>`
    : `<div class="p-3">${empty('Chưa có thông báo', 'Thông báo về yêu cầu sẽ xuất hiện ở đây.')}</div>`);
  showEl('#markReadBtn', l.some(n => !n.read));
}

/* Gắn sự kiện cho các thành phần khung có sẵn trong HTML */
function wireChrome() {
  const nc = $('#notifCanvas'); if (nc) nc.addEventListener('layer-show', fillNotifs);
  const sm = $('#settingsModal');
  if (sm) sm.addEventListener('layer-show', () => { $('#theme').value = S.ui.theme; $('#simError').checked = S.ui.simError; $('#aiFail').checked = S.ui.aiFail; });
  if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyTheme); }
}
