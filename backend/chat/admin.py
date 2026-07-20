from django.contrib import admin
from .models import Chat, Message, FriendRequest, UserProfile


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
    list_display = ('user', 'is_online', 'last_active')
    list_filter = ('is_online',)
    search_fields = ('user__username',)
