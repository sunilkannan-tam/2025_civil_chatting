from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('verify-registration-email/', views.RegistrationOTPVerifyView.as_view(), name='verify-registration-email'),
    path('resend-registration-otp/', views.ResendRegistrationOTPView.as_view(), name='resend-registration-otp'),
    path('user/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('friend-requests/', views.FriendRequestListCreateView.as_view(),
         name='friend-request-list'),
    path('friend-requests/<int:pk>/accept/',
         views.AcceptFriendRequestView.as_view(), name='accept-friend-request'),
    path('friend-requests/<int:pk>/reject/',
         views.RejectFriendRequestView.as_view(), name='reject-friend-request'),
    path('chats/', views.ChatListView.as_view(), name='chat-list'),
    path('chats/<int:chat_id>/messages/',
         views.MessageListView.as_view(), name='message-list'),
    # Profile & OTP routes
    path('profile/update/', views.ProfileUpdateView.as_view(), name='profile-update'),
    path('profile/send-otp/', views.OTPSendView.as_view(), name='send-otp'),
    path('profile/verify-otp/', views.OTPVerifyView.as_view(), name='verify-otp'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),

    # Admin routes
    path('admin/users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/delete/', views.AdminDeleteUserView.as_view(), name='admin-delete-user'),

    # Call routes
    path('calls/initiate/', views.InitiateCallView.as_view(), name='initiate-call'),
    path('calls/<int:call_id>/update/', views.UpdateCallStatusView.as_view(), name='update-call-status'),
    path('calls/history/', views.CallHistoryListView.as_view(), name='call-history'),
    path('admin/calls/history/', views.AdminCallHistoryListView.as_view(), name='admin-call-history'),

    # Forgot password routes
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),

    # Message delete route
    path('messages/<int:pk>/delete/', views.MessageDeleteView.as_view(), name='delete-message'),
]
