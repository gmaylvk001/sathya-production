'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  STATE_DEFAULTS,
  DEFAULT_LOCATION,
  normalizeRegion,
  isValidPincode,
  getCityPincode,
} from '@/lib/regionHelper';

const STORAGE_KEY = 'sathya_selected_region';
const LOCATION_STORAGE_KEY = 'sathya_user_location';
const PROMPT_KEY = 'sathya_region_prompted';

export const SOUTH_INDIAN_STATES = [
  {
    id: 'tamilnadu',
    name: 'Tamil Nadu',
    nativeName: 'தமிழ்நாடு',
    code: 'TN',
    defaultPincode: '600001',
    defaultCity: 'chennai',
    tagline: 'Home of Sathya • 100+ Showrooms',
    deliveryTime: '24-48h Express Delivery',
    landmark: 'Meenakshi & Tanjore Gopuram',
    iconType: 'gopuram',
    popularCities: [
      'Chennai',
      'Coimbatore',
      'Madurai',
      'Trichy',
      'Salem',
      'Tirunelveli',
      'Erode',
      'Vellore',
      'Thoothukudi',
      'Dindigul',
      'Thanjavur',
      'Tiruppur',
      'Nagercoil',
      'Kanchipuram',
      'Hosur',
    ],
    accentColor: '#d72828',
    gradient: 'from-red-600 via-rose-600 to-red-700',
    lightBg: 'bg-red-50/70',
    borderColor: 'border-red-200',
    badgeBg: 'bg-red-600',
  },
  {
    id: 'kerala',
    name: 'Kerala',
    nativeName: 'കേരളം',
    code: 'KL',
    defaultPincode: '695001',
    defaultCity: 'thiruvananthapuram',
    tagline: "God's Own Country • Express Hubs",
    deliveryTime: '24-48h Express Delivery',
    landmark: 'Traditional Houseboat & Palm Groves',
    iconType: 'houseboat',
    popularCities: [
      'Kochi',
      'Thiruvananthapuram',
      'Kozhikode',
      'Thrissur',
      'Kollam',
      'Palakkad',
      'Alappuzha',
      'Kannur',
      'Kottayam',
      'Malappuram',
    ],
    accentColor: '#059669',
    gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
    lightBg: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-600',
  },
  {
    id: 'karnataka',
    name: 'Karnataka',
    nativeName: 'ಕರ್ನಾಟಕ',
    code: 'KA',
    defaultPincode: '560001',
    defaultCity: 'bengaluru',
    tagline: 'Tech Hub & Heritage • Fast Dispatch',
    deliveryTime: '24-48h Express Delivery',
    landmark: 'Mysore Palace & Vidhana Soudha',
    iconType: 'palace',
    popularCities: [
      'Bengaluru',
      'Mysuru',
      'Mangaluru',
      'Hubballi',
      'Belagavi',
      'Davangere',
      'Ballari',
      'Shivamogga',
      'Tumakuru',
      'Udupi',
    ],
    accentColor: '#d97706',
    gradient: 'from-amber-600 via-yellow-600 to-amber-700',
    lightBg: 'bg-amber-50/70',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-600',
  },
  {
    id: 'andhra',
    name: 'Andhra Pradesh',
    nativeName: 'ఆంధ్రప్రదేశ్',
    code: 'AP',
    defaultPincode: '517501',
    defaultCity: 'tirupati',
    tagline: 'Sunrise State • Statewide Network',
    deliveryTime: '24-48h Express Delivery',
    landmark: 'Amaravati Stupa & Tirupati Arch',
    iconType: 'stupa',
    popularCities: [
      'Visakhapatnam',
      'Vijayawada',
      'Guntur',
      'Nellore',
      'Kurnool',
      'Tirupati',
      'Kakinada',
      'Rajahmundry',
      'Anantapur',
      'Kadapa',
    ],
    accentColor: '#4f46e5',
    gradient: 'from-indigo-600 via-blue-600 to-indigo-700',
    lightBg: 'bg-indigo-50/70',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-600',
  },
  {
    id: 'telangana',
    name: 'Telangana',
    nativeName: 'తెలంగాణ',
    code: 'TG',
    defaultPincode: '500001',
    defaultCity: 'hyderabad',
    tagline: 'Pearl City & IT Hub',
    deliveryTime: '24-48h Express Delivery',
    landmark: 'Charminar & Kakatiya Arch',
    iconType: 'stupa',
    popularCities: [
      'Hyderabad',
      'Warangal',
      'Nizamabad',
      'Khammam',
      'Karimnagar',
      'Ramagundam',
      'Mahbubnagar',
      'Nalgonda',
    ],
    accentColor: '#8b5cf6',
    gradient: 'from-purple-600 via-violet-600 to-purple-700',
    lightBg: 'bg-purple-50/70',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-600',
  },
];

