import os
import random
import logging
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from .models import Chat, Message, FriendRequest, UserProfile, OTP, Call, CallHistory
from .serializers import (
    UserSerializer, ChatSerializer, MessageSerializer,
    RegisterSerializer, FriendRequestSerializer,
    ProfileUpdateSerializer, OTPSendSerializer,
    OTPVerifySerializer, ChangePasswordSerializer,
    CallSerializer, CallHistorySerializer
)
from .utils import send_email_otp, send_sms_otp
from rest_framework.permissions import IsAuthenticated

from_email_env = __import__('os').getenv('FROM_EMAIL', '')

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-generate email OTP for registration verification
        otp_code = str(random.randint(100000, 999999))
        OTP.objects.create(
            user=user,
            otp_code=otp_code,
            otp_type='email'
        )

        # Send OTP to user's email
        sent = send_email_otp(user.email, otp_code, username=user.username)
        if sent:
            logger.info(f"Registration OTP email sent to {user.email}")
            otp_to_return = None
        else:
            logger.info(f"Registration OTP for {user.username}: {otp_code}")
            otp_to_return = otp_code

        return Response({
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'message': 'Account created! Please verify your email.',
            'otp_code': otp_to_return,  # Only returned in dev mode if email sending failed
        }, status=status.HTTP_201_CREATED)


