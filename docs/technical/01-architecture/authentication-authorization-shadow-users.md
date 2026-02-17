# Hướng dẫn Implement: Authentication, Token, và Shadow Users

Tài liệu này hướng dẫn chi tiết các bước để thiết lập cơ chế xác thực (Authentication), phân quyền (Authorization) và đồng bộ người dùng (Shadow Users) trong dự án CAP, sử dụng Default Identity Provider của SAP BTP.

## 1. Tổng quan kiến trúc

Luồng hoạt động của hệ thống:
1.  **Authentication**: Người dùng đăng nhập qua XSUAA (dùng SAP ID Service mặc định).
2.  **Shadow User Sync**: Mỗi request gửi lên, server sẽ chặn lại (Middleware) để kiểm tra và đồng bộ thông tin user từ Token vào bảng `ShadowUsers`.
3.  **Authorization**: Kiểm tra quyền hạn (Scopes/Roles) trước khi cho phép thực hiện hành động.
4.  **Business Logic**: Các service khác có thể query bảng `ShadowUsers` để lấy thông tin người dùng (ví dụ: người tạo, người được assign).

---

## 2. Cấu hình Authentication (XSUAA)

### Bước 2.1: Định nghĩa Service trong `mta.yaml`

Thêm service `xsuaa` vào phần `resources`:

```yaml
resources:
  - name: flexible-request-management-auth
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
      config:
        xsappname: flexible-request-management-${org}-${space}
        tenant-mode: dedicated
```

Và bind service này vào `srv` module:

```yaml
modules:
  - name: flexible-request-management-srv
    requires:
      - name: flexible-request-management-auth
```

### Bước 2.2: Định nghĩa Scopes & Roles trong `xs-security.json`

File này định nghĩa các quyền hạn trong hệ thống.

```json
{
  "xsappname": "flexible-request-management",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.Requester", "description": "Create requests" },
    { "name": "$XSAPPNAME.Approver", "description": "Approve requests" }
  ],
  "role-templates": [
    {
      "name": "Requester",
      "scope-references": ["$XSAPPNAME.Requester"]
    },
    {
      "name": "Approver",
      "scope-references": ["$XSAPPNAME.Approver", "$XSAPPNAME.Requester"]
    }
  ]
}
```

---

## 3. Data Model: Shadow Users

Tạo entity `ShadowUsers` để lưu trữ thông tin người dùng trong database của App.

**File:** `db/schema/identity.cds`

```cds
namespace sap.cre;
using { cuid, managed } from '@sap/cds/common';

entity ShadowUsers : cuid, managed {
    userId      : String(100) not null; // ID từ Token (Sub/Email)
    email       : String(255);
    firstName   : String(100);
    lastName    : String(100);
    displayName : String(255);
    isActive    : Boolean default true;
    lastLoginAt : Timestamp;
}
```

---

## 4. Implementation: Shadow User Sync (JIT Provisioning)

Chúng ta sẽ tạo một helper class để xử lý việc đồng bộ từ Token (req.user) vào Database.

### Bước 4.1: Tạo `IdentityProvisioner`

**File:** `srv/lib/identity-provisioner.ts`

```typescript
import { cds, SELECT, INSERT, UPDATE } from './db'; // Helper hoặc cds.entities

export class IdentityProvisioner {
    private static isProcessing = new Set<string>(); // Debounce requests

    static async provisionUser(user: cds.User) {
        if (!user?.id || user.id === 'anonymous') return null;

        // Skip nếu đang xử lý user này rồi
        if (this.isProcessing.has(user.id)) return null;

        try {
            this.isProcessing.add(user.id);
            const db = await cds.connect.to('db');
            const { ShadowUsers } = db.entities('sap.cre');

            // 1. Kiểm tra user đã tồn tại chưa
            const existing = await SELECT.one.from(ShadowUsers).where({ userId: user.id });

            if (existing) {
                // 2. Nếu có rồi -> Update lastLoginAt
                await UPDATE(ShadowUsers, existing.ID).set({ lastLoginAt: new Date() });
                return existing;
            }

            // 3. Nếu chưa -> Tạo mới từ thông tin Token
            const newUser = {
                userId: user.id,
                email: user.attr.email,
                firstName: user.attr.givenName,
                lastName: user.attr.familyName,
                displayName: `${user.attr.givenName} ${user.attr.familyName}`,
                lastLoginAt: new Date()
            };

            await INSERT.into(ShadowUsers).entries(newUser);
            return await SELECT.one.from(ShadowUsers).where({ userId: user.id });

        } catch (err) {
            console.error('Provisioning failed', err);
        } finally {
            this.isProcessing.delete(user.id);
        }
    }
}
```

