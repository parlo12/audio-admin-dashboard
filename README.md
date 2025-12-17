# Audio Admin Dashboard

A modern, responsive admin dashboard for managing the Audio Platform. Built with TypeScript, HTML, and CSS.

🚀 **Deployed with CI/CD to DigitalOcean**

## Features

### 🔐 Authentication
- Secure admin login with JWT token
- Automatic token persistence in localStorage
- Admin privilege verification

### 📊 Overview Dashboard
- **Total Users** - Complete user count
- **Paid Users** - Premium subscribers
- **Free Users** - Free tier users
- **Active Users (7 days)** - Weekly engagement
- **New Users Today** - Daily signups
- **New Users This Week** - Weekly growth

### 👥 User Management
- **Paginated User List** - Browse all users with pagination (50 per page)
- **Advanced Filters**:
  - Search by username or email
  - Filter by account type (Free/Paid)
  - Filter by admin status
- **User Details**:
  - ID, Username, Email
  - Account type and admin status
  - Books read count
  - Last active timestamp
  - Created date
- **Admin Management** - Grant or revoke admin privileges

### 📈 Active Users Tracking
- View users active in custom time periods (1, 7, or 30 days)
- Activity metrics:
  - Total active users
  - Daily active count
  - Weekly active count
- Detailed user activity with days since last active

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **HTML5** - Semantic markup
- **CSS3** - Modern, responsive styling
- **Fetch API** - RESTful API integration

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Compile TypeScript**:
```bash
npm run build
```

3. **Serve the application**:
```bash
npm run serve
```

4. **Open in browser**:
Navigate to `http://localhost:8000`

### Development Mode

To automatically recompile TypeScript on changes:
```bash
npm run watch
```

## API Configuration

The dashboard connects to the Admin API at:
```
http://68.183.22.205:8080
```

To change the API endpoint, modify the `API_BASE_URL` constant in [app.ts](app.ts):
```typescript
const API_BASE_URL = 'http://your-api-url:port';
```

## Usage

### First Time Login

1. Create an admin user in the database:
```sql
UPDATE users SET is_admin = true WHERE email = 'your-admin@example.com';
```

2. Login with your admin credentials
3. The dashboard will verify admin privileges and display if authorized

### Dashboard Navigation

- **Overview Tab** - View platform statistics
- **Users Tab** - Manage all users with filters
- **Active Users Tab** - Monitor user engagement

### Managing Users

1. Go to the **Users** tab
2. Use filters to find specific users
3. Click **Make Admin** or **Revoke Admin** to manage privileges
4. Confirm the action in the modal

### Monitoring Activity

1. Go to the **Active Users** tab
2. Select time period (1, 7, or 30 days)
3. View active user metrics and detailed list

## File Structure

```
Audio-admin/
├── index.html       # Main HTML structure
├── styles.css       # All styling and responsive design
├── app.ts          # TypeScript application logic
├── app.js          # Compiled JavaScript (generated)
├── package.json    # Dependencies and scripts
├── tsconfig.json   # TypeScript configuration
├── admin.md        # API documentation
└── README.md       # This file
```

## Features Breakdown

### Authentication Flow
1. User enters credentials
2. POST to `/login` endpoint
3. Receive JWT token
4. Verify admin access via `/admin/stats`
5. Store token in localStorage
6. Show dashboard

### Data Loading
- **Lazy Loading** - Tabs load data only when activated
- **Pagination** - Users list supports navigation
- **Real-time Updates** - Refresh buttons for latest data
- **Error Handling** - User-friendly error messages

### Responsive Design
- Mobile-friendly layout
- Adaptive grid system
- Touch-optimized controls
- Collapsible navigation on small screens

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Security Considerations

1. **Token Storage** - JWT stored in localStorage (consider httpOnly cookies for production)
2. **HTTPS** - Use HTTPS in production
3. **Token Expiry** - Implement token refresh mechanism
4. **Input Validation** - Sanitize user inputs
5. **Rate Limiting** - Implement on API side

## Troubleshooting

### Login Failed
- Verify user has `is_admin = true` in database
- Check API endpoint is accessible
- Confirm credentials are correct

### Data Not Loading
- Check browser console for errors
- Verify token is valid
- Confirm API server is running

### CORS Issues
- Ensure API server has CORS headers configured
- Check browser console for CORS errors

## Future Enhancements

- [ ] Export user data to CSV
- [ ] User activity charts and graphs
- [ ] Email notifications for events
- [ ] Bulk user operations
- [ ] Advanced analytics dashboard
- [ ] Dark mode support
- [ ] User profile editing
- [ ] Audit log viewer

## License

MIT License - feel free to use and modify for your needs.

## Support

For issues or questions, please refer to the API documentation in [admin.md](admin.md).
# Deployment ready