class RegistrationOTPVerifyView(APIView):
    """
    Verify email OTP during registration. Accessible without authentication.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        otp_code = request.data.get('otp_code')

        if not user_id or not otp_code:
            return Response({'error': 'user_id and otp_code are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Find a matching, unused email OTP from the last 10 minutes
        time_threshold = timezone.now() - timezone.timedelta(minutes=10)
        otp_obj = OTP.objects.filter(
            user=user,
            otp_type='email',
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

        # Mark email as verified
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.email_verified = True
        profile.save()

        return Response({
            'message': 'Email verified successfully! You can now log in.',
            'email_verified': True
        })


class ResendRegistrationOTPView(APIView):
    """
    Resend email OTP during registration. Accessible without authentication.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id')
        email = request.data.get('email')

        if not user_id or not email:
            return Response({'error': 'user_id and email are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id, email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Invalidate any previous unused registration OTPs for this user
        OTP.objects.filter(
            user=user,
            otp_type='email',
            is_used=False
        ).update(is_used=True)

        # Generate new OTP
        otp_code = str(random.randint(100000, 999999))
        OTP.objects.create(
            user=user,
            otp_code=otp_code,
            otp_type='email'
        )

        # Send OTP
        sent = send_email_otp(user.email, otp_code, username=user.username)
        if sent:
            logger.info(f"Registration OTP resent to {user.email}")
        else:
            logger.info(f"Resent registration OTP for {user.username}: {otp_code}")

        return Response({
            'message': 'OTP resent to your email' if sent else 'Email service not configured',
            'otp_code': otp_code if not sent else None,
        })


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
        country_code = serializer.validated_data.get('country_code', '+91')

        # Generate a 6-digit OTP
        otp_code = str(random.randint(100000, 999999))

        # Store OTP
        OTP.objects.create(
            user=request.user,
            otp_code=otp_code,
            otp_type=otp_type
        )

        # Try to send OTP via real channel
        sent = False
        if otp_type == 'email':
            sent = send_email_otp(value, otp_code, username=request.user.username)
        elif otp_type == 'phone':
            sent = send_sms_otp(value, otp_code, country_code=country_code)

        # Log for debugging
        if sent:
            logger.info(f"OTP sent successfully to {request.user.username} via {otp_type}")
        else:
            logger.info(f"OTP for {request.user.username} ({otp_type}): {otp_code}")

        return Response({
            'message': f'OTP sent to your {otp_type}',
            'otp_code': otp_code if not sent else None,  # Only return in dev mode if sending failed
            'otp_type': otp_type,
            'sent_via': otp_type if sent else 'console'
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


class AdminUserListView(APIView):
    """
    List all users in the system. Admin-only (superuser).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.all().order_by('username')
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)


class AdminDeleteUserView(APIView):
    """
    Delete a user and all associated data. Admin-only (superuser).
    Cannot delete yourself.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        if request.user.id == pk:
            return Response({'error': 'You cannot delete yourself'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_to_delete = User.objects.get(id=pk)
        except User.DoesNotExist:
            raise NotFound('User not found')

        # Prevent deleting other superusers
        if user_to_delete.is_superuser:
            return Response({'error': 'Cannot delete another admin user'}, status=status.HTTP_403_FORBIDDEN)

        username = user_to_delete.username

        # Delete all associated data
        UserProfile.objects.filter(user=user_to_delete).delete()
        OTP.objects.filter(user=user_to_delete).delete()
        FriendRequest.objects.filter(Q(from_user=user_to_delete) | Q(to_user=user_to_delete)).delete()
        Message.objects.filter(sender=user_to_delete).delete()
        Chat.objects.filter(Q(user1=user_to_delete) | Q(user2=user_to_delete)).delete()

        # Delete the user
        user_to_delete.delete()

        return Response({
            'message': f'User "{username}" has been deleted successfully'
        }, status=status.HTTP_200_OK)


class InitiateCallView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        call_type = request.data.get('call_type', 'audio')

        if not receiver_id:
            return Response({'error': 'receiver_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        if call_type not in ['audio', 'video']:
            return Response({'error': 'call_type must be audio or video'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'Receiver not found'}, status=status.HTTP_404_NOT_FOUND)

        # Create call record
        call = Call.objects.create(
            caller=request.user,
            receiver=receiver,
            call_type=call_type,
            status='initiated'
        )

        # Create call history entries
        CallHistory.objects.create(user=request.user, call=call, action='initiated')
        CallHistory.objects.create(user=receiver, call=call, action='initiated')

        serializer = CallSerializer(call, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UpdateCallStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, call_id):
        try:
            call = Call.objects.get(id=call_id)
        except Call.DoesNotExist:
            return Response({'error': 'Call not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status is required'}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = ['ringing', 'accepted', 'rejected', 'missed', 'ended']
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Update call status
        call.status = new_status
        if new_status in ['ended', 'rejected', 'missed']:
            call.ended_at = timezone.now()
            if call.started_at:
                call.duration = int((call.ended_at - call.started_at).total_seconds())
        call.save()

        # Create history entry for the current user
        CallHistory.objects.create(user=request.user, call=call, action=new_status)

        serializer = CallSerializer(call, context={'request': request})
        return Response(serializer.data)


class CallHistoryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CallHistorySerializer

    def get_queryset(self):
        user = self.request.user
        # Get all call history where user is either caller or receiver
        return CallHistory.objects.filter(
            Q(call__caller=user) | Q(call__receiver=user)
        ).select_related('call', 'call__caller', 'call__receiver').order_by('-timestamp')


class ForgotPasswordView(APIView):
    """
    Send OTP to user's email for password reset.
    No authentication required.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User with this email not found'}, status=status.HTTP_404_NOT_FOUND)

        # Generate OTP for password reset
        otp_code = str(random.randint(100000, 999999))
        OTP.objects.create(
            user=user,
            otp_code=otp_code,
            otp_type='email'
        )

        # Send OTP via email
        sent = send_email_otp(user.email, otp_code, username=user.username)
        if sent:
            logger.info(f"Password reset OTP sent to {user.email}")
        else:
            logger.info(f"Password reset OTP for {user.username}: {otp_code}")

        # Return otp_code when email was not actually sent (no SMTP configured)
        response_data = {'message': 'OTP sent to your email' if sent else 'Email service not configured'}
        if not sent:
            response_data['otp_code'] = otp_code
        return Response(response_data)


class ResetPasswordView(APIView):
    """
    Verify OTP and reset password.
    No authentication required.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp_code')
        new_password = request.data.get('new_password')

        if not email or not otp_code or not new_password:
            return Response({
                'error': 'Email, OTP code, and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Find matching OTP
        time_threshold = timezone.now() - timezone.timedelta(minutes=10)
        otp_obj = OTP.objects.filter(
            user=user,
            otp_type='email',
            otp_code=otp_code,
            is_used=False,
            created_at__gte=time_threshold
        ).last()

        if not otp_obj:
            return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate password
        try:
            validate_password(new_password)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save()

        # Reset password
        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password reset successfully! You can now log in.'})


class MessageDeleteView(APIView):
    """
    Delete a message for sender (unsend) or receiver.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            message = Message.objects.get(id=pk)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if user is part of the chat
        if message.chat.user1 != request.user and message.chat.user2 != request.user:
            return Response({'error': 'You do not have access to this message'}, status=status.HTTP_403_FORBIDDEN)

        # Determine if user is sender or receiver
        if message.sender == request.user:
            # Sender unsend - hide from both users
            message.deleted_by_sender = True
            message.deleted_by_receiver = True  # Hide from receiver too
        else:
            # Receiver delete - hide for receiver only
            message.deleted_by_receiver = True

        message.save()
        return Response({'message': 'Message deleted successfully'})


class AdminCallHistoryListView(APIView):
    """
    Admin-only view to see all call history in the system.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        call_history = CallHistory.objects.all().select_related(
            'call', 'call__caller', 'call__receiver', 'user'
        ).order_by('-timestamp')

        serializer = CallHistorySerializer(call_history, many=True, context={'request': request})
        return Response(serializer.data)


class TestEmailView(APIView):
    """
    Test email sending via any configured HTTP email API.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'email is required'}, status=status.HTTP_400_BAD_REQUEST)

        provider = os.getenv('EMAIL_PROVIDER', 'resend')
        from_email = os.getenv('FROM_EMAIL', '')
        if provider == 'resend' and 'gmail.com' in from_email.lower():
            from_email = 'onboarding@resend.dev'
        key_map = {'resend': 'RESEND_API_KEY', 'sendgrid': 'SENDGRID_API_KEY', 'brevo': 'BREVO_API_KEY'}
        api_key = os.getenv(key_map.get(provider, 'RESEND_API_KEY'), '')

        if not api_key:
            return Response({
                'sent': False,
                'error': 'No email API key configured (RESEND_API_KEY / SENDGRID_API_KEY / BREVO_API_KEY)',
                'provider': provider,
            })

        test_otp = str(random.randint(100000, 999999))
        sent = send_email_otp(email, test_otp, username='Test')

        return Response({
            'sent': sent,
            'otp_code': test_otp if not sent else None,
            'provider': provider,
            'from_email': from_email,
            'message': f'Email sent to {email}' if sent else 'Email failed',
        })
