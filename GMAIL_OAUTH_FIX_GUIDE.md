# Gmail OAuth2 Setup - Fix Guide

## 🚨 Current Issues Fixed

### ✅ **Fixed Issues:**
1. **Email Format Error**: Changed `morkhandikars@gmail,com` to `morkhandikars@gmail.com`
2. **Missing Refresh Token**: Still needs to be obtained

### ❌ **Remaining Issue:**
- **OAuth Client Not Found**: The Google OAuth credentials may not be properly configured

## 🔧 How to Fix the "OAuth Client Not Found" Error

### **Step 1: Verify Google Cloud Console Setup**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project** (or create a new one)
3. **Navigate to APIs & Services > Credentials**

### **Step 2: Check OAuth Consent Screen**

1. **Go to APIs & Services > OAuth consent screen**
2. **Ensure it's configured as "External"** (for testing)
3. **Add test users**: Add `iammrrammorkhandikar@gmail.com` as a test user
4. **Save and submit for verification** (if required)

### **Step 3: Verify OAuth Client ID**

1. **In Credentials page, check your OAuth 2.0 Client ID**
2. **Ensure the Client ID matches**: `y632947349336-e2ebcv4mdpl9tmgbgu5goi9h5l8thcae.apps.googleusercontent.com`
3. **Check the Client Secret matches**: `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`

### **Step 4: Configure Authorized Redirect URIs**

Add these redirect URIs to your OAuth 2.0 Client ID:
```
http://localhost:3001/oauth2callback
http://localhost:3000/oauth2callback
```

### **Step 5: Test the OAuth Flow**

```bash
cd backend
npx ts-node get-gmail-refresh-token-port-3001.ts
```

## 🚀 Alternative: Create New OAuth Credentials

If the current credentials don't work, create new ones:

### **Step 1: Create New OAuth 2.0 Client ID**

1. **Go to Google Cloud Console > APIs & Services > Credentials**
2. **Click "Create Credentials" > OAuth 2.0 Client ID**
3. **Application type**: Web application
4. **Name**: HygieneShelf Backend
5. **Authorized redirect URIs**:
   ```
   http://localhost:3001/oauth2callback
   http://localhost:3000/oauth2callback
   ```

### **Step 2: Update .env File**

Replace the credentials in `.env` with the new ones:
```env
GMAIL_CLIENT_ID=your-new-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-new-client-secret
```

### **Step 3: Configure OAuth Consent Screen**

1. **Go to OAuth consent screen**
2. **User Type**: External
3. **App name**: HygieneShelf
4. **User support email**: your-email@gmail.com
5. **Developer contact email**: your-email@gmail.com
6. **Add test users**: iammrrammorkhandikar@gmail.com
7. **Save and submit for verification**

### **Step 4: Run OAuth Script**

```bash
cd backend
npx ts-node get-gmail-refresh-token-port-3001.ts
```

## 📋 Required Google APIs

Ensure these APIs are enabled in your Google Cloud project:

1. **Gmail API** - For sending emails
2. **Google+ API** - For user information (if needed)

**To enable APIs:**
1. Go to APIs & Services > Library
2. Search for "Gmail API" and enable it
3. Search for "Google+ API" and enable it

## 🔍 Troubleshooting

### **Error: "OAuth client was not found"**
- ✅ Check Client ID in `.env` matches Google Cloud Console
- ✅ Ensure OAuth consent screen is configured
- ✅ Add test users to OAuth consent screen
- ✅ Verify redirect URIs are correct

### **Error: "invalid_client"**
- ✅ Check Client Secret in `.env` matches Google Cloud Console
- ✅ Ensure OAuth 2.0 Client ID is for "Web application"
- ✅ Verify project is correct in Google Cloud Console

### **Error: "redirect_uri_mismatch"**
- ✅ Check redirect URIs in Google Cloud Console match the script
- ✅ Ensure both `http://localhost:3000` and `http://localhost:3001` are added

## 🎯 Success Criteria

After fixing the OAuth setup, you should see:
```
✅ SUCCESS: Gmail OAuth2 Refresh Token Obtained
🔑 Your Refresh Token: [actual-token-here]
📝 The refresh token has been saved to your .env file
```

## 📞 Support

If you continue to have issues:

1. **Double-check all steps above**
2. **Verify Google Cloud project selection**
3. **Ensure test users are added**
4. **Check that APIs are enabled**
5. **Try creating new OAuth credentials**

Once the OAuth is working, the beautiful welcome emails will send successfully! 🎉
