# Team Assignment & Auto-Submit Flow

## Vấn đề hiện tại

Nhân viên phải **tự chọn** approver (Team Lead) khi submit timesheet — họ không biết mình thuộc team nào. Không có nơi cho Team Lead quản lý danh sách thành viên của mình.

### Kiến trúc hiện tại (relevant)
- Schema `User` đã có `manager` (Association to User) và `directReports` — đây là nguồn sự thật cho "ai thuộc team nào". **Một Employee chỉ có đúng 1 manager** (1-to-1 association).
- `submitTimesheet(timesheetId, approverId)` ở backend đã tự động tạo `TimesheetBatch` khi có `approverId`.
- Không có API nào để employee lấy "team lead của mình".
- Hiện Admin Service đã có entity `Users` (full CRUD) — TL cần một phần quyền tương tự để tạo tài khoản nhân viên.

---

## Giải pháp đề xuất

**Luồng mới:**
1. Team Lead vào trang `/approvals/team` → tạo tài khoản nhân viên mới (đặt password tạm) và tự động assign vào team mình, **hoặc** assign nhân viên chưa có team từ "Unassigned" pool.
2. Nhân viên submit timesheet → backend tự dùng `currentUser.manager_ID` nếu không có `approverId` → timesheet tự động vào batch của TL đó.
3. Nhân viên thấy tên Team Lead của mình ngay trên màn hình submit — không cần chọn thủ công.

> [!IMPORTANT]
> Sử dụng lại trường `User.manager` đã có trong schema — **không cần migration DB mới**. Backend sẽ thêm endpoint mới nhưng không đổi schema.

---

## Thiết kế: TL tạo tài khoản nhân viên mới

**Luồng:**
- TL click "+ Add Member" → mở dialog "Create New Employee".
- TL nhập: `firstName`, `lastName`, `email`. Password tạm thời tự sinh (hoặc gửi qua email).
- Backend tạo `User` với `role = Employee`, `manager_ID = currentTeamLead.ID`.
- Nhân viên mới xuất hiện ngay trong "My Team" panel.

**Quyền hạn:** TL **chỉ được tạo User với role `Employee`** — không thể tạo TeamLead hay Admin.

---

## Thiết kế: Nhiều Team Lead — Xử lý xung đột assign

**Quy tắc cốt lõi:** `User.manager` là single association → một nhân viên chỉ thuộc **đúng 1 team lead** tại một thời điểm.

**Cơ chế tránh xung đột:**

| Tình huống | Xử lý |
|---|---|
| Nhân viên **chưa có** manager | Xuất hiện trong "Unassigned" pool cho TẤT CẢ team lead thấy và có thể assign |
| Nhân viên **đã có** manager là TL khác | **Không xuất hiện** trong Unassigned pool của TL hiện tại — ẩn hoàn toàn |
| TL cố assign một nhân viên đã thuộc TL khác | Backend trả về lỗi 409 Conflict: "Employee đã thuộc team của [TL khác]" |
| Cần **chuyển** nhân viên từ TL-A sang TL-B | Chỉ Admin mới có quyền reassign (từ Admin Dashboard) |

**Tại sao không cho TL-B "steal" từ TL-A?**
- Tránh mất visibility: TL-A đang có timesheet pending của nhân viên đó, nếu bị "steal" sẽ mất quyền approve.
- Admin là người có authority đủ để quyết định chuyển team.

> [!WARNING]
> Khi Admin reassign nhân viên từ TL-A → TL-B, các **timesheet đang Submitted** của nhân viên đó vẫn giữ nguyên `currentApprover` = TL-A cho đến khi approve xong. Chỉ timesheet **Draft/mới** mới tự routing đến TL-B.

---

## Proposed Changes

### Backend: TimesheetService

#### [MODIFY] timesheet-service.cds
- Thêm function `getMyTeamLead()` returns object `{id, firstName, lastName, email}` — employee dùng để biết TL của mình.

#### [MODIFY] TimesheetWorkflowHandler.ts
- Đăng ký handler `getMyTeamLead`.
- Sửa `onSubmitTimesheet`: nếu `approverId` không được truyền vào, tự động lấy `currentUser.manager_ID` làm approver.

---

### Backend: TeamLeadService

#### [MODIFY] teamlead-service.cds
- Thêm function `getMyMembers()` — TL xem danh sách nhân viên đang trong team mình.
- Thêm action `assignMember(memberId: String)` — gán nhân viên vào team. Backend validate: reject nếu nhân viên đã có manager khác (409).
- Thêm action `removeMember(memberId: String)` — gỡ nhân viên khỏi team (set `manager_ID = null`).
- Thêm function `getUnassignedEmployees()` — chỉ lấy employee có `manager_ID = null`.
- Thêm action `createMember(firstName, lastName, email)` — tạo User mới `role=Employee` và set `manager_ID = currentTL.ID` ngay lúc tạo.

