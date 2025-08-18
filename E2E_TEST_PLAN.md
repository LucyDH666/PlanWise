# PlanWise E2E Test Plan - GitHub Pages

## Test Omgeving
- **URL**: GitHub Pages URL van PlanWise
- **Browser**: Chrome, Firefox, Safari (latest versions)
- **Device**: Desktop, Tablet, Mobile
- **Network**: Normal, Slow 3G, Offline

## Pre-test Setup
1. Clear browser cache and localStorage
2. Disable browser extensions that might interfere
3. Open browser developer tools (F12)
4. Navigate to GitHub Pages URL

---

## Test Suite 1: Fresh Start & Login Modal

### Test 1.1: Hard Refresh → Login Modal
**Steps:**
1. Navigate to GitHub Pages URL
2. Press Ctrl+Shift+R (hard refresh)
3. Wait for page to load completely

**Expected Results:**
- ✅ Login modal appears immediately
- ✅ No console errors
- ✅ All scripts load successfully
- ✅ Dialog polyfill is active

**Acceptance Criteria:**
- Login modal opens within 2 seconds
- Modal is clickable and responsive
- No JavaScript errors in console

### Test 1.2: Modal Polyfill Functionality
**Steps:**
1. Open login modal
2. Click outside modal to close
3. Reopen modal
4. Click X button to close
5. Reopen modal
6. Press Escape key to close

**Expected Results:**
- ✅ Modal opens and closes properly
- ✅ No "nothing is clickable" issues
- ✅ Modal backdrop works correctly
- ✅ Focus management works

---

## Test Suite 2: Super Admin Login & Organization Management

### Test 2.1: Super Admin Login
**Steps:**
1. Open login modal
2. Enter credentials:
   - Bedrijfsnaam: `PLANWISE_PLATFORM`
   - Gebruikersnaam: `superadmin`
   - Wachtwoord: `planwise2025!`
3. Click "Inloggen"

**Expected Results:**
- ✅ Login successful
- ✅ Navigation shows "🔧 Super Admin" button
- ✅ Dashboard shows platform statistics
- ✅ No error messages

### Test 2.2: Create New Organization
**Steps:**
1. Click "🔧 Super Admin" button
2. Click "🏢 Nieuwe Organisatie" button
3. Fill form:
   - Bedrijfsnaam: `Test HVAC Solutions`
   - Branche: `HVAC (Verwarming, Ventilatie, Airco)`
   - Plan: `trial`
4. Click "Organisatie Aanmaken"

**Expected Results:**
- ✅ Organization created successfully
- ✅ Login-slug column shows generated slug (e.g., `testhvacsolutions`)
- ✅ Organization appears in table
- ✅ Slug is properly formatted (lowercase, no spaces)

### Test 2.3: Verify Login-slug Column
**Steps:**
1. In Super Admin dashboard, locate the new organization
2. Check the "Login-slug" column
3. Verify slug format

**Expected Results:**
- ✅ Login-slug column exists
- ✅ Slug is displayed in code format
- ✅ Slug matches expected pattern
- ✅ Slug is clickable/copyable

---

## Test Suite 3: Tenant Login with Slug System

### Test 3.1: Login with Company Name (Case-insensitive)
**Steps:**
1. Logout from Super Admin
2. Open login modal
3. Enter credentials:
   - Bedrijfsnaam: `Test HVAC Solutions` (exact case)
   - Gebruikersnaam: `admin`
   - Wachtwoord: `password123`
4. Click "Inloggen"

**Expected Results:**
- ✅ Login successful
- ✅ User sees tenant dashboard
- ✅ No error messages

### Test 3.2: Login with Different Case
**Steps:**
1. Logout
2. Open login modal
3. Enter credentials:
   - Bedrijfsnaam: `test hvac solutions` (lowercase)
   - Gebruikersnaam: `admin`
   - Wachtwoord: `password123`
4. Click "Inloggen"

**Expected Results:**
- ✅ Login successful (case-insensitive)
- ✅ Same tenant dashboard appears

