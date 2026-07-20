import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Chat, Message, UserProfile
from .serializers import MessageSerializer


@database_sync_to_async
def set_user_online(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.is_online = True
    profile.save()


@database_sync_to_async
def set_user_offline(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.is_online = False
    profile.save()


@database_sync_to_async
def update_user_last_active(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.last_active = timezone.now()
    profile.save()


@database_sync_to_async
def mark_messages_as_read(chat, user):
    # Mark all messages in this chat sent by the other user as read
    other_user = chat.user2 if chat.user1 == user else chat.user1
    Message.objects.filter(chat=chat, sender=other_user, is_read=False).update(
        is_read=True,
        read_at=timezone.now()
    )


class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_authenticated:
            await set_user_online(self.user)
            await self.accept()
            # Add user to a presence group (for future use)
            await self.channel_layer.group_add(
                'presence',
                self.channel_name
            )

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await set_user_offline(self.user)
            await self.channel_layer.group_discard(
                'presence',
                self.channel_name
            )


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.user = self.scope['user']
        self.chat_group_name = f'chat_{self.chat_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.chat_group_name,
            self.channel_name
        )

        await self.accept()

        # Update last active
        if self.user.is_authenticated:
            await update_user_last_active(self.user)

            # Mark messages as read when user connects to chat
            chat = await database_sync_to_async(Chat.objects.get)(id=self.chat_id)
            await mark_messages_as_read(chat, self.user)
            # Broadcast read status to chat group
            await self.channel_layer.group_send(
                self.chat_group_name,
                {
                    'type': 'messages_read',
                    'user_id': self.user.id
                }
            )

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await update_user_last_active(self.user)
        # Leave room group
        await self.channel_layer.group_discard(
            self.chat_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        if not self.user.is_authenticated:
            return

        text_data_json = json.loads(text_data)
        action = text_data_json.get('action')

        if action == 'send_message':
            text = text_data_json['text']
            sender = self.user
            chat = await database_sync_to_async(Chat.objects.get)(id=self.chat_id)

            message = await database_sync_to_async(Message.objects.create)(
                chat=chat,
                sender=sender,
                text=text
            )

            serialized_message = await database_sync_to_async(
                lambda: MessageSerializer(message).data
            )()

            # Send message to room group
            await self.channel_layer.group_send(
                self.chat_group_name,
                {
                    'type': 'chat_message',
                    'message': serialized_message
                }
            )
        elif action == 'mark_read':
            chat = await database_sync_to_async(Chat.objects.get)(id=self.chat_id)
            await mark_messages_as_read(chat, self.user)
            # Broadcast read status to chat group
            await self.channel_layer.group_send(
                self.chat_group_name,
                {
                    'type': 'messages_read',
                    'user_id': self.user.id
                }
            )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message
        }))

    async def messages_read(self, event):
        user_id = event['user_id']
        await self.send(text_data=json.dumps({
            'type': 'read',
            'user_id': user_id
        }))
