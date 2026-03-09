# Service Loading Fixes

## Problem
The application was not initializing because the API and scheduler services were being assigned to the window with lowercase names (`planwiseAPI`/`planwiseScheduler`), but the app was looking for uppercase names (`PlanWiseAPI`/`PlanWiseScheduler`). This caused the error message "Services niet geladen: api, scheduler" and blocked the login flow.

## Root Cause
- **services/api.js**: Exported as `window.planwiseAPI = new PlanWiseAPI();`
- **services/scheduler.js**: Exported as `window.planwiseScheduler = new PlanWiseScheduler();`
- **app.js**: Looking for `window.PlanWiseAPI` and `window.PlanWiseScheduler`
- **Result**: Services were available but not found by the application

## Fixes Implemented

### 1. Updated API Service Export
- **Change**: `window.planwiseAPI` → `window.PlanWiseAPI`
- **Added**: Backwards compatibility alias

### 2. Updated Scheduler Service Export
- **Change**: `window.planwiseScheduler` → `window.PlanWiseScheduler`
- **Added**: Backwards compatibility alias

### 3. Enhanced Service Availability Check
- **Updated**: `checkServices()` function to check both naming conventions

## Key Benefits

1. **Correct Naming Convention**: Services now use consistent PascalCase naming
2. **Backwards Compatibility**: Old code using lowercase names still works
3. **Robust Detection**: Service availability check handles both naming conventions
4. **Proper Initialization**: Application can now initialize and load properly

## Files Modified

- `services/api.js` - API service export and debug helpers
- `services/scheduler.js` - Scheduler service export and debug helpers
- `app.js` - Enhanced service availability check
- `tests/test_service_loading.js` - Test file for verification
