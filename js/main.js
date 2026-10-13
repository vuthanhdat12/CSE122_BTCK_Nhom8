/*
 * Lõi ứng dụng: đăng nhập theo mã người dùng, bảo vệ trang theo vai trò, khởi động trang,
 * bộ xử lý sự kiện chung (click, input, submit).
 * Khung HTML của mỗi trang nằm trong tệp .html; JS chỉ điền dữ liệu vào các vùng có sẵn.
 * Các module vai trò (guest.js, staff.js, manager.js, admin.js) đăng ký hàm khởi tạo trang vào PAGES
 * và bổ sung xử lý vào A (hành động click), I (nhập liệu), F (gửi biểu mẫu).
 */
'use strict';

/* Thông số trang: khai báo bằng data-page trên <body> của từng tệp HTML */
const PAGE = document.body.dataset.page;
const BASE = PAGE === 'login' ? 'pages/' : '';
const TO_INDEX = PAGE === 'login' ? 'index.html' : '../index.html';

let V = {};             // trạng thái tạm của trang hiện tại (bộ lọc, kết quả AI...)
let cur = {params:new URLSearchParams(location.search)};
let tok = 0;
const PAGES = {};       // PAGES['tên-trang'] = hàm điền dữ liệu của trang

/* Chuyển trang thật (nhiều tệp HTML). flashMsg hiển thị dạng toast ở trang đích. */
function go(name, qs = '', flashMsg = '') {
  if (flashMsg) { S.ui.flash = flashMsg; save(); }
  location.href = BASE + name + '.html' + (qs ? '?' + qs : '');
}
function showFlash() { if (S.ui.flash) { const m = S.ui.flash; S.ui.flash = ''; save(); toast(m); } }

/* ---------- Khung trang: thông tin người dùng đã đăng nhập ---------- */
function whoLine(u) {
  if (u.role === 'guest') { const s = stayOf(u.stayId); return `Phòng ${s.room} · ${s.roomType}`; }
  if (u.role === 'staff') { const s = staffOf(u.staffId); return `${s.dept} · ${SHIFTS[s.shift]}`; }
  return u.role === 'manager' ? 'Quản lý ca' : 'Quản trị hệ thống';
}
function fillChrome(u) {
  setText('#userName', u.name);
  setText('#userMeta', `${ROLE_NAME[u.role]} · Mã ${u.id}`);
  setText('#whoLine', whoLine(u));
  refreshBell();
}

/* ---------- Hiển thị trang: đang tải → lỗi / nội dung ---------- */
function run() {
  V = {};
  showEl('#stError', false); showEl('#content', false); showEl('#stLoading', true);
  const t = ++tok;
  setTimeout(() => {
    if (t !== tok) return;
    showEl('#stLoading', false);
    if (S.ui.simError) { showEl('#stError', true); return; }
    showEl('#content', true);
    const init = PAGES[PAGE]; if (init) init(cur.params);
    $('#main').focus({preventScroll:true}); showFlash();
  }, 320);
}
function rerender() { const init = PAGES[PAGE]; if (init) init(cur.params); }

/* ---------- Trang đăng nhập (index.html) ---------- */
function initLogin() {
  const u = currentUser();
  if (u) { location.replace('pages/' + HOME[u.role] + '.html'); return; }
  if (S.ui.userId) syncSession(null);
  const AI_OF = {guest:'AI-1', manager:'AI-2, AI-3'};     // vai trò nào dùng được tính năng AI nào
  setHtml('#demoAccounts', Object.keys(ROLE_NAME).map(role => {
    const btns = S.users.filter(x => x.role === role).map(x => `<button type="button" class="btn btn-sm ${x.active ? 'btn-outline-primary' : 'btn-outline-secondary'}" data-act="fill-id" data-id="${esc(x.id)}" title="${esc(x.name)}${x.active ? '' : ' (đã vô hiệu hóa)'}">${esc(x.id)}</button>`).join('');
    const ai = AI_OF[role] ? ` <span class="badge text-bg-warning">${AI_OF[role]}</span>` : '';
    return `<div class="d-flex flex-wrap align-items-center gap-1 mb-2"><span class="small text-body-secondary me-1" style="width:10rem">${ROLE_NAME[role]}${ai}</span>${btns}</div>`;
  }).join(''));
  showEl('#needLogin', cur.params.get('need') === 'login');
  showFlash();
}

