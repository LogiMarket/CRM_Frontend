# Environment Variables - Email Verification Setup

## Complete .env.local Configuration

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/internal_chat_db

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=7d

# ============================================
# EMAIL VERIFICATION (Gmail SMTP)
# ============================================
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# ============================================
# API URLs
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3000

# ============================================
# OPTIONAL: Demo Mode
# ============================================
# If you want to disable database:
# DEMO_MODE=true
```

---

## 📝 Detailed Variable Explanation

### DATABASE_URL
**What it is**: PostgreSQL connection string
**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`
**Example**: `postgresql://admin:mypassword@localhost:5432/chat_db`
**Where to get it**: 
- Local: Run PostgreSQL locally
- Cloud: Use Supabase, Neon, Render, or similar

### JWT_SECRET
**What it is**: Secret key for signing JWT tokens
**Length**: Minimum 32 characters (preferably 64+)
**Security**: Change this in production! Use a strong random string
**Generate one**: 
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### JWT_EXPIRATION
**What it is**: How long JWT tokens are valid
**Options**: `7d`, `24h`, `30d`, `1w`, etc.
**Default**: `7d` (7 days)

### EMAIL_USER
**What it is**: Gmail email address for sending emails
**Format**: `your-email@gmail.com`
**Requirements**: Must have 2FA enabled
**Note**: This is the "sender" email address

### EMAIL_PASSWORD
**What it is**: Gmail App Password (NOT your normal password!)
**How to get it**:
1. Go to https://myaccount.google.com/security
2. Scroll down to "App passwords"
3. Select "Mail" and "Windows"
4. Google will generate a 16-character password
5. Copy and paste it here

**⚠️ IMPORTANT**: 
- ❌ Do NOT use your regular Gmail password
- ✅ Use the "App Password" Google generates
- ✅ Keep this secret (add to .gitignore)
- ✅ It looks like: `xxxx xxxx xxxx xxxx` (16 chars)

### NEXT_PUBLIC_API_URL
**What it is**: Base URL for email links and API calls
**Development**: `http://localhost:3000`
**Production**: `https://yourdomain.com`
**Why it matters**: Email verification links need this to work
**Example in email**: 
```
http://localhost:3000/verify-email?code=abc123&email=user@example.com
```

---

## 🔧 Setup by Environment

### Development (Local Machine)

```env
# .env.local (Never commit this!)
DATABASE_URL=postgresql://localhost/internal_chat_dev
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION=7d
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Staging

```env
DATABASE_URL=postgresql://user:pass@staging-db.example.com/internal_chat
JWT_SECRET=staging-secret-key-minimum-32-chars
JWT_EXPIRATION=7d
EMAIL_USER=staging-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
NEXT_PUBLIC_API_URL=https://staging.yourdomain.com
```

### Production

```env
# Stored in: .env.production.local or CI/CD secrets
DATABASE_URL=postgresql://user:pass@prod-db.example.com/internal_chat
JWT_SECRET=[VERY LONG RANDOM STRING - 64+ CHARS]
JWT_EXPIRATION=7d
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=[APP PASSWORD FROM GMAIL]
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets
```bash
# Add to .gitignore
.env.local
.env.production.local
.env.*.local
```

### 2. Different Passwords per Environment
- Dev: One password
- Staging: Different password
- Prod: Different password

### 3. Rotate Secrets Regularly
- Every 90 days
- Immediately if compromised
- When team member leaves

### 4. Use Strong Passwords
```bash
# Generate random secret (32+ chars)
# Linux/Mac:
openssl rand -base64 32

# Windows (run in any terminal):
certutil -encodehex -f nul stdout | find /v ":"|find /v "-" | findstr /r . | head -1
```

### 5. Use Environment Variable Management
Options:
- **Local**: `.env.local` files (with git ignore)
- **Vercel**: Project Settings → Environment Variables
- **Heroku**: Config Vars
- **AWS**: Secrets Manager
- **Google Cloud**: Secret Manager

---

## 📧 Gmail App Password Setup (Step by Step)

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com
2. Click "Security" (left sidebar)
3. Scroll to "How you sign in to Google"
4. Click "2-Step Verification"
5. Follow prompts (uses phone)

### Step 2: Create App Password
1. Go back to https://myaccount.google.com/security
2. Scroll to "App passwords" (bottom)
3. Select: **Mail** → **Windows** (or your device type)
4. Google generates a 16-character password
5. Copy it (includes spaces)

### Step 3: Add to .env.local
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## 🧪 Test Your Variables

### 1. Check if Variables Load
```bash
# In your app (lib/email.ts will show error if missing)
npm run dev
```

### 2. Test Email Sending
Create a test endpoint:
```typescript
// pages/api/test-email.ts
import { sendVerificationEmail } from "@/lib/email"

export default async function handler(req, res) {
  await sendVerificationEmail(
    "test@example.com",
    "Test User",
    "test-code-123",
    "http://localhost:3000/verify-email?code=123"
  )
  res.json({ success: true })
}
```

Visit: http://localhost:3000/api/test-email

### 3. Check Server Logs
```bash
# Look for email sending logs
npm run dev
# Should see: "Email sent to: test@example.com"
```

---

## ⚠️ Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Using normal Gmail password | Error 535: Auth failed | Use App Password instead |
| Missing EMAIL_USER | Undefined transporter | Set both EMAIL_USER and PASSWORD |
| NEXT_PUBLIC_API_URL wrong | Email links broken | Use correct domain |
| DATABASE_URL has typo | Connection error | Double-check connection string |
| Secrets in commits | Security risk | Use .gitignore always |
| JWT_SECRET too short | Weak tokens | Use 32+ character string |

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All variables set in CI/CD / hosting platform
- [ ] DATABASE_URL points to production database
- [ ] JWT_SECRET is a strong random string (64+ chars)
- [ ] EMAIL_USER and EMAIL_PASSWORD configured
- [ ] NEXT_PUBLIC_API_URL points to production domain
- [ ] Variables NOT in .env.local or package.json
- [ ] Database migrations executed in production
- [ ] Email test sent successfully
- [ ] Secrets manager / platform configured properly

---

## 📋 Variables Checklist

```bash
# After setup, verify these commands work:

# Check variables are loaded
echo $DATABASE_URL
echo $JWT_SECRET
echo $EMAIL_USER
echo $EMAIL_PASSWORD
echo $NEXT_PUBLIC_API_URL

# Or in Node:
node -e "console.log(process.env.EMAIL_USER)"
```

---

## 🆘 Troubleshooting

### "Error: transporter is not defined"
```
❌ EMAIL_USER or EMAIL_PASSWORD missing
✅ Add to .env.local and restart server
```

### "Error: ECONNREFUSED"
```
❌ DATABASE_URL wrong or database not running
✅ Check PostgreSQL is running: psql -U user -d dbname
```

### "Email links broken in production"
```
❌ NEXT_PUBLIC_API_URL not updated
✅ Set to production domain: https://yourdomain.com
```

### "JWT tokens invalid"
```
❌ JWT_SECRET changed between deploys
✅ Use same secret value for all deployments
```

---

## 📞 Support

If variables aren't working:
1. Verify they're in `.env.local`
2. Restart the development server
3. Check for typos (case-sensitive!)
4. Verify database is running
5. Test email separately with `nodemailer`

For more details, see **EMAIL_VERIFICATION_SETUP.md**
