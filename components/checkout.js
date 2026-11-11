"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ToastContainer, toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { AuthModal } from '@/components/AuthModal';
import { trackCheckout } from "@/utils/nextjs-event-tracking.js";

// Dynamically load Razorpay script
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};




const DeliveryOptions = ({ formData, handleChange, isDeliverySaved, setIsDeliverySaved, stores }) => {
  const [fetchedStores, setFetchedStores] = useState(stores || []);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("/api/store_listings/get");
        const json = await res.json();
        // /api/store_listings/get returns the array directly
        if (Array.isArray(json)) {
          setFetchedStores(json);
        } else if (json.data) {
          setFetchedStores(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch store listings", error);
      }
    };
    
    if (!stores || stores.length === 0) {
      fetchStores();
    }
  }, [stores]);




  return (
    <div className="mt-6 border rounded-md shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center bg-gray-100 px-4 py-2 border-b">
        <div className="text-sm font-semibold uppercase text-gray-700">Delivery Type</div>
        {isDeliverySaved && (
          <button
            className="text-red-600 text-sm"
            onClick={() => setIsDeliverySaved(false)}
          >
            Change
          </button>
        )}
      </div>

      {!isDeliverySaved ? (
        // Editable Form
        <div className="p-4 space-y-4">
          {/* Store Pickup */}
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="storePickup"
              name="deliveryType"
              value="store"
              checked={formData.deliveryType === "store"}
              onChange={handleChange}
              className="w-5 h-5 text-red-600"
            />
            <label htmlFor="storePickup" className="text-gray-700 font-medium">Store Pickup</label>
          </div>

          {formData.deliveryType === "store" && (
            <select
              name="selectedStore"
              value={formData.selectedStore}
              onChange={handleChange}
              className="border border-gray-300 rounded-md p-2 w-full"
              required
            >
              <option value="">Select store</option>
              {fetchedStores.map((store) => (
                <option key={store._id} value={store.branch_code || store._id}>
                  {store.title || store.organisation_name} {store.city ? `- ${store.city}` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Home Delivery */}
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="homeDelivery"
              name="deliveryType"
              value="home"
              checked={formData.deliveryType === "home"}
              onChange={handleChange}
              className="w-5 h-5 text-red-600"
            />
            <label htmlFor="homeDelivery" className="text-gray-700 font-medium">Home Delivery</label>
          </div>

          {/* Save and Continue */}
          <button
            type="button"
            onClick={() => {
              if (formData.deliveryType === "store" && !formData.selectedStore) {
                toast.error("Please select a store for pickup");
                return;
              }
              toast.success("Delivery method saved");
              setIsDeliverySaved(true);
            }}
            className="bg-red-600 text-white px-6 py-2 rounded-md mt-4 hover:bg-red-700 transition"
          >
            Save And Continue
          </button>
        </div>
      ) : (
        // Collapsed Summary View
        <div className="p-4 flex items-start gap-4">
          <div className="text-2xl">🚚</div>
          <div>
            <div className="text-sm font-semibold text-gray-700 uppercase">
              {formData.deliveryType === 'store' ? 'STORE PICKUP' : 'HOME DELIVERY'}
            </div>
            {formData.deliveryType === 'store' && (
              <div className="text-gray-600 text-sm">
                {fetchedStores.find(s => s._id === formData.selectedStore)?.city} (
                {fetchedStores.find(s => s._id === formData.selectedStore)?.organisation_name})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function CheckoutPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    country: "",
    address: "",
    landmark: "",
    city: "",
    state: "",
    postCode: "",
    phonenumber: "",
    email: "",
    additionalInfo: "",
    deliveryType: "home",
    selectedStore: ""
  });
  const [isDeliverySaved, setIsDeliverySaved] = useState(false);
  const [useraddress, setUseraddress] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // / ✅ NEW: summary state
  const [orderSummary, setOrderSummary] = useState({
    discount: 0,
    subtotal: 0,
    total: 0
  });
  console.log(cartItems);
const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch("/api/store/get");
        const result = await res.json();
        if (result.success) {
          setStores(result.data);
        } else {
          console.error("Error fetching stores:", result.error);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchStores();
  }, []);

  const uniqueCities = [...new Set(stores.map(store => store.city))];
  const extraCities = ["Ariyalur","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Salem","Sivaganga","Thanjavur","Theni","Thoothukudi","Tirunelveli","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar", "Singanallur", "Sivananthapuram", "Vadavalli", "Annur", "Mettupalayam", "Thennur", "Ariyamangalam", "Komarapalayam", "Kattur"];

  const finalCities = [...new Set([...uniqueCities, ...extraCities])];

  useEffect(() => {
    const buyNowData = localStorage.getItem("buyNowData");
    const checkoutData = localStorage.getItem("checkoutData");

    if (buyNowData) {
      const parsedData = JSON.parse(buyNowData);
      setCartItems(parsedData.cart.items);
      setOrderSummary({
        discount: 0,
        subtotal: parsedData.total || 0,
        total: parsedData.total || 0,
      });
      // Convert to checkoutData so the totals survive an auth modal reload
      localStorage.setItem("checkoutData", JSON.stringify({
        cart: parsedData.cart,
        discount: 0,
        subtotal: parsedData.total || 0,
        total: parsedData.total || 0,
      }));
      localStorage.removeItem("buyNowData");
    } else if (checkoutData) {
      const parsedData = JSON.parse(checkoutData);
      setCartItems(parsedData.cart.items);

      // ✅ also load discount, subtotal, total
      setOrderSummary({
        discount: parsedData.discount || 0,
        subtotal: parsedData.subtotal || 0,
        total: parsedData.total || 0
      });
    }

    fetchData();
  }, []);


  const fetchData = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    setShowAuthModal(true);
    setLoading(false);
    return;
  }

  try {
    const decoded = jwtDecode(token);
    const userId = decoded.userId;

    // ✅ Only fetch cart if no items already set
    if (cartItems.length === 0) {
      const cartResponse = await fetch("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!cartResponse.ok) throw new Error("Failed to fetch cart data");

      const cartData = await cartResponse.json();
      setCartItems(cartData.cart.items);
    }

    // Fetch user address
    const addressResponse = await fetch(`/api/useraddress?user_id=${userId}`);
    if (!addressResponse.ok) throw new Error("Failed to fetch address data");

    const addressData = await addressResponse.json();
    setUseraddress(addressData.userAddress);

    if (addressData.userAddress.length > 0) {
      const addr = addressData.userAddress[0];
      setFormData(prev => ({
        ...prev,
        firstName: addr.firstName || "",
        lastName: addr.lastName || "",
        country: addr.country || "",
        address: addr.address || "",
        city: addr.city || "",
        state: addr.state || "",
        postCode: addr.postCode || "",
        phonenumber: addr.phonenumber || "",
        landmark: addr.landmark || "",
        email: addr.email || "",
        businessName: addr.businessName || "",
        additionalInfo: addr.additionalInfo || ""
      }));
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    toast.error("Failed to load checkout data");
  } finally {
    setLoading(false);
  }
};


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePaymentChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const initializeRazorpay = async () => {
    return await loadRazorpay();
  };

  const createRazorpayOrder = async (amount) => {
    try {
      const res = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount * 100 }) // Convert to paise
      });
      return await res.json();
    } catch (error) {
      throw new Error('Failed to create Razorpay order');
    }
  };
const handleOnlinePayment = async (totalAmount) => {
  try {
    const razorpayLoaded = await initializeRazorpay();
    if (!razorpayLoaded) {
      toast.error('Razorpay SDK failed to load');
      setIsSubmitting(false);
      return;
    }

    const orderResponse = await createRazorpayOrder(totalAmount);
    const { order } = orderResponse;

    return new Promise((resolve, reject) => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY,
        amount: order.amount,
        currency: "INR",
        name: "Sathya Stores",
        description: "Product Purchase",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verificationRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verificationRes.ok) {
              resolve({
                paymentId: response.razorpay_payment_id,
                status: "paid",
                mode: "online"
              });
            } else {
              reject(new Error('Payment verification failed'));
            }
          } catch (err) {
            reject(err);
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phonenumber
        },
        theme: {
          color: "#F37254"
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            reject(new Error('Payment window closed'));
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response) {
        setIsSubmitting(false);
        reject(new Error(response.error.description));
      });
    });
  } catch (error) {
    console.error('Razorpay error:', error);
    toast.error('Payment processing failed');
    setIsSubmitting(false);
    throw error;
  }
};
  // const handleOnlinePayment = async (totalAmount) => {
  //   try {
  //     const razorpayLoaded = await initializeRazorpay();
  //     if (!razorpayLoaded) {
  //       toast.error('Razorpay SDK failed to load');
  //       setIsSubmitting(false);
  //       return;
  //     }
  
  //     const orderResponse = await createRazorpayOrder(totalAmount);
  //     const { order } = orderResponse;
  
  //     return new Promise((resolve, reject) => {
  //       const options = {
  //         key: process.env.NEXT_PUBLIC_RAZORPAY_TEST_KEY,
  //         amount: order.amount,
  //         currency: "INR",
  //         name: "Sathya Stores",
  //         description: "Product Purchase",
  //         order_id: order.id,
  //         handler: async function (response) {
  //           try {
  //             const verificationRes = await fetch('/api/verify-payment', {
  //               method: 'POST',
  //               headers: { 'Content-Type': 'application/json' },
  //               body: JSON.stringify({
  //                 razorpay_payment_id: response.razorpay_payment_id,
  //                 razorpay_order_id: response.razorpay_order_id,
  //                 razorpay_signature: response.razorpay_signature
  //               })
  //             });
  
  //             if (verificationRes.ok) {
  //               resolve({
  //                 paymentId: response.razorpay_payment_id,
  //                 status: "paid",
  //                 mode: "online"
  //               });
  //             } else {
  //               reject(new Error('Payment verification failed'));
  //             }
  //           } catch (err) {
  //             reject(err);
  //           }
  //         },
  //         prefill: {
  //           name: `${formData.firstName} ${formData.lastName}`,
  //           email: formData.email,
  //           contact: formData.phonenumber
  //         },
  //         theme: {
  //           color: "#F37254"
  //         }
  //       };
  
  //       const razorpay = new window.Razorpay(options);
  //       razorpay.open();
  
  //       razorpay.on('payment.failed', function (response) {
  //          setIsSubmitting(false);
  //         reject(new Error(response.error.description));
  //       });
  //        razorpay.on('modal.close', function() {
  //       setIsSubmitting(false);
  //     });
  //     });
  //   } catch (error) {
  //     console.error('Razorpay error:', error);
  //     toast.error('Payment processing failed');
  //     throw error;
  //   }
  // };
