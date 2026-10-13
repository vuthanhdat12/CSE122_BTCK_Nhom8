/*
 * Vai trò KHÁCH LƯU TRÚ: guest-dashboard, guest-service-request (AI-1), guest-my-requests.
 * Khung HTML nằm trong pages/guest-*.html; module này điền dữ liệu và xử lý sự kiện.
 */
'use strict';

function progressSteps(r) {
  if (r.status === 'cancelled') return '<div class="alert alert-secondary py-2 mb-0 small">Yêu cầu đã được hủy.</div>';
  if (r.status === 'rejected') return `<div class="alert alert-danger py-2 mb-0 small">Yêu cầu bị từ chối: ${esc(r.rejectReason || 'Không đáp ứng được lúc này.')}</div>`;
  const i = {pending:0, assigned:1, progress:2, done:3}[r.status];
  return `<ol class="sf-steps" aria-label="Tiến độ">${['Đã gửi','Đã phân công','Đang xử lý','Hoàn thành'].map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}" ${k === i ? 'aria-current="step"' : ''}>${s}</li>`).join('')}</ol>`;
}

function reqCard(r, opts = {}) {
  const t = typeOf(r.typeId), st = r.assignedTo ? staffOf(r.assignedTo) : null;
  const fb = S.feedback.find(f => f.requestId === r.id);
  const acts = [`<button class="btn btn-sm btn-outline-secondary" data-act="req-view" data-id="${r.id}">Xem chi tiết</button>`];
  if (opts.manage) {
    if (r.status === 'pending') acts.push(`<a class="btn btn-sm btn-outline-secondary" href="guest-service-request.html?id=${r.id}">Sửa</a>`);
    if (r.status === 'pending' || r.status === 'assigned') acts.push(`<button class="btn btn-sm btn-outline-danger" data-act="req-cancel" data-id="${r.id}">Hủy yêu cầu</button>`);
    if (r.status === 'done') acts.push(`<button class="btn btn-sm btn-primary" data-act="req-rate" data-id="${r.id}">${fb ? 'Sửa đánh giá' : 'Đánh giá'}</button>`);
    if (r.status === 'cancelled' || r.status === 'rejected') acts.push(`<button class="btn btn-sm btn-outline-secondary" data-act="req-archive" data-id="${r.id}">Lưu trữ</button>`);
  }
  return `<article class="card" aria-label="Yêu cầu ${r.id}"><div class="card-body vstack gap-2">
    <div class="d-flex flex-wrap align-items-center gap-2"><span class="fw-bold">${r.id}</span>${statusChip(r.status)}${slaChip(r)}<span class="ms-auto small text-body-secondary">${ago(r.createdAt)}</span></div>
    <h3 class="h6 mb-0">${esc(t ? t.name : 'Dịch vụ đã xóa')}</h3>
    <p class="mb-0">${esc(r.desc)}</p>
    ${progressSteps(r)}
    <div class="small text-body-secondary d-flex flex-wrap gap-3"><span>${st ? 'Phụ trách: ' + esc(st.name) : 'Chưa có người phụ trách'}</span>${fb ? `<span class="text-warning" aria-label="${fb.rating} sao">${stars(fb.rating)}</span>` : ''}</div>
    <div class="d-flex flex-wrap gap-2">${acts.join('')}</div></div></article>`;
}

/* ---------- guest-dashboard ---------- */
PAGES['guest-dashboard'] = () => {
  const st = stayOf(S.ui.guestStay), me = currentUser();
  const mine = S.requests.filter(r => r.stayId === st.id && !r.archived);
  const open = mine.filter(isOpen).sort((a, b) => dueAt(a) - dueAt(b));
  const done = mine.filter(r => r.status === 'done');
  const hr = new Date().getHours();
  const greet = hr < 11 ? 'Chào buổi sáng' : hr < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  setText('#gGreet', `${greet}, ${me.name.split(' ').slice(-2).join(' ')}`);
  setText('#stayRoom', 'Phòng ' + st.room);
  setText('#stayInfo', `${st.roomType} · ${fmtDate(st.checkIn)} – ${fmtDate(st.checkOut)}`);
  setText('#kOpen', open.length); setText('#kDone', done.length);
  setHtml('#openList', open.length ? open.map(r => reqCard(r)).join('') : empty('Không có yêu cầu nào đang mở', 'Khi bạn gửi yêu cầu, tiến độ sẽ hiện ở đây.', '<a class="btn btn-primary mt-2" href="guest-service-request.html">Gửi yêu cầu đầu tiên</a>'));
  setHtml('#quick', S.serviceTypes.filter(t => t.active).map(t => `<button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-act="quick" data-id="${t.id}"><span>${esc(t.name)}</span><span class="small text-body-secondary">~${t.slaMin} phút</span></button>`).join(''));
  setHtml('#recent', done.length ? done.sort((a, b) => b.doneAt - a.doneAt).slice(0, 3).map(r => `<div class="mb-2"><div class="fw-semibold">${esc(typeOf(r.typeId)?.name || '')}</div><div class="small text-body-secondary">Hoàn thành ${ago(r.doneAt)}</div></div>`).join('') : '<p class="small text-body-secondary mb-0">Chưa có yêu cầu hoàn thành.</p>');
};
A.quick = el => go('guest-service-request', 'type=' + el.dataset.id);

/* ---------- guest-service-request + AI-1 ---------- */
const etaText = id => id && typeOf(id) ? `Bộ phận ${typeOf(id).dept} cam kết xử lý trong khoảng ${typeOf(id).slaMin} phút.` : 'Chọn loại dịch vụ để xem thời gian cam kết.';
PAGES['guest-service-request'] = p => {
  const editId = p.get('id');
  const r = editId ? reqOf(editId) : null;
  if (editId && (!r || r.status !== 'pending' || r.stayId !== S.ui.guestStay)) { showEl('#reqRow', false); showEl('#reqBlocked', true); return; }
  V.ai = {state:'idle'};
  V.sel = r ? r.typeId : (p.get('type') || '');
  const f = $('#reqForm'); resetValidation(f);
  f.dataset.edit = r ? r.id : '';
  setText('#reqTitle', r ? `Sửa yêu cầu ${r.id}` : 'Gửi yêu cầu dịch vụ');
  setText('#reqSubmit', r ? 'Lưu thay đổi' : 'Gửi yêu cầu');
  f.elements.desc.value = r ? r.desc : '';
  f.elements.when.value = r?.when || 'Ngay bây giờ';
  f.elements.enter.checked = !!r?.enter;
  const types = S.serviceTypes.filter(t => t.active || (r && t.id === r.typeId));
  setHtml('#typeTiles', types.map(t => `<div class="col-6 col-md-4"><input type="radio" class="btn-check" name="typeId" id="ty-${t.id}" value="${t.id}" autocomplete="off" ${V.sel === t.id ? 'checked' : ''} ${t.active ? '' : 'disabled'} required data-msg-required="Hãy chọn một loại dịch vụ." data-in="picktype"><label class="btn btn-outline-primary w-100 h-100 text-start" for="ty-${t.id}"><span class="d-block fw-semibold">${esc(t.name)}</span><small class="d-block opacity-75">${t.dept} · ~${t.slaMin} phút${t.active ? '' : ' · Tạm ngưng'}</small></label></div>`).join(''));
  setText('#eta', etaText(V.sel));
  refreshAi();
};
I.picktype = el => { V.sel = el.value; setText('#eta', etaText(el.value)); };

function aiClassifyHtml() {
  const a = V.ai || {state:'idle'};
  const head = '<h2 class="h6 d-flex align-items-center gap-2"><i class="bi bi-stars text-warning"></i>Request Classifier</h2>';
  if (a.state === 'idle') return `${head}<p class="small text-body-secondary mb-0">Nhập mô tả rồi bấm gợi ý. AI sẽ đề xuất loại dịch vụ và giải thích lý do. Bạn có thể bỏ qua và chọn thủ công.</p>${a.note ? `<p class="small mt-2 mb-0">${a.note}</p>` : ''}`;
  if (a.state === 'busy') return aiBusy(a.msg);
  if (a.state === 'error') return `${head}<p class="fw-semibold mb-1">Không thể xử lý yêu cầu lúc này.</p><p class="small text-body-secondary">Dịch vụ AI đang gián đoạn. Bạn vẫn có thể gửi yêu cầu bằng cách chọn loại dịch vụ thủ công.</p><div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-primary" data-act="ai-classify">Thử lại</button><button class="btn btn-sm btn-outline-secondary" data-act="ai-manual">Dùng thủ công</button><button class="btn btn-sm btn-link" data-act="ai-report">Báo lỗi</button></div>`;
  if (a.state === 'unsure') return `${head}<p class="fw-semibold mb-1">AI chưa chắc chắn về kết quả này.</p><p class="small text-body-secondary">${a.reason === 'tie' ? 'Nội dung phù hợp với nhiều loại dịch vụ ngang nhau.' : 'Không tìm thấy từ khóa nào khớp với loại dịch vụ đang mở.'}</p>${a.cands?.length ? `<div class="d-flex flex-wrap gap-2 mb-2">${a.cands.map(c => `<button class="btn btn-sm btn-outline-primary" data-act="ai-pick" data-id="${c.id}">Chọn: ${esc(c.name)}</button>`).join('')}</div>` : ''}<div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-outline-secondary" data-act="ai-manual">Chọn thủ công</button><button class="btn btn-sm btn-link" data-act="ai-classify">Thử lại</button><button class="btn btn-sm btn-link" data-act="ai-report">Báo cáo</button></div>`;
  const t = a.type, pct = Math.round(a.conf * 100);
  return `<h2 class="h6 d-flex align-items-center gap-2"><i class="bi bi-stars text-warning"></i>Gợi ý của AI</h2>
    <p class="fs-5 mb-1"><strong>${esc(t.name)}</strong> <span class="small text-body-secondary">· Bộ phận ${t.dept}</span></p>
    <div class="d-flex align-items-center gap-2 small text-body-secondary mb-2"><span>Độ tin cậy ${pct}%</span><div class="progress flex-grow-1" style="max-width:160px;height:8px" role="progressbar" aria-label="Độ tin cậy" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-warning" style="width:${pct}%"></div></div></div>
    <div class="border rounded p-2 small bg-body mb-3"><strong>Vì sao có gợi ý này?</strong><ul class="mb-0 ps-3"><li>Phát hiện từ khóa: ${a.hits.map(h => `"${esc(h)}"`).join(', ')}.</li><li>Thời gian cam kết của loại này là ${t.slaMin} phút.</li></ul></div>
    <div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-primary" data-act="ai-accept" data-id="${t.id}">Chấp nhận</button><button class="btn btn-sm btn-outline-secondary" data-act="ai-edit">Sửa</button><button class="btn btn-sm btn-outline-secondary" data-act="ai-classify">Tạo lại</button><button class="btn btn-sm btn-link" data-act="ai-reject">Từ chối</button></div>`;
}
function refreshAi() { setHtml('#aiBody', aiClassifyHtml()); }
function setType(id) {
  const el = $('#ty-' + id);
  if (el && !el.disabled) { el.checked = true; el.dispatchEvent(new Event('change', {bubbles:true})); }   // change → cập nhật V.sel, thời gian cam kết và xóa lỗi
}
A['ai-classify'] = () => {
  const d = $('#desc');
  if (!validateField(d)) { d.focus(); return; }       // AI chỉ chạy khi mô tả đã hợp lệ
  runAi(V, 'ai', () => aiClassify(d.value), refreshAi);
};
A['ai-accept'] = el => { setType(el.dataset.id); V.aiUsed = true; V.ai = {state:'idle', note:'Đã áp dụng gợi ý. Bạn vẫn có thể đổi loại dịch vụ ở bên trái.'}; refreshAi(); toast('Đã chọn loại dịch vụ theo gợi ý'); };
A['ai-pick'] = el => { setType(el.dataset.id); V.ai = {state:'idle', note:'Đã chọn loại dịch vụ.'}; refreshAi(); };
A['ai-edit'] = () => { const i = $('#typeTiles input:checked') || $('#typeTiles input:not(:disabled)'); if (i) { i.scrollIntoView({block:'center'}); i.focus(); } toast('Chọn loại dịch vụ phù hợp ở bên trái'); };
A['ai-reject'] = () => { V.ai = {state:'idle', note:'Bạn đã bỏ qua gợi ý. Hãy chọn loại dịch vụ thủ công.'}; refreshAi(); };
A['ai-manual'] = () => { V.ai = {state:'idle', note:'Hãy chọn loại dịch vụ thủ công ở bên trái.'}; refreshAi(); A['ai-edit'](); };
A['ai-report'] = () => toast('Cảm ơn bạn, chúng tôi đã ghi nhận báo cáo');
F.request = f => {
  const d = f.elements.desc.value.trim(), typeId = f.elements.typeId.value;   // đã hợp lệ: validateForm chạy trước
  let msg; const when = f.elements.when.value, enter = f.elements.enter.checked, editId = f.dataset.edit;
  if (editId) {
    const r = reqOf(editId); r.desc = d; r.typeId = typeId; r.when = when; r.enter = enter; logTo(r, 'Khách', 'Cập nhật yêu cầu'); save(); msg = 'Đã lưu thay đổi ' + r.id;
  } else {
    const st = stayOf(S.ui.guestStay); const id = nextId();
    S.requests.unshift({id, stayId:st.id, typeId, desc:d, priority:'normal', status:'pending', createdAt:Date.now(), assignedTo:null, archived:false, when, enter, aiAssisted:!!V.aiUsed, log:[{id:uid(), t:Date.now(), who:'Khách', text:'Gửi yêu cầu', kind:'sys'}]});
    notify('manager', `Yêu cầu mới ${id} từ phòng ${st.room}: ${typeOf(typeId).name}.`); save(); msg = 'Đã gửi yêu cầu ' + id;
  }
  go('guest-my-requests', '', msg);
};

