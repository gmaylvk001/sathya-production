// File: components/EditProductModal.jsx
"use client";

import React, { useEffect, useState } from "react";
import AddProductPage from "./create";
import { ToastContainer, toast } from 'react-toastify';

export default function EditProductModal({ product, onClose, onSuccess }) {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (product) {
      const prefilledProduct = {
        ...product,
        files: [],
        overviewImageFile: [],
        images: product.images?.length ? product.images : [null, null, null, null],
        overviewImage: product.overviewImage?.length ? product.overviewImage : [null],
        variantAttributes: product.variantAttributes || [],
        product_highlights: product.product_highlights || [""],
      };
      setProductData(prefilledProduct);
      setLoading(false);
    }
  }, [product]);

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-start overflow-auto p-8">
      <div className="bg-white 100 rounded-lg shadow-lg w-full max-w-6xl relative">
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">Edit Product</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-red-600 text-lg font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {/* <ToastContainer /> */}
          <AddProductPage
            mode="edit"
            productData={productData}
            productId={product._id}
            onSuccess={(updatedData) => {
              if (typeof onSuccess === "function") {
                onSuccess(updatedData);
              } else {
                onClose();
              }
            }}
          />
          {/* <AddProductPage mode="edit" productData={productData} productId={product._id} /> */}
        </div>
      </div>
    </div>
  );
}
