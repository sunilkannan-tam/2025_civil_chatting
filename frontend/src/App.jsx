import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

const EMOJIS = ['😀','😂','❤️','🔥','👍','🎉','😍','✨','💯','🙏','🥺','🤣','💪','😎','🌟','🤩','😊','💕','🤗','😅','💀','☀️','🌈','⭐','🍕','🎶','⚡','🌸','😜','🤔']

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) fetchCurrentUser()
  }, [token])

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/user/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setUser(await res.json())
      else handleLogout()
    } catch (err) { handleLogout() }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    setToken(null)
    setUser(null)
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={
            !user ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/" />
          } />
          <Route path="/register" element={
            !user ? <Register /> : <Navigate to="/" />
          } />
          <Route path="/" element={
            user ? <ChatDashboard user={user} token={token} handleLogout={handleLogout} /> : <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  )
}

function Login({ setToken, setUser }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.access)
        localStorage.setItem('refresh', data.refresh)
        setToken(data.access)
        const userRes = await fetch(`${API_URL}/user/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        })
        if (userRes.ok) setUser(await userRes.json())
      } else {
        setError('Invalid credentials')
      }
    } catch (err) { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-container">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <h1><span className="logo-icon">💬</span> Civil_2026 Chatting</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <span className="input-icon">👤</span>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? <span className="spinner"></span> : 'Login'}
        </button>
      </form>
      <p className="auth-switch">Don't have an account? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register') }}>Register</a></p>
    </div>
  )
}

function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      if (res.ok) {
        setSuccess('Account created! Redirecting to login...')
        setTimeout(() => navigate('/login'), 1500)
      } else {
        setError('Username already exists')
      }
    } catch (err) { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-container">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <h1><span className="logo-icon">💬</span> Join Civil_2026 Chatting</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <span className="input-icon">👤</span>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="input-group">
          <span className="input-icon">📧</span>
          <input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? <span className="spinner"></span> : 'Register'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>Login</a></p>
    </div>
  )
}

function formatLastActive(dateString) {
  if (!dateString) return 'Offline'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function getFileIcon(fileType, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  if (fileType === 'image') return '🖼️'
  if (fileType === 'video') return '🎬'
  if (fileType === 'audio') return '🎵'
  if (ext === 'apk') return '📱'
  if (ext === 'pdf') return '📕'
  if (['zip', 'rar', '7z'].includes(ext)) return '🗂️'
  return '📄'
}

function ChatDashboard({ user, token, handleLogout }) {
  const [chats, setChats] = useState([])
  const [users, setUsers] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const chatWsRef = useRef(null)
  const presenceWsRef = useRef(null)
  const messagesEndRef = useRef(null)
  const presenceRetryRef = useRef(null)
  const chatRetryRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadInitialData()
    connectPresenceWebSocket()
    return () => {
      if (presenceWsRef.current) presenceWsRef.current.close()
      if (presenceRetryRef.current) clearTimeout(presenceRetryRef.current)
    }
  }, [])

  useEffect(() => {
    if (selectedChat) {
      setMessages([])
      fetchMessages()
      connectChatWebSocket()
    }
    return () => {
      if (chatWsRef.current) chatWsRef.current.close()
      if (chatRetryRef.current) clearTimeout(chatRetryRef.current)
      setWsConnected(false)
    }
  }, [selectedChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchChats(), fetchUsers(), fetchFriendRequests()])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const connectPresenceWebSocket = () => {
    if (presenceWsRef.current) presenceWsRef.current.close()
    try {
      presenceWsRef.current = new WebSocket(`${WS_URL}/presence/?token=${token}`)
      presenceWsRef.current.onopen = () => console.log('Presence WS connected')
      presenceWsRef.current.onclose = () => {
        presenceRetryRef.current = setTimeout(() => connectPresenceWebSocket(), 5000)
      }
      presenceWsRef.current.onerror = () => presenceWsRef.current.close()
    } catch (err) {
      presenceRetryRef.current = setTimeout(() => connectPresenceWebSocket(), 5000)
    }
  }

  const fetchChats = async () => {
    try {
      const res = await fetch(`${API_URL}/chats/`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) setChats(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users/`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) setUsers(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchFriendRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/friend-requests/`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) setFriendRequests(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/chats/${selectedChat.id}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setMessages(await res.json())
    } catch (err) { console.error(err) }
  }

  const connectChatWebSocket = () => {
    if (chatWsRef.current) chatWsRef.current.close()
    if (chatRetryRef.current) clearTimeout(chatRetryRef.current)
    try {
      chatWsRef.current = new WebSocket(`${WS_URL}/chat/${selectedChat.id}/?token=${token}`)
      chatWsRef.current.onopen = () => setWsConnected(true)
      chatWsRef.current.onclose = () => {
        setWsConnected(false)
        if (selectedChat) chatRetryRef.current = setTimeout(() => connectChatWebSocket(), 3000)
      }
      chatWsRef.current.onerror = () => chatWsRef.current.close()
      chatWsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'message') {
            setMessages(prev => [...prev, data.message])
            fetchChats()
          } else if (data.type === 'read') {
            setMessages(prev => prev.map(msg => {
              if (msg.sender.id !== user.id) return msg
              return { ...msg, is_read: true }
            }))
            fetchChats()
          }
        } catch (err) { console.error('WS parse error:', err) }
      }
    } catch (err) {
      setWsConnected(false)
      if (selectedChat) chatRetryRef.current = setTimeout(() => connectChatWebSocket(), 3000)
    }
  }

  const sendFriendRequest = async (toUser) => {
    try {
      const res = await fetch(`${API_URL}/friend-requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ to_user: toUser.id })
      })
      if (res.ok) {
        await fetchFriendRequests()
        showNotification(`Friend request sent to ${toUser.username}!`, 'success')
      }
    } catch (err) { console.error(err) }
  }

  const acceptFriendRequest = async (requestId) => {
    try {
      await fetch(`${API_URL}/friend-requests/${requestId}/accept/`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchFriendRequests()
      fetchChats()
    } catch (err) { console.error(err) }
  }

  const rejectFriendRequest = async (requestId) => {
    try {
      await fetch(`${API_URL}/friend-requests/${requestId}/reject/`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchFriendRequests()
    } catch (err) { console.error(err) }
  }

  const showNotification = (message, type = 'success') => {
    const bgColors = {
      success: 'linear-gradient(135deg,#43e97b,#38f9d7)',
      error: 'linear-gradient(135deg,#f5576c,#f093fb)',
      info: 'linear-gradient(135deg,#667eea,#764ba2)'
    }
    const n = document.createElement('div')
    n.style.cssText = `position:fixed;top:20px;right:20px;background:${bgColors[type] || bgColors.success};color:white;padding:1rem 1.5rem;border-radius:12px;box-shadow:0 10px 15px rgba(0,0,0,0.15);z-index:1000;animation:slideInFromRight 0.3s ease;font-weight:600;`
    n.textContent = message
    document.body.appendChild(n)
    setTimeout(() => {
      n.style.animation = 'slideOutToRight 0.3s ease'
      setTimeout(() => n.remove(), 300)
    }, 3000)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const text = newMessage
    setNewMessage('')
    if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
      chatWsRef.current.send(JSON.stringify({ action: 'send_message', text }))
    } else {
      try {
        const res = await fetch(`${API_URL}/chats/${selectedChat.id}/messages/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ text })
        })
        if (res.ok) {
          const msg = await res.json()
          setMessages(prev => [...prev, msg])
          fetchChats()
        }
      } catch (err) { console.error('REST send failed:', err) }
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedChat) return
    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('text', '')
    try {
      const res = await fetch(`${API_URL}/chats/${selectedChat.id}/messages/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        fetchChats()
        showNotification(`File "${file.name}" sent!`, 'success')
      } else {
        showNotification('Failed to send file', 'error')
      }
    } catch (err) {
      showNotification('Failed to send file', 'error')
      console.error('File upload failed:', err)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const triggerFileUpload = () => fileInputRef.current?.click()

  const insertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const renderMessageContent = (msg) => {
    if (msg.file) {
      const fileUrl = msg.file.startsWith('http') ? msg.file : `http://localhost:8000${msg.file}`
      const fileIcon = getFileIcon(msg.file_type, msg.file_name)

      if (msg.file_type === 'image') {
        return (
          <div className="file-message image-message">
            <img src={fileUrl} alt={msg.file_name} className="file-preview-image" loading="lazy" onClick={() => window.open(fileUrl, '_blank')} />
            {msg.text && <div className="file-caption">{msg.text}</div>}
          </div>
        )
      } else if (msg.file_type === 'video') {
        return (
          <div className="file-message video-message">
            <video controls className="file-preview-video" preload="metadata">
              <source src={fileUrl} />
            </video>
            {msg.text && <div className="file-caption">{msg.text}</div>}
          </div>
        )
      } else if (msg.file_type === 'audio') {
        return (
          <div className="file-message audio-message">
            <audio controls className="file-preview-audio" preload="metadata">
              <source src={fileUrl} />
            </audio>
            {msg.text && <div className="file-caption">{msg.text}</div>}
          </div>
        )
      } else {
        return (
          <div className="file-message document-message" onClick={() => window.open(fileUrl, '_blank')}>
            <div className="file-icon">{fileIcon}</div>
            <div className="file-details">
              <div className="file-name">{msg.file_name}</div>
              <div className="file-size">{formatFileSize(msg.file_size)}</div>
              {msg.text && <div className="file-caption">{msg.text}</div>}
            </div>
            <div className="download-icon">⬇️</div>
          </div>
        )
      }
    }
    return <div className="message-text">{msg.text}</div>
  }

  const pendingRequests = friendRequests.filter(req => !req.is_accepted && req.to_user.id === user.id)
  const sentRequests = friendRequests.filter(req => !req.is_accepted && req.from_user.id === user.id)
  const sentRequestUserIds = new Set(sentRequests.map(req => req.to_user.id))
  const acceptedRequestUserIds = new Set(
    friendRequests.filter(req => req.is_accepted && (req.from_user.id === user.id || req.to_user.id === user.id))
      .map(req => req.from_user.id === user.id ? req.to_user.id : req.from_user.id)
  )

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your chats...</p>
      </div>
    )
  }

  return (
    <div className="chat-dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>💬 Chats</h2>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>

        {pendingRequests.length > 0 && (
          <div className="requests-section">
            <h3>📨 Pending Requests ({pendingRequests.length})</h3>
            {pendingRequests.map(req => (
              <div key={req.id} className="request-item">
                <span>{req.from_user.username}</span>
                <div className="request-actions">
                  <button onClick={() => acceptFriendRequest(req.id)} className="accept-btn">✓ Accept</button>
                  <button onClick={() => rejectFriendRequest(req.id)} className="reject-btn">✕ Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowAddFriend(!showAddFriend)} className="toggle-friends-btn">
          {showAddFriend ? '✕ Close' : '👥 Add Friends'}
        </button>

        {showAddFriend && (
          <div className="users-section">
            <h3>All Users</h3>
            {users.filter(u => !sentRequestUserIds.has(u.id) && !acceptedRequestUserIds.has(u.id)).map(u => (
              <div key={u.id} className="user-item">
                <div className="user-info">
                  <div className="user-avatar">{u.username[0].toUpperCase()}</div>
                  <div>
                    <div className="user-name">{u.username}</div>
                    <div className={`user-status ${u.profile?.is_online ? 'status-online' : 'status-offline'}`}>
                      {u.profile?.is_online ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                </div>
                <button onClick={() => sendFriendRequest(u)} className="add-friend-btn">+ Add</button>
              </div>
            ))}
            {users.filter(u => !sentRequestUserIds.has(u.id) && !acceptedRequestUserIds.has(u.id)).length === 0 && (
              <p style={{ color: '#718096', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No new users to add</p>
            )}
          </div>
        )}

        {sentRequests.length > 0 && (
          <div className="users-section sent-requests">
            <h4>Sent Requests</h4>
            {sentRequests.map(req => (
              <div key={req.id} className="sent-request-item">
                ⏳ {req.to_user.username}
              </div>
            ))}
          </div>
        )}

        <div className="chats-section">
          <h3>💬 My Chats</h3>
          {chats.length === 0 ? (
            <p style={{ color: '#718096', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No chats yet. Add friends to start chatting!
            </p>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="chat-info">
                  <div className="chat-avatar">{chat.other_user.username[0].toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="chat-name">{chat.other_user.username}</div>
                    {chat.last_message && (
                      <div className="chat-preview">
                        {chat.last_message.file ? `📎 ${chat.last_message.file_name || 'File'}` : chat.last_message.text}
                      </div>
                    )}
                  </div>
                </div>
                <div className="chat-meta">
                  {chat.other_user.profile?.is_online && (
                    <span className="status-dot status-dot-online"></span>
                  )}
                  {chat.last_message && (
                    <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                      {new Date(chat.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="chat-area">
        {!selectedChat ? (
          <div className="no-chat-selected">
            <h2>💬 Welcome to Civil_2026 Chatting!</h2>
            <p>Select a chat from the sidebar to start messaging</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-user">
                <div className="chat-header-avatar">{selectedChat.other_user.username[0].toUpperCase()}</div>
                <div>
                  <h3>{selectedChat.other_user.username}</h3>
                  <div className={`chat-header-status ${selectedChat.other_user.profile?.is_online ? 'status-online' : 'status-offline'}`}>
                    {selectedChat.other_user.profile?.is_online ? '● Online' : '○ Offline'}
                    {!selectedChat.other_user.profile?.is_online && selectedChat.other_user.profile?.last_active && (
                      ` · Last seen ${formatLastActive(selectedChat.other_user.profile.last_active)}`
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
                  No messages yet. Say hello! 👋
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.sender.id === user.id ? 'own' : ''}`}>
                    {renderMessageContent(msg)}
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender.id === user.id && (
                        <span className="message-status">{msg.is_read ? '✓✓' : '✓'}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="message-form">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={triggerFileUpload}
                disabled={uploadingFile}
                style={{
                  padding: '0.9rem 1rem',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease'
                }}
                title="Send file"
              >
                {uploadingFile ? <span className="spinner"></span> : '📎'}
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  padding: '0.9rem 1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  transition: 'all 0.3s ease'
                }}
                title="Emoji"
              >
                😀
              </button>
              <input
                type="text"
                placeholder={wsConnected ? "Type a message..." : "WebSocket disconnected (REST fallback)..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" disabled={!newMessage.trim()}>
                Send ➤
              </button>
            </form>

            {showEmojiPicker && (
              <div style={{
                position: 'absolute',
                bottom: '80px',
                right: '20px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.5rem',
                maxWidth: '320px',
                zIndex: 100,
                border: '1px solid #e2e8f0'
              }}>
                {EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertEmoji(emoji)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App