/* ---------- guest-my-requests ---------- */
function mineFiltered() {
  const q = (V.q || '').toLowerCase().trim();
  return S.requests.filter(r => r.stayId === S.ui.guestStay && !r.archived)
    .filter(r => V.f === 'all' || (V.f === 'open' && isOpen(r)) || (V.f === 'done' && r.status === 'done') || (V.f === 'closed' && ['cancelled','rejected'].includes(r.status)))
    .filter(r => !q || r.id.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt);
}
function mineList() {
  const l = mineFiltered();
  if (!l.length) return empty('Không có yêu cầu phù hợp', V.q || V.f !== 'all' ? 'Thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm.' : 'Bạn chưa gửi yêu cầu nào.', '<a class="btn btn-primary mt-2" href="guest-service-request.html">Gửi yêu cầu</a>');
  return l.map(r => reqCard(r, {manage:true})).join('');
}
PAGES['guest-my-requests'] = () => {
  if (!V.ready) {
    V.ready = true; V.q = ''; V.f = 'all';
    V.refresh = () => { setHtml('#list', mineList()); setText('#count', mineFiltered().length + ' yêu cầu'); };
  }
  V.refresh();
};
A['req-view'] = el => {
  const r = reqOf(el.dataset.id);
  setText('#dtTitle', `${r.id} · ${typeOf(r.typeId)?.name || ''}`);
  setHtml('#dtBody', `<div class="d-flex gap-2 mb-2">${statusChip(r.status)}${slaChip(r)}</div><p>${esc(r.desc)}</p><h3 class="h6">Lịch sử</h3><ul class="sf-tl">${[...r.log].sort((a, b) => b.t - a.t).map(l => `<li class="${l.kind}"><time>${fmtTime(l.t)}</time><div><strong>${esc(l.who)}</strong>: ${esc(l.text)}</div></li>`).join('')}</ul>`);
  showModal('detailModal');
};
A['req-cancel'] = el => confirmBox('Hủy yêu cầu này?', `Yêu cầu ${esc(el.dataset.id)} sẽ bị hủy và nhân viên sẽ không xử lý nữa.`, 'Hủy yêu cầu', () => {
  const r = reqOf(el.dataset.id); r.status = 'cancelled'; logTo(r, 'Khách', 'Hủy yêu cầu'); notify('manager', `${r.id} đã được khách hủy.`);
  if (r.assignedTo) notify('staff', `${r.id} đã được khách hủy.`, r.assignedTo);
  save(); rerender(); toast('Đã hủy ' + r.id);
});
A['req-archive'] = el => { reqOf(el.dataset.id).archived = true; save(); rerender(); toast('Đã lưu trữ yêu cầu'); };

