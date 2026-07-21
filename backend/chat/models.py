from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    country_code = models.CharField(max_length=5, default='+91', help_text='Country code e.g. +91, +1')
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} Profile'


class FriendRequest(models.Model):
    from_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sent_requests')
    to_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='received_requests')
    is_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f'{self.from_user.username} -> {self.to_user.username}'


class Chat(models.Model):
    user1 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_user1')
    user2 = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_user2')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user1', 'user2')

    def __str__(self):
        return f'{self.user1.username} - {self.user2.username}'


def message_file_path(instance, filename):
    """Generate file path for uploaded files."""
    import uuid
    ext = filename.split('.')[-1] if '.' in filename else ''
    safe_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    return f'chat_files/{instance.chat.id}/{safe_name}'


class Message(models.Model):
    FILE_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]

    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField(blank=True, default='')
    file = models.FileField(upload_to=message_file_path, null=True, blank=True)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, null=True, blank=True)
    file_name = models.CharField(max_length=255, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    deleted_by_sender = models.BooleanField(default=False)
    deleted_by_receiver = models.BooleanField(default=False)

    def __str__(self):
        if self.file:
            return f'{self.sender.username}: [File] {self.file_name or self.file.name}'
        return f'{self.sender.username}: {self.text[:20]}'


class OTP(models.Model):
    OTP_TYPES = [
        ('email', 'Email'),
        ('phone', 'Phone'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp_code = models.CharField(max_length=6)
    otp_type = models.CharField(max_length=10, choices=OTP_TYPES)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.otp_type} - {self.otp_code}'


class Call(models.Model):
    CALL_TYPES = [
        ('audio', 'Audio Call'),
        ('video', 'Video Call'),
    ]
    CALL_STATUS = [
        ('initiated', 'Initiated'),
        ('ringing', 'Ringing'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('missed', 'Missed'),
        ('ended', 'Ended'),
    ]

    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='outgoing_calls')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incoming_calls')
    call_type = models.CharField(max_length=10, choices=CALL_TYPES)
    status = models.CharField(max_length=20, choices=CALL_STATUS, default='initiated')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0, help_text='Duration in seconds')

    def __str__(self):
        return f'{self.caller.username} -> {self.receiver.username} ({self.call_type})'


class CallHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='call_history')
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=20, help_text='e.g., initiated, accepted, rejected, ended')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.action} - {self.call}'
