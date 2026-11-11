// context/HeaderContext.js
"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const HeaderContext = createContext();

export const HeaderProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeOfferTimer, setActiveOfferTimer] = useState(null);
  const [activeTopBanner, setActiveTopBanner] = useState(null);
  const [normalTopBanner, setNormalTopBanner] = useState(null);

  // Instant client-side hydration from stored auth session (prevents flash of "Sign In" after login)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("sathya_user");
      const sessionStr = localStorage.getItem("sathya_auth_session");

      if (token && (savedUser || sessionStr)) {
        let userObj = null;
        if (savedUser) {
          try {
            userObj = JSON.parse(savedUser);
          } catch {}
        }
        if (!userObj && sessionStr) {
          try {
            const sess = JSON.parse(sessionStr);
            userObj = { userId: sess.userId, role: sess.role || "user" };
          } catch {}
        }

        if (userObj) {
          setUserData(userObj);
          setIsLoggedIn(true);
          if (userObj.role === "admin") {
            setIsAdmin(true);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to read cached auth state:", e);
    }
  }, []);

  // Listen to cross-component auth state changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthChanged = (e) => {
      const detail = e?.detail;
      if (detail?.isLoggedIn) {
        setIsLoggedIn(true);
        if (detail.user) {
          setUserData(detail.user);
          try {
            localStorage.setItem("sathya_user", JSON.stringify(detail.user));
          } catch {}
        }
        if (detail.role === "admin") {
          setIsAdmin(true);
        }
      } else {
        setIsLoggedIn(false);
        setUserData(null);
        setIsAdmin(false);
        try {
          localStorage.removeItem("sathya_user");
        } catch {}
      }
    };

    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, []);

  const updateHeaderdetails = (userWrapper) => {
    const rawUser = userWrapper?.user || userWrapper;
    if (rawUser) {
      setUserData(rawUser);
      setIsLoggedIn(true);
      try {
        localStorage.setItem("sathya_user", JSON.stringify(rawUser));
      } catch {}
      if (rawUser.role === "admin") {
        setIsAdmin(true);
      }
    } else {
      setUserData(null);
      setIsLoggedIn(false);
      setIsAdmin(false);
      try {
        localStorage.removeItem("sathya_user");
      } catch {}
    }
  };

  return (
    <HeaderContext.Provider
      value={{
        userData,
        setUserData,
        isLoggedIn,
        setIsLoggedIn,
        isAdmin,
        setIsAdmin,
        activeOfferTimer,
        setActiveOfferTimer,
        activeTopBanner,
        setActiveTopBanner,
        normalTopBanner,
        setNormalTopBanner,
        updateHeaderdetails,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeaderdetails = () => {
  return useContext(HeaderContext);
};