const syncLocationCookie = (locObj) => {
  if (typeof document === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(locObj);
    document.cookie = `sathya_location=${encodeURIComponent(jsonStr)}; path=/; max-age=2592000; SameSite=Lax`;
  } catch (e) {
    console.error('Cookie sync error:', e);
  }
};

const RegionContext = createContext();

export const RegionProvider = ({ children }) => {
  const [selectedRegion, setSelectedRegion] = useState(SOUTH_INDIAN_STATES[0]);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize region & location on mount
  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem(LOCATION_STORAGE_KEY);
      const savedRegion = localStorage.getItem(STORAGE_KEY);

      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        const norm = normalizeRegion(parsed.region || parsed.state || parsed.stateName);
        const matched = SOUTH_INDIAN_STATES.find((s) => s.id === norm) || SOUTH_INDIAN_STATES[0];

        const locData = {
          pincode: parsed.pincode || matched.defaultPincode,
          city: parsed.city || matched.defaultCity,
          district: parsed.district || parsed.city || matched.defaultCity,
          region: norm,
          stateName: matched.name,
          code: matched.code,
        };

        setUserLocation(locData);
        setSelectedRegion(matched);
        syncLocationCookie(locData);
      } else if (savedRegion) {
        const parsed = JSON.parse(savedRegion);
        const norm = normalizeRegion(parsed.id || parsed.code || parsed.name);
        const matched = SOUTH_INDIAN_STATES.find((s) => s.id === norm) || SOUTH_INDIAN_STATES[0];

        const locData = {
          pincode: matched.defaultPincode,
          city: matched.defaultCity,
          district: matched.defaultCity,
          region: matched.id,
          stateName: matched.name,
          code: matched.code,
        };

        setUserLocation(locData);
        setSelectedRegion(matched);
        syncLocationCookie(locData);
      } else {
        // First visitor: fallback default to Tamil Nadu 600001
        setUserLocation(DEFAULT_LOCATION);
        setSelectedRegion(SOUTH_INDIAN_STATES[0]);
        syncLocationCookie(DEFAULT_LOCATION);
        setIsRegionModalOpen(true);
      }
    } catch {
      setUserLocation(DEFAULT_LOCATION);
      setSelectedRegion(SOUTH_INDIAN_STATES[0]);
      syncLocationCookie(DEFAULT_LOCATION);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save selected region
  const selectRegion = useCallback((regionOrId, customCity = null, customPincode = null) => {
    let targetRegion = null;
    if (typeof regionOrId === 'string') {
      const norm = normalizeRegion(regionOrId);
      targetRegion = SOUTH_INDIAN_STATES.find(
        (s) => s.id === norm || s.code.toLowerCase() === norm.toLowerCase() || s.name.toLowerCase() === norm.toLowerCase()
      );
    } else if (regionOrId && typeof regionOrId === 'object') {
      const norm = normalizeRegion(regionOrId.id || regionOrId.code || regionOrId.name);
      targetRegion = SOUTH_INDIAN_STATES.find((s) => s.id === norm) || regionOrId;
    }

    if (!targetRegion) {
      targetRegion = SOUTH_INDIAN_STATES[0];
    }

    const resolvedCity = customCity ? customCity.toLowerCase().trim() : targetRegion.defaultCity.toLowerCase();
    const resolvedPincode = customPincode || (customCity ? getCityPincode(customCity, targetRegion.id) : targetRegion.defaultPincode);

    const locData = {
      pincode: resolvedPincode,
      city: resolvedCity,
      district: customCity ? customCity.toLowerCase().trim() : targetRegion.defaultCity.toLowerCase(),
      region: targetRegion.id,
      stateName: targetRegion.name,
      code: targetRegion.code,
    };

    setSelectedRegion(targetRegion);
    setUserLocation(locData);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targetRegion));
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locData));
      localStorage.setItem(PROMPT_KEY, 'true');
      syncLocationCookie(locData);
    } catch {
      // ignore storage quota errors
    }

    setIsRegionModalOpen(false);
    setDetectionError(null);
  }, []);

  // Pincode submission resolver
  const setPincode = useCallback(async (pincode) => {
    // Checkout/address may pass numeric pincode — coerce so .trim() is always safe
    const pin = pincode == null ? '' : String(pincode).trim();

    if (!isValidPincode(pin)) {
      setDetectionError('Please enter a valid 6-digit pincode');
      return false;
    }

    try {
      setIsDetecting(true);
      setDetectionError(null);

      const res = await fetch('/api/pincode/check-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: pin }),
      });

      const data = await res.json();
      if (data.status) {
        const norm = normalizeRegion(data.region || data.state);
        const matched = SOUTH_INDIAN_STATES.find((s) => s.id === norm) || SOUTH_INDIAN_STATES[0];

        const locData = {
          pincode: data.pincode || pin,
          city: (data.city || matched.defaultCity).toLowerCase(),
          district: (data.district || data.city || matched.defaultCity).toLowerCase(),
          region: matched.id,
          stateName: matched.name,
          code: matched.code,
        };

        setSelectedRegion(matched);
        setUserLocation(locData);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locData));
          localStorage.setItem(PROMPT_KEY, 'true');
          syncLocationCookie(locData);
        } catch {}

        setIsRegionModalOpen(false);
        return true;
      } else {
        setDetectionError('Could not verify pincode. Please select your state.');
        return false;
      }
    } catch (err) {
      console.error('Pincode submit error:', err);
      setDetectionError('Failed to verify pincode. Please try again.');
      return false;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const openRegionModal = useCallback(() => {
    setDetectionError(null);
    setIsRegionModalOpen(true);
  }, []);

  const closeRegionModal = useCallback(() => {
    if (!selectedRegion) {
      const defaultState = SOUTH_INDIAN_STATES[0];
      setSelectedRegion(defaultState);
      setUserLocation(DEFAULT_LOCATION);
      syncLocationCookie(DEFAULT_LOCATION);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(DEFAULT_LOCATION));
      } catch {}
    }
    setIsRegionModalOpen(false);
    setDetectionError(null);
  }, [selectedRegion]);

  // Detect user's location via HTML5 Geolocation + Server Reverse Geocoding
  const detectLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setDetectionError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch('/api/pincode/check-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await res.json();
          if (data.status) {
            const norm = normalizeRegion(data.region || data.state);
            const matched = SOUTH_INDIAN_STATES.find((s) => s.id === norm) || SOUTH_INDIAN_STATES[0];

            const locData = {
              pincode: data.pincode || matched.defaultPincode,
              city: (data.city || matched.defaultCity).toLowerCase(),
              district: (data.district || data.city || matched.defaultCity).toLowerCase(),
              region: matched.id,
              stateName: matched.name,
              code: matched.code,
            };

            setSelectedRegion(matched);
            setUserLocation(locData);

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
              localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locData));
              localStorage.setItem(PROMPT_KEY, 'true');
              syncLocationCookie(locData);
            } catch {}

            setIsRegionModalOpen(false);
          } else {
            setDetectionError('Location detected outside covered South Indian states. Please select your state.');
          }
        } catch {
          setDetectionError('Could not auto-detect state. Please select manually.');
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === 1) {
          setDetectionError('Location permission denied. Please pick your state below.');
        } else {
          setDetectionError('Unable to detect location. Please choose your state manually.');
        }
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  return (
    <RegionContext.Provider
      value={{
        selectedRegion: selectedRegion || SOUTH_INDIAN_STATES[0],
        userLocation: userLocation || DEFAULT_LOCATION,
        pincode: userLocation?.pincode || selectedRegion?.defaultPincode || '600001',
        city: userLocation?.city || selectedRegion?.defaultCity || 'chennai',
        district: userLocation?.district || userLocation?.city || selectedRegion?.defaultCity || 'chennai',
        userDistrict: userLocation?.district || userLocation?.city || selectedRegion?.defaultCity || 'chennai',
        region: userLocation?.region || selectedRegion?.id || 'tamilnadu',
        allRegions: SOUTH_INDIAN_STATES,
        isRegionModalOpen,
        isDetecting,
        detectionError,
        isInitialized,
        openRegionModal,
        closeRegionModal,
        selectRegion,
        setPincode,
        detectLocation,
        setDetectionError,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
};
