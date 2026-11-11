"use client";

import { createContext, useContext, useState } from "react";

export const PageLoadingContext = createContext();

export const PageLoadingProvider = ({ children }) => {
  const [isPageLoading, setIsPageLoading] = useState(false);

  return (
    <PageLoadingContext.Provider value={{ isPageLoading, setIsPageLoading }}>
      {children}
    </PageLoadingContext.Provider>
  );
};

export const usePageLoading = () => useContext(PageLoadingContext);
