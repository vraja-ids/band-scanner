# Band Scanner - Technical Implementation Specification

## API Implementation Details

### 1. Login Scanner API Implementation

#### Request Flow
```
Mobile App → Backend API → Database → Response
```

#### Backend Implementation Steps
1. **Input Validation**
   ```javascript
   // Validate required fields
   if (!eventId) return { error: "eventId is required" };
   
   // Validate memberId OR tagId (not both)
   if (!memberId && !tagId) return { error: "memberId or tagId required" };
   if (memberId && tagId) return { error: "Provide either memberId or tagId" };
   ```

2. **Authentication Logic**
   ```javascript
   // If memberId provided - direct user login
   if (memberId) {
     user = await getUserByMemberId(memberId);
   }
   
   // If tagId provided - scan someone else's tag
   if (tagId) {
     user = await getUserByTagId(tagId);
   }
   ```

3. **Permission Calculation**
   ```javascript
   // Get user's base permissions
   const basePermissions = await getUserPermissions(user.id);
   
   // Get event-specific permissions
   const eventPermissions = await getEventPermissions(eventId, user.id);
   
   // Merge and filter active permissions
   const activePermissions = mergePermissions(basePermissions, eventPermissions);
   ```

4. **Event Capabilities**
   ```javascript
   // Determine available scan types for this event
   const eventConfig = await getEventConfiguration(eventId);
   const availableScans = eventConfig.scanTypes; // ["Meals", "Gifts", etc.]
   ```

#### Database Queries
```sql
-- Get user by member ID
SELECT * FROM users WHERE external_member_id = ? AND is_active = 1;

-- Get user by tag ID  
SELECT u.* FROM users u 
JOIN user_tags ut ON u.id = ut.user_id 
WHERE ut.tag_id = ? AND ut.is_active = 1;

-- Get user permissions for event
SELECT p.permission_key FROM user_permissions p
WHERE p.member_id = ? AND p.event_id = ? AND p.is_active = 1;

-- Get event configuration
SELECT scan_types FROM events WHERE event_id = ? AND is_active = 1;
```

---

### 2. Daypass Status API Implementation

#### Request Flow
```
Mobile App → Backend API → Daypass Service → Database → Response
```

#### Backend Implementation Steps
1. **Daypass Validation**
   ```javascript
   // Validate daypass exists and is active
   const daypass = await getDaypassByNumber(dayPassNumber, eventId);
   if (!daypass) return { error: "Daypass not found" };
   if (!daypass.is_active) return { error: "Daypass is inactive" };
   ```

2. **Permission Check**
   ```javascript
   // Check if scanner has permission to view this daypass
   const hasPermission = await checkScannerPermission(scannerMemberId, 'daypass_view');
   if (!hasPermission) return { error: "Insufficient permissions" };
   ```

3. **Status Aggregation**
   ```javascript
   // Get all redemptions for this daypass
   const redemptions = await getDaypassRedemptions(dayPassNumber, eventId);
   
   // Calculate status
   const busRedemption = redemptions.find(r => r.service_type === 'bus' && r.action === 'redeem');
   const prasadamRedemption = redemptions.find(r => r.service_type === 'prasadam' && r.action === 'redeem');
   
   const status = (busRedemption || prasadamRedemption) ? 'redeemed' : 'active';
   ```

#### Database Queries
```sql
-- Get daypass details
SELECT * FROM daypasses 
WHERE daypass_number = ? AND event_id = ? AND is_active = 1;

-- Get redemption history
SELECT service_type, action, action_details, created_at 
FROM daypass_redemptions 
WHERE daypass_number = ? AND event_id = ?
ORDER BY created_at DESC;

-- Check scanner permissions
SELECT COUNT(*) FROM user_permissions 
WHERE member_id = ? AND permission_key = 'canScanDaypassBus' 
AND event_id = ? AND is_active = 1;
```

---

### 3. Update Daypass Status API Implementation

#### Request Flow
```
Mobile App → Backend API → Validation → Database Transaction → Response
```

#### Backend Implementation Steps
1. **Pre-validation**
   ```javascript
   // Validate daypass exists
   const daypass = await getDaypassByNumber(dayPassNumber, eventId);
   if (!daypass) return { error: "Daypass not found" };
   
   // Validate action parameters
   if (!['redeem', 'unredeem'].includes(action)) return { error: "Invalid action" };
   if (!['bus', 'prasadam'].includes(actionId)) return { error: "Invalid actionId" };
   ```

