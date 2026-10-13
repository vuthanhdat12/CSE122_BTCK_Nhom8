/*
 * Vai trò NHÂN VIÊN VẬN HÀNH: staff-task-board, staff-task-detail, staff-shift-view.
 * Nhân viên đang xem lấy từ tài khoản đã đăng nhập (user.staffId).
 */
'use strict';

/* ---------- staff-task-board ---------- */
function taskCard(r, kind) {
  const st = stayOf(r.stayId);
  const btn = kind === 'assigned' ? `<button class="btn btn-sm btn-primary" data-act="start-task" data-id="${r.id}">Bắt đầu</button>`
    : kind === 'pool' ? `<button class="btn btn-sm btn-primary" data-act="take-task" data-id="${r.id}">Nhận việc</button>`
    : kind === 'progress' ? `<a class="btn btn-sm btn-outline-primary" href="staff-task-detail.html?id=${r.id}">Cập nhật</a>` : '';
  return `<div class="card mb-2"><div class="card-body p-3">
    <div class="d-flex justify-content-between align-items-start gap-2"><a class="fw-bold text-decoration-none" href="staff-task-detail.html?id=${r.id}">${r.id} · P.${st.room}</a>${slaChip(r)}</div>
    <div class="small fw-semibold">${esc(typeOf(r.typeId)?.name)}</div>
    <p class="small my-2">${esc(r.desc)}</p>
    <div class="d-flex align-items-center gap-2">${prioChip(r.priority)}<span class="ms-auto"></span>${btn}</div></div></div>`;
}
function paintBoard() {
  const q = (V.q || '').toLowerCase().trim();
  const f = r => (V.pf === 'all' || r.priority === V.pf) && (!q || (r.id + ' ' + stayOf(r.stayId).room + ' ' + r.desc).toLowerCase().includes(q));
  const me = S.ui.staffId, dept = staffOf(me).dept;
  const mine = S.requests.filter(r => r.assignedTo === me && f(r));
  const a = mine.filter(r => r.status === 'assigned').sort(bySla), p = mine.filter(r => r.status === 'progress').sort(bySla);
  const d = mine.filter(r => r.status === 'done').sort((x, y) => y.doneAt - x.doneAt).slice(0, 5);
  const pool = S.requests.filter(r => r.status === 'pending' && !r.assignedTo && typeOf(r.typeId)?.dept === dept && f(r)).sort(bySla);
  const col = (id, list, kind, msg) => { setText('#c' + id, list.length); setHtml('#col' + id, list.length ? list.map(r => taskCard(r, kind)).join('') : `<p class="small text-body-secondary mb-0">${msg}</p>`); };
  col('A', a, 'assigned', 'Chưa có việc mới được giao.');
  col('B', p, 'progress', 'Bạn chưa bắt đầu việc nào.');
  col('C', d, 'done', 'Chưa có việc hoàn thành.');
  setHtml('#pool', pool.length ? pool.map(r => `<div class="col-md-6 col-xl-4">${taskCard(r, 'pool')}</div>`).join('') : `<div class="col-12">${empty('Không có việc đang chờ', 'Mọi yêu cầu của bộ phận đã có người nhận.')}</div>`);
}
PAGES['staff-task-board'] = () => {
  const me = staffOf(S.ui.staffId);
  if (!V.ready) { V.ready = true; V.q = ''; V.pf = 'all'; V.refresh = paintBoard; }
  setText('#staffInfo', `${me.name} · ${me.dept} · ${SHIFTS[me.shift]}`); setText('#deptName', me.dept);
  paintBoard();
};
I.pf = el => { V.pf = el.value; if (V.refresh) V.refresh(); };
A['take-task'] = el => { const r = reqOf(el.dataset.id), me = staffOf(S.ui.staffId); r.assignedTo = me.id; r.status = 'assigned'; logTo(r, me.name, 'Nhận việc'); notify('manager', `${me.name} đã nhận ${r.id}.`); notify('guest', `${r.id} đã có người nhận xử lý.`, r.stayId); save(); rerender(); refreshBell(); toast('Đã nhận ' + r.id); };
A['start-task'] = el => { const r = reqOf(el.dataset.id); r.status = 'progress'; logTo(r, staffOf(S.ui.staffId).name, 'Bắt đầu xử lý'); notify('guest', `${r.id} đang được xử lý.`, r.stayId); save(); rerender(); refreshBell(); toast('Đã bắt đầu ' + r.id); };

