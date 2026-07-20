import random
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Chat, Message, FriendRequest, UserProfile, OTP
from .serializers import (
    UserSerializer, ChatSerializer, MessageSerializer,
    RegisterSerializer, FriendRequestSerializer,
    ProfileUpdateSerializer, OTPSendSerializer,
    OTPVerifySerializer, ChangePasswordSerializer
)
from rest_framework.permissions import IsAuthenticated


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        current_user = self.request.user
        # Exclude current user, admin users
        users = User.objects.exclude(
            Q(id=current_user.id) | Q(is_superuser=True)
        )
        return users


class FriendRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FriendRequestSerializer

    def get_queryset(self):
        user = self.request.user
        return FriendRequest.objects.filter(
            Q(to_user=user) | Q(from_user=user)
        ).order_by('-created_at')

    def perform_create(self, serializer):
        to_user_id = self.request.data.get('to_user')
        to_user = User.objects.get(id=to_user_id)
        serializer.save(from_user=self.request.user, to_user=to_user)


class AcceptFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            friend_request = FriendRequest.objects.get(
                id=pk, to_user=request.user, is_accepted=False)
        except FriendRequest.DoesNotExist:
            raise NotFound('Friend request not found')

        friend_request.is_accepted = True
        friend_request.save()

        # Create chat between users
        chat, _ = Chat.objects.get_or_create(
            user1=friend_request.from_user,
            user2=friend_request.to_user
        )

        serializer = FriendRequestSerializer(friend_request)
        return Response(serializer.data)


class RejectFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            friend_request = FriendRequest.objects.get(
                id=pk, to_user=request.user, is_accepted=False)
        except FriendRequest.DoesNotExist:
            raise NotFound('Friend request not found')

        friend_request.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatSerializer

    def get_queryset(self):
        user = self.request.user
        # Only get chats where there's an accepted friend request
        accepted_requests = FriendRequest.objects.filter(
            Q(from_user=user, is_accepted=True) | Q(
                to_user=user, is_accepted=True)
        )
        chat_user_ids = set()
        for req in accepted_requests:
            if req.from_user == user:
                chat_user_ids.add(req.to_user.id)
            else:
                chat_user_ids.add(req.from_user.id)

        return Chat.objects.filter(
            Q(user1=user, user2_id__in=chat_user_ids) |
            Q(user2=user, user1_id__in=chat_user_ids)
        ).order_by('-created_at')


class MessageListView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_chat(self):
        chat_id = self.kwargs['chat_id']
        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            raise NotFound('Chat not found')

        # Verify the chat has an accepted friend request
        has_accepted = FriendRequest.objects.filter(
            Q(from_user=chat.user1, to_user=chat.user2, is_accepted=True) |
            Q(from_user=chat.user2, to_user=chat.user1, is_accepted=True)
        ).exists()

        if not has_accepted:
            raise PermissionDenied('You cannot message this user yet')

        if chat.user1 != self.request.user and chat.user2 != self.request.user:
            raise PermissionDenied('You don\'t have access to this chat')

        return chat

    def get_queryset(self):
        chat = self.get_chat()
        return Message.objects.filter(chat=chat).order_by('timestamp')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        chat = self.get_chat()
        serializer.save(chat=chat, sender=self.request.user)


class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            user_serializer = UserSerializer(request.user, context={'request': request})
            return Response(user_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OTPSendSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        otp_type = serializer.validated_data['otp_type']
        value = serializer.validated_data['value']

        # Generate a 6-digit OTP
        otp_code = str(random.randint(100000, 999999))

        # Store OTP
        OTP.objects.create(
            user=request.user,
            otp_code=otp_code,
            otp_type=otp_type
        )

        # In production, send via email/SMS here
        # For now, return OTP in response (dev mode)
        print(f"OTP for {request.user.username} ({otp_type}): {otp_code}")

        return Response({
            'message': f'OTP sent to your {otp_type}',
            'otp_code': otp_code,  # Remove in production!
            'otp_type': otp_type
        })


class OTPVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        otp_type = serializer.validated_data['otp_type']
        otp_code = serializer.validated_data['otp_code']

        # Find a matching, unused OTP from the last 10 minutes
        time_threshold = timezone.now() - timezone.timedelta(minutes=10)
        otp_obj = OTP.objects.filter(
            user=request.user,
            otp_type=otp_type,
            otp_code=otp_code,
            is_used=False,
            created_at__gte=time_threshold
        ).last()

        if not otp_obj:
            return Response({
                'error': 'Invalid or expired OTP'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save()

        # Update profile verification status
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if otp_type == 'email':
            profile.email_verified = True
        elif otp_type == 'phone':
            profile.phone_verified = True
        profile.save()

        return Response({
            'message': f'{otp_type.capitalize()} verified successfully',
            'email_verified': profile.email_verified,
            'phone_verified': profile.phone_verified
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(old_password):
            return Response({
                'old_password': ['Current password is incorrect']
            }, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Password changed successfully'
        })