/* Đánh giá dịch vụ: 5 nút radio (btn-check) bắt buộc chọn bằng thuộc tính required */
A['req-rate'] = el => {
  const id = el.dataset.id, r = reqOf(id), fb = S.feedback.find(f => f.requestId === id);
  const f = $('#rateForm'); resetValidation(f); f.dataset.id = id;
  setText('#rateTitle', (fb ? 'Sửa đánh giá' : 'Đánh giá dịch vụ') + ' · ' + id);
  setText('#rateInfo', typeOf(r.typeId)?.name || '');
  $$('input[name="rating"]', f).forEach(i => { i.checked = !!fb && +i.value === fb.rating; });
  f.elements.text.value = fb ? fb.comment : '';
  setText('#rateSubmit', fb ? 'Lưu đánh giá' : 'Gửi đánh giá');
  openLayer('rateModal');
};
F.rate = f => {
  const rating = +f.elements.rating.value, id = f.dataset.id, r = reqOf(id), text = f.elements.text.value.trim();
  const fb = S.feedback.find(x => x.requestId === id);
  if (fb) { fb.rating = rating; fb.comment = text || fb.comment; } else S.feedback.unshift({id:uid(), requestId:id, room:stayOf(r.stayId).room, rating, comment:text || '(Không có nhận xét)', createdAt:Date.now()});
  r.rating = rating; save(); closeDlg(); rerender(); toast('Cảm ơn bạn đã đánh giá');
};
