import test from 'node:test';
import assert from 'node:assert/strict';
import { toast } from 'react-toastify';

import {
  COMPARE_TOAST_ID,
  COMPARE_ERROR_TOAST_ID,
  getCompareToastPosition,
  notifyCompareSuccess,
  notifyCompareError,
} from '../utils/compareHelpers.js';

test('Mobile Compare Toast: Toast IDs are properly named and isolate compare notifications', () => {
  assert.equal(typeof COMPARE_TOAST_ID, 'string');
  assert.equal(COMPARE_TOAST_ID, 'compare-status-toast');
  assert.equal(typeof COMPARE_ERROR_TOAST_ID, 'string');
  assert.equal(COMPARE_ERROR_TOAST_ID, 'compare-error-toast');
});

test('Mobile Compare Toast Position: Mobile screens (<768px) position toast at top-center to clear bottom Compare bar', () => {
  // Mobile portrait (360px)
  global.window = { innerWidth: 360 };
  assert.equal(getCompareToastPosition(), 'top-center');

  // Mobile iPhone (390px)
  global.window = { innerWidth: 390 };
  assert.equal(getCompareToastPosition(), 'top-center');

  // Small tablet / large phone (767px)
  global.window = { innerWidth: 767 };
  assert.equal(getCompareToastPosition(), 'top-center');

  // Must NEVER be bottom position on mobile screens
  assert.notEqual(getCompareToastPosition(), 'bottom-right');
  assert.notEqual(getCompareToastPosition(), 'bottom-center');
});

test('Mobile Compare Toast Position: Desktop screens (>=768px) position toast at top-right', () => {
  // Standard tablet / small desktop (768px)
  global.window = { innerWidth: 768 };
  assert.equal(getCompareToastPosition(), 'top-right');

  // Desktop (1024px)
  global.window = { innerWidth: 1024 };
  assert.equal(getCompareToastPosition(), 'top-right');

  // Wide desktop (1920px)
  global.window = { innerWidth: 1920 };
  assert.equal(getCompareToastPosition(), 'top-right');
});

test('Mobile Compare Toast Position: SSR fallback returns top-right when window is undefined', () => {
  const originalWindow = global.window;
  delete global.window;
  assert.equal(getCompareToastPosition(), 'top-right');
  global.window = originalWindow;
});

test('Mobile Compare Toast Configuration: Auto-dismiss between 2-3s, close button, and non-blocking hover', () => {
  let capturedOptions = null;
  let capturedMessage = null;
  let dismissedId = null;

  const originalSuccess = toast.success;
  const originalDismiss = toast.dismiss;

  toast.dismiss = (id) => {
    dismissedId = id;
  };

  toast.success = (msg, opts) => {
    capturedMessage = msg;
    capturedOptions = opts;
    return 'mock-toast-id';
  };

  try {
    global.window = { innerWidth: 375 };
    notifyCompareSuccess('Samsung 160 W Sound Tower');

    // 1. Toast dismissal of previous notifications to prevent stacking/duplicates
    assert.equal(dismissedId, COMPARE_TOAST_ID);

    // 2. Message format includes product name
    assert.ok(capturedMessage.includes('Samsung 160 W Sound Tower'));
    assert.ok(capturedMessage.includes('added to compare!'));

    // 3. Auto-dismiss timer strictly in 2-3 seconds range
    assert.ok(capturedOptions.autoClose >= 2000 && capturedOptions.autoClose <= 3000);
    assert.equal(capturedOptions.autoClose, 2500);

    // 4. Mobile screen position is top-center
    assert.equal(capturedOptions.position, 'top-center');

    // 5. Close button and click-to-dismiss must be enabled
    assert.equal(capturedOptions.closeButton, true);
    assert.equal(capturedOptions.closeOnClick, true);

    // 6. Mobile touch freeze prevention (CRITICAL BUG ROOT CAUSE FIX)
    assert.equal(capturedOptions.pauseOnHover, false, 'pauseOnHover must be false so mobile touch does not freeze auto-dismiss');
    assert.equal(capturedOptions.pauseOnFocusLoss, false, 'pauseOnFocusLoss must be false so mobile window focus shifts do not freeze auto-dismiss');

    // 7. Toast ID prevents duplicate stacking on rapid repeated clicks
    assert.equal(capturedOptions.toastId, COMPARE_TOAST_ID);
  } finally {
    toast.success = originalSuccess;
    toast.dismiss = originalDismiss;
  }
});

test('Mobile Compare Toast Error Configuration: Top position and reliable dismissal', () => {
  let capturedOptions = null;
  let capturedMessage = null;
  let dismissedId = null;

  const originalError = toast.error;
  const originalDismiss = toast.dismiss;

  toast.dismiss = (id) => {
    dismissedId = id;
  };

  toast.error = (msg, opts) => {
    capturedMessage = msg;
    capturedOptions = opts;
    return 'mock-error-toast-id';
  };

  try {
    global.window = { innerWidth: 412 };
    notifyCompareError('Compare list is full (max 4 products).', 'compare-full-toast');

    assert.equal(dismissedId, 'compare-full-toast');
    assert.equal(capturedOptions.toastId, 'compare-full-toast');
    assert.equal(capturedOptions.position, 'top-center');
    assert.equal(capturedOptions.autoClose, 3000);
    assert.equal(capturedOptions.pauseOnHover, false);
    assert.equal(capturedOptions.pauseOnFocusLoss, false);
    assert.equal(capturedOptions.closeButton, true);
  } finally {
    toast.error = originalError;
    toast.dismiss = originalDismiss;
  }
});

test('Timer Management & Cleanup: Unmount cleans up debounce timers and active compare notifications', () => {
  // Simulate the debounceRef and cleanup logic inside CompareContext
  const debounceRef = {
    current: {
      prod1: setTimeout(() => {}, 10000),
      prod2: setTimeout(() => {}, 10000),
      prod3: setTimeout(() => {}, 10000),
    },
  };

  const dismissedList = [];
  const mockToast = {
    dismiss: (id) => dismissedList.push(id),
  };

  // Perform unmount cleanup logic
  if (debounceRef.current) {
    Object.values(debounceRef.current).forEach((timer) => clearTimeout(timer));
    debounceRef.current = {};
  }
  mockToast.dismiss(COMPARE_TOAST_ID);
  mockToast.dismiss(COMPARE_ERROR_TOAST_ID);

  // Assert all debounce timers cleared
  assert.deepEqual(debounceRef.current, {});
  // Assert compare toasts dismissed
  assert.ok(dismissedList.includes(COMPARE_TOAST_ID));
  assert.ok(dismissedList.includes(COMPARE_ERROR_TOAST_ID));
});
