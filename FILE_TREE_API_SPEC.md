# File Tree API Endpoint Specification

## Overview
Add a new API endpoint to the auth service that returns a tree structure of all audio files on the server. This allows the admin dashboard to display files and visually confirm deletions.

## Endpoint Details

### Route
```
GET /admin/files/tree
```

### Authentication
- Requires JWT authentication
- Requires admin privileges (`is_admin: true`)

### Response Format
```json
{
  "tree": {
    "name": "audio",
    "path": "",
    "isDir": true,
    "children": [
      {
        "name": "user_123",
        "path": "user_123",
        "isDir": true,
        "children": [
          {
            "name": "book_456",
            "path": "user_123/book_456",
            "isDir": true,
            "children": [
              {
                "name": "audio_789.mp3",
                "path": "user_123/book_456/audio_789.mp3",
                "isDir": false,
                "size": 1048576
              }
            ]
          }
        ]
      }
    ]
  },
  "root": "/opt/stream-audio-data/audio"
}
```

## Implementation Details

### 1. Add Struct Definition
Add this struct definition near the top of the file with other structs:

```go
// FileTreeNode represents a file or directory in the tree
type FileTreeNode struct {
	Name     string          `json:"name"`
	Path     string          `json:"path"`
	IsDir    bool            `json:"isDir"`
	Size     int64           `json:"size,omitempty"`
	Children []*FileTreeNode `json:"children,omitempty"`
}
```

### 2. Add Handler Function
Add this handler function (place it near other admin handlers):

```go
// getFileTreeHandler returns the directory tree structure for audio files
// GET /admin/files/tree
func getFileTreeHandler(c *gin.Context) {
	// Base audio directory
	audioDir := "/opt/stream-audio-data/audio"
	
	// Check if directory exists
	if _, err := os.Stat(audioDir); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Audio directory not found"})
		return
	}
	
	// Build the tree
	tree, err := buildFileTree(audioDir, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to build file tree: %v", err)})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"tree": tree,
		"root": audioDir,
	})
}
```

### 3. Add Helper Function
Add this recursive helper function:

```go
// buildFileTree recursively builds a file tree structure
func buildFileTree(basePath string, relativePath string) (*FileTreeNode, error) {
	fullPath := filepath.Join(basePath, relativePath)
	
	info, err := os.Stat(fullPath)
	if err != nil {
		return nil, err
	}
	
	node := &FileTreeNode{
		Name:  info.Name(),
		Path:  relativePath,
		IsDir: info.IsDir(),
	}
	
	if !info.IsDir() {
		node.Size = info.Size()
		return node, nil
	}
	
	// Read directory contents
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}
	
	// Build children
	node.Children = make([]*FileTreeNode, 0, len(entries))
	for _, entry := range entries {
		childPath := filepath.Join(relativePath, entry.Name())
		child, err := buildFileTree(basePath, childPath)
		if err != nil {
			log.Printf("Warning: Failed to process %s: %v", childPath, err)
			continue
		}
		node.Children = append(node.Children, child)
	}
	
	// Sort children: directories first, then files, alphabetically
	sort.Slice(node.Children, func(i, j int) bool {
		if node.Children[i].IsDir != node.Children[j].IsDir {
			return node.Children[i].IsDir
		}
		return node.Children[i].Name < node.Children[j].Name
	})
	
	return node, nil
}
```

### 4. Register Route
Add this route registration in the admin routes section (near other `admin.DELETE` and `admin.GET` routes):

```go
admin.GET("/files/tree", getFileTreeHandler)
```

### 5. Add Required Imports
Ensure these imports are present at the top of the file:

```go
import (
	// ... existing imports ...
	"path/filepath"
	"sort"
)
```

## File Location
- **Service**: `auth-service`
- **File**: `/opt/stream-audio/stream-audio/auth-service/main.go`

## Testing
After implementing, test with:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  http://68.183.22.205/api/admin/files/tree
```

## Notes
- The endpoint reads from `/opt/stream-audio-data/audio` directory
- Files are sorted with directories first, then alphabetically
- The tree structure is recursive and includes all subdirectories
- File sizes are returned in bytes
- Empty directories will have an empty `children` array
- The endpoint requires admin authentication (enforced by the `admin` route group middleware)
