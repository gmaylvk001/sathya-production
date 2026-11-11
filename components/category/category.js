"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "react-feather";
import { getDiscountInfo } from "@/lib/discountHelper";
export default function CategoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({
    category: [],
    brand: [],
    price: { min: 0, max: 100000 },
    filter: []
  });

  
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [filterGroups, setFilterGroups] = useState([]);
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  const { slug } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories with parent-child structure
        const categoriesRes = await fetch('/api/categories');
        const categoriesData = await categoriesRes.json();
        organizeCategories(categoriesData);

        // Fetch brands
        const brandsRes = await fetch('/api/brand');
        const brandsData = await brandsRes.json();
        setBrands(brandsData.data);

        // Fetch initial products
        fetchProducts();
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);



  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch filter groups and filters
        const filterGroupsRes = await fetch('/api/filter_group');
        const filterGroupsData = await filterGroupsRes.json();
        setFilterGroups(filterGroupsData.data);

        // Fetch initial filters
        const filtersRes = await fetch('/api/filter');
        const filtersData = await filtersRes.json();
        setFilters(filtersData.data);

        // Rest of existing fetch logic...
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Add price filter handler
  const handlePriceChange = (values) => {
    setSelectedFilters(prev => ({
      ...prev,
      price: { min: values[0], max: values[1] }
    }));
  };
  const organizeCategories = (categories) => {
    const categoryMap = {};
    categories.forEach(cat => {
      if (cat.parentid === 'none') {
        categoryMap[cat._id] = { ...cat, children: [] };
      } else {
        if (categoryMap[cat.parentid]) {
          categoryMap[cat.parentid].children.push(cat);
        }
      }
    });
    setCategories(Object.values(categoryMap));
  };

  const fetchProducts = async () => {
    try {
      const query = new URLSearchParams({
        categories: selectedFilters.category.join(','),
        brands: selectedFilters.brand.join(','),
        minPrice: selectedFilters.price.min,
        maxPrice: selectedFilters.price.max,
        filters: JSON.stringify(selectedFilters.filters)
      }).toString();

      const res = await fetch(`/api/product/filters?${query}`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleFilterChange = (type, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      
      if (type === 'category' || type === 'brand') {
        newFilters[type] = prev[type].includes(value)
          ? prev[type].filter(item => item !== value)
          : [...prev[type], value];
      } else {
        // Handle dynamic filters
        newFilters.filters = {
          ...prev.filters,
          [type]: prev.filters?.[type]?.includes(value)
            ? prev.filters[type].filter(item => item !== value)
            : [...(prev.filters?.[type] || []), value]
        };
      }
      return newFilters;
    });
  };
  
  // Add this useEffect hook
  useEffect(() => {
    fetchProducts();
    // Add all state values that affect the products fetch
  }, [selectedFilters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Category Filter */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              {categories.map(category => (
                <li key={category._id}>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleFilterChange('category', category._id)}
                      className={`flex-1 text-left p-2 rounded ${
                        selectedFilters.category.includes(category._id) 
                          ? 'bg-red-100' : 'hover:bg-gray-100'
                      }`}
                    >
                      {category.category_name}
                    </button>
                    {category.children.length > 0 && (
                      <button
                        onClick={() => toggleCategory(category._id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        {expandedCategories.includes(category._id) ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    )}
                  </div>
                  {category.children.length > 0 && expandedCategories.includes(category._id) && (
                    <ul className="ml-4 mt-2 border-l-2 border-gray-100 pl-4">
                      {category.children.map(subCat => (
                        <li key={subCat._id}>
                          <button
                            onClick={() => handleFilterChange('category', subCat._id)}
                            className={`block w-full text-left p-2 rounded ${
                              selectedFilters.category.includes(subCat._id) 
                                ? 'bg-red-100' : 'hover:bg-gray-100'
                            }`}
                          >
                            {subCat.category_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Price Range</h3>
            <div className="space-y-4">
              <input
                type="range"
                min="0"
                max="100000"
                step="100"
                value={selectedFilters.price.max}
                onChange={(e) => handlePriceChange([selectedFilters.price.min, e.target.value])}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <span>₹{selectedFilters.price.min}</span>
                <span>₹{selectedFilters.price.max}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Filters */}
          {filterGroups?.map((group) => {
            const filteredFilters = (Array.isArray(filters) ? filters : [])
              .filter(filter => filter.filter_group_name === group.filtergroup_name);

            return filteredFilters.length > 0 && (
              <div key={group._id} className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-4">{group.filtergroup_name}</h3>
                <ul className="space-y-2">
                  {filteredFilters.map((filter) => (
                    <li key={filter._id}>
                      <button
                        onClick={() => handleFilterChange(group.filtergroup_slug, filter._id)}
                        className={`block w-full text-left p-2 rounded ${
                          selectedFilters.filters?.[group.filtergroup_slug]?.includes(filter._id)
                            ? 'bg-red-100'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {filter.filter_name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}


          {/* Brand Filter */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Brands</h3>
            <ul className="space-y-2">
              {brands.map(brand => (
                <li key={brand._id}>
                  <button
                    onClick={() => handleFilterChange('brand', brand._id)}
                    className={`block w-full text-left p-2 rounded ${
                      selectedFilters.brand.includes(brand._id) 
                        ? 'bg-red-100' : 'hover:bg-gray-100'
                    }`}
                  >
                    {brand.brand_name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product._id} className="bg-white p-4 rounded-lg shadow">
                <div className="relative h-48 mb-4">
                
                  <Image
                    src={
                      (product.images?.[0] || "").startsWith("http")
                        ? product.images[0]
                        : `/uploads/products/${(product.images?.[0] || "").replace(/^\/?(uploads\/products\/)?/, "").replace(/^\/+/, "")}`
                    }
                    alt={product.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  <Link href={`/products/${product.slug}`}>
                    {product.name}
                  </Link>
                </h3>
                {(() => {
                  const { showDiscount } = getDiscountInfo(product.price, product.special_price);
                  return (
                    <div className="flex items-center gap-2 mb-4">
                      {showDiscount && (
                        <span className="text-gray-500 line-through">
                          ₹{product.price}
                        </span>
                      )}
                      <span className="text-xl font-bold text-[#d72828]">
                        ₹{showDiscount ? product.special_price : (product.special_price || product.price)}
                      </span>
                    </div>
                  );
                })()}
                <button className="w-full bg-[#d72828] text-white py-2 rounded hover:bg-[#d72828]">
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}