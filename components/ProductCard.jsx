"use client";
import { useModal } from '@/context/ModalContext';
import { useState,useEffect  } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { Heart } from 'lucide-react';
import {AuthModal} from '@/components/AuthModal';



const AddToWishlistButton = ({ productId, onAfterWishlist, className, label, iconSize = 18 }) => {
  const { openAuthModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const { wishlistCount, wishlistItems, isInWishlist, updateWishlist } = useWishlist();
  const [isWishlisted, setIsWishlisted] = useState(isInWishlist(productId));

  useEffect(() => {
    setIsWishlisted(isInWishlist(productId));
  }, [productId, wishlistItems, isInWishlist]);

  const handleWishlistAction = async () => {
    setIsLoading(true);
    setAuthError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        openAuthModal(() => {
          handleWishlistAction(); // Retry after login
        }, 'You must be logged in to add to wishlist.');
        setIsLoading(false);
        return;
      }

      // Determine if we're adding or removing
      const isCurrentlyWishlisted = isInWishlist(productId);
      const method = isCurrentlyWishlisted ? 'DELETE' : 'POST';

      // API call
      const wishlistResponse = await fetch('/api/wishlist', {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId }),
      });

      if (wishlistResponse.status === 401) {
        localStorage.removeItem('token');
        openAuthModal(() => {
          handleWishlistAction();
        }, 'Session expired. Please log in again.');
        return;
      }

      if (!wishlistResponse.ok) {
        throw new Error(`Failed to ${isCurrentlyWishlisted ? 'remove from' : 'add to'} wishlist`);
      }
      
     const responseData = await wishlistResponse.json();
    updateWishlist(responseData.items, responseData.count);
    if (!isCurrentlyWishlisted && onAfterWishlist) {
  onAfterWishlist();
   }
      
    } catch (error) {
      // console.error('Wishlist error:', error);
      setAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
       <button
          className={
            className
              ? `${className} ${isWishlisted ? 'text-red-500 border-red-500' : ''}`
              : `p-1 rounded-full bg-white shadow ${isWishlisted ? 'text-red-500' : 'hover:text-red-500'}`
          }
          onClick={handleWishlistAction}
          disabled={isLoading}
        >
          <Heart size={iconSize} fill={isWishlisted ? 'currentColor' : 'none'} className="shrink-0" />
          {label && <span className="whitespace-nowrap">{label}</span>}
        </button>

      {/* AuthModal remains the same */}
      {/* {showAuthModal && (
        <div className="fixed inset-0 z-[9999]">
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            handleWishlistAction();
          }}
          error={authError}
        />
        </div>
      )} */}
    </>
  );
};

// AuthModal component remains the same as your original code



export default AddToWishlistButton;