### Bước 4.2: Tự động chạy khi có Request (Middleware)

Để đảm bảo user luôn được đồng bộ, chúng ta gắn logic này vào `server.ts` (bootstrap). Sử dụng cache để tránh gọi DB quá nhiều.

**File:** `srv/server.ts`

```typescript
import cds from '@sap/cds';
import { IdentityProvisioner } from './lib/identity-provisioner';

const jitCache = new Map<string, number>();
const TTL = 5 * 60 * 1000; // 5 phút

cds.on('bootstrap', (app) => {
    app.use((req, res, next) => {
        if (req.user?.id && req.user.id !== 'anonymous') {
            const userId = req.user.id;
            const lastSeen = jitCache.get(userId);
            const now = Date.now();

            // Chỉ sync nếu chưa sync trong 5 phút qua
            if (!lastSeen || now - lastSeen > TTL) {
                jitCache.set(userId, now);
                // Fire & Forget (không await để không block request)
                IdentityProvisioner.provisionUser(req.user).catch(err => {
                    console.error(err);
                    jitCache.delete(userId); // Retry lần sau
                });
            }
        }
        next();
    });
});
```

---

## 5. Sử dụng trong Service

Sau khi đã có Shadow Users, bạn có thể dễ dàng liên kết dữ liệu.

### 5.1: Định nghĩa Association

Ví dụ trong `Request` entity:

```cds
entity Requests : cuid, managed {
    // ... fields
    createdBy : Association to ShadowUsers; // Ai tạo
    assignedTo : Association to ShadowUsers; // Ai duyệt
}
```

### 5.2: Lấy thông tin User hiện tại

Tạo một endpoint `/me` để frontend lấy thông tin `ShadowUsers`.

**File:** `srv/identity-service.ts`

```typescript
import { IdentityProvisioner } from './lib/identity-provisioner';

export default class IdentityService extends cds.ApplicationService {
    async init() {
        const { ShadowUsers } = this.entities;

        this.on('me', async (req) => {
            // Đảm bảo user đã được sync (trường hợp cache chưa kịp chạy hoặc lỗi)
            await IdentityProvisioner.provisionUser(req.user);
            
            return SELECT.one.from(ShadowUsers).where({ userId: req.user.id });
        });

        await super.init();
    }
}
```

## 6. Frontend Integration

Ở Frontend (SAP UI5 / React / Vue), bạn gọi API `/identity/me` lúc khởi động app:

```javascript
// Ví dụ fetch call
const response = await fetch('/identity/me');
const currentUser = await response.json();

console.log('Current User DB ID:', currentUser.ID);
// Lưu ID này vào state để dùng logic (ví dụ filter "My Requests")
```

---

## Tổng kết

Với thiết lập trên, bạn có được:
1.  **Bảo mật:** Mọi request đều được xác thực qua SAP BTP (XSUAA).
2.  **Dữ liệu nhất quán:** Mọi user đi qua hệ thống đều tự động có mặt trong bảng `ShadowUsers`.
3.  **Dễ dàng mở rộng:** Database của bạn có thể reference đến User như một entity bình thường, thay vì chỉ lưu chuỗi string vô nghĩa.
