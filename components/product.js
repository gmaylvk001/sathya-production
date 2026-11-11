import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { FaShoppingCart, FaHeart, FaShareAlt, FaBell } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import { IoFastFoodOutline, IoReload, IoCardOutline, IoShieldCheckmark, IoStorefront } from "react-icons/io5";

export default function ProductPage() {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0, visible: false });
  const [quantity, setQuantity] = useState(1);

  const imgRef = useRef(null);
  const zoomRef = useRef(null);

  useEffect(() => {
    // Check if router is ready and has query parameters
    if (!router.query.slug) return;
    const { slug } = router.query;
    if (!slug) {
      setLoading(false);
      setError("Product slug not found");
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/product/${slug}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Product fetch failed");
console.log(data)
        setProduct(data);
        setSelectedImage(data.images?.[0] || "/placeholder.jpg");
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [router.query.slug]);

  // Loading state
  if (loading) {
    return <div className="text-center py-20">Loading product...</div>;
  }

  // Error state
  if (error) {
    return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  }

  // No product found
  if (!product) {
    return <div className="text-center py-20">Product not found</div>;
  }

  // Rest of your component code...
  const handleThumbnailClick = (src) => {
    setSelectedImage(src);
  };

  const handleMouseMove = (e) => {
    if (!imgRef.current || !zoomRef.current) return;

    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomPosition({ x, y, visible: true });
  };

  const handleMouseLeave = () => {
    setZoomPosition((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Product Header */}
      <div className="bg-red-50 py-6 px-8 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">🏠 Home</span>
          <span className="text-gray-500">›</span>
          <span className="text-customBlue font-semibold">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Left Column - Images */}
          <div className="md:col-span-1">
            <div className="relative h-full">
              <div className="sticky top-20">
                <div className="border border-gray-400 rounded-lg p-4 overflow-hidden relative group">
                  <img 
                    ref={imgRef} 
                    src={`/uploads/products/${selectedImage}`} 
                    alt={product.name} 
                    className="w-full rounded-lg transition-transform duration-300 group-hover:scale-105" 
                    onMouseMove={handleMouseMove} 
                    onMouseLeave={handleMouseLeave}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder.jpg";
                    }}
                  />
                  
                  {/* Zoom Lens */}
                  <div 
                    ref={zoomRef}
                    className={`absolute w-32 h-32 border-2 border-gray-400 rounded-full bg-white bg-opacity-50 backdrop-blur-md pointer-events-none transition-opacity duration-200 ${
                      zoomPosition.visible ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      top: `calc(${zoomPosition.y}% - 4rem)`,
                      left: `calc(${zoomPosition.x}% - 4rem)`,
                      backgroundImage: `url(/uploads/products/${selectedImage})`,
                      backgroundSize: "250% 250%",
                      backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                  />
                </div>
                
                {/* Thumbnails */}
                <div className="flex gap-2 mt-3">
                  {product.images?.map((image, index) => (
                    <img 
                      key={index} 
                      src={`/uploads/products/${image}`}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-16 h-16 border border-gray-400 rounded-lg cursor-pointer hover:scale-110 transition-transform duration-300"
                      onClick={() => handleThumbnailClick(image)}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder.jpg";
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Product Info */}
          <div className="md:col-span-2">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            
            {/* Rating */}
            <div className="mt-2 pb-3 border-b border-gray-400">
              <div className="flex items-center space-x-2 text-yellow-500 text-sm">
                ⭐⭐⭐⭐⭐ <span className="text-gray-500 text-xs">({product.rating || "N/A"} Star Rating) | {product.reviews ? product.reviews.toLocaleString() : "0"} Reviews</span>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-gray-700 text-lg mt-3 font-medium">
              {product.description || "No description available."}
            </p>
            
            {/* Price */}
            <div className="flex items-center mt-4 pb-3 border-b border-gray-400">
              <div className="flex items-center space-x-3">
                <span className="text-4xl font-bold text-gray-900">
                  ${product.special_price || product.price}
                </span>
                {product.special_price && (
                  <span className="text-gray-500 line-through text-xl">${product.price}</span>
                )}
              </div>
              <button className="ml-6 bg-customBlue text-white px-5 py-2 rounded-lg shadow-md hover:bg-[#d72828] transition duration-300 text-lg">
                Order on WhatsApp
              </button>
            </div>
            
            {/* Stock Status */}
            <div className="mt-4">
              <p className="font-semibold">
                {product.stock_status === "In Stock" ? "✅ In Stock" : "⚠ Out of Stock"}
              </p>
              {product.stock_status === "In Stock" && product.quantity && (
                <>
                  <div className="h-2 bg-gray-300 rounded-full mt-1">
                    <div 
                      className="h-2 bg-orange-500 rounded-full" 
                      style={{ width: `${Math.min(100, (product.quantity / 100) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    Available: <span className="font-bold">{product.quantity}</span>
                  </p>
                </>
              )}
            </div>
            
            {/* Quantity and Add to Cart */}
            <div className="mt-3 flex items-end w-full">
              <div className="flex flex-col">
                <p className="text-gray-700 text-sm font-semibold mb-2">Quantity</p>
                <div className="flex items-center border border-gray-300 rounded-full w-26 h-10">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="px-3 py-2 border-r"
                  >
                    -
                  </button>
                  <span className="px-4 py-2">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    className="px-3 py-2 border-l"
                  >
                    +
                  </button>
                </div>
              </div>
              <button className="ml-4 bg-customBlue text-white px-9 h-10 rounded-md shadow-md hover:bg-[#d72828] transition duration-300 text-md flex items-center justify-center gap-x-3">
                <FaShoppingCart /> Add To Cart
              </button>
              <div className="flex-grow"></div>
              <div className="flex items-center space-x-3">
                {[FaHeart, FaShareAlt, FaBell].map((Icon, index) => (
                  <button 
                    key={index} 
                    className="w-10 h-10 flex items-center justify-center rounded-full transition duration-300 ease-in-out bg-[#cfd4e1] hover:bg-[#d72828] text-white"
                  >
                    <Icon className="text-customBlue hover:text-white" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="border-b border-gray-400 mt-4"></div>
            

          </div>

          {/* Right Column - Seller Info */}
          <div className="md:col-span-1 border border-gray-300 rounded-lg shadow-md bg-white mb-14 w-full max-w-sm">
            {/* Seller Header */}
            <div className="mt-4 px-4">
              <div className="flex items-center justify-between bg-customBlue text-white px-3 py-2 rounded-full">
                <div className="flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded-full flex items-center justify-center w-8 h-8">
                    <IoStorefront className="text-customBlue text-lg" />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">
                    By {product.brand || "Marketpro"}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  <button className="bg-white text-customBlue text-xs font-medium px-3 py-1 rounded-full border border-white whitespace-nowrap">
                    View Store
                  </button>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-300 w-full mt-4"></div>

            {/* Features */}
            <div className="rounded-b-lg w-full" style={{ backgroundColor: '#cfd4e1' }}>
              {[
                { icon: TbTruckDelivery, title: "Fast Delivery", desc: "Lightning-fast shipping, guaranteed." },
                { icon: IoReload, title: "Free 90-day returns", desc: "Shop risk-free with easy returns." },
                { icon: IoStorefront, title: "Pickup available", desc: "Usually ready in 24 hours" },
                { icon: IoCardOutline, title: "Payment", desc: "Secure online and cash payments." },
                { icon: IoShieldCheckmark, title: "Warranty", desc: product.warranty || "Guaranteed product quality." },
              ].map(({ icon: Icon, title, desc }, index) => (
                <div key={index}>
                  {index !== 0 && <div className="border-b border-gray-400 w-full mt-4"></div>}
                  <div className="flex items-center gap-4 px-6 py-4 w-full">
                    <div className="bg-white p-3 rounded-full border border-gray-300 shadow-sm flex items-center justify-center">
                      <Icon className="text-lg text-customBlue" />
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 break-words">{title}</h4>  
                      <p className="text-sm text-gray-700 break-words">{desc}</p>  
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}