/* ---------- Hành động click chung (data-act) ---------- */
const A = {};
A.retry = () => run();
A.home = () => { const u = currentUser(); if (u) go(HOME[u.role]); else location.href = TO_INDEX; };
A.logout = () => { logout(); S.ui.flash = 'Bạn đã đăng xuất.'; save(); location.href = TO_INDEX; };
A['fill-id'] = el => { const i = $('#uid'), f = $('#loginForm'); resetValidation(f); i.value = el.dataset.id; i.focus(); };
A['mark-read'] = () => { myNotifs().forEach(n => { n.read = true; }); save(); fillNotifs(); refreshBell(); };
A['confirm-ok'] = () => { const cb = confirmCb; confirmCb = null; closeDlg(); if (cb) cb(); };
A['reset-data'] = () => {
  closeLayer('settingsModal');          // chỉ hiển thị một hộp thoại tại một thời điểm
  confirmBox('Đặt lại dữ liệu mẫu?', 'Mọi thay đổi bạn đã thực hiện sẽ bị xóa, dữ liệu quay về ban đầu và bạn cần đăng nhập lại.', 'Đặt lại', () => {
    const theme = S.ui.theme; S = seed(); S.ui.theme = theme; S.ui.flash = 'Đã đặt lại dữ liệu mẫu. Hãy đăng nhập lại.'; save(); location.href = TO_INDEX;
  });
};
A.filter = el => {
  V.f = el.dataset.f;
  $$('[data-f]', el.closest('.btn-group')).forEach(b => { const on = b === el; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  if (V.refresh) V.refresh();
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && A[el.dataset.act]) A[el.dataset.act](el, e);
});

/* ---------- Nhập liệu chung (data-in) ---------- */
const I = {};
I.q = el => { V.q = el.value; if (V.refresh) V.refresh(); };
I.theme = el => { S.ui.theme = el.value; save(); applyTheme(); };
I.simError = el => { S.ui.simError = el.checked; save(); };
I.aiFail = el => { S.ui.aiFail = el.checked; save(); };
const onInput = e => { const el = e.target.closest('[data-in]'); if (el && I[el.dataset.in]) I[el.dataset.in](el, e); };
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);

/* ---------- Biểu mẫu chung (data-form) ---------- */
const F = {};
F.login = f => {
  /* Mã đã được kiểm tra (định dạng, tồn tại, còn hoạt động) bởi validateForm → VRULES.loginId */
  const r = login(f.elements.uid.value);
  if (!r.ok) { showError(f, 'uid', r.msg); return; }
  go(HOME[r.user.role], '', 'Xin chào, ' + r.user.name);
};
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  if (f.classList.contains('needs-validation') && !validateForm(f)) return;   // dừng nếu còn ô không hợp lệ
  const h = F[f.dataset.form]; if (h) h(f);
});

/* Cập nhật bộ đếm SLA mà không dựng lại trang */
setInterval(() => {
  $$('.sla[data-rid]').forEach(el => {
    const r = reqOf(el.dataset.rid); if (!r) return;
    el.className = slaClass(slaState(r)); el.textContent = slaText(r);
  });
}, 30000);

/* ---------- Khởi động sau khi mọi tệp JS của trang đã nạp ---------- */
document.addEventListener('DOMContentLoaded', () => {
  load(); applyTheme(); wireChrome();
  if (PAGE === 'login') { initLogin(); return; }
  if (PAGE === '403' || PAGE === '404') return;

  /* Bảo vệ trang: chưa đăng nhập → về trang đăng nhập; sai vai trò → báo 403 */
  const user = currentUser();
  if (!user) { if (S.ui.userId) syncSession(null); location.replace(TO_INDEX + '?need=login'); return; }
  fillChrome(user);
  const need = document.body.dataset.role;
  if (user.role !== need) {
    showEl('#stLoading', false); showEl('#stDenied', true);
    setText('#deniedText', `Màn hình này dành cho vai trò "${ROLE_NAME[need]}". Tài khoản ${user.id} có vai trò "${ROLE_NAME[user.role]}".`);
    return;
  }
  run();
});
