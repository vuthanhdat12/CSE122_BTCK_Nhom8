/*
 * Kiểm tra hợp lệ biểu mẫu bằng Constraint Validation API của trình duyệt:
 *  - Luật khai báo ngay trong HTML: required, minlength, maxlength, pattern, type="email", min, max, step.
 *  - JS chỉ hỏi trình duyệt (checkValidity, validity) rồi hiển thị kết quả bằng lớp .is-invalid / .invalid-feedback của Bootstrap.
 *  - Thông báo tiếng Việt tự sinh theo loại lỗi; ghi đè từng ô bằng data-msg-required, data-msg-pattern, data-msg-type, data-msg-range.
 *  - Luật nghiệp vụ (trùng tên, mã không tồn tại...) khai báo bằng data-rule="tên" và đăng ký trong VRULES;
 *    kết quả được đưa vào trình duyệt qua setCustomValidity() nên vẫn đi chung một đường với luật gốc.
 *  - Biểu mẫu cần kiểm tra có class "needs-validation" và thuộc tính novalidate (tắt bong bóng lỗi mặc định của trình duyệt).
 */
'use strict';

/* ---------- Luật nghiệp vụ: trả về chuỗi lỗi, hoặc '' nếu hợp lệ ---------- */
const VRULES = {
  loginId(v) {
    const u = userOf(v);
    if (!u) return 'Không tìm thấy mã người dùng này. Hãy kiểm tra lại hoặc chọn một tài khoản mẫu.';
    if (!u.active) return 'Tài khoản đã bị vô hiệu hóa. Hãy liên hệ quản trị viên.';
    if (u.role === 'guest' && !stayOf(u.stayId)) return 'Tài khoản khách chưa gắn với phòng lưu trú.';
    if (u.role === 'staff' && !staffOf(u.staffId)) return 'Tài khoản nhân viên chưa gắn với hồ sơ nhân viên.';
    return '';
  },
  typeName(v, el) {
    const id = el.form.dataset.id;
    return S.serviceTypes.some(t => t.id !== id && t.name.toLowerCase() === v.toLowerCase()) ? 'Tên này đã tồn tại, hãy chọn tên khác.' : '';
  },
  userCode(v) { return userOf(v) ? 'Mã này đã tồn tại, hãy chọn mã khác.' : ''; },
  userEmail(v, el) {
    const id = el.form.dataset.id;
    return S.users.some(u => u.id !== id && u.email.toLowerCase() === v.toLowerCase()) ? 'Email này đã được dùng cho tài khoản khác.' : '';
  }
};

/* ---------- Lấy thông báo lỗi ---------- */
function nativeMessage(el) {
  const v = el.validity, d = el.dataset;
  if (v.valueMissing) return d.msgRequired || (el.type === 'radio' ? 'Hãy chọn một mục.' : el.tagName === 'SELECT' ? 'Hãy chọn một giá trị.' : 'Trường này là bắt buộc.');
  if (v.typeMismatch) return d.msgType || (el.type === 'email' ? 'Email chưa đúng định dạng, ví dụ ten@stayflow.vn.' : 'Giá trị chưa đúng định dạng.');
  if (v.patternMismatch) return d.msgPattern || el.title || 'Định dạng chưa đúng.';
  if (v.tooShort) return `Cần ít nhất ${el.minLength} ký tự.`;
  if (v.tooLong) return `Tối đa ${el.maxLength} ký tự.`;
  if (v.rangeUnderflow || v.rangeOverflow) return d.msgRange || (v.rangeUnderflow ? `Giá trị tối thiểu là ${el.min}.` : `Giá trị tối đa là ${el.max}.`);
  if (v.stepMismatch || v.badInput) return d.msgRange || 'Hãy nhập một số nguyên hợp lệ.';
  return el.validationMessage || 'Giá trị chưa hợp lệ.';
}
function customError(el, msg) { el.setCustomValidity(msg); return msg; }

