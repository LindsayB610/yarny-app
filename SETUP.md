# How to Register and Use Yarny

## Registration Flow

### Option 1: Register on Your Phone (Easiest)

1. **On your Google Pixel phone**, open Chrome or any browser
2. Navigate to `https://yarny.lindsaybrunner.com`
3. Enter your email address
4. Click "Sign in with your device"
5. You'll get a **direct fingerprint/face unlock prompt** on your phone
6. Approve with your biometric
7. Done! You're registered

### Option 2: Register on Desktop (Cross-Device)

1. **On your computer**, open Chrome (best support) or Edge
2. Navigate to `https://yarny.lindsaybrunner.com`
3. Enter your email address
4. Click "Sign in with your device"
5. Chrome will show options:
   - **"Use your phone"** - Click this if you see it
   - Or use a USB security key if you have one
6. On your phone, you'll get a notification to approve
7. Approve on your phone
8. Done! You're registered

## How Cross-Device Authentication Works

When you're on desktop and registered:

1. Enter your email on desktop
2. Click "Sign in with your device"
3. Chrome will automatically detect your phone (if signed into same Google account)
4. You'll see "Use your phone" option
5. A notification appears on your Pixel
6. Approve on your phone → logged in on desktop

## Tips

- **Best experience**: Register on your phone first (direct biometric)
- **Chrome works best** for cross-device authentication
- Make sure you're signed into the same Google account on both devices
- For desktop, Chrome/Edge have the best WebAuthn support

## Troubleshooting

### "No available authenticator" error
- Make sure you're using HTTPS (Netlify provides this)
- Try a different browser (Chrome or Edge)
- On desktop, make sure you're signed into Chrome/Google account

### Can't see "Use your phone" option
- Make sure you're signed into Chrome/Google account on both devices
- Try refreshing the page
- Check that both devices are on the same network (helps with discovery)

### Phone notification not appearing
- Check that Chrome notifications are enabled on your phone
- Make sure both devices have internet connection
- Try registering directly on your phone instead

