/*
 * Lớp dữ liệu và nghiệp vụ: LocalStorage (load/save), đăng nhập theo mã người dùng, phân quyền,
 * truy vấn, quy tắc SLA, thông báo, nhật ký.
 * Thay phần này bằng fetch() tới MockAPI/JSON Server nếu cần mở rộng.
 */
'use strict';

const KEY = 'stayflow.proto.v2';
let S;
function load() {
  try { const r = localStorage.getItem(KEY); S = r ? JSON.parse(r) : seed(); } catch (e) { S = seed(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* bộ nhớ không khả dụng: vẫn chạy trong RAM */ } }

const STATUS = {pending:'Chờ xử lý', assigned:'Đã phân công', progress:'Đang xử lý', done:'Hoàn thành', cancelled:'Đã hủy', rejected:'Bị từ chối'};
const PRIO = {low:'Thấp', normal:'Trung bình', high:'Cao', urgent:'Khẩn cấp'};
const ROLE_NAME = {guest:'Khách lưu trú', staff:'Nhân viên vận hành', manager:'Quản lý khách sạn', admin:'Quản trị viên'};
const DEPTS = ['Buồng phòng','Kỹ thuật','Ẩm thực','Lễ tân','Concierge'];
const SHIFTS = {S:'Ca sáng 06:00–14:00', C:'Ca chiều 14:00–22:00', D:'Ca đêm 22:00–06:00'};
/* Trang chủ của từng vai trò: quyền truy cập được suy ra từ role của tài khoản đã đăng nhập */
const HOME = {guest:'guest-dashboard', staff:'staff-task-board', manager:'manager-dispatch-board', admin:'admin-dashboard'};

const typeOf = id => S.serviceTypes.find(t => t.id === id);
const stayOf = id => S.stays.find(s => s.id === id);
const staffOf = id => S.staff.find(s => s.id === id);
const reqOf = id => S.requests.find(r => r.id === id);
const userOf = id => S.users.find(u => u.id.toLowerCase() === String(id ?? '').trim().toLowerCase());

/* ---------- Đăng nhập & phân quyền theo dữ liệu tài khoản ---------- */
function currentUser() {
  const u = S.ui.userId ? userOf(S.ui.userId) : null;
  return u && u.active ? u : null;
}
/* Đồng bộ phiên: role, hồ sơ nhân viên, phòng lưu trú đều lấy từ bản ghi tài khoản */
function syncSession(u) {
  S.ui.userId = u ? u.id : null;
  S.ui.role = u ? u.role : null;
  S.ui.staffId = u && u.role === 'staff' ? u.staffId : null;
  S.ui.guestStay = u && u.role === 'guest' ? u.stayId : null;
  save();
}
function login(rawId) {
  const raw = String(rawId || '').trim();
  if (!raw) return {ok:false, msg:'Hãy nhập mã người dùng.'};
  const u = userOf(raw);
  if (!u) return {ok:false, msg:'Không tìm thấy mã người dùng này. Kiểm tra lại hoặc chọn một tài khoản mẫu.'};
  if (!u.active) return {ok:false, msg:'Tài khoản đã bị vô hiệu hóa. Hãy liên hệ quản trị viên.'};
  if (u.role === 'guest' && !stayOf(u.stayId)) return {ok:false, msg:'Tài khoản khách chưa gắn với phòng lưu trú.'};
  if (u.role === 'staff' && !staffOf(u.staffId)) return {ok:false, msg:'Tài khoản nhân viên chưa gắn với hồ sơ nhân viên.'};
  syncSession(u);
  return {ok:true, user:u};
}
function logout() { syncSession(null); }

/* ---------- Quy tắc SLA ---------- */
const slaMin = r => (typeOf(r.typeId) || {slaMin:30}).slaMin;
const dueAt = r => r.createdAt + slaMin(r) * 60000;
const isOpen = r => ['pending','assigned','progress'].includes(r.status);
const remainMin = r => Math.round((dueAt(r) - Date.now()) / 60000);
function slaState(r) {
  if (!isOpen(r)) {
    if (r.status !== 'done') return 'na';
    return r.doneAt <= dueAt(r) ? 'ok' : 'breach';
  }
  const m = remainMin(r);
  return m < 0 ? 'breach' : m <= S.ui.threshold ? 'risk' : 'ok';
}
function slaText(r) {
  const st = slaState(r);
  if (isOpen(r)) { const m = remainMin(r); return m >= 0 ? `Còn ${m} phút` : `Trễ ${-m} phút`; }
  return st === 'ok' ? 'Đúng hạn' : st === 'breach' ? 'Trễ hạn' : '—';
}

/* ---------- Huy hiệu Bootstrap ---------- */
const STATUS_CLS = {pending:'warning', assigned:'info', progress:'primary', done:'success', cancelled:'secondary', rejected:'danger'};
const PRIO_CLS = {low:'secondary', normal:'info', high:'warning', urgent:'danger'};
const SLA_CLS = {ok:'success', risk:'warning', breach:'danger', na:'secondary'};
const slaClass = s => `badge rounded-pill text-bg-${SLA_CLS[s]} sla`;
const slaChip = r => `<span class="${slaClass(slaState(r))}" data-rid="${r.id}">${slaText(r)}</span>`;
const statusChip = s => `<span class="badge rounded-pill text-bg-${STATUS_CLS[s]}">${STATUS[s]}</span>`;
const prioChip = p => `<span class="badge rounded-pill text-bg-${PRIO_CLS[p]}">Ưu tiên ${PRIO[p].toLowerCase()}</span>`;

/* ---------- Truy vấn & tiện ích nghiệp vụ ---------- */
const myLoad = id => S.requests.filter(r => r.assignedTo === id && isOpen(r)).length;
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const onTimePct = () => { const d = S.requests.filter(r => r.status === 'done'); return d.length ? Math.round(100 * d.filter(r => r.doneAt <= dueAt(r)).length / d.length) : 0; };
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const prioRank = {urgent:0, high:1, normal:2, low:3};
const bySla = (a, b) => prioRank[a.priority] - prioRank[b.priority] || dueAt(a) - dueAt(b);
function logTo(r, who, text, kind = 'sys') { r.log.push({id:uid(), t:Date.now(), who, text, kind}); }
function nextId() { S.seq += 1; return 'RQ-' + S.seq; }
function audit(text) { S.audit.unshift({t:Date.now(), text}); S.audit = S.audit.slice(0, 20); }

/* Thông báo: role = nhóm nhận, to = mã phòng (khách) hoặc mã nhân viên (nếu chỉ gửi cho một người) */
function notify(role, text, to) { S.notifs.unshift({id:uid(), role, to, text, t:Date.now(), read:false}); }
const myKey = () => S.ui.role === 'guest' ? S.ui.guestStay : S.ui.role === 'staff' ? S.ui.staffId : null;
const myNotifs = () => S.notifs.filter(n => n.role === S.ui.role && (!n.to || n.to === myKey())).sort((a, b) => b.t - a.t);
