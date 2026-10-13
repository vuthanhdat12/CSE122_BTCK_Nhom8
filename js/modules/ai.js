/*
 * Ba tính năng AI mô phỏng ở Frontend (theo quy tắc từ khóa):
 * AI-1 Request Classifier, AI-2 Priority Assistant, AI-3 Feedback Summarizer.
 * runAi() mô phỏng trạng thái đang xử lý và trạng thái AI thất bại.
 */
'use strict';

const KW = {
  t1:['dọn','vệ sinh','lau','quét','rác','dọn phòng'],
  t2:['khăn','gối','chăn','dép','bàn chải','dầu gội','xà phòng','dao cạo','cạo râu','nước suối','ga giường','móc áo'],
  t3:['hỏng','hư','điều hòa','máy lạnh','rò','vòi','đèn','tivi','wifi','mạng','khóa','thẻ phòng','kẹt','nước nóng','không chạy','kêu','tủ lạnh','két'],
  t4:['món','ăn','uống','cháo','cơm','đói','nước ép','cà phê','bữa sáng','phở','mì','bia','rượu'],
  t5:['vali','hành lý','mang xuống','túi','gửi đồ'],
  t6:['xe','taxi','tour','sân bay','vé','grab','đưa đón'],
  t7:['giặt','ủi','quần áo bẩn'],
  t8:['xe đạp']
};

function aiClassify(text) {
  const d = text.toLowerCase();
  const scored = S.serviceTypes.filter(t => t.active)
    .map(t => ({t, hits:(KW[t.id] || []).filter(k => has(d, k))}))
    .filter(x => x.hits.length).sort((a, b) => b.hits.length - a.hits.length);
  if (!scored.length) return {state:'unsure', reason:'none', cands:[]};
  if (scored[1] && scored[1].hits.length === scored[0].hits.length) return {state:'unsure', reason:'tie', cands:scored.slice(0, 2).map(x => x.t)};
  return {state:'result', type:scored[0].t, hits:scored[0].hits, conf:Math.min(.97, .58 + .13 * scored[0].hits.length)};
}

const URGENT_KW = [['cấp cứu',4],['cháy',4],['khét',3],['ngập',3],['mất điện',3],['không có nước',3],['sốt',3],['y tế',3],['khẩn',3],['gấp',2],['bé',2],['rò',2],['chảy',2],['kẹt',2],['sắp có khách',2],['sắp',1]];

function aiPriority(r) {
  const d = r.desc.toLowerCase();
  if (d.trim().length < 8) return {state:'unsure'};
  let score = 0; const why = [];
  URGENT_KW.forEach(([k, w]) => { if (has(d, k)) { score += w; why.push(`Nội dung có từ khóa "${k}" gợi ý mức độ cấp bách.`); } });
  const st = stayOf(r.stayId);
  if (st?.vip) { score += 2; why.push(`Khách ở phòng ${st.room} thuộc nhóm VIP.`); }
  const rm = remainMin(r), ratio = rm / slaMin(r);
  if (rm < 0) { score += 3; why.push(`SLA đã quá hạn ${-rm} phút.`); }
  else if (ratio < .4) { score += 2; why.push(`Chỉ còn ${rm} phút trên tổng ${slaMin(r)} phút SLA.`); }
  if (typeOf(r.typeId)?.dept === 'Kỹ thuật') { score += 1; why.push('Sự cố kỹ thuật ảnh hưởng trực tiếp đến tiện nghi phòng.'); }
  if (!why.length) why.push('Không phát hiện dấu hiệu khẩn cấp, SLA còn dư.');
  const level = score >= 7 ? 'urgent' : score >= 4 ? 'high' : score >= 1 ? 'normal' : 'low';
  return {state:'result', level, why, conf:Math.min(.95, .6 + .07 * why.length)};
}

const THEMES = [
  {k:'speed', name:'Tốc độ phục vụ', kw:['chờ','lâu','đợi','trễ','chậm','nhanh','đúng giờ']},
  {k:'staff', name:'Thái độ nhân viên', kw:['lịch sự','thân thiện','nhiệt tình']},
  {k:'quality', name:'Chất lượng dịch vụ', kw:['sạch','nguội','ngon','hỏng','chất lượng','nóng']},
  {k:'track', name:'Theo dõi tiến độ', kw:['tiến độ','không biết','theo dõi','ứng dụng','gọi lại']}
];

function aiSummarize(list) {
  if (list.length < 3) return {state:'unsure', n:list.length};
  const themes = THEMES.map(th => {
    const items = list.filter(f => th.kw.some(k => has(f.comment.toLowerCase(), k)));
    return {...th, items, avg:avg(items.map(f => f.rating))};
  }).filter(x => x.items.length).sort((a, b) => b.items.length - a.items.length);
  if (!themes.length) return {state:'unsure', n:list.length, reason:'themes'};
  const all = avg(list.map(f => f.rating));
  const good = themes.filter(t => t.avg >= 4).map(t => t.name.toLowerCase());
  const bad = themes.filter(t => t.avg < 3.5).map(t => t.name.toLowerCase());
  let text = `Trong ${list.length} phản hồi (điểm trung bình ${all.toFixed(1)}/5), "${themes[0].name.toLowerCase()}" được nhắc đến nhiều nhất (${themes[0].items.length} lượt).`;
  if (good.length) text += ` Điểm được khen: ${good.join(', ')}.`;
  if (bad.length) text += ` Cần cải thiện: ${bad.join(', ')}.`;
  return {state:'result', themes, all, n:list.length, text};
}

function aiBusy(msg) {
  return `<div role="status"><div class="fw-semibold mb-2"><i class="bi bi-stars text-warning me-1"></i>AI đang xử lý</div><div class="placeholder-glow"><span class="placeholder col-7"></span><span class="placeholder col-10"></span><span class="placeholder col-5"></span></div><p class="small text-body-secondary mt-2 mb-0">${msg}</p></div>`;
}

/* Mô phỏng xử lý bất đồng bộ: đang đọc → đang đối chiếu → kết quả (hoặc lỗi nếu bật "Giả lập AI không phản hồi") */
function runAi(bag, key, compute, after) {
  bag[key] = {state:'busy', msg:'Đang đọc nội dung…'}; after();
  setTimeout(() => { if (bag[key]?.state === 'busy') { bag[key] = {state:'busy', msg:'Đang đối chiếu quy tắc…'}; after(); } }, 500);
  setTimeout(() => { bag[key] = S.ui.aiFail ? {state:'error'} : compute(); after(); }, 1100);
}
