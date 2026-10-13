/*
 * Vai trò QUẢN LÝ KHÁCH SẠN: manager-dispatch-board (AI-2), manager-sla-monitor, manager-service-report (AI-3).
 */
'use strict';

/* ---------- manager-dispatch-board + AI-2 ---------- */
function staffOptions(r) {
  const dept = typeOf(r.typeId)?.dept;
  return S.staff.filter(s => s.active && s.dept === dept).map(s => `<option value="${s.id}">${esc(s.name)} · ${myLoad(s.id)} việc đang giữ</option>`).join('');
}
const prioEdit = (r, v) => `<div class="d-flex flex-wrap gap-2 align-items-center"><label class="visually-hidden" for="pe-${r.id}">Mức ưu tiên</label><select id="pe-${r.id}" class="form-select form-select-sm w-auto">${Object.entries(PRIO).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn btn-sm btn-primary" data-act="prio-save" data-id="${r.id}">Lưu mức ưu tiên</button></div>`;
function prioBlock(r) {
  const a = V.prio?.[r.id];
  if (!a) return '';
  if (a.state === 'busy') return aiBusy(a.msg);
  if (a.state === 'error') return `<p class="fw-semibold mb-2">Không thể xử lý yêu cầu lúc này.</p><div class="d-flex gap-2"><button class="btn btn-sm btn-primary" data-act="prio-run" data-id="${r.id}">Thử lại</button><button class="btn btn-sm btn-outline-secondary" data-act="prio-reject" data-id="${r.id}">Dùng thủ công</button></div>`;
  if (a.state === 'unsure') return `<p class="fw-semibold mb-1">Không đủ dữ liệu để đưa ra đề xuất.</p><p class="small text-body-secondary">Mô tả của khách quá ngắn. Hãy chọn mức ưu tiên thủ công.</p><div class="d-flex gap-2 mb-2"><button class="btn btn-sm btn-outline-secondary" data-act="prio-edit" data-id="${r.id}">Chọn thủ công</button><button class="btn btn-sm btn-link" data-act="prio-reject" data-id="${r.id}">Bỏ qua</button></div>${a.editing ? prioEdit(r, r.priority) : ''}`;
  return `<div class="d-flex flex-wrap align-items-center gap-2 mb-2"><i class="bi bi-stars text-warning"></i><strong>Đề xuất: ${PRIO[a.level]}</strong><span class="small text-body-secondary">· tin cậy ${Math.round(a.conf * 100)}%</span></div>
    <div class="border rounded p-2 small bg-body mb-2"><strong>Vì sao?</strong><ul class="mb-0 ps-3">${a.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>
    ${a.editing ? prioEdit(r, a.level) : `<div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-primary" data-act="prio-accept" data-id="${r.id}">Chấp nhận</button><button class="btn btn-sm btn-outline-secondary" data-act="prio-edit" data-id="${r.id}">Sửa</button><button class="btn btn-sm btn-outline-secondary" data-act="prio-run" data-id="${r.id}">Tạo lại</button><button class="btn btn-sm btn-link" data-act="prio-reject" data-id="${r.id}">Từ chối</button></div>`}`;
}
function dispatchCard(r) {
  const st = stayOf(r.stayId), t = typeOf(r.typeId), risk = slaState(r);
  const edge = risk === 'breach' ? 'border-start border-4 border-danger' : risk === 'risk' ? 'border-start border-4 border-warning' : '';
  return `<article class="card ${edge}" id="card-${r.id}"><div class="card-body">
    <div class="d-flex flex-wrap align-items-center gap-2"><strong>${r.id}</strong><span>Phòng ${st.room}</span>${st.vip ? '<span class="badge text-bg-warning">VIP</span>' : ''}${prioChip(r.priority)}${slaChip(r)}<span class="ms-auto small text-body-secondary">${ago(r.createdAt)}</span></div>
    <p class="mt-2 mb-1"><strong>${esc(t?.name)}</strong> <span class="small text-body-secondary">· ${t?.dept}</span></p><p class="mb-0">${esc(r.desc)}</p>
    <div class="d-flex flex-wrap gap-2 align-items-center mt-3"><button class="btn btn-sm btn-outline-warning" data-act="prio-run" data-id="${r.id}"><i class="bi bi-stars me-1"></i>Gợi ý ưu tiên bằng AI</button>
      <label class="visually-hidden" for="sel-${r.id}">Chọn nhân viên</label><select id="sel-${r.id}" class="form-select form-select-sm w-auto" data-in="pickstaff" data-id="${r.id}"><option value="">Chọn nhân viên…</option>${staffOptions(r)}</select>
      <button class="btn btn-sm btn-primary" id="as-${r.id}" data-act="assign" data-id="${r.id}" disabled>Giao việc</button></div>
    <div class="sf-ai border rounded p-3 mt-3 ${V.prio?.[r.id] ? '' : 'd-none'}" id="ai-${r.id}" aria-live="polite">${prioBlock(r)}</div></div></article>`;
}
PAGES['manager-dispatch-board'] = () => {
  if (!V.ready) { V.ready = true; V.prio = {}; }
  const pend = S.requests.filter(r => r.status === 'pending' && !r.assignedTo).sort(bySla);
  const run = S.requests.filter(r => ['assigned','progress'].includes(r.status)).sort(bySla);
  const opens = S.requests.filter(isOpen);
  setText('#kPend', pend.length); setText('#kRun', run.length);
  setText('#kRisk', opens.filter(r => slaState(r) === 'risk').length); setText('#kBad', opens.filter(r => slaState(r) === 'breach').length);
  setHtml('#pendList', pend.length ? pend.map(dispatchCard).join('') : empty('Đã giao hết việc', 'Không còn yêu cầu nào chờ phân công. Yêu cầu mới sẽ hiện ở đây.'));
  showEl('#runWrap', run.length); showEl('#runEmpty', !run.length);
  setHtml('#runBody', run.map(r => `<tr><td data-label="Mã"><strong>${r.id}</strong></td><td data-label="Dịch vụ">${esc(typeOf(r.typeId)?.name)} · P.${stayOf(r.stayId).room}</td><td data-label="Phụ trách">${esc(staffOf(r.assignedTo)?.name || '—')}</td><td data-label="Trạng thái">${statusChip(r.status)}</td><td data-label="SLA">${slaChip(r)}</td></tr>`).join(''));
  const act = S.staff.filter(s => s.active), maxL = Math.max(3, ...act.map(s => myLoad(s.id)));
  setHtml('#loadBars', act.map(s => barRow(esc(s.name.split(' ').slice(-2).join(' ')), myLoad(s.id) / maxL * 100, myLoad(s.id))).join(''));
  const sr = S.shiftReqs.filter(s => s.status === 'pending');
  setHtml('#shiftReqs', sr.length ? sr.map(s => `<div class="border-bottom pb-2 mb-2"><strong>${esc(staffOf(s.staffId).name)}</strong><div class="small">${esc(s.type)} · ${fmtDay(s.date)}${s.type === 'Đổi ca' ? ' → ' + SHIFTS[s.toShift] : ''}</div><div class="small text-body-secondary">${esc(s.reason)}</div><div class="d-flex gap-2 mt-2"><button class="btn btn-sm btn-primary" data-act="shift-ok" data-id="${s.id}">Duyệt</button><button class="btn btn-sm btn-outline-secondary" data-act="shift-no" data-id="${s.id}">Từ chối</button></div></div>`).join('') : '<p class="small text-body-secondary mb-0">Không có yêu cầu nào đang chờ.</p>');
};
const prioRefresh = id => { const b = $('#ai-' + id); if (b) { b.innerHTML = prioBlock(reqOf(id)); b.classList.toggle('d-none', !V.prio[id]); } };
I.pickstaff = el => { const b = $('#as-' + el.dataset.id); if (b) b.disabled = !el.value; };
A['prio-run'] = el => {
  const r = reqOf(el.dataset.id); showEl('#ai-' + r.id, true);
  runAi(V.prio, r.id, () => aiPriority(r), () => prioRefresh(r.id));
};
A['prio-accept'] = el => { const r = reqOf(el.dataset.id), a = V.prio[r.id]; r.priority = a.level; logTo(r, 'Quản lý', 'Đặt mức ưu tiên ' + PRIO[a.level] + ' theo gợi ý AI'); delete V.prio[r.id]; save(); rerender(); toast('Đã đặt ưu tiên ' + PRIO[r.priority].toLowerCase()); };
A['prio-edit'] = el => { V.prio[el.dataset.id] = {...(V.prio[el.dataset.id] || {state:'unsure'}), editing:true}; prioRefresh(el.dataset.id); };
A['prio-save'] = el => { const r = reqOf(el.dataset.id); r.priority = $('#pe-' + r.id).value; logTo(r, 'Quản lý', 'Đặt mức ưu tiên ' + PRIO[r.priority]); delete V.prio[r.id]; save(); rerender(); toast('Đã lưu mức ưu tiên'); };
A['prio-reject'] = el => { delete V.prio[el.dataset.id]; prioRefresh(el.dataset.id); };
A.assign = el => {
  const r = reqOf(el.dataset.id), sid = $('#sel-' + r.id).value; if (!sid) return;
  const s = staffOf(sid); r.assignedTo = sid; r.status = 'assigned'; logTo(r, 'Quản lý', 'Giao cho ' + s.name);
  notify('staff', `Bạn có việc mới: ${r.id} (${typeOf(r.typeId)?.name}).`, sid); notify('guest', `${r.id} đã được giao cho ${s.name}.`, r.stayId);
  save(); rerender(); refreshBell(); toast(`Đã giao ${r.id} cho ${s.name}`);
};
A['shift-ok'] = el => { const s = S.shiftReqs.find(x => x.id === el.dataset.id); s.status = 'approved'; notify('staff', `Yêu cầu ${s.type.toLowerCase()} ngày ${fmtDay(s.date)} đã được duyệt.`, s.staffId); save(); rerender(); toast('Đã duyệt yêu cầu'); };
A['shift-no'] = el => { const s = S.shiftReqs.find(x => x.id === el.dataset.id); s.status = 'rejected'; notify('staff', `Yêu cầu ${s.type.toLowerCase()} ngày ${fmtDay(s.date)} bị từ chối.`, s.staffId); save(); rerender(); toast('Đã từ chối yêu cầu'); };