2. **Permission Validation**
   ```javascript
   // Check specific permission for service type
   const permissionKey = `canScanDaypass${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`;
   const hasPermission = await checkScannerPermission(scannerMemberId, permissionKey);
   if (!hasPermission) return { error: "Insufficient permissions" };
   ```

3. **Business Logic Validation**
   ```javascript
   // Get current redemption status
   const currentRedemption = await getCurrentRedemption(dayPassNumber, eventId, actionId);
   
   if (action === 'redeem') {
     if (currentRedemption) return { error: "Already redeemed for this service" };
   } else if (action === 'unredeem') {
     if (!currentRedemption) return { error: "Not currently redeemed for this service" };
   }
   ```

4. **Database Transaction**
   ```javascript
   await db.transaction(async (trx) => {
     // Insert redemption record
     await trx('daypass_redemptions').insert({
       daypass_number: dayPassNumber,
       event_id: eventId,
       service_type: actionId,
       action: action,
       action_details: actionDetails,
       scanner_member_id: scannerMemberId,
       created_at: new Date()
     });
     
     // Update daypass status if needed
     if (action === 'redeem') {
       await trx('daypasses').where({ daypass_number: dayPassNumber })
         .update({ last_redemption_at: new Date() });
     }
   });
   ```

#### Database Queries
```sql
-- Check current redemption status
SELECT * FROM daypass_redemptions 
WHERE daypass_number = ? AND event_id = ? AND service_type = ?
AND action = 'redeem' AND created_at = (
  SELECT MAX(created_at) FROM daypass_redemptions 
  WHERE daypass_number = ? AND event_id = ? AND service_type = ?
);

-- Insert redemption record
INSERT INTO daypass_redemptions 
(daypass_number, event_id, service_type, action, action_details, scanner_member_id, created_at)
VALUES (?, ?, ?, ?, ?, ?, NOW());

-- Update daypass last redemption time
UPDATE daypasses 
SET last_redemption_at = NOW() 
WHERE daypass_number = ? AND event_id = ?;
```

---

## Error Handling Implementation

### Standard Error Response Format
```javascript
const createErrorResponse = (code, message, details = null) => ({
  success: false,
  error: {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  }
});
```

### Common Error Scenarios
```javascript
// Validation errors
if (!requiredField) {
  return createErrorResponse('VALIDATION_ERROR', 'Required field missing');
}

// Permission errors
if (!hasPermission) {
  return createErrorResponse('PERMISSION_DENIED', 'Insufficient permissions');
}

// Business logic errors
if (alreadyRedeemed) {
  return createErrorResponse('BUSINESS_LOGIC_ERROR', 'Already redeemed for this service');
}

// System errors
try {
  // Database operation
} catch (error) {
  return createErrorResponse('SYSTEM_ERROR', 'Internal server error');
}
```

---

## Security Implementation

### 1. Authentication Middleware
```javascript
const authenticateRequest = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Token required'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Invalid token'));
  }
};
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const scannerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: createErrorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests')
});
```

### 3. Input Sanitization
```javascript
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};
```

---

## Performance Considerations

### 1. Database Indexing
```sql
-- Indexes for optimal performance
CREATE INDEX idx_daypass_redemptions_lookup ON daypass_redemptions(daypass_number, event_id);
CREATE INDEX idx_user_permissions_lookup ON user_permissions(member_id, event_id);
CREATE INDEX idx_users_external_id ON users(external_member_id);
CREATE INDEX idx_user_tags_lookup ON user_tags(tag_id);
```

### 2. Caching Strategy
```javascript
// Cache event configurations
const getEventConfig = async (eventId) => {
  const cacheKey = `event_config_${eventId}`;
  let config = await redis.get(cacheKey);
  
  if (!config) {
    config = await db('events').where({ event_id: eventId }).first();
    await redis.setex(cacheKey, 3600, JSON.stringify(config)); // 1 hour cache
  }
  
  return JSON.parse(config);
};
```

### 3. Response Optimization
```javascript
// Only return necessary fields
const optimizeResponse = (data) => {
  return {
    scannerLoginResponse: {
      memberId: data.memberId,
      legalName: data.legalName,
      spiritualName: data.spiritualName,
      memberPermissions: data.permissions,
      scansInThisEvent: data.eventScans
    }
  };
};
```

---

## Testing Scenarios

### 1. Login Scanner Test Cases
```javascript
describe('Login Scanner API', () => {
  test('should login with valid memberId', async () => {
    const response = await request(app)
      .post('/api/loginScanner')
      .send({
        memberId: 'EXT-12345',
        eventId: 'USASadhuSanga2025'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.scannerLoginResponse.memberId).toBeDefined();
  });
  
  test('should fail with invalid eventId', async () => {
    const response = await request(app)
      .post('/api/loginScanner')
      .send({
        memberId: 'EXT-12345',
        eventId: 'INVALID_EVENT'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
  });
});
```

### 2. Daypass Status Test Cases
```javascript
describe('Daypass Status API', () => {
  test('should return active status for new daypass', async () => {
    const response = await request(app)
      .get('/api/getDaypassStatus')
      .query({
        dayPassNumber: 'DP-2025-001234',
        eventId: 'USASadhuSanga2025',
        scannerMemberId: '1001'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('active');
    expect(response.body.statusDetails.bus).toBe('');
  });
});
```

---

## Deployment Considerations

### 1. Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=band_scanner
DB_USER=scanner_user
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Health Check Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION
  });
});
```

### 3. Monitoring
```javascript
// Log all API calls
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});
```

