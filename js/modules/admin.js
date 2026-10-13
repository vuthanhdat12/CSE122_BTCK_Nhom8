/*
 * Vai trò QUẢN TRỊ VIÊN: admin-dashboard, admin-service-type-management, admin-user-management.
 * Tài khoản được tạo ở đây quyết định quyền đăng nhập: mã người dùng + vai trò + liên kết
 * (khách → phòng lưu trú, nhân viên → hồ sơ nhân viên).
 */
'use strict';

/* ---------- admin-dashboard ---------- */
PAGES['admin-dashboard'] = () => {
  setText('#aUsers', `${S.users.filter(u => u.active).length}/${S.users.length}`);
  setText('#aTypes', `${S.serviceTypes.filter(t => t.active).length}/${S.serviceTypes.length}`);
  setText('#aReq', S.requests.length);
  setText('#aRate', S.feedback.length ? avg(S.feedback.map(f => f.rating)).toFixed(1) : '—');
  const byRole = Object.keys(ROLE_NAME).map(k => ({k, n:S.users.filter(u => u.role === k).length})), maxR = Math.max(1, ...byRole.map(x => x.n));
  setHtml('#roleBars', byRole.map(x => barRow(ROLE_NAME[x.k], x.n / maxR * 100, x.n)).join(''));
  setHtml('#auditList', S.audit.length ? S.audit.slice(0, 6).map(a => `<div class="border-bottom pb-2 mb-2"><div>${esc(a.text)}</div><div class="small text-body-secondary">${ago(a.t)}</div></div>`).join('') : '<p class="small text-body-secondary mb-0">Chưa có hoạt động nào.</p>');
};

/* ---------- admin-service-type-management ---------- */
function paintTypes() {
  const q = (V.q || '').toLowerCase().trim();
  const l = S.serviceTypes.filter(t => (V.f === 'all' || (V.f === 'on') === t.active) && (!q || (t.name + ' ' + t.dept).toLowerCase().includes(q)));
  showEl('#tWrap', l.length); showEl('#tEmpty', !l.length);
  setHtml('#tBody', l.map(t => {
    const used = S.requests.filter(r => r.typeId === t.id).length;
    return `<tr><td data-label="Tên"><strong>${esc(t.name)}</strong></td><td data-label="Bộ phận">${t.dept}</td><td data-label="SLA">${t.slaMin} phút</td><td data-label="Yêu cầu">${used}</td><td data-label="Trạng thái"><span class="badge rounded-pill text-bg-${t.active ? 'success' : 'secondary'}">${t.active ? 'Đang bật' : 'Đã tắt'}</span></td>
      <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-secondary" data-act="type-edit" data-id="${t.id}">Sửa</button> <button class="btn btn-sm btn-outline-secondary" data-act="type-toggle" data-id="${t.id}">${t.active ? 'Tắt' : 'Bật'}</button> <button class="btn btn-sm btn-outline-danger" data-act="type-del" data-id="${t.id}" ${used ? 'disabled title="Đã có yêu cầu, hãy tắt thay vì xóa"' : ''}>Xóa</button></td></tr>`;
  }).join(''));
}
PAGES['admin-service-type-management'] = () => {
  if (!V.ready) { V.ready = true; V.q = ''; V.f = 'all'; V.refresh = paintTypes; }
  paintTypes();
};
function typeDialog(id) {
  const t = id ? typeOf(id) : null, f = $('#typeForm'); resetValidation(f); f.dataset.id = t ? t.id : '';
  setText('#typeTitle', t ? 'Sửa loại dịch vụ' : 'Thêm loại dịch vụ'); setText('#typeSubmit', t ? 'Lưu thay đổi' : 'Thêm dịch vụ');
  f.elements.name.value = t ? t.name : ''; f.elements.dept.value = t ? t.dept : DEPTS[0];
  f.elements.sla.value = t ? t.slaMin : 30; f.elements.active.checked = !t || t.active;
  openLayer('typeModal');
}
A['type-new'] = () => typeDialog();
A['type-edit'] = el => typeDialog(el.dataset.id);
A['type-toggle'] = el => { const t = typeOf(el.dataset.id); t.active = !t.active; audit(`${t.active ? 'Bật' : 'Tắt'} loại dịch vụ "${t.name}"`); save(); rerender(); toast(`Đã ${t.active ? 'bật' : 'tắt'} "${t.name}"`); };
A['type-del'] = el => { const t = typeOf(el.dataset.id); confirmBox(`Xóa "${esc(t.name)}"?`, 'Loại dịch vụ chưa có yêu cầu nào nên có thể xóa hẳn.', 'Xóa dịch vụ', () => { S.serviceTypes = S.serviceTypes.filter(x => x.id !== t.id); audit(`Xóa loại dịch vụ "${t.name}"`); save(); rerender(); toast('Đã xóa loại dịch vụ'); }); };
F.type = f => {
  /* Tên (bắt buộc, 3–50 ký tự, không trùng) và SLA (số 5–480) đã được kiểm tra bởi validateForm */
  const name = f.elements.name.value.trim(), sla = +f.elements.sla.value, id = f.dataset.id;
  const o = {name, dept:f.elements.dept.value, slaMin:sla, active:f.elements.active.checked};
  if (id) { const t = typeOf(id); if (t.slaMin !== sla) audit(`Đổi SLA "${t.name}" từ ${t.slaMin} xuống ${sla} phút`); Object.assign(t, o); audit(`Cập nhật loại dịch vụ "${name}"`); }
  else { S.serviceTypes.push({id:'t' + uid(), ...o}); audit(`Thêm loại dịch vụ "${name}"`); }
  save(); closeDlg(); rerender(); toast('Đã lưu loại dịch vụ');
};