/* ---------- manager-sla-monitor ---------- */
function paintSlaTable() {
  const l = S.requests.filter(isOpen).filter(r => V.f === 'all' || (V.f === 'esc' ? r.escalation : slaState(r) === V.f)).sort((a, b) => remainMin(a) - remainMin(b));
  showEl('#slaWrap', l.length); showEl('#slaEmpty', !l.length);
  setText('#slaEmptyText', V.f === 'all' ? 'Hiện không có yêu cầu nào đang mở.' : 'Không có việc nào ở mức này. Thử chọn bộ lọc khác.');
  const barCls = {ok:'bg-success', risk:'bg-warning', breach:'bg-danger'};
  setHtml('#slaBody', l.map(r => {
    const pct = Math.min(100, Math.max(4, (1 - remainMin(r) / slaMin(r)) * 100)), s = slaState(r);
    return `<tr><td data-label="Mã"><strong>${r.id}</strong></td><td data-label="Dịch vụ">${esc(typeOf(r.typeId)?.name)}<div class="small text-body-secondary">Phòng ${stayOf(r.stayId).room}</div></td><td data-label="Phụ trách">${esc(staffOf(r.assignedTo)?.name || 'Chưa giao')}</td>
      <td data-label="SLA"><div class="progress" style="height:8px;min-width:90px" role="progressbar" aria-label="Đã dùng ${Math.round(pct)}% thời gian SLA" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${barCls[s]}" style="width:${pct}%"></div></div></td>
      <td data-label="Tình trạng">${slaChip(r)}${r.escalation ? ' <span class="badge rounded-pill text-bg-danger">Leo thang</span>' : ''}</td>
      <td class="text-end">${r.escalation ? `<button class="btn btn-sm btn-outline-secondary" data-act="esc-open" data-id="${r.id}">Sửa ghi chú</button> <button class="btn btn-sm btn-outline-secondary" data-act="esc-remove" data-id="${r.id}">Gỡ</button>` : `<button class="btn btn-sm btn-outline-danger" data-act="esc-open" data-id="${r.id}">Leo thang</button>`}</td></tr>`;
  }).join(''));
}
PAGES['manager-sla-monitor'] = () => {
  if (!V.ready) { V.ready = true; V.f = 'all'; V.refresh = paintSlaTable; $('#thr').value = S.ui.threshold; setText('#thrOut', S.ui.threshold); }
  const done = S.requests.filter(r => r.status === 'done'), opens = S.requests.filter(isOpen);
  const risk = opens.filter(r => slaState(r) === 'risk').length, bad = opens.filter(r => slaState(r) === 'breach').length;
  setText('#kOnTime', onTimePct() + '%'); setText('#kRisk', risk); setText('#kBad', bad);
  setText('#kAvg', Math.round(avg(done.map(r => (r.doneAt - r.createdAt) / 60000))) + '′');
  showEl('#slaAlert', risk + bad > 0);
  setHtml('#slaAlert', `<strong>${bad} việc đã trễ, ${risk} việc sắp trễ.</strong> Cân nhắc leo thang hoặc giao lại người khác.`);
  $('#slaAlert').className = 'alert alert-' + (bad ? 'danger' : 'warning') + (risk + bad ? '' : ' d-none');
  paintSlaTable();
};
I.threshold = el => { S.ui.threshold = +el.value; setText('#thrOut', el.value); save(); rerender(); };
A['esc-open'] = el => { const r = reqOf(el.dataset.id); textDialog('esc', r.escalation ? 'Sửa ghi chú leo thang' : `Leo thang ${r.id}`, 'Lý do leo thang', r.id, r.escalation?.note || '', {min:5}); };
A['esc-remove'] = el => confirmBox('Gỡ leo thang?', 'Việc này sẽ không còn được đánh dấu leo thang.', 'Gỡ leo thang', () => { const r = reqOf(el.dataset.id); delete r.escalation; logTo(r, 'Quản lý', 'Gỡ leo thang'); save(); rerender(); toast('Đã gỡ leo thang'); });
F.esc = f => {
  const t = f.elements.text.value.trim();
  const r = reqOf(f.dataset.id), isNew = !r.escalation; r.escalation = {t:Date.now(), note:t};
  if (isNew) { logTo(r, 'Quản lý', 'Leo thang: ' + t); if (r.priority !== 'urgent') r.priority = 'urgent'; if (r.assignedTo) notify('staff', `${r.id} được leo thang: ${t}`, r.assignedTo); }
  save(); closeDlg(); rerender(); refreshBell(); toast(isNew ? 'Đã leo thang ' + r.id : 'Đã cập nhật ghi chú');
};

