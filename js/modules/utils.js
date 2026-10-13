/*
 * Tiện ích dùng chung: chọn phần tử, thoát HTML, định dạng thời gian, điền nội dung vào trang.
 */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 8);
const fmtTime = ms => new Date(ms).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
const fmtDate = ms => new Date(ms).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'});
const fmtDay = ms => new Date(ms).toLocaleDateString('vi-VN', {weekday:'short', day:'2-digit', month:'2-digit'});
const ago = ms => {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return m + ' phút trước';
  const h = Math.floor(m / 60);
  return h < 24 ? h + ' giờ trước' : Math.floor(h / 24) + ' ngày trước';
};
const has = (text, kw) => new RegExp('(^|[^\\p{L}])' + kw.trim() + '(?![\\p{L}])', 'u').test(text);

/* Bootstrap Icons: ico('house') -> <i class="bi bi-house"> */
const ico = n => `<i class="bi bi-${n}" aria-hidden="true"></i>`;

/* Điền nội dung vào các vùng có sẵn trong tệp HTML */
const setHtml = (sel, html) => { const e = $(sel); if (e) e.innerHTML = html; };
const setText = (sel, t) => { const e = $(sel); if (e) e.textContent = t; };
const showEl = (sel, on = true) => { const e = $(sel); if (e) e.classList.toggle('d-none', !on); };
