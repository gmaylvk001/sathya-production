"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState([]);

  const fetchWishlist = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('/api/wishlist', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setWishlistItems(data.items || []);
        setWishlistCount(data.count || 0);
      } catch (error) {
        console.error('Failed to fetch wishlist:', error);
      }
    }
  };

  useEffect(() => {
    fetchWishlist(); 

    const handleStorageChange = (event) => {
      if (event.key === 'wishlist_updated') {
        const cached = localStorage.getItem('wishlist_data');
        if (cached) {
          const { items, count } = JSON.parse(cached);
          setWishlistItems(items);
          setWishlistCount(count);
        }
        fetchWishlist();
      }
    };

    // Cross-tab sync via storage only — avoid refetching wishlist on every
    // window focus (that hammered /api/wishlist during navigation/tab switches).
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const isInWishlist = (productId) => {
   
    return wishlistItems.some(item => item.productId === productId);
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    setWishlistCount(0);
  };

  const updateWishlist = (items, count) => {
    setWishlistItems(items);
    setWishlistCount(count);
    
    localStorage.setItem('wishlist_data', JSON.stringify({ items, count }));
    localStorage.setItem('wishlist_updated', Date.now());
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlistCount, 
      wishlistItems,
      isInWishlist,
      updateWishlist,
      clearWishlist 
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  return useContext(WishlistContext);
};