### Test 3.3: Login with Slug
**Steps:**
1. Logout
2. Open login modal
3. Enter credentials:
   - Bedrijfsnaam: `testhvacsolutions` (slug)
   - Gebruikersnaam: `admin`
   - Wachtwoord: `password123`
4. Click "Inloggen"

**Expected Results:**
- ✅ Login successful using slug
- ✅ Same tenant dashboard appears

### Test 3.4: Login with Wrong Slug/Name
**Steps:**
1. Open login modal
2. Enter credentials:
   - Bedrijfsnaam: `nonexistent`
   - Gebruikersnaam: `admin`
   - Wachtwoord: `password123`
3. Click "Inloggen"

**Expected Results:**
- ✅ Clear error message: "Onbekende organisatie; gebruik de slug uit Super Admin of registreer eerst een account."
- ✅ Available organizations dropdown populated
- ✅ Login modal remains open
- ✅ No page crash or stuck overlay

---

## Test Suite 4: Switch Tenant Dialog

### Test 4.1: Open Switch Tenant Dialog
**Steps:**
1. Login as Super Admin
2. Click "👤 Account" dropdown
3. Click "🔄 Switch Tenant"

**Expected Results:**
- ✅ Switch Tenant modal opens
- ✅ Dropdown shows available organizations
- ✅ Each option shows: "Name (slug) - plan"
- ✅ "🔧 Ga naar Super Admin" button visible (for superadmin role)

### Test 4.2: Close Dialog with X Button
**Steps:**
1. In Switch Tenant modal, click X button
2. Verify modal closes

**Expected Results:**
- ✅ Modal closes properly
- ✅ No tenant selection required
- ✅ No errors or stuck overlays

### Test 4.3: Close Dialog with Cancel Button
**Steps:**
1. Reopen Switch Tenant modal
2. Click "Annuleren" button
3. Verify modal closes

**Expected Results:**
- ✅ Modal closes properly
- ✅ No tenant selection required
- ✅ No errors

### Test 4.4: Switch to Different Tenant
**Steps:**
1. In Switch Tenant modal, select a different organization
2. Click "Ga naar organisatie"
3. Verify switch

**Expected Results:**
- ✅ Modal closes
- ✅ Page reloads
- ✅ User is now in selected tenant context
- ✅ Navigation shows tenant-specific options

### Test 4.5: Switch to Super Admin from Modal
**Steps:**
1. Login as regular tenant user
2. Open Switch Tenant modal
3. Click "🔧 Ga naar Super Admin" (if visible)
4. Verify switch

**Expected Results:**
- ✅ Modal closes
- ✅ Page reloads
- ✅ User is now in Super Admin context
- ✅ Super Admin dashboard appears

---

## Test Suite 5: Reset App Functionality

### Test 5.1: Reset App Button
**Steps:**
1. Login as any user
2. Click "👤 Account" dropdown
3. Click "🔄 Reset App"
4. Confirm reset

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ All PlanWise data cleared from localStorage
- ✅ Login modal appears automatically
- ✅ No stuck overlays or modals

### Test 5.2: Reset App and Verify Clean State
**Steps:**
1. Perform reset
2. Check localStorage (F12 → Application → Local Storage)
3. Verify only non-PlanWise data remains

**Expected Results:**
- ✅ All `planwise_*` keys removed
- ✅ Login modal shows
- ✅ No previous session data visible

---

## Test Suite 6: Error Handling & Recovery

### Test 6.1: Failed Login Recovery
**Steps:**
1. Enter invalid credentials
2. Click "Inloggen"
3. Verify error handling

**Expected Results:**
- ✅ Clear error message displayed
- ✅ Login modal remains open
- ✅ Form fields retain values
- ✅ No page crash

### Test 6.2: Network Error Recovery
**Steps:**
1. Disconnect network
2. Try to login
3. Reconnect network
4. Try login again

**Expected Results:**
- ✅ Graceful handling of network errors
- ✅ App remains functional
- ✅ Login works after reconnection

### Test 6.3: Modal Overlay Cleanup
**Steps:**
1. Open multiple modals quickly
2. Close them in different ways
3. Verify no stuck overlays

