from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Chat, Message, FriendRequest, UserProfile, OTP, Call, CallHistory


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = ('username', 'email', 'is_staff', 'is_superuser', 'is_active')
    list_filter = ('is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email')

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


# Re-register User with custom admin that includes profile and delete
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('timestamp',)


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1', 'user2', 'created_at')
    list_filter = ('created_at',)
    inlines = [MessageInline]
    search_fields = ('user1__username', 'user2__username')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'sender', 'text_preview',
                    'timestamp', 'is_read', 'read_at')
    list_filter = ('timestamp', 'is_read')
    search_fields = ('sender__username', 'text')
    readonly_fields = ('timestamp',)

    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text'


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_user', 'to_user',
                    'is_accepted', 'created_at')
    list_filter = ('is_accepted', 'created_at')
    search_fields = ('from_user__username', 'to_user__username')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'profile_picture', 'phone_number', 'email_verified', 'phone_verified', 'is_online', 'last_active')
    list_filter = ('is_online', 'email_verified', 'phone_verified')
    search_fields = ('user__username', 'phone_number')


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'otp_code', 'otp_type', 'is_used', 'created_at')
    list_filter = ('otp_type', 'is_used', 'created_at')
    search_fields = ('user__username', 'otp_code')
    readonly_fields = ('created_at',)


@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ('id', 'caller', 'receiver', 'call_type', 'status', 'started_at', 'ended_at', 'duration')
    list_filter = ('call_type', 'status', 'started_at')
    search_fields = ('caller__username', 'receiver__username')
    readonly_fields = ('started_at',)


@admin.register(CallHistory)
class CallHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'call', 'action', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__username', 'call__caller__username', 'call__receiver__username')
    readonly_fields = ('timestamp',)
