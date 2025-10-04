# Band Scanner API Documentation

## Overview
This document outlines the APIs required for the Band Scanner mobile application, including authentication, event management, and daypass functionality.

---

## 1. Login Scanner API

### Endpoint
```
POST /api/loginScanner
```

### Purpose
Authenticates a user for scanner operations and returns their permissions and event-specific capabilities.

### Request Schema
```json
{
  "authToken": "string (required)",
  "tagId": "string (optional)", 
  "eventId": "string (required)"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `authToken` | string | Yes | Authentication token obtained from login/OTP verification. Used for user identification. |
| `tagId` | string | No | QR code tag ID for tag-based login. Used for scanning someone else's tag. |
| `eventId` | string | Yes | Event identifier (e.g., "USASadhuSanga2025") to determine available permissions. |

### Response Schema
```json
{
  "scannerLoginResponse": {
    "memberId": "string",
    "legalName": "string", 
    "spiritualName": "string (optional)",
    "memberPermissions": ["string"],
    "scansInThisEvent": ["string"]
  }
}
```

### Response Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `memberId` | string | Internal member ID for the authenticated user |
| `legalName` | string | User's legal name for display |
| `spiritualName` | string | User's spiritual name (optional) |
| `memberPermissions` | string[] | Array of permission keys the user has |
| `scansInThisEvent` | string[] | Array of scan types available for this event |

### Permission Keys
| Permission | Description |
|------------|-------------|
| `canScanOthersQr` | Can scan other people's QR codes for services |
| `canApproveGiftTshirt` | Can approve t-shirt gifts |
| `canApproveGiftJacket` | Can approve jacket gifts |
| `canFulfillGiftTshirt` | Can fulfill t-shirt gifts |
| `canFulfillGiftJacket` | Can fulfill jacket gifts |
| `canApproveMultipleGifts` | Can approve multiple quantities of gifts |
| `canScanDaypassBus` | Can scan daypass for bus redemption |
| `canScanDaypassPrasadam` | Can scan daypass for prasadam redemption |
| `canViewActivityStats` | Can view activity statistics |

### Event Scan Types
| Scan Type | Description |
|-----------|-------------|
| `Meals` | Traditional meal scanning functionality |
| `Gifts` | Gift approval and fulfillment |
| `RegistrationTag` | Tag registration functionality |
| `Daypass` | Daypass redemption functionality (bus and/or prasadam) |

### Business Logic
1. **Authentication**: Verify authToken is valid and not expired
2. **Event Validation**: Ensure eventId is valid and active
3. **Permission Calculation**: Determine user permissions based on:
   - User's role/level (derived from authToken)
   - Event-specific permissions
   - Time-based restrictions
4. **Event Capabilities**: Return available scan types for the specific event
5. **User Info**: Return user's display information

### Example Request
```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "eventId": "USASadhuSanga2025"
}
```

### Example Response
```json
{
  "scannerLoginResponse": {
    "memberId": "1001",
    "legalName": "John Doe",
    "spiritualName": "Haridas",
    "memberPermissions": [
      "canScanOthersQr",
      "canApproveGiftTshirt",
      "canFulfillGiftTshirt",
      "canViewActivityStats"
    ],
    "scansInThisEvent": [
      "Meals",
      "Gifts",
      "RegistrationTag"
    ]
  }
}
```

### Example Response (Daypass Event)
```json
{
  "scannerLoginResponse": {
    "memberId": "1002",
    "legalName": "Jane Smith",
    "spiritualName": "Radha",
    "memberPermissions": [
      "canScanDaypassBus",
      "canScanDaypassPrasadam",
      "canViewActivityStats"
    ],
    "scansInThisEvent": [
      "Daypass"
    ]
  }
}
```

---

## 2. Get Daypass Status API

### Endpoint
```
GET /api/getDaypassStatus
```

### Purpose
Retrieves the current redemption status of a daypass for both bus and prasadam services.

### Request Schema
```json
{
  "dayPassNumber": "string",
  "eventId": "string",
  "scannerMemberId": "string"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dayPassNumber` | string | Yes | The daypass QR code number to check |
| `eventId` | string | Yes | Event identifier for context |
| `scannerMemberId` | string | Yes | ID of the scanner performing the check |

### Response Schema
```json
{
  "daypassDetails": {
    "daypassNumber": "number",
    "purchaserName": "string",
    "daypassName": "string",
    "scannerAlert": "boolean",
    "status": "string",
    "statusDetails": {
      "bus": "string",
      "prasadam": "string"
    }
  }
}
```

### Response Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `daypassDetails` | object | Complete daypass information |
| `daypassNumber` | number | The daypass number |
| `purchaserName` | string | Name of the person who purchased the daypass |
| `daypassName` | string | Name/description of the daypass |
| `scannerAlert` | boolean | Whether there's an alert for the scanner |
| `status` | string | Overall daypass status: "active" or "redeemed" |
| `statusDetails.bus` | string | Bus redemption details (empty string if not redeemed, "Bus X" if redeemed) |
| `statusDetails.prasadam` | string | Prasadam redemption details (empty string if not redeemed, "Prasadam Counter X" if redeemed) |

### Business Logic
1. **Daypass Validation**: Verify daypass number exists and is valid for the event
2. **Status Check**: Query redemption history for both bus and prasadam
3. **Permission Check**: Ensure scanner has permission to view this daypass
4. **Status Calculation**: Determine overall status based on redemption history
5. **Details Formatting**: Format redemption details for display

### Example Request
```json
{
  "dayPassNumber": "DP-2025-001234",
  "eventId": "USASadhuSanga2025",
  "scannerMemberId": "1001"
}
```

### Example Response
```json
{
  "status": "redeemed",
  "statusDetails": {
    "bus": "Bus 7",
    "prasadam": ""
  }
}
```

---

## 3. Update Daypass Status API

### Endpoint
```
POST /api/updateDayPassStatus
```

### Purpose
Updates the redemption status of a daypass for bus or prasadam services.

### Request Schema
```json
{
  "dayPassNumber": "string",
  "eventId": "string", 
  "action": "string",
  "actionId": "string",
  "actionDetails": "string",
  "location": "string",
  "scannerMemberId": "string"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dayPassNumber` | string | Yes | The daypass QR code number to update |
| `eventId` | string | Yes | Event identifier for context |
| `action` | string | Yes | Action to perform: "redeem" or "unredeem" |
| `actionId` | string | Yes | Service type: "bus" or "prasadam" |
| `actionDetails` | string | Yes | Details about the redemption (e.g., "Bus 7", "prasadam Lunch") |
| `location` | string | Yes | Location identifier (e.g., "Bus 7" for bus, "Breakfast" for prasadam) |
| `scannerMemberId` | string | Yes | ID of the scanner performing the action |

### Response Schema
```json
{
  "success": "boolean",
  "message": "string (optional)"
}
```

### Response Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `success` | boolean | Whether the operation was successful |
| `message` | string | Success or error message |

### Business Logic
1. **Daypass Validation**: Verify daypass exists and is valid
2. **Permission Check**: Ensure scanner has permission for the action
3. **Status Validation**: 
   - For redeem: Check if already redeemed for this service
   - For unredeem: Check if currently redeemed for this service
4. **Action Processing**:
   - **Redeem**: Record redemption with timestamp and scanner details
   - **Unredeem**: Remove redemption record
5. **Audit Trail**: Log all redemption actions for tracking
6. **Conflict Resolution**: Handle edge cases and conflicts

### Validation Rules
- Cannot redeem if already redeemed for the same service
- Cannot unredeem if not currently redeemed
- Must have appropriate permissions for the service type
- Daypass must be valid for the current event
- Action details must be properly formatted

### Example Request (Redeem Bus)
```json
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

### Example Request (Redeem Prasadam)
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

### Example Request (Unredeem Prasadam)
```json
{
  "dayPassNumber": "DP-2025-001234", 
  "eventId": "USASadhuSanga2025",
  "action": "unredeem",
  "actionId": "prasadam",
  "actionDetails": "prasadam Breakfast",
  "location": "Breakfast",
  "scannerMemberId": "1001"
}
```

### Example Response (Success)
```json
{
  "success": true,
  "message": "Bus redemption successful"
}
```

### Example Response (Error)
```json
{
  "success": false,
  "message": "Daypass not found or already processed"
}
```

---
