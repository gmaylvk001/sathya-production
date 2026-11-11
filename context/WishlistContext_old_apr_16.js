// context/WishlistContext.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistCount, setWishlistCount] = useState(0);

  const fetchWishlistCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/wishlist/count", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setWishlistCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist count:", error);
    }
  };

  useEffect(() => {
    fetchWishlistCount();
  }, []);

  return (
    <WishlistContext.Provider value={{ wishlistCount, setWishlistCount, fetchWishlistCount }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
