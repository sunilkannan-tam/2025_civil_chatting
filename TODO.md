# Admin User Management & Deployment Plan

## Backend
- [x] 1. Add `is_superuser` field to UserSerializer (so frontend can detect admins)
- [x] 2. Add AdminUserListView (list all users - superuser only)
- [x] 3. Add AdminDeleteUserView (delete user + profile + messages + chats + friend requests)
- [x] 4. Add admin routes to urls.py

## Frontend  
- [x] 5. Create AdminPanel component (user list, delete buttons, confirm dialog)
- [x] 6. Add admin route in App.jsx routing
- [x] 7. Add admin icon in sidebar (visible only to superusers)

## Testing & Deployment
- [x] 8. Test all use cases locally
- [x] 9. Push to GitHub master branch
- [x] 10. Render auto-deploys from master

