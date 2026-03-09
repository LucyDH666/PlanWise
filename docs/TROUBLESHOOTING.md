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

3. **Try the diagnostic tool**
   - Open `diagnostic.html` in your browser
   - Run the diagnostics to identify issues

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

## 🐛 Common Issues

### Issue: "Services niet geladen"
**Cause:** JavaScript files failed to load
**Solution:**
1. Check internet connection
2. Refresh the page
3. Clear browser cache

### Issue: "Auth service failed"
**Cause:** Authentication service not available
**Solution:**
1. Refresh the page
2. Clear localStorage
3. Try logging in again

## 🔄 Reset Options

### Soft Reset (Recommended)
1. Clear localStorage for this domain
2. Refresh the page
3. Log in again

### Hard Reset
1. Clear all browser data for this domain
2. Restart browser
3. Navigate to the application

## 📋 Checklist

Before reporting an issue, please check:

- [ ] Browser is up to date
- [ ] JavaScript is enabled
- [ ] No browser extensions interfering
- [ ] Internet connection is stable
- [ ] Console shows no errors
- [ ] Issue persists in different browser
- [ ] Issue persists after cache clear