#### [MODIFY] TeamLeadBatchHandler.ts
- Đăng ký và implement `getMyMembers`, `assignMember`, `removeMember`, `getUnassignedEmployees`, `createMember`.
- `assignMember`: kiểm tra `user.manager_ID` — nếu đã set và khác với current TL → throw 409 Conflict kèm tên TL hiện tại.
- `createMember`: validate email unique; tạo User với `isActive=true`, `role=Employee`, `manager_ID=currentTL.ID`.

---

### Frontend: TeamLead — Trang quản lý thành viên

#### [NEW] TeamMembersPage.tsx
Trang mới cho TL:
- **Panel trái "My Team"**: danh sách thành viên hiện tại + nút **Remove**.
- **Panel phải "Unassigned"**: danh sách nhân viên chưa có manager + nút **Assign to My Team**.
- **Button header**: **"+ Add New Employee"** → mở `CreateMemberDialog` (nhập firstName, lastName, email). Sau khi tạo, member xuất hiện ngay trong "My Team".
- Hiển thị badge/tooltip nếu nhân viên đang có timesheet pending — để TL không vô tình remove rồi mất quyền approve.

#### [MODIFY] teamlead-api.ts
Thêm các API calls:
- `getMyMembers()`
- `assignMember(memberId)`
- `removeMember(memberId)`
- `getUnassignedEmployees()`
- `createMember(firstName, lastName, email)`

#### [MODIFY] App.tsx
Thêm route `/approvals/team` → `TeamMembersPage` (protected: TeamLead, Admin).

---

### Frontend: Employee — Submit tự động

#### [MODIFY] timesheet-api.ts
Thêm function `getMyTeamLead()`.

#### [MODIFY] TimesheetPage.tsx
Sửa submit dialog:
- Khi mở: tự gọi `getMyTeamLead()`.
- Nếu có TL: hiển thị tên TL, submit tự động truyền `approverId`.
- Nếu không có TL: hiển thị warning + cho phép chọn TL thủ công từ danh sách Users có role TeamLead.

---

### Backend: AdminService — Reassign Member

#### [MODIFY] admin-service.cds
- Thêm action `reassignMember(memberId: String, newTeamLeadId: String)` — Admin chuyển nhân viên từ TL này sang TL khác.

#### [MODIFY] Admin handler
- Implement `reassignMember`: chỉ update `manager_ID`, không đụng vào timesheets đang pending.

---

### Navigation

#### [MODIFY] Sidebar / Navigation
Thêm link "My Team" vào sidebar, chỉ hiển thị cho role TeamLead.

---

## Verification Plan

### Manual Testing (End-to-End)

> [!TIP]
> Chạy dev server: `cd app/timesheet-app && npm run dev` (frontend) + `npm run dev` tại root (backend CDS).

**Test 1 — TL Assign thành viên:**
1. Đăng nhập với tài khoản TeamLead.
2. Vào `/approvals/team`.
3. Xác nhận thấy 2 panel: "My Team" (trái) và "Unassigned Employees" (phải).
4. Chọn 1 nhân viên ở panel phải → click "Assign". Xác nhận nhân viên đó chuyển sang panel trái.
5. Click "Remove" trên nhân viên vừa assigned. Xác nhận họ quay lại panel phải.

**Test 2 — TL tạo nhân viên mới:**
1. Click "+ Add New Employee" → nhập info → Confirm.
2. Xác nhận nhân viên mới xuất hiện trong "My Team" panel.
3. Đăng nhập với tài khoản nhân viên mới → xác nhận login được.

**Test 3 — Conflict: TL-B không thể steal từ TL-A:**
1. TL-A và TL-B đều đăng nhập (2 tab).
2. TL-A assign nhân viên X. TL-B cũng cố assign nhân viên X → xác nhận thấy lỗi 409.
3. Panel "Unassigned" của TL-B không hiển thị nhân viên X.

**Test 4 — Employee submit tự động:**
1. Đăng nhập với tài khoản Employee (đã assign cho TL-A).
2. Click "Submit". Xác nhận dialog hiển thị **tên TL-A** (không phải dropdown).
3. Confirm → timesheet status = `Submitted`, xuất hiện trong pending list của TL-A.

**Test 5 — Employee không có TL:**
1. Dùng tài khoản Employee chưa được assign.
2. Mở submit dialog → thấy warning + dropdown chọn TL thủ công.

**Test 6 — Admin reassign:**
1. Admin vào dashboard → reassign nhân viên X từ TL-A sang TL-B.
2. Xác nhận timesheet pending của X vẫn ở TL-A (không đổi approver).
3. Nhân viên X tạo timesheet mới → submit → tự routing đến TL-B.
