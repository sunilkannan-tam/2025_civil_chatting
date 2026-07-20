# TODO: Account Settings with OTP Verification

## Backend
- [x] 1. Update UserProfile model (phone_number, email_verified, phone_verified)
- [x] 2. Create OTP model (user, otp_code, type, created_at, is_used)
- [x] 3. Create migrations
- [x] 4. Update admin.py (register OTP model, show new UserProfile fields)
- [x] 5. Update serializers.py (OTP serializers, ProfileUpdateSerializer)
- [x] 6. Create OTP views (send/verify for email and phone)
- [x] 7. Create ProfileUpdateView
- [x] 8. Update urls.py with new routes
- [x] 9. Run migrations

## Frontend
- [x] 10. Add Settings component to App.jsx
- [x] 11. Add /settings route
- [x] 12. Add settings icon to sidebar
- [x] 13. Add Settings styles to App.css
- [x] 14. Test all use cases

## Git
- [x] 15. Commit and push to GitHub

