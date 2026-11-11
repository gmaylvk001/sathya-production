'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HiHome } from 'react-icons/hi';
import { FaGreaterThan } from "react-icons/fa";

import { buildCategoryBasePath } from '@/lib/categoryPageComponents/categoryHref';

export default function ProductBreadcrumb({ product, className = "mb-4" }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryHierarchy = async () => {
      try {
        if (!product?.category && !product?.sub_category) {
          setLoading(false);
          return;
        }

        // Fetch all categories
        const allCategoriesRes = await fetch('/api/categories/breadcrumb');
        const rawRes = await allCategoriesRes.json();
        const allCategories = Array.isArray(rawRes) ? rawRes : rawRes?.data || [];

        // Helper function to find category by ID
        const findCategoryById = (id) => {
          return allCategories.find(cat => 
            String(cat._id) === String(id) || 
            (cat._id && cat._id.toString() === String(id))
          );
        };

        // Function to build the complete hierarchy path
        const buildCategoryHierarchy = (categoryId, subCategoryId, allCategories) => {
          const hierarchy = [];
          
          // Find the sub-category first
          const subCategory = findCategoryById(subCategoryId);
          if (subCategory) {
            hierarchy.unshift(subCategory); // Add to beginning
            
            // Find parent categories recursively
            let currentParentId = subCategory.parentid;
            while (currentParentId) {
              const parentCategory = findCategoryById(currentParentId);
              if (parentCategory) {
                hierarchy.unshift(parentCategory); // Add to beginning
                currentParentId = parentCategory.parentid;
              } else {
                break;
              }
            }
          }
          
          // If we couldn't build hierarchy from sub-category, try from main category
          if (hierarchy.length === 0) {
            const mainCategory = findCategoryById(categoryId);
            if (mainCategory) {
              hierarchy.unshift(mainCategory);
              
              // Find parent categories recursively
              let currentParentId = mainCategory.parentid;
              while (currentParentId) {
                const parentCategory = findCategoryById(currentParentId);
                if (parentCategory) {
                  hierarchy.unshift(parentCategory);
                  currentParentId = parentCategory.parentid;
                } else {
                  break;
                }
              }
            }
          }

          return hierarchy;
        };

        // Build hierarchy using both category and sub_category
        const hierarchy = buildCategoryHierarchy(
          product.category, 
          product.sub_category, 
          allCategories
        );

        console.log('Final hierarchy:', hierarchy);
        setCategories(hierarchy);

      } catch (error) {
        console.error('Error fetching category data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryHierarchy();
  }, [product?._id, product?.category, product?.sub_category]);

  if (loading) {
    return (
      <div className={`flex items-center text-xs ${className}`}>
        <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <span className="mx-2 text-gray-300">/</span>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center text-xs flex-nowrap whitespace-nowrap overflow-hidden max-w-full ${className}`}>
      {/* Home Link */}
      <Link 
        href="/" 
        className="text-gray-500 hover:text-[#d72828] transition-colors flex items-center whitespace-nowrap flex-shrink-0"
      >
        <HiHome className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
        Home 
      </Link>
      
      {categories.map((category, index) => {
        const slugs = categories.slice(0, index + 1).map(cat => cat.category_slug || cat._id);
        const path = buildCategoryBasePath(slugs, index);

        return (
          <div key={category._id || index} className="flex items-center flex-shrink-0">
            <span className="mx-1.5 text-gray-300 flex-shrink-0 text-[9px]"><FaGreaterThan /></span>
            <Link
              href={path}
              className={`text-gray-500 hover:text-[#d72828] whitespace-nowrap flex-shrink-0 ${
                index === categories.length - 1 ? "font-medium" : ""
              }`}
            >
              {category.category_name}
            </Link>
          </div>
        );
      })}

      {/* Product Name */}
      <span className="mx-1.5 text-gray-300 flex-shrink-0 text-[9px]"><FaGreaterThan /></span>
      <span className="text-gray-700 font-medium truncate min-w-0 flex-1">
        {product?.name || "Product"}
      </span>
    </div>
  );
}