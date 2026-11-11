"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { getDiscountInfo } from "@/lib/discountHelper";

export default function TestCategoryPage() {
   const categoriess = [
    { name: "Air Conditioner", img: "/images/category/Wet-Grinders-kitchen-appliances.jpg" },
    { name: "Refrigerator ", img: "/images/category/Juicer-and-Mixer-Grinder.jpg" },
    { name: "Washing Machine", img: "/images/category/Juicer-and-Mixer-Grinder.jpg" },
    { name: "Dish Washer", img: "/images/category/Wet-Grinders-kitchen-appliances.jpg" },
  ];
  const subcategories =
  [
    { name: "Split Ac", img: "/images/category/Juice-and-mixer-grinder.jpg" },
    { name: "Inverter Ac", img: "/images/category/Kitchen-Chimneys-w.jpg" },
    { name: "Window Ac", img: "/images/category/Hand-Blenders-w.jpg" },
    { name: "Cassette Ac", img: "/images/category/Gas-Stove.jpg" },
    { name: "Cassette Ac", img: "/images/category/Dishwashers-w.jpg" },
    { name: "Cassette Ac", img: "/images/category/Cookwares-ka-w.jpg" },
  ];

  const testProducts = [
  { id: 1, brand: "WHIRLPOOL", name: "Proton Roqy 260L Frost Free", price: 37650, sale: 27380, img: "/images/p1.jpg", stock: 3 },
  { id: 2, brand: "LLOYD", name: "RD MARVEL 290C TH FS", price: 29690, sale: 23330, img: "/images/p2.jpg", stock: 27 },
  { id: 3, brand: "LLOYD", name: "DC 216 4S AD PASTEL", price: 33390, sale: 20779, img: "/images/p3.jpg", stock: 28 },
  { id: 4, brand: "LG", name: "LG 260L Smart Inverter", price: 32990, sale: 21450, img: "/images/p4.jpg", stock: 12 },
  { id: 5, brand: "SAMSUNG", name: "Samsung 253L Double Door", price: 31990, sale: 23999, img: "/images/p5.jpg", stock: 9 },
  { id: 6, brand: "HAIER", name: "Haier 258L Frost Free", price: 28990, sale: 21990, img: "/images/p6.jpg", stock: 14 },
  { id: 7, brand: "GODREJ", name: "Godrej 223L Direct Cool", price: 26990, sale: 20990, img: "/images/p7.jpg", stock: 6 },
  { id: 8, brand: "PANASONIC", name: "Panasonic 307L Inverter", price: 35990, sale: 28990, img: "/images/p8.jpg", stock: 11 },
  { id: 9, brand: "BOSCH", name: "Bosch 288L Premium", price: 39990, sale: 31990, img: "/images/p9.jpg", stock: 5 },
  { id: 10, brand: "IFB", name: "IFB 308L Frost Free", price: 37990, sale: 29990, img: "/images/p10.jpg", stock: 7 },
];

   
  return (
    <div className="px-3 sm:px-8 " style={{ backgroundColor: "#EBEBEB" }}>
      <div className="max-w-7xl container mx-auto">

      {/* ✅ banner SLIDER */}
      <Swiper
        modules={[Navigation, Autoplay, Pagination]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        loop={true}
        className="customSwiper overflow-hidden"
      >
        <SwiperSlide>
          <img
            src="/images/category/poorvika_banner.jpg"
            alt="Banner 1"
            loading="lazy"
            // object-contain on mobile, switch to object-cover on sm+
            className="w-full h-[180px] sm:h-[280px] md:h-[300px] lg:h-[411px] object-contain sm:object-contain bg-[#f5f5f5]"
          />
        </SwiperSlide>

        <SwiperSlide>
          <img
            src="/images/category/poorvika_banner_two.jpg"
            alt="Banner 2"
            loading="lazy"
            className="w-full h-[180px] sm:h-[280px] md:h-[300px] lg:h-[411px] object-contain sm:object-contain bg-[#f5f5f5]"
          />
        </SwiperSlide>

        <SwiperSlide>
          <img
            src="/images/category/category-banner.jpg"
            alt="Banner 3"
            loading="lazy"
            className="w-full h-[180px] sm:h-[280px] md:h-[300px] lg:h-[411px] object-contain sm:object-contain bg-[#f5f5f5]"
          />
        </SwiperSlide>
      </Swiper>


      {/* ✅ CATEGORY SLIDER */}
      <div className="mt-6 pb-4 bg-white">
        <h2 className="text-2xl font-bold text-center py-4">Categories</h2>

        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 4 },
            1024: { slidesPerView: 4 },
          }}
          className="pb-8 customSwiper"
        >
          {categoriess.map((cat, index) => (
            <SwiperSlide key={index}>
              <div className="bg-[#d72828] rounded-xl flex flex-col items-center">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full rounded-[10px_10px_10px_10px]"
                />

                  {/* <h3 className="text-lg font-semibold text-center text-white font-bold py-2">
                  {cat.name}
                </h3> */}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Single Banner ✅ */}
      <div className="bg-white">
      <div className="mt-6 overflow-hidden">
        <h2 className="text-2xl font-bold text-center py-4">Air Conditioner</h2>
        <img
          src="/images/category/banner-3-ac-2025.webp"
          alt="Category Banner"
          className="w-full"
        />
      </div>

     {/* sub category*/}
       <div className="mt-6 pb-4 bg-white">
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
          className="pb-8 customSwiper"
        >
          {subcategories.map((cat, index) => (
            <SwiperSlide key={index}>
              <div className="rounded-xl flex flex-col items-center">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full rounded-[10px_10px_10px_10px]"
                />

                  {/* <h3 className="text-lg font-semibold text-center text-white font-bold py-2">
                  {cat.name}
                </h3> */}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

       {/* products*/}
      <div className="bg-white p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Best Deals </h2>

        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            1024: { slidesPerView: 5 },
          }}
          className="customSwiper"
        >
          {testProducts.map((product) => {
            const { discountPercent: discount, showDiscount } = getDiscountInfo(product.price, product.sale);

            return (
              <SwiperSlide key={product.id}>
                <div className="relative bg-white border rounded-lg p-3 h-full flex flex-col hover:shadow-lg transition">

                  {/* ✅ Discount Badge */}
                  {showDiscount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {discount}% OFF
                    </span>
                  )}

                  {/* ✅ Wishlist Icon */}
                  <span className="absolute top-2 right-2 border rounded-full p-1">
                    🤍
                  </span>

                  {/* ✅ Image */}
                  <img
                    src="/images/category/ac-products.jpg"
                    className="h-40 w-full object-contain mb-3"
                    alt={product.name}
                  />

                  {/* ✅ Brand */}
                  <p className="text-xs text-gray-500 uppercase">
                    {product.brand}
                  </p>

                  {/* ✅ Product Name */}
                  <h3 className="text-sm font-medium text-[#d72828] line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* ✅ Price */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600 font-semibold">
                      ₹ {product.sale.toLocaleString()}
                    </span>
                    {showDiscount && (
                      <span className="text-xs line-through text-gray-500">
                        ₹ {product.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* ✅ Stock */}
                  <p className="text-xs text-green-600 mb-2">
                    In Stock, {product.stock} units
                  </p>

                  {/* ✅ Buttons */}
                  <div className="mt-auto flex items-center gap-2">
                    <button className="flex-1 bg-[#d72828] text-white text-xs py-2 rounded hover:bg-[#d72828]">
                      🛒 Add to Cart
                    </button>

                    <button className="bg-green-500 text-white p-2 rounded-full">
                      💬
                    </button>
                  </div>

                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      </div>

      {/* Single Banner ✅ */}
      <div className="bg-white">
      <div className="mt-6 overflow-hidden">
        <h2 className="text-2xl font-bold text-center py-4">Washing Machine</h2>
        <img
          src="https://img-prd-pim.poorvika.com/pageimg/WASHING-MACHINES-HOME-APPLIANCES-W.webp"
          alt="Category Banner"
          className="w-full"
        />
      </div>

     {/* sub category*/}
       <div className="mt-6 pb-4 bg-white">
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
          className="pb-8 customSwiper"
        >
          {subcategories.map((cat, index) => (
            <SwiperSlide key={index}>
              <div className=" rounded-xl flex flex-col items-center">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full rounded-[10px_10px_10px_10px]"
                />

                  {/* <h3 className="text-lg font-semibold text-center text-white font-bold py-2">
                  {cat.name}
                </h3> */}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

       {/* products*/}
      <div className="bg-white p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Best Deals </h2>

        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            1024: { slidesPerView: 5 },
          }}
          className="customSwiper"
        >
          {testProducts.map((product) => {
            const { discountPercent: discount, showDiscount } = getDiscountInfo(product.price, product.sale);

            return (
              <SwiperSlide key={product.id}>
                <div className="relative bg-white border rounded-lg p-3 h-full flex flex-col hover:shadow-lg transition">

                  {/* ✅ Discount Badge */}
                  {showDiscount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {discount}% OFF
                    </span>
                  )}

                  {/* ✅ Wishlist Icon */}
                  <span className="absolute top-2 right-2 border rounded-full p-1">
                    🤍
                  </span>

                  {/* ✅ Image */}
                  <img
                    src="/images/category/washing-machine-products.png"
                    className="h-40 w-full object-contain mb-3"
                    alt={product.name}
                  />

                  {/* ✅ Brand */}
                  <p className="text-xs text-gray-500 uppercase">
                    {product.brand}
                  </p>

                  {/* ✅ Product Name */}
                  <h3 className="text-sm font-medium text-[#d72828] line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* ✅ Price */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600 font-semibold">
                      ₹ {product.sale.toLocaleString()}
                    </span>
                    {showDiscount && (
                      <span className="text-xs line-through text-gray-500">
                        ₹ {product.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* ✅ Stock */}
                  <p className="text-xs text-green-600 mb-2">
                    In Stock, {product.stock} units
                  </p>

                  {/* ✅ Buttons */}
                  <div className="mt-auto flex items-center gap-2">
                    <button className="flex-1 bg-[#d72828] text-white text-xs py-2 rounded hover:bg-[#d72828]">
                      🛒 Add to Cart
                    </button>

                    <button className="bg-green-500 text-white p-2 rounded-full">
                      💬
                    </button>
                  </div>

                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      </div>

      {/* Single Banner ✅ */}
      <div className="bg-white">
      <div className="mt-6 overflow-hidden">
        <h2 className="text-2xl font-bold text-center py-4">Refrigerator</h2>
        <img
          src="images/category/WASHING-MACHINES-HOME-APPLIANCES-W.jpg"
          alt="Category Banner"
          className="w-full"
        />
      </div>

     {/* sub category*/}
       <div className="mt-6 pb-4 bg-white">
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
          className="pb-8 customSwiper"
        >
          {subcategories.map((cat, index) => (
            <SwiperSlide key={index}>
              <div className="rounded-xl flex flex-col items-center">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full rounded-[10px_10px_10px_10px]"
                />

                  {/* <h3 className="text-lg font-semibold text-center text-white font-bold py-2">
                  {cat.name}
                </h3> */}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

       {/* products*/}
      <div className="bg-white p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Best Deals </h2>

        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            1024: { slidesPerView: 5 },
          }}
          className="customSwiper"
        >
          {testProducts.map((product) => {
            const { discountPercent: discount, showDiscount } = getDiscountInfo(product.price, product.sale);

            return (
              <SwiperSlide key={product.id}>
                <div className="relative bg-white border rounded-lg p-3 h-full flex flex-col hover:shadow-lg transition">

                  {/* ✅ Discount Badge */}
                  {showDiscount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {discount}% OFF
                    </span>
                  )}

                  {/* ✅ Wishlist Icon */}
                  <span className="absolute top-2 right-2 border rounded-full p-1">
                    🤍
                  </span>

                  {/* ✅ Image */}
                  <img
                    src="/images/category/refrigerator-products.png"
                    className="h-40 w-full object-contain mb-3"
                    alt={product.name}
                  />

                  {/* ✅ Brand */}
                  <p className="text-xs text-gray-500 uppercase">
                    {product.brand}
                  </p>

                  {/* ✅ Product Name */}
                  <h3 className="text-sm font-medium text-[#d72828] line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* ✅ Price */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600 font-semibold">
                      ₹ {product.sale.toLocaleString()}
                    </span>
                    {showDiscount && (
                      <span className="text-xs line-through text-gray-500">
                        ₹ {product.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* ✅ Stock */}
                  <p className="text-xs text-green-600 mb-2">
                    In Stock, {product.stock} units
                  </p>

                  {/* ✅ Buttons */}
                  <div className="mt-auto flex items-center gap-2">
                    <button className="flex-1 bg-[#d72828] text-white text-xs py-2 rounded hover:bg-[#d72828]">
                      🛒 Add to Cart
                    </button>

                    <button className="bg-green-500 text-white p-2 rounded-full">
                      💬
                    </button>
                  </div>

                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      </div>

      {/* Single Banner ✅ */}
      <div className="bg-white">
      <div className="mt-6 overflow-hidden">
        <h2 className="text-2xl font-bold text-center py-4">Dish Washer</h2>
        <img
          src="/images/category/Redefining-Dish-Hygins-For-Indian-Homes-W.jpg"
          alt="Category Banner"
          className="w-full"
        />
      </div>

     {/* sub category*/}
       <div className="mt-6 pb-4 bg-white">
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 4 },
            1024: { slidesPerView: 5 },
          }}
          className="pb-8 customSwiper"
        >
          {subcategories.map((cat, index) => (
            <SwiperSlide key={index}>
              <div className="rounded-xl flex flex-col items-center">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full rounded-[10px_10px_10px_10px]"
                />

                  {/* <h3 className="text-lg font-semibold text-center text-white font-bold py-2">
                  {cat.name}
                </h3> */}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* products*/}
      <div className="bg-white p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Best Deals </h2>

        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
            1024: { slidesPerView: 5 },
          }}
          className="customSwiper"
        >
          {testProducts.map((product) => {
            const { discountPercent: discount, showDiscount } = getDiscountInfo(product.price, product.sale);

            return (
              <SwiperSlide key={product.id}>
                <div className="relative bg-white border rounded-lg p-3 h-full flex flex-col hover:shadow-lg transition">

                  {/* ✅ Discount Badge */}
                  {showDiscount && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {discount}% OFF
                    </span>
                  )}

                  {/* ✅ Wishlist Icon */}
                  <span className="absolute top-2 right-2 border rounded-full p-1">
                    🤍
                  </span>

                  {/* ✅ Image */}
                  <img
                    src="/images/category/dish-washer-products.jpg"
                    className="h-40 w-full object-contain mb-3"
                    alt={product.name}
                  />

                  {/* ✅ Brand */}
                  <p className="text-xs text-gray-500 uppercase">
                    {product.brand}
                  </p>

                  {/* ✅ Product Name */}
                  <h3 className="text-sm font-medium text-[#d72828] line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* ✅ Price */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600 font-semibold">
                      ₹ {product.sale.toLocaleString()}
                    </span>
                    {showDiscount && (
                      <span className="text-xs line-through text-gray-500">
                        ₹ {product.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* ✅ Stock */}
                  <p className="text-xs text-green-600 mb-2">
                    In Stock, {product.stock} units
                  </p>

                  {/* ✅ Buttons */}
                  <div className="mt-auto flex items-center gap-2">
                    <button className="flex-1 bg-[#d72828] text-white text-xs py-2 rounded hover:bg-[#d72828]">
                      🛒 Add to Cart
                    </button>

                    <button className="bg-green-500 text-white p-2 rounded-full">
                      💬
                    </button>
                  </div>

                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      </div>
  
      </div>

    
    </div>
  );
}
