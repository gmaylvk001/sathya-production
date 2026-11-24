// components/AuthProvider.jsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function AuthProvider({ children }) {
  const [authStatus, setAuthStatus] = useState('checking');
  const router = useRouter();
  const pathname = usePathname();
  const [userrole, setUserrole] = useState('user');
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token');

        // Public routes that don't require authentication
        const publicRoutes = ['/admin/login'];

        // If on a public route, allow access
        if (publicRoutes.includes(pathname)) {
          setAuthStatus('authenticated');
          return;
        }

        // If no token, redirect to login
        if (!token) {
          router.replace('/admin/login');
          setAuthStatus('unauthenticated');
          return;
        }

        // Decode and check token expiration
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          try {
            const { clearBrowserAuth } = await import('@/lib/clientAuthSession');
            clearBrowserAuth();
          } catch {
            localStorage.removeItem('token');
          }
          router.replace('/admin/login');
          setAuthStatus('unauthenticated');
          return;
        }

        // Fetch user role to validate admin
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn && data.role === 'admin') {
            setAuthStatus('authenticated');
            return;
          }
          if (data.loggedIn && data.role !== 'admin') {
            router.replace('/admin/unauthorized');
            setAuthStatus('unauthenticated');
            return;
          }
        }
        try {
          const { clearBrowserAuth } = await import('@/lib/clientAuthSession');
          clearBrowserAuth();
        } catch {
          localStorage.removeItem('token');
        }
        router.replace('/admin/login');
        setAuthStatus('unauthenticated');
      } catch (error) {
        console.error('Authentication error:', error);
        router.replace('/admin/login');
        setAuthStatus('unauthenticated');
      }
    };

    verifyAuth();
  }, [pathname, router]);

  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const isLogin = pathname === '/admin/login' || pathname === '/admin/unauthorized';
    if (isLogin) return undefined;

    const IDLE_MS = 30 * 60 * 1000;
    lastActivityRef.current = Date.now();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));

    const endSession = async () => {
      const token = localStorage.getItem('token');
      try {
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {
        /* the browser session is cleared either way */
      }
      try {
        const { clearBrowserAuth } = await import('@/lib/clientAuthSession');
        clearBrowserAuth();
      } catch {
        localStorage.removeItem('token');
      }
      router.replace('/admin/login');
      setAuthStatus('unauthenticated');
    };

    const timer = setInterval(async () => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_MS) {
        clearInterval(timer);
        await endSession();
        return;
      }
      // Only a recent click, key, scroll, or touch keeps the server session alive.
      if (idleFor > 60 * 1000) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('/api/auth/check', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data?.loggedIn || data?.role !== 'admin') {
          clearInterval(timer);
          await endSession();
        }
      } catch {
        /* a network blip should not sign the admin out */
      }
    }, 60 * 1000);

    return () => {
      clearInterval(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, markActive));
    };
  }, [pathname, router]);

  if (authStatus === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return null; // Don't render anything while redirecting
  }

  return children;
}