/* ---------- staff-task-detail ---------- */
PAGES['staff-task-detail'] = p => {
  const me = S.ui.staffId, id = p.get('id');
  const r = id ? reqOf(id) : S.requests.filter(x => x.assignedTo === me && isOpen(x)).sort(bySla)[0];
  if (!r) { showEl('#tdMain', false); showEl('#tdEmpty', true); return; }
  showEl('#tdMain', true); showEl('#tdEmpty', false);
  const st = stayOf(r.stayId), t = typeOf(r.typeId), mine = r.assignedTo === me;
  setText('#tdTitle', `${r.id} · ${t?.name || ''}`);
  setText('#tdSub', `Phòng ${st.room} · ${st.guest}${st.vip ? ' · Khách VIP' : ''}`);
  setHtml('#tdChips', `${statusChip(r.status)} ${prioChip(r.priority)} ${slaChip(r)}${r.blocked ? ' <span class="badge rounded-pill text-bg-danger">Đang vướng mắc</span>' : ''}${r.escalation ? ' <span class="badge rounded-pill text-bg-danger">Đã leo thang</span>' : ''}`);
  setText('#tdDesc', r.desc);
  setHtml('#tdMeta', `<span>Gửi lúc ${fmtTime(r.createdAt)}</span><span>Hạn xử lý ${fmtTime(dueAt(r))}</span><span>Mong muốn: ${esc(r.when || 'Ngay bây giờ')}</span>${r.enter ? '<span>Được phép vào phòng</span>' : ''}`);
  setHtml('#tdEsc', r.escalation ? `<div class="alert alert-danger py-2 mt-3 mb-0 small">Ghi chú leo thang: ${esc(r.escalation.note)}</div>` : '');
  let actions = '';
  if (!mine) actions = `<p class="small text-body-secondary mb-0">Việc này ${r.assignedTo ? 'do ' + esc(staffOf(r.assignedTo)?.name || '') + ' phụ trách' : 'chưa có người nhận'}. Bạn chỉ xem được.</p>`;
  else if (r.status === 'assigned') actions = `<button class="btn btn-primary" data-act="start-task" data-id="${r.id}">Bắt đầu xử lý</button><button class="btn btn-outline-secondary" data-act="release-task" data-id="${r.id}">Trả lại hàng chờ</button>`;
  else if (r.status === 'progress') actions = `<button class="btn btn-primary" data-act="finish-task" data-id="${r.id}">Hoàn thành</button><button class="btn btn-outline-danger" data-act="block-task" data-id="${r.id}">Báo vướng mắc</button><button class="btn btn-link" data-act="release-task" data-id="${r.id}">Trả lại hàng chờ</button>`;
  else actions = `<p class="small text-body-secondary mb-0">Việc này đã ${STATUS[r.status].toLowerCase()}, không thể cập nhật thêm.</p>`;
  setHtml('#tdActions', actions);
  const canNote = mine && isOpen(r);
  setHtml('#tdLog', [...r.log].sort((a, b) => b.t - a.t).map(l => `<li class="${l.kind}"><time>${fmtTime(l.t)}</time><div><strong>${esc(l.who)}</strong>: ${esc(l.text)}${l.kind === 'note' && l.staffId === me && canNote ? ` <button class="btn btn-link btn-sm p-0 ms-1" data-act="edit-note" data-id="${r.id}" data-nid="${l.id}">Sửa</button><button class="btn btn-link btn-sm p-0 ms-2" data-act="del-note" data-id="${r.id}" data-nid="${l.id}">Xóa</button>` : ''}</div></li>`).join(''));
  showEl('#noteForm', canNote);
  const nf = $('#noteForm'); nf.dataset.id = r.id; nf.elements.note.value = ''; resetValidation(nf);
  const others = S.requests.filter(x => x.assignedTo === me && isOpen(x) && x.id !== r.id).sort(bySla);
  setHtml('#tdOthers', others.length ? others.map(x => `<a class="list-group-item list-group-item-action" href="staff-task-detail.html?id=${x.id}"><div class="d-flex justify-content-between"><strong>${x.id}</strong>${slaChip(x)}</div><div class="small">${esc(typeOf(x.typeId)?.name)} · Phòng ${stayOf(x.stayId).room}</div></a>`).join('') : '<div class="list-group-item small text-body-secondary">Không còn việc nào khác đang mở.</div>');
};
A['release-task'] = el => confirmBox('Trả việc về hàng chờ?', 'Quản lý sẽ phân công lại cho người khác.', 'Trả lại', () => { const r = reqOf(el.dataset.id); r.assignedTo = null; r.status = 'pending'; logTo(r, staffOf(S.ui.staffId).name, 'Trả lại hàng chờ'); notify('manager', `${r.id} được trả lại hàng chờ.`); save(); go('staff-task-board', '', 'Đã trả lại ' + r.id); }, false);
A['finish-task'] = el => confirmBox('Hoàn thành việc này?', 'Khách sẽ nhận thông báo và có thể đánh giá dịch vụ.', 'Hoàn thành', () => { const r = reqOf(el.dataset.id); r.status = 'done'; r.doneAt = Date.now(); r.blocked = false; logTo(r, staffOf(S.ui.staffId).name, 'Hoàn thành yêu cầu'); notify('guest', `${r.id} đã hoàn thành. Bạn có thể đánh giá dịch vụ.`, r.stayId); save(); rerender(); refreshBell(); toast('Đã hoàn thành ' + r.id); }, false);
A['block-task'] = el => textDialog('block', 'Báo vướng mắc', 'Điều gì đang cản trở bạn?', el.dataset.id, '', {min:5});
A['edit-note'] = el => { const l = reqOf(el.dataset.id).log.find(x => x.id === el.dataset.nid); textDialog('editnote', 'Sửa ghi chú', 'Nội dung ghi chú', el.dataset.id, l.text, {nid:el.dataset.nid, min:3}); };
A['del-note'] = el => confirmBox('Xóa ghi chú này?', 'Ghi chú sẽ bị xóa khỏi nhật ký.', 'Xóa ghi chú', () => { const r = reqOf(el.dataset.id); r.log = r.log.filter(x => x.id !== el.dataset.nid); save(); rerender(); toast('Đã xóa ghi chú'); });
F.note = f => {
  const r = reqOf(f.dataset.id), me = staffOf(S.ui.staffId);
  r.log.push({id:uid(), t:Date.now(), who:me.name, text:f.elements.note.value.trim(), kind:'note', staffId:me.id}); save(); rerender(); toast('Đã lưu ghi chú');
};
F.editnote = f => {
  const r = reqOf(f.dataset.id); r.log.find(x => x.id === f.elements.nid.value).text = f.elements.text.value.trim(); save(); closeDlg(); rerender(); toast('Đã cập nhật ghi chú');
};
F.block = f => {
  const t = f.elements.text.value.trim(), r = reqOf(f.dataset.id), me = staffOf(S.ui.staffId);
  r.blocked = true; logTo(r, me.name, 'Báo vướng mắc: ' + t, 'note'); notify('manager', `${me.name} báo vướng mắc ở ${r.id}: ${t}`); save(); closeDlg(); rerender(); refreshBell(); toast('Đã báo cho quản lý');
};