**Expected Results:**
- ✅ No stuck `.modal-backdrop` elements
- ✅ No stuck `.overlay` elements
- ✅ No stuck `.fc-popover` elements
- ✅ All modals close properly

---

## Test Suite 7: FullCalendar Integration

### Test 7.1: Calendar Loading
**Steps:**
1. Login as tenant user
2. Navigate to Dashboard
3. Wait for calendar to load

**Expected Results:**
- ✅ FullCalendar loads successfully
- ✅ Calendar is interactive
- ✅ No JavaScript errors
- ✅ Events display correctly

### Test 7.2: Calendar Fallback
**Steps:**
1. Block FullCalendar CDN in network tab
2. Refresh page
3. Check calendar functionality

**Expected Results:**
- ✅ Fallback script loads
- ✅ Calendar still works
- ✅ No broken functionality

---

## Test Suite 8: Mobile & Responsive Testing

### Test 8.1: Mobile Login
**Steps:**
1. Open on mobile device or mobile view
2. Test login modal
3. Test navigation

**Expected Results:**
- ✅ Modal responsive on mobile
- ✅ Touch interactions work
- ✅ Navigation adapts to screen size

### Test 8.2: Mobile Super Admin
**Steps:**
1. Login as Super Admin on mobile
2. Test organization table
3. Test modals

**Expected Results:**
- ✅ Table scrolls horizontally
- ✅ Modals fit screen
- ✅ All functionality accessible

---

## Performance & Load Testing

### Test 9.1: Page Load Performance
**Steps:**
1. Open browser dev tools
2. Navigate to GitHub Pages URL
3. Check load times

**Expected Results:**
- ✅ Page loads within 3 seconds
- ✅ All resources load successfully
- ✅ No 404 errors

### Test 9.2: Memory Usage
**Steps:**
1. Open multiple modals
2. Switch between tenants
3. Monitor memory usage

**Expected Results:**
- ✅ No memory leaks
- ✅ Clean modal cleanup
- ✅ Stable performance

---

## Accessibility Testing

### Test 10.1: Keyboard Navigation
**Steps:**
1. Use Tab to navigate
2. Use Enter/Space to activate
3. Use Escape to close modals

**Expected Results:**
- ✅ All elements reachable by keyboard
- ✅ Focus management works
- ✅ Screen reader compatible

### Test 10.2: Color Contrast
**Steps:**
1. Check text contrast
2. Verify error messages visible
3. Test in high contrast mode

**Expected Results:**
- ✅ Sufficient color contrast
- ✅ Error messages clearly visible
- ✅ Accessible color scheme

---

## Test Execution Checklist

### Pre-execution
- [ ] Clear browser cache
- [ ] Clear localStorage
- [ ] Open developer tools
- [ ] Set up test data

### During Execution
- [ ] Document any errors
- [ ] Take screenshots of issues
- [ ] Note browser/device details
- [ ] Record performance metrics

### Post-execution
- [ ] Compile test results
- [ ] Document any failures
- [ ] Create bug reports if needed
- [ ] Update test plan based on findings

---

## Success Criteria

### Must Pass (100%)
- ✅ Login modal appears on fresh start
- ✅ Super Admin login works
- ✅ Organization creation with slug works
- ✅ Case-insensitive login works
- ✅ Switch tenant dialog closes properly
- ✅ Reset app clears all data
- ✅ No console errors
- ✅ No stuck overlays

### Should Pass (90%+)
- ✅ All E2E test scenarios
- ✅ Mobile responsiveness
- ✅ Performance requirements
- ✅ Accessibility standards

### Nice to Have (80%+)
- ✅ Advanced error handling
- ✅ Offline functionality
- ✅ Advanced accessibility features

---

## Bug Reporting Template

**Bug Title:** [Clear description]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]

**Actual Result:** [What actually happened]

**Environment:**
- Browser: [Version]
- OS: [Version]
- Device: [Type]
- Network: [Type]

**Screenshots:** [If applicable]

**Console Errors:** [If any]

**Priority:** [High/Medium/Low]
