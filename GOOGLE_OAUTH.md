# 🔐 Google OAuth Integration

Your AI assistant now supports Google OAuth authentication for seamless integration with Google services!

## 🚀 **Features**

### **🔐 Secure Authentication**
- **OAuth 2.0 flow** with Google's secure authentication
- **Automatic token refresh** for seamless experience
- **Scoped permissions** - only request what you need
- **Token storage** with automatic cleanup

### **📧 Gmail Integration Ready**
- **Gmail API access** for future email features
- **Read emails** and compose messages
- **Smart email insights** and automation
- **Secure email management** 

### **👤 Profile Integration**
- **User profile** information and avatar
- **Verified email** status
- **Personalized experience** based on Google account

## 🛠️ **Setup Instructions**

### **1. Create Google OAuth Credentials**

#### **Step 1: Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Google+ API** (for profile info)
   - **Gmail API** (for email features)

#### **Step 2: Create OAuth Client**
1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Choose **"Web application"**
4. Set **Name**: "AI Assistant"

#### **Step 3: Configure URLs**
**Authorized JavaScript origins:**
```
http://localhost:3000
https://your-domain.com
```

**Authorized redirect URIs:**
```
http://localhost:5001/api/auth/google/callback
https://your-domain.com/api/auth/google/callback
```

#### **Step 4: Get Credentials**
- Copy **Client ID** and **Client Secret**
- We'll use these in the next step

### **2. Environment Configuration**

#### **Backend (.env file):**
```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here  
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

#### **Frontend (.env.local file):**
```bash
# Google OAuth Configuration  
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

### **3. Replace Placeholder Values**
Replace the placeholder values with your actual credentials:
- `your_google_client_id_here` → Your Google Client ID
- `your_google_client_secret_here` → Your Google Client Secret

## 🎮 **How to Use**

### **Voice Commands**
```bash
"Am I logged into Google?"
"Connect my Google account"
"Sign in with Google"
"Enable Gmail access"
"Check Google account status"
"Disconnect Google account"
```

### **Text Commands**
```bash
"check google auth"
"connect google with gmail access"
"disconnect google"
```

### **UI Component**
You can also use the Google Auth component directly:
```tsx
import GoogleAuth from '../components/GoogleAuth';

<GoogleAuth 
  requestGmailAccess={true}
  onAuthChange={(authenticated, user) => {
    console.log('Auth changed:', authenticated, user);
  }}
/>
```

## 🔧 **API Endpoints**

### **Authentication Flow**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google/login` | GET | Start OAuth flow |
| `/api/auth/google/callback` | GET | Handle OAuth callback |
| `/api/auth/google/status` | GET | Check auth status |
| `/api/auth/google/logout` | POST | Disconnect account |
| `/api/auth/google/user` | GET | Get user profile |

### **Usage Examples**

#### **Check Status**
```bash
curl http://localhost:5001/api/auth/google/status
```

#### **Start Login (with Gmail)**
```bash
curl "http://localhost:5001/api/auth/google/login?gmail=true"
```

#### **Logout**
```bash
curl -X POST http://localhost:5001/api/auth/google/logout \
  -H "Content-Type: application/json" \
  -d '{"userId": "user@example.com"}'
```

## 🎯 **Available Tools**

### **1. check_google_auth**
**Purpose:** Check if user is authenticated with Google
```bash
User: "Am I logged into Google?"
AI: "✅ Google account connected: John Doe (john@example.com) with Gmail access"
```

### **2. connect_google**
**Purpose:** Start Google OAuth flow
**Parameters:** 
- `gmail_access` (optional) - Request Gmail permissions

```bash
User: "Connect my Google account with Gmail access"
AI: "🔗 Google authentication URL generated. Please visit: https://accounts.google.com/oauth/..."
```

### **3. disconnect_google**
**Purpose:** Disconnect Google account and revoke tokens
```bash
User: "Disconnect my Google account"
AI: "✅ Google account disconnected successfully"
```

## 🔒 **Security & Privacy**

### **Token Storage**
- **Local file storage** for development (backend/data/google_tokens.json)
- **Automatic encryption** in production (use database)
- **Token expiration** handling with auto-refresh
- **Secure revocation** when disconnecting

### **Scopes & Permissions**
#### **Basic Profile** (default):
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

#### **Gmail Access** (when requested):
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.compose`
- Plus profile scopes above

### **Privacy Features**
- ✅ **Minimal permissions** - only request what's needed
- ✅ **User consent** required for each scope
- ✅ **Token revocation** available anytime
- ✅ **No data storage** without explicit consent

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Google OAuth credentials not configured"**
- ✅ Check your `.env` files have the correct values
- ✅ Restart both frontend and backend after updating env files
- ✅ Verify Client ID and Client Secret are correct

#### **"Redirect URI mismatch"**
- ✅ Check Google Cloud Console redirect URIs match exactly
- ✅ Include both HTTP (localhost) and HTTPS (production) URLs
- ✅ No trailing slashes in redirect URIs

#### **"Access blocked: This app's request is invalid"**
- ✅ Enable required APIs in Google Cloud Console
- ✅ Verify OAuth consent screen is configured
- ✅ Check authorized domains are set correctly

### **Debug Mode**
Enable debug logging by setting:
```bash
DEBUG_GOOGLE_AUTH=true
```

### **Reset Everything**
If things get stuck:
1. Delete `backend/data/google_tokens.json`
2. Restart backend server
3. Clear browser cookies for localhost
4. Try authentication again

## 🎉 **Future Gmail Features**

Once authenticated with Gmail access, your assistant will support:

### **📧 Email Management**
```bash
"Show me my latest emails"
"Compose email to john@example.com"
"Search emails about project updates"
"Create email draft"
```

### **📊 Email Analytics**
```bash
"How many unread emails do I have?"
"Who emails me the most?"
"Show email statistics for this week"
```

### **🤖 Smart Automation**
```bash
"Summarize my important emails"
"Draft a response to the latest email"
"Set up email filters"
"Schedule this email for later"
```

## 📋 **Development Notes**

### **Token Management**
- Tokens stored in `backend/data/google_tokens.json` (development)
- Production should use database with encryption
- Auto-refresh handles token expiration
- Graceful fallback for auth failures

### **Component Integration**
The `GoogleAuth` component can be embedded anywhere:
```tsx
// Basic profile only
<GoogleAuth onAuthChange={handleAuthChange} />

// With Gmail access
<GoogleAuth 
  requestGmailAccess={true}
  onAuthChange={handleAuthChange} 
/>
```

### **Error Handling**
- Network failures gracefully handled
- Clear error messages for users
- Automatic retry for transient failures
- Proper cleanup on disconnection

---

## ✅ **Setup Checklist**

- [ ] **Google Cloud Project** created
- [ ] **OAuth Client** configured with correct redirect URIs
- [ ] **APIs enabled** (Google+ API, Gmail API)
- [ ] **Environment variables** set in both .env files
- [ ] **Dependencies installed** (`google-auth-library`)
- [ ] **Backend and frontend** restarted after env changes
- [ ] **Test authentication** with "connect google account"

**🎉 Your AI assistant is now ready for Google integration!**

*Users can now connect their Google accounts for personalized experiences and future Gmail features.* 