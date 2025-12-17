# Backend Auth Service Integration Issue

## Problem Summary

The auth service generates JWT tokens without the `is_admin` field, causing all admin endpoint requests to return 401 Unauthorized even though the user has admin privileges in the database.

## Evidence

### Current JWT Token Payload (Decoded)
```json
{
  "exp": 1766262155,
  "iat": 1766002955,
  "user_id": 5,
  "username": "rolf"
}
```
**Missing:** `"is_admin": true`

### Database Status
```sql
SELECT id, username, is_admin FROM users WHERE username='rolf';

 id | username | is_admin 
----+----------+----------
  5 | rolf     | t        
```
✅ User `rolf` has `is_admin = true` in the database

### Observed Behavior
1. Login request succeeds (200 OK) - token is generated
2. Immediately after, GET `/admin/stats` fails with 401 Unauthorized
3. Server logs show: "✅ User rolf logged in" followed by 401 on admin endpoints
4. The admin endpoints are checking the JWT token for admin status, not querying the database

## Status Update

### ✅ COMPLETED: JWT Token Generation
The JWT token now correctly includes `is_admin: true`:
```json
{
  "exp": 1766263144,
  "iat": 1766003944,
  "is_admin": true,  // ✅ NOW PRESENT
  "user_id": 5,
  "username": "rolf"
}
```

### ❌ REMAINING ISSUE: Admin Middleware Validation
The admin endpoints still return 401 Unauthorized even though the token contains `is_admin: true`. The issue is now in the **admin middleware** that validates the JWT claims.

## Required Fix

### Location 1: JWT Token Generation (COMPLETED ✅)
~~Update the JWT token generation in the auth service (likely in the login handler).~~

### Code Change 1 (COMPLETED ✅)
~~Add `is_admin` to the JWT claims map when creating tokens:~~

### Code Change 1 (COMPLETED ✅)
~~Add `is_admin` to the JWT claims map when creating tokens:~~

```go
// ✅ This is now correct
claims := jwt.MapClaims{
    "user_id": user.ID,
    "username": user.Username,
    "is_admin": user.IsAdmin,  // ✅ NOW INCLUDED
    "exp": time.Now().Add(72 * time.Hour).Unix(),
    "iat": time.Now().Unix(),
}
```

### Location 2: Admin Middleware Validation (NEEDS FIX ❌)
Find the middleware function that validates admin access for protected routes (likely called `AdminRequired`, `RequireAdmin`, or similar).

### Code Change 2 Needed
The middleware needs to properly extract and validate the `is_admin` claim from the JWT token:

```go
// Example of what might be wrong:
func AdminMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get claims from context (already validated by auth middleware)
        claims, exists := c.Get("claims")
        if !exists {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }
        
        // THIS PART NEEDS TO BE CHECKED:
        claimsMap := claims.(jwt.MapClaims)
        
        // Check if is_admin exists and is true
        isAdmin, ok := claimsMap["is_admin"]
        if !ok {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }
        
        // IMPORTANT: Check the type - it should be bool, not string
        if adminBool, ok := isAdmin.(bool); !ok || !adminBool {
            c.JSON(403, gin.H{"error": "Admin access required"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

### Common Issues to Check:
1. **Type mismatch**: Middleware checking for `is_admin` as a string `"true"` instead of boolean `true`
2. **Wrong claim name**: Middleware looking for `"admin"` or `"isAdmin"` instead of `"is_admin"`
3. **Claims not in context**: JWT validation middleware not setting claims in the Gin context
4. **Wrong response code**: Should return 403 Forbidden (not 401 Unauthorized) when user is authenticated but not admin

## Evidence

### Database Connection
- **Host:** `private-streaming-db-do-user-15814952-0.k.db.ondigitalocean.com`
- **Port:** `25060`
- **Database:** `defaultdb`
- **User:** `doadmin`
- **Password:** `[REDACTED - use environment variable]`
- **SSL Mode:** `require`

### Docker Container
- **Container Name:** `stream-audio-auth-service-1`
- **Network:** `stream-audio_default`

### Test Credentials
- **Username:** `rolf`
- **Password:** `password`
- **User ID:** `5`
- **Is Admin:** `true` (in database)

## Testing After Fix

### 1. Test Token Generation
```bash
# Get a new token
TOKEN=$(curl -s -X POST http://68.183.22.205/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rolf","password":"password"}' | jq -r '.token')

# Decode the JWT payload (should now include is_admin: true)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq
```

Expected output should include:
```json
{
  "user_id": 5,
  "username": "rolf",
  "is_admin": true,  // ← Should be present
  "exp": 1766262155,
  "iat": 1766002955
}
```

### 2. Test Admin Endpoint Access
```bash
# Test admin stats endpoint
curl -X GET http://68.183.22.205/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `200 OK` with stats data (not 401 Unauthorized)

## Additional Notes

- The frontend admin dashboard is already correctly handling tokens and sending them in Authorization headers
- The database schema is correct with the `is_admin` boolean field
- No frontend changes are required once the backend is fixed
- After deployment, restart the auth service container: `docker restart stream-audio-auth-service-1`

## API Endpoints That Require Admin Access

From the admin dashboard implementation, these endpoints all check for admin status:

- `GET /admin/stats` - Dashboard statistics
- `GET /admin/users` - List all users with pagination and filters
- `GET /admin/users/active` - Get active users within specified days
- `POST /admin/users/:id/admin` - Toggle admin status for a user

All these endpoints will fail with 401 until the JWT token includes the `is_admin` claim.
