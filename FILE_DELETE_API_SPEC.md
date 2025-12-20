# File Deletion API Endpoint Specification

## Overview
Add a DELETE endpoint to the auth service that allows admins to delete individual files from the server. This is required for the admin dashboard's file management features.

## Endpoint Details

### Route
```
DELETE /admin/files
```

### Authentication
- Requires JWT authentication
- Requires admin privileges (`is_admin: true`)

### Request Format
```json
{
  "path": "audio/audio_11530.mp3"
}
```

The `path` should be a relative path from one of the allowed base directories.

### Response Format

#### Success (200 OK)
```json
{
  "message": "File deleted successfully",
  "path": "audio/audio_11530.mp3"
}
```

#### Error (400 Bad Request)
```json
{
  "error": "Invalid file path"
}
```

#### Error (403 Forbidden)
```json
{
  "error": "Access denied: path outside allowed directories"
}
```

#### Error (404 Not Found)
```json
{
  "error": "File not found"
}
```

#### Error (500 Internal Server Error)
```json
{
  "error": "Failed to delete file: [error details]"
}
```

## Implementation Details

### 1. Add Request Struct
```go
// DeleteFileRequest represents the request to delete a file
type DeleteFileRequest struct {
	Path string `json:"path" binding:"required"`
}
```

### 2. Add Handler Function
```go
// deleteFileHandler deletes a specified file
// DELETE /admin/files
func deleteFileHandler(c *gin.Context) {
	var req DeleteFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate path is not empty
	if strings.TrimSpace(req.Path) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File path is required"})
		return
	}

	// Security: Only allow deletion from specific directories
	allowedPrefixes := []string{"audio/", "covers/", "uploads/"}
	hasValidPrefix := false
	for _, prefix := range allowedPrefixes {
		if strings.HasPrefix(req.Path, prefix) {
			hasValidPrefix = true
			break
		}
	}

	if !hasValidPrefix {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied: can only delete files in audio/, covers/, or uploads/ directories",
		})
		return
	}

	// Prevent directory traversal attacks
	if strings.Contains(req.Path, "..") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid path: directory traversal not allowed"})
		return
	}

	// Construct full file path
	fullPath := filepath.Join("/app", req.Path)

	// Check if file exists
	fileInfo, err := os.Stat(fullPath)
	if os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to access file: %v", err)})
		return
	}

	// Prevent deletion of directories
	if fileInfo.IsDir() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete directories, only files"})
		return
	}

	// Delete the file
	if err := os.Remove(fullPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to delete file: %v", err)})
		return
	}

	log.Printf("Admin deleted file: %s", req.Path)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
		"path":    req.Path,
	})
}
```

### 3. Register Route
Add this route registration in the admin routes section:

```go
admin.DELETE("/files", deleteFileHandler)
```

### 4. Required Imports
Ensure these imports are present:

```go
import (
	// ... existing imports ...
	"os"
	"path/filepath"
	"strings"
)
```

## Security Considerations

1. **Path Validation**: Only allows deletion from `audio/`, `covers/`, and `uploads/` directories
2. **Directory Traversal Prevention**: Blocks paths containing `..`
3. **Directory Protection**: Prevents deletion of directories, only files
4. **Authentication**: Requires admin JWT token (enforced by route group middleware)
5. **File System Path**: Uses `/app/` as base path (container mount point)

## Docker Volume Requirements

The auth-service container must have **read-write** access to these volumes:

```yaml
volumes:
  - content-audio-persistent:/app/audio
  - content-covers-persistent:/app/covers
  - /opt/stream-audio-data/uploads:/app/uploads
```

**Important**: Do NOT use `:ro` (read-only) flag on these volumes.

## File Location
- **Service**: `auth-service`
- **File**: `/opt/stream-audio/stream-audio/auth-service/main.go`

## Testing

### Test single file deletion
```bash
# Get admin token
TOKEN=$(curl -s -X POST http://68.183.22.205/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.token')

# Delete a file
curl -X DELETE http://68.183.22.205/api/admin/files \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path":"audio/test_file.mp3"}'
```

### Expected Responses

**Success:**
```json
{"message":"File deleted successfully","path":"audio/test_file.mp3"}
```

**File not found:**
```json
{"error":"File not found"}
```

**Invalid path:**
```json
{"error":"Access denied: can only delete files in audio/, covers/, or uploads/ directories"}
```

## Frontend Integration

The frontend calls this endpoint like this:

```typescript
const response = await fetch(`${API_BASE_URL}/admin/files`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${appState.getToken()}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: filePath })
});
```

Where `filePath` is the relative path like `"audio/audio_11530.mp3"`.

## Notes
- The endpoint works with paths relative to `/app/` (container base)
- Paths must start with `audio/`, `covers/`, or `uploads/`
- Only individual files can be deleted, not directories
- All deletions are logged for audit purposes
- The endpoint is already being called by the frontend but needs backend implementation
