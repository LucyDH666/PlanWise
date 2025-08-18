# PlanWise Troubleshooting Guide

## 🚨 Quick Fixes

### Application Not Loading
1. **Clear browser cache and storage**
   - Open browser developer tools (F12)
   - Go to Application/Storage tab
   - Clear all localStorage for this domain
   - Refresh the page

2. **Check browser console for errors**
   - Press F12 to open developer tools
   - Look for red error messages in the Console tab
   - Report any errors to support

3. **Try the diagnostic tool**
   - Open `diagnostic.html` in your browser
   - Run the diagnostics to identify issues
   - Follow the recommendations

### Login Issues
1. **Cannot access login modal**
   - Refresh the page (Ctrl+F5)
   - Check if JavaScript is enabled
   - Try a different browser

2. **Super Admin credentials**
   - Company: `planwise`
   - Username: `admin`
   - Password: `admin123`

3. **Organization not found**
   - Use the exact slug from Super Admin
   - Check spelling and case sensitivity
   - Register the organization first

### Calendar Not Loading
1. **FullCalendar library issues**
   - Check internet connection
   - Refresh the page
   - Clear browser cache

2. **Fallback calendar view**
   - The app will show a simplified calendar if FullCalendar fails
   - All functionality remains available

## 🔧 Advanced Troubleshooting

### Service Worker Issues
```javascript
// Check service worker status
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers:', registrations);
  });
}
```

### Storage Issues
```javascript
// Check localStorage availability
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('LocalStorage working');
} catch (error) {
  console.error('LocalStorage error:', error);
}
```

### Health Check
```javascript
// Run comprehensive health check
if (typeof window.runPlanwiseHealthCheck === 'function') {
  window.runPlanwiseHealthCheck();
}
```

### Run All Tests
```javascript
// Run all diagnostic tests
if (typeof window.runPlanwiseTests === 'function') {
  window.runPlanwiseTests();
}
```

## 🐛 Common Issues

### Issue: "Services niet geladen"
**Cause:** JavaScript files failed to load
**Solution:**
1. Check internet connection
2. Refresh the page
3. Clear browser cache
4. Check browser console for network errors

### Issue: "Auth service failed"
**Cause:** Authentication service not available
**Solution:**
1. Refresh the page
2. Clear localStorage
3. Try logging in again

### Issue: "Data service missing"
**Cause:** Data service failed to initialize
**Solution:**
1. Check browser console for errors
2. Refresh the page
3. Clear browser storage

### Issue: "UI elements missing"
**Cause:** DOM elements not found
**Solution:**
1. Wait for page to fully load
2. Refresh the page
3. Check if JavaScript is enabled

## 📱 Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Required Features
- LocalStorage support
- Service Worker support (optional)
- ES6+ JavaScript support
- Modern CSS support

## 🔍 Diagnostic Tools

### Built-in Tools
1. **Health Check**: `window.runPlanwiseHealthCheck()`
2. **Test Suite**: `window.runPlanwiseTests()`
3. **Service Check**: `window.checkServices()`

### Diagnostic Page
Open `diagnostic.html` for a comprehensive diagnostic tool that:
- Checks all services
- Tests functionality
- Shows storage information
- Provides console logs

## 📞 Support

### Before Contacting Support
1. Run the diagnostic tool
2. Check browser console for errors
3. Try a different browser
4. Clear browser cache and storage

### Information to Provide
- Browser and version
- Error messages from console
- Steps to reproduce the issue
- Diagnostic tool results

## 🔄 Reset Options

### Soft Reset (Recommended)
1. Clear localStorage for this domain
2. Refresh the page
3. Log in again

### Hard Reset
1. Clear all browser data for this domain
2. Restart browser
3. Navigate to the application

### Complete Reset
1. Clear all browser data
2. Restart browser
3. Navigate to the application
4. Register new organization

## 🚀 Performance Tips

### For Better Performance
1. Use a modern browser
2. Keep browser updated
3. Close unnecessary tabs
4. Clear browser cache regularly

### Offline Usage
- The app works offline
- Data is stored locally
- Sync when connection is restored

## 📋 Checklist

Before reporting an issue, please check:

- [ ] Browser is up to date
- [ ] JavaScript is enabled
- [ ] No browser extensions interfering
- [ ] Internet connection is stable
- [ ] Console shows no errors
- [ ] Diagnostic tool passes all tests
- [ ] Issue persists in different browser
- [ ] Issue persists after cache clear

## 🔐 Security Notes

- All data is stored locally in your browser
- No data is sent to external servers
- Clear browser data to remove all information
- Use private/incognito mode for additional privacy
