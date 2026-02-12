# Timesheet Management Application – PRD

## 1. Overview

### 1.1 Purpose

Xây dựng một ứng dụng quản lý timesheet cho cá nhân, team và doanh nghiệp nhỏ–vừa, cho phép user ghi nhận giờ làm việc theo ngày/tháng trên từng project và task; admin/manager có thể review, chỉnh sửa và xuất báo cáo (Excel) phục vụ payroll, billing và audit.

### 1.2 Goals

* Giảm friction khi user log timesheet hằng ngày
* Đảm bảo dữ liệu chính xác, có kiểm soát và audit
* Hỗ trợ review/approval rõ ràng
* Xuất báo cáo Excel linh hoạt

### 1.3 Non-goals (v1)

* Không xử lý payroll thực tế
* Không thay thế hệ thống ERP kế toán
* Không build workflow phức tạp đa cấp (chỉ 1–2 level approve)

---

## 2. Stakeholders & Roles

### 2.1 Roles

* **User (Employee)**: log timesheet, submit tháng
* **Manager / Approver**: review, approve/reject
* **Admin**: quản lý master data, chỉnh sửa, export

### 2.2 Stakeholders

* Engineering
* Project Manager
* HR / Finance

---

## 3. User Stories

### User

* Là user, tôi muốn log giờ theo ngày để không quên công việc đã làm
* Là user, tôi muốn copy task từ ngày trước để tiết kiệm thời gian
* Là user, tôi muốn submit timesheet theo tháng

### Manager / Admin

* Là manager, tôi muốn review timesheet theo user/project
* Là admin, tôi muốn chỉnh sửa giờ nếu user log sai
* Là admin, tôi muốn export Excel theo tháng/project

---

## 4. Functional Requirements

### 4.1 Master Data Management

* Project (CRUD)
* Task Type / Activity (CRUD)
* User (sync hoặc CRUD cơ bản)

### 4.2 Timesheet Logging

* Log theo ngày
* Mỗi ngày cho phép nhiều entry
* Tổng giờ/ngày hiển thị realtime
* Validate: tổng giờ <= 24h

### 4.3 Monthly Timesheet

* Xem calendar view theo tháng
* Tổng hợp giờ theo project/task
* Submit tháng
* Lock chỉnh sửa sau submit

### 4.4 Approval Workflow

* Trạng thái: Draft → Submitted → Approved / Rejected
* Rejected kèm comment
* User được sửa và submit lại

### 4.5 Admin Review & Edit

* Filter theo user/project/tháng
* Edit entry (ghi audit log)
* Add comment

### 4.6 Export & Reporting

* Export Excel (raw + summary)
* Filter theo tháng/project/user

---

## 5. Non-functional Requirements

* Authentication & Authorization (RBAC)
* Audit log cho mọi chỉnh sửa
* Performance: load tháng < 2s

---

## 6. Success Metrics

* ≥90% user submit timesheet đúng hạn
* Thời gian log/ngày < 2 phút
* 0 lỗi dữ liệu khi export Excel

---

## 7. Assumptions & Risks

### Assumptions

* User log trung bình 8h/ngày
* Mỗi user < 20 project/tháng

### Risks

* User lười log → cần reminder
* Excel format thay đổi theo yêu cầu business
