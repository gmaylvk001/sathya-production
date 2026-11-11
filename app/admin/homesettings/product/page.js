"use client";
import { useEffect, useState } from "react";
import Select, { components } from "react-select";

// ✅ Custom option with checkbox
const Option = (props) => {
  return (
    <components.Option {...props}>
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => null}
        className="mr-2"
      />
      {props.label}
    </components.Option>
  );
};

// ✅ Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ Status Notification Modal Component
const StatusModal = ({ isOpen, message, type, onClose }) => {
  if (!isOpen) return null;

  // Set styles based on notification type
  const bgColor =
    type === "success"
      ? "bg-green-100 border-green-400"
      : "bg-red-100 border-red-400";
  const textColor = type === "success" ? "text-green-700" : "text-red-700";
  const icon = type === "success" ? "✅" : "❌";

  return (
    <div className="fixed top-4 right-4 z-50 animate-fadeIn">
      <div
        className={`${bgColor} ${textColor} border px-6 py-4 rounded-lg shadow-lg max-w-sm flex items-start`}
      >
        <span className="mr-2 text-xl">{icon}</span>
        <p className="flex-1">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default function AllCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState({});
  const [existingCategoryProducts, setExistingCategoryProducts] = useState({});
  const [mode, setMode] = useState({}); // 'add' or 'edit' mode for each subcategory
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    subcategoryId: null,
  });
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    message: "",
    type: "",
  });
  const [mainCategories, setMainCategories] = useState([]);
  const [subcategoriesByParent, setSubcategoriesByParent] = useState({});

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("none");
  const [newCategorySubParent, setNewCategorySubParent] = useState("none");
  const [newCategorySubSubParent, setNewCategorySubSubParent] =
    useState("none");
  const [addingCategory, setAddingCategory] = useState(false);
  const [deleteCategoryModal, setDeleteCategoryModal] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });
  const [deletingCategory, setDeletingCategory] = useState(false);

  // ✅ Show status modal
  const showStatusModal = (message, type = "success") => {
    setStatusModal({ isOpen: true, message, type });

    // Auto-close after 3 seconds
    setTimeout(() => {
      setStatusModal({ isOpen: false, message: "", type: "" });
    }, 3000);
  };

  // ✅ Close status modal manually
  const closeStatusModal = () => {
    setStatusModal({ isOpen: false, message: "", type: "" });
  };

  // ✅ Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories/get");
        const resJson = await res.json();
        const data = Array.isArray(resJson)
          ? resJson
          : Array.isArray(resJson?.data)
            ? resJson.data
            : Array.isArray(resJson?.categories)
              ? resJson.categories
              : [];
        setCategories(data);

        // Separate main categories and subcategories
        const mainCats = data.filter((cat) => cat.parentid === "none");
        setMainCategories(mainCats);

        // Create a map of parent categories to their direct children
        const subcategoriesMap = {};
        data.forEach((category) => {
          if (category.parentid !== "none") {
            const pid = category.parentid?.toString();
            if (!subcategoriesMap[pid]) {
              subcategoriesMap[pid] = [];
            }
            subcategoriesMap[pid].push(category);
          }
        });

        setSubcategoriesByParent(subcategoriesMap);
        console.log(
          "all data parentids:",
          data.map((c) => ({ name: c.category_name, parentid: c.parentid })),
        );
        console.log(
          "mainCats ids:",
          mainCats.map((c) => ({
            name: c.category_name,
            id: c._id,
            type: typeof c._id,
          })),
        );
        console.log("subcategoriesMap keys:", Object.keys(subcategoriesMap));
        console.log(
          "sample category parentid:",
          data[1]?.parentid,
          typeof data[1]?.parentid,
        );
      } catch (err) {
        console.error("Error fetching categories:", err);
        console.log("New category added:", newCat);
        console.log("Parent ID:", newCat.parentid);
        console.log(
          "subcategoriesByParent keys:",
          Object.keys(subcategoriesByParent),
        );
        showStatusModal("Error fetching categories", "error");
      }
    }
    fetchCategories();
  }, []);

  // ✅ Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/product/get");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
        showStatusModal("Error fetching products", "error");
      }
    }
    fetchProducts();
  }, []);

  // ✅ Fetch existing category products
  useEffect(() => {
    async function fetchCategoryProducts() {
      try {
        const res = await fetch("/api/categoryproduct/get");
        const data = await res.json();

        // Organize by subcategoryId
        const organizedData = {};
        data.forEach((item) => {
          organizedData[item.subcategoryId] = item;
          // Set mode to edit for existing entries
          setMode((prev) => ({ ...prev, [item.subcategoryId]: "edit" }));
        });

        setExistingCategoryProducts(organizedData);

        // Pre-fill form data for existing entries
        const initialFormData = {};
        const initialSelectedProducts = {};

        data.forEach((item) => {
          initialFormData[item.subcategoryId] = {
            borderColor: item.borderColor || "#000000",
            alignment: item.alignment || "left",
            status: item.status || "Active",
            position: item.position || 0,
            bannerImage: (item.bannerImage || []).map((url, i) => ({
              file: null,
              redirectUrl: (item.bannerRedirectUrl || [])[i] || "",
              existingUrl: url,
            })),
            categoryImage: null,
            categoryRedirectUrl: item.categoryRedirectUrl || "",
          };

          initialSelectedProducts[item.subcategoryId] = item.products.map(
            (p) => ({
              value: p,
              label: products.find((prod) => prod._id === p)?.name || p,
            }),
          );
        });

        setFormData(initialFormData);
        setSelectedProducts(initialSelectedProducts);
      } catch (err) {
        console.error("Error fetching category products:", err);
        showStatusModal("Error fetching category products", "error");
      }
    }

    if (products.length > 0) {
      fetchCategoryProducts();
    }
  }, [products]);

  // ✅ Handle product selection
  const handleProductSelect = (subcategoryId, selectedOptions) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [subcategoryId]: selectedOptions || [],
    }));
  };

  // 🔁 IMAGE CHANGE: Add new image row
  const handleAddImage = (subcategoryId, type) => {
    setFormData((prev) => ({
      ...prev,
      [subcategoryId]: {
        ...prev[subcategoryId],
        [type]: [
          ...(prev[subcategoryId]?.[type] || []),
          { file: null, redirectUrl: "" },
        ],
      },
    }));
  };

  // 🔁 IMAGE CHANGE: File / URL change
  const handleMultiImageChange = (subcategoryId, type, index, field, value) => {
    setFormData((prev) => {
      const images = [...(prev[subcategoryId]?.[type] || [])];
      images[index] = { ...images[index], [field]: value };

      return {
        ...prev,
        [subcategoryId]: {
          ...prev[subcategoryId],
          [type]: images,
        },
      };
    });
  };

  /* // 🔁 IMAGE CHANGE: Delete image (UI + DB)
const handleDeleteImage = async (subcategoryId, type, index, imageUrl) => {
  setFormData(prev => {
    const images = [...(prev[subcategoryId]?.[type] || [])];
    images.splice(index, 1);
    return {
      ...prev,
      [subcategoryId]: {
        ...prev[subcategoryId],
        [type]: images
      }
    };
  });
  

  // optional DB delete
  if (imageUrl) {
    await fetch("/api/categoryproduct/delete-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcategoryId, imageUrl })
    });
  }
}; */

  const handleDeleteImage = async (id, field, index, imageUrl) => {
    // 1️⃣ Remove from UI
    setFormData((prev) => {
      const updated = [...(prev[id]?.[field] || [])];
      updated.splice(index, 1);
      return {
        ...prev,
        [id]: {
          ...prev[id],
          [field]: updated,
        },
      };
    });

    // 2️⃣ Remove from DB
    await fetch("/api/categoryproduct", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subcategoryId: id, // ✅ FIXED
        imageUrl: imageUrl,
      }),
    });
  };

  // ✅ Handle input changes
  const handleInputChange = (subcategoryId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [subcategoryId]: {
        ...prev[subcategoryId],
        [field]: value,
      },
    }));
  };

  // ✅ Handle Save/Update for each subcategory
  // ✅ Handle Save/Update for each subcategory
  // ✅ Handle Save/Update for each subcategory
  const handleSave = async (subcategoryId) => {
    setLoading((prev) => ({ ...prev, [subcategoryId]: true }));

    try {
      const fd = new FormData();

      fd.append("subcategoryId", subcategoryId);

      // Add subcategory name - find the category from the categories list
      const subcategory = categories.find((cat) => cat._id === subcategoryId);
      console.log("asdkjaS", subcategory);
      if (subcategory) {
        fd.append("subcategoryName", subcategory.category_name);
      }

      fd.append(
        "products",
        JSON.stringify(
          selectedProducts[subcategoryId]?.map((p) => p.value) || [],
        ),
      );

      const data = formData[subcategoryId] || {};
      // Only append files if they exist and are actually File objects
      /* if (data.bannerImage instanceof File) {
      // Replace spaces with underscores (or remove them)
      const sanitizedBanner = new File(
        [data.bannerImage],
        data.bannerImage.name.replace(/\s+/g, "_"), // replace spaces with _
        { type: data.bannerImage.type }
      );
      fd.append("bannerImage", sanitizedBanner);
    }

    if (data.categoryImage instanceof File) {
      const sanitizedCategory = new File(
        [data.categoryImage],
        data.categoryImage.name.replace(/\s+/g, "_"), // replace spaces with _
        { type: data.categoryImage.type }
      );
      fd.append("categoryImage", sanitizedCategory);
    }
 */

      // MULTIPLE BANNER IMAGES
      // Split: keep existing URLs, upload new files
      const keepBannerUrls = [];
      const keepBannerRedirectUrls = [];
      let newBannerIdx = 0;

      data.bannerImage?.forEach((img) => {
        if (img.existingUrl && !img.file) {
          // Existing image — tell server to keep it
          keepBannerUrls.push(img.existingUrl);
          keepBannerRedirectUrls.push(img.redirectUrl || "");
        } else if (img.file instanceof File) {
          // New file — upload it
          const sanitizedBanner = new File(
            [img.file],
            img.file.name.replace(/\s+/g, "_"),
            { type: img.file.type },
          );
          fd.append(`bannerImage[${newBannerIdx}]`, sanitizedBanner);
          fd.append(
            `bannerRedirectUrl[${newBannerIdx}]`,
            img.redirectUrl || "",
          );
          newBannerIdx++;
        }
      });

      fd.append("keepBannerImages", JSON.stringify(keepBannerUrls));
      fd.append(
        "keepBannerRedirectUrls",
        JSON.stringify(keepBannerRedirectUrls),
      );

      // MULTIPLE CATEGORY IMAGES
      /* data.categoryImage?.forEach((img, index) => {
  if (img.file instanceof File) {
    const sanitizedCategory = new File(
      [img.file],
      img.file.name.replace(/\s+/g, "_"),
      { type: img.file.type }
    );

    fd.append(`categoryImage[${index}]`, sanitizedCategory);
    fd.append(`categoryRedirectUrl[${index}]`, img.redirectUrl || "");
  }
}); */

      if (data.categoryImage instanceof File) {
        const sanitizedCategory = new File(
          [data.categoryImage],
          data.categoryImage.name.replace(/\s+/g, "_"), // replace spaces with _
          { type: data.categoryImage.type },
        );
        fd.append("categoryImage", sanitizedCategory);
      }

      /* const images = Array.isArray(data.categoryImage)
  ? data.categoryImage
  : data.categoryImage
  ? [data.categoryImage]
  : [];

images.forEach((img, index) => {
  if (img.file instanceof File) {
    const sanitizedCategory = new File(
      [img.file],
      img.file.name.replace(/\s+/g, "_"),
      { type: img.file.type }
    );

    fd.append(`categoryImage[${index}]`, sanitizedCategory);
    fd.append(`categoryRedirectUrl[${index}]`, img.redirectUrl || "");
  }
}); */

      // OTHER FIELDS
      fd.append("borderColor", data.borderColor || "#000000");
      fd.append("alignment", data.alignment || "left");
      fd.append("status", data.status || "Active");
      fd.append("position", data.position || 0);

      fd.append("categoryRedirectUrl", data.categoryRedirectUrl || "");
      //console.log("FormData prepared:", Array.from(fd.entries()));
      // Determine if we're updating or creating
      const method = existingCategoryProducts[subcategoryId] ? "PUT" : "POST";

      const res = await fetch("/api/categoryproduct", {
        method,
        body: fd,
      });

      if (res.ok) {
        const result = await res.json();
        console.log("New category added:", result);
        showStatusModal(`Saved successfully `);

        // Update existing data
        if (method === "POST") {
          setExistingCategoryProducts((prev) => ({
            ...prev,
            [subcategoryId]: result.data,
          }));
          setMode((prev) => ({ ...prev, [subcategoryId]: "edit" }));
        } else {
          // Update existing record with new data
          setExistingCategoryProducts((prev) => ({
            ...prev,
            [subcategoryId]: {
              ...prev[subcategoryId],
              ...result.data,
            },
          }));
        }
      } else {
        showStatusModal("Error saving", "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      showStatusModal("Something went wrong", "error");
    } finally {
      setLoading((prev) => ({ ...prev, [subcategoryId]: false }));
    }
  };
  // ✅ Handle Delete (set status to Inactive)
  const handleDelete = async (subcategoryId) => {
    setLoading((prev) => ({ ...prev, [subcategoryId]: true }));

    try {
      const res = await fetch("/api/categoryproduct", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subcategoryId }),
      });

      if (res.ok) {
        showStatusModal(`Status changed to Inactive `);

        // Update local state
        setExistingCategoryProducts((prev) => {
          const updated = { ...prev };
          if (updated[subcategoryId]) {
            updated[subcategoryId].status = "Inactive";
          }
          return updated;
        });

        // Update form data status
        setFormData((prev) => ({
          ...prev,
          [subcategoryId]: {
            ...prev[subcategoryId],
            status: "Inactive",
          },
        }));
      } else {
        showStatusModal("Error updating status", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showStatusModal("Something went wrong", "error");
    } finally {
      setLoading((prev) => ({ ...prev, [subcategoryId]: false }));
      setDeleteModal({ isOpen: false, subcategoryId: null });
    }
  };

  // ✅ Open delete confirmation modal
  const openDeleteModal = (subcategoryId) => {
    setDeleteModal({ isOpen: true, subcategoryId });
  };

  // ✅ Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, subcategoryId: null });
  };

  const handleDeleteCategory = async () => {
    setDeletingCategory(true);
    try {
      const res = await fetch("/api/categories/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: deleteCategoryModal.categoryId }),
      });

      const result = await res.json();

      if (!res.ok) {
        showStatusModal(result.error || "Failed to delete category", "error");
        return;
      }

      // Re-fetch categories
      const refreshRes = await fetch("/api/categories/get");
      const refreshJson = await refreshRes.json();
      const refreshData = Array.isArray(refreshJson)
        ? refreshJson
        : Array.isArray(refreshJson?.data)
          ? refreshJson.data
          : Array.isArray(refreshJson?.categories)
            ? refreshJson.categories
            : [];
      setCategories(refreshData);

      const mainCats = refreshData.filter((cat) => cat.parentid === "none");
      setMainCategories(mainCats);

      const subcategoriesMap = {};
      refreshData.forEach((category) => {
        if (category.parentid !== "none") {
          const pid = category.parentid?.toString();
          if (!subcategoriesMap[pid]) {
            subcategoriesMap[pid] = [];
          }
          subcategoriesMap[pid].push(category);
        }
      });
      setSubcategoriesByParent(subcategoriesMap);

      showStatusModal("Category deleted successfully!");
    } catch (err) {
      console.log("Error:", err);
      showStatusModal("Failed to delete category", "error");
    } finally {
      setDeletingCategory(false);
      setDeleteCategoryModal({
        isOpen: false,
        categoryId: null,
        categoryName: "",
      });
    }
  };

  const handleAddCategory = async () => {
    const selectedCategoryName =
      newCategorySubSubParent !== "none"
        ? newCategorySubSubParent
        : newCategorySubParent !== "none"
        ? newCategorySubParent
        : newCategoryParent;

    if (selectedCategoryName === "none") {
      showStatusModal("Please select a category", "error");
      return;
    }

    const selectedCategory = categories.find(
      (c) => c.category_name === selectedCategoryName,
    );
    if (!selectedCategory) {
      showStatusModal("Category not found", "error");
      return;
    }

    setAddingCategory(true);

    try {
      const fd = new FormData();
      fd.append("subcategoryId", selectedCategory._id);
      fd.append("subcategoryName", selectedCategory.category_name);
      fd.append("products", JSON.stringify([]));
      fd.append("status", "Active");
      fd.append("position", 0);
      fd.append("borderColor", "#000000");
      fd.append("alignment", "left");
      fd.append("keepBannerImages", JSON.stringify([]));
      fd.append("keepBannerRedirectUrls", JSON.stringify([]));
      fd.append("categoryRedirectUrl", "");
        
    const alreadyExists = existingCategoryProducts[selectedCategory._id];
    const method = alreadyExists ? "PUT" : "POST";

      const res = await fetch("/api/categoryproduct", {
        method: method,
        body: fd,
      });

      const result = await res.json();

      if (!res.ok) {
        showStatusModal(result.error || "Failed to add category", "error");
        return;
      }

      setExistingCategoryProducts((prev) => ({
        ...prev,
        [selectedCategory._id]: result.data,
      }));
      setMode((prev) => ({ ...prev, [selectedCategory._id]: "edit" }));

      showStatusModal("Category table created successfully!");
      setShowAddCategoryModal(false);
      setNewCategoryParent("none");
      setNewCategorySubParent("none");
      setNewCategorySubSubParent("none");
    } catch (err) {
      console.log("Error:", err);
      showStatusModal("Failed to create category table", "error");
    } finally {
      setAddingCategory(false);
    }
  };

  // Renders the product settings form for any category node
  const renderCategoryForm = (subcat) => {
    const subcatProducts = products.filter(
      (p) =>
        p.sub_category_new
          ?.toLowerCase()
          .includes(subcat.md5_cat_name?.toLowerCase()) &&
        p.status === "Active" &&
        p.stock_status === "In Stock",
    );
    const productOptions = subcatProducts.map((p) => ({
      value: p._id,
      label: p.name,
    }));
    const existingData = existingCategoryProducts[subcat._id];
    const currentMode = mode[subcat._id] || "add";

    return (
      <div
        key={subcat._id}
        className="p-5 border rounded-lg shadow bg-white space-y-4"
      >
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="font-semibold text-lg">{subcat.category_name}</h3>
          <div className="flex items-center gap-2">
            {existingData && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  existingData.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {existingData.status}
              </span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Products</label>
          <Select
            options={productOptions}
            value={selectedProducts[subcat._id] || []}
            onChange={(options) => handleProductSelect(subcat._id, options)}
            placeholder="Select products"
            isMulti
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
            components={{ Option }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 border p-3 rounded bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="font-medium">Banner Images</span>
              <button
                type="button"
                onClick={() => handleAddImage(subcat._id, "bannerImage")}
                className="text-sm bg-[#d72828] text-white px-3 py-1 rounded hover:bg-[#d72828]"
              >
                + Add Image
              </button>
            </div>
            {(formData[subcat._id]?.bannerImage || []).map((img, index) => (
              <div
                key={index}
                className="border p-3 rounded relative bg-white space-y-2"
              >
                {(img.existingUrl || img.file) && (
                  <img
                    src={
                      img.file ? URL.createObjectURL(img.file) : img.existingUrl
                    }
                    className="h-28 object-contain rounded border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleMultiImageChange(
                      subcat._id,
                      "bannerImage",
                      index,
                      "file",
                      e.target.files[0],
                    )
                  }
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Redirect URL"
                  value={img.redirectUrl || ""}
                  onChange={(e) =>
                    handleMultiImageChange(
                      subcat._id,
                      "bannerImage",
                      index,
                      "redirectUrl",
                      e.target.value,
                    )
                  }
                  className="w-full p-2 border rounded"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteImage(
                      subcat._id,
                      "bannerImage",
                      index,
                      img.existingUrl,
                    )
                  }
                  className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 text-xs rounded"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex flex-col gap-2">
              <span>Category Image (750 * 783)</span>
              {existingData?.categoryImage && (
                <img
                  src={existingData.categoryImage}
                  alt="Category Preview"
                  className="w-full h-32 rounded object-contain"
                />
              )}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleInputChange(
                  subcat._id,
                  "categoryImage",
                  e.target.files[0],
                )
              }
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="text"
              placeholder="Category Redirect URL"
              value={formData[subcat._id]?.categoryRedirectUrl || ""}
              onChange={(e) =>
                handleInputChange(
                  subcat._id,
                  "categoryRedirectUrl",
                  e.target.value,
                )
              }
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Border Color
            </label>
            <div className="flex items-center">
              <input
                type="color"
                value={formData[subcat._id]?.borderColor || "#000000"}
                onChange={(e) =>
                  handleInputChange(subcat._id, "borderColor", e.target.value)
                }
                className="w-10 h-10 p-1 border rounded mr-2"
              />
              <span className="text-sm">
                {formData[subcat._id]?.borderColor || "#000000"}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Alignment</label>
            <select
              value={formData[subcat._id]?.alignment || "left"}
              onChange={(e) =>
                handleInputChange(subcat._id, "alignment", e.target.value)
              }
              className="w-full p-2 border rounded"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="center">Center</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData[subcat._id]?.status || "Active"}
              onChange={(e) =>
                handleInputChange(subcat._id, "status", e.target.value)
              }
              className="w-full p-2 border rounded"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Position</label>
            <input
              type="number"
              value={formData[subcat._id]?.position || 0}
              onChange={(e) =>
                handleInputChange(
                  subcat._id,
                  "position",
                  parseInt(e.target.value),
                )
              }
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => handleSave(subcat._id)}
            disabled={loading[subcat._id]}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading[subcat._id]
              ? "Saving..."
              : currentMode === "add"
              ? "Add"
              : "Update"}
          </button>
          {currentMode === "edit" && (
            <button
              onClick={() => openDeleteModal(subcat._id)}
              disabled={loading[subcat._id]}
              className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading[subcat._id] ? "Processing..." : "Set to Inactive"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6">Categories & Products</h2>
      {/* Delete Category Modal */}
      {deleteCategoryModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Delete Category</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "
              <b>{deleteCategoryModal.categoryName}</b>"? This will be
              permanently deleted from the database!
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCategory}
                disabled={deletingCategory}
                className={`px-4 py-2 rounded-md text-white ${
                  deletingCategory
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deletingCategory ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category
              </label>
              <select
                value={newCategoryParent}
                onChange={(e) => {
                  setNewCategoryParent(e.target.value);
                  setNewCategorySubParent("none");
                  setNewCategorySubSubParent("none");
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="none">Select Main Category</option>
                {mainCategories.map((cat) => (
                  <option key={cat._id} value={cat.category_name}>
                    {cat.category_name}
                  </option>
                ))}
              </select>

              {newCategoryParent !== "none" && (
                <div className="mt-4">
                  {newCategorySubParent !== "none" && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Child Category
                      </label>
                      <select
                        value={newCategorySubSubParent}
                        onChange={(e) =>
                          setNewCategorySubSubParent(e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="none">Select Child Category</option>
                        {(
                          subcategoriesByParent[
                            categories
                              .find(
                                (c) => c.category_name === newCategorySubParent,
                              )
                              ?._id?.toString()
                          ] || []
                        ).map((cat) => (
                          <option key={cat._id} value={cat.category_name}>
                            {cat.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sub Category
                  </label>
                  <select
                    value={newCategorySubParent}
                    onChange={(e) => {
                      setNewCategorySubParent(e.target.value);
                      setNewCategorySubSubParent("none");
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="none">Select Sub Category</option>
                    {(
                      subcategoriesByParent[
                        mainCategories
                          .find((c) => c.category_name === newCategoryParent)
                          ?._id?.toString()
                      ] || []
                    ).map((cat) => (
                      <option key={cat._id} value={cat.category_name}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName("");
                  setNewCategoryParent("none");
                }}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={addingCategory}
                className={`px-4 py-2 rounded-md text-white ${
                  addingCategory
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {addingCategory ? "Adding..." : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={() => handleDelete(deleteModal.subcategoryId)}
        title="Confirm Status Change"
        message="Are you sure you want to change the status to Inactive? This will hide the category from the frontend."
      />

      {/* Status Notification Modal */}
      <StatusModal
        isOpen={statusModal.isOpen}
        message={statusModal.message}
        type={statusModal.type}
        onClose={closeStatusModal}
      />
      <div className="bg-white shadow-md rounded-lg p-5 mb-5 overflow-x-auto">
        <a
          className="bg-[#d72828] hover:bg-[#d72828] text-white px-4 py-2  mb-4 rounded-md text-sm font-medium shadow-sm transition duration-150 inline-block"
          href="/admin/homesettings/product/navmenu"
        >
          Category Drag
        </a>
        <button
          onClick={() => setShowAddCategoryModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 mb-4 ml-3 rounded-md text-sm font-medium shadow-sm transition duration-150 inline-block"
        >
          + Add Category
        </button>
        {mainCategories.map((mainCategory) => (
          <div key={mainCategory._id} className="mb-8">
            <div className="flex justify-between items-center mb-4 bg-gray-100 p-3 rounded">
              <h3 className="text-lg font-semibold">
                {mainCategory.category_name}
              </h3>
            </div>

            <div className="space-y-4 ml-6">
              {subcategoriesByParent[mainCategory._id?.toString()]
                ?.filter((subcat) => {
  // Check if this subcat OR any child/grandchild has a DB entry (any status)
  const hasOwnEntry = Object.keys(existingCategoryProducts).some(
    key => key === subcat._id?.toString() || key === subcat._id
  );
  
  const hasChildEntry = subcategoriesByParent[subcat._id?.toString()]?.some(
    (child) => {
      const childHasEntry = Object.keys(existingCategoryProducts).some(
        key => key === child._id?.toString() || key === child._id
      );
      const grandChildHasEntry = subcategoriesByParent[child._id?.toString()]?.some(
        (grandChild) => Object.keys(existingCategoryProducts).some(
          key => key === grandChild._id?.toString() || key === grandChild._id
        )
      );
      return childHasEntry || grandChildHasEntry;
    }
  );
  
  return hasOwnEntry || hasChildEntry;
})
                ?.map((subcat) => {
                  const children =
                    subcategoriesByParent[subcat._id?.toString()] || [];

                  const childMd5Names = children.map((c) =>
                    c.md5_cat_name?.toLowerCase(),
                  );
                  const subcatProducts = products.filter((p) => {
                    const pCat = p.sub_category_new?.toLowerCase();
                    return (
                      (pCat?.includes(subcat.md5_cat_name?.toLowerCase()) ||
                        childMd5Names.some((md5) => pCat?.includes(md5))) &&
                      p.status === "Active" &&
                      p.stock_status === "In Stock"
                    );
                  });

                  const productOptions = subcatProducts.map((p) => ({
                    value: p._id,
                    label: p.name,
                  }));

                  const existingData = existingCategoryProducts[subcat._id];
                  const currentMode = mode[subcat._id] || "add";

                  return (
                    <div key={`wrapper-${subcat._id}`}>
                      <div className="p-5 border rounded-lg shadow bg-white space-y-4">
                        {/* Category Header */}
                        <div className="flex justify-between items-center pb-3 border-b">
                          <h3 className="font-semibold text-lg">
                            {subcat.category_name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {existingData && (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  existingData.status === "Active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {existingData.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Products Multi Select */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">
                            Products
                          </label>
                          <Select
                            options={productOptions}
                            value={selectedProducts[subcat._id] || []}
                            onChange={(options) =>
                              handleProductSelect(subcat._id, options)
                            }
                            placeholder="Select products"
                            isMulti
                            closeMenuOnSelect={false}
                            hideSelectedOptions={false}
                            components={{ Option }}
                          />
                        </div>

                        {/* First Row: Banner Image and Category Image */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Banner Image */}
                          {/* <div>
                        <label className="block text-sm font-medium mb-2 flex flex-col gap-2">
                          <span>Banner Image</span>
                          {existingData?.bannerImage && (
                            <img
                              src={existingData.bannerImage}
                              alt="Banner Preview"
                              className="w-full h-32 rounded object-contain"
                            />
                          )}
                        </label>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleInputChange(subcat._id, "bannerImage", e.target.files[0])
                          }
                          className="w-full p-2 border rounded mb-2"
                        />
                        <input
                          type="text"
                          placeholder="Banner Redirect URL"
                          value={formData[subcat._id]?.bannerRedirectUrl || ""}
                          onChange={(e) =>
                            handleInputChange(subcat._id, "bannerRedirectUrl", e.target.value)
                          }
                          className="w-full p-2 border rounded"
                        />
                      </div> */}

                          {/* 🔁 NEW MULTIPLE BANNER IMAGES */}
                          <div className="space-y-3 border p-3 rounded bg-gray-50">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Banner Images</span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleAddImage(subcat._id, "bannerImage")
                                }
                                className="text-sm bg-[#d72828] text-white px-3 py-1 rounded hover:bg-[#d72828]"
                              >
                                + Add Image
                              </button>
                            </div>

                            {(formData[subcat._id]?.bannerImage || []).map(
                              (img, index) => (
                                <div
                                  key={index}
                                  className="border p-3 rounded relative bg-white space-y-2"
                                >
                                  {/* Image Preview */}
                                  {(img.existingUrl || img.file) && (
                                    <img
                                      src={
                                        img.file
                                          ? URL.createObjectURL(img.file)
                                          : img.existingUrl
                                      }
                                      className="h-28 object-contain rounded border"
                                    />
                                  )}

                                  {/* File Input */}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleMultiImageChange(
                                        subcat._id,
                                        "bannerImage",
                                        index,
                                        "file",
                                        e.target.files[0],
                                      )
                                    }
                                    className="w-full p-2 border rounded"
                                  />

                                  {/* Redirect URL */}
                                  <input
                                    type="text"
                                    placeholder="Redirect URL"
                                    value={img.redirectUrl || ""}
                                    onChange={(e) =>
                                      handleMultiImageChange(
                                        subcat._id,
                                        "bannerImage",
                                        index,
                                        "redirectUrl",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full p-2 border rounded"
                                  />

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteImage(
                                        subcat._id,
                                        "bannerImage",
                                        index,
                                        img.existingUrl,
                                      )
                                    }
                                    className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 text-xs rounded"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ),
                            )}
                          </div>

                          {/* Category Image */}
                          <div>
                            <label className="block text-sm font-medium mb-2 flex flex-col gap-2">
                              <span>Category Image (750 * 783)</span>
                              {existingData?.categoryImage && (
                                <img
                                  src={existingData.categoryImage}
                                  alt="Category Preview"
                                  className="w-full h-32 rounded object-contain"
                                />
                              )}
                            </label>

                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleInputChange(
                                  subcat._id,
                                  "categoryImage",
                                  e.target.files[0],
                                )
                              }
                              className="w-full p-2 border rounded mb-2"
                            />
                            <input
                              type="text"
                              placeholder="Category Redirect URL"
                              value={
                                formData[subcat._id]?.categoryRedirectUrl || ""
                              }
                              onChange={(e) =>
                                handleInputChange(
                                  subcat._id,
                                  "categoryRedirectUrl",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 border rounded"
                            />
                          </div>
                        </div>

                        {/* Second Row: Border Color, Alignment, Status, and Position */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Border Color */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Border Color
                            </label>
                            <div className="flex items-center">
                              <input
                                type="color"
                                value={
                                  formData[subcat._id]?.borderColor || "#000000"
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    subcat._id,
                                    "borderColor",
                                    e.target.value,
                                  )
                                }
                                className="w-10 h-10 p-1 border rounded mr-2"
                              />
                              <span className="text-sm">
                                {formData[subcat._id]?.borderColor || "#000000"}
                              </span>
                            </div>
                          </div>

                          {/* Alignment */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Alignment
                            </label>
                            <select
                              value={formData[subcat._id]?.alignment || "left"}
                              onChange={(e) =>
                                handleInputChange(
                                  subcat._id,
                                  "alignment",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 border rounded"
                            >
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                              <option value="center">Center</option>
                            </select>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Status
                            </label>
                            <select
                              value={formData[subcat._id]?.status || "Active"}
                              onChange={(e) =>
                                handleInputChange(
                                  subcat._id,
                                  "status",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 border rounded"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>

                          {/* Position Field */}
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Position
                            </label>
                            <input
                              type="number"
                              value={formData[subcat._id]?.position || 0}
                              onChange={(e) =>
                                handleInputChange(
                                  subcat._id,
                                  "position",
                                  parseInt(e.target.value),
                                )
                              }
                              className="w-full p-2 border rounded"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t">
                          <button
                            onClick={() => handleSave(subcat._id)}
                            disabled={loading[subcat._id]}
                            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {loading[subcat._id]
                              ? "Saving..."
                              : currentMode === "add"
                              ? "Add"
                              : "Update"}
                          </button>

                          {currentMode === "edit" && (
                            <button
                              onClick={() => openDeleteModal(subcat._id)}
                              disabled={loading[subcat._id]}
                              className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {loading[subcat._id]
                                ? "Processing..."
                                : "Set to Inactive"}
                            </button>
                          )}
                        </div>
                      </div>
{children.filter((child) => {
  const childHasEntry = Object.keys(existingCategoryProducts).some(
    key => key === child._id?.toString() || key === child._id
  );
  const grandChildHasEntry = subcategoriesByParent[child._id?.toString()]?.some(
    (grandChild) => Object.keys(existingCategoryProducts).some(
      key => key === grandChild._id?.toString() || key === grandChild._id
    )
  );
  return childHasEntry || grandChildHasEntry;
         }).length > 0 && (   
                        <div className="space-y-4 ml-6 mt-4">
                          {children.filter((child) => {
                           const childHasEntry = Object.keys(existingCategoryProducts).some(
                 key => key === child._id?.toString() || key === child._id
                       );
                          const grandChildHasEntry = subcategoriesByParent[child._id?.toString()]?.some(
               (grandChild) => Object.keys(existingCategoryProducts).some(
                      key => key === grandChild._id?.toString() || key === grandChild._id
                        )
                       );
                          return childHasEntry || grandChildHasEntry;
                   }).map((child) => renderCategoryForm(child))} 
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
