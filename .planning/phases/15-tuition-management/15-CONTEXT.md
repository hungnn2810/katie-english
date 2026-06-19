# Phase 15: Tuition Management - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** User requirements

<domain>
## Phase Boundary

Xây dựng hệ thống quản lý học phí hoàn chỉnh:
- Cấu hình học phí cho từng lớp (giá/buổi + tiền sách tùy chọn)
- Tự động tính và tạo phiếu thu tháng dựa trên lịch học của lớp (scheduleSlots)
- Hạn đóng học phí theo ngày trong tháng
- Ghi nhận đóng học phí thủ công bởi admin/teacher
- Gửi thông báo Zalo ZNS đến phụ huynh qua số điện thoại (ParentInfo.phoneNumber)
- Báo cáo trạng thái học phí theo lớp/tháng

</domain>

<decisions>
## Implementation Decisions

### Notification Provider
- **D-01 [LOCKED]:** Dùng Zalo ZNS (Zalo Notification Service) để gửi thông báo học phí. Gửi bằng số điện thoại từ `ParentInfo.phoneNumber`. Không dùng SMS/Twilio/ESMS.
- **D-02:** Zalo ZNS cần Zalo Official Account + template được duyệt. NestJS service gọi ZNS REST API (`https://business.openapi.zalo.me/message/template`). Access token lưu trong `.env`.

### Tính học phí
- **D-03 [LOCKED]:** Học phí tháng = số buổi thực tế trong tháng × đơn giá/buổi + tiền sách (nếu có). Số buổi tính từ `Class.scheduleSlots` JSON (các ngày trong tuần lớp học).
- **D-04:** Tiền sách là tuỳ chọn, chỉ thu 1 lần khi cấu hình `bookFee > 0`. Admin có thể bật/tắt tiền sách cho từng tháng.

### Database Schema
- **D-05 [LOCKED]:** 3 models mới:
  - `TuitionConfig`: cấu hình học phí theo lớp (`classId`, `pricePerSession` VNĐ, `bookFee` nullable, `dueDayOfMonth` 1-31)
  - `TuitionRecord`: phiếu thu theo học sinh/tháng (`studentId`, `classId`, `month`, `year`, `tuitionAmount`, `bookFee`, `totalAmount`, `dueDate`, `status` PENDING/PAID/OVERDUE, `paidAt`, `paidBy`)
  - `TuitionNotificationLog`: log gửi ZNS (`tuitionRecordId`, `sentAt`, `zaloResponse`, `success`)

### Roles & Access
- **D-06 [LOCKED]:** Cả ADMIN và TEACHER đều có thể: xem, cấu hình học phí, tạo phiếu thu, ghi nhận đóng, gửi ZNS. STUDENT không có quyền truy cập module này.

### Hạn đóng học phí
- **D-07:** `dueDayOfMonth` — ngày trong tháng (ví dụ: 5 = hạn ngày 5 hàng tháng). Khi tạo phiếu thu tháng X, `dueDate = ngày {dueDayOfMonth} tháng X năm Y`.

### Báo cáo
- **D-08:** Báo cáo filter theo: lớp + tháng/năm. Hiển thị danh sách học sinh với trạng thái (PENDING/PAID/OVERDUE), số tiền, ngày đóng (nếu đã đóng). Tổng đã thu / còn lại.

### Claude's Discretion
- Chọn NestJS module structure (tuition.module.ts với controller, service, repository)
- Frontend: thêm vào admin portal và teacher portal (tab/menu mới)
- Cron job tự động cập nhật OVERDUE status khi quá hạn (hoặc compute on-the-fly)
- Pagination cho báo cáo nếu lớp nhiều học sinh

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `backend/prisma/schema.prisma` — Existing models: Class (scheduleSlots JSON), Student, ParentInfo (phoneNumber, type FATHER/MOTHER)
- `docs/db/README.md` — DB overview + enum table
- `docs/db/classes.md` — Class model + scheduleSlots structure
- `docs/db/users-auth.md` — Student, ParentInfo models

### Existing NestJS Module Pattern
- `backend/src/admin/admin-classes.controller.ts` — Admin controller pattern
- `backend/src/admin/admin-students.controller.ts` — Admin service/repository pattern
- `backend/src/homework/homework.module.ts` — Module structure pattern

### Frontend Pattern
- `frontend/app/admin/` — Admin portal pages (use MUI, AdminShell)
- `frontend/app/teacher/` — Teacher portal pages (use MUI, TeacherShell)

### Environment Config
- `backend/.env.example` — Existing env vars pattern; add ZALO_OA_ACCESS_TOKEN, ZALO_ZNS_TEMPLATE_ID

</canonical_refs>

<specifics>
## Specific Details

### Zalo ZNS API
- Endpoint: `POST https://business.openapi.zalo.me/message/template`
- Auth: Bearer token (ZALO_OA_ACCESS_TOKEN env var)
- Payload: `{ phone: "84xxxxxxxxx", template_id: "...", template_data: { student_name, amount, due_date, class_name } }`
- Phone format: Việt Nam → bỏ số 0 đầu, thêm 84 (0912345678 → 84912345678)

### scheduleSlots JSON structure
```json
[{"dayOfWeek": 1, "startTime": "08:00", "endTime": "09:30"}, ...]
```
dayOfWeek: 0=CN, 1=T2, ..., 6=T7. Đếm số slot có dayOfWeek xuất hiện trong tháng.

### TuitionStatus enum
PENDING — chưa đóng, chưa quá hạn
PAID — đã đóng
OVERDUE — quá hạn, chưa đóng (dueDate < now)

</specifics>

<deferred>
## Deferred Ideas

- Cron job tự động tạo phiếu thu đầu mỗi tháng (cần thiết lập scheduler)
- Cron job tự động gửi ZNS nhắc nhở trước hạn (ví dụ: 3 ngày trước dueDate)
- Export báo cáo CSV/Excel
- Phụ huynh tự xem phiếu thu qua portal riêng
- Thanh toán online (Momo, VNPay) — không trong scope v3

</deferred>

---

*Phase: 15-tuition-management*
*Context gathered: 2026-06-19*
