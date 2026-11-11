"use client";

import React, { useEffect, useState } from "react";
import DropdownTreeSelect from "react-dropdown-tree-select";
import "react-dropdown-tree-select/dist/styles.css";

const buildCategoryTree = (categories, parentId = "none") => {
  return categories
    .filter((category) => category.parentid === parentId)
    .map((category) => {
      const children = buildCategoryTree(categories, category.category_name);
      const isRootNode = parentId === "none";

      return {
        label: category.category_name,
        value: category._id,
        children: children.length > 0 ? children : undefined,
        disabled: isRootNode, // Disable only root nodes
        expanded: false,
        className: isRootNode ? "hide-checkbox" : "", // Add class for root nodes
      };
    });
};

const CategorySelect = ({ selectedCategory, setSelectedCategory }) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories/get");
        const resJson = await response.json();
        const data = Array.isArray(resJson)
          ? resJson
          : Array.isArray(resJson?.data)
            ? resJson.data
            : Array.isArray(resJson?.categories)
              ? resJson.categories
              : [];
        setCategories(buildCategoryTree(data));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (currentNode, selectedNodes) => {
    // Single select: use the last selected node
    setSelectedCategory(selectedNodes.length > 0 ? selectedNodes[0].value : null);
  };

  return (
    <div className="p-4">
      <label className="block font-medium mb-2">Select Subcategory</label>
      {!isLoading ? (
        <DropdownTreeSelect
          data={categories}
          onChange={handleChange}
          texts={{ placeholder: "Select subcategory..." }}
          mode="radioSelect" // Single selection mode
          showPartiallySelected={false}
          className="category-select"
        />
      ) : (
        <p>Loading categories...</p>
      )}
      <style jsx global>{`
        /* Hide checkbox for root nodes */
        .hide-checkbox .checkbox-icon {
          display: none;
        }
        
        /* Hide expand/collapse icons for leaf nodes */
        .toggle {
          display: none;
        }
        
        .node.hide-checkbox > .toggle {
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default CategorySelect;