"use client";
import { React, useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { FaPlus, FaMinus, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import TinyEditor from "./TinyEditor";
const Select = dynamic(() => import('react-select'), { ssr: false });
import { combinations } from '@/utils/combinations';
import { ToastContainer, toast } from 'react-toastify';
import { useRouter, useSearchParams } from 'next/navigation';
import { components } from "react-select";
import { Check } from "react-feather";
import WarrantySearchInput from "@/app/admin/components/WarrantySearchInput";

const startedNewProductPrefills = new Set();


const steps = [
  { title: "Basic Information" },
  { title: "Images & Description" },

  { title: "Variants & Filters" },
  { title: "Others" },
];

export default function AddProductPage({ mode = "add", productData = null, productId = null, onSuccess, initialProductData }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonHighlightsInput, setJsonHighlightsInput] = useState('');
  const [product, setProduct] = useState({
    name: "",
    slug: "",
    item_code: "",
    price: "",
    special_price: "",
    quantity: "",
    brand: "",
    brand_code: "", // added to keep input controlled and consistent
    category: "",
    stock_status: "In Stock",
    description: "",
    related_products: [],
    add_ons: "",
    images: ["", "", "", ""],
    key_specifications: "",
    featured: false,
    tags: [],
    meta_title: "",
    status: "Active",
    /** Exist: 1 = run display-store stock enquiry check on PDP; 0 = off */
    chk_display_store_stock: 0,
    variant_attribute: { name: "", options: [] },
    variants: [],
    filters: [],
    hasVariants: false,
    variantAttributes: [],
    files: [],
    meta_title: "",
    meta_description: "",
    overviewdescription: "",
    overviewImage: [null],
    overviewImageFile: [null],
    featured_products: [],
    warranty: "",
    extended_warranty: "",
    product_highlights: [],
    search_keywords: "",
    warranty_ids: [],
  });

  const [variant, setVariant] = useState([{
    variant_attribute_name: "",
    options: "",
    item_code: "",
    price: "",
    special_price: "",
    quantity: "",
    stock_status: "In Stock",
    images: [],
    status: "Active"
  }]);

  const [variantImages, setVariantImages] = useState([{
    images: []
  }]);
  const [tagsOptions, setTagsOptions] = useState([
    { value: "New", label: "New" },
    { value: "Best Seller", label: "Best Seller" },
    { value: "Limited Edition", label: "Limited Edition" },
  ]);
  const applyJsonHighlights = () => {
    try {
      const parsedHighlights = JSON.parse(jsonHighlightsInput);

      // Check if the parsed data is an object.
      if (typeof parsedHighlights === 'object' && parsedHighlights !== null) {
        setProduct({
          ...product,
          product_highlights: parsedHighlights, // Set the parsed object as the new highlights
        });
        alert('JSON highlights applied successfully!');
      } else {
        alert('Please enter a valid JSON object.');
      }
    } catch (error) {
      alert(`Invalid JSON format: ${error.message}`);
    }
  };
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [brand, setBrand] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [Filter, setFilter] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [allproducts, setAllProducts] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedParentCategory, setSelectedParentCategory] = useState("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const prefillStarted = useRef(false);

  const slugifyName = (value = "") =>
    String(value || "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");


  // Extended warranty 
  const [warranties, setWarranties] = useState(
    product.extend_warranty && product.extend_warranty.length > 0
      ? product.extend_warranty
      : [{ year: "", amount: "" }]
  );

  const handleWarrantyChange = (index, field, value) => {
    const updated = [...warranties];
    updated[index][field] = value;
    setWarranties(updated);
  };

  const addWarranty = () => {
    setWarranties([...warranties, { year: "", amount: "" }]);
  };

  const removeWarranty = (index) => {
    setWarranties(warranties.filter((_, i) => i !== index));
  };




  const handleRelatedProductsChange = (selectedOptions) => {
    setProduct(prev => ({
      ...prev,
      related_products: selectedOptions.map(option => option.value),
    }));
  };


  const handleAddOnsProductsChange = (selectedOptions) => {
    setProduct(prev => ({
      ...prev,
      add_ons: selectedOptions.map(option => option.value),
    }));
  };


  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories/get");
      const result = await response.json();
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.categories)
            ? result.categories
            : [];
      if (result.error && !list.length) {
        toast.error(result.error);
      } else {
        setCategories(buildCategoryTree(list));
      }
    } catch (error) {
      toast.error(error);
    } finally {
    }
  };

  const fetchBrand = async () => {
    try {
      const response = await fetch("/api/brand");
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        const data = result.data;
        console.log(data);
        const brandOptions = data.map((cat) => ({
          value: cat._id,
          label: cat.brand_name,
        }));
        setBrand(brandOptions);
      }
    } catch (error) {
      toast.error(error);
    } finally {
    }
  };

  // const fetchFilter = async () => {
  //   try {
  //     const response = await fetch("/api/filter");
  //     const result = await response.json();
  //     const data = result.data;
  //     console.log(data);
  //     const filterOptions = data.map((cat) => ({
  //       value: cat._id,
  //       label: cat.filter_name,
  //     }));
  //     setFilter(filterOptions);
  //   } catch (error) {
  //     toast.error(error);
  //   }
  // };
  const fetchFilter = async () => {
    try {
      const response = await fetch("/api/filter");
      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const data = result.data;

      // Group filters by filter_group name
      const groupedFilters = {};

      data.forEach((filter) => {
        const groupName = filter.filter_group_name || "Other Filters"; // depends on your API structure
        if (!groupedFilters[groupName]) groupedFilters[groupName] = [];

        groupedFilters[groupName].push({
          value: filter._id,
          label: filter.filter_name,
        });
      });

      // Convert grouped data into format React-Select can understand
      const filterOptions = Object.entries(groupedFilters).map(([group, options]) => ({
        label: group,
        options,
      }));

      setFilter(filterOptions);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Custom Option with tick symbol
  const CustomOption = (props) => (
    <components.Option {...props}>
      <div className="flex items-center justify-between">
        <span>{props.label}</span>
        {props.isSelected && <Check size={16} className="text-green-600" />}
      </div>
    </components.Option>
  );


  //    useEffect(() => {
  //     if (mode === "edit" && productData) {
  //         console.log(productData);

  //         // Initialize warranties from productData
  //     if (productData.extend_warranty && productData.extend_warranty.length > 0) {
  //       setWarranties(productData.extend_warranty);
  //     } else {
  //       setWarranties([{ year: "", amount: "" }]);
  //     }

  //         // This code sets the state for the 'product' object
  //         setProduct(prevProduct => ({
  //             ...productData,
  //             brand_code: productData.brand_code || "", // ensure brand_code defaults to empty string
  //             product_highlights: Array.isArray(productData.product_highlights) 
  //                 ? productData.product_highlights 
  //                 : [],
  //             // Ensure filters are in the correct format for react-select if they are just IDs
  //             filters: productData.filterDetails && productData.filterDetails.length > 0
  //                 ? productData.filterDetails.map(item => ({ value: item._id, label: item.filter_name }))
  //                 : [],
  //             hasVariants: productData.hasVariants || false, // Ensure hasVariants is a boolean
  //             variants: productData.variants || [], // Ensure variants is an array
  //             images: productData.images || ['', '', '', ''], // Ensure images is an array with placeholders
  //             files: productData.files || [],
  //             overviewImage: productData.overview_image || [null],
  //             overviewImageFile: productData.overviewImageFile || [null],
  //             featured_products: productData.featured_products || [],
  //         }));

  //         // This code now correctly runs after the setProduct call, setting the JSON input field
  //         if (!Array.isArray(productData.product_highlights) && typeof productData.product_highlights === 'object') {
  //             setJsonHighlightsInput(JSON.stringify(productData.product_highlights, null, 2));
  //         }

  //         if(productData.sub_category){
  //           setSelectedCategory(productData.sub_category);
  //         }
  //     }
  // }, [mode, productData, setJsonHighlightsInput,setSelectedCategory]);
  // useEffect(() => {
  //   if (mode === "edit" && productData) {
  //     console.log(productData);

  //     // Initialize warranties from productData
  //     if (productData.extend_warranty && productData.extend_warranty.length > 0) {
  //       setWarranties(productData.extend_warranty);
  //     } else {
  //       setWarranties([{ year: "", amount: "" }]);
  //     }

  //     // This code sets the state for the 'product' object
  //     setProduct(prevProduct => ({
  //       ...productData,
  //       brand_code: productData.brand_code || "",
  //       product_highlights: Array.isArray(productData.product_highlights) 
  //         ? productData.product_highlights 
  //         : [],
  //       filters: productData.filterDetails && productData.filterDetails.length > 0
  //         ? productData.filterDetails.map(item => ({ value: item._id, label: item.filter_name }))
  //         : [],
  //       hasVariants: productData.hasVariants || false,
  //       variants: productData.variants || [],
  //       images: productData.images || ['', '', '', ''],
  //       files: productData.files || [],
  //       // FIX: Properly handle overview_image array
  //       overviewImage: Array.isArray(productData.overview_image) && productData.overview_image.length > 0 
  //         ? productData.overview_image 
  //         : [null],
  //       overviewImageFile: productData.overviewImageFile || [null],
  //       featured_products: productData.featured_products || [],
  //     }));

  //     // This code now correctly runs after the setProduct call, setting the JSON input field
  //     if (!Array.isArray(productData.product_highlights) && typeof productData.product_highlights === 'object') {
  //       setJsonHighlightsInput(JSON.stringify(productData.product_highlights, null, 2));
  //     }

  //     if(productData.sub_category){
  //       setSelectedCategory(productData.sub_category);
  //     }
  //   }
  // }, [mode, productData, setJsonHighlightsInput,setSelectedCategory]);

  useEffect(() => {
    if (mode === "edit" && productData) {
      console.log("Edit mode - Product data:", productData);
      console.log("Overview images from DB:", productData.overview_image);

      // Initialize warranties from productData
      if (productData.extend_warranty && productData.extend_warranty.length > 0) {
        setWarranties(productData.extend_warranty);
      } else {
        setWarranties([{ year: "", amount: "" }]);
      }

      // This code sets the state for the 'product' object
      setProduct(prevProduct => ({
        ...productData,
        brand_code: productData.brand_code || "",
        product_highlights: Array.isArray(productData.product_highlights)
          ? productData.product_highlights
          : [],
        filters: productData.filterDetails && productData.filterDetails.length > 0
          ? productData.filterDetails.map(item => ({ value: item._id, label: item.filter_name }))
          : [],
        hasVariants: productData.hasVariants || false,
        variants: productData.variants || [],
        images: productData.images || ['', '', '', ''],
        files: productData.files || [],
        add_ons: productData.add_ons || [],

        // Add new fields with fallbacks
        size: productData.size || "",
        movement: productData.movement || "",
        model_number: productData.model_number || "",
        chk_display_store_stock:
          Number(productData.chk_display_store_stock) === 1 ? 1 : 0,
        // FIX: Use overview_image from database
        overviewImage: Array.isArray(productData.overview_image) && productData.overview_image.length > 0
          ? productData.overview_image
          : [null],
        overviewImageFile: productData.overviewImageFile || [null],
        featured_products: productData.featured_products || [],
        removedOverviewImages: [], // Reset removed images
        warranty_ids: productData.warranty_ids || [],

      }));

      if (productData.sub_category) {
        setSelectedCategory(productData.sub_category);
      }
    }
  }, [mode, productData, setJsonHighlightsInput, setSelectedCategory]);

  useEffect(() => {
    fetchCategories();
    fetchFilter();
    fetchBrand();
    fetchallproducts();
  }, []);


  useEffect(() => {
    if (initialProductData) {
      setProduct({
        ...initialProductData,
        brand_code: initialProductData.brand_code || "", // ensure brand_code defaults to empty string
        // Ensure product_highlights is an array, even if it's null/undefined from backend
        product_highlights: initialProductData.product_highlights || [],
        // Ensure featured_products is an array or object, depending on your schema
        featured_products: initialProductData.featured_products || [], // Adjust based on actual data type
      });
    }
  }, [initialProductData]);

  useEffect(() => {
    const source = searchParams.get("source");
    const newProductId = searchParams.get("id");
    if (source !== "newproduct" || !newProductId || startedNewProductPrefills.has(newProductId)) {
      return;
    }
    startedNewProductPrefills.add(newProductId);
    prefillStarted.current = true;

    const loadNewProductContent = async () => {
      setIsGeneratingContent(true);
      try {
        const response = await fetch("/api/newproduct/generate-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newProductId }),
        });
        const payload = await response.json();
        if (!response.ok) {
          toast.error(payload.error || "Failed to generate product content");
          return;
        }

        const sourceProduct = payload.source || {};
        const content = payload.content || {};
        const mapped = payload.mapped || {};
        const productName =
          content.product_name || sourceProduct.name || sourceProduct.item_description || "";
        const rawDescription = content.description || "";
        const description = rawDescription
          ? /<[a-z][\s\S]*>/i.test(rawDescription)
            ? rawDescription
            : rawDescription
              .split(/\n{2,}/)
              .map((para) => `<p>${para.replace(/\n/g, "<br />")}</p>`)
              .join("")
          : "";

        setProduct((prev) => ({
          ...prev,
          name: productName,
          slug: mapped.uniqueSlug || mapped.slug || slugifyName(productName),
          item_code: sourceProduct.item_code || content.product_code || prev.item_code,
          price: sourceProduct.price ?? prev.price,
          special_price:
            sourceProduct.special_price ?? sourceProduct.price ?? prev.special_price,
          quantity: sourceProduct.quantity ?? prev.quantity,
          brand: mapped.brandId || prev.brand,
          brand_code: sourceProduct.brand_code || prev.brand_code,
          movement: sourceProduct.movement || prev.movement,
          category: mapped.parentCategoryId || prev.category,
          sub_category: mapped.categoryId || prev.sub_category,
          description: description || prev.description,
          product_highlights: Array.isArray(content.highlights) && content.highlights.length
            ? content.highlights
            : prev.product_highlights,
          key_specifications: Array.isArray(content.key_features) && content.key_features.length
            ? content.key_features.join(", ")
            : prev.key_specifications,
          meta_title: content.meta_title || prev.meta_title,
          meta_description: content.meta_description || prev.meta_description,
          search_keywords: content.meta_keywords || prev.search_keywords,
          stock_status: Number(sourceProduct.quantity) > 0 ? "In Stock" : "Out of Stock",
        }));
        setEditorRevision((n) => n + 1);

        if (mapped.categoryId) {
          setSelectedCategory(mapped.categoryId);
          setSelectedParentCategory(mapped.parentCategoryId || "");
        }

        if (payload.aiError) {
          toast.warn(`AI content was not generated: ${payload.aiError}`);
        } else {
          toast.success("Product content generated. Review and save.");
        }
      } catch (error) {
        toast.error(error.message || "Failed to load new product content");
      } finally {
        setIsGeneratingContent(false);
      }
    };

    loadNewProductContent();
  }, [searchParams]);

  const collectAncestorIds = (nodes, targetId, trail = []) => {
    for (const node of nodes || []) {
      if (node._id === targetId) return trail;
      const found = collectAncestorIds(node.children, targetId, [...trail, node._id]);
      if (found) return found;
    }
    return null;
  };

  useEffect(() => {
    if (!selectedCategory || !categories.length) return;
    const ancestors = collectAncestorIds(categories, selectedCategory) || [];
    if (!ancestors.length) return;
    setExpandedCategories((prev) => {
      const next = { ...prev };
      ancestors.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [selectedCategory, categories]);

  const handleVariantFieldChange1 = (index, field, value) => {
    const updatedVariants = variant.map((v, i) =>
      i === index
        ? {
          ...v,
          variant_attribute_name: v.variant_attribute_name || "",
          options: v.options || "",
          item_code: v.item_code || "",
          price: v.price || "",
          special_price: v.special_price || "",
          quantity: v.quantity || "",
          stock_status: v.stock_status || "In Stock",
          status: v.status || "Active",
          images: v.images || [],
          [field]: value,
        }
        : v
    );

    setVariant(updatedVariants);
    setProduct(prev => ({
      ...prev,
      variants: updatedVariants
    }));
  };



  // const handleImageChange1 = (index, filez) => {
  //   if (filez.length <= 4) {
  //     const files = Array.from(filez);
  //     const updatedVariants = [...variant];
  //     const updatedvariantImages = [...variantImages];
  //     updatedvariantImages[index].images = files;
  //     // Store File objects directly in the variant
  //     updatedVariants[index].images = Array.from(filez).map(file => URL.createObjectURL(file));
  //     setVariant(updatedVariants);
  //     setVariantImages(updatedvariantImages);
  //   } else {
  //     toast.error("You can only upload up to 4 images.");
  //   }
  // if (filez.length <= 4) {
  //   // const updatedVariants = [...variant];
  //   // updatedVariants[index].images = Array.from(files).map(file => URL.createObjectURL(file));
  //   // setVariant(updatedVariants);
  //   const files = Array.from(filez);
  //   const updatedVariants = [...variant];

  //   // Store File objects directly in the variant
  //   updatedVariants[index].images = files;
  //   setVariant(updatedVariants);
  // } else {
  //   toast.error("You can only upload up to 4 images.");
  // }
  // };
  const handleImageChange1 = (index, files) => {
    if (files.length > 4) {
      toast.error("You can only upload up to 4 images.");
      return;
    }

    const fileArray = Array.from(files);
    const updatedVariantImages = [...variantImages];
    const updatedVariants = [...variant];

    // Update the images in the state
    updatedVariantImages[index].images = Array.from(files); // Store File objects
    updatedVariants[index].images = Array.from(files).map(file => URL.createObjectURL(file)); // Store URLs

    setVariantImages(updatedVariantImages);
    setVariant(updatedVariants);
  };
  const handleVariantImageChange = (variantIndex, imgIndex, files) => {
    if (files.length === 0) return;
    const file = files[0];

    const updatedVariants = [...variant];
    const updatedVariantImages = [...variantImages];

    updatedVariantImages[variantIndex].images[imgIndex] = file;
    updatedVariants[variantIndex].images[imgIndex] = URL.createObjectURL(file);

    setVariantImages(updatedVariantImages);
    setVariant(updatedVariants);
  };


  const handleRemoveVariantImage = (variantIndex, imgIndex) => {
    const updatedVariants = [...variant];
    const updatedVariantImages = [...variantImages];

    updatedVariants[variantIndex].images[imgIndex] = null;
    updatedVariantImages[variantIndex].images[imgIndex] = null;

    setVariant(updatedVariants);
    setVariantImages(updatedVariantImages);
  };
  // const handleImageChange = (e) => { 
  //   const files = Array.from(e.target.files);
  //   if (files.length + product.images.length > 4) {
  //       alert("You can only upload up to 4 images.");
  //       return;
  //   }
  //   setProduct((prev) => ({
  //       ...prev,
  //       files: [...(prev.files || []), ...files], 
  //       images: [...prev.images, ...files.map((file) => URL.createObjectURL(file))],
  //   }));
  // };



  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProduct(prev => {
      const newImages = [...prev.images];
      const newFiles = [...prev.files];

      // ✅ only use blob URL for preview, but keep real file in `files`
      newImages[index] = URL.createObjectURL(file);
      newFiles[index] = file;

      return {
        ...prev,
        images: newImages, // preview only
        files: newFiles,   // actual files for upload
      };
    });
  };

  //    const handleImageChange = (index, e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   setProduct(prev => {
  //     const newImages = [...prev.images];
  //     const newFiles = [...prev.files];

  //     // Ensure the array is long enough
  //     while (newImages.length <= index) newImages.push(null);
  //     while (newFiles.length <= index) newFiles.push(null);

  //     newImages[index] = URL.createObjectURL(file);
  //     newFiles[index] = file;

  //     return {
  //       ...prev,
  //       images: newImages,
  //       files: newFiles
  //     };
  //   });
  // };


  const handleRemoveImage1 = (index) => {
    const newImages = [...product.images];
    const newFiles = [...product.files];

    newImages[index] = null;
    newFiles[index] = null;

    setProduct(prev => ({
      ...prev,
      images: newImages,
      files: newFiles
    }));

    if (product.images.length > 4)
      setProduct(prev => {

        newImages.splice(index, 1);
        newFiles.splice(index, 1);

        return {
          ...prev,
          images: newImages,
          files: newFiles
        };
      });
    return;
  };

  // const handleOverviewImageChange = (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   setProduct(prev => ({
  //     ...prev,
  //     overviewImage: URL.createObjectURL(file),
  //     overviewImageFile: file
  //   }));
  // };

  // const handleOverviewImageChange = (index, files) => {
  //   const file = files[0];
  //   if (!file) return;

  //   setProduct(prev => {
  //     const newImages = [...prev.overviewImage];
  //     const newFiles = [...prev.overviewImageFile];

  //     newImages[index] = URL.createObjectURL(file);
  //     newFiles[index] = file;

  //     return {
  //       ...prev,
  //       overviewImage: newImages,
  //       overviewImageFile: newFiles
  //     };
  //   });
  // };

  // const handleAddOverviewImage = () => {
  //   setProduct(prev => ({
  //     ...prev,
  //     overviewImage: [...prev.overviewImage, null],
  //     overviewImageFile: [...prev.overviewImageFile, null]
  //   }));
  // };

  // const handleRemoveOverviewImage = (index) => {
  //   setProduct(prev => {
  //     const newImages = [...prev.overviewImage];
  //     const newFiles = [...prev.overviewImageFile];

  //     newImages.splice(index, 1);
  //     newFiles.splice(index, 1);

  //     return {
  //       ...prev,
  //       overviewImage: newImages,
  //       overviewImageFile: newFiles
  //     };
  //   });
  // };


  // const handleOverviewImageChange = (index, files) => {
  //   const file = files[0];
  //   if (!file) return;

  //   setProduct(prev => {
  //     const newImages = [...prev.overviewImage];
  //     const newFiles = [...prev.overviewImageFile];

  //     newImages[index] = URL.createObjectURL(file);
  //     newFiles[index] = file;

  //     return {
  //       ...prev,
  //       overviewImage: newImages,
  //       overviewImageFile: newFiles
  //     };
  //   });
  // };
  const handleOverviewImageChange = (index, files) => {
    const file = files[0];
    if (!file) return;

    setProduct(prev => {
      const newImages = [...prev.overviewImage];
      const newFiles = [...prev.overviewImageFile];

      // Ensure arrays are long enough
      while (newImages.length <= index) newImages.push(null);
      while (newFiles.length <= index) newFiles.push(null);

      newImages[index] = URL.createObjectURL(file);
      newFiles[index] = file;

      return {
        ...prev,
        overviewImage: newImages,
        overviewImageFile: newFiles
      };
    });
  };

  const AddproductImage = () => {
    setProduct(prev => ({
      ...prev,
      images: [...(prev.images || []), ""],
      files: [...(prev.files || []), null],
    }));
  };




  const handleAddOverviewImage = () => {
    setProduct(prev => ({
      ...prev,
      overviewImage: [...prev.overviewImage, null],
      overviewImageFile: [...prev.overviewImageFile, null]
    }));
  };

  const handleRemoveOverviewImage = (index) => {
    setProduct(prev => {
      const newImages = [...prev.overviewImage];
      const newFiles = [...prev.overviewImageFile];

      // Store the removed overview image filename for backend cleanup
      const removedImage = newImages[index];

      newImages.splice(index, 1);
      newFiles.splice(index, 1);

      console.log('Removing overview image:', {
        index,
        removedImage,
        currentImages: prev.overviewImage,
        newImages: newImages
      });

      return {
        ...prev,
        overviewImage: newImages,
        overviewImageFile: newFiles,
        // Keep track of removed OVERVIEW images only
        removedOverviewImages: [...(prev.removedOverviewImages || []), removedImage]
      };
    });
  };
  const handleRemoveImage = (variantIndex, imgIndex) => {
    const updatedVariants = [...variant];
    updatedVariants[variantIndex].images.splice(imgIndex, 1);
    setVariant(updatedVariants);
  };

  const handleAddVariant1 = () => {
    const newVariant = {
      variant_attribute_name: "",
      options: "",
      item_code: "",
      price: "",
      special_price: "",
      quantity: "",
      stock_status: "In Stock",
      images: [],
      status: "Active"
    };

    setVariant(prev => [...prev, newVariant]);
    setVariantImages(prev => [...prev, { images: [] }]);

    setProduct(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
  };


  const buildCategoryTree = (categories, parentId = "none") => {
    if (!Array.isArray(categories)) return [];
    return categories
      .filter((category) => category.parentid === parentId)
      .map((category) => ({
        ...category,
        children: buildCategoryTree(categories, category._id),
      }));
  };

  const toggleCategory = (id) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // const handleCategoryChange = (category, isChecked) => {
  //   console.log(category,isChecked);
  //   const updatedSelection = new Set(selectedCategories);

  //   const toggleChildren = (children, select) => {
  //     children.forEach((child) => {
  //       if (select) {
  //         updatedSelection.add(child._id);
  //       } else {
  //         updatedSelection.delete(child._id);
  //       }
  //       if (child.children.length > 0) {
  //         toggleChildren(child.children, select);
  //       }
  //     });
  //   };

  //   if (isChecked) {
  //     updatedSelection.add(category._id);
  //     toggleChildren(category.children, true);
  //   } else {
  //     updatedSelection.delete(category._id);
  //     toggleChildren(category.children, false);
  //   }

  //   const toggleParents = (parentId) => {
  //     if (!parentId || parentId === "none") return;
  //     const parent = findCategoryById(categories, parentId);
  //     if (parent) {
  //       const allChildrenSelected = parent.children.every((child) =>
  //         updatedSelection.has(child._id)
  //       );
  //       if (allChildrenSelected) {
  //         updatedSelection.add(parent._id);
  //       } else {
  //         updatedSelection.delete(parent._id);
  //       }
  //       toggleParents(parent.parentid);
  //     }
  //   };

  //   //toggleParents(category.parentid);
  //   setSelectedCategories(updatedSelection);
  //   console.log(updatedSelection);
  // };

  const findCategoryById = (categories, id) => {
    for (const category of categories) {
      if (category._id === id) return category;
      const found = findCategoryById(category.children, id);
      if (found) return found;
    }
    return null;
  };

  // const renderCategoryTree = (categories, level = 0) => {
  //   console.log(categories);
  //   return categories.map((category) => (
  //     <div key={category._id} style={{ paddingLeft: `${level * 20}px` }}>
  //       <div className="flex items-center cursor-pointer p-2  text-sm font-medium text-gray-700">
  //         {category.children.length > 0 && (
  //           <button
  //             type="button"
  //             onClick={(e) => {
  //               e.stopPropagation();
  //               toggleCategory(category._id);
  //             }}
  //             className="mr-2 text-[#d72828]"
  //           >
  //             {expandedCategories[category._id] ? <FaMinus /> : <FaPlus />}
  //           </button>
  //         )}
  //         {category.children.length == 0 && (
  //         <input
  //           type="checkbox"
  //           value={category._id}
  //           checked={selectedCategories.has(category._id)}
  //           onChange={(e) => handleCategoryChange(category, e.target.checked)}
  //           className="mr-2"
  //         />
  //         )}
  //         <span
  //           className={`font-medium ${
  //             selectedCategories.has(category._id) ? "text-[#d72828]" : "text-gray-700"
  //           }`}
  //         >
  //           {category.category_name}
  //         </span>
  //       </div>
  //       {expandedCategories[category._id] && renderCategoryTree(category.children, level + 1)}
  //     </div>
  //   ));
  // };
  // useEffect(() => {
  //   if (product.hasVariants && product.variantAttributes.length > 0) {
  //     const validAttributes = product.variantAttributes.filter(
  //       attr => attr.name && attr.options.length > 0
  //     );

  //     if (validAttributes.length === 0) return;
  //     console.log(validAttributes);
  //     const optionsArrays = validAttributes.map(attr =>
  //       attr.options.map(opt => ({ [attr.name]: opt }))
  //     );
  //     console.log(optionsArrays);
  //     const allCombinations = combinations(...optionsArrays);

  //     const newVariants = allCombinations.map(combination => {
  //       const existingVariant = product.variants.find(variant =>
  //         combination.every(c =>
  //           variant.attributes.some(attr => 
  //             attr.name === Object.keys(c)[0] &&
  //             attr.value === Object.values(c)[0]
  //           )
  //         )
  //       );

  //       return existingVariant || {
  //         attributes: combination.map(c => ({
  //           name: Object.keys(c)[0],
  //           value: Object.values(c)[0],
  //           item_code: "",
  //           price: "",
  //           special_price: "",
  //           quantity: "",
  //           images: [],
  //         }))
  //     });

  //     setProduct(prev => ({
  //       ...prev,
  //       variants: newVariants.filter((v, index, self) =>
  //         index === self.findIndex(t => (
  //           t.attributes.every(attr => 
  //             v.attributes.some(a => 
  //               a.name === attr.name && a.value === attr.value
  //             )
  //           )
  //         ))
  //       )
  //     }));
  //   }
  // }, [product.variantAttributes, product.hasVariants]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category._id);

    // Find the parent category
    const findParentCategory = (categories, childId) => {
      for (const cat of categories) {
        if (cat.children && cat.children.some(child => child._id === childId)) {
          return cat._id;
        }
        if (cat.children) {
          const found = findParentCategory(cat.children, childId);
          if (found) return found;
        }
      }
      return null;
    };

    const parentCategoryId = findParentCategory(categories, category._id);
    setSelectedParentCategory(parentCategoryId);

    setProduct((prev) => ({
      ...prev,
      sub_category: category._id,
      category: parentCategoryId, // Set the parent category
    }));
  };


  //   useEffect(() => {
  //   if (product) {
  //     setSelectedCategory(product.category); // This is the subcategory ID
  //   }
  // }, [product]);




  const renderCategoryTree = (categories, level = 0) => {
    return categories.map((category) => (
      <div key={category._id} style={{ paddingLeft: `${level * 20}px` }}>
        <div className="flex items-center cursor-pointer p-2 text-sm font-medium text-gray-700">
          {category.children.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(category._id);
              }}
              className="mr-2 text-[#d72828]"
            >
              {expandedCategories[category._id] ? <FaMinus /> : <FaPlus />}
            </button>
          )}
          {category.children.length == 0 && (
            <input
              type="checkbox"
              name="category"
              value={category._id}
              checked={selectedCategory === category._id}
              onChange={() => handleCategoryChange(category)}
              className="mr-2"
            />
          )}
          <span
            className={`font-medium ${selectedCategory === category._id ? "text-[#d72828]" : "text-gray-700"
              }`}
          >
            {category.category_name}
          </span>
        </div>
        {expandedCategories[category._id] &&
          renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  useEffect(() => {
    if (
      product.hasVariants &&
      product.variantAttributes.length > 0 &&
      (!product.variants || product.variants.length === 0)
    ) {
      const validAttributes = product.variantAttributes.filter(
        (attr) => attr.name && attr.options.length > 0
      );

      if (validAttributes.length === 0) return;

      const optionsArrays = validAttributes.map((attr) =>
        attr.options.map((opt) => ({ [attr.name]: opt }))
      );

      const allCombinations = combinations(...optionsArrays);

      const newVariants = allCombinations.map((combination) => {
        const existingVariant = product.variants?.find((variant) =>
          combination.every((c) =>
            variant.attributes?.some(
              (attr) =>
                attr.name === Object.keys(c)[0] &&
                attr.value === Object.values(c)[0]
            )
          )
        );

        return (
          existingVariant || {
            attributes: combination.map((c) => ({
              name: Object.keys(c)[0],
              value: Object.values(c)[0],
            })),
            item_code: "",
            price: "",
            special_price: "",
            quantity: "",
            images: [],
            stock_status: "",
            status: "",
          }
        );
      });

      setProduct((prev) => ({
        ...prev,
        variants: newVariants.filter(
          (v, index, self) =>
            index ===
            self.findIndex((t) =>
              t.attributes.every((attr) =>
                v.attributes.some(
                  (a) => a.name === attr.name && a.value === attr.value
                )
              )
            )
        ),
      }));
    }
  }, [product.variantAttributes, product.hasVariants]);


  const handleVariantFieldChange = async (variantIndex, attrIndex, field, value) => {
    let uploadedImagePaths = [];

    if (field === 'images' && value.length > 0) {
      uploadedImagePaths = await uploadImages(value);
    }

    const updatedVariants = product.variants.map((variant, i) => {
      if (i === variantIndex) {
        const updatedAttributes = variant.attributes.map((attr, j) => {
          if (j === attrIndex) {
            return {
              ...attr,
              [field]: field === "images"
                ? [...(attr.images || []), ...uploadedImagePaths]
                : value
            };
          }
          return attr;
        });
        return { ...variant, attributes: updatedAttributes };
      }
      return variant;
    });

    setProduct(prev => ({ ...prev, variants: updatedVariants }));
  };

  const generateUniqueFileName = (originalFileName) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${randomString}-${originalFileName}`;
  };

  //  const uploadImages = async (files) => {
  //   const uploadedFilePaths = [];

  //   for (let i = 0; i < files.length; i++) {
  //     const file = files[i];
  //     if (!file) continue; // ✅ Skip null/undefined files

  //     const formData = new FormData();
  //     const uniqueFileName = generateUniqueFileName(file.name);
  //     formData.append("image", file);

  //     try {
  //       const response = await fetch("/api/product/upload", {
  //         method: "POST",
  //         body: formData,
  //       });

  //       if (response.ok) {
  //         const { savedImages } = await response.json();
  //         uploadedFilePaths.push(savedImages); // push string or array based on your API
  //       } else {
  //         toast.error(response.statusText);
  //       }
  //     } catch (error) {
  //       toast.error(error.message);
  //     }
  //   }

  //   return uploadedFilePaths;
  // };

  const uploadImages = async (files) => {
    const uploadedFilePaths = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const formData = new FormData();
      const uniqueFileName = generateUniqueFileName(file.name);
      formData.append("image", file);

      try {
        const response = await fetch("/api/product/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const { savedImages } = await response.json();
          // Extract the original filename from the generated unique name
          const parts = savedImages.split('-');
          const originalFileName = parts.pop();
          uploadedFilePaths.push(originalFileName); // Push only the original filename
        } else {
          toast.error(response.statusText);
        }
      } catch (error) {
        toast.error(error.message);
      }
    }

    return uploadedFilePaths;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct((prev) => {
      let nextValue = type === "checkbox" ? checked : value;
      if (name === "chk_display_store_stock") {
        nextValue = Number(value) === 1 ? 1 : 0;
      }
      const next = {
        ...prev,
        [name]: nextValue,
      };
      if (name === "name") {
        next.slug = slugifyName(value);
      }
      return next;
    });
  };

  const handleTagsChange = (selectedOptions) => {

    setProduct((prev) => ({
      ...prev,
      tags: selectedOptions.map((option) => option.value),
    }));
  };
  const handleBrandChange = (selectedOptions) => {
    console.log(selectedOptions);
    setProduct((prev) => ({
      ...prev,
      brand: selectedOptions.value,
    }));
  };
  const handleFeaturedChange = (selectedOptions) => {
    setProduct(prev => ({
      ...prev,
      featured_products: selectedOptions.map(option => option.value),
    }));
  };

  const fetchallproducts = async () => {
    try {
      const response = await fetch("/api/product/get?field=name");
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        const data = result;
        console.log(data);
        const prodOptions = data.map((prod) => ({
          value: prod._id,
          label: prod.name,
        }));
        setAllProducts(prodOptions);
      }
    } catch (error) {
      toast.error(error);
    } finally {
    }
  }
  // const handleFilterChange = (selectedOptions) => {
  //   console.log(selectedOptions);
  //   // Extract only the 'value' from each selected option object
  //   const selectedValues = selectedOptions.map((option) => option.value);

  //   setProduct((prev) => ({
  //     ...prev,
  //     // Store an array of strings, not objects
  //     filters: selectedValues,
  //   }));
  // };

  const handleupdatefilterchange = (filters) => {
    const selectedValues = filters.map((option) => option.value);

    setProduct((prev) => ({
      ...prev,
      // Store an array of strings, not objects
      filters: selectedValues,
    }));
  }

  const handleFilterChange = (selectedOptions) => {
    console.log(selectedOptions);
    setProduct(prev => ({
      ...prev,
      filters: selectedOptions,
    }));
  };

  const handleHighlightChange = (index, value) => {
    setProduct((prevProduct) => {
      const updatedHighlights = [...prevProduct.product_highlights];
      updatedHighlights[index] = value;
      return {
        ...prevProduct,
        product_highlights: updatedHighlights,
      };
    });
  };

  const addHighlight = () => {
    setProduct((prevProduct) => ({
      ...prevProduct,
      product_highlights: [...prevProduct.product_highlights, ""], // Add an empty string for a new highlight input
    }));
  };

  const removeHighlight = (indexToRemove) => {
    setProduct((prevProduct) => ({
      ...prevProduct,
      product_highlights: prevProduct.product_highlights.filter(
        (_, index) => index !== indexToRemove
      ),
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Get existing product images (filter out blob URLs and nulls)
      const existingProductImages = product.images.filter(
        (img) => typeof img === "string" && !img.startsWith("blob:")
      );

      // Get existing overview images (filter out blob URLs and nulls)
      const existingOverviewImages = product.overviewImage.filter(
        (img) => img && typeof img === "string" && !img.startsWith("blob:")
      );

      // Filter out empty warranty entries
      const validWarranties = warranties.filter(
        warranty => warranty.year !== "" && warranty.amount !== "" && warranty.year != null && warranty.amount != null
      );

      // Clean product data
      const { brand_code, removedOverviewImages, ...restProduct } = product;
      const trimmedBrandCode = (brand_code ?? '').toString().trim();

      const cleanedProduct = {
        ...restProduct,
        ...(trimmedBrandCode ? { brand_code: trimmedBrandCode } : {}),
        slug: (product.slug || "").trim() || slugifyName(product.name),
        extend_warranty: validWarranties.length > 0 ? validWarranties : [],
        filters: (product.filters || []).map(f => f.value),
        related_products: product.related_products || [],
        add_ons: product.add_ons || [],
        category: product.category || "",
        product_highlights: product.product_highlights || [],
        chk_display_store_stock:
          Number(product.chk_display_store_stock) === 1 ? 1 : 0,
        // Product images
        images: existingProductImages,
        // FIX: Send as overview_image (database field name) not overviewImage
        overview_image: existingOverviewImages,
        // Send removed overview images to backend
        removedOverviewImages: removedOverviewImages || []
      };

      console.log("Overview images to save:", existingOverviewImages);
      console.log("Overview images to remove:", removedOverviewImages);

      // Upload product images
      (product.files || []).forEach(file => {
        if (file) formData.append("images", file);
      });

      // Upload NEW overview images
      (product.overviewImageFile || []).forEach(file => {
        if (file) formData.append("overviewImages", file);
      });

      // Variants with images
      const variantsWithImages = (product.variants || []).map((variant, i) => {
        const files = variantImages[i]?.images || [];
        files.forEach((file, j) => {
          if (file) {
            formData.append(`variant_${i}_image_${j}`, file);
          }
        });
        return { ...variant, images: [] };
      });

      const finalProductData = {
        ...cleanedProduct,
        extend_warranty: validWarranties,
      };

      formData.append("product", JSON.stringify(finalProductData));
      formData.append("variant", JSON.stringify(variantsWithImages));
      formData.append("highlights", JSON.stringify(cleanedProduct.product_highlights));

      const apiUrl = mode === "edit" ? `/api/product/update/${productId}` : "/api/product/add";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(apiUrl, { method, body: formData });
      const responseData = await response.json();

      if (response.ok) {
        toast.success(mode === "edit" ? "Product updated" : "Product added");
        if (mode === "edit" && typeof onSuccess === "function") onSuccess(responseData.product || { _id: productId, ...finalProductData });
        else router.push("/admin/product");
      } else {
        toast.error(responseData.error || "Something went wrong");
      }
    } catch (error) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };


  // ✅ Add group label into every option
  const updatedFilter = Filter.map((group) => ({
    ...group,
    options: group.options.map((option) => ({
      ...option,
      groupLabel: group.label,
    })),
  }));


  const handleAddVariantAttribute = () => {
    setProduct(prev => ({
      ...prev,
      variantAttributes: [
        ...prev.variantAttributes,
        {
          name: ``,
          options: []
        }
      ]
    }));
  };
  const handleVariantAttributeChange = (index, field, value) => {
    const updatedAttributes = product.variantAttributes.map((attr, i) =>
      i === index ? { ...attr, [field]: value } : attr
    );

    setProduct(prev => ({
      ...prev,
      variantAttributes: updatedAttributes
    }));
  };

  const handleVariantOptionChange = (index, value) => {
    const options = value.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    if (options.length === 0) return;
    handleVariantAttributeChange(index, 'options', options);
  };

  const handleAddFilter = () => {
    setProduct(prev => ({
      ...prev,
      filters: [...prev.filters, { name: "", value: "" }]
    }));
  };

  const handleRemoveFilter = (index) => {
    const newFilters = product.filters.filter((_, i) => i !== index);
    setProduct(prev => ({ ...prev, filters: newFilters }));
  };

  const nextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      toast.error(error);
    } else {
      if (currentStep < steps.length) setCurrentStep(prev => prev + 1);
    }
  };

  const closeModal = () => {
    setValidationError(null);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const StepNavigation = () => (
    <div className="flex justify-between mt-6">
      {currentStep > 1 && (
        <button
          type="button"
          onClick={prevStep}
          className="bg-gray-200 px-4 py-2 rounded flex items-center gap-2"
        >
          <FaArrowLeft /> Previous
        </button>
      )}
      {currentStep < steps.length ? (
        <button
          type="button"
          onClick={nextStep}
          className="bg-[#d72828] text-white px-4 py-2 rounded flex items-center gap-2"
        >
          Next <FaArrowRight />
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting}
          className={`text-white px-5 py-2 rounded flex items-center gap-2 font-medium ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>{mode === "edit" ? "Updating..." : "Publishing..."}</span>
            </>
          ) : (
            <span>{mode === "edit" ? "Update Product" : "Publish Product"}</span>
          )}
        </button>
      )}
    </div>
  );

  const ProgressStepper = () => (
    <div className="mb-8">
      <div className="border-b border-gray-200">
        <nav className="flex justify-between space-x-4">
          {steps.map((tab, index) => (
            <button
              type="button"
              key={index}
              // onClick={() => setCurrentStep(index- 1)}
              className={`py-2 px-4 text-sm font-medium focus:outline-none ${currentStep - 1 === index
                ? "border-b-2 border-[#d72828] text-[#d72828]"
                : "text-gray-600 hover:text-[#d72828]"
                }`}
            >
              {tab.title}
            </button>
          ))}
        </nav>
      </div>
      {/* <div className="flex items-center justify-between relative">
     
        <div className="absolute  left-0 right-0 h-1 bg-gray-200 transform -translate-y-1/2">
          <div
            className="bg-[#d72828] h-full transition-all duration-300"
            style={{ 
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
            }}
          ></div>
        </div>
  
        {steps.map((step, index) => {
          const isCompleted = currentStep > index + 1;
          const isActive = currentStep === index + 1;
          
          return (
            <div 
              key={step.title}
              className="relative z-10 flex flex-col items-center"
            >
           
              <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${isCompleted ? 'bg-[#d72828]' : isActive ? 'bg-[#d72828]' : 'bg-gray-200'}
                transition-colors duration-300`}>
                
                {isCompleted ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                ) : (
                  <span className={`text-sm ${isActive ? 'text-white' : 'text-gray-600'}`}>
                    {index + 1}
                  </span>
                )}
              </div>
  
           
              <span className={`text-xs mt-2 text-center ${
                isActive ? 'text-[#d72828] font-medium' : 'text-gray-600'
              }`}>
              </span>
            </div>
          );
        })}
      </div> */}
    </div>
  );

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!product.name || !product.item_code || !product.price || !product.special_price || product.quantity === "" || product.quantity === null || product.quantity === undefined || !selectedCategory || !brand) {
          return "Please fill in all required fields: Product Name, Item Code, ,Category,Price,Special Price and brand.";
        }
        break;
      case 2:
        if (!product.images.some(img => img)) {
          return "Please fill in all required fields: Images.";
        }
        break;
      case 3:
        if (product.hasVariants) {
          const allFilled = product.variants.every((v, i) => {
            const hasAll =
              v.variant_attribute_name?.trim() &&
              v.options?.trim() &&
              v.item_code?.trim() &&
              v.price !== '' && v.price !== null &&
              v.special_price !== '' && v.special_price !== null &&
              v.quantity !== '' && v.quantity !== null &&
              v.stock_status?.trim() &&
              v.status?.trim();

            if (!hasAll) {
              console.log('Missing field in variant index:', i, v);
            }

            return hasAll;
          });

          if (!allFilled) {
            return 'Please fill in all required variant fields.';
          }
        }

        break;

      case 4:
        if (!product.meta_title || !product.description || !product.search_keywords) {
          return "Please fill in all required fields: Meta Title and Meta Description.";
        }
        break;
      default:
        return null;
    }
    return null;
  };

  const ValidationModal = ({ message, onClose }) => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-red-500">{message}</p>
        <button
          onClick={onClose}
          className="mt-4 bg-[#d72828] text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
  return (
    <div className="mx-auto p-6 bg-white shadow-md rounded-lg border border-gray-200" >
      {isGeneratingContent && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Generating product content from OpenAI. Please wait…
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">{mode === "edit" ? " " : "Add Product"}</h2>
      <ProgressStepper />
      <ToastContainer />
      {validationError && <ValidationModal message={validationError} onClose={closeModal} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* <h3 className="text-xl font-semibold mb-4">Product Information</h3> */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name*</label>
                <input
                  type="text"
                  name="name"
                  value={product.name || ''}
                  onChange={handleChange}
                  className={`w-full border p-2 rounded ${product.name.length < 5 && product.name.length > 0 ? "border-red-500" : ""
                    }`}
                  required
                  minLength={5}  // HTML5 validation (but may not show until form submission)
                />
                {/* Show error message if less than 20 chars */}
                {product.name.length > 0 && product.name.length < 5 && (
                  <p className="text-red-500 text-xs mt-1">
                    Minimum 5 characters required (currently: {product.name.length})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                <input type="text" name="item_code" value={product.item_code} onChange={handleChange} className="w-full border p-2 rounded" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug*</label>
                <input
                  type="text"
                  name="slug"
                  value={product.slug || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
                <div className="border rounded-md">
                  {renderCategoryTree(categories)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <Select
                  options={brand}
                  value={brand.find(b => b.value === product.brand)}
                  onChange={handleBrandChange}
                  placeholder="Select brand..."

                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MRP Price</label>
                <input type="number" name="price" value={product.price} onChange={handleChange} className="w-full border p-2 rounded" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                <input type="number" name="special_price" value={product.special_price} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" name="quantity" value={product.quantity} onChange={handleChange} className="w-full border p-2 rounded" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                <select
                  name="stock_status"
                  value={product.stock_status}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Code</label>
                <input
                  type="text"
                  name="brand_code"
                  value={product.brand_code || ""} // optional and controlled
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>

          </div>
        )}

        {/* Step 2: Pricing & Stock */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* <h3 className="text-xl font-semibold mb-4">Pricing & Stock </h3> */}

            <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md">
              <div className="flex items-center">
                <label className="w-1/4 text-sm font-medium text-gray-700">Images (679×679)</label>

                <div className="w-3/4 pl-4">
                  <div className="overflow-x-auto">
                    <div className="min-w-full divide-y divide-gray-200">
                      <div className="bg-gray-50">
                        <div className="grid grid-cols-12 gap-4 py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="col-span-5">Image upload</div>
                          <div className="col-span-5">Image</div>
                          <div className="col-span-2">Actions</div>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-200">

                        {(product.images || []).map((img, index) => (
                          <div key={index} className="grid grid-cols-12 gap-4 items-center py-4 px-4">
                            <div className="col-span-5">
                              <input
                                type="file"
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-red-50 file:text-[#d72828]
                                    hover:file:bg-red-100"
                                accept="image/*"
                                onChange={(e) => handleImageChange(index, e)}
                                required={index === 0}
                                key={`file-${index}-${product.images[index] ? 'filled' : 'empty'}`}
                              />
                            </div>

                            <div className="col-span-5">
                              <img
                                className="w-20 h-20 object-cover rounded border border-gray-200"
                                alt={`Preview ${index + 1}`}
                                src={
                                  product.images[index]?.startsWith('http') ||
                                    product.images[index]?.startsWith('blob:') ||
                                    product.images[index]?.startsWith('data:')
                                    ? product.images[index]
                                    : `/uploads/products/${product.images[index] || 'no-image.jpg'}`
                                }
                              />
                            </div>


                            <div className="col-span-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => AddproductImage(index)}
                                    className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                  >
                                    <svg
                                      className="h-5 w-5"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM5 5h14v14H5V5zm9 9h-3v3h-2v-3H6v-2h3V9h2v3h3v2z" />
                                    </svg>
                                  </button>

                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage1(index)}
                                    className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  >
                                    <svg
                                      className="h-5 w-5"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </div>

                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* <button type="button" onClick={AddproductImage} className="px-3 py-1.5 bg-[#d72828] text-white text-sm rounded hover:bg-[#d72828] transition-colors">Add Image</button> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              {/* <textarea name="description" value={product.description || ''} onChange={handleChange} className="w-full border p-2 rounded" rows="4"></textarea> */}
              <TinyEditor
                key={editorRevision}
                value={product.description || ""}
                onChange={handleChange}
              />

              {/* <h3 className="mt-4 font-semibold">Preview:</h3>
                      <div
                        className="border p-3 rounded bg-gray-50"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      /> */}
            </div>
            <div className="space-y-6">
              {/* Overview Image */}
              <div className="flex flex-col md:flex-row gap-6 p-6 bg-white rounded-lg shadow-md">
                <div className="w-full md:w-1/4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overview Images (416×416)
                  </label>
                </div>

                <div className="w-full md:w-3/4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border rounded-lg overflow-hidden">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Image upload</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {product.overviewImage.map((image, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-3">
                              <input
                                type="file"
                                className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-medium
            file:bg-red-50 file:text-[#d72828]
            hover:file:bg-red-100"
                                accept="image/*"
                                onChange={(e) => handleOverviewImageChange(index, e.target.files)}
                              />
                              {image && (
                                <div className="mt-2 flex items-center space-x-4">
                                  <img
                                    src={
                                      typeof image === 'string' &&
                                        (image.startsWith('http') ||
                                          image.startsWith('blob:') ||
                                          image.startsWith('data:'))
                                        ? image
                                        : `/uploads/products/${image}`
                                    }
                                    alt={`Preview ${index}`}
                                    className="w-20 h-20 object-cover border rounded"
                                  />
                                  <span className="text-xs text-gray-500">Preview</span>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <img
                                className="w-20 h-20 object-cover rounded border border-gray-200"
                                alt={`Preview ${index + 1}`}
                                src={
                                  image && typeof image === 'string'
                                    ? (image.startsWith('http') ||
                                      image.startsWith('blob:') ||
                                      image.startsWith('data:'))
                                      ? image
                                      : `/uploads/products/${image}`
                                    : '/uploads/products/no-image.jpg'
                                }
                              />
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={handleAddOverviewImage}
                                  className="inline-flex items-center p-2 rounded-full text-white bg-green-600 hover:bg-green-700"
                                >
                                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM5 5h14v14H5V5zm9 9h-3v3h-2v-3H6v-2h3V9h2v3h3v2z" />
                                  </svg>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveOverviewImage(index)}
                                  className="inline-flex items-center p-2 rounded-full text-white bg-red-600 hover:bg-red-700"
                                >
                                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>
                </div>
              </div>

              {/* Product Description Editor */}
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1 ">
                  Overview Description
                </label>
                <textarea name="overviewdescription" value={product.overviewdescription || ''} onChange={handleChange} className="w-full border p-2 pt-0 rounded" rows="4"></textarea>
              </div>
            </div>

          </div>
        )}

        {/* Step 3: Variants & Filters */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Filters</h3>

            <div className="border p-4 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
              <Select
                options={updatedFilter}
                isMulti
                hideSelectedOptions={false}
                closeMenuOnSelect={false}
                components={{ Option: CustomOption }}

                // ✅ Search by option + group heading
                filterOption={(option, inputValue) => {
                  const search = inputValue.toLowerCase();

                  return (
                    option.label.toLowerCase().includes(search) ||
                    option.value.toLowerCase().includes(search) ||
                    option.data.groupLabel.toLowerCase().includes(search)
                  );
                }}

                value={
                  Array.isArray(product.filters)
                    ? product.filters.every((f) => typeof f === "string")
                      ? updatedFilter
                        .flatMap((g) => g.options)
                        .filter((o) => product.filters.includes(o.value))
                      : product.filters
                    : []
                }

                onChange={handleFilterChange}
                placeholder="Select filters..."

                styles={{
                  groupHeading: (base) => ({
                    ...base,
                    backgroundColor: "#f3f4f6",
                    color: "#1f2937",
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderBottom: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }),

                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "#e6f4ea"
                      : state.isFocused
                        ? "#f9fafb"
                        : "white",
                    color: "#111827",
                    fontWeight: state.isSelected ? 600 : 400,
                  }),
                }}
              />
              {/* <Select
  options={Filter}
  isMulti
  hideSelectedOptions={false}  // ✅ keeps selected options visible in dropdown
  closeMenuOnSelect={false}    // ✅ keeps dropdown open while selecting multiple
  components={{ Option: CustomOption }}
  value={
    Array.isArray(product.filters)
      ? product.filters.every(f => typeof f === 'string')
        ? Filter.flatMap(g => g.options).filter(o => product.filters.includes(o.value))
        : product.filters
      : []
  }
  onChange={handleFilterChange}
  placeholder="Select filters..."
  styles={{
    groupHeading: (base) => ({
      ...base,
      backgroundColor: '#f3f4f6',
      color: '#1f2937',
      fontWeight: 600,
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      borderRadius: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#e6f4ea' : state.isFocused ? '#f9fafb' : 'white',
      color: '#111827',
      fontWeight: state.isSelected ? 600 : 400,
    }),
  }}
/> */}
              {/* <Select
  options={Filter}
  isMulti
  value={
    Array.isArray(product.filters)
      ? product.filters.every(f => typeof f === 'string')
        ? Filter.flatMap(g => g.options).filter(o => product.filters.includes(o.value))
        : product.filters
      : []
  }
  onChange={handleFilterChange}
  placeholder="Select filters..."
  styles={{
    groupHeading: (base) => ({
      ...base,
      backgroundColor: '#f3f4f6',   // light gray bar
      color: '#1f2937',             // dark text
      fontWeight: 600,
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      borderRadius: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }),
  }}
/> */}


            </div>

            {/* Extended Warranty Section */}
            {/* <div className="border p-4 rounded">
  <label className="block text-sm font-medium text-gray-700 mb-2">Extended Warranty</label>

 {warranties.map((warranty, index) => (
  <div key={index} className="flex space-x-2 mb-2">
    <label className="text-sm font-medium mt-2">Years:</label>
    <input
      type="number"
      value={warranty.year || ""}
      onChange={(e) => handleWarrantyChange(index, "year", e.target.value)}
      className="w-1/2 border p-2 rounded"
      placeholder="Years"
    />
<label className="text-sm font-medium mt-2">Price:</label>
    <input
      type="number"
      value={warranty.amount || ""}
      onChange={(e) => handleWarrantyChange(index, "amount", e.target.value)}
      className="w-1/2 border p-2 rounded"
      placeholder="Amount"
    />

    <button type="button" onClick={addWarranty} className="p-2 bg-green-600 text-white rounded-full">+</button>
    {warranties.length > 1 && (
      <button
        type="button"
        onClick={() => removeWarranty(index)}
        className="p-2 bg-red-600 text-white rounded-full"
      >
        -
      </button>
    )}
  </div>
))}

</div> */}
            <div className="border p-4 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extended Warranty Plans
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Search by product description — 1yr / 2yr / 3yr / 4yr plans
              </p>
              <WarrantySearchInput
                value={product.warranty_ids}
                onChange={(ids) =>
                  setProduct((prev) => ({ ...prev, warranty_ids: ids }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border p-4 rounded">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
                <input
                  type="text"
                  name="model_number"
                  value={product.model_number || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  placeholder="Enter model number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Movement</label>
                <input
                  type="text"
                  name="movement"
                  value={product.movement || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  placeholder="Enter movement type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <input
                  type="text"
                  name="size"
                  value={product.size || ''}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  placeholder="e.g., 42mm, 40mm, etc."
                />
              </div>
            </div>

          </div>
        )}





        {/* Step 3: status */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input
                type="text"
                name="meta_title"
                value={product.meta_title || ''}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            {/* Meta Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
              <textarea
                name="search_keywords"
                value={product.search_keywords || ''}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                rows="2"
              />
            </div>
            {/* Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <textarea
                name="meta_description"
                value={product.meta_description || ''}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Specifications
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Example: Ram:8GB, capcity:1.5 ton(should seperated by comma)
              </p>
              <textarea
                name="key_specifications"
                value={product.key_specifications || ''}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                rows="3"
              ></textarea>
            </div>





            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Highlights
              </label>
              <p className="text-xs text-gray-500 mb-2">
                ➤ Add highlights by clicking the <span className="font-semibold">green + button</span>.
                <br />
                ➤ Each highlight should be written in <span className="italic">key: value</span> format.
                <br />
                Example: <span className="text-gray-600">Processor: Snapdragon 8 Gen 2</span>, <span className="text-gray-600">Battery: 5000 mAh</span>, <span className="text-gray-600">Display: 6.5 inch AMOLED</span>
              </p>

              {(product.product_highlights && product.product_highlights.length > 0 ? product.product_highlights : [""]).map((highlight, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={highlight || ""}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder={`Highlight #${index + 1}`}
                  />
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <button
                        type="button"
                        onClick={addHighlight}
                        className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      {product.product_highlights && product.product_highlights.length > 0 && (
                        <button
                          type="button"
                          onClick={() => removeHighlight(index)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Featured Products</label>
              <Select
                isMulti  // Enable multi-select
                options={allproducts}
                onChange={handleFeaturedChange}
                value={allproducts.filter(option =>
                  Array.isArray(product.featured_products) && product.featured_products.includes(option.value)
                )}

                placeholder="Select products for featured..."
                closeMenuOnSelect={false}
              />
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Products</label>
              <Select
                isMulti
                options={allproducts.filter(p => p.value !== product._id)} // exclude current product if editing
                onChange={handleRelatedProductsChange}
                value={allproducts.filter(option =>
                  Array.isArray(product.related_products) && product.related_products.includes(option.value)
                )}
                placeholder="Select related products..."
                closeMenuOnSelect={false}
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Ons Products</label>
              <Select
                isMulti
                options={allproducts.filter(p => p.value !== product._id)} // exclude current product if editing
                onChange={handleAddOnsProductsChange}
                value={allproducts.filter(option =>
                  Array.isArray(product.add_ons) && product.add_ons.includes(option.value)
                )}
                placeholder="Select add ons products..."
                closeMenuOnSelect={false}
              />
            </div>




            {/* <div>
              <label className="block text-sm font-medium text-gray-700">Warranty</label>
              <input
                type="number"
                name= "warranty"
               
                placeholder="Warranty"
                value={product.warranty || ''}
                name="extended_warranty"
                placeholder="Extended Warranty"
                value={product.extended_warranty || ''}
                onChange={handleChange}
                className="w-full border p-2 rounded mb-2"
              />
            </div> */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={product.status || 'Active'}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Store Stock Check
              </label>
              <select
                name="chk_display_store_stock"
                value={Number(product.chk_display_store_stock) === 1 ? 1 : 0}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              >
                <option value={0}>No</option>
                <option value={1}>Yes</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Yes (1): run warehouse/showroom least-stock check for PDP enquiry. No (0): skip.
              </p>
            </div>
          </div>
        )}
        <StepNavigation />
      </form>
    </div>
  );
}