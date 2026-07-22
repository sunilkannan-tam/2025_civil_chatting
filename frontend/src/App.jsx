import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000'

async function authFetch(url, options = {}) {
  let token = localStorage.getItem('token')
  if (!token) throw new Error('No token')
  const headers = { ...options.headers, 'Authorization': `Bearer ${token}` }
  let res = await fetch(url, { ...options, headers })
  if (res.status === 401) {
    const refresh = localStorage.getItem('refresh')
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_URL.replace(/\/api\/?$/, '')}/api/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh })
        })
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          localStorage.setItem('token', data.access)
          token = data.access
          headers['Authorization'] = `Bearer ${token}`
          res = await fetch(url, { ...options, headers })
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh')
          window.location.href = '/login'
          throw new Error('Token refresh failed')
        }
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        throw new Error('Token refresh failed')
      }
    } else {
      localStorage.removeItem('token')
      window.location.href = '/login'
      throw new Error('No refresh token')
    }
  }
  return res
}

function Avatar({ user, size = 40, className = '' }) {
  const photoUrl = user?.profile?.profile_picture

  if (photoUrl) {
    const imgUrl = photoUrl.startsWith('http') ? photoUrl : `${MEDIA_URL}${photoUrl}`
    return (
      <img
        src={imgUrl}
        alt={user?.username || ''}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          minWidth: size,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
        onError={(e) => {
          e.target.style.display = 'none'
          const fallback = document.createElement('div')
          fallback.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size*0.45}px;min-width:${size}px`
          fallback.textContent = (user?.username?.[0] || '?').toUpperCase()
          e.target.parentElement?.appendChild(fallback)
        }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.45,
        minWidth: size,
      }}
    >
      {(user?.username?.[0] || '?').toUpperCase()}
    </div>
  )
}

const EMOJIS = ['😀','😂','❤️','🔥','👍','🎉','😍','✨','💯','🙏','🥺','🤣','💪','😎','🌟','🤩','😊','💕','🤗','😅','💀','☀️','🌈','⭐','🍕','🎶','⚡','🌸','😜','🤔']

const COUNTRY_CODES = [
  { code: '+1', name: '🇺🇸 US/CA' },
  { code: '+44', name: '🇬🇧 UK' },
  { code: '+91', name: '🇮🇳 India' },
  { code: '+61', name: '🇦🇺 Australia' },
  { code: '+81', name: '🇯🇵 Japan' },
  { code: '+86', name: '🇨🇳 China' },
  { code: '+49', name: '🇩🇪 Germany' },
  { code: '+33', name: '🇫🇷 France' },
  { code: '+39', name: '🇮🇹 Italy' },
  { code: '+55', name: '🇧🇷 Brazil' },
  { code: '+7', name: '🇷🇺 Russia' },
  { code: '+82', name: '🇰🇷 S. Korea' },
  { code: '+34', name: '🇪🇸 Spain' },
  { code: '+31', name: '🇳🇱 Netherlands' },
  { code: '+46', name: '🇸🇪 Sweden' },
  { code: '+41', name: '🇨🇭 Switzerland' },
  { code: '+971', name: '🇦🇪 UAE' },
  { code: '+966', name: '🇸🇦 Saudi' },
  { code: '+65', name: '🇸🇬 Singapore' },
  { code: '+60', name: '🇲🇾 Malaysia' },
  { code: '+63', name: '🇵🇭 Philippines' },
  { code: '+62', name: '🇮🇩 Indonesia' },
  { code: '+64', name: '🇳🇿 New Zealand' },
  { code: '+27', name: '🇿🇦 S. Africa' },
  { code: '+234', name: '🇳🇬 Nigeria' },
  { code: '+254', name: '🇰🇪 Kenya' },
  { code: '+20', name: '🇪🇬 Egypt' },
  { code: '+92', name: '🇵🇰 Pakistan' },
  { code: '+880', name: '🇧🇩 Bangladesh' },
  { code: '+94', name: '🇱🇰 Sri Lanka' },
  { code: '+977', name: '🇳🇵 Nepal' },
  { code: '+98', name: '🇮🇷 Iran' },
  { code: '+90', name: '🇹🇷 Turkey' },
  { code: '+84', name: '🇻🇳 Vietnam' },
  { code: '+66', name: '🇹🇭 Thailand' },
  { code: '+852', name: '🇭🇰 Hong Kong' },
  { code: '+886', name: '🇹🇼 Taiwan' },
  { code: '+351', name: '🇵🇹 Portugal' },
  { code: '+48', name: '🇵🇱 Poland' },
  { code: '+36', name: '🇭🇺 Hungary' },
  { code: '+420', name: '🇨🇿 Czech' },
  { code: '+45', name: '🇩🇰 Denmark' },
  { code: '+47', name: '🇳🇴 Norway' },
  { code: '+358', name: '🇫🇮 Finland' },
  { code: '+353', name: '🇮🇪 Ireland' },
  { code: '+43', name: '🇦🇹 Austria' },
  { code: '+32', name: '🇧🇪 Belgium' },
  { code: '+30', name: '🇬🇷 Greece' },
  { code: '+54', name: '🇦🇷 Argentina' },
  { code: '+56', name: '🇨🇱 Chile' },
  { code: '+57', name: '🇨🇴 Colombia' },
  { code: '+52', name: '🇲🇽 Mexico' },
  { code: '+51', name: '🇵🇪 Peru' },
  { code: '+58', name: '🇻🇪 Venezuela' },
  { code: '+212', name: '🇲🇦 Morocco' },
  { code: '+213', name: '🇩🇿 Algeria' },
  { code: '+216', name: '🇹🇳 Tunisia' },
]

function Login({ setUser, setToken }) {
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
        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData)
        }
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
      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
        <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password') }} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          Forgot Password?
        </a>
      </p>
    </div>
  )
}

function Register({ setUser, setToken }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      if (res.ok) {
        const data = await res.json()
        // Navigate to email verification page with user data
        navigate('/verify-email', {
          state: {
            userId: data.user_id,
            email: data.email,
            username: data.username,
            otpCode: data.otp_code
          }
        })
      } else {
        const errData = await res.json()
        setError(errData.email?.[0] || errData.username?.[0] || 'Registration failed')
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
          <input type="email" placeholder="Email (required)" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? <span className="spinner"></span> : 'Register'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>Login</a></p>
    </div>
  )
}

function ForgotPassword({ setToken }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const navigate = useNavigate()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        const data = await res.json()
        setOtpSent(true)
        // Navigate to reset password page
        navigate('/reset-password', {
          state: { email, otpCode: data.otp_code }
        })
      } else {
        const errData = await res.json()
        setError(errData.error || 'Failed to send OTP')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <h1><span className="logo-icon">🔑</span> Forgot Password</h1>
      <form onSubmit={handleSendOtp} className="auth-form">
        <div className="input-group">
          <span className="input-icon">📧</span>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? <span className="spinner"></span> : 'Send Reset Code'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
        <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          ← Back to Login
        </a>
      </p>
    </div>
  )
}

function ResetPassword({ setToken }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { email, otpCode } = location.state || {}

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if no email state
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true })
    }
  }, [email, navigate])

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp, new_password: newPassword })
      })
      if (res.ok) {
        setSuccess('Password reset successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Failed to reset password')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!email) return null

  return (
    <div className="auth-container">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <h1><span className="logo-icon">🔐</span> Reset Password</h1>

      <form onSubmit={handleReset} className="auth-form">
        <p style={{ textAlign: 'center', color: '#718096', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Enter the OTP sent to <strong>{email}</strong>
        </p>

        {otpCode && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#10b981', marginBottom: '1rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: '8px' }}>
            ⚡ Dev Mode: Your OTP is <strong>{otpCode}</strong>
          </p>
        )}

        <div className="input-group">
          <span className="input-icon">🔑</span>
          <input
            type="text"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>

        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit" disabled={loading || otp.length < 6 || !newPassword} className="auth-btn">
          {loading ? <span className="spinner"></span> : 'Reset Password'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
            ← Back to Login
          </a>
        </p>
      </form>
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
  const navigate = useNavigate()
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
  const [showCallModal, setShowCallModal] = useState(null)
  const [showMessageMenu, setShowMessageMenu] = useState(null)
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
      const res = await authFetch(`${API_URL}/chats/`)
      if (res.ok) setChats(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${API_URL}/users/`)
      if (res.ok) setUsers(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchFriendRequests = async () => {
    try {
      const res = await authFetch(`${API_URL}/friend-requests/`)
      if (res.ok) setFriendRequests(await res.json())
    } catch (err) { console.error(err) }
  }

  const fetchMessages = async () => {
    try {
      const res = await authFetch(`${API_URL}/chats/${selectedChat.id}/messages/`)
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
      const res = await authFetch(`${API_URL}/friend-requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await authFetch(`${API_URL}/friend-requests/${requestId}/accept/`, {
        method: 'POST'
      })
      fetchFriendRequests()
      fetchChats()
    } catch (err) { console.error(err) }
  }

  const rejectFriendRequest = async (requestId) => {
    try {
      await authFetch(`${API_URL}/friend-requests/${requestId}/reject/`, {
        method: 'POST'
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
        const res = await authFetch(`${API_URL}/chats/${selectedChat.id}/messages/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      const res = await authFetch(`${API_URL}/chats/${selectedChat.id}/messages/`, {
        method: 'POST',
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

  const deleteMessage = async (messageId) => {
    try {
      const res = await authFetch(`${API_URL}/messages/${messageId}/delete/`, {
        method: 'POST'
      })
      if (res.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
        showNotification('Message deleted', 'success')
      } else {
        showNotification('Failed to delete message', 'error')
      }
    } catch (err) {
      showNotification('Failed to delete message', 'error')
    }
    setShowMessageMenu(null)
  }

  const renderMessageContent = (msg) => {
    if (msg.file) {
      const fileUrl = msg.file.startsWith('http') ? msg.file : `${MEDIA_URL}${msg.file}`
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {user.is_superuser && <button onClick={() => navigate('/admin')} className="settings-icon-btn" title="Admin Panel">👑</button>}
            <button onClick={() => navigate('/settings')} className="settings-icon-btn" title="Settings">⚙️</button>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
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
              <div className="chat-header-actions">
                <button
                  onClick={() => navigate('/call-history')}
                  className="header-action-btn"
                  title="Call History"
                >
                  📞
                </button>
                <button
                  onClick={() => setShowCallModal({ type: 'audio', chat: selectedChat })}
                  className="header-action-btn"
                  title="Audio Call"
                  disabled={!selectedChat.other_user.profile?.is_online}
                >
                  📞
                </button>
                <button
                  onClick={() => setShowCallModal({ type: 'video', chat: selectedChat })}
                  className="header-action-btn"
                  title="Video Call"
                  disabled={!selectedChat.other_user.profile?.is_online}
                >
                  📹
                </button>
              </div>
            </div>

            <div className="messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
                  No messages yet. Say hello! 👋
                </div>
              ) : (
                messages
                  .filter(msg => !msg.deleted_by_sender && !msg.deleted_by_receiver)
                  .map(msg => (
                    <div
                      key={msg.id}
                      className={`message ${msg.sender.id === user.id ? 'own' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (msg.sender.id === user.id || msg.deleted_by_receiver === false) {
                          setShowMessageMenu(msg.id)
                        }
                      }}
                      onMouseLeave={() => setShowMessageMenu(null)}
                    >
                      {renderMessageContent(msg)}
                      <div className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender.id === user.id && (
                          <span className="message-status">{msg.is_read ? '✓✓' : '✓'}</span>
                        )}
                      </div>
                      {showMessageMenu === msg.id && (
                        <div className="message-menu">
                          {msg.sender.id === user.id ? (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="message-menu-btn unsend-btn"
                              title="Unsend (Delete for everyone)"
                            >
                              🗑️ Unsend
                            </button>
                          ) : (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="message-menu-btn delete-btn"
                              title="Delete for me"
                            >
                              ✕ Delete
                            </button>
                          )}
                        </div>
                      )}
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

            {showCallModal && (
              <CallModal
                user={user}
                token={token}
                selectedChat={showCallModal.chat}
                onClose={() => setShowCallModal(null)}
                presenceWsRef={presenceWsRef}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmailVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId, email, username, otpCode } = location.state || {}

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  // Redirect if no state (direct URL access)
  useEffect(() => {
    if (!userId || !email) {
      navigate('/register', { replace: true })
    }
  }, [userId, email, navigate])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/verify-registration-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, otp_code: otp })
      })
      if (res.ok) {
        setSuccess('Email verified successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        const errData = await res.json()
        setError(errData.error || 'Invalid OTP')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      // Re-register to get new OTP (in production, use a dedicated resend endpoint)
      // For dev mode, user can just re-register
      setResent(true)
      setError('Check the console/terminal for the new OTP code (Dev mode)')
    } finally {
      setLoading(false)
    }
  }

  if (!userId || !email) return null

  return (
    <div className="auth-container">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <h1><span className="logo-icon">📧</span> Verify Your Email</h1>

      <form onSubmit={handleVerify} className="auth-form">
        <p style={{ textAlign: 'center', color: '#718096', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Welcome, <strong>{username}</strong>!<br />
          We sent a verification code to<br />
          <strong style={{ color: '#667eea' }}>{email}</strong>
        </p>

        <div className="input-group">
          <span className="input-icon">🔑</span>
          <input
            type="text"
            maxLength={6}
            placeholder="Enter 6-digit OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>

        {otpCode && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#10b981', marginBottom: '1rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: '8px' }}>
            ⚡ Dev Mode: Your OTP is <strong>{otpCode}</strong>
          </p>
        )}

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit" disabled={loading || otp.length < 6} className="auth-btn">
          {loading ? <span className="spinner"></span> : '✅ Verify Email'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#718096', fontSize: '0.9rem' }}>
            Didn't receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline',
                width: 'auto',
                padding: 0,
                boxShadow: 'none'
              }}
            >
              Resend OTP
            </button>
          </p>
          <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <a
              href="/register"
              onClick={(e) => { e.preventDefault(); navigate('/register') }}
              style={{ color: '#718096' }}
            >
              ← Back to registration
            </a>
          </p>
        </div>
      </form>
    </div>
  )
}

function AdminPanel({ user, token }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API_URL}/admin/users/`)
      if (res.ok) {
        setUsers(await res.json())
      } else {
        const err = await res.json()
        showMsg('error', err.error || 'Failed to load users')
      }
    } catch (err) {
      showMsg('error', 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    setDeletingId(userId)
    try {
      const res = await authFetch(`${API_URL}/admin/users/${userId}/delete/`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (res.ok) {
        showMsg('success', data.message)
        setUsers(prev => prev.filter(u => u.id !== userId))
        setConfirmDelete(null)
      } else {
        showMsg('error', data.error || 'Failed to delete user')
      }
    } catch (err) {
      showMsg('error', 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="settings-page admin-page">
      <div className="settings-header">
        <button onClick={() => navigate('/')} className="settings-back-btn">← Back to Chat</button>
        <h2>👑 Admin Panel</h2>
      </div>

      {message.text && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-content">
        <div className="settings-section">
          <h3>All Users ({users.length})</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#718096', marginTop: '0.5rem' }}>Loading users...</p>
            </div>
          ) : (
            <div className="admin-user-list">
              {users.map(u => (
                <div key={u.id} className={`admin-user-item ${u.is_superuser ? 'admin-user-self' : ''}`}>
                  <div className="admin-user-info">
                    <div className="admin-user-avatar">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="admin-user-details">
                      <div className="admin-user-name">
                        {u.username}
                        {u.is_superuser && <span className="admin-badge">Admin</span>}
                        {user.id === u.id && <span className="you-badge">You</span>}
                      </div>
                      <div className="admin-user-email">{u.email || 'No email'}</div>
                      <div className={`admin-user-status ${u.profile?.is_online ? 'status-online' : 'status-offline'}`}>
                        {u.profile?.is_online ? '● Online' : '○ Offline'}
                      </div>
                    </div>
                  </div>
                  <div className="admin-user-actions">
                    {confirmDelete === u.id ? (
                      <div className="admin-confirm-delete">
                        <span>Delete {u.username}?</span>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={deletingId === u.id}
                          className="admin-confirm-yes"
                        >
                          {deletingId === u.id ? <span className="spinner"></span> : '✓ Yes'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="admin-confirm-no">✕ No</button>
                      </div>
                    ) : (
                      !u.is_superuser && user.id !== u.id && (
                        <button
                          onClick={() => setConfirmDelete(u.id)}
                          className="admin-delete-btn"
                          title="Delete user"
                        >
                          🗑️ Delete
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>No users found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CallHistoryPage({ user, token }) {
  const navigate = useNavigate()
  const [callHistory, setCallHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  useEffect(() => {
    fetchCallHistory()
  }, [])

  const fetchCallHistory = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API_URL}/calls/history/`)
      if (res.ok) {
        setCallHistory(await res.json())
      } else {
        const err = await res.json()
        showMsg('error', err.error || 'Failed to load call history')
      }
    } catch (err) {
      showMsg('error', 'Failed to load call history')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCallTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getCallIcon = (callType, status) => {
    if (status === 'missed') return '📵'
    if (status === 'rejected') return '❌'
    return callType === 'video' ? '📹' : '📞'
  }

  const getCallStatusText = (status) => {
    switch (status) {
      case 'initiated': return 'Initiated'
      case 'ringing': return 'Ringing'
      case 'accepted': return 'Accepted'
      case 'rejected': return 'Rejected'
      case 'missed': return 'Missed'
      case 'ended': return 'Ended'
      default: return status
    }
  }

  // Group calls by call ID to show unique calls
  const uniqueCalls = callHistory.reduce((acc, history) => {
    const callId = history.call.id
    if (!acc[callId]) {
      acc[callId] = {
        call: history.call,
        histories: []
      }
    }
    acc[callId].histories.push(history)
    return acc
  }, {})

  const sortedCalls = Object.values(uniqueCalls).sort((a, b) => {
    const timeA = new Date(a.histories[0]?.timestamp || a.call.started_at)
    const timeB = new Date(b.histories[0]?.timestamp || b.call.started_at)
    return timeB - timeA
  })

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button onClick={() => navigate('/')} className="settings-back-btn">← Back to Chat</button>
        <h2>📞 Call History</h2>
      </div>

      {message.text && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-content">
        <div className="settings-section">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ color: '#718096', marginTop: '0.5rem' }}>Loading call history...</p>
            </div>
          ) : sortedCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📞</div>
              <p>No call history yet</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Start calling your friends to see your history here!</p>
            </div>
          ) : (
            <div className="call-history-list">
              {sortedCalls.map(({ call, histories }) => {
                const otherUser = call.caller.id === user.id ? call.receiver : call.caller
                const latestHistory = histories[0]
                const isOutgoing = call.caller.id === user.id

                return (
                  <div key={call.id} className="call-history-item">
                    <div className="call-history-avatar">
                      {getCallIcon(call.call_type, call.status)}
                    </div>
                    <div className="call-history-details">
                      <div className="call-history-user">
                        {otherUser.username}
                        {isOutgoing ? ' (Outgoing)' : ' (Incoming)'}
                      </div>
                      <div className="call-history-meta">
                        <span className={`call-status-badge call-status-${call.status}`}>
                          {getCallStatusText(call.status)}
                        </span>
                        <span className="call-type-badge">
                          {call.call_type === 'video' ? '📹 Video' : '📞 Audio'}
                        </span>
                        {call.duration > 0 && (
                          <span className="call-duration">⏱️ {formatDuration(call.duration)}</span>
                        )}
                      </div>
                      <div className="call-history-time">
                        {formatCallTime(latestHistory?.timestamp || call.started_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CallModal({ user, token, selectedChat, onClose, presenceWsRef }) {
  const [callStatus, setCallStatus] = useState('initiating')
  const [callId, setCallId] = useState(null)
  const [callType] = useState(selectedChat?.call_type || 'audio')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const durationIntervalRef = useRef(null)

  const otherUser = selectedChat?.other_user

  useEffect(() => {
    initiateCall()
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
  }

  const initiateCall = async () => {
    try {
      // Initiate call via API
      const res = await authFetch(`${API_URL}/calls/initiate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_id: otherUser.id,
          call_type: callType
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCallId(data.id)
        setCallStatus('ringing')

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setDuration(prev => prev + 1)
        }, 1000)

        // For video calls, get media stream
        if (callType === 'video') {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            })
            setLocalStream(stream)
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream
            }
          } catch (err) {
            console.error('Failed to get media devices:', err)
            setError('Failed to access camera/microphone')
          }
        } else {
          // For audio calls, just get audio
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true
            })
            setLocalStream(stream)
          } catch (err) {
            console.error('Failed to get audio:', err)
            setError('Failed to access microphone')
          }
        }

        // Listen for call status updates via WebSocket
        if (presenceWsRef.current && presenceWsRef.current.readyState === WebSocket.OPEN) {
          presenceWsRef.current.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data)
              if (data.type === 'call_signal') {
                handleCallSignal(data)
              }
            } catch (err) { console.error('WS parse error:', err) }
          }
        }

        // Simulate call acceptance after 3 seconds (for demo)
        setTimeout(() => {
          if (callStatus === 'ringing') {
            acceptCall()
          }
        }, 3000)
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to initiate call')
        setCallStatus('error')
      }
    } catch (err) {
      setError('Failed to initiate call')
      setCallStatus('error')
    }
  }

  const acceptCall = async () => {
    try {
      await authFetch(`${API_URL}/calls/${callId}/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'accepted' })
      })
      setCallStatus('connected')
    } catch (err) {
      console.error('Failed to accept call:', err)
    }
  }

  const rejectCall = async () => {
    try {
      await authFetch(`${API_URL}/calls/${callId}/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected' })
      })
      onClose()
    } catch (err) {
      console.error('Failed to reject call:', err)
    }
  }

  const endCall = async () => {
    try {
      await authFetch(`${API_URL}/calls/${callId}/update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'ended' })
      })
      cleanup()
      onClose()
    } catch (err) {
      console.error('Failed to end call:', err)
      cleanup()
      onClose()
    }
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  const handleCallSignal = (data) => {
    // Handle WebRTC signaling
    console.log('Call signal received:', data)
    // In a full implementation, this would handle WebRTC offer/answer/ICE candidates
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!otherUser) return null

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <div className="call-header">
          <div className="call-user-info">
            <div className="call-avatar-large">
              {otherUser.username[0].toUpperCase()}
            </div>
            <div>
              <h3>{otherUser.username}</h3>
              <p className="call-status-text">
                {callStatus === 'initiating' && 'Initiating...'}
                {callStatus === 'ringing' && '📞 Ringing...'}
                {callStatus === 'connected' && `🟢 Connected ${formatDuration(duration)}`}
                {callStatus === 'ended' && 'Call Ended'}
                {callStatus === 'error' && '❌ Error'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="call-close-btn">✕</button>
        </div>

        {error && (
          <div className="call-error">
            {error}
          </div>
        )}

        {callType === 'video' && (
          <div className="call-video-container">
            {localStream && (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="local-video"
              />
            )}
            {remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay
                className="remote-video"
              />
            )}
            {!localStream && !remoteStream && (
              <div className="call-video-placeholder">
                <div className="call-avatar-large">
                  {otherUser.username[0].toUpperCase()}
                </div>
              </div>
            )}
          </div>
        )}

        {callType === 'audio' && (
          <div className="call-audio-container">
            <div className="call-avatar-large audio-call-avatar">
              {otherUser.username[0].toUpperCase()}
            </div>
            <div className="call-audio-animation">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          </div>
        )}

        <div className="call-controls">
          {callStatus === 'ringing' && (
            <>
              <button onClick={rejectCall} className="call-btn call-reject-btn">
                📵 Reject
              </button>
              <button onClick={acceptCall} className="call-btn call-accept-btn">
                ✅ Accept
              </button>
            </>
          )}

          {callStatus === 'connected' && (
            <>
              <button onClick={toggleMute} className={`call-btn ${isMuted ? 'call-btn-active' : ''}`}>
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              {callType === 'video' && (
                <button onClick={toggleVideo} className={`call-btn ${isVideoOff ? 'call-btn-active' : ''}`}>
                  {isVideoOff ? '📹 Show Video' : '📹 Hide Video'}
                </button>
              )}
              <button onClick={endCall} className="call-btn call-end-btn">
                📵 End Call
              </button>
            </>
          )}

          {(callStatus === 'ended' || callStatus === 'error') && (
            <button onClick={onClose} className="call-btn call-accept-btn">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Settings({ user, token }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.profile?.phone_number || '')
  const [countryCode, setCountryCode] = useState(user?.profile?.country_code || '+91')
  const [profilePic, setProfilePic] = useState(null)
  const [profilePicPreview, setProfilePicPreview] = useState(
    user?.profile?.profile_picture?.startsWith('http')
      ? user.profile.profile_picture
      : user?.profile?.profile_picture ? `${MEDIA_URL}${user.profile.profile_picture}` : null
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Password change
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // OTP
  const [otpType, setOtpType] = useState('email')
  const [otpValue, setOtpValue] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 4000)
  }

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePic(file)
      const reader = new FileReader()
      reader.onload = (ev) => setProfilePicPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      if (profilePic) formData.append('profile_picture', profilePic)
      if (phoneNumber !== (user?.profile?.phone_number || '')) formData.append('phone_number', phoneNumber)
      if (countryCode !== (user?.profile?.country_code || '+91')) formData.append('country_code', countryCode)

      const res = await authFetch(`${API_URL}/profile/update/`, {
        method: 'PATCH',
        body: formData
      })

      if (res.ok) {
        showMsg('success', 'Profile updated!')
        // Update username/email via user endpoint
        if (username !== user.username || email !== (user.email || '')) {
          // Update user via admin-like endpoint or direct - skip for now since we don't have a User update endpoint
          showMsg('info', 'Username/email change not available yet')
        }
      } else {
        const err = await res.json()
        showMsg('error', Object.values(err).flat().join(', '))
      }
    } catch (err) {
      showMsg('error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setChangingPassword(true)
    try {
      const res = await authFetch(`${API_URL}/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      })
      if (res.ok) {
        showMsg('success', 'Password changed successfully!')
        setOldPassword('')
        setNewPassword('')
      } else {
        const err = await res.json()
        showMsg('error', Object.values(err).flat().join(', '))
      }
    } catch (err) {
      showMsg('error', 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSendOtp = async () => {
    setSendingOtp(true)
    try {
      const val = otpType === 'email' ? (otpValue || email) : (otpValue || phoneNumber)
      if (!val) {
        showMsg('error', `Please enter your ${otpType} address`)
        return
      }
      const payload = { otp_type: otpType, value: val }
      if (otpType === 'phone') {
        payload.country_code = countryCode
      }
      const res = await authFetch(`${API_URL}/profile/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json()
        setOtpSent(true)
        showMsg('success', `OTP sent! (Dev: ${data.otp_code})`)
      } else {
        const err = await res.json()
        showMsg('error', Object.values(err).flat().join(', '))
      }
    } catch (err) {
      showMsg('error', 'Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    setVerifying(true)
    try {
      const res = await authFetch(`${API_URL}/profile/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_type: otpType, otp_code: otpCode })
      })
      if (res.ok) {
        const data = await res.json()
        showMsg('success', `${otpType === 'email' ? 'Email' : 'Phone'} verified!`)
        setOtpSent(false)
        setOtpCode('')
        setOtpValue('')
      } else {
        const err = await res.json()
        showMsg('error', err.error || 'Invalid OTP')
      }
    } catch (err) {
      showMsg('error', 'Failed to verify OTP')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button onClick={() => navigate('/')} className="settings-back-btn">← Back to Chat</button>
        <h2>⚙️ Account Settings</h2>
      </div>

      {message.text && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-content">
        {/* Profile Photo */}
        <div className="settings-section">
          <h3>Profile Photo</h3>
          <div className="profile-photo-section">
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" className="profile-photo-preview" />
            ) : (
              <div className="profile-photo-placeholder">
                {(user?.username?.[0] || '?').toUpperCase()}
              </div>
            )}
            <label className="photo-upload-btn">
              📷 Change Photo
              <input type="file" accept="image/*" onChange={handleProfilePicChange} hidden />
            </label>
          </div>
        </div>

        {/* Account Info */}
        <form onSubmit={handleSaveProfile} className="settings-section">
          <h3>Account Info</h3>
          <div className="settings-field">
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Phone Number</label>
            <div className="phone-input-wrapper">
              <div className="country-code-selector" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="country-code-btn"
                >
                  {countryCode} ▾
                </button>
                {showCountryDropdown && (
                  <div className="country-code-dropdown">
                    {COUNTRY_CODES.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        className={`country-code-option ${c.code === countryCode ? 'active' : ''}`}
                        onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); }}
                      >
                        {c.name} {c.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="1234567890"
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="settings-save-btn">
            {saving ? <span className="spinner"></span> : '💾 Save Profile'}
          </button>
        </form>

        {/* OTP Verification */}
        <div className="settings-section">
          <h3>Verification</h3>
          <div className="otp-type-selector">
            <button
              type="button"
              className={`otp-type-btn ${otpType === 'email' ? 'active' : ''}`}
              onClick={() => { setOtpType('email'); setOtpSent(false); setOtpCode(''); }}
            >
              📧 Email
              {user?.profile?.email_verified && <span className="verified-badge">✓</span>}
            </button>
            <button
              type="button"
              className={`otp-type-btn ${otpType === 'phone' ? 'active' : ''}`}
              onClick={() => { setOtpType('phone'); setOtpSent(false); setOtpCode(''); }}
            >
              📱 Phone
              {user?.profile?.phone_verified && <span className="verified-badge">✓</span>}
            </button>
          </div>

          {!otpSent ? (
            <div className="otp-send-section">
              <div className="settings-field">
                <label>Enter {otpType === 'email' ? 'Email' : 'Phone'}</label>
                <input
                  type={otpType === 'email' ? 'email' : 'tel'}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  placeholder={otpType === 'email' ? 'your@email.com' : '+1234567890'}
                />
              </div>
              <button onClick={handleSendOtp} disabled={sendingOtp || !otpValue.trim()} className="otp-send-btn">
                {sendingOtp ? <span className="spinner"></span> : '📤 Send OTP'}
              </button>
            </div>
          ) : (
            <div className="otp-verify-section">
              <div className="settings-field">
                <label>Enter OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </div>
              <div className="otp-actions">
                <button onClick={handleVerifyOtp} disabled={verifying || otpCode.length < 6} className="otp-verify-btn">
                  {verifying ? <span className="spinner"></span> : '✅ Verify'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtpCode(''); }} className="otp-cancel-btn">
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="settings-section">
          <h3>Change Password</h3>
          <div className="settings-field">
            <label>Current Password</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
          </div>
          <div className="settings-field">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" disabled={changingPassword || !oldPassword || !newPassword} className="settings-save-btn">
            {changingPassword ? <span className="spinner"></span> : '🔑 Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    if (token) {
      fetchCurrentUser()
    } else {
      setInitializing(false)
    }
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const res = await authFetch(`${API_URL}/user/`)
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
        setToken(null)
        setUser(null)
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
      localStorage.removeItem('token')
      localStorage.removeItem('refresh')
      setToken(null)
      setUser(null)
    } finally {
      setInitializing(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    setToken(null)
    setUser(null)
  }

  if (initializing) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">💬</div>
        <div className="loading-spinner"></div>
        <p>Loading Civil_2026 Chatting...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          token && user ? (
            <Navigate to="/" replace />
          ) : (
            <Login setUser={setUser} setToken={setToken} />
          )
        }
      />
      <Route
        path="/register"
        element={
          token && user ? (
            <Navigate to="/" replace />
          ) : (
            <Register setUser={setUser} setToken={setToken} />
          )
        }
      />
      <Route
        path="/"
        element={
          token && user ? (
            <ChatDashboard user={user} token={token} handleLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/verify-email"
        element={<EmailVerification />}
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword setToken={setToken} />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword setToken={setToken} />}
      />
      <Route
        path="/settings"
        element={
          token && user ? (
            <Settings user={user} token={token} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin"
        element={
          token && user && user.is_superuser ? (
            <AdminPanel user={user} token={token} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/call-history"
        element={
          token && user ? (
            <CallHistoryPage user={user} token={token} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

