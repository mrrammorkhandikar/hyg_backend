# Email Authentication Fix Guide

## 🚨 Current Issue: Gmail OAuth2 Authentication Failed

The error "Username and Password not accepted" indicates that the Gmail OAuth2 credentials are not working properly. This is a common issue with Gmail OAuth2 setup.

## 🔧 Solutions

### **Option 1: Fix Gmail OAuth2 (Recommended)**

#### **Step 1: Enable 2-Factor Authentication**
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** > **2-Step Verification**
3. Enable 2-Factor Authentication if not already enabled

#### **Step 2: Generate App Password**
1. Go to **Security** > **2-Step Verification** > **App passwords**
2. Click **Generate app password**
3. Select **Mail** and **Other (custom name)**
4. Enter a name like "HygieneShelf Backend"
5. Copy the generated 16-character password

#### **Step 3: Configure Gmail Account for Less Secure Apps**
1. Go to: https://myaccount.google.com/lesssecureapps
2. Turn ON "Allow less secure app access" (if available)
3. Note: Google may have deprecated this option for newer accounts

#### **Step 4: Verify OAuth2 Credentials**
1. Check your `.env` file has correct credentials:
   ```
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REFRESH_TOKEN=your-refresh-token
   ```

#### **Step 5: Re-run OAuth Setup**
```bash
cd backend
npx ts-node get-gmail-refresh-token-port-3001.ts
```

### **Option 2: Use SMTP Fallback (Easier)**

If Gmail OAuth2 continues to fail, use SMTP with App Password:

#### **Step 1: Generate Gmail App Password**
1. Enable 2-Factor Authentication in Google Account
2. Go to **Security** > **2-Step Verification** > **App passwords**
3. Generate app password for "Mail"

#### **Step 2: Update .env File**
Add these lines to your `.env` file:
```env
# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=morkhandikars@gmail.com
SMTP_PASS=your-16-character-app-password
```

#### **Step 3: Test SMTP**
```bash
cd backend
node test-email-system.ts
```

### **Option 3: Use Alternative Email Provider**

If Gmail continues to have issues, use another email provider:

#### **Outlook/Hotmail SMTP:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### **Yahoo SMTP:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

## 🚀 Quick Fix Instructions

### **For Immediate Use (SMTP Fallback):**

1. **Generate Gmail App Password:**
   - Go to Google Account > Security > 2-Step Verification > App passwords
   - Generate password for "Mail"

2. **Update .env file:**
   ```env
   # Add these lines to your .env file:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=iammrrammorkhandikar@gmail.com
   SMTP_PASS=kttr odlz xwbq prop
   ```

3. **Restart backend:**
   ```bash
   npm run dev
   ```

4. **Test newsletter subscription:**
   - Visit http://localhost:3000/newsletter
   - Subscribe and check if welcome email sends

## 🔍 Troubleshooting

### **Error: "Invalid login: 535-5.7.8"**
- ✅ Enable 2-Factor Authentication
- ✅ Generate App Password (not regular password)
- ✅ Use App Password in SMTP_PASS

### **Error: "Username and Password not accepted"**
- ✅ Check SMTP credentials are correct
- ✅ Verify App Password is 16 characters
- ✅ Ensure SMTP_SECURE=false for port 587

### **Error: "Gmail OAuth2 failed"**
- ✅ Re-run OAuth setup script
- ✅ Check OAuth consent screen is configured
- ✅ Add test users to OAuth consent screen

### **Error: "Missing required Gmail OAuth2 environment variables"**
- ✅ Verify all GMAIL_* variables are in .env
- ✅ Check no typos in variable names
- ✅ Ensure .env file is in backend directory

## 📋 Success Checklist

After implementing the fix:

- ✅ **Email system loads without errors**
- ✅ **Newsletter subscription works**
- ✅ **Welcome email sends successfully**
- ✅ **Beautiful HygieneShelf email template displays**

## 🎯 Recommended Approach

1. **Try SMTP Fallback first** (easiest and most reliable)
2. **Use Gmail App Password** for authentication
3. **Keep OAuth2 credentials** for future use
4. **Test thoroughly** before going live

The system now supports both OAuth2 and SMTP, automatically falling back to SMTP if OAuth2 fails!
