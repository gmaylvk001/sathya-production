"use client";

import React from "react";

const UnauthenticatedPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl text-center">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">403 - Access Denied</h2>
        <p className="text-gray-600 mb-6">
          Sorry, this page is restricted to{" "}
          <span className="font-semibold text-red-600">admin users</span> only.
        </p>
        <p className="text-sm text-gray-500">
          If you believe this is a mistake, please contact the site administrator.
        </p>
      </div>
    </div>
  );
};

export default UnauthenticatedPage;
