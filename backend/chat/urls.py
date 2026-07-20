from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
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
]
