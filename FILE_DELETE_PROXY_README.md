# File Delete Proxy - SSH Workaround

## ⚠️ Important Notice

This is a **temporary workaround** to enable file deletion in the admin dashboard. The proper solution is to implement the `DELETE /admin/files` endpoint in the auth-service backend.

## What This Does

This Node.js proxy service provides a DELETE endpoint that the admin dashboard can call. When a file deletion request is received, it uses SSH to connect to your server and delete the file.

## Setup Instructions

### 1. Install Dependencies

```bash
cd /Users/rolflouisdor/Desktop/RMH-Real-Estate/Audio-admin
npm install express cors
```

### 2. Configure SSH Access

You need SSH access to your server. Choose one of these methods:

#### Option A: Use SSH Key (Recommended)
If you already have SSH key access:

```bash
# Test your SSH connection
ssh root@68.183.22.205 "echo 'SSH works'"
```

If this works, you're ready! The proxy will use `~/.ssh/id_rsa` by default.

#### Option B: Setup SSH Key
If you don't have SSH key access:

```bash
# Generate a key (if you don't have one)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

# Copy it to the server
ssh-copy-id root@68.183.22.205
```

### 3. Start the Proxy Service

```bash
node file-delete-proxy.js
```

The service will start on port 3001.

### 4. Update Frontend API Configuration

Update your frontend to use the proxy for file deletion:

Open `app.ts` and find the `API_BASE_URL` constant. Add a new constant for the delete proxy:

```typescript
const DELETE_PROXY_URL = 'http://localhost:3001';
```

Then update both delete functions to use this URL:

```typescript
// In deleteFile function:
const response = await fetch(`${DELETE_PROXY_URL}/admin/files`, {
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: filePath })
});

// In handleBulkDelete function:
const response = await fetch(`${DELETE_PROXY_URL}/admin/files`, {
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: file.path })
});
```

### 5. Test It

```bash
# In another terminal, test the proxy
curl -X DELETE http://localhost:3001/admin/files \
  -H "Content-Type: application/json" \
  -d '{"path":"audio/test_file.mp3"}'
```

## Environment Variables

You can customize the proxy with these environment variables:

```bash
# Custom SSH host
SSH_HOST=68.183.22.205 node file-delete-proxy.js

# Custom SSH user
SSH_USER=myuser node file-delete-proxy.js

# Custom SSH key path
SSH_KEY_PATH=/path/to/key node file-delete-proxy.js

# Custom port
PORT=8080 node file-delete-proxy.js
```

## Security Notes

1. **This runs locally** - The proxy runs on your machine, not on the server
2. **SSH credentials** - Uses your local SSH key, never exposed to the browser
3. **Path validation** - Only allows deletion from audio/, covers/, uploads/
4. **Directory protection** - Prevents directory traversal attacks
5. **No authentication** - The proxy itself has no auth (it's local only)

## When to Use This

✅ Use when:
- You need file deletion working NOW
- Backend developer is busy/unavailable
- Testing the admin dashboard features

❌ Don't use when:
- Going to production
- Backend can be updated easily
- Security is a primary concern

## Migration Path

Once the backend DELETE endpoint is implemented:

1. Stop the proxy service (Ctrl+C)
2. Revert frontend changes (use original API_BASE_URL)
3. Delete `file-delete-proxy.js`

## Troubleshooting

### "Permission denied" error
```bash
# Check SSH access
ssh root@68.183.22.205 "ls -la /opt/stream-audio-data/audio"
```

### "File not found" error
The file path might be wrong. Check the actual path on the server:
```bash
ssh root@68.183.22.205 "find /opt/stream-audio-data -name 'audio_11530.mp3'"
```

### Proxy won't start
Make sure port 3001 is not in use:
```bash
lsof -ti:3001
# If something is using it, kill it or use a different port
```

### CORS errors
The proxy already has CORS enabled. If you still see errors, check that you're using `http://localhost:3001` exactly.

## Alternative: Production Deployment

If you want to deploy this proxy to production (NOT recommended):

1. Deploy it to your server
2. Add nginx proxy configuration
3. Add proper authentication
4. Use environment variables for SSH connection

But seriously, just implement the backend endpoint instead. It's 50 lines of Go code! 😊