/* ---------- manager-service-report + AI-3 ---------- */
function reportFeedback() {
  return S.feedback.filter(f => {
    const rq = f.requestId ? reqOf(f.requestId) : null;
    if (V.type !== 'all' && (!rq || rq.typeId !== V.type)) return false;
    return V.rate === 'all' || (V.rate === 'low' ? f.rating <= 3 : f.rating >= 4);
  }).sort((a, b) => b.createdAt - a.createdAt);
}
function sumHtml() {
  const a = V.sum.r || {state:'idle'};
  const head = '<h2 class="h6 d-flex align-items-center gap-2"><i class="bi bi-stars text-warning"></i>Feedback Summarizer</h2>';
  if (a.state === 'idle') return `${head}<p class="small text-body-secondary">Tóm tắt các phản hồi đang hiển thị theo bộ lọc hiện tại. Bạn xem lý do, chỉnh sửa rồi mới lưu.</p><button class="btn btn-sm btn-outline-warning" data-act="sum-run">Tóm tắt phản hồi</button>`;
  if (a.state === 'busy') return aiBusy(a.msg);
  if (a.state === 'error') return `${head}<p class="fw-semibold mb-2">Không thể xử lý yêu cầu lúc này.</p><div class="d-flex gap-2"><button class="btn btn-sm btn-primary" data-act="sum-run">Thử lại</button><button class="btn btn-sm btn-outline-secondary" data-act="sum-new">Viết thủ công</button></div>`;
  if (a.state === 'unsure') return `${head}<p class="fw-semibold mb-1">Không đủ dữ liệu để đưa ra đề xuất.</p><p class="small text-body-secondary">${a.reason === 'themes' ? 'Các phản hồi chưa chứa chủ đề nhận diện được.' : `Cần ít nhất 3 phản hồi, hiện có ${a.n}.`} Hãy nới bộ lọc hoặc viết ghi chú thủ công.</p><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-secondary" data-act="sum-new">Viết thủ công</button><button class="btn btn-sm btn-link" data-act="sum-run">Thử lại</button></div>`;
  const tone = t => t.avg >= 4 ? 'Tích cực' : t.avg >= 3 ? 'Trung lập' : 'Cần cải thiện';
  return `${head}<p class="small text-body-secondary">Dựa trên ${a.n} phản hồi</p>
    <div class="border rounded p-2 small bg-body mb-2"><strong>Chủ đề nổi bật</strong><ul class="mb-0 ps-3">${a.themes.map(t => `<li><strong>${t.name}</strong>: ${t.items.length} lượt, ${tone(t)} (${t.avg.toFixed(1)}★)</li>`).join('')}</ul></div>
    <label class="form-label small fw-semibold" for="sumText">Tóm tắt (có thể chỉnh sửa)</label><textarea id="sumText" class="form-control mb-2" rows="4">${esc(a.text)}</textarea>
    <p class="form-text">Vì sao có kết quả này: AI nhóm phản hồi theo từ khóa chủ đề và tính điểm trung bình từng nhóm.</p>
    <div class="d-flex flex-wrap gap-2"><button class="btn btn-sm btn-primary" data-act="sum-save">Lưu ghi chú</button><button class="btn btn-sm btn-outline-secondary" data-act="sum-run">Tạo lại</button><button class="btn btn-sm btn-link" data-act="sum-reject">Từ chối</button></div>`;
}
function refreshSum() { setHtml('#aiBody', sumHtml()); }
function paintReport() {
  const fb = reportFeedback(), reqs = S.requests.filter(r => V.type === 'all' || r.typeId === V.type);
  setText('#rReq', reqs.length);
  setText('#rRate', fb.length ? avg(fb.map(f => f.rating)).toFixed(1) : '—'); setText('#rRateN', `Điểm hài lòng (${fb.length} phản hồi)`);
  setText('#rSla', onTimePct() + '%');
  const byType = S.serviceTypes.map(t => ({name:t.name, n:S.requests.filter(r => r.typeId === t.id).length})).filter(x => x.n || V.type === 'all');
  const maxN = Math.max(1, ...byType.map(x => x.n));
  setHtml('#chType', byType.map(x => barRow(esc(x.name), x.n / maxN * 100, x.n)).join(''));
  const dist = [5, 4, 3, 2, 1].map(s => ({s, n:fb.filter(f => f.rating === s).length})), maxD = Math.max(1, ...dist.map(x => x.n));
  setHtml('#chRate', dist.map(x => barRow(`<span class="text-warning">${x.s} ★</span>`, x.n / maxD * 100, x.n, x.s >= 4 ? 'bg-success' : x.s === 3 ? 'bg-warning' : 'bg-danger')).join(''));
  setHtml('#fbList', fb.length ? fb.map(f => `<div class="border-bottom pb-2 mb-2"><span class="text-warning">${stars(f.rating)}</span> <span class="small text-body-secondary">Phòng ${f.room} · ${ago(f.createdAt)}${f.requestId ? ' · ' + f.requestId : ''}</span><p class="mb-0">${esc(f.comment)}</p></div>`).join('') : empty('Không có phản hồi phù hợp', 'Thử bỏ bớt bộ lọc để xem nhiều phản hồi hơn.'));
  refreshSum();
  setHtml('#sumList', S.summaries.length ? S.summaries.map(s => `<div class="border-bottom pb-2 mb-2"><strong>${esc(s.title)}</strong><p class="small mb-1">${esc(s.text)}</p><div class="small text-body-secondary mb-1">${ago(s.createdAt)}</div><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-secondary" data-act="sum-edit" data-id="${s.id}">Sửa</button><button class="btn btn-sm btn-outline-danger" data-act="sum-del" data-id="${s.id}">Xóa</button></div></div>`).join('') : '<p class="small text-body-secondary mb-0">Chưa có ghi chú nào. Lưu kết quả AI hoặc tự tạo ghi chú.</p>');
}
PAGES['manager-service-report'] = () => {
  if (!V.ready) {
    V.ready = true; V.type = 'all'; V.rate = 'all'; V.sum = {}; V.refresh = paintReport;
    setHtml('#ft', '<option value="all">Mọi dịch vụ</option>' + S.serviceTypes.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join(''));
  }
  paintReport();
};
I.rtype = el => { V.type = el.value; V.sum.r = {state:'idle'}; paintReport(); };
I.rrate = el => { V.rate = el.value; V.sum.r = {state:'idle'}; paintReport(); };
A['sum-run'] = () => { const list = reportFeedback(); runAi(V.sum, 'r', () => aiSummarize(list), refreshSum); };
A['sum-reject'] = () => { V.sum.r = {state:'idle'}; refreshSum(); };
A['sum-save'] = () => {
  const text = $('#sumText').value.trim(); if (!text) { toast('Nội dung tóm tắt đang trống', true); return; }
  S.summaries.unshift({id:uid(), title:'Tóm tắt AI · ' + new Date().toLocaleDateString('vi-VN'), text, createdAt:Date.now()}); V.sum.r = {state:'idle'}; save(); rerender(); toast('Đã lưu ghi chú báo cáo');
};
A['sum-new'] = () => textDialog('sumnew', 'Tạo ghi chú báo cáo', 'Nội dung', '', '', {withTitle:true, min:10});
A['sum-edit'] = el => { const s = S.summaries.find(x => x.id === el.dataset.id); textDialog('sumedit', 'Sửa ghi chú báo cáo', 'Nội dung', s.id, s.text, {withTitle:true, min:10, titleValue:s.title}); };
A['sum-del'] = el => confirmBox('Xóa ghi chú này?', 'Ghi chú báo cáo sẽ bị xóa.', 'Xóa ghi chú', () => { S.summaries = S.summaries.filter(s => s.id !== el.dataset.id); save(); rerender(); toast('Đã xóa ghi chú'); });
function sumSave(f, edit) {
  const title = f.elements.title.value.trim(), text = f.elements.text.value.trim();
  if (edit) Object.assign(S.summaries.find(s => s.id === f.dataset.id), {title, text}); else S.summaries.unshift({id:uid(), title, text, createdAt:Date.now()});
  save(); closeDlg(); rerender(); toast('Đã lưu ghi chú báo cáo');
}
F.sumnew = f => sumSave(f, false);
F.sumedit = f => sumSave(f, true);
