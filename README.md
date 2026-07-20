# Civil_2026 Chatting

A real-time private messaging application like WhatsApp/Telegram, built with:

- **Backend**: Django + Django REST Framework + Django Channels
- **Frontend**: React + Vite
- **Real-time**: WebSocket support with Django Channels
- **Database**: SQLite (development), supports PostgreSQL (production)

## Features

✅ User Authentication (JWT tokens)
✅ Friend Request System (send/accept/reject)
✅ Private 1-on-1 Chats (only accessible by participants)
✅ Real-time Messaging with WebSockets
✅ Admin Dashboard (superuser only)
✅ Responsive UI

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create and apply migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. (Optional) Populate test data (creates 4 test users and superuser):
   ```bash
   python manage.py populate_test_data
   ```
   - Superuser: `admin` / `admin123`
   - Test users: `alice`, `bob`, `charlie`, `diana` (all with password `password123`)

7. Start the backend server:
   ```bash
   python manage.py runserver
   ```
   Backend runs at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   # Windows
   copy .env.example .env
   # macOS/Linux
   cp .env.example .env
   ```
   The defaults should work for local development.

4. Start the frontend server:
   ```bash
   npm run dev
   ```
   Frontend runs at http://localhost:3000

## API Endpoints

### Authentication

- `POST /api/token/`: Get JWT tokens (access + refresh)
- `POST /api/token/refresh/`: Refresh access token
- `POST /api/register/`: Register new user
- `GET /api/user/`: Get current user details

### Friend Requests

- `GET /api/friend-requests/`: List all friend requests (sent/received)
- `POST /api/friend-requests/`: Send new friend request
- `POST /api/friend-requests/<id>/accept/`: Accept friend request
- `POST /api/friend-requests/<id>/reject/`: Reject friend request

### Chats & Messages

- `GET /api/chats/`: List all your chats
- `GET /api/chats/<chat_id>/messages/`: List messages in chat
- `POST /api/chats/<chat_id>/messages/`: Send new message in chat
- `GET /api/users/`: List all non-admin users

### Admin Dashboard

- `GET /admin/`: Admin interface (only superusers)

## Project Structure

```
friends chat bot/
├── backend/
│   ├── chat/
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── consumers.py
│   │   ├── models.py
│   │   ├── routing.py
│   │   ├── serializers.py
│   │   ├── signals.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── chat_project/
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Deployment

### Backend Deployment (Heroku/Railway)

1. Set up PostgreSQL database
2. Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in `settings.py`
3. Set environment variables for `SECRET_KEY`, `DATABASE_URL`, etc.
4. Deploy using your platform's instructions

### Frontend Deployment (Vercel/Netlify)

1. Update `.env` to point to your production backend
2. Deploy using your platform's instructions

## License

MIT