/* ---------- staff-shift-view ---------- */
function shiftFor(staff, i) {
  const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + i);
  const off = (i + parseInt(staff.id.slice(2), 10)) % 7 === 0;
  const req = S.shiftReqs.find(s => s.staffId === staff.id && s.status === 'approved' && new Date(s.date).toDateString() === date.toDateString());
  let label = off ? 'Nghỉ' : SHIFTS[staff.shift], note = '';
  if (req) { label = req.type === 'Xin nghỉ' ? 'Nghỉ phép' : SHIFTS[req.toShift]; note = req.type + ' đã duyệt'; }
  return {ms:date.getTime(), label, off:off || (req && req.type === 'Xin nghỉ'), note};
}
PAGES['staff-shift-view'] = () => {
  const me = staffOf(S.ui.staffId);
  const mine = S.requests.filter(r => r.assignedTo === me.id);
  const reqs = S.shiftReqs.filter(s => s.staffId === me.id);
  const vn = {pending:'Đang chờ', approved:'Đã duyệt', rejected:'Bị từ chối'}, cls = {pending:'warning', approved:'success', rejected:'danger'};
  setText('#shiftWho', `${me.name} · ${me.dept}`);
  setText('#kHold', mine.filter(isOpen).length); setText('#kDone', mine.filter(r => r.status === 'done').length); setText('#kShift', SHIFTS[me.shift].split(' ').slice(0, 2).join(' '));
  setHtml('#schedBody', [0,1,2,3,4,5,6].map(i => { const s = shiftFor(me, i); return `<tr><td data-label="Ngày"><strong>${fmtDay(s.ms)}</strong>${i === 0 ? ' <span class="badge text-bg-primary">Hôm nay</span>' : ''}</td><td data-label="Ca">${s.off ? `<span class="text-body-secondary">${s.label}</span>` : s.label}</td><td data-label="Ghi chú" class="small text-body-secondary">${s.note || ''}</td></tr>`; }).join(''));
  setHtml('#srList', reqs.length ? reqs.map(s => `<div class="border-bottom pb-2 mb-2"><div class="fw-semibold">${esc(s.type)} · ${fmtDay(s.date)}</div>${s.type === 'Đổi ca' ? `<div class="small">Sang ${SHIFTS[s.toShift]}</div>` : ''}<div class="small text-body-secondary">${esc(s.reason)}</div><div class="d-flex flex-wrap align-items-center gap-2 mt-2"><span class="badge rounded-pill text-bg-${cls[s.status]}">${vn[s.status]}</span>${s.status === 'pending' ? `<button class="btn btn-sm btn-outline-secondary" data-act="shiftreq-edit" data-id="${s.id}">Sửa</button><button class="btn btn-sm btn-outline-danger" data-act="shiftreq-del" data-id="${s.id}">Hủy yêu cầu</button>` : ''}</div></div>`).join('') : empty('Chưa có yêu cầu nào', 'Tạo yêu cầu khi bạn cần đổi ca hoặc xin nghỉ.'));
};
function shiftDialog(id) {
  const s = id ? S.shiftReqs.find(x => x.id === id) : null;
  const f = $('#shiftForm'); resetValidation(f); f.dataset.id = s ? s.id : '';
  const dates = [1, 2, 3, 4, 5, 6, 7].map(i => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d.getTime(); });
  setText('#shiftTitle', s ? 'Sửa yêu cầu' : 'Yêu cầu đổi ca hoặc nghỉ');
  setText('#shiftSubmit', s ? 'Lưu thay đổi' : 'Gửi yêu cầu');
  f.elements.type.value = s ? s.type : 'Đổi ca';
  setHtml('#shiftDate', dates.map(d => `<option value="${d}" ${s && new Date(s.date).toDateString() === new Date(d).toDateString() ? 'selected' : ''}>${fmtDay(d)}</option>`).join(''));
  f.elements.toShift.value = s?.toShift || 'S';
  f.elements.reason.value = s ? s.reason : '';
  syncShiftType(f);
  openLayer('shiftModal');
}
/* Xin nghỉ thì không cần chọn ca mới: ô bị vô hiệu hóa nên không tham gia kiểm tra hợp lệ */
function syncShiftType(f) { const off = f.elements.type.value === 'Xin nghỉ'; f.elements.toShift.disabled = off; showEl('#toShiftField', !off); }
I.shifttype = el => syncShiftType(el.form);
A['shiftreq-new'] = () => shiftDialog();
A['shiftreq-edit'] = el => shiftDialog(el.dataset.id);
A['shiftreq-del'] = el => confirmBox('Hủy yêu cầu này?', 'Yêu cầu sẽ bị xóa khỏi danh sách.', 'Hủy yêu cầu', () => { S.shiftReqs = S.shiftReqs.filter(s => s.id !== el.dataset.id); save(); rerender(); toast('Đã hủy yêu cầu'); });
F.shiftreq = f => {
  const o = {type:f.elements.type.value, date:+f.elements.date.value, toShift:f.elements.toShift.value, reason:f.elements.reason.value.trim()};
  if (f.dataset.id) Object.assign(S.shiftReqs.find(s => s.id === f.dataset.id), o);
  else { S.shiftReqs.unshift({id:uid(), staffId:S.ui.staffId, status:'pending', ...o}); notify('manager', `${staffOf(S.ui.staffId).name} gửi yêu cầu ${o.type.toLowerCase()}.`); }
  save(); closeDlg(); rerender(); refreshBell(); toast('Đã lưu yêu cầu');
};
