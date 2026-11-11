"use client";
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useHeaderdetails } from '@/context/HeaderContext';
import {
  canLoginAs,
  establishSession,
  AUTH_CONFLICT_MESSAGE,
} from '@/lib/clientAuthSession';

export const AuthModal = ({ onClose, onSuccess, error }) => {
  const { updateHeaderdetails, setIsLoggedIn, setUserData, setIsAdmin } = useHeaderdetails();
  const [step, setStep] = useState(1); // 1 = phone input, 2 = OTP input
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { updateCartCount } = useCart();
  const { updateWishlist } = useWishlist();

  const clearErrors = () => {
    setFormError('');
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearErrors();

    if (!mobile || !/^[6-9][0-9]{9}$/.test(mobile)) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to send OTP');
        return;
      }

      setStep(2);
    } catch (err) {
      console.error('Send OTP error:', err);
      setFormError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Login/Register
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearErrors();

    if (!otp || otp.length < 4) {
      setFormError('Please enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    const guestId = localStorage.getItem("guestCartId");
    try {
      const res = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, guestId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || 'OTP verification failed');
        return;
      }

      if (data.token) {
        const incomingUserId = data.user?.userId || data.user?._id;
        const gate = canLoginAs(incomingUserId);
        if (!gate.ok) {
          setFormError(gate.message || AUTH_CONFLICT_MESSAGE);
          return;
        }

        establishSession({
          token: data.token,
          userId: incomingUserId,
          role: data.user?.role || 'user',
          source: 'store',
        });

        const checkRes = await fetch('/api/auth/check', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`,
          }
        });
        const details = await checkRes.json();

        if (details.loggedIn) {
          const fullUser = {
            userId: incomingUserId,
            name: details.name || details.user?.name || data.user?.name || '',
            last_name: details.last_name || '',
            email: details.email || details.user?.email || data.user?.email || '',
            mobile: details.phone || details.user?.mobile || data.user?.mobile || mobile || '',
            role: details.role || data.user?.role || 'user',
            store_id: details.store_id || '',
          };
          try {
            localStorage.setItem('sathya_user', JSON.stringify(fullUser));
          } catch {}
          establishSession({
            token: data.token,
            userId: incomingUserId,
            role: fullUser.role,
            source: 'store',
            user: fullUser,
          });
          updateHeaderdetails(fullUser);
          setIsLoggedIn(true);
          setUserData(fullUser);
          if (details.role === 'admin' || fullUser.role === 'admin') {
            setIsAdmin(true);
          }
        } else {
          setIsLoggedIn(false);
          return;
        }

        // Fetch both cart and wishlist counts after login
        const [cartResponse, wishlistResponse] = await Promise.all([
          fetch('/api/cart/count', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          }),
          fetch('/api/wishlist', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          })
        ]);

        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          updateCartCount(cartData.count);
        }

        if (wishlistResponse.ok) {
          const wishlistData = await wishlistResponse.json();
          updateWishlist(wishlistData.items, wishlistData.count);
        }

        localStorage.removeItem("guestCartId");
        location.reload();
      }

      onSuccess();
    } catch (err) {
      console.error('Verify OTP error:', err);
      setFormError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 max-w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
        >
          &times;
        </button>

        <h2 className="text-xl font-semibold mb-1 text-gray-800">
          {step === 1 ? 'Login / Register' : 'Verify OTP'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {step === 1
            ? 'Enter your mobile number to continue'
            : `We've sent an OTP to ${mobile}`}
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number</label>
              <div className="flex items-center border rounded focus-within:ring-2 focus-within:ring-red-500 overflow-hidden">
                <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r">+91</span>
                <input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobile(val);
                    if (formError) clearErrors();
                  }}
                  className="flex-1 px-4 py-2 focus:outline-none text-sm"
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
            </div>

            {(formError || error) && (
              <div className="text-red-500 text-sm">{formError || error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d72828] text-white py-2.5 px-4 rounded hover:bg-[#b91c1c] disabled:bg-gray-400 transition-colors duration-200 font-medium"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enter OTP</label>
              <input
                type="text"
                placeholder="Enter 4-digit OTP"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setOtp(val);
                  if (formError) clearErrors();
                }}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg tracking-widest"
                maxLength={4}
                required
                autoFocus
              />
            </div>

            {(formError || error) && (
              <div className="text-red-500 text-sm">{formError || error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d72828] text-white py-2.5 px-4 rounded hover:bg-[#b91c1c] disabled:bg-gray-400 transition-colors duration-200 font-medium"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); clearErrors(); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              ← Change mobile number
            </button>
          </form>
        )}
      </div>
    </div>
  );
};