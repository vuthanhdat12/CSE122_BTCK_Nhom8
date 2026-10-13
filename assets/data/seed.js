/*
 * Dữ liệu giả lập: users (đăng nhập theo mã, có vai trò và liên kết), stays, serviceTypes, staff, users, requests, feedback, shiftReqs, summaries, notifs, audit.
 * Thời gian trong dữ liệu mẫu được tính tương đối so với lúc tải trang.
 */
'use strict';

function seed() {
  const m = min => Date.now() - min * 60000;
  const day = d => { const x = new Date(); x.setHours(14, 0, 0, 0); return x.getTime() + d * 864e5; };
  const stays = [
    {id:'s1', guest:'Nguyễn Minh Anh', room:'1208', roomType:'Deluxe', vip:false, checkIn:day(-2), checkOut:day(2)},
    {id:'s2', guest:'Trần Quang Huy', room:'0715', roomType:'Superior', vip:false, checkIn:day(-1), checkOut:day(1)},
    {id:'s3', guest:'Lê Hoàng Yến', room:'1502', roomType:'Suite', vip:true, checkIn:day(-3), checkOut:day(3)},
    {id:'s4', guest:'Phạm Gia Bảo', room:'0903', roomType:'Deluxe', vip:false, checkIn:day(0), checkOut:day(4)},
    {id:'s5', guest:'Võ Thu Thảo', room:'0610', roomType:'Superior', vip:false, checkIn:day(-1), checkOut:day(2)}
  ];
  const serviceTypes = [
    {id:'t1', name:'Dọn phòng nhanh', dept:'Buồng phòng', slaMin:30, active:true},
    {id:'t2', name:'Thêm khăn và đồ dùng', dept:'Buồng phòng', slaMin:15, active:true},
    {id:'t3', name:'Sửa chữa kỹ thuật', dept:'Kỹ thuật', slaMin:45, active:true},
    {id:'t4', name:'Gọi món tại phòng', dept:'Ẩm thực', slaMin:40, active:true},
    {id:'t5', name:'Hành lý và vận chuyển', dept:'Lễ tân', slaMin:20, active:true},
    {id:'t6', name:'Đặt xe và tour', dept:'Concierge', slaMin:60, active:true},
    {id:'t7', name:'Giặt ủi', dept:'Buồng phòng', slaMin:120, active:true},
    {id:'t8', name:'Thuê xe đạp', dept:'Concierge', slaMin:30, active:false}
  ];
  const staff = [
    {id:'st1', name:'Trần Văn Hùng', dept:'Buồng phòng', shift:'S', active:true},
    {id:'st2', name:'Lê Thị Mai', dept:'Buồng phòng', shift:'C', active:true},
    {id:'st3', name:'Phạm Quốc Bảo', dept:'Kỹ thuật', shift:'S', active:true},
    {id:'st4', name:'Võ Thanh Hà', dept:'Ẩm thực', shift:'S', active:true},
    {id:'st5', name:'Đỗ Minh Khôi', dept:'Lễ tân', shift:'C', active:true},
    {id:'st6', name:'Ngô Bích Trâm', dept:'Concierge', shift:'S', active:true}
  ];
  const mk = (id, stayId, typeId, desc, priority, status, minAgo, o = {}) => {
    const createdAt = m(minAgo);
    const log = [{id:uid(), t:createdAt, who:'Khách', text:'Gửi yêu cầu', kind:'sys'}];
    const nm = staff.find(s => s.id === o.assignedTo)?.name;
    if (o.assignedTo) log.push({id:uid(), t:createdAt + 2 * 60000, who:'Quản lý', text:'Giao cho ' + nm, kind:'sys'});
    if (status === 'progress' || status === 'done') log.push({id:uid(), t:createdAt + 5 * 60000, who:nm || 'Nhân viên', text:'Bắt đầu xử lý', kind:'sys'});
    if (status === 'done') log.push({id:uid(), t:o.doneAt, who:nm || 'Nhân viên', text:'Hoàn thành yêu cầu', kind:'sys'});
    return {id, stayId, typeId, desc, priority, status, createdAt, assignedTo:null, archived:false, log, ...o};
  };
  const requests = [
    mk('RQ-1044', 's3', 't1', 'Dọn phòng sau bữa tiệc nhỏ, có nhiều ly và đĩa cần thu dọn.', 'normal', 'progress', 20, {assignedTo:'st1'}),
    mk('RQ-1043', 's5', 't2', 'Cần thêm 2 cái gối và 1 chăn mỏng.', 'normal', 'assigned', 9, {assignedTo:'st1'}),
    mk('RQ-1042', 's1', 't2', 'Xin thêm 2 khăn tắm và 1 bộ dụng cụ cạo râu.', 'normal', 'pending', 6),
    mk('RQ-1041', 's1', 't3', 'Điều hòa phòng ngủ kêu to và chạy không mát.', 'high', 'progress', 38, {assignedTo:'st3'}),
    mk('RQ-1040', 's3', 't4', 'Cần cháo gà và nước ép cam, bé đang sốt nhẹ, nhờ mang lên gấp.', 'normal', 'pending', 14),
    mk('RQ-1039', 's2', 't1', 'Dọn phòng giúp tôi, sắp có khách đến thăm.', 'normal', 'pending', 22),
    mk('RQ-1038', 's4', 't5', 'Cần người mang 3 vali xuống sảnh lúc 14:00.', 'normal', 'assigned', 12, {assignedTo:'st5'}),
    mk('RQ-1037', 's5', 't3', 'Vòi sen bị rò nước, nước chảy ra sàn phòng tắm.', 'high', 'progress', 62, {assignedTo:'st3', escalation:{t:m(10), note:'Đã quá hạn SLA, cần ưu tiên ngay.'}}),
    mk('RQ-1036', 's1', 't4', 'Một phần mì xào hải sản và 2 chai nước suối.', 'normal', 'done', 300, {assignedTo:'st4', doneAt:m(272), rating:5}),
    mk('RQ-1035', 's3', 't6', 'Đặt xe đi sân bay Nội Bài lúc 6:00 sáng mai.', 'normal', 'done', 1500, {assignedTo:'st6', doneAt:m(1470), rating:4}),
    mk('RQ-1034', 's2', 't2', 'Xin thêm khăn tắm.', 'low', 'done', 1700, {assignedTo:'st2', doneAt:m(1675), rating:3}),
    mk('RQ-1033', 's4', 't1', 'Dọn phòng sau khi trả bàn tiệc.', 'normal', 'done', 2000, {assignedTo:'st1', doneAt:m(1925), rating:2}),
    mk('RQ-1032', 's5', 't4', 'Gọi bữa sáng cho 2 người.', 'normal', 'cancelled', 2400),
    mk('RQ-1031', 's1', 't7', 'Giặt ủi nhanh trong 1 giờ.', 'normal', 'rejected', 3000, {rejectReason:'Dịch vụ giặt nhanh không khả dụng sau 20:00.'})
  ];
  const feedback = [
    {id:'f1', requestId:'RQ-1036', room:'1208', rating:5, comment:'Món ăn nhanh và còn nóng, nhân viên lịch sự.', createdAt:m(260)},
    {id:'f2', requestId:'RQ-1035', room:'1502', rating:4, comment:'Xe đến đúng giờ, tài xế thân thiện.', createdAt:m(1440)},
    {id:'f3', requestId:'RQ-1034', room:'0715', rating:3, comment:'Khăn mang lên hơi lâu, phải đợi gần 30 phút.', createdAt:m(1650)},
    {id:'f4', requestId:'RQ-1033', room:'0903', rating:2, comment:'Chờ dọn phòng hơn 1 tiếng, phải gọi lễ tân hai lần vì không biết tiến độ.', createdAt:m(1900)},
    {id:'f5', requestId:null, room:'0402', rating:5, comment:'Nhân viên nhiệt tình, mang đồ lên rất nhanh.', createdAt:m(2100)},
    {id:'f6', requestId:null, room:'1105', rating:2, comment:'Gọi sửa điều hòa mà đợi gần một giờ, rất chậm.', createdAt:m(2300)},
    {id:'f7', requestId:null, room:'0811', rating:4, comment:'Ứng dụng dễ dùng nhưng muốn theo dõi được ai đang xử lý.', createdAt:m(2500)},
    {id:'f8', requestId:null, room:'1420', rating:3, comment:'Thức ăn nguội khi tới phòng, chất lượng chưa như mong đợi.', createdAt:m(2800)},
    {id:'f9', requestId:null, room:'0506', rating:5, comment:'Phòng được dọn sạch, nhân viên lịch sự, rất hài lòng.', createdAt:m(3000)},
    {id:'f10', requestId:null, room:'1301', rating:2, comment:'Phải gọi lại lễ tân vì không biết tiến độ xử lý.', createdAt:m(3200)}
  ];
  const users = [
    {id:'KH01', name:'Nguyễn Minh Anh', email:'minhanh@mail.com', role:'guest', stayId:'s1', active:true, updatedAt:m(4000)},
    {id:'KH02', name:'Lê Hoàng Yến', email:'yen.le@mail.com', role:'guest', stayId:'s3', active:true, updatedAt:m(4200)},
    {id:'KH03', name:'Trần Quang Huy', email:'quanghuy@mail.com', role:'guest', stayId:'s2', active:true, updatedAt:m(4300)},
    {id:'KH04', name:'Phạm Gia Bảo', email:'giabao@mail.com', role:'guest', stayId:'s4', active:true, updatedAt:m(500)},
    {id:'KH05', name:'Võ Thu Thảo', email:'thuthao@mail.com', role:'guest', stayId:'s5', active:true, updatedAt:m(4400)},
    {id:'NV01', name:'Trần Văn Hùng', email:'hung.tran@stayflow.vn', role:'staff', staffId:'st1', active:true, updatedAt:m(9000)},
    {id:'NV02', name:'Lê Thị Mai', email:'mai.le@stayflow.vn', role:'staff', staffId:'st2', active:true, updatedAt:m(9000)},
    {id:'NV03', name:'Phạm Quốc Bảo', email:'bao.pham@stayflow.vn', role:'staff', staffId:'st3', active:true, updatedAt:m(9000)},
    {id:'NV04', name:'Võ Thanh Hà', email:'ha.vo@stayflow.vn', role:'staff', staffId:'st4', active:true, updatedAt:m(9000)},
    {id:'NV05', name:'Đỗ Minh Khôi', email:'khoi.do@stayflow.vn', role:'staff', staffId:'st5', active:true, updatedAt:m(9000)},
    {id:'NV06', name:'Ngô Bích Trâm', email:'tram.ngo@stayflow.vn', role:'staff', staffId:'st6', active:true, updatedAt:m(9000)},
    {id:'QL01', name:'Phan Thu Hương', email:'huong.phan@stayflow.vn', role:'manager', active:true, updatedAt:m(12000)},
    {id:'AD01', name:'Lý Đức Thắng', email:'thang.ly@stayflow.vn', role:'admin', active:true, updatedAt:m(15000)},
    {id:'AD02', name:'Đặng Hoài Nam', email:'nam.dang@stayflow.vn', role:'admin', active:false, updatedAt:m(600)}
  ];
  return {
    seq:1044,
    ui:{userId:null, role:null, staffId:null, guestStay:null, theme:'auto', threshold:10, simError:false, aiFail:false, flash:''},
    stays, serviceTypes, staff, users, requests, feedback,
    shiftReqs:[{id:'sr1', staffId:'st1', date:day(3), type:'Đổi ca', toShift:'C', reason:'Có lịch khám sức khỏe buổi sáng.', status:'pending'}],
    summaries:[{id:'sm1', title:'Tuần trước: chậm xử lý yêu cầu kỹ thuật', text:'Phản hồi tiêu cực tập trung vào thời gian chờ sửa chữa. Cần bổ sung ca kỹ thuật buổi tối.', createdAt:m(5000)}],
    notifs:[
      {id:'n1', role:'guest', to:'s1', text:'Yêu cầu RQ-1041 đang được Phạm Quốc Bảo xử lý.', t:m(30), read:false},
      {id:'n2', role:'manager', text:'RQ-1037 đã quá hạn SLA và đã được leo thang.', t:m(10), read:false},
      {id:'n3', role:'staff', to:'st1', text:'Bạn có việc mới: RQ-1043 (Thêm khăn và đồ dùng).', t:m(9), read:false},
      {id:'n4', role:'admin', text:'Tài khoản AD02 (Đặng Hoài Nam) đã bị vô hiệu hóa.', t:m(600), read:false}
    ],
    audit:[
      {t:m(600), text:'Vô hiệu hóa tài khoản Đặng Hoài Nam'},
      {t:m(1200), text:'Đổi SLA "Sửa chữa kỹ thuật" từ 60 xuống 45 phút'},
      {t:m(2600), text:'Thêm loại dịch vụ "Thuê xe đạp" (đang tắt)'}
    ]
  };
}
