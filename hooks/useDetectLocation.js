'use client';

import { useState, useCallback } from 'react';

/**
 * useDetectLocation
 * Reusable, isolated hook for browser geolocation detection and reverse-geocoded
 * postal location resolution (Pincode, Locality, City, State, Region).
 * 
 * Reuses the existing detection backend endpoint `/api/pincode/check-state`
 * powering the Header Region Selector Modal.
 */
export function useDetectLocation(defaultOptions = {}) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const detectLocation = useCallback(async (customCallbacks = {}) => {
    const onSuccess = customCallbacks.onSuccess || defaultOptions.onSuccess;
    const onError = customCallbacks.onError || defaultOptions.onError;

    if (typeof window === 'undefined' || !navigator?.geolocation) {
      const errMsg = 'Geolocation is not supported by your browser.';
      setError(errMsg);
      if (typeof onError === 'function') onError(errMsg);
      return { success: false, error: errMsg };
    }

    setIsDetecting(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            const res = await fetch('/api/pincode/check-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude }),
            });

            if (!res.ok) {
              throw new Error(`Reverse geocoding error: HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data && data.status) {
              const locationPayload = {
                pincode: data.pincode || '',
                locality: data.locality || data.city || '',
                city: data.city || '',
                district: data.district || data.city || '',
                state: data.state || '',
                region: data.region || '',
                code: data.code || '',
                latitude,
                longitude,
              };

              setDetectedLocation(locationPayload);
              setIsDetecting(false);
              setError(null);

              if (typeof onSuccess === 'function') {
                onSuccess(locationPayload);
              }

              resolve({ success: true, data: locationPayload });
            } else {
              const errMsg = 'Unable to verify location. Please type your pincode manually.';
              setError(errMsg);
              setIsDetecting(false);

              if (typeof onError === 'function') onError(errMsg);
              resolve({ success: false, error: errMsg });
            }
          } catch (fetchErr) {
            console.error('Location detection fetch error:', fetchErr);
            const errMsg = 'Unable to retrieve location. Please type your pincode manually.';
            setError(errMsg);
            setIsDetecting(false);

            if (typeof onError === 'function') onError(errMsg);
            resolve({ success: false, error: errMsg });
          }
        },
        (geoErr) => {
          setIsDetecting(false);
          let errMsg = 'Unable to retrieve location. Please type your pincode manually.';

          if (geoErr && geoErr.code === 1) {
            errMsg = 'Location permission denied. Please type your pincode manually.';
          } else if (geoErr && geoErr.code === 3) {
            errMsg = 'Location request timed out. Please type your pincode manually.';
          }

          setError(errMsg);
          if (typeof onError === 'function') onError(errMsg);
          resolve({ success: false, error: errMsg });
        },
        {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 60000,
        }
      );
    });
  }, [defaultOptions]);

  return {
    isDetecting,
    detectedLocation,
    error,
    detectLocation,
    clearError,
  };
}

export default useDetectLocation;