/* ---------- admin-user-management ---------- */
const lastAdmin = u => u.role === 'admin' && u.active && S.users.filter(x => x.role === 'admin' && x.active).length === 1;
const linkText = u => u.role === 'guest' ? (stayOf(u.stayId) ? 'Phòng ' + stayOf(u.stayId).room : '—') : u.role === 'staff' ? (staffOf(u.staffId)?.dept || '—') : '—';
function paintUsers() {
  const q = (V.q || '').toLowerCase().trim();
  const l = S.users.filter(u => (V.role === 'all' || u.role === V.role) && (!q || (u.id + ' ' + u.name + ' ' + u.email).toLowerCase().includes(q)));
  showEl('#uWrap', l.length); showEl('#uEmpty', !l.length);
  setHtml('#uBody', l.map(u => `<tr><td data-label="Mã"><code>${esc(u.id)}</code></td><td data-label="Họ tên"><strong>${esc(u.name)}</strong><div class="small text-body-secondary">${esc(u.email)}</div></td><td data-label="Vai trò">${ROLE_NAME[u.role]}</td><td data-label="Liên kết">${linkText(u)}</td><td data-label="Trạng thái"><span class="badge rounded-pill text-bg-${u.active ? 'success' : 'secondary'}">${u.active ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td>
    <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-secondary" data-act="user-edit" data-id="${esc(u.id)}">Sửa</button> <button class="btn btn-sm btn-outline-secondary" data-act="user-toggle" data-id="${esc(u.id)}">${u.active ? 'Vô hiệu hóa' : 'Kích hoạt'}</button> <button class="btn btn-sm btn-outline-danger" data-act="user-del" data-id="${esc(u.id)}">Xóa</button></td></tr>`).join(''));
}
PAGES['admin-user-management'] = () => {
  if (!V.ready) {
    V.ready = true; V.q = ''; V.role = 'all'; V.refresh = paintUsers;
    setHtml('#stayOpts', '<option value="">Chọn phòng lưu trú…</option>' + S.stays.map(s => `<option value="${s.id}">Phòng ${s.room} – ${esc(s.guest)}</option>`).join(''));
    setHtml('#staffOpts', '<option value="">Chọn hồ sơ nhân viên…</option>' + S.staff.map(s => `<option value="${s.id}">${esc(s.name)} – ${s.dept}</option>`).join(''));
  }
  paintUsers();
};
I.urole = el => { V.role = el.value; paintUsers(); };
/* Khách cần chọn phòng, nhân viên cần chọn hồ sơ: ô không liên quan bị vô hiệu hóa nên không bị bắt buộc */
I.userrole = el => { const f = el.form, g = el.value === 'guest', s = el.value === 'staff'; f.elements.stayId.disabled = !g; f.elements.staffId.disabled = !s; showEl('#linkStayRow', g); showEl('#linkStaffRow', s); };
function userDialog(id) {
  const u = id ? userOf(id) : null, f = $('#userForm'); resetValidation(f); f.dataset.id = u ? u.id : '';
  setText('#userTitle', u ? 'Sửa tài khoản' : 'Thêm tài khoản'); setText('#userSubmit', u ? 'Lưu thay đổi' : 'Thêm tài khoản');
  f.elements.code.value = u ? u.id : ''; f.elements.code.readOnly = !!u;
  f.elements.name.value = u ? u.name : ''; f.elements.email.value = u ? u.email : '';
  f.elements.role.value = u ? u.role : 'guest';
  f.elements.stayId.value = u?.stayId || ''; f.elements.staffId.value = u?.staffId || '';
  f.elements.active.checked = !u || u.active;
  I.userrole(f.elements.role);
  openLayer('userModal');
}
A['user-new'] = () => userDialog();
A['user-edit'] = el => userDialog(el.dataset.id);
A['user-toggle'] = el => {
  const u = userOf(el.dataset.id);
  if (u.id === currentUser().id && u.active) { toast('Không thể tự vô hiệu hóa tài khoản đang đăng nhập', true); return; }
  if (lastAdmin(u)) { toast('Không thể vô hiệu hóa quản trị viên hoạt động cuối cùng', true); return; }
  u.active = !u.active; u.updatedAt = Date.now(); audit(`${u.active ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản ${u.id} (${u.name})`); save(); rerender(); toast(`Đã ${u.active ? 'kích hoạt' : 'vô hiệu hóa'} ${u.id}`);
};
A['user-del'] = el => {
  const u = userOf(el.dataset.id);
  if (u.id === currentUser().id) { toast('Không thể tự xóa tài khoản đang đăng nhập', true); return; }
  if (lastAdmin(u)) { toast('Không thể xóa quản trị viên hoạt động cuối cùng', true); return; }
  confirmBox(`Xóa tài khoản ${esc(u.id)}?`, `Tài khoản ${esc(u.name)} sẽ bị xóa vĩnh viễn. Nếu chỉ muốn tạm ngưng, hãy chọn Vô hiệu hóa.`, 'Xóa tài khoản', () => { S.users = S.users.filter(x => x.id !== u.id); audit(`Xóa tài khoản ${u.id} (${u.name})`); save(); rerender(); toast('Đã xóa tài khoản'); });
};
F.user = f => {
  /* Mã (3–12 ký tự chữ/số/gạch dưới, không trùng), họ tên, email, vai trò, phòng/hồ sơ đã được kiểm tra bởi validateForm */
  const code = f.elements.code.value.trim(), name = f.elements.name.value.trim(), email = f.elements.email.value.trim().toLowerCase(), role = f.elements.role.value, id = f.dataset.id;
  const o = {name, email, role, active:f.elements.active.checked, updatedAt:Date.now()};
  if (role === 'guest') o.stayId = f.elements.stayId.value;
  if (role === 'staff') o.staffId = f.elements.staffId.value;
  if (id) {
    const u = userOf(id);
    /* Ràng buộc nghiệp vụ chỉ biết được sau khi các ô đã hợp lệ → báo bằng showError */
    if (lastAdmin(u) && (role !== 'admin' || !o.active)) { showError(f, 'role', 'Hệ thống cần ít nhất một quản trị viên đang hoạt động.'); return; }
    if (u.id === currentUser().id && (role !== u.role || !o.active)) { showError(f, 'role', 'Không thể đổi vai trò hoặc khóa tài khoản đang đăng nhập.'); return; }
    delete u.stayId; delete u.staffId;
    Object.assign(u, o); audit(`Cập nhật tài khoản ${u.id} (${name})`);
  } else { S.users.unshift({id:code.toUpperCase(), ...o}); audit(`Thêm tài khoản ${code.toUpperCase()} (${name})`); }
  save(); closeDlg(); rerender(); toast('Đã lưu tài khoản');
};
