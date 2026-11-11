"use client";

import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { Icon } from '@iconify/react';
import ReactPaginate from "react-paginate";
import Image from "next/image";

export default function OfferProductComponent() {
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newProduct, setNewProduct] = useState({
    productName: "",
    offerId: "",
    productSellingType: "Price",
    price: "",
    specialPrice: "",
    emiStartsFrom: "",
    categories: "",
    isCombo: "No",
    primaryImage: null,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  const fetchData = async () => {
    try {
      const [prodRes, offRes, catRes] = await Promise.all([
        fetch("/api/offer-module-product"),
        fetch("/api/offer-module"),
        fetch("/api/categories")
      ]);
      const prodData = await prodRes.json();
      const offData = await offRes.json();
      const catData = await catRes.json();
      
      setProducts(prodData.data || []);
      setOffers(offData.data || []);
      setCategoriesList(Array.isArray(catData) ? catData : []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "productSellingType") {
      setNewProduct((prev) => ({
        ...prev,
        productSellingType: value,
        price: value === "Price" ? prev.price : "",
        specialPrice: value === "Price" ? prev.specialPrice : "",
        emiStartsFrom: value === "EMI" ? prev.emiStartsFrom : "",
      }));
      return;
    }
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "productSellingType") {
      setEditingProduct((prev) => ({
        ...prev,
        productSellingType: value,
        price: value === "Price" ? prev.price : "",
        specialPrice: value === "Price" ? prev.specialPrice : "",
        emiStartsFrom: value === "EMI" ? prev.emiStartsFrom : "",
      }));
      return;
    }
    setEditingProduct({ ...editingProduct, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProduct((prev) => ({ ...prev, primaryImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditingProduct((prev) => ({ ...prev, primaryImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(newProduct).forEach(key => {
      if (newProduct[key] !== null && newProduct[key] !== undefined) {
        formData.append(key, newProduct[key]);
      }
    });

    try {
      const response = await fetch("/api/offer-module-product/add", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setIsModalOpen(false);
        fetchData();
        setNewProduct({
          productName: "",
          offerId: "",
          productSellingType: "Price",
          price: "",
          specialPrice: "",
          emiStartsFrom: "",
          categories: "",
          isCombo: "No",
          primaryImage: null,
        });
        setImagePreview(null);
        setSuccessMessage("Offer Product Added Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to add product");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      offerId: product.offerId?._id || product.offerId,
      existingImage: product.primaryImage,
      emiStartsFrom: product.emiStartsFrom ?? "",
    });
    setEditImagePreview(
      product.primaryImage ? `/uploads/OfferProducts/${product.primaryImage}?t=${Date.now()}` : null
    );
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("id", editingProduct._id);
    Object.keys(editingProduct).forEach(key => {
      if (key !== "_id" && key !== "createdAt" && key !== "updatedAt" && editingProduct[key] !== null) {
        formData.append(key, editingProduct[key]);
      }
    });

    try {
      const response = await fetch("/api/offer-module-product/update", {
        method: "PUT",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchData();
        setEditingProduct(null);
        setEditImagePreview(null);
        setSuccessMessage("Offer Product Updated Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to update product");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteClick = (productId) => {
    setProductToDelete(productId);
    setShowConfirmationModal(true);
  };

  const handleDeleteProduct = async () => {
    try {
      const response = await fetch("/api/offer-module-product/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productToDelete }),
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage("Offer Product Deleted Successfully");
        setShowSuccessModal(true);
        fetchData();
      } else {
        alert(result.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setShowConfirmationModal(false);
      setProductToDelete(null);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.offerId?.offerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.ceil(filteredProducts.length / itemsPerPage);
  const totalEntries = filteredProducts.length;
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const renderProductRows = () => {
    return filteredProducts
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
      .map((product, index) => (
        <tr key={product._id} className="text-center border-b hover:bg-gray-50">
          <td className="p-2 text-left pl-4">{totalEntries - (currentPage * itemsPerPage + index)}</td>
          <td className="p-2">
            {product.primaryImage ? (
              <Image
                src={`/uploads/OfferProducts/${product.primaryImage}`}
                alt="product"
                width={50}
                height={50}
                className="w-12 h-12 object-contain mx-auto"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mx-auto text-xs text-gray-400">No Img</div>
            )}
          </td>
          <td className="p-2 text-left">{product.productName}</td>
          <td className="p-2">{product.offerId?.offerName || "-"}</td>
          <td className="p-2">{product.price || "-"}</td>
          <td className="p-2">{product.specialPrice || "-"}</td>
          <td className="p-2">
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => handleEditProduct(product)}
                className="px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                title="Edit"
              >
                <FaEdit className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDeleteClick(product._id)}
                className="px-2 py-1 border rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                title="Delete"
              >
                <Icon icon="mingcute:delete-2-line" />
              </button>
            </div>
          </td>
        </tr>
      ));
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-3xl font-light text-gray-700">Offer Products</h2>
      </div>

      {isLoading ? (
        <p>Loading Offer Products...</p>
      ) : (
        <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto border-gray-200">
          {/* Search and Add Row */}
          <div className="flex justify-between items-center mb-5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border px-3 py-1.5 rounded w-64 focus:outline-none focus:border-blue-400"
              />
              <span className="absolute right-2 top-2 text-gray-400">
                <Icon icon="ic:baseline-search" />
              </span>
            </div>
            <div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="border px-3 py-1.5 rounded bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <Icon icon="ic:baseline-add" /> New Offer Product
              </button>
            </div>
          </div>
          
          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-2 text-left pl-4 font-semibold w-16">ID</th>
                <th className="p-2 font-semibold w-24">Image</th>
                <th className="p-2 text-left font-semibold">Product Name</th>
                <th className="p-2 font-semibold">Offer</th>
                <th className="p-2 font-semibold w-24">Price</th>
                <th className="p-2 font-semibold w-24">Spl. Price</th>
                <th className="p-2 font-semibold w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                renderProductRows()
              ) : (
                <tr>
                  <td colSpan="7" className="text-center p-4">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Showing {totalEntries > 0 ? startEntry : 0} to {endEntry} of {totalEntries} entries
            </div>
            <ReactPaginate
              previousLabel={"«"}
              nextLabel={"»"}
              breakLabel={"..."}
              pageCount={pageCount}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handlePageClick}
              containerClassName={"flex items-center space-x-1"}
              activeClassName={"bg-blue-500 text-white border-blue-500"}
              pageClassName={"page-item"}
              pageLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
              previousClassName={"page-item"}
              previousLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
              nextClassName={"page-item"}
              nextLinkClassName={"px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-100"}
            />
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white shadow-lg w-full max-w-3xl mx-4 my-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-light text-gray-800">Add Offer Product</h2>
            </div>
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Product Name</label>
                  <input
                    name="productName"
                    value={newProduct.productName}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Offers</label>
                  <select
                    name="offerId"
                    value={newProduct.offerId}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  >
                    <option value="">Select Offer</option>
                    {offers.map((offer) => (
                      <option key={offer._id} value={offer._id}>{offer.offerName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Primary Image</label>
                  <div className="w-3/4">
                    <input
                      type="file"
                      onChange={handleImageChange}
                      accept="image/*"
                      className="border rounded p-1 w-full text-sm text-gray-600"
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        <Image src={imagePreview} alt="Preview" width={100} height={100} className="object-contain border" unoptimized />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Product Selling Type</label>
                  <select
                    name="productSellingType"
                    value={newProduct.productSellingType}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Price">Price</option>
                    <option value="EMI">EMI</option>
                    <option value="GIFT">GIFT</option>
                  </select>
                </div>
                {newProduct.productSellingType === "Price" && (
                  <>
                    <div className="flex items-center">
                      <label className="w-1/4 text-sm font-semibold text-gray-700">Price</label>
                      <input
                        type="number"
                        step="any"
                        name="price"
                        value={newProduct.price}
                        onChange={handleInputChange}
                        className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="w-1/4 text-sm font-semibold text-gray-700">Special Price</label>
                      <input
                        type="number"
                        step="any"
                        name="specialPrice"
                        value={newProduct.specialPrice}
                        onChange={handleInputChange}
                        className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </>
                )}
                {newProduct.productSellingType === "EMI" && (
                  <div className="flex items-center">
                    <label className="w-1/4 text-sm font-semibold text-gray-700">EMI Starts From</label>
                    <input
                      type="number"
                      step="any"
                      name="emiStartsFrom"
                      value={newProduct.emiStartsFrom}
                      onChange={handleInputChange}
                      className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Categories</label>
                  <select
                    name="categories"
                    value={newProduct.categories}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map((cat) => (
                      <option key={cat._id} value={cat.category_name}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Is Combo?</label>
                  <select
                    name="isCombo"
                    value={newProduct.isCombo}
                    onChange={handleInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <Icon icon="mingcute:check-line" /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white shadow-lg w-full max-w-3xl mx-4 my-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-light text-gray-800">Edit Offer Product</h2>
            </div>
            <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => handleDeleteClick(editingProduct._id)}
                  className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 flex items-center gap-1 text-sm"
                >
                  <Icon icon="mingcute:delete-2-line" /> Delete
                </button>
              </div>
              <form onSubmit={handleUpdateProduct} className="space-y-4">
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Product Name</label>
                  <input
                    name="productName"
                    value={editingProduct.productName}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Offers</label>
                  <select
                    name="offerId"
                    value={editingProduct.offerId}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    required
                  >
                    <option value="">Select Offer</option>
                    {offers.map((offer) => (
                      <option key={offer._id} value={offer._id}>{offer.offerName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Primary Image</label>
                  <div className="w-3/4">
                    <input
                      type="file"
                      onChange={handleEditImageChange}
                      accept="image/*"
                      className="border rounded p-1 w-full text-sm text-gray-600"
                    />
                    {editImagePreview && (
                      <div className="mt-2">
                        <Image src={editImagePreview} alt="Preview" width={100} height={100} className="object-contain border" unoptimized />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Product Selling Type</label>
                  <select
                    name="productSellingType"
                    value={editingProduct.productSellingType || "Price"}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Price">Price</option>
                    <option value="EMI">EMI</option>
                    <option value="GIFT">GIFT</option>
                  </select>
                </div>
                {(editingProduct.productSellingType || "Price") === "Price" && (
                  <>
                    <div className="flex items-center">
                      <label className="w-1/4 text-sm font-semibold text-gray-700">Price</label>
                      <input
                        type="number"
                        step="any"
                        name="price"
                        value={editingProduct.price || ""}
                        onChange={handleEditInputChange}
                        className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="w-1/4 text-sm font-semibold text-gray-700">Special Price</label>
                      <input
                        type="number"
                        step="any"
                        name="specialPrice"
                        value={editingProduct.specialPrice || ""}
                        onChange={handleEditInputChange}
                        className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </>
                )}
                {editingProduct.productSellingType === "EMI" && (
                  <div className="flex items-center">
                    <label className="w-1/4 text-sm font-semibold text-gray-700">EMI Starts From</label>
                    <input
                      type="number"
                      step="any"
                      name="emiStartsFrom"
                      value={editingProduct.emiStartsFrom || ""}
                      onChange={handleEditInputChange}
                      className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                )}
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Categories</label>
                  <select
                    name="categories"
                    value={editingProduct.categories || ""}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map((cat) => (
                      <option key={cat._id} value={cat.category_name}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-1/4 text-sm font-semibold text-gray-700">Is Combo?</label>
                  <select
                    name="isCombo"
                    value={editingProduct.isCombo}
                    onChange={handleEditInputChange}
                    className="w-3/4 border rounded p-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="border px-4 py-2 rounded text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <Icon icon="mingcute:check-line" /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this product?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <Icon icon="mdi:check" className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
