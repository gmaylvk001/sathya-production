// context/CartContext.js
"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  // Load cart count from localStorage on initial render
//   useEffect(() => {
//     const savedCount = localStorage.getItem('cartCount');
//     if (savedCount) {
//       setCartCount(parseInt(savedCount));
//     }
//   }, []);

useEffect(() => {
    const fetchCartCount = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('/api/cart/count', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setCartCount(data.count);
        } catch (error) {
          console.error('Failed to fetch cart count:', error);
        }
      }
    };
    fetchCartCount();
  }, []);
  
  const updateCartCount = (count) => {
    setCartCount(count);
    // Optionally, only persist if guest
  };


//   const updateCartCount = (count) => {
//     setCartCount(count);
//     localStorage.setItem('cartCount', count.toString());
//   };

  return (
    <CartContext.Provider value={{ cartCount, updateCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};