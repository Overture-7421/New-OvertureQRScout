# Deployment Guide - Overture RebuiltQR

## PWA Deployment Options

### Option 1: GitHub Pages (Free)
```bash
# 1. Build the app
npm run build

# 2. Install gh-pages
npm install --save-dev gh-pages

# 3. Add to package.json scripts:
"deploy": "gh-pages -d dist"

# 4. Deploy
npm run deploy
```

### Option 2: Netlify (Free)
1. Push code to GitHub
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`

### Option 3: Vercel (Free)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 4: Local Network (Competition)
```bash
# Build
npm run build

# Serve locally
npm run preview

# Or use simple HTTP server
npx serve dist -l 3000

# Access from other devices: http://YOUR-IP:3000
```

## Installing as PWA

### On Mobile (Android/iOS)
1. Open app in browser (Chrome/Safari)
2. Tap "Add to Home Screen"
3. App installs like native app
4. Works offline!

### On Desktop (Chrome/Edge)
1. Open app in browser
2. Click install icon in address bar
3. Or Settings → Install app

## Offline Testing

1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open in browser
4. Developer Tools → Network tab
5. Check "Offline" checkbox
6. Reload page
7. ✅ App should work!

## Custom Domain Setup

### With Netlify
1. Go to Domain Settings
2. Add custom domain
3. Follow DNS instructions

### With GitHub Pages
1. Add CNAME file to public folder
2. Add custom domain in repo settings

## Pre-Competition Checklist

✅ Test all field types work  
✅ Test schedule upload  
✅ Test config upload  
✅ Test QR code generation  
✅ Test offline mode  
✅ Install on all scouting devices  
✅ Verify dark theme on devices  
✅ Test data export to spreadsheet  

## Troubleshooting

**QR Code not scanning:**
- Increase screen brightness
- Ensure QR code fully visible
- Try different QR scanner app

**App not working offline:**
- Clear browser cache
- Rebuild and redeploy
- Check service worker registration

**Schedule not loading:**
- Verify file format
- Check for special characters
- Ensure UTF-8 encoding

**Custom config not applying:**
- Validate JSON format
- Check for missing commas
- Verify field type names

## Performance Tips

- Use production build (`npm run build`)
- Enable compression on server
- Cache config and schedule files
- Minimize custom config complexity

---

**Need Help?** Check MVP.txt for detailed specifications.
