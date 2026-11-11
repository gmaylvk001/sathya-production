"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";



const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const token = localStorage.getItem("token");
        let guestCartId = null;
         if (!token) {

          // ✅ If not logged in → use guestCartId
              
             // if (!isLoggedIn) {
                guestCartId = localStorage.getItem("guestCartId") || uuidv4();
                localStorage.setItem("guestCartId", guestCartId);
             // }
       

         }

        const response = await fetch("/api/cart/count", {
          headers: token ? { Authorization: `Bearer ${token}` } : { guestCartId: guestCartId},
        });

        const data = await response.json();
        setCartCount(data.count || 0);
      } catch (error) {
        console.error("Failed to fetch cart count:", error);
        setCartCount(0);
      }
    };

    fetchCartCount();
  }, []);

  const updateCartCount = (count) => {
    setCartCount(count);
  };

  const clearCart = () => {
    setCartCount(0);
  };

  return (
    <CartContext.Provider value={{ cartCount, updateCartCount, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
