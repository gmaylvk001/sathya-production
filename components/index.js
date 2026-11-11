"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ToastContainer, toast } from 'react-toastify';
import "../styles/slick-custom.css";
import { motion, useAnimation, useInView } from "framer-motion";
//import { ShoppingCartSimple, CaretDown } from "@phosphor-icons/react";
import { X } from "lucide-react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiArrowRight } from "react-icons/hi";
import { FiChevronLeft, FiChevronRight, FiShoppingCart } from 'react-icons/fi';
import { Heart, ShoppingCart } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Addtocart from "@/components/AddToCart";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from "swiper/modules";
import RecentlyViewedProducts from '@/components/RecentlyViewedProducts';
import CategoryProducts from '@/components/CategoryProducts';
import HomePageRenderer from '@/components/homePageComponents/HomePageRenderer';
import TrendingVideoSection from '@/components/TrendingVideoSection';
import { buildBrandHref } from '@/lib/categoryPageComponents/categoryHref';
import { ChevronRight } from "lucide-react";
import 'swiper/css';
import 'swiper/css/navigation';
export default function HomeComponent() {
  function slugify(text) {
    return text
      ?.toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  }
  const features = [
    { image: "/images/delivery-truck.png", title: "Free Shipping", description: "Free shipping all over the US" },
    { image: "/images/reputation.png", title: "100% Satisfaction", description: "Guaranteed satisfaction with every order" },
    { image: "/images/payment-protection.png", title: "Secure Payments", description: "We ensure secure transactions" },
    { image: "/images/support.png", title: "24/7 Support", description: "We're here to help anytime" },
  ];
  const scrollContainerRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerLoading, setIsBannerLoading] = useState(true);
  const [isFlashSalesLoading, setIsFlashSalesLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [bannerData, setBannerData] = useState({
    banner: {
      items: []
    }
  });
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flashSalesData, setFlashSalesData] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isBrandsLoading, setIsBrandsLoading] = useState(true);
  const [scrollDirection, setScrollDirection] = useState('down');
  const [categories, setCategories] = useState([]);
  //const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState();
  const [parentCategories, setParentCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [categoryBanner, setCategoryBanner] = useState([]);
  const [sections, setSections] = useState([]);
  const [homeSectionData, setHomeSectionData] = useState({ sections: [] });
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const categoryScrollRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const scrollRef = useRef(null);
  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };
  const [brandMap, setBrandMap] = useState([]);
  const priorityCategories = ["air-conditioner", "mobile-phones", "television", "refrigerator", "washing-machine"];
  const categoryStyles = {
    "air-conditioner": {
      backgroundImage: "/uploads/categories/category-darling-img/air-conditoner-one.jpg",
      borderColor: "#060F16"
    },
    "mobile-phones": {
      backgroundImage: "/uploads/categories/category-darling-img/smartphone.png",
      borderColor: "#68778B"
    },
    "television": {
      backgroundImage: "/uploads/categories/category-darling-img/television-one.jpg",
      borderColor: "#A9A097"
    },
    "refrigerator": {
      backgroundImage: "/uploads/categories/category-darling-img/refirgrator-two.jpg",
      borderColor: "#5C8B99"
    },
    "washing-machine": {
      backgroundImage: "/uploads/categories/category-darling-img/washine-machine-one.jpg",
      borderColor: "#69AEA2"
    }
  };
  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const result = await response.json();
      if (result.error || !Array.isArray(result?.data)) {
        if (result.error) console.warn("Brand fetch:", result.error);
      } else {
        const data = result.data;

        // Store as map for quick access
        const map = {};
        data.forEach((b) => {
          if (b?._id) {
            map[b._id] = b.brand_name;
          }
        });
        setBrandMap(map);
      }
    } catch (error) {
      console.error("Error in fetchBrand:", error.message);
    }
  };
  useEffect(() => {
    fetchBrand();
  }, []);
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("/api/videocard");
        const data = await res.json();
        if (data.success) setVideos(data.videoCards);
      } catch (err) {
        console.error("Error fetching videos:", err);
      }
    };
    fetchVideos();
  }, []);
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 350;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const fetchBannerData = async () => {
      setIsBannerLoading(true);
      try {
        const response = await fetch('/api/topbanner');
        const data = await response.json();
        // console.log("Banner data:", data);
        if (data.success && data.banners?.length > 0) {
          const bannerItems = data.banners
            .filter(banner => banner.status === "Active") // ✅ only Active
            .map(banner => ({
              id: banner._id,
              buttonLink: banner.redirect_url || "/shop",
              bgImageUrl: banner.banner_image,
              bannerImageUrl: banner.banner_image,
              redirectUrl: banner.redirect_url
            }));

          setBannerData({
            banner: { items: bannerItems }
          });
        }
      } catch (error) {
        console.error("Error fetching banner data:", error);
        setBannerData({
          banner: {
            items: [{
              id: 1,
              buttonLink: "/shop",
              bgImageUrl: "/images/banner-img1.png",
              bannerImageUrl: "/images/banner-product.png"
            }]
          }
        });
      } finally {
        setIsBannerLoading(false);
      }
    };
    const fetchFlashSales = async () => {
      setIsFlashSalesLoading(true);
      try {
        const response = await fetch("/api/flashsale");
        const data = await response.json();

        if (data.success && data.flashSales.length > 0) {
          const salesItems = data.flashSales
            .filter(item => item.status === "Active")   // ✅ only active
            .map((item) => ({
              id: item._id,
              title: item.title,
              productImage: item.banner_image,
              bgImage: item.background_image,
              redirectUrl: item.redirect_url || "/shop",
            }));
          setFlashSalesData(salesItems);
        }
      } catch (error) {
        console.error("Error fetching flash sales:", error);
        setFlashSalesData([
          {
            id: "fs1",
            title: "Summer Fruits Special",
            productImage: "/images/summer-fruits.png",
            bgImage: "/images/sale-bg1.jpg",
            redirectUrl: "/summer-sale",
          },
          {
            id: "fs2",
            title: "Organic Vegetables",
            productImage: "/images/veggies.png",
            bgImage: "/images/sale-bg2.jpg",
            redirectUrl: "/vegetables",
          },
        ]);
      } finally {
        setIsFlashSalesLoading(false);
      }
    };
    const fetchHomeSections = async () => {
      setIsSectionLoading(true);
      try {
        const response = await fetch("/api/home-sections");
        const data = await response.json();

        if (data.success && data.data?.length > 0) {
          const sectionItems = data.data
            .filter(section => section.status === "active") // ✅ only active
            .map(section => ({
              id: section._id,
              name: section.name,
              position: section.position
            }));

          setHomeSectionData({
            sections: sectionItems
          });
        }
      } catch (error) {
        console.error("Error fetching home sections:", error);
        setHomeSectionData({
          sections: []
        });
      } finally {
        setIsSectionLoading(false);
      }
    };
    const fetchBrands = async () => {
      setIsBrandsLoading(true);
      try {
        const response = await fetch('/api/brand/get?homePage=true&minProducts=50');
        if (response.ok) {
          const data = await response.json();
          if (data?.success && Array.isArray(data.brands)) {
            setBrands(data.brands);
          } else {
            setBrands([]);
          }
        } else {
          setBrands([]);
        }
      } catch (error) {
        console.warn("Could not fetch brands:", error.message);
        setBrands([]);
      } finally {
        setIsBrandsLoading(false);
      }
    };
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories/get", { cache: "no-store" });
        const resJson = await response.json();
        const data = Array.isArray(resJson)
          ? resJson
          : Array.isArray(resJson?.data)
            ? resJson.data
            : [];
        setCategories(data);
        const rootIds = data
          .filter((cat) => cat && cat.parentid === "none" && cat.status === "Active")
          .map((cat) => cat._id);
        // 2. Get only categories whose parentid is in rootIds → second level
        const secondLevelCategories = data.filter(
          (cat) => cat && rootIds.includes(cat.parentid) && cat.status === "Active"
        );
        setParentCategories(secondLevelCategories);
        if (secondLevelCategories.length > 0) {
          setSelectedCategory(secondLevelCategories[0]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    {/* 
        const fetchProducts = async () => {
            try {
                const response = await fetch("/api/product/get");
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Error fetching products:", error);
            }
        }; */}
    const fetchCategoryBanners = async () => {
      try {
        const response = await fetch("/api/categorybanner");
        const res = await response.json();

        if (res.success && res.categoryBanners && res.categoryBanners.banners) {
          const isDocActive =
            !res.categoryBanners.status ||
            String(res.categoryBanners.status).toLowerCase() === "active";
          const formatted = isDocActive
            ? res.categoryBanners.banners
                .filter((banner) => banner && banner.banner_image)
                .map((banner, index) => {
                  let obj = {
                    imageUrl: banner.banner_image,
                    redirectUrl: banner.redirect_url || "",
                  };

                  if (index === 0) {
                    obj.categoryname = "SMART PHONE";
                  } else if (index === 1) {
                    obj.categoryname = "AIR CONDITIONER";
                  } else if (index === 2) {
                    obj.categoryname = "REFRIGERATOR";
                  } else if (index === 3) {
                    obj.categoryname = "WASHING MACHINE";
                  }

                  return obj;
                })
            : [];

          setCategoryBanner(formatted);
          console.log("formatted", formatted);
        }
      } catch (error) {
        console.error("Error fetching category banners:", error);
      }
    };
    const fetchSingleBannerData = async () => {
      setIsSingleBannerLoading(true);
      try {
        const response = await fetch("/api/singlebanner");
        const data = await response.json();

        if (data.success && data.banners?.length > 0) {
          const singleBannerItems = data.banners
            .filter((banner) => !banner.status || String(banner.status).toLowerCase() === "active") // ✅ only Active
            .map((banner) => ({
              id: banner._id,
              redirect_url: banner.redirect_url || "/shop",
              bgImageUrl: banner.banner_image,
              singleBannerImageUrl: banner.banner_image,
            }));

          setSingleBannerData({
            singlebanner: { items: singleBannerItems },
          });
        } else {
          // if no data, fallback default
          setSingleBannerData({
            singlebanner: {
              items: [
                {
                  id: 1,
                  buttonLink: "/shop",
                  bgImageUrl: "/images/singlebanner-img1.png",
                  singleBannerImageUrl: "/images/singlebanner-product.png",
                },
              ],
            },
          });
        }
      } catch (error) {
        console.error("Error fetching single banner data:", error);
        setSingleBannerData({
          singlebanner: {
            items: [
              {
                id: 1,
                buttonLink: "/shop",
                bgImageUrl: "/images/singlebanner-img1.png",
                singleBannerImageUrl: "/images/singlebanner-product.png",
              },
            ],
          },
        });
      } finally {
        setIsSingleBannerLoading(false);
      }
    };
    const fetchSingleBannerDatatwo = async () => {
      setIsSingleBannerLoading(true);
      try {
        const response = await fetch("/api/singlebanner-two");
        const data = await response.json();

        if (data.success && data.banners?.length > 0) {
          const singleBannerItems = data.banners
            .filter((banner) => !banner.status || String(banner.status).toLowerCase() === "active")
            .map((banner) => ({
              id: banner._id,
              redirect_url: banner.redirect_url || "/shop",
              bgImageUrl: banner.banner_image,
              singleBannerImageUrl: banner.banner_image,
            }));

          setSingleBannerData((prev) => ({
            ...prev,
            singlebannerTwo: { items: singleBannerItems },
          }));
        } else {
          setSingleBannerData((prev) => ({
            ...prev,
            singlebannerTwo: {
              items: [
                {
                  id: 1,
                  redirect_url: "/shop",
                  bgImageUrl: "/images/singlebanner-img1.png",
                  singleBannerImageUrl: "/images/singlebanner-product.png",
                },
              ],
            },
          }));
        }
      } catch (error) {
        console.error("Error fetching single banner-two data:", error);
        setSingleBannerData((prev) => ({
          ...prev,
          singlebannerTwo: {
            items: [
              {
                id: 1,
                redirect_url: "/shop",
                bgImageUrl: "/images/singlebanner-img1.png",
                singleBannerImageUrl: "/images/singlebanner-product.png",
              },
            ],
          },
        }));
      } finally {
        setIsSingleBannerLoading(false);
      }
    };
    fetchCategoryBanners();
    fetchBannerData();
    fetchFlashSales();
    fetchBrands();
    fetchCategories();
    //fetchProducts();
    fetchSingleBannerData();
    fetchSingleBannerDatatwo();
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
  const fetchHomeSections = async () => {
    setIsSectionLoading(true);
    try {
      const response = await fetch("/api/home-sections");
      const data = await response.json();

      if (data.success && data.data?.length > 0) {
        const sectionItems = data.data
          .filter((section) => section.status === "active") // only active
          .map((section) => ({
            id: section._id,
            name: section.name,
            position: section.position,
          }));

        setHomeSectionData({ sections: sectionItems });
      } else {
        setHomeSectionData({ sections: [] });
      }
    } catch (error) {
      console.error("Error fetching home sections:", error);
      setHomeSectionData({ sections: [] });
    } finally {
      setIsSectionLoading(false);
    }
  };
  // Old HomeSection order/render disabled — home now uses Home Page Builder only.
  useEffect(() => {
    setHomeSectionData({ sections: [] });
    setIsSectionLoading(false);
  }, []);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  useEffect(() => {
    if (!hasMounted) return;

    // Safe read from localStorage (guard against corrupted JSON)
    try {
      const savedCategories = localStorage.getItem('headerCategories');
      if (savedCategories) {
        try {
          const parsed = JSON.parse(savedCategories);
          if (Array.isArray(parsed)) {
            setCategories(parsed);
          }
        } catch (parseErr) {
          console.warn('Could not parse saved headerCategories from localStorage, ignoring cached value.', parseErr);
        }
      }
    } catch (lsErr) {
      // localStorage may be unavailable in some environments
      console.warn('Unable to read headerCategories from localStorage', lsErr);
    }

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories/get', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Network response was not ok (${response.status})`);
        }
        const resJson = await response.json();
        const data = Array.isArray(resJson)
          ? resJson
          : Array.isArray(resJson?.data)
            ? resJson.data
            : Array.isArray(resJson?.categories)
              ? resJson.categories
              : [];

        if (!data.length && !Array.isArray(resJson?.data) && !Array.isArray(resJson)) {
          console.warn('Unexpected categories payload, expected array:', resJson);
          return;
        }

        // Keep only top-level active categories for header
        const parentCategories = data.filter(
          (category) => category.parentid === "none" && category.status === "Active"
        );

        // Maintain existing UI state update
        setCategories(parentCategories);

        // Trim stored data to minimal fields
        const trimmedForStorage = parentCategories.map((cat) => ({
          _id: cat._id,
          category_name: cat.category_name || cat.name || '',
          slug: cat.category_slug || cat.slug || ''
        }));

        // Prepare JSON and measure size
        const json = JSON.stringify(trimmedForStorage);
        const maxBytes = 4.5 * 1024 * 1024; // 4.5 MB

        try {
          const sizeBytes = (typeof Blob !== 'undefined') ? new Blob([json]).size : json.length;

          if (sizeBytes > maxBytes) {
            console.warn(
              `headerCategories JSON size ${Math.round(sizeBytes / 1024)}KB exceeds ${Math.round(maxBytes / 1024)}KB. ` +
              'Skipping localStorage save and attempting sessionStorage fallback.'
            );
            try {
              sessionStorage.setItem('headerCategories', json);
            } catch (sessErr) {
              console.warn('sessionStorage fallback also failed. Consider using IndexedDB/localforage for caching.', sessErr);
              // TODO: fallback to IndexedDB/localforage (e.g., localForage) for larger datasets
            }
          } else {
            // Try saving to localStorage
            try {
              localStorage.setItem('headerCategories', json);
            } catch (storageErr) {
              // Handle QuotaExceededError and other storage errors
              const isQuotaError = storageErr && (
                storageErr.name === 'QuotaExceededError' ||
                storageErr.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                storageErr.code === 22 ||
                storageErr.code === 1014
              );

              if (isQuotaError) {
                console.warn('localStorage quota exceeded when saving headerCategories, attempting sessionStorage fallback.', storageErr);
                try {
                  sessionStorage.setItem('headerCategories', json);
                } catch (sessErr) {
                  console.warn('sessionStorage fallback failed as well. Consider IndexedDB/localforage caching.', sessErr);
                  // TODO: fall back to IndexedDB/localforage
                }
              } else {
                console.warn('Failed to save headerCategories to localStorage', storageErr);
              }
            }
          }
        } catch (measureErr) {
          console.warn('Could not measure headerCategories size, attempting best-effort save to localStorage.', measureErr);
          try {
            localStorage.setItem('headerCategories', json);
          } catch (err) {
            console.warn('Saving headerCategories failed.', err);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
    checkAuthStatus();
  }, [hasMounted]);
  const controls = useAnimation();
  const refs = {
    banner: useRef(null),
    flashSales: useRef(null),
    delivery: useRef(null),
  };
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUserData(data.user);
      } else {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };
  const isInView = {
    banner: useInView(refs.banner, { once: true, amount: 0.1 }),
    flashSales: useInView(refs.flashSales, { once: true, amount: 0.1 }),
    delivery: useInView(refs.delivery, { once: true, amount: 0.1 }),
  };
  useEffect(() => {
    if (isInView.banner) {
      controls.start("visible");
    }
  }, [isInView.banner, controls]);
  const CustomPrevArrow = ({ onClick }) => (
    <button onClick={onClick} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white p-3 rounded-full shadow-md z-10 hover:bg-gray-600"> ◀ </button>
  );
  const CustomNextArrow = ({ onClick }) => (
    <button onClick={onClick} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white p-3 rounded-full shadow-md z-10 hover:bg-gray-600"> ▶ </button>
  );
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: false,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
  };
  const flashSalesSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        }
      }
    ]
  };
  const brandSettings = {
    infinite: true,
    speed: 3000, // Continuous effect
    slidesToShow: 6, // Default for large screens
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    arrows: false,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024, // Tablets
        settings: {
          slidesToShow: 5,
        },
      },
      {
        breakpoint: 768, // Mobile
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 480, // Extra-small devices
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  const sectionVariants = {
    hiddenDown: { y: 50, opacity: 0 },
    hiddenUp: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };
  const categoryRef = useRef(null);
  const [singleBannerData, setSingleBannerData] = useState({
    singlebanner: { items: [] }
  });
  const [isSingleBannerLoading, setIsSingleBannerLoading] = useState(false);
  const categoryScrollRefs = useRef({});
  const scrollLeft = (categoryId) => {
    if (categoryScrollRefs.current[categoryId]) {
      categoryScrollRefs.current[categoryId].scrollBy({ left: -300, behavior: "smooth" });
    }
  };
  const scrollRight = (categoryId) => {
    if (categoryScrollRefs.current[categoryId]) {
      categoryScrollRefs.current[categoryId].scrollBy({ left: 300, behavior: "smooth" });
    }
  };
  const getSubcategorySlugs = (parentId) => {
    return categories
      .filter(cat => cat.parentid === parentId)
      .map(sub => sub.category_slug);
  };
  {/* const filteredProducts = selectedCategory
    ? (() => {
        const subCategories = categories.filter(
          cat => cat.parentid === selectedCategory._id
        );

        const validCategoryIds = [
          selectedCategory._id,
          ...subCategories.map(sub => sub._id)
        ];
        return products.filter(product => 
          product.category && 
          validCategoryIds.includes(product.category.toString())
        );
})() : products; */}
  const handleProductClick = (product) => {
    if (navigating) return;
    setNavigating(true);
    const stored = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    const alreadyViewed = stored.find((p) => p._id === product._id);
    const updated = alreadyViewed ? stored.filter((p) => p._id !== product._id) : stored;
    updated.unshift(product);
    const limited = updated.slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(limited));
  };
  const handleCategoryClick = useCallback((category) => (e) => {
    if (navigating) {
      e.preventDefault();
      return;
    }
    setNavigating(true);
    router.push(`/category/${category.category_slug}`);
  }, [navigating, router]);
  useEffect(() => {
    const handleRouteChange = () => setNavigating(false);

    if (!router?.events?.on) return;

    router.events.on('routeChangeComplete', handleRouteChange);
    router.events.on('routeChangeError', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('routeChangeError', handleRouteChange);
    };
  }, [router]);
  const featuredCategory = parentCategories[0];
  const dealCategories = parentCategories.slice(1, 4);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [offers, setOffers] = useState([]);
  const [offerProducts, setOfferProducts] = useState([]);
  const bgClasses = ["bg-purple-50", "bg-green-50", "bg-amber-50", "bg-pink-50"];
  useEffect(() => {
    const fetchOfferProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('api/offers/offer-products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });
        const data = await res.json();

        if (data.success) {
          setOfferProducts(data.data);
        }
      } catch (err) {
        console.error("Error loading offer products", err);
      }
    };

    fetchOfferProducts();
  }, []);
  const [singleBannerNewData, setSingleBannerNewData] = useState({
    singlebanner_new: { items: [] }
  });
  const [isSingleBannerNewLoading, setIsSingleBannerNewLoading] = useState(false);
  const fetchSingleBannerNewData = async () => {
    setIsSingleBannerNewLoading(true);
    try {
      const response = await fetch("/api/singlebanner");
      const data = await response.json();

      if (data.success && data.banners?.length > 0) {
        const bannerItems = data.banners
          .filter((banner) => banner.status === "Active")
          .map((banner) => ({
            id: banner._id,
            redirect_url: banner.redirect_url || "/shop",
            bgImageUrl: banner.banner_image,
          }));

        setSingleBannerNewData({
          singlebanner_new: { items: bannerItems },
        });
      } else {
        setSingleBannerNewData({
          singlebanner_new: {
            items: [
              {
                id: 1,
                redirect_url: "/shop",
                bgImageUrl: "/images/default-singlebanner.png",
              },
            ],
          },
        });
      }
    } catch (error) {
      console.error("Error fetching singlebanner_new:", error);
    } finally {
      setIsSingleBannerNewLoading(false);
    }
  };
  useEffect(() => {
    fetchSingleBannerNewData();
  }, []);
  const [singleBannerTwoData, setSingleBannerTwoData] = useState({
    singlebanner_two: { items: [] },
  });
  const [isSingleBannerTwoLoading, setIsSingleBannerTwoLoading] = useState(false);
  const fetchSingleBannerTwoData = async () => {
    setIsSingleBannerTwoLoading(true);
    try {
      const response = await fetch("/api/singlebanner-two");
      const data = await response.json();

      if (data.success && data.banners?.length > 0) {
        const bannerItems = data.banners
          .filter((banner) => banner.status === "Active")
          .map((banner) => ({
            id: banner._id,
            redirect_url: banner.redirect_url || "/shop",
            bgImageUrl: banner.banner_image,
          }));

        setSingleBannerTwoData({
          singlebanner_two: { items: bannerItems },
        });
      } else {
        setSingleBannerTwoData({
          singlebanner_two: {
            items: [
              {
                id: 1,
                redirect_url: "/shop",
                bgImageUrl: "/images/default-singlebanner.png",
              },
            ],
          },
        });
      }
    } catch (error) {
      console.error("Error fetching singlebanner_two:", error);
    } finally {
      setIsSingleBannerTwoLoading(false);
    }
  };
  useEffect(() => {
    fetchSingleBannerTwoData();
  }, []);
  // console.log(categoryBanner);
  const renderSection = (sectionName) => {
    switch (sectionName) {
      case 'category_banner':
        return (
          <section id="category_banner">
            <div className="px-4 md:px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categoryBanner.map((banner, index) => (

                  <div key={index} className="col-span-1">
                    <div className="relative group overflow-hidden  shadow-sm hover:shadow-md transition-shadow">

                      {/* Image */}
                      <img
                        src={banner.imageUrl}
                        alt={`Category Banner ${index + 1}`}
                        className="w-full h-[300px] object-cover transform group-hover:scale-105 transition duration-500 ease-in-out"
                        width={400}
                        height={400}
                      />

                      <div className="absolute top-1 mb-4 left-4 py-6">
                        <h3 className="text-lg md:text-xl font-bold">{banner.categoryname}</h3>
                      </div>

                      {/* Shop Now Link with Arrow */}
                      <div className="absolute top-8 left-4 py-6">
                        <Link
                          href={banner.redirectUrl || "#"}
                          className="mt-2 inline-flex items-center text-sm font-medium text-gray-800 hover:text-black transition"
                        >
                          {banner.buttonText || "Shop Now"}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ml-1 h-4 w-4"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </Link>
                      </div>


                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'product':
        return (
          <CategoryProducts />
        );
      case 'flash_sales':
        return (
          <motion.section
            ref={refs.flashSales}
            initial="hiddenDown"
            animate="visible"
            variants={sectionVariants}
            id="flash_sales"
            className="px-4 md:px-6 py-8 relative"
          >
            {flashSalesData.filter(item => item.bgImage && item.productImage).length > 0 && (

              <div className="relative">

                {/* Navigation Buttons */}
                {flashSalesData.length > 3 && (
                  <>
                    {/* Left Arrow */}
                    <button className="flash-prev absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:shadow-lg transition">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    {/* Right Arrow */}
                    <button className="flash-next absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:shadow-lg transition">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}

                <Swiper
                  modules={[Navigation]}
                  navigation={{
                    nextEl: ".flash-next",
                    prevEl: ".flash-prev",
                  }}
                  spaceBetween={20}
                  breakpoints={{
                    0: {
                      slidesPerView: 1,
                    },
                    768: {
                      slidesPerView: 2,
                    },
                    1024: {
                      slidesPerView: 3,
                    },
                  }}
                >
                  {isFlashSalesLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828] animate-spin"></div>
                    </div>
                  ) : (
                    flashSalesData
                      .filter(item => item.bgImage && item.productImage)
                      .map((item) => (
                        <SwiperSlide key={item.id}>
                          <div
                            className="relative shadow-md overflow-hidden flex items-center p-6 min-h-[250px]"
                            style={{
                              backgroundImage: `url(${item.bgImage})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          >
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-40"></div>

                            {/* Content */}
                            <div className="relative z-10 flex items-center w-full">

                              {/* Image */}
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.4 }}
                                className="w-1/2 flex justify-center"
                              >
                                <Image
                                  src={item.productImage}
                                  alt={item.title}
                                  width={300}
                                  height={300}
                                  className="object-cover rounded-lg"
                                />
                              </motion.div>

                              {/* Text */}
                              <div className="w-1/2 pl-4 text-left text-white">
                                <h3 className="text-lg md:text-xl font-bold">
                                  {item.title}
                                </h3>

                                <p className="text-sm mt-1 opacity-90">
                                  {item.discountText || "Flat up to 30% discount"}
                                </p>

                                <motion.a
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  href={item.redirectUrl}
                                  className="mt-2 inline-flex items-center text-sm font-medium text-white"
                                >
                                  Shop Now

                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="ml-1 h-4 w-4"
                                  >
                                    <path d="M9 18l6-6-6-6" />
                                  </svg>
                                </motion.a>
                              </div>
                            </div>
                          </div>
                        </SwiperSlide>
                      ))
                  )}
                </Swiper>
              </div>
            )}
          </motion.section>
        );
      case 'features':
        return (
          <section className="pt-7 px-4 sm:px-6 md:px-6" id="features">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 text-center">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center cursor-pointer group"
                    onMouseEnter={(e) => {
                      const img = e.currentTarget.querySelector(".img-flip");
                      if (img) img.style.transform = "rotateY(360deg)";
                    }}
                    onMouseLeave={(e) => {
                      const img = e.currentTarget.querySelector(".img-flip");
                      if (img) img.style.transform = "rotateY(0deg)";
                    }}
                  >
                    {/* Image instead of Icon */}
                    <div
                      className="mb-4 img-flip"
                      style={{
                        transition: "transform 0.5s",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-16 h-16 object-contain"
                      />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:transition-colors duration-300">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm leading-relaxed max-w-[250px] group-hover:transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'brands':
        return (
          <motion.section id="brands"
            ref={refs.delivery}
            initial={scrollDirection === 'down' ? 'hiddenDown' : 'hiddenUp'}
            animate='visible'
            variants={sectionVariants}
            className="px-4 sm:px-6 md:px-6 pt-7"
          >
            <div>
              <motion.div variants={containerVariants} className="bg-[#FFF5F5] rounded-2xl py-6 px-4 mx-2">
                <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
                  <h5 className="text-lg font-bold text-[#d72828] tracking-tight">Shop by Brands</h5>
                  <Link
                    href="/brands"
                    className="text-sm font-semibold text-[#d72828] hover:text-[#b31e1e] flex items-center gap-1 transition-colors group cursor-pointer"
                  >
                    <span>See All</span>
                    <HiArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>

                {isBrandsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
                  </div>
                ) : (
                  <motion.div variants={itemVariants}>
                    <Slider {...brandSettings} className="brand-slider px-2 sm:px-[50px] relative">
                      {brands.map((brand) => (
                        <motion.div
                          key={brand.id}
                          className="p-2 flex justify-center items-center"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div 
                            className="w-full h-16 sm:h-18 max-w-[150px] px-3 py-2 bg-white rounded-xl border-2 border-gray-150/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#ff9b9b] hover:ring-2 hover:ring-[#ffe4e6] hover:shadow-md transition-all duration-300 flex items-center justify-center overflow-hidden cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              const slug = brand.brand_slug || slugify(brand.brand_name);
                              router.push(buildBrandHref(slug, Boolean(brand.hasOverview)));
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Image
                              src={`/uploads/Brands/${brand.image}`}
                              alt={brand.brand_name || "Brand Logo"}
                              width={100}
                              height={50}
                              className="object-contain max-h-8 sm:max-h-9 max-w-[85px] sm:max-w-[105px] w-auto h-auto"
                              unoptimized
                            />
                          </div>
                        </motion.div>
                      ))}
                    </Slider>
                  </motion.div>
                )}
              </motion.div>
            </div>
            {/* <OurLocations /> */}
          </motion.section>
        );
      case 'topbanner':
        return (
          <motion.section
            id="topbanner"
            ref={refs.banner}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="overflow-hidden pt-0 m-0"
          >
            <div className="relative">
              {isBannerLoading ? (
                <div className="p-6 flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
                </div>
              ) : bannerData.banner.items.length > 0 ? (
                bannerData.banner.items.length > 1 ? (
                  <Slider {...settings} className="relative">
                    {bannerData.banner.items.map((banner) => (
                      <motion.div
                        key={banner.id}
                        className="relative w-full aspect-[2000/667] max-h-auto"
                        variants={itemVariants}
                      >
                        <div className="absolute inset-0 overflow-hidden">
                          <Image
                            src={banner.bgImageUrl}
                            alt="Banner"
                            fill
                            quality={100}
                            className="object-fill w-full h-full"
                            style={{ objectPosition: "center 30%" }}
                            priority
                            unoptimized
                          />
                        </div>
                        {/* Clickable accessible banner - REMOVED HOVER EFFECT */}
                        <div
                          className="absolute inset-0 overflow-hidden cursor-pointer"
                          role="link"
                          tabIndex={0}
                          aria-label={banner?.alt || banner?.redirectUrl || "Banner"}
                          onClick={() => {
                            const href = banner?.redirectUrl;
                            if (!href) return;
                            if (href.startsWith("/")) {
                              router.push(href);
                            } else {
                              window.location.href = href;
                            }
                          }}
                          onKeyDown={(e) => {
                            const href = banner?.redirectUrl;
                            if (!href) return;
                            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                              e.preventDefault();
                              if (href.startsWith("/")) {
                                router.push(href);
                              } else {
                                window.location.href = href;
                              }
                            }
                          }}
                        >
                          <Image
                            src={banner.bgImageUrl}
                            alt={banner?.alt || "Banner"}
                            fill
                            quality={100}
                            className="object-fill w-full h-full"
                            style={{ objectPosition: "center 30%" }}
                            priority
                            unoptimized
                          />
                        </div>
                      </motion.div>
                    ))}
                  </Slider>
                ) : (
                  <motion.div
                    className="p-4 md:p-6 relative aspect-[2000/667] max-h-auto"
                    variants={itemVariants}
                  >
                    <div className="absolute inset-0 flex justify-center items-center bg-white">
                      <Image
                        src={bannerData.banner.items[0].bgImageUrl}
                        alt="Banner"
                        fill
                        className="object-fill w-full h-full"
                        priority
                        unoptimized
                      />
                    </div>
                  </motion.div>
                )
              ) : (
                <div></div>
              )}
            </div>
          </motion.section>
        )
      case 'singlebanner':
        return (
          <motion.section
            id="singlebanner"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="overflow-hidden pt-1"
          >
            <div className="relative">
              {isSingleBannerNewLoading ? (
                <div className="p-6 flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
                </div>
              ) : singleBannerNewData.singlebanner_new.items.length > 0 ? (
                singleBannerNewData.singlebanner_new.items.length > 1 ? (
                  <Slider {...settings}>
                    {singleBannerNewData.singlebanner_new.items.map((item) => (
                      <motion.div
                        key={item.id}
                        className="relative w-full aspect-[1900/400]"
                        variants={itemVariants}
                      >
                        <Link href={item.redirect_url || "#"} className="block w-full h-full">
                          <Image
                            src={item.bgImageUrl}
                            alt="Single Banner New"
                            fill
                            quality={100}
                            className="object-fill w-full h-full"
                            priority
                          />
                        </Link>
                      </motion.div>
                    ))}
                  </Slider>
                ) : (
                  <motion.div className="relative w-full aspect-[1900/400]" variants={itemVariants}>
                    <Link href={singleBannerNewData.singlebanner_new.items[0].redirect_url || "#"}>
                      <Image
                        src={singleBannerNewData.singlebanner_new.items[0].bgImageUrl}
                        alt="Single Banner New"
                        width={1900}
                        height={400}
                        className="w-full h-auto object-fill"
                        priority
                      />
                    </Link>
                  </motion.div>
                )
              ) : null}
            </div>
          </motion.section>
        );
      case "singlebanner-two":
        return (
          <motion.section
            id="singlebanner-two"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="overflow-hidden pt-7"
          >
            <div className="relative">
              {isSingleBannerTwoLoading ? (
                <div className="p-6 flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d72828]"></div>
                </div>
              ) : singleBannerTwoData.singlebanner_two.items.length > 0 ? (
                singleBannerTwoData.singlebanner_two.items.length > 1 ? (
                  <Slider {...settings}>
                    {singleBannerTwoData.singlebanner_two.items.map((item) => (
                      <motion.div
                        key={item.id}
                        className="relative w-full aspect-[1900/400]"
                        variants={itemVariants}
                      >
                        <Link href={item.redirect_url || "#"} className="block w-full h-full">
                          <Image
                            src={item.bgImageUrl}
                            alt="Single Banner Two"
                            fill
                            quality={100}
                            className="object-fill w-full h-full"
                            priority
                          />
                        </Link>
                      </motion.div>
                    ))}
                  </Slider>
                ) : (
                  <motion.div
                    className="relative w-full aspect-[1900/400]"
                    variants={itemVariants}
                  >
                    <Link href={singleBannerTwoData.singlebanner_two.items[0].redirect_url || "#"}>
                      <Image
                        src={singleBannerTwoData.singlebanner_two.items[0].bgImageUrl}
                        alt="Single Banner Two"
                        width={1900}
                        height={400}
                        className="w-full h-auto object-fill"
                        priority
                      />
                    </Link>
                  </motion.div>
                )
              ) : null}
            </div>
          </motion.section>
        );
      case 'videocard':
        return <TrendingVideoSection key="trending-instagram-videos" />;
      case 'offer':
        return (
          <>
            <div className="overflow-hidden pt-6 px-4 sm:px-6 md:px-6">
              {offerProducts.length > 0 && (
                <section id="offer">
                  <div className="px-2 py-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-[#d72828] tracking-tight">Exciting Offers</h2>
                      {offerProducts.length > 3 && (
                        <div className="flex gap-2">
                          {/* Optional navigation buttons */}
                        </div>
                      )}
                    </div>

                    {/* Mobile view: static grid */}
                    {offerProducts.length >= 3 && (
                      <div className="grid grid-cols-2 gap-4 sm:hidden">
                        {offerProducts.slice(0, 4).map((product, index) => (
                          <div
                            key={product._id}
                            className={`card  shadow-sm h-[140px] min-h-[140px] flex overflow-hidden ${bgClasses[index % bgClasses.length]}`}
                          >
                            <div className="flex items-center">
                              <div className="w-1/3 p-2">
                                <Link href={`/product/${product.slug}`} className="block">
                                  <div className="h-[100px] sm:h-[120px] md:h-[130px] bg-white flex items-center justify-center overflow-hidden rounded-md">
                                    <img
                                      src={`/uploads/products/${product.images?.[0]}` || "/placeholder.jpg"}
                                      alt={product.item_code}
                                      className="object-contain w-full h-full"
                                    />
                                  </div>
                                </Link>
                              </div>
                              <div className="w-2/3 p-4">
                                <Link href={`/product/${product.slug}`} className="block">
                                  <div className="text-sm line-clamp-2">{product.name}</div>
                                </Link>
                                <div className="mt-1">
                                  <span className="text-sm font-medium text-gray-700">Rs.</span>
                                  <span className="ml-1 font-semibold">{product.price}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <div className="text-sm font-medium text-gray-400 line-through whitespace-nowrap">
                                    <span className="text-sm font-medium text-gray-400">Rs.</span>
                                    {product.special_price ? product.price : product.price + 20}
                                  </div>
                                  <div className="text-xs font-semibold text-green-600 bg-white rounded px-2 py-0.5 whitespace-nowrap">
                                    {product.special_price ? "Special Offer" : "Limited Time"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Desktop view: Swiper */}
                    <div className="hidden sm:block">
                      {offerProducts.length && (
                        <Swiper
                          modules={[Navigation, Autoplay]}
                          navigation={{
                            nextEl: ".swiper-button-next",
                            prevEl: ".swiper-button-prev",
                          }}
                          autoplay={{
                            delay: 5000,
                            disableOnInteraction: false,
                          }}
                          slidesPerView={4}
                          spaceBetween={0}
                          loop={true}
                        >
                          {offerProducts.map((product, index) => (
                            <SwiperSlide key={product._id}>
                              <div
                                className={`card  shadow-sm h-[140px] min-h-[140px] flex overflow-hidden ${bgClasses[index % bgClasses.length]}`}
                              >
                                <div className="flex items-center">
                                  <div className="w-1/3 p-2">
                                    <Link href={`/product/${product.slug}`} className="block">
                                      <div className="h-[100px] sm:h-[120px] md:h-[130px] flex items-center justify-center overflow-hidden rounded-md">
                                        <img
                                          src={`/uploads/products/${product.images?.[0]}` || "/placeholder.jpg"}
                                          alt={product.item_code}
                                          className="object-contain w-full h-full"
                                        />
                                      </div>
                                    </Link>
                                  </div>
                                  <div className="w-2/3 p-4">
                                    <Link href={`/product/${product.slug}`} className="block">
                                      <div className="text-sm line-clamp-2">{product.name}</div>
                                    </Link>
                                    <div className="mt-1">
                                      <span className="text-sm font-medium text-gray-700">Rs.</span>
                                      <span className="ml-1 font-semibold">{product.price}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="text-sm font-medium text-gray-400 line-through whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-400">Rs.</span>
                                        {product.special_price ? product.price : product.price + 20}
                                      </div>
                                      <div className="text-sm font-semibold text-green-600 bg-white rounded px-2 whitespace-nowrap">
                                        {product.special_price ? "Special Offer" : "Limited Time"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </>
        )
      default:
        return null;
    }
  };
  const getSectionComponentName = (sectionName) => {
    const mapping = {
      'categorybanner': 'category_banner',
      'flashsale': 'flash_sales',
      'Brands': 'brands',
      'topbanner': 'topbanner',
      'singlebanner': 'singlebanner',
      'singlebanner-two': 'singlebanner-two',
      'features': 'features',
      'product': 'product',
      // Add more mappings as needed
    };

    return mapping[sectionName] || sectionName.toLowerCase();
  };
  return (
    <>
      {navigating && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-center bg-black bg-opacity-30">
          <div className="p-4  shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d72828] mx-auto"></div>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="preloader fixed inset-0 z-[9999] flex justify-center items-center bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d72828] mx-auto"></div>
        </div>
      )}
      {/* main div start */}
      <div className={`relative transition-opacity duration-300 ${isLoading ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`} ref={containerRef} >
        {/* Banner Section start */}
        <div className="home-container">
          <HomePageRenderer />
        </div>
        <ToastContainer />
        {/* <RecentlyViewedProducts /> */}
      </div>
    </>
  );
}
