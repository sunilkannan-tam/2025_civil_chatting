from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import Chat, Message


class Command(BaseCommand):
    help = "Populates the database with test users, chats, and messages"

    def handle(self, *args, **kwargs):
        # Create test users
        users_data = [
            ("alice", "alice@example.com", "password123"),
            ("bob", "bob@example.com", "password123"),
            ("charlie", "charlie@example.com", "password123"),
            ("diana", "diana@example.com", "password123"),
        ]

        users = []
        for username, email, password in users_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"email": email}
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user: {username}"))
            users.append(user)

        # Create a superuser for admin
        superuser, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@example.com", "is_superuser": True, "is_staff": True}
        )
        if created:
            superuser.set_password("admin123")
            superuser.save()
            self.stdout.write(self.style.SUCCESS("Created superuser: admin / admin123"))

        # Create chats and messages
        chat_pairs = [
            (users[0], users[1]),  # Alice & Bob
            (users[0], users[2]),  # Alice & Charlie
            (users[1], users[3]),  # Bob & Diana
        ]

        for user1, user2 in chat_pairs:
            chat, created = Chat.objects.get_or_create(user1=user1, user2=user2)
            if created:
                self.stdout.write(f"Created chat between {user1.username} and {user2.username}")

                # Add sample messages
                messages = [
                    (user1, f"Hey {user2.username}! How are you?"),
                    (user2, f"Hi {user1.username}! I'm doing great, thanks!"),
                    (user1, "Want to grab coffee later?"),
                    (user2, "Sure, that sounds perfect!"),
                ]

                for sender, text in messages:
                    Message.objects.create(
                        chat=chat,
                        sender=sender,
                        text=text
                    )
                self.stdout.write(f"Added sample messages to chat")

        self.stdout.write(self.style.SUCCESS("Successfully populated test data!"))
