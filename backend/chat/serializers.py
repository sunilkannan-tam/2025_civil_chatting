from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Chat, Message, FriendRequest, UserProfile, OTP


class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'is_online', 'last_active', 'phone_number', 'email_verified', 'phone_verified']

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile']

    def get_profile(self, obj):
        profile = getattr(obj, 'profile', None)
        if profile:
            return UserProfileSerializer(profile, context=self.context).data
        return None


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ['id', 'from_user', 'to_user', 'is_accepted', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'chat', 'sender', 'text', 'file', 'file_type', 'file_name', 'file_size', 'timestamp', 'is_read', 'read_at']
        read_only_fields = ['chat', 'sender', 'timestamp', 'file_type', 'file_name', 'file_size']

    def create(self, validated_data):
        request = self.context.get('request')
        file_obj = request.FILES.get('file') if request and request.FILES else None
        
        if file_obj:
            # Determine file type
            content_type = file_obj.content_type or ''
            ext = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
            
            if content_type.startswith('image/') or ext in ('jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'):
                file_type = 'image'
            elif content_type.startswith('video/') or ext in ('mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'):
                file_type = 'video'
            elif content_type.startswith('audio/') or ext in ('mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'):
                file_type = 'audio'
            elif ext in ('apk', 'zip', 'rar', '7z', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'):
                file_type = 'document'
            else:
                file_type = 'other'
                
            validated_data['file_type'] = file_type
            validated_data['file_name'] = file_obj.name
            validated_data['file_size'] = file_obj.size
        
        return super().create(validated_data)


class ChatSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ['id', 'other_user', 'last_message', 'created_at']

    def get_other_user(self, obj):
        user = self.context['request'].user
        if obj.user1 == user:
            return UserSerializer(obj.user2).data
        return UserSerializer(obj.user1).data

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'phone_number']

    def update(self, instance, validated_data):
        instance.profile_picture = validated_data.get('profile_picture', instance.profile_picture)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.save()
        return instance


class OTPSendSerializer(serializers.Serializer):
    otp_type = serializers.ChoiceField(choices=['email', 'phone'])
    value = serializers.CharField()  # email address or phone number

    class Meta:
        fields = ['otp_type', 'value']


class OTPVerifySerializer(serializers.Serializer):
    otp_type = serializers.ChoiceField(choices=['email', 'phone'])
    otp_code = serializers.CharField(max_length=6)

    class Meta:
        fields = ['otp_type', 'otp_code']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    class Meta:
        fields = ['old_password', 'new_password']
