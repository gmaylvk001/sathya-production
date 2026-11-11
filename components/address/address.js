"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiChevronRight } from 'react-icons/fi';
import { RiAccountCircleFill } from "react-icons/ri";
import { FaAddressBook } from "react-icons/fa";
import { HiShoppingBag } from "react-icons/hi2";
import { FaHeart } from "react-icons/fa6";
import { FiEdit2, FiTrash2, FiMapPin, FiHome, FiBriefcase, FiUser, FiPhone } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import { useHeaderdetails } from '@/context/HeaderContext';
import useDetectLocation from '@/hooks/useDetectLocation';
import 'react-toastify/dist/ReactToastify.css';

export default function Address() {
  const pathname = usePathname();
  const { userData } = useHeaderdetails();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editId, setEditId] = useState(null);
  const { isDetecting, detectLocation } = useDetectLocation();

  const handleDetectAddressLocation = async () => {
    const res = await detectLocation({
      onSuccess: (loc) => {
        setAddressData((prev) => ({
          ...prev,
          pincode: loc.pincode || prev.pincode,
          locality: loc.locality || prev.locality,
          city: loc.city ? (loc.city.charAt(0).toUpperCase() + loc.city.slice(1)) : prev.city,
          state: loc.state || prev.state,
        }));
        toast.success(`Location detected: ${loc.city || loc.pincode}`);
      },
      onError: (errMsg) => {
        toast.info(errMsg || 'Unable to retrieve location. Please type your pincode manually.');
      },
    });
  };

  const [addressData, setAddressData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    alternate_phone: '',
    pincode: '',
    locality: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'Tamilnadu',
    landmark: '',
    is_default_shipping: false,
    is_default_billing: false
  });

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/saved-address', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses);
      }
    } catch (error) {
      console.error("Error fetching addresses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [userData]);

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddAddress = () => {
    setIsAddingAddress(true);
    setIsEditingAddress(false);
    setEditId(null);
    setAddressData({
      firstName: '', lastName: '', phone: '', alternate_phone: '',
      pincode: '', locality: '', address_line1: '', address_line2: '',
      city: '', state: 'Tamilnadu', landmark: '',
      is_default_shipping: addresses.length === 0,
      is_default_billing: addresses.length === 0
    });
  };

  const handleEditAddress = (addr) => {
    setIsEditingAddress(true);
    setIsAddingAddress(false);
    setEditId(addr._id);

    // Split username
    const parts = addr.username?.split(' ') || [];
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const cleanVal = (val) => val === 'NULL' ? '' : (val || '');

    setAddressData({
      firstName,
      lastName,
      phone: cleanVal(addr.phonenumber),
      alternate_phone: cleanVal(addr.altnumber),
      pincode: cleanVal(addr.pincode),
      locality: cleanVal(addr.locality),
      address_line1: cleanVal(addr.address1),
      address_line2: cleanVal(addr.address2),
      city: cleanVal(addr.city),
      state: cleanVal(addr.state) || 'Tamilnadu',
      landmark: cleanVal(addr.landmark),
      is_default_shipping: addr.is_default_shipping,
      is_default_billing: addr.is_default_billing
    });
  };

  const handleCancel = () => {
    setIsEditingAddress(false);
    setIsAddingAddress(false);
    setEditId(null);
  };

  const handleAddressSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!addressData.firstName || !addressData.phone || !addressData.address_line1 || !addressData.pincode || !addressData.city || !addressData.state) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      ...addressData,
      full_name: `${addressData.firstName} ${addressData.lastName}`.trim()
    };

    try {
      const url = editId ? `/api/saved-address/${editId}` : '/api/saved-address';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsEditingAddress(false);
        setIsAddingAddress(false);
        setEditId(null);
        fetchAddresses();
      } else {
        toast.error(data.message || 'Failed to save address');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/saved-address/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Address deleted successfully');
        fetchAddresses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const setAsDefault = async (id, type) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const addr = addresses.find(a => a._id === id);
    if (!addr) return;

    try {
      const res = await fetch(`/api/saved-address/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...addr,
          is_default_shipping: type === 'shipping' ? true : addr.is_default_shipping,
          is_default_billing: type === 'billing' ? true : addr.is_default_billing
        })
      });
      if (res.ok) fetchAddresses();
    } catch (error) {
      toast.error('Failed to set default');
    }
  };

  const isActive = (path) => pathname === path;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header with Breadcrumb */}
      <div className="bg-red-50 py-6 px-8 flex justify-between items-center border-b border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">My Addresses</h2>
        <div className="flex items-center space-x-2 text-sm">
          <Link href="/" className="text-gray-600 hover:text-brandRed">🏠 Home</Link>
          <FiChevronRight className="text-gray-400" />
          <Link href="/profile" className="text-gray-600 hover:text-brandRed">My Account</Link>
          <FiChevronRight className="text-gray-400" />
          <span className="text-brandRed font-semibold">Addresses</span>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar Navigation */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-red-500 transition-all duration-300 shadow-sm">
              <h3 className="text-lg font-semibold text-brandRed mb-6 pb-2 border-b border-gray-100">My Account</h3>
              <nav className="space-y-2">
                <Link href="/profile" className={`w-full flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg transition-all duration-200 ${isActive('/profile') ? 'text-brandRed bg-red-50 pl-6' : 'text-gray-600 hover:text-brandRed hover:bg-red-50 hover:pl-6'}`}>
                  <RiAccountCircleFill className="text-brandRed text-xl" />
                  <span>Profile</span>
                </Link>
                <Link href="/address" className={`w-full flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg transition-all duration-200 ${isActive('/address') ? 'text-brandRed bg-red-50 pl-6' : 'text-gray-600 hover:text-brandRed hover:bg-red-50 hover:pl-6'}`}>
                  <FaAddressBook className="text-brandRed text-xl" />
                  <span>Addresses</span>
                </Link>
                <Link href="/orders" className={`w-full flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg transition-all duration-200 ${isActive('/orders') ? 'text-brandRed bg-red-50 pl-6' : 'text-gray-600 hover:text-brandRed hover:bg-red-50 hover:pl-6'}`}>
                  <HiShoppingBag className="text-brandRed text-xl" />
                  <span>Orders</span>
                </Link>
                <Link href="/wishlist" className={`w-full flex items-center gap-2 px-5 py-3 text-base font-medium rounded-lg transition-all duration-200 ${isActive('/wishlist') ? 'text-brandRed bg-red-50 pl-6' : 'text-gray-600 hover:text-brandRed hover:bg-red-50 hover:pl-6'}`}>
                  <FaHeart className="text-brandRed text-xl" />
                  <span>Wishlist</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 transition-all duration-300">
            {(isEditingAddress || isAddingAddress) ? (
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                  <h2 className="text-xl font-bold text-gray-800">
                    {isEditingAddress ? 'Edit Address' : 'Add New Address'}
                  </h2>
                  <button onClick={handleCancel} className="text-gray-500 hover:text-red-600 font-medium text-sm transition-colors">
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleAddressSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input type="text" name="firstName" value={addressData.firstName} onChange={handleAddressChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Enter first name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input type="text" name="lastName" value={addressData.lastName} onChange={handleAddressChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Enter last name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input type="tel" name="phone" value={addressData.phone} onChange={handleAddressChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="10-digit mobile number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                      <input type="tel" name="alternate_phone" value={addressData.alternate_phone} onChange={handleAddressChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Alternate mobile number" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">Pincode *</label>
                        <button
                          type="button"
                          onClick={handleDetectAddressLocation}
                          disabled={isDetecting}
                          className="bg-red-50 hover:bg-red-100 text-[#d72828] border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                        >
                          {isDetecting ? (
                            <>
                              <span className="w-3 h-3 border-2 border-[#d72828] border-t-transparent rounded-full animate-spin" />
                              <span>Detecting...</span>
                            </>
                          ) : (
                            <>
                              <span>✦</span>
                              <span>Detect my location</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input type="text" name="pincode" value={addressData.pincode} onChange={handleAddressChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Pincode" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Locality</label>
                      <input type="text" name="locality" value={addressData.locality} onChange={handleAddressChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Locality" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address (House No, Building, Street, Area) *</label>
                      <textarea name="address_line1" value={addressData.address_line1} onChange={handleAddressChange} required rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors resize-none" placeholder="Enter your full address"></textarea>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City/District/Town *</label>
                      <input type="text" name="city" value={addressData.city} onChange={handleAddressChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                      <input type="text" name="state" value={addressData.state} onChange={handleAddressChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="State" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                      <input type="text" name="landmark" value={addressData.landmark} onChange={handleAddressChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="E.g. Near Apollo Hospital" />
                    </div>
                  </div>


                  <div className="pt-4 border-t space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="is_default_shipping" checked={addressData.is_default_shipping} onChange={handleAddressChange} className="rounded text-red-600 focus:ring-red-500 w-4 h-4" />
                      <span className="text-sm text-gray-700">Make this my default shipping address</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="is_default_billing" checked={addressData.is_default_billing} onChange={handleAddressChange} className="rounded text-red-600 focus:ring-red-500 w-4 h-4" />
                      <span className="text-sm text-gray-700">Make this my default billing address</span>
                    </label>
                  </div>

                  <div className="flex gap-4 pt-6 border-t">
                    <button type="submit" className="px-8 py-2.5 bg-brandRed text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                      {isEditingAddress ? 'Update Address' : 'Save Address'}
                    </button>
                    <button type="button" onClick={handleCancel} className="px-8 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-gray-800">My Addresses</h2>
                  <button onClick={handleAddAddress} className="flex items-center gap-2 px-4 py-2 bg-brandRed text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                    <span>+</span> Add New Address
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brandRed"></div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FiMapPin className="text-3xl text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Address Found</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm">You haven't saved any addresses yet. Add a new address to make checkout faster.</p>
                    <button onClick={handleAddAddress} className="px-6 py-2.5 bg-white border-2 border-brandRed text-brandRed font-medium rounded-lg hover:bg-red-50 transition-colors">
                      Add New Address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((addr) => {
                      const cleanVal = (val) => (!val || String(val).toUpperCase() === 'NULL') ? '' : val;
                      const typeVal = cleanVal(addr.type);
                      return (
                      <div key={addr._id} className="border border-gray-200 rounded-xl p-5 hover:border-red-300 hover:shadow-md transition-all relative bg-white group">

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {typeVal && (
                              <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wide flex items-center gap-1">
                                {typeVal.toLowerCase() === 'home' && <FiHome className="text-[10px]" />}
                                {typeVal.toLowerCase() === 'office' && <FiBriefcase className="text-[10px]" />}
                                {typeVal}
                              </span>
                            )}
                            {addr.is_default_shipping && <span className="bg-red-50 text-red-600 text-xs font-semibold px-2 py-1 rounded-md">Default Shipping</span>}
                            {addr.is_default_billing && <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-1 rounded-md">Default Billing</span>}
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => handleEditAddress(addr)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                              <FiEdit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(addr._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-bold text-gray-800 text-base mb-1 flex items-center gap-2">
                          <FiUser className="text-gray-400" /> {cleanVal(addr.username)}
                        </h3>

                        <div className="text-sm text-gray-600 space-y-1 mb-4 pl-6">
                          <p className="flex items-start gap-2">
                            {cleanVal(addr.address1)} {cleanVal(addr.address2) ? `, ${cleanVal(addr.address2)}` : ''}
                            {cleanVal(addr.locality) ? `, ${cleanVal(addr.locality)}` : ''}
                          </p>
                          <p>{cleanVal(addr.city)}, {cleanVal(addr.state)} - <span className="font-semibold text-gray-800">{cleanVal(addr.pincode)}</span></p>
                          <p className="flex items-center gap-2 mt-2 font-medium text-gray-700">
                            <FiPhone className="text-gray-400" /> {cleanVal(addr.phonenumber)}
                            {cleanVal(addr.altnumber) && <span className="text-gray-400 text-xs">/ {cleanVal(addr.altnumber)}</span>}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!addr.is_default_shipping && (
                            <button onClick={() => setAsDefault(addr._id, 'shipping')} className="text-xs font-medium text-red-600 hover:underline">
                              Set as Default Shipping
                            </button>
                          )}
                          {!addr.is_default_shipping && !addr.is_default_billing && <span className="text-gray-300">|</span>}
                          {!addr.is_default_billing && (
                            <button onClick={() => setAsDefault(addr._id, 'billing')} className="text-xs font-medium text-blue-600 hover:underline">
                              Set as Default Billing
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}