// Calculate totals
const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const totalDiscount = cartItems.reduce((sum, item) => sum + (item.discount || 0), 0);
const grandTotal = subtotal - totalDiscount;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
  

  setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setShowAuthModal(true);
        setIsSubmitting(false);
        return;
      }
      const decoded = jwtDecode(token);
      const userId = decoded.userId;
  
      // Use saved address data if selected, otherwise use form data
      const addressData = useSavedAddress && selectedAddress !== null 
        ? useraddress[selectedAddress]
        : formData;
  
      // Validation Checks (only if not using saved address)
      if (!useSavedAddress || selectedAddress === null) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[0-9]{10}$/;
        const postCodeRegex = /^[0-9]{4,6}$/;
  
        if (!addressData.firstName || !addressData.lastName || !addressData.email || 
            !addressData.phonenumber || !addressData.postCode) {
          toast.error("Please fill in all required fields.");
          return;
        }
        if (!emailRegex.test(addressData.email)) {
          toast.error("Please enter a valid email address.");
          return;
        }
        if (!phoneRegex.test(addressData.phonenumber)) {
          toast.error("Please enter a valid 10-digit phone number.");
          return;
        }
        if (!postCodeRegex.test(addressData.postCode)) {
          toast.error("Please enter a valid postal code (4-6 digits).");
          return;
        }
      }
    setIsSubmitting(true);
      setError("");
  
           const totalAmount = orderSummary.total;

      let paymentId = "";
      let paymentStatus = "";
      let paymentMode = "";
  
      if (paymentMethod === 'Cash on Delivery') {
        paymentId = "COD_" + Date.now();
        paymentStatus = "pending";
        paymentMode = "Cash on Delivery";
      } else if (paymentMethod === 'online') {
        try {
          const result = await handleOnlinePayment(totalAmount);
          paymentId = result.paymentId;
          paymentStatus = result.status;
          paymentMode = result.mode;
        } catch (error) {
          toast.error(`Payment failed: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
      } else {
        console.log("Invalid Payment Method");
        return;
      }
 
      // Only save new address if not using saved address
      if (!useSavedAddress || selectedAddress === null) {
        const formDataToSend = new FormData();
        formDataToSend.append('userId', userId);
        formDataToSend.append('firstname', addressData.firstName);
        formDataToSend.append('lastName', addressData.lastName);
        formDataToSend.append('businessName', addressData.businessName || '');
        formDataToSend.append('country', addressData.country);
        formDataToSend.append('email', addressData.email);
        formDataToSend.append('address', addressData.address);
        formDataToSend.append('postCode', addressData.postCode);
        formDataToSend.append('city', addressData.city);
        formDataToSend.append('state', addressData.state);
        formDataToSend.append('landmark', addressData.landmark || '');
        formDataToSend.append('phonenumber', addressData.phonenumber);
        formDataToSend.append('altnumber', addressData.altnumber || '');
        formDataToSend.append('gst_name', addressData.gst_name || '');
        formDataToSend.append('gst_number', addressData.gst_number || '');
        formDataToSend.append('additionalInfo', addressData.additionalInfo || '');
  
        const addressRes = await fetch('/api/useraddress/add', {
          method: 'POST',
          body: formDataToSend,
        });
  
        if (!addressRes.ok) {
          throw new Error('Failed to save address');
        }
        const newAddressData = await addressRes.json();
        setUseraddress(prev => [...prev, newAddressData.userAddress]);
      }
  
      // Save Payment
      const paymentRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          payment_mode: paymentMode,
          status: paymentStatus,
          modevalue: totalAmount,
          payment_id: paymentId,
          payment_Date: new Date(),
        }),
      });
  
      if (!paymentRes.ok) {
        throw new Error('Payment processing failed');
      }
  
      const res = await paymentRes.json();
      const paymentData = res.paymentData;
      
      // Prepare delivery address string
      const deliveryAddress = useSavedAddress && selectedAddress !== null
        ? `${useraddress[selectedAddress].address}, ${useraddress[selectedAddress].city}, ${useraddress[selectedAddress].state}, ${useraddress[selectedAddress].country}, ${useraddress[selectedAddress].postCode}`
        : `${addressData.address}, ${addressData.city}, ${addressData.state}, ${addressData.country}, ${addressData.postCode}`;
  
      // Save Order
      const orderRes = await fetch('/api/orders/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_adddeliveryid: useSavedAddress && selectedAddress !== null 
            ? useraddress[selectedAddress]._id 
            : useraddress[0]?._id,
          order_username: `${addressData.firstName} ${addressData.lastName}`,
          order_phonenumber: addressData.phonenumber,
          email_address: addressData.email,
          order_item: cartItems,
          order_amount: totalAmount,
          order_deliveryaddress: deliveryAddress,
          payment_method: paymentMethod,
          payment_type: paymentMode,
          order_status: "pending",
         delivery_type: formData.deliveryType === "store" ? "store_pickup" : "home",
         pickup_store: formData.deliveryType === "store" ? formData.selectedStore : undefined,
         pickup_type: formData.deliveryType === "store" ? formData.selectedStore : undefined,
         payment_id: paymentData._id,
          payment_status: paymentData.status,
          order_number: "ORD" + Date.now(),
          order_details: cartItems.map((item) => ({
            item_code: `ITEM${item.item_code}`,
            product_id: item.id,
            product_name: item.name,
            product_price: item.price,
            model: "N/A",
            user_id: userId,
            coupondiscount: 0,
            created_at: new Date(),
            updated_at: new Date(),
            quantity: item.quantity,
            // quantity: 1,
            //store_id: formData.deliveryType === "store" ? formData.selectedStore : "STORE01",
            orderNumber: "ORD" + Date.now(),
          })),
        }),
      });
      
      if (!orderRes.ok) {
        throw new Error('Order creation failed');
      }


      // if(orderRes.ok){
        // const responsedata = await orderRes.json();
        // const order_id = responsedata.order._id.toString();
        // const orderhistory1 = await fetch('/api/orderhistory',{
        //   method:'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({orderId : order_id})
        // });

        // if(formData.deliveryType == 'store'){
        //  const storeorderid = await fetch('/api/sender_orderid',{
        //   method:'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({orderId : order_id})
        //  });

        //  if(storeorderid.ok){
        //     const storeresponsedata = await storeorderid.json();
        //   const storeorderid_status = storeresponsedata.status;
        //     const orderhistory = await fetch('/api/orderhistory',{
        //       method:'PUT',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({orderId : order_id,status:storeorderid_status})
        //     });
        //  }

        // }
      // }

      // Clear cart after successful order
      const cartdelte = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clearAll: true })
      });


      if (cartdelte.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (cartdelte.status === 200) {
        localStorage.removeItem('checkoutData');
        localStorage.removeItem('appliedCoupon')
        const orderData = await orderRes.json()
        // Prepare email data
        // console.log(orderData,orderData.order.order_number);
        // const emailData = {
        //   orderDetails: {
        //     order_number: orderData.order.order_number || "ORD" + Date.now(),
        //     order_amount: totalAmount,
        //     payment_method: paymentMethod === 'Cash on Delivery' ? 'Cash on Delivery' : 'Online Payment',
        //     order_item: cartItems,
        //     order_username: `${addressData.firstName} ${addressData.lastName}`,
        //     order_phonenumber: addressData.phonenumber,
        //     order_deliveryaddress: deliveryAddress
        //   },
        //   customerEmail: addressData.email,
        //   adminEmail: 'msivaranjani2036@gmail.com'
        // };
 
       // console.log(cartItems);
 
        const proresponse = await fetch(`/api/product/get/${cartItems[0].productId}`);
       
        if (!proresponse.ok) {
          throw new Error(`HTTP error! status: ${proresponse.status}`);
        }
       
        const productData = await proresponse.json();
 
        const authResponse = await fetch('/api/auth/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        });
        const authData = await authResponse.json();
        //console.log(cartItems);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        trackCheckout({
          user: {
            name: authData.user.name,
            phone: authData.phone,
            email: authData.user.email,
          },
          product: {
            id: cartItems[0].productId,
            name: productData.data.name,
            price: cartItems[0].price,
            link: `${apiUrl}/product/${productData.data.slug}`,
            image: `${apiUrl}/uploads/products/`+cartItems[0].image,
            qty: cartItems[0].quantity,
            currency: "INR",
          },
        });
       
       const trackCheckout = ({ user, product }) => {
  if (typeof window !== "undefined" && window._em_event) {
    window._em_event.track({
      event: "btnClick",
      action: "checkOut",
      user_info: {
        user_name: user?.name,
        phone: user?.mobile,
        email: user?.email,
      },
      product_info: {
        product_id: product?.id,
        product_name: product?.name,
        price: product?.price,
        image: product?.image,
        qty: product?.qty,
        currency: product?.currency || "INR",
      },
    });
  }
};
        // Send confirmation emails
        // const emailResponse = await fetch('/api/send-order-email', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(emailData)
        // });
 
        // if (!emailResponse.ok) {
        //   const errorData = await emailResponse.json();
        //   console.error('Email sending failed:', errorData.error);
        // }
     
          const name = addressData.firstName + ' ' + addressData.lastName;
       const itemsHtml = orderData.order.order_item.map(item => {
          return `<li>${item.name} - ₹${item.price.toFixed(2)} x ${item.quantity}</li>`;
        }).join('');
        const itemHtml = `<ul style="padding-left: 20px; color: #555555;">${itemsHtml}</ul>`;
        const order_amount = `₹${Number(orderData.order.order_amount).toFixed(2)}`;
        // FIXED: Renamed this variable as well to avoid conflict
        const emailFormData = new FormData();
        emailFormData.append("campaign_id", "0800f221-7805-4b76-988c-bbecd66e7500");
        emailFormData.append("email", addressData.email);
        emailFormData.append(
          "params",
          JSON.stringify([name,orderData.order.order_number,order_amount,orderData.order.payment_method, itemHtml])
        );
       
        const response = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };
 
        const data = await response.json();
 
        
      const adminItemsHtml = orderData.order.order_item.map(item => {
       return `<li>${item.name} - ₹${item.price.toFixed(2)} x ${item.quantity}</li>`;
        }).join('');

      const adminItemsTableHtml = `<ul style="padding-left: 20px; color: #555555;">${adminItemsHtml}</ul>`;

        const adminemailFormData = new FormData();
        adminemailFormData.append("campaign_id", "dd7b5f8d-5bf1-45a5-9116-fcb40f69ede6");
        adminemailFormData.append(
          "params",
          JSON.stringify([name,addressData.email,addressData.phonenumber,deliveryAddress, adminItemsTableHtml])
        );

        const emailadmin = ["arunkarthik@sathya.store","ecom@sathya.store","itadmin@sathya.store","telemarketing@sathya.store","sekarcorp@sathya.store","siva96852@gmail.com","customercare@sathya.store"];
        
        emailadmin.forEach(async (adminEmail) => {
          adminemailFormData.set("email", adminEmail);
        let adminresponse = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };

        let adminData = await adminresponse.json();
        });


        toast.success("Order placed successfully!");
        router.push('/orders');
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Failed to place order. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {/* Checkout Header Bar */}
      <div className="bg-red-50 py-6 px-8 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 " style={{marginLeft: "64px"}}>Checkout</h2>
        <div className="flex items-center space-x-2" style={{marginRight: "100px"}}>
          <span className="text-gray-600">🏠 Home</span>
          <span className="text-gray-500">›</span>
          <span className="text-orange-500 font-semibold">Checkout</span>
        </div>
      </div>

      {/* <div className="max-w-9xl mx-auto rounded-lg p-8 pt-0  container"> */}
        <div className="w-full  rounded-lg  pt-0">

        <div className="flex flex-col lg:flex-row " style={{marginLeft: "100px"}}>
          {/* Left - Checkout Form */}
         <div className="w-full lg:w-2/4 bg-white p-0 pt-6">
    
    {/* {useraddress && useraddress.length > 0 && (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Saved Addresses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useraddress.map((item, index) => (
            <div 
              key={`address-${index}`} 
              className={`border p-4 rounded-lg cursor-pointer transition-all ${selectedAddress === index ? 'border-orange-500 bg-orange-50' : 'hover:border-gray-300'}`}
              onClick={() => setSelectedAddress(index)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{item.firstName} {item.lastName}</p>
                  <p className="text-sm text-gray-600">{item.address}</p>
                  <p className="text-sm text-gray-600">{item.city}, {item.state}, {item.postCode}</p>
                  <p className="text-sm text-gray-600">{item.country}</p>
                  <p className="text-sm text-gray-600">Phone: {item.phonenumber}</p>
                </div>
                {selectedAddress === index && (
                  <span className="text-orange-500">✓ Selected</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button 
            onClick={() => setUseSavedAddress(!useSavedAddress)}
            className="text-orange-500 hover:text-orange-700 text-sm font-medium"
          >
            {useSavedAddress ? 'Use new address instead' : 'Use saved address'}
          </button>
        </div>
      </div>
    )} */}

    {error && <p className="text-red-500 text-bold-sm mb-4">{error}</p>}

    {useSavedAddress && selectedAddress !== null ? (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <p><span className="font-medium">Name:</span> {useraddress[selectedAddress].firstName} {useraddress[selectedAddress].lastName}</p>
          <p><span className="font-medium">Phone:</span> {useraddress[selectedAddress].phonenumber}</p>
          <p><span className="font-medium">Address:</span> {useraddress[selectedAddress].address}</p>
          <p><span className="font-medium">City:</span> {useraddress[selectedAddress].city}</p>
          <p><span className="font-medium">State:</span> {useraddress[selectedAddress].state}</p>
          <p><span className="font-medium">Country:</span> {useraddress[selectedAddress].country}</p>
          <p><span className="font-medium">Postal Code:</span> {useraddress[selectedAddress].postCode}</p>
        </div>
      </div>
    ) : (
      
      <form onSubmit={handleSubmit} className="mr-2">
  {/* Contact Section */}
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-black mb-3">
      Contact
    </h2>
   <div className="grid grid-cols-2 gap-4 mt-3">
      <div className="relative mt-3">
  <input
    type="text"
    name="phonenumber"
    value={formData.phonenumber}
    onChange={handleChange}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.phonenumber 
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
    Phone Number
  </span>
</div>
    <div className="relative mt-3 ">
  <input
    type="email"
    onChange={handleChange}
    name="email"
    value={formData.email }
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.email 
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
    Email Address
  </span>
</div>
    </div>
  </div>

  {/* Delivery Section */}
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-black mb-3">
      Delivery
    </h2>
    <div className="relative mt-6">
  <input
    type="text"
    onChange={handleChange}
    name="country"
    value={formData.country}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.country
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
    Country
  </span>
</div>

    <div className="grid grid-cols-2 gap-4 mt-3">
      <div className="relative mt-3">
  <input
    type="text"
    onChange={handleChange}
    name="firstName"
    value={formData.firstName}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.firstName
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
    First Name
  </span>
</div>
     <div className="relative mt-3">
  <input
    type="text"
    onChange={handleChange}
    name="lastName"
    value={formData.lastName}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.lastName
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
    Last Name
  </span>
</div>
    </div>

    <div className="relative mt-6">
  <input
    type="text"
    onChange={handleChange}
    name="businessName"
    value={formData.businessName}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.businessName
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
    Company Name (Optional)
  </span>
</div>
    
   <div className="relative mt-6 w-full">
  <input
    type="text"
    onChange={handleChange}
    name="address"
    value={formData.address}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span
    className={`absolute left-2 transition-all duration-200 pointer-events-none ${
      formData.address
        ? 'top-1 text-xs text-gray-500'
        : 'top-3 text-gray-400'
    }`}
  >House number and street name
  </span>
</div>

   
   <div className="relative mt-6">
  <input
    type="text"
    onChange={handleChange}
    name="landmark"
    value={formData.landmark}
    className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
    required
  />
  <span className={`absolute left-2 transition-all duration-200 ${
    formData.landmark
      ? 'top-1 text-xs text-gray-500' 
      : 'top-3 text-gray-400'
  }`}>
   Landmark, suite, unit, etc. (Optional)
  </span>
</div>

    <div className="grid grid-cols-2 gap-4 mt-3">
     <div className="relative mt-3 w-full">
      <select
        name="state"
        value={formData.state}
        onChange={handleChange}
        className="border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1 px-2"
        required
      >
        <option value="">--Select State--</option>
        <option value="Tamilnadu">Tamilnadu</option>
      </select>
        <span
          className={`absolute left-2 transition-all duration-200 pointer-events-none ${
            formData.state
              ? 'top-1 text-xs text-gray-500'
              : 'top-3 text-gray-400'
          }`}
        >
          State
        </span>
      </div>


     <div className="relative mt-3 w-full">
      <select
        name="city"
        value={formData.city}
        onChange={handleChange}
        className="border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1 px-2"
        required
      >
        <option value="" disabled hidden></option> {/* empty default */}
        {finalCities.map((city, index) => (
          <option key={index} value={city}>
            {city}
          </option>
        ))}
      </select> 
      <span
        className={`absolute left-2 transition-all duration-200 pointer-events-none ${
          formData.city
            ? 'top-1 text-xs text-gray-500'
            : 'top-3 text-gray-400'
        }`}
      >
        City
      </span>
    </div>

    </div>

   <div className="relative mt-6">
    <input
      type="text"
      name="postCode"
      value={formData.postCode}
      onChange={handleChange}
      className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200 pt-5 pb-1"
      required
    />
    <span className={`absolute left-2 transition-all duration-200 ${
      formData.postCode
        ? 'top-1 text-xs text-gray-500' 
        : 'top-3 text-gray-400'
    }`}>
      Post Code
    </span>
  </div>

    <h2 className="text-xl font-semibold text-black mb-2 mt-6">
      Shipping Method
    </h2>

    <DeliveryOptions
      formData={formData}
      handleChange={handleChange}
      isDeliverySaved={isDeliverySaved}
      setIsDeliverySaved={setIsDeliverySaved}
      stores={stores}
    />
  </div>

   <h2 className="text-xl font-semibold text-black mb-2 mt-6">
      Billing Address
    </h2>
     {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {useSavedAddress && selectedAddress !== null ? 'Selected Address' : 'Billing Details'}
            </h2> */}
            {useraddress && useraddress.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-4">Saved Addresses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {useraddress.map((item, index) => (
                    <div 
                      key={`address-${index}`} 
                      className={`border p-4 rounded-lg cursor-pointer transition-all ${selectedAddress === index ? 'border-orange-500 bg-orange-50' : 'hover:border-gray-300'}`}
                      onClick={() => setSelectedAddress(index)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.firstName} {item.lastName}</p>
                          <p className="text-sm text-gray-600">{item.address}</p>
                          <p className="text-sm text-gray-600">{item.city}, {item.state}, {item.postCode}</p>
                          <p className="text-sm text-gray-600">{item.country}</p>
                          <p className="text-sm text-gray-600">Phone: {item.phonenumber}</p>
                        </div>
                        {selectedAddress === index && (
                          <span className="text-orange-500">✓ Selected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => setUseSavedAddress(!useSavedAddress)}
                    className="text-orange-500 hover:text-orange-700 text-sm font-medium"
                  >
                    {useSavedAddress ? 'Use new address instead' : 'Use saved address'}
                  </button>
                </div>
              </div>
            )}

  {/* Additional Info Section */}
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-700 mb-2">
      Additional Information
    </h3>
    <textarea
      name="additionalInfo"
      placeholder="Notes about your order"
      value={formData.additionalInfo}
      onChange={handleChange}
      className="border p-2 rounded-md w-full h-20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-200"
    ></textarea>
  </div>
</form>

    )}
  </div>

          {/* Right - Order Summary */}
          <div className="w-full lg:w-2/4 p-6 sticky top-6 self-start" style={{backgroundColor: "#F7F4F2", height: "100vh"}}>
            <div className="mt-1" style={{marginRight: "100px"}}>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Orders</h3>

              {/* <div className="border-b pb-3 mb-3">
                {cartItems.map((item) => (
                  <div key={`order-item-${item.productId}`} className="flex justify-between text-gray-600 mb-2">
                    <div>
                      <span>{item.name}</span>
                      <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div> */}


              <div className="relative border-b pb-3 mb-3">
                {/* Scrollable List */}
                <div
                  className="max-h-64 overflow-y-auto pr-2 scroll-smooth"
                >
                  {cartItems.map((item) => (
                    <div
                      key={`order-item-${item.productId}`}
                      className="flex items-start justify-between gap-3 text-gray-700 mb-4"
                    >

                      {/* Product Image */}
                      <div className="relative w-16 h-16 flex-shrink-0 border rounded overflow-hidden p-2">
                        <img
                          src={`/uploads/products/${item.image || item.images?.[0]}`}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />

                        {/* Quantity Badge */}
                        <div className="absolute top-0 right-0 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {item.quantity}
                        </div>
                      </div>


                      {/* Product Details */}
                      <div className="flex-1">
                        <div title={item.name} className="leading-snug text-xs sm:text-sm font-medium text-[#d72828] hover:text-[#c02020] line-clamp-3 min-h-[40px]">
                          {item.name}
                        </div>

                        {/* <div className="text-xs mt-1 text-gray-600">
                          Qty: <span className="text-red-600">{item.quantity}</span>
                        </div> */}
                        
                      </div>

                      {/* Price */}
                      <div className="text-sm whitespace-nowrap text-base font-semibold text-red-600">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scroll for More Items Overlay */}

                {/* {cartItems.length > 2 && (
                  <div className="flex justify-center mt-2">
                    <div className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                      <span>Scroll for more items</span>
                      <span className="text-lg">↓</span>
                    </div>
                  </div>
                )} */}

              </div>



              {/* Add Discount row if there's any discount */}
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600 mb-2">
                  <span>Discount:</span>
                  <span>-₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {cartItems.some(item => item.warranty > 0) && (
                <div className="flex justify-between text-gray-800 font-semibold">
                  <span className="text-[#d72828] hover:text-[#c02020] text-xs sm:text-sm font-medium">Warranty:</span>
                  <span className="text-sm whitespace-nowrap text-base font-semibold text-red-600">
                    ₹{cartItems.reduce((sum, item) => sum + (item.warranty || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              {cartItems.some(item => item.extendedWarranty > 0) && (
                <div className="flex justify-between text-gray-800 font-semibold border-t pt-2 mt-2">
                  <span className="text-[#d72828] hover:text-[#c02020] text-xs sm:text-sm font-medium">Extended Warranty:</span>
                  <span className="text-sm whitespace-nowrap text-base font-semibold text-red-600">
                    ₹{cartItems.reduce((sum, item) => sum + (item.extendedWarranty || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}


              {/* Discount Row */}
              {orderSummary.discount > 0 && (
                <div className="flex justify-between text-green-600 mb-2">
                  <span>Discount:</span>
                  <span>-₹{orderSummary.discount.toFixed(2)}</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between text-gray-800 font-semibold border-t pt-2 mt-2">
                <span>Subtotal:</span>
                <span>₹{orderSummary.subtotal.toFixed(2)}</span>
              </div>

              {/* Total */}
              <div className="flex justify-between text-gray-800 font-semibold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>₹{orderSummary.total.toFixed(2)}</span>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Payment Method</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="online" 
                      checked={paymentMethod === "online"} 
                      onChange={handlePaymentChange} 
                      className="w-4 h-4 text-orange-500"
                    />
                    <span>Online Payment</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="payment" 
                      value="Cash on Delivery" 
                      checked={paymentMethod === "Cash on Delivery"} 
                      onChange={handlePaymentChange} 
                      className="w-4 h-4 text-orange-500"
                    />
                    <span>Cash on Delivery</span>
                  </label>
                </div>
              </div>
             <button 
  onClick={handleSubmit} 
  disabled={isSubmitting || loading || cartItems.length === 0 || !isDeliverySaved}
  className={`mt-6 w-1/2 md:w-1/3 text-white font-semibold py-2 rounded-lg transition ${
    isSubmitting || loading || cartItems.length === 0 || !isDeliverySaved
      ? 'bg-gray-400 cursor-not-allowed' 
      : 'bg-red-500 hover:bg-red-600'
  }`}
>
  {isSubmitting ? (
    <span className="flex items-center justify-center">
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      Processing...
    </span>
  ) : 'Place Order'}
</button>

              {/* <button 
                onClick={handleSubmit} 
                disabled={loading || cartItems.length === 0 || !isDeliverySaved}
                className={`mt-6 w-full text-white font-semibold py-3 rounded-lg transition ${
                  loading || cartItems.length === 0 || !isDeliverySaved
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            window.location.reload();
          }}
          error={authError}
        />
      )}
      
{isSubmitting && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900">Processing Your Order</h3>
      <p className="mt-2 text-sm text-gray-500">Please wait while we process your payment and order details.</p>
    </div>
  </div>
)}
    </div>
  );
}