/* Trả về lỗi của một ô ('' nếu hợp lệ). Luôn xóa lỗi tùy chỉnh cũ trước khi kiểm tra lại. */
function fieldError(el) {
  if (!el.willValidate) return '';              // ô bị vô hiệu hóa / chỉ đọc / ẩn bằng disabled thì bỏ qua
  el.setCustomValidity('');
  if (!el.checkValidity()) return nativeMessage(el);
  const value = el.value;
  /* Trình duyệt chỉ đánh dấu tooShort khi người dùng gõ tay, nên sau khi trim() bằng JS cần kiểm tra thêm để kết quả luôn nhất quán. */
  if (el.minLength > 0 && value.length > 0 && value.length < el.minLength) return customError(el, `Cần ít nhất ${el.minLength} ký tự.`);
  const rule = VRULES[el.dataset.rule];
  const msg = rule ? rule(value, el) : '';
  return msg ? customError(el, msg) : '';
}

/* ---------- Hiển thị kết quả bằng lớp của Bootstrap ---------- */
const isField = el => !!el && !!el.matches && el.matches('input,select,textarea') && !!el.form && el.form.classList.contains('needs-validation')
  && !['button', 'submit', 'reset', 'hidden'].includes(el.type);
const isTextual = el => el.tagName === 'TEXTAREA' || ['text', 'email', 'search', 'tel', 'url'].includes(el.type);

function groupOf(el) {
  return el.type === 'radio' ? [...el.form.querySelectorAll('input[type="radio"]')].filter(r => r.name === el.name) : [el];
}
function feedbackOf(el) {
  const scope = el.type === 'radio' ? el.closest('fieldset') : el.parentElement;
  return scope ? scope.querySelector('.invalid-feedback') : null;
}
function paint(el, msg) {
  const fb = feedbackOf(el);
  groupOf(el).forEach(t => {
    t.classList.toggle('is-invalid', !!msg);
    t.classList.toggle('is-valid', !msg && t.type !== 'radio' && t.type !== 'checkbox' && t.tagName !== 'SELECT' && t.value !== '');
    if (msg) t.setAttribute('aria-invalid', 'true'); else t.removeAttribute('aria-invalid');
  });
  if (fb) { fb.setAttribute('aria-live', 'polite'); fb.textContent = msg; fb.classList.toggle('d-block', !!msg); }
}

/* Kiểm tra một ô: cắt khoảng trắng đầu/cuối, hỏi trình duyệt, hiển thị kết quả. Trả về true nếu hợp lệ. */
function validateField(el, opts = {}) {
  if (opts.trim !== false && isTextual(el) && !el.readOnly) { const t = el.value.trim(); if (t !== el.value) el.value = t; }
  const msg = fieldError(el);
  paint(el, msg);
  return !msg;
}

/* Kiểm tra cả biểu mẫu khi gửi. Ô lỗi đầu tiên được đưa con trỏ vào. */
function validateForm(form) {
  const seen = new Set();
  let first = null;
  [...form.elements].filter(isField).forEach(el => {
    if (el.type === 'radio') { if (seen.has(el.name)) return; seen.add(el.name); }
    if (!validateField(el) && !first) first = el;
  });
  form.dataset.submitted = '1';
  if (first) first.focus();
  return !first;
}

/* Xóa mọi trạng thái kiểm tra: gọi mỗi khi mở lại hộp thoại hoặc nạp lại dữ liệu vào biểu mẫu. */
function resetValidation(form) {
  delete form.dataset.submitted;
  [...form.elements].forEach(el => {
    if (!el.setCustomValidity) return;
    el.setCustomValidity('');
    el.classList.remove('is-invalid', 'is-valid');
    el.removeAttribute('aria-invalid');
    delete el.dataset.dirty;
  });
  form.querySelectorAll('.invalid-feedback').forEach(fb => { fb.textContent = ''; fb.classList.remove('d-block'); });
}

/* Lỗi nghiệp vụ phát sinh sau khi các ô đã hợp lệ (ví dụ không được khóa quản trị viên cuối cùng). */
function showError(form, name, msg) {
  const field = form.elements[name];
  const el = field && field.tagName ? field : field && field[0];
  if (!el) return;
  customError(el, msg); paint(el, msg); el.focus();
}

/* ---------- Kiểm tra trực tiếp khi người dùng nhập ---------- */
document.addEventListener('input', e => {
  const el = e.target;
  if (!isField(el)) return;
  el.dataset.dirty = '1';
  if (el.classList.contains('is-invalid') || el.form.dataset.submitted) validateField(el, {trim:false});
});
document.addEventListener('change', e => {
  const el = e.target;
  if (!isField(el)) return;
  el.dataset.dirty = '1';
  validateField(el);
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (!isField(el)) return;
  if (el.dataset.dirty || el.form.dataset.submitted) validateField(el);
});
