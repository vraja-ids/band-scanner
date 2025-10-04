# Band Scanner API - Quick Reference

## API Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/loginScanner` | User authentication & permissions | Yes |
| GET | `/api/getDaypassStatus` | Check daypass redemption status | Yes |
| POST | `/api/updateDayPassStatus` | Redeem/unredeem daypass | Yes |
| GET | `/api/getEvents` | List available events | No |

---

## Request/Response Examples

### 1. Login Scanner
```bash
POST /api/loginScanner
Content-Type: application/json

{
  "memberId": "EXT-12345",
  "eventId": "USASadhuSanga2025"
}
```

**Response:**
```json
{
  "scannerLoginResponse": {
    "memberId": "1001",
    "legalName": "John Doe",
    "spiritualName": "Haridas",
    "memberPermissions": ["canScanOthersQr", "canApproveGiftTshirt"],
    "scansInThisEvent": ["Meals", "Gifts"]
  }
}
```

### 2. Get Daypass Status
```bash
GET /api/getDaypassStatus?dayPassNumber=DP-2025-001234&eventId=USASadhuSanga2025&scannerMemberId=1001
```

**Response:**
```json
{
  "status": "active",
  "statusDetails": {
    "bus": "",
    "prasadam": ""
  }
}
```

### 3. Update Daypass Status
```bash
POST /api/updateDayPassStatus
Content-Type: application/json

{
  "dayPassNumber": "DP-2025-001234",
  "eventId": "USASadhuSanga2025",
  "action": "redeem",
  "actionId": "bus",
  "actionDetails": "Bus 7",
  "location": "Bus 7",
  "scannerMemberId": "1001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bus redemption successful"
}
```

**Example Request (Redeem Prasadam):**
```json
{
  "dayPassNumber": "DP-2025-001234",
  "eventId": "USASadhuSanga2025",
  "action": "redeem",
  "actionId": "prasadam",
  "actionDetails": "prasadam Lunch",
  "location": "Lunch",
  "scannerMemberId": "1001"
}
```

---

## Database Tables Needed

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  external_member_id VARCHAR(50) UNIQUE,
  legal_name VARCHAR(100),
  spiritual_name VARCHAR(100),
  email VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Events Table
```sql
CREATE TABLE events (
  event_id VARCHAR(50) PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  scan_types JSON, -- ["Meals", "Gifts", "DaypassBus"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Daypasses Table
```sql
CREATE TABLE daypasses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  daypass_number VARCHAR(50) UNIQUE,
  event_id VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_redemption_at TIMESTAMP NULL,
  INDEX(event_id, daypass_number)
);
```

### Daypass Redemptions Table
```sql
CREATE TABLE daypass_redemptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  daypass_number VARCHAR(50),
  event_id VARCHAR(50),
  service_type ENUM('bus', 'prasadam'),
  action ENUM('redeem', 'unredeem'),
  action_details VARCHAR(100),
  scanner_member_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(daypass_number, event_id, service_type)
);
```

### User Permissions Table
```sql
CREATE TABLE user_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  member_id VARCHAR(50),
  event_id VARCHAR(50),
  permission_key VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY(member_id, event_id, permission_key)
);
```

---

## Permission Keys Reference

| Permission | Description | Used For |
|------------|-------------|----------|
| `canScanOthersQr` | Scan other people's QR codes | Service approval |
| `canApproveGiftTshirt` | Approve t-shirt gifts | Gift management |
| `canApproveGiftJacket` | Approve jacket gifts | Gift management |
| `canFulfillGiftTshirt` | Fulfill t-shirt gifts | Gift management |
| `canFulfillGiftJacket` | Fulfill jacket gifts | Gift management |
| `canApproveMultipleGifts` | Approve multiple gift quantities | Gift management |
| `canScanDaypassBus` | Scan daypass for bus | Daypass bus redemption |
| `canScanDaypassPrasadam` | Scan daypass for prasadam | Daypass prasadam redemption |
| `canViewActivityStats` | View activity statistics | Statistics screen |

---

## Event Scan Types Reference

| Scan Type | Description | UI Shows |
|-----------|-------------|----------|
| `Meals` | Traditional meal scanning | Lane picker + meal scanner |
| `Gifts` | Gift approval/fulfillment | Gift approval buttons |
| `RegistrationTag` | Tag registration | Register tag button |
| `DaypassBus` | Daypass bus redemption | Bus picker + daypass scanner |
| `DaypassPrasadam` | Daypass prasadam redemption | Daypass scanner |

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid memberId or tagId |
| `EVENT_NOT_FOUND` | 404 | EventId does not exist |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `DAYPASS_NOT_FOUND` | 404 | Daypass number not found |
| `ALREADY_REDEEMED` | 400 | Daypass already redeemed for service |
| `NOT_REDEEMED` | 400 | Cannot unredeem if not redeemed |
| `INVALID_ACTION` | 400 | Invalid action or actionId |
| `VALIDATION_ERROR` | 400 | Missing or invalid required fields |
| `SYSTEM_ERROR` | 500 | Internal server error |

---

## Sample Data for Testing

### Users
```sql
INSERT INTO users (external_member_id, legal_name, spiritual_name, email) VALUES
('EXT-12345', 'John Doe', 'Haridas', 'john@example.com'),
('EXT-67890', 'Jane Smith', 'Radha', 'jane@example.com');
```

### Events
```sql
INSERT INTO events (event_id, event_name, scan_types) VALUES
('USASadhuSanga2025', 'USA Sadhu Sanga 2025', '["Meals", "Gifts", "RegistrationTag"]'),
('DaypassEvent2025', 'Daypass Event 2025', '["DaypassBus", "DaypassPrasadam"]');
```

### Permissions
```sql
INSERT INTO user_permissions (member_id, event_id, permission_key) VALUES
('EXT-12345', 'USASadhuSanga2025', 'canScanOthersQr'),
('EXT-12345', 'USASadhuSanga2025', 'canApproveGiftTshirt'),
('EXT-67890', 'DaypassEvent2025', 'canScanDaypassBus'),
('EXT-67890', 'DaypassEvent2025', 'canScanDaypassPrasadam');
```

### Daypasses
```sql
INSERT INTO daypasses (daypass_number, event_id) VALUES
('DP-2025-001234', 'DaypassEvent2025'),
('DP-2025-001235', 'DaypassEvent2025');
```

---

## Implementation Priority

1. **Phase 1**: Basic loginScanner API with hardcoded permissions
2. **Phase 2**: Database integration with user/permission tables
3. **Phase 3**: Daypass APIs with basic redemption logic
4. **Phase 4**: Event management and dynamic permissions
5. **Phase 5**: Advanced features (audit logging, analytics)

---

## Testing Checklist

- [ ] Login with valid memberId
- [ ] Login with valid tagId
- [ ] Login with invalid credentials
- [ ] Get daypass status for new daypass
- [ ] Get daypass status for redeemed daypass
- [ ] Redeem daypass for bus
- [ ] Redeem daypass for prasadam
- [ ] Unredeem daypass
- [ ] Try to redeem already redeemed daypass
- [ ] Try to unredeem non-redeemed daypass
- [ ] Test with insufficient permissions
- [ ] Test with invalid eventId
- [ ] Test rate limiting
- [ ] Test error handling

