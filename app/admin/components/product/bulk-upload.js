"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function BulkUploadPage() {
  const [excelFile, setExcelFile] = useState(null);
  const [excelFileMovement, setExcelFileMovement] = useState(null);

  const [excelFiles, setExcelFiles] = useState(null);
  const [imageZips, setImageZips] = useState(null);

  const [productFilterValue, setProductFilterValue] = useState(null);
  const [categoryUpload, setCategoryUpload] = useState(null);
  const [imageZip, setImageZip] = useState(null);
  const [overviewZip, setOverviewZip] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState(null);
  const [isFilterUploadLoading, setIsFilterUploadLoading] = useState(false);
  const [isBulkUploadLoading, setIsBulkUploadLoading] = useState(false);
  const [isParticularDataBulkUploadLoading, setIsParticularDataBulkUploadLoading] = useState(false);
  const [isProductDetailsDataBulkUploadLoading, setIsProductDetailsDataBulkUploadLoading] = useState(false);
  const [isParticularImageWithDataBulkUploadLoading, setIsParticularImageWithDataBulkUploadLoading] = useState(false);
  const [isFilterGroupUploadLoading, setIsFilterGroupUploadLoading] = useState(false);
  const overviewFormRef = useRef(null);
  const itemparticularwithimageref = useRef(null);
  const filterValueFormRef = useRef(null);
  const movementFormRef = useRef(null);
  const filterGroupFormRef = useRef(null);
  const filterFormRef = useRef(null);
  const categoryFormRef = useRef(null);
  const warrantyFileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedSection, setSelectedSection] = useState("section-product-overview");

  const sap_featuresFormRef = useRef(null);
  const product_nameRef = useRef(null);
  const product_descriptionRef = useRef(null);
  const product_metaRef = useRef(null);
  const category_metaRef = useRef(null);
  const dynamic_filter_uploadRef = useRef(null);
  const [sap_features, setSap_features] = useState(null);
  const [product_name, setProduct_name] = useState(null);
  const [product_description, setProduct_description] = useState(null);
  const [product_meta, setProduct_meta] = useState(null);
  const [category_meta, setCategory_meta] = useState(null);
  const [dynamic_filter_upload, setDynamic_filter_upload] = useState(null);
  const [warrantyFile, setWarrantyFile] = useState(null);
  const [isWarrantyUploadLoading, setIsWarrantyUploadLoading] = useState(false);
  const [warrantyMapFile, setWarrantyMapFile] = useState(null);
  const [isWarrantyMapLoading, setIsWarrantyMapLoading] = useState(false);
  const warrantyMapFileRef = useRef(null);
  const [pincodeFile, setPincodeFile] = useState(null);
  const [isPincodeUploadLoading, setIsPincodeUploadLoading] = useState(false);
  const pincodeFileRef = useRef(null);
  const [brandManufacturerFile, setBrandManufacturerFile] = useState(null);
  const [isBrandManufacturerUploadLoading, setIsBrandManufacturerUploadLoading] = useState(false);
  const brandManufacturerFileRef = useRef(null);
  const notifiedRef = useRef(false);
  const fileInputRef = useRef(null);
  const fileBulkParticularInputRef = useRef(null);
  const fileBulkUploadAddonsInputRef = useRef(null);
  const fileImageBulkParticularInputRef = useRef(null);

  const router = useRouter();
  const showToast = (type, message) => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  };

  const resetUploadForm = (opts = {}) => {
    // clear file states
    setExcelFile(null);
    setExcelFiles(null);
    setExcelFileMovement(null);
    setProductFilterValue(null);
    setSap_features(null);
    setProduct_name(null);
    setProduct_description(null);
    setProduct_meta(null);
    setCategory_meta(null);
    setDynamic_filter_upload(null);
    setCategoryUpload(null);
    setImageZip(null);
    setImageZips(null);
    setOverviewZip(null);
    setWarrantyFile(null);
    setWarrantyMapFile(null);
    setPincodeFile(null);
    // clear flags and messages
    setIsLoading(false);
    setActiveUploadType(null);
    setIsFilterUploadLoading(false);
    setIsBulkUploadLoading(false);
    setIsParticularDataBulkUploadLoading(false);
    setIsProductDetailsDataBulkUploadLoading(false);
    setIsParticularImageWithDataBulkUploadLoading(false);
    setIsFilterGroupUploadLoading(false);
    setMessage("");

    // reset file input elements and forms if refs exist
    try { overviewFormRef.current?.reset(); } catch (e) { }
    try { itemparticularwithimageref.current?.reset(); } catch (e) { }
    try { movementFormRef.current?.reset(); } catch (e) { }
    try { filterGroupFormRef.current?.reset(); } catch (e) { }
    try { filterFormRef.current?.reset(); } catch (e) { }
    try { categoryFormRef.current?.reset(); } catch (e) { }
    try { filterValueFormRef.current?.reset(); } catch (e) { }
    if (warrantyFileRef.current) warrantyFileRef.current.value = "";

    // allow next upload to show a toast
    notifiedRef.current = false;
  };




  /* ---------------- UPLOAD FILE ---------------- */
  const handleUpload = async () => {
    if (!file) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/categories/bulk-export", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      // ✅ Show toast with upload result
      showToast(
        "success",
        `Upload Completed! Updated: ${data.updated}, Skipped: ${data.skipped}`
      );

      // Reset file input
      setFile(null);
      document.getElementById("category-file-input").value = "";

    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  //NEED TO WORK FOR EXTENDED WARRENTY UPDATION...
  const handleExtendedWarrentySubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateFilterFile(excelFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);

    setIsFilterUploadLoading(true);

    try {
      const res = await fetch("/api/extendedWarrenty/update_extended_warrenty", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Aggregate into one toast message
      const hasDetails = Array.isArray(data.details) && data.details.length > 0;
      if (res.ok || res.status === 207) {
        const msg = data.message || (hasDetails ? `Upload completed with ${data.details.length} issues.` : "Upload completed successfully.");
        const toastType = hasDetails ? "info" : "success";
        showToast(toastType, msg);
      } else {
        const msg = data.error || "Upload failed";
        showToast("error", msg);
      }

      // ensure form/inputs cleared
      resetUploadForm();

    } catch (err) {
      console.error("Upload error:", err);
      showToast("error", "Upload failed. Please try again.");
      resetUploadForm();
    } finally {
      setIsFilterUploadLoading(false);
    }
  };


  //BULK UPDATION...
  const handleBulkCategorySubcatSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile) {
      showToast("error", "Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFile); // ✅ MUST BE "file"

    setIsBulkUploadLoading(true);

    try {
      const res = await fetch("/api/categories/bulkuploadcatsub", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          "success",
          `Updated: ${data.updated}, Skipped: ${data.skipped}`
        );

        // ✅ RESET STATE
        setExcelFile(null);

        // ✅ RESET INPUT UI (VERY IMPORTANT)
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

      } else {
        showToast("error", data.message || "Upload failed");
      }

      setExcelFile(null);
    } catch (err) {
      console.error(err);
      showToast("error", "Upload failed");
    } finally {
      setIsBulkUploadLoading(false);
    }
  };


  //BULK UPDATION WITHOUT IMAGE...
  const handleBulkParticularDetailsSubcatSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile) {
      showToast("error", "Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFile); // ✅ MUST BE "file"

    setIsParticularDataBulkUploadLoading(true);

    try {
      console.log("[Particular Bulk Upload One] Uploading file:", excelFile?.name);

      const res = await fetch("/api/categories/particularDataBulkupload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("[Particular Bulk Upload One] API response:", data);

      if (data.detectedHeaders) {
        console.log(
          "[Particular Bulk Upload One] Detected Excel headers:",
          data.detectedHeaders
        );
      }

      if (data.skipDetails?.length) {
        console.table(data.skipDetails);
        console.warn(
          "[Particular Bulk Upload One] Skip reasons:",
          data.skipDetails
        );
      }

      if (res.ok) {
        showToast(
          "success",
          `Updated: ${data.updated}, Skipped: ${data.skipped}`
        );

        // ✅ RESET STATE
        setExcelFile(null);

        // ✅ RESET INPUT UI (VERY IMPORTANT)
        if (fileBulkParticularInputRef.current) {
          fileBulkParticularInputRef.current.value = "";
        }

      } else {
        showToast("error", data.message || "Upload failed");
      }

      setExcelFile(null);
    } catch (err) {
      console.error(err);
      showToast("error", "Upload failed");
    } finally {
      setIsParticularDataBulkUploadLoading(false);
    }
  };


  //BULK UPDATION ..
  const handleBulkUploadForAddOnsFrequentRelatedSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile) {
      showToast("error", "Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFile); // ✅ MUST BE "file"

    setIsProductDetailsDataBulkUploadLoading(true);

    try {
      const res = await fetch("/api/categories/productBulkUploaddetailsaddons", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          "success",
          `Updated: ${data.updated}, Skipped: ${data.skipped}`
        );

        // ✅ RESET STATE
        setExcelFile(null);

        // ✅ RESET INPUT UI (VERY IMPORTANT)
        if (fileBulkUploadAddonsInputRef.current) {
          fileBulkUploadAddonsInputRef.current.value = "";
        }

      } else {
        showToast("error", data.message || "Upload failed");
      }

      setExcelFile(null);
    } catch (err) {
      console.error(err);
      showToast("error", "Upload failed");
    } finally {
      setIsProductDetailsDataBulkUploadLoading(false);
    }
  };

  //BULK UPDATION WITH IMAGE...
  /*   const handlewithImageBulkParticularDetailsSubcatSubmit = async (e) => {
    e.preventDefault();
  
    if (!excelFile) {
      showToast("error", "Please upload a file");
      return;
    }
  
    const formData = new FormData();
    formData.append("file", excelFile); // ✅ MUST BE "file"
  
    setIsParticularImageWithDataBulkUploadLoading(true);
  
    try {
      const res = await fetch("/api/categories/particularDataWithImageBulkupload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
  
      if (res.ok) {
        showToast(
          "success",
          `Updated: ${data.updated}, Skipped: ${data.skipped}`
        );
  
        // ✅ RESET STATE
          setExcelFile(null);
  
          // ✅ RESET INPUT UI (VERY IMPORTANT)
          if (fileImageBulkParticularInputRef.current) {
            fileImageBulkParticularInputRef.current.value = "";
          }
  
      } else {
        showToast("error", data.message || "Upload failed");
      }
  
      setExcelFile(null);
    } catch (err) {
      console.error(err);
      showToast("error", "Upload failed");
    } finally {
      setIsParticularImageWithDataBulkUploadLoading(false);
    }
  }; */



  const handlewithImageBulkParticularDetailsSubcatSubmit = async (e) => {
    e.preventDefault();

    if (!excelFiles) {
      showToast("error", "Please upload Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFiles);
    formData.append("zip", imageZips); // ✅ ADD THIS

    setIsParticularImageWithDataBulkUploadLoading(true);

    try {
      const res = await fetch(
        "/api/categories/particularDataWithImageBulkupload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        showToast(
          "success",
          `Updated: ${data.updated}, Skipped: ${data.skipped}`
        );

        setExcelFiles(null);
        setImageZips(null);

        if (fileImageBulkParticularInputRef.current) {
          fileImageBulkParticularInputRef.current.value = "";
        }
      } else {
        showToast("error", data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Upload failed");
    } finally {
      setIsParticularImageWithDataBulkUploadLoading(false);
    }
  };
  const validateFile = (file, allowedExtensions) => {
    if (!file) return false;
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some((ext) => fileName.endsWith(ext));
  };

  useEffect(() => {
    import("react-toastify/dist/ReactToastify.css");
  }, []);

  const validateFilterFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".csv");
  };

  const handleFilterSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateFilterFile(excelFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);

    setIsFilterUploadLoading(true);

    try {
      const res = await fetch("/api/filter/bulk_upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Aggregate into one toast message
      const hasDetails = Array.isArray(data.details) && data.details.length > 0;
      if (res.ok || res.status === 207) {
        const msg = data.message || (hasDetails ? `Upload completed with ${data.details.length} issues.` : "Upload completed successfully.");
        const toastType = hasDetails ? "info" : "success";
        showToast(toastType, msg);
      } else {
        const msg = data.error || "Upload failed";
        showToast("error", msg);
      }

      // ensure form/inputs cleared
      resetUploadForm();

    } catch (err) {
      console.error("Upload error:", err);
      showToast("error", "Upload failed. Please try again.");
      resetUploadForm();
    } finally {
      setIsFilterUploadLoading(false);
    }
  };

  const validateGroupFilterFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".csv");
  };

  const handleFilterGroupSubmit = async (e) => {
    e.preventDefault();

    if (!excelFile || !validateGroupFilterFile(excelFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);

    setIsFilterGroupUploadLoading(true);

    try {
      const res = await fetch("/api/filter_group/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      const hasDetails = Array.isArray(data.details) && data.details.length > 0;
      if (res.ok || res.status === 207) {
        const msg = data.message || (hasDetails ? `Upload completed with ${data.details.length} issues.` : "Upload completed successfully.");
        const toastType = hasDetails ? "info" : "success";
        showToast(toastType, msg);
      } else {
        showToast("error", data.error || "Upload failed");
      }

      resetUploadForm();
    } catch (err) {
      console.error("Upload error:", err);
      showToast("error", "Upload failed. Please try again.");
      resetUploadForm();
    } finally {
      setIsFilterGroupUploadLoading(false);
    }
  };

  const handleCategoryFilterDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_category_filter_upload.xlsx?t=${Date.now()}`;
    link.download = "sample_category_filter_upload.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCategoryBulkItemCodeCatSubcatDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_category_Bulk_upload.xlsx?t=${Date.now()}`;
    link.download = "item_code_category_bulk_upload.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParticularDataBulkUploadDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_item_code_particular_data.xlsx?t=${Date.now()}`;
    link.download = "item_particular_bulk_upload_part_one_without_image.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProductAddOnsForDataBulkUploadDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/data_for_frequently_addons_and_related_products.xlsx?t=${Date.now()}`;
    link.download = "data_for_frequently_addons_and_related_products.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageDataBulkUploadDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_item_code_with_image_particular_data.xlsx?t=${Date.now()}`;
    link.download = "item_particular_bulk_upload_part_two_with_image.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleFilterGroupSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_filter.xlsx?t=${Date.now()}`;
    link.download = "FilterGroupSample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_filter_upload.xlsx?t=${Date.now()}`;
    link.download = "FilterUploadSample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSampleDownloadExtendedWarrenty = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/extended_warrenty_sample_file.xlsx?t=${Date.now()}`;
    link.download = "ExtendedWarrentySample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleMovement = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sample_bulk_upload.xlsx?t=${Date.now()}`;
    link.download = "MovementUploadSample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCategories = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/sampleCategory.xlsx?t=${Date.now()}`;
    link.download = "Category_Bulk_Upload_Sample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleSubmit = async (e, uploadType) => {
    console.log(uploadType, 'teid')
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    if (uploadType == "overview") {

      // Validate required files - only Excel is required now
      if (!excelFile || !validateFile(excelFile, [".xlsx", ".csv"])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        return;
      }

      // Validate optional image ZIP file
      if (imageZip && !validateFile(imageZip, [".zip"])) {
        showToast("error", "Please upload a valid .zip file for product images.");
        return;
      }

      // Validate optional Overview ZIP file
      if (overviewZip && !validateFile(overviewZip, [".zip"])) {
        showToast("error", "Please upload a valid .zip file for overview images.");
        return;
      }

      setIsLoading(true);
      setMessage(null);

      // const formData = new FormData();
      formData.append("excel", excelFile);
      if (imageZip) formData.append("images", imageZip);
      if (overviewZip) formData.append("overview", overviewZip);

      try {
        const response = await fetch("/api/product/bulk-upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          showToast("success", data.message || "Upload completed successfully.");
        } else {
          showToast("error", data.error || "Upload failed.");
        }

        resetUploadForm();
      } catch (error) {
        showToast("error", error?.message || String(error) || "Upload failed.");
        resetUploadForm();
      } finally {
        setIsLoading(false);
      }

    } else if (uploadType == "movement") {
      if (!excelFileMovement || !validateFile(excelFileMovement, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);
      formData.append("excel", excelFileMovement);

      try {
        const response = await fetch('/api/product/bulk-upload', {
          method: "PATCH",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          showToast("success", data.message || "Movement upload completed.");
        } else {
          showToast("error", data.error || "Movement upload failed.");
        }

        resetUploadForm();
      } catch (error) {
        showToast("error", error?.message || String(error) || "Upload failed.");
        resetUploadForm();
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }

    } else if (uploadType == "filter_values") {
      if (!productFilterValue || !validateFile(productFilterValue, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        // Clear the file input element
        const fileInput = document.getElementById('filter-values-file-input');
        if (fileInput) fileInput.value = "";
        setProductFilterValue(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);
      formData.append("excel", productFilterValue);

      try {
        const response = await fetch('/api/product/bulk-upload/filter', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          showToast("success", data.message || "Filter values uploaded.");
        } else {
          showToast("error", data.error || "Upload failed.");
        }

        resetUploadForm();
        // Clear the file input element
        const fileInput = document.getElementById('filter-values-file-input');
        if (fileInput) fileInput.value = "";
        setProductFilterValue(null);
      } catch (error) {
        showToast("error", error?.message || String(error) || "Upload failed.");
        resetUploadForm();
        // Clear the file input element
        const fileInput = document.getElementById('filter-values-file-input');
        if (fileInput) fileInput.value = "";
        setProductFilterValue(null);
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }

    } else if (uploadType == "category_product") {
      if (!categoryUpload || !validateFile(categoryUpload, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);
      formData.append("excel", categoryUpload);

      try {
        const response = await fetch('/api/product/bulk-upload/category', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          showToast("success", data.message || "Category product upload completed.");
        } else {
          showToast("error", data.error || "Upload failed.");
        }

        resetUploadForm();
      } catch (error) {
        showToast("error", error?.message || String(error) || "Upload failed.");
        resetUploadForm();
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }

    } else if (uploadType == "category") {
      // Read and parse the uploaded Excel/CSV on the client,
      // then call the single-category API per row.
      if (!productFilterValue || !validateFile(productFilterValue, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      try {
        const file = productFilterValue;
        const name = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        let rows = [];

        if (name.endsWith('.csv')) {
          const csvText = new TextDecoder('utf-8').decode(arrayBuffer);
          const workbook = XLSX.read(csvText, { type: 'string' });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        }

        const results = { added: 0, skipped: 0, errors: [] };

        for (const [idx, row] of rows.entries()) {
          // Support common header name variations; adapt if your sheet headers differ.
          const category_name = (row.SubCatgoryName || row.subcatgoryname || row.SubCatgoryName || '').toString().trim();
          const parentid = (row.ParentName || row.parentname || row.parentname || 'none').toString().trim() || 'none';
          /////alert(`Category: ${category_name}, Parent: ${parentid}`);
          const status = (row.Status || row.status || 'Active').toString().trim() || 'Active';
          const show_on_home = (row.ShowOnHome || row.show_on_home || 'No').toString().trim() || 'No';

          if (!category_name) {
            results.errors.push({ row: idx + 2, error: "Missing CategoryName" });
            continue;
          }

          const fd = new FormData();
          fd.append('category_name', category_name);
          // fd.append('parentid_new', parentid);
          fd.append('parent_name', parentid);
          fd.append('status', status);
          fd.append('show_on_home', show_on_home);

          try {
            const res = await fetch('/api/categories/add', { method: 'POST', body: fd });
            const data = await res.json();
            if (res.ok) {
              results.added++;
            } else {
              // If server says category exists, count as skipped, otherwise record error
              const msg = (data && data.error) ? data.error.toString().toLowerCase() : '';
              if (res.status === 400 && msg.includes('already exists')) {
                results.skipped++;
              } else {
                results.errors.push({ row: idx + 2, error: data.error || 'Unknown error' });
              }
            }
          } catch (err) {
            results.errors.push({ row: idx + 2, error: err.message || 'Network error' });
          }
        }

        // Final aggregated toast: only one toast per attempt
        if (results.added > 0 && results.errors.length === 0) {
          showToast("success", `${results.added} categories added.`);
        } else if (results.added > 0 && results.errors.length > 0) {
          showToast("info", `${results.added} categories added. ${results.errors.length} rows failed.`);
        } else if (results.errors.length > 0) {
          showToast("error", `${results.errors.length} rows failed to add categories.`);
        } else {
          showToast("success", "No categories processed.");
        }

        resetUploadForm();
      } catch (err) {
        console.error("Category bulk upload error:", err);
        showToast("error", "Upload failed. " + (err.message || ""));
        resetUploadForm();
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "map_product_categories") {
      if (!productFilterValue || !validateFile(productFilterValue, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        return;
      }
      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);
      try {
        const file = productFilterValue;
        const name = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        let rows = [];
        if (name.endsWith('.csv')) {
          const csvText = new TextDecoder('utf-8').decode(arrayBuffer);
          const workbook = XLSX.read(csvText, { type: 'string' });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        }
        const results = { added: 0, skipped: 0, errors: [] };
        for (const [idx, row] of rows.entries()) {
          const item_code = (row.ItemCode || row.itemno || row.item_no || '').toString().trim();
          const MappingCategory = (row.MappingCategory || row.mappingcategory || row.mapping_category || '').toString().trim();
          if (!item_code) {
            results.errors.push({ row: idx + 2, error: "Missing ItemCode" });
            continue;
          }
          // alert(item_code);
          const fd = new FormData();
          fd.append('item_code', item_code);
          fd.append('MappingCategory', MappingCategory);
          try {
            const res = await fetch('/api/product/bulk-upload/product', {
              method: 'POST',
              body: fd,
            });
            const data = await res.json();
            if (res.ok) {
              results.added++;
            } else {
              // If server says category exists, count as skipped, otherwise record error
              const msg = (data && data.error) ? data.error.toString().toLowerCase() : '';
              if (res.status === 400 && msg.includes('already exists')) {
                results.skipped++;
              } else {
                results.errors.push({ row: idx + 2, error: data.error || 'Unknown error' });
              }
            }
          } catch (err) {
            results.errors.push({ row: idx + 2, error: err.message || 'Network error' });
          }
        }
        // Aggregate messages to a single toast
        if (results.added > 0 && results.errors.length === 0) {
          showToast("success", `${results.added} product(s) were mapped to categories.`);
        } else if (results.added > 0 && results.errors.length > 0) {
          showToast("info", `${results.added} mapped. ${results.errors.length} failed.`);
        } else if (results.errors.length > 0) {
          showToast("error", `${results.errors.length} rows failed to map.`);
        } else {
          showToast("info", "No rows processed.");
        }

        resetUploadForm();
      } catch (err) {
        console.error("Bulk upload error:", err);
        showToast("error", "Upload failed. " + (err.message || ""));
        resetUploadForm();
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "map_product_brands") {
      if (!productFilterValue || !validateFile(productFilterValue, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        return;
      }
      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);
      try {
        const file = productFilterValue;
        const name = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        let rows = [];
        if (name.endsWith('.csv')) {
          const csvText = new TextDecoder('utf-8').decode(arrayBuffer);
          const workbook = XLSX.read(csvText, { type: 'string' });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        } else {
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        }
        const results = { added: 0, skipped: 0, errors: [] };
        for (const [idx, row] of rows.entries()) {
          const item_code = (row.ItemCode || row.itemno || row.item_no || '').toString().trim();
          const BrandCode = (row.BrandCode || row.brandcode || row.brand_code || '').toString().trim();
          if (!item_code) {
            results.errors.push({ row: idx + 2, error: "Missing ItemCode" });
            continue;
          }
          // alert(item_code);
          const fd = new FormData();
          fd.append('item_code', item_code);
          fd.append('BrandCode', BrandCode);
          try {
            const res = await fetch('/api/product/bulk-upload/brand', {
              method: 'POST',
              body: fd,
            });
            const data = await res.json();
            if (res.ok) {
              results.added++;
            } else {
              // If server says category exists, count as skipped, otherwise record error
              const msg = (data && data.error) ? data.error.toString().toLowerCase() : '';
              if (res.status === 400 && msg.includes('already exists')) {
                results.skipped++;
              } else {
                results.errors.push({ row: idx + 2, error: data.error || 'Unknown error' });
              }
            }
          } catch (err) {
            results.errors.push({ row: idx + 2, error: err.message || 'Network error' });
          }
        }
        // Aggregate messages to a single toast
        if (results.added > 0 && results.errors.length === 0) {
          showToast("success", `${results.added} product(s) were mapped to categories.`);
        } else if (results.added > 0 && results.errors.length > 0) {
          showToast("info", `${results.added} mapped. ${results.errors.length} failed.`);
        } else if (results.errors.length > 0) {
          showToast("error", `${results.errors.length} rows failed to map.`);
        } else {
          showToast("info", "No rows processed.");
        }

        resetUploadForm();
      } catch (err) {
        console.error("Bulk upload error:", err);
        showToast("error", "Upload failed. " + (err.message || ""));
        resetUploadForm();
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "Key-Features") {
      if (!sap_features || !validateFile(sap_features, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");

        // Clear file input
        const fileInput = document.getElementById('Key-Features');
        if (fileInput) fileInput.value = "";

        setSap_features(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      const formData = new FormData();
      formData.append("excel", sap_features);

      console.log("Handling Key Features upload...");
      try {
        const response = await fetch('/api/product/bulk-upload/features', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        resetUploadForm();
        if (response.ok) {
          showToast("success", data.message || "Key Features uploaded successfully ✅");
        } else {
          showToast("error", data.error || "Upload failed ❌");
        }

      } catch (error) {
        showToast("error", error?.message || "Upload failed ❌");
      } finally {
        // ✅ ALWAYS clear file after request (success or error)
        const fileInput = document.getElementById('Key-Features');
        if (fileInput) fileInput.value = "";

        setSap_features(null);
        resetUploadForm();

        setIsLoading(false);
        setActiveUploadType(null);
      }
    }
    else if (uploadType == "product_name") {
      console.log('Processing product_name upload...');

      // ✅ Use product_name state variable
      if (!product_name || !validateFile(product_name, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");

        // Clear file input
        const fileInput = document.getElementById('product_name');
        if (fileInput) fileInput.value = "";

        setProduct_name(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      const formData = new FormData();
      formData.append("excel", product_name);  // ✅ Use product_name

      console.log("Handling Product Name upload...");
      try {
        const response = await fetch('/api/product/bulk-upload/product_name', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        resetUploadForm();

        if (response.ok) {
          showToast("success", data.message || "Product names uploaded successfully ✅");
        } else {
          showToast("error", data.error || "Upload failed ❌");
        }

      } catch (error) {
        console.error("Upload error:", error);
        showToast("error", error?.message || "Upload failed ❌");
      } finally {
        // ✅ Clear the correct file input
        const fileInput = document.getElementById('product_name');
        if (fileInput) fileInput.value = "";

        setProduct_name(null);
        resetUploadForm();
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "product_description") {
      console.log('Processing product_description upload...');

      if (!product_description || !validateFile(product_description, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");

        const fileInput = document.getElementById('product_description');
        if (fileInput) fileInput.value = "";

        setProduct_description(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      const formData = new FormData();
      formData.append("excel", product_description);

      console.log("Handling Product Description upload...");
      try {
        const response = await fetch('/api/product/bulk-upload/description', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        resetUploadForm();

        if (response.ok) {
          showToast("success", data.message || "Product descriptions uploaded successfully ✅");
        } else {
          showToast("error", data.error || "Upload failed ❌");
        }

      } catch (error) {
        console.error("Upload error:", error);
        showToast("error", error?.message || "Upload failed ❌");
      } finally {
        const fileInput = document.getElementById('product_description');
        if (fileInput) fileInput.value = "";

        setProduct_description(null);
        resetUploadForm();
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "product_meta") {
      console.log('Processing product_meta upload...');

      if (!product_meta || !validateFile(product_meta, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");

        const fileInput = document.getElementById('product_meta');
        if (fileInput) fileInput.value = "";

        setProduct_meta(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      const formData = new FormData();
      formData.append("excel", product_meta);

      try {
        const response = await fetch('/api/product/bulk-upload/meta', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        resetUploadForm();

        if (response.ok) {
          showToast("success", data.message || "Product meta data uploaded successfully ✅");
        } else {
          showToast("error", data.error || "Upload failed ❌");
        }

      } catch (error) {
        console.error("Upload error:", error);
        showToast("error", error?.message || "Upload failed ❌");
      } finally {
        const fileInput = document.getElementById('product_meta');
        if (fileInput) fileInput.value = "";

        setProduct_meta(null);
        resetUploadForm();
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "category_meta") {
      console.log('Processing category_meta upload...');

      if (!category_meta || !validateFile(category_meta, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");

        const fileInput = document.getElementById('category_meta');
        if (fileInput) fileInput.value = "";

        setCategory_meta(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      const formData = new FormData();
      formData.append("excel", category_meta);

      try {
        const response = await fetch('/api/categories/bulk-upload-meta', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        resetUploadForm();

        if (response.ok) {
          showToast("success", data.message || "Category meta data uploaded successfully ✅");
        } else {
          showToast("error", data.error || data.message || "Upload failed ❌");
        }

      } catch (error) {
        console.error("Upload error:", error);
        showToast("error", error?.message || "Upload failed ❌");
      } finally {
        const fileInput = document.getElementById('category_meta');
        if (fileInput) fileInput.value = "";

        setCategory_meta(null);
        resetUploadForm();
        setIsLoading(false);
        setActiveUploadType(null);
      }
    } else if (uploadType == "dynamic_filter_upload") {
      console.log('Processing dynamic_filter_upload...');

      if (!dynamic_filter_upload || !validateFile(dynamic_filter_upload, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");

        const fileInput = document.getElementById('dynamic_filter_upload');
        if (fileInput) fileInput.value = "";

        setDynamic_filter_upload(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);

      const formData = new FormData();
      formData.append("excel", dynamic_filter_upload);

      console.log("Handling Dynamic Filter upload...");
      try {
        const response = await fetch('/api/product/bulk-upload/dynamic_filter', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        resetUploadForm();

        if (response.ok) {
          showToast("success", data.message || "Dynamic filter uploaded successfully ✅");
        } else {
          showToast("error", data.error || "Upload failed ❌");
        }

      } catch (error) {
        console.error("Upload error:", error);
        showToast("error", error?.message || "Upload failed ❌");
      } finally {
        const fileInput = document.getElementById('dynamic_filter_upload');
        if (fileInput) fileInput.value = "";

        setDynamic_filter_upload(null);
        resetUploadForm();
        setIsLoading(false);
        setActiveUploadType(null);
      }
    }
    else if (uploadType == "filter_values_delete") {
      if (!productFilterValue || !validateFile(productFilterValue, ['.xlsx', '.csv'])) {
        showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
        // Clear the file input element
        const fileInput = document.getElementById('filter-values-delete-file-input');
        if (fileInput) fileInput.value = "";
        setProductFilterValue(null);
        return;
      }

      setIsLoading(true);
      setActiveUploadType(uploadType);
      setMessage(null);
      formData.append("excel", productFilterValue);

      try {
        const response = await fetch('/api/product/bulk-upload/filterDelete', {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          showToast("success", data.message || "Filter values Deleted.");
        } else {
          showToast("error", data.error || "Upload failed.");
        }

        resetUploadForm();
        // Clear the file input element
        const fileInput = document.getElementById('filter-values-delete-file-input');
        if (fileInput) fileInput.value = "";
        setProductFilterValue(null);
      } catch (error) {
        showToast("error", error?.message || String(error) || "Upload failed.");
        resetUploadForm();
        // Clear the file input element
        const fileInput = document.getElementById('filter-values-delete-file-input');
        if (fileInput) fileInput.value = "";
        setProductFilterValue(null);
      } finally {
        setIsLoading(false);
        setActiveUploadType(null);
      }

    }
  };

  const handleDownload = () => {
    // Existing All Details columns + EAN fields + meta_title, meta_description, product_type
    const XLSX = require("xlsx");
    const headers = [
      "Item No.",
      "Product Name",
      "StockQty",
      "Category",
      "Subcategory",
      "Brand",
      "Size",
      "Star",
      "Movement",
      "MRP PRICE",
      "Special Price",
      "Description",
      "Key Features",
      "image1",
      "image2",
      "image3",
      "overview images",
      "overview_description",
      "variants",
      "Status",
      "Extend Warranty",
      "common_item_code",
      "outdoor_item_code",
      "ean",
      "indoor_ean",
      "outdoor_ean",
      "meta_title",
      "meta_description",
      "product_type",
    ];
    const sampleRows = [
      [
        "VGACTTTROLLEY",
        "TT TROLLEY FOR UPS BATTERY V-GUARD ACCESSORIES",
        16,
        "Accessories",
        "Fabrics Cover & Stand",
        "V-Guard",
        "",
        "",
        "",
        1499,
        1499,
        "Trolley Display ( Battery Space ) Dimension : LENGTH - 55 , HEIGHT - 50 , WIDTH - 30.Trolley Weight - 5.3 kg , Loading Capacity - 70 kg.Screw - less easy installation.Suitable for all type single inverter - batteries ( flat and tall tubular batteries both ).Prevents battery acid water spillage.5 Wheels, 2 Sides Part,1 Base Part,1 Top Part, 1 Front Cover.( No Back Cover )Top can be removed for filling water in the battery.",
        "",
        "HUpizgrlAGIIbGDC.jpg",
        "iC7MPdTJcQ5XPD5U.jpg",
        "HSGrqhSBymfLIdqa.jpg",
        "",
        "",
        "",
        "Active",
        '[{"year":2,"amount":1500},{"year":3,"amount":2000}]',
        "",
        "",
        "",
        "",
        "",
        "Buy V-Guard TT Trolley Online | Sathya Store",
        "Shop V-Guard TT Trolley for UPS battery at Sathya Store. Durable trolley with easy installation.",
        "normal",
      ],
      [
        "VGACCWINDZYTROL",
        "WINDZY T-N TROLLY AIRCOOLER V-GUARD ACCESSORIES",
        6,
        "Accessories",
        "Fabrics Cover & Stand",
        "V-Guard",
        "",
        "",
        "",
        1190,
        412,
        "Sturdy and durable construction : The air cooler trolley is a high-quality, sturdy and durable product designed to provide a secure and stable base for your air cooler.",
        "",
        "KY1ixc23rwkD0bPb.jpg",
        "g9J8PEMl50b6oJgh.jpg",
        "",
        "",
        "",
        "",
        "Active",
        "",
        "",
        "",
        "",
        "",
        "",
        "Buy V-Guard Windzy Trolley Online | Sathya Store",
        "Shop V-Guard Windzy air cooler trolley at Sathya Store. Easy mobility with castor wheels.",
        "gift",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "SampleFormat.xlsx");
  };

  const handleZipDownload = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/Sample.zip?t=${Date.now()}`;
    link.download = 'Sample.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFilterValues = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/filter_values_bulk_upload_new.xlsx?t=${Date.now()}`;
    link.download = 'filter_values_bulk_upload_new.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFilterValuesDelete = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/filtervaluesdeletebulk.xlsx?t=${Date.now()}`;
    link.download = 'filter_values_delete_bulk_upload.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleDownloadSap_featuresFile = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/key_features_new_test.xlsx?t=${Date.now()}`;
    link.download = 'key_features_new_test.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleDownloadProduct_name_File = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/item_code_product_name.xlsx?t=${Date.now()}`;
    link.download = 'item_code_product_name.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProduct_description_File = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/item_code_description.xlsx?t=${Date.now()}`;
    link.download = 'item_code_description.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProduct_meta_File = () => {
    const XLSX = require("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["item_code", "meta_title", "meta_description", "meta_keywords"],
      ["SAMPLE001", "Samsung 55 Inch 4K Smart TV", "Buy Samsung 55 Inch 4K Smart TV at best price in Sathya...", "samsung tv, 4k smart tv, 55 inch tv"],
      ["SAMPLE002", "", "LG 1.5 Ton 5 Star Split AC with inverter compressor...", ""],
      ["SAMPLE003", "Whirlpool 265L Frost Free Double Door Refrigerator", "", "whirlpool fridge, double door refrigerator"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product Meta Template");
    XLSX.writeFile(wb, "item_code_meta_bulk_upload_sample.xlsx");
  };

  const handleDownloadCategory_meta_File = () => {
    const XLSX = require("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["category_name", "category_slug", "title", "description", "keywords"],
      ["Smart TVs", "smart-tvs", "Best Smart TVs Online at Sathya Store", "Explore latest Smart TVs with 4K resolution, HDR, and best offers at Sathya...", "smart tv, 4k tv, led tv, android tv"],
      ["Air Conditioners", "air-conditioners", "", "Shop Split, Window & Inverter Air Conditioners at affordable prices...", ""],
      ["Refrigerators", "", "Double Door & Single Door Refrigerators Online", "", "refrigerators, double door fridge, single door fridge"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category Meta Template");
    XLSX.writeFile(wb, "category_meta_bulk_upload_sample.xlsx");
  };

  const handleDownloadDynamicFilterFile = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/dynamic_filter_sample.xlsx?t=${Date.now()}`;
    link.download = 'dynamic_filter_sample.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCategoryValues = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/NewCategoryBulkUploadSample.xlsx?t=${Date.now()}`;
    link.download = 'NewCategoryBulkUploadSample.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProductCategoryValues = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/UpdatingProductCategoriesSample.xlsx?t=${Date.now()}`;
    link.download = 'UpdatingProductCategoriesSample.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProductBrandsValues = () => {
    const link = document.createElement('a');
    link.href = `/uploads/files/UpdatingProductBrandsSample.xlsx?t=${Date.now()}`;
    link.download = 'UpdatingProductBrandsSample.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWarrantyBulkUpload = async (e) => {
    e.preventDefault();

    if (!warrantyFile) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    if (!validateFilterFile(warrantyFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", warrantyFile);

    setIsWarrantyUploadLoading(true);

    try {
      const res = await fetch("/api/warranties/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(
          "success",
          `Warranty Upload Done! Inserted: ${data.inserted}, Updated: ${data.updated}, Total: ${data.total}`
        );

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast("error", data.error || "Upload failed");
      }

    } catch (err) {
      console.error("Warranty upload error:", err);
      showToast("error", "Upload failed. Please try again.");
    } finally {
      setIsWarrantyUploadLoading(false);

      setWarrantyFile(null);
      if (warrantyFileRef.current) {
        warrantyFileRef.current.value = "";

      }
    }
  };

  const handleWarrantyMapUpload = async (e) => {
    e.preventDefault();

    if (!warrantyMapFile) {
      showToast("error", "Please upload a valid Excel (.xlsx) file.");
      return;
    }

    if (!validateFilterFile(warrantyMapFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", warrantyMapFile);

    setIsWarrantyMapLoading(true);

    try {
      const res = await fetch("/api/warranties/bulk-warranty-map", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(
          "success",
          `Warranty Mapping Done! Updated: ${data.updated}${data.notFound?.length ? `, Not Found: ${data.notFound.length}` : ""}`
        );
      } else {
        showToast("error", data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Warranty map upload error:", err);
      showToast("error", "Upload failed. Please try again.");
    } finally {
      setIsWarrantyMapLoading(false);
      setWarrantyMapFile(null);
      if (warrantyMapFileRef.current) warrantyMapFileRef.current.value = "";
    }
  };

  const handlePincodeUpload = async (e) => {
    e.preventDefault();

    if (!pincodeFile) {
      showToast("error", "Please upload a valid Excel (.xlsx) file.");
      return;
    }
    if (!validateFilterFile(pincodeFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", pincodeFile);

    setIsPincodeUploadLoading(true);

    try {
      const res = await fetch("/api/pincode/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast("success", `Pincode Upload Done! Updated: ${data.updated}, Skipped: ${data.skipped}`);
      } else {
        showToast("error", data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Pincode upload error:", err);
      showToast("error", "Upload failed. Please try again.");
    } finally {
      setIsPincodeUploadLoading(false);
      setPincodeFile(null);
      if (pincodeFileRef.current) pincodeFileRef.current.value = "";
    }
  };
  const handlePincodeSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/BEA_Pincode_Sample.xlsx?t=${Date.now()}`;
    link.download = "BEA_Pincode_Sample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleBrandManufacturerSampleDownload = () => {
    const link = document.createElement("a");
    link.href = `/uploads/files/brand_manufacturer_sample.xlsx?t=${Date.now()}`;
    link.download = "brand_manufacturer_sample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBrandManufacturerUpload = async (e) => {
    e.preventDefault();

    if (!brandManufacturerFile) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }
    if (!validateFilterFile(brandManufacturerFile)) {
      showToast("error", "Please upload a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", brandManufacturerFile);

    setIsBrandManufacturerUploadLoading(true);

    try {
      const res = await fetch("/api/brand/bulk-upload-manufacturer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log("Not Found Brands:", data.notFound);
        showToast(
          "success",
          `Brand Manufacturer Upload Done! Updated: ${data.updated}${data.notFound?.length ? `, Not Found: ${data.notFound.length}` : ""}`
        );
      } else {
        showToast("error", data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Brand manufacturer upload error:", err);
      showToast("error", "Upload failed. Please try again.");
    } finally {
      setIsBrandManufacturerUploadLoading(false);
      setBrandManufacturerFile(null);
      if (brandManufacturerFileRef.current) brandManufacturerFileRef.current.value = "";
    }
  };
  const sections = [
    { id: "section-product-overview", label: "Product - All Details Upload", image: "/uploads/files/Product_all_upload_first_box.png" },
    { id: "section-filter-upload", label: "Filter Values Upload", image: "/uploads/files/Filter_Bulk_Upload_second_box.png" },
    { id: "section-filter-group-upload", label: "Filter Group Upload", image: "/uploads/files/Filter_Group_uplad_third_image.png" },
    { id: "section-movement-upload", label: "Movement Type Upload", image: "/uploads/files/Movement_upload_fourth_box_image.png" },
    { id: "section-filter-values-upload", label: "Product Filter Values Upload", image: "/uploads/files/Filter_values_bulk_upload_fifth_box_image.png" },
    { id: "section-category-filter-upload", label: "Category Filter Upload", image: "/uploads/files/Category_filter_upload_sixth_box_image.png" },

    { id: "section-category-filter-upload-item-category-subcategory", label: "Item Code Category Bulk Upload", image: "/uploads/files/Category_bulk_upload_bulk_category_image_New.png" },


    { id: "item-category-particular-product-bulk-upload", label: "Item Particular Bulk Upload part one (without image)", image: "/uploads/files/item_category_particular_bulk_upload.png" },

    { id: "item-category-particular-product-bulk-upload-image", label: "Item Particular Bulk Upload part two (with image)", image: "/uploads/files/item_code_image_bulk_upload.png" },

    { id: "section-new-category-upload", label: "New Category Upload", image: "/uploads/files/New_Category_bulk_upload_seventh_image.png" },
    // { id: "section-product-categories-upload", label: "Update Product Categories",     image: "/uploads/files/Product_updating_category_eighth_image.png" },
    { id: "section-product-brands-upload", label: "Update Product Brands", image: "/uploads/files/Product_Brand_update_nineth_image.png" },
    { id: "section-status-bulk", label: "Status Bulk Upload", image: "/uploads/files/Status_bulk_upload_tenth_box_image.png" },
    { id: "section-stock-status-bulk-upload", label: "Stock Status Upload", image: "/uploads/files/Stock_status_bulk_upload.png" },
    //  { id: "section-delete-product-itemcode-upload", label: "Item Code Delete Bulk Upload", image: "/uploads/files/item_code_delete_bulk_upload.png" },
    // { id: "extended-warrenty-upload", label: "Extended Warrenty Upload", image: "/uploads/files/Extended_warrenty_upload_eleventh_box_image.png" },
    { id: "Key-Features", label: "Key Features", image: "/uploads/files/Key features.jpg" },
    { id: "product_name", label: "Product name only", image: "/uploads/files/Product Name.png" },
    { id: "product_description", label: "Product Description", image: "/uploads/files/product_description.png" },
    { id: "product_meta", label: "Product Meta Data (Title, Description, Keywords)", image: "/uploads/files/Product Name.png" },
    { id: "category_meta", label: "Category Meta Data (Title, Description, Keywords)", image: "/uploads/files/Category_filter_upload_sixth_box_image.png" },
    { id: "dynamic_filter_upload", label: "Dynamic Filter Upload", image: "/uploads/files/dynamic_filter.png" },
    { id: "product-added-bulk-addons-frequentlybought-relatedproducts", label: "Add Frequently Addons and Related Products", image: "/uploads/files/bulk_upload_for_product_rightside_datas.png" },
    { id: "itemcode-product-bulk-upload-delete-filters", label: "Delete Filters For Product", image: "/uploads/files/delete_filters_for_product_bulk_upload.png" },
    { id: "warranty-bulk-upload", label: "Warranty Bulk Upload", image: "/uploads/files/warranty-bulk-upload.png" },
    { id: "warranty-map-bulk-upload", label: "Product Warranty Mapping Upload", image: "/uploads/files/warranty-map-bulk-upload.png" },
    { id: "pincode-serviceability-bulk-upload", label: "Pincode Serviceability Upload", image: "/uploads/files/pincode-serviceability-bulk-upload.png" },
    { id: "brand-manufacturer-bulk-upload", label: "Brand Manufacturer Details Upload", image: "/uploads/files/brand-manufacturer-bulk-upload.png" },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header & Dropdown Row */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Product Upload</h1>
            <p className="text-gray-600">Upload products in bulk using Excel/CSV and ZIP files</p>
          </div>

          <div className="w-full max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Upload Type</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-[#d72828]"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left: Selected Form */}
          <div className="w-full lg:w-1/2">

            {/* Section 1: Product Overview Upload */}
            {selectedSection === "section-product-overview" && (
              <form id="section-product-overview" ref={overviewFormRef} onSubmit={(e) => handleSubmit(e, "overview")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8 border border-gray-200">

                {/* Excel File Section */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your product data file</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                </div>
                {/* Product Images Section - Now Optional */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Product Images (ZIP)
                      <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload compressed product images (optional). If not provided, existing images will be preserved.</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setImageZip(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                    />
                    <button
                      type="button"
                      onClick={handleZipDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample ZIP
                    </button>
                  </div>
                </div>
                {/* Overview Images Section */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Overview Images (ZIP)
                      <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload additional overview images (optional). If not provided, existing images will be preserved.</p>
                  </div>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setOverviewZip(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                  />
                </div>
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-start gap-3 mt-8">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading && activeUploadType == "overview" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Start Upload'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Section 2: Filter Upload */}
            {selectedSection === "section-filter-upload" && (
              <form id="section-filter-upload" onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8 border border-gray-200">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Filter Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your product data file</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSampleDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                    <div className="flex mt-5 justify-between">
                      <button
                        onClick={handleFilterSubmit}
                        disabled={isFilterUploadLoading}
                        className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                      >
                        {isFilterUploadLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          "Upload Filter"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Section 3: Filter Group Upload */}
            {selectedSection === "section-filter-group-upload" && (
              <form id="section-filter-group-upload" onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Filter Group Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your product data file</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      onClick={handleFilterGroupSampleDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                    <div className="flex mt-5 justify-between">
                      <button
                        onClick={handleFilterGroupSubmit}
                        disabled={isFilterGroupUploadLoading}
                        className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                      >
                        {isFilterGroupUploadLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          "Upload Filter Groups"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Section 4: Movement Type Upload */}
            {selectedSection === "section-movement-upload" && (
              <form id="section-movement-upload" ref={movementFormRef} onSubmit={(e) => handleSubmit(e, "movement")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Movement Type Bulk Upload</h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your product movement file</p>
                  </div>
                  <div className="space-y-4">
                    <input type="file" accept=".xlsx,.csv" onChange={(e) => setExcelFileMovement(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadSampleMovement} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "movement" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Movement'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Section 5: Product Filter Values Upload */}
            {selectedSection === "section-filter-values-upload" && (
              <form id="section-filter-values-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "filter_values")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Product's Filter Values Bulk Upload <small className="items-start"> (size,capacity,type,etc,..)</small> </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your product filter values file</p>
                  </div>
                  <div className="space-y-4">
                    <input id="filter-values-file-input" type="file" accept=".xlsx,.csv" onChange={(e) => setProductFilterValue(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadFilterValues} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "filter_values" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Filter Values'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Section 6: Category Filter Upload */}
            {selectedSection === "section-category-filter-upload" && (
              <form id="section-category-filter-upload" onSubmit={handleUpload} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Category Filter Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your category filter mapping file</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      id="category-file-input"
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                    />
                    <button
                      type="button"
                      onClick={handleCategoryFilterDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                  <div className="flex mt-5 justify-between">
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        'Upload Category Filters'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}


            {/* Section 12: Category Filter Upload Item code,category and subcategory */}
            {selectedSection === "section-category-filter-upload-item-category-subcategory" && (
              <form id="section-category-filter-upload-item-category-subcategory" onSubmit={handleUpload} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Item Code category Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your category filter mapping file</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={fileInputRef}
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleCategoryBulkItemCodeCatSubcatDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                  <div className="flex mt-5 justify-between">
                    <button
                      onClick={handleBulkCategorySubcatSubmit}
                      disabled={isBulkUploadLoading}
                      className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                    >
                      {isBulkUploadLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        'Upload Bulk Categories'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Section 13: Category Filter Upload Item code With Particular Details */}
            {selectedSection === "item-category-particular-product-bulk-upload" && (
              <form id="item-category-particular-product-bulk-upload" onSubmit={handleUpload} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Item Particular Bulk Upload part one (without image)
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your Particular Bulk Upload Part One Data</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={fileBulkParticularInputRef}
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleParticularDataBulkUploadDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                  <div className="flex mt-5 justify-between">
                    <button
                      onClick={handleBulkParticularDetailsSubcatSubmit}
                      disabled={isParticularDataBulkUploadLoading}
                      className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                    >
                      {isParticularDataBulkUploadLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        'Particular Bulk Upload One'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Section 14: Bulk Upload for Product Featured , Add ons and Related Products */}
            {selectedSection === "product-added-bulk-addons-frequentlybought-relatedproducts" && (
              <form id="product-added-bulk-addons-frequentlybought-relatedproducts" onSubmit={handleUpload} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Product Details Bulk Upload (Add Ons, Featured Product and Related Products)
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your Products Details for Addons , Frequently Bought and Related Products</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={fileBulkUploadAddonsInputRef}
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleProductAddOnsForDataBulkUploadDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                  <div className="flex mt-5 justify-between">
                    <button
                      onClick={handleBulkUploadForAddOnsFrequentRelatedSubmit}
                      disabled={isProductDetailsDataBulkUploadLoading}
                      className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                    >
                      {isProductDetailsDataBulkUploadLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        'Product Bulk Datas Upload'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Section 20: Bulk Upload for Product Filters Delete Filters */}
            {selectedSection === "itemcode-product-bulk-upload-delete-filters" && (
              <form id="itemcode-product-bulk-upload-delete-filters" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "filter_values_delete")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Delete Product's Filter Values Bulk Upload</h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your product filter values file to delete</p>
                  </div>
                  <div className="space-y-4">
                    <input id="filter-values-delete-file-input" type="file" accept=".xlsx,.csv" onChange={(e) => setProductFilterValue(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadFilterValuesDelete} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "filter_values_delete" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Filter Values'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Section 15: Category Filter Upload Item code With Particular Details */}
            {selectedSection === "item-category-particular-product-bulk-upload-image" && (
              <form
                id="item-category-particular-product-bulk-upload-image" ref={itemparticularwithimageref}
                onSubmit={handlewithImageBulkParticularDetailsSubcatSubmit}
                className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8"
              >
                {/* ---------- EXCEL SECTION ---------- */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">

                  <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                    Item Particular Bulk Upload part two (with image)
                  </h2>

                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Excel/CSV File
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Upload your Particular Bulk Upload Part two Data
                  </p>

                  <div className="space-y-4 mt-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={fileImageBulkParticularInputRef}
                      onChange={(e) => setExcelFiles(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-red-50 file:text-[#d72828]"
                      required
                    />

                    <button
                      type="button"
                      onClick={handleImageDataBulkUploadDownload}
                      className="text-sm text-[#d72828] hover:text-[#d72828]"
                    >
                      Download Sample Format
                    </button>
                  </div>
                </div>

                {/* ---------- ZIP SECTION (REQUIRED) ---------- */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">

                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Product Images (ZIP) <span className="text-red-500">*</span>
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Upload ZIP file. Image names must match Excel columns.
                  </p>

                  <div className="space-y-4 mt-4">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setImageZips(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-red-50 file:text-[#d72828]"
                      required   // ✅ IMPORTANT (NOW REQUIRED)
                    />

                    <button
                      type="button"
                      onClick={handleZipDownload}
                      className="text-sm text-[#d72828] hover:text-[#d72828]"
                    >
                      Download Sample ZIP
                    </button>
                  </div>
                </div>

                {/* ---------- SUBMIT BUTTON ---------- */}
                <div className="flex mt-5">
                  <button
                    type="submit"
                    disabled={isParticularImageWithDataBulkUploadLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] disabled:opacity-50 flex items-center"
                  >
                    {isParticularImageWithDataBulkUploadLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Upload Excel + Images"
                    )}
                  </button>
                </div>
              </form>
            )}


            {/* Section 7: New Category Upload */}
            {selectedSection === "section-new-category-upload" && (
              <form id="section-new-category-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "category")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">New Category Bulk Upload  </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Please upload your category fields along with their corresponding values.</p>
                  </div>
                  <div className="space-y-4">
                    <input type="file" accept=".xlsx,.csv" onChange={(e) => setProductFilterValue(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadCategoryValues} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "filter_values" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload New Categories'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Section 8: Update Product Categories */}
            {/* {selectedSection === "section-product-categories-upload" && (
              <form id="section-product-categories-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "map_product_categories")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Upload For Updating Product Categories </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Please upload the product category fields along with their corresponding values for updating.</p>
                  </div>
                  <div className="space-y-4">
                    <input type="file" accept=".xlsx,.csv" onChange={(e) => setProductFilterValue(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadProductCategoryValues} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "filter_values" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Categories'
                    )}
                  </button>
                </div>
              </form>
            )} */}

            {/* Section 9: Update Product Brands */}
            {selectedSection === "section-product-brands-upload" && (
              <form id="section-product-brands-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "map_product_brands")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Upload For Updating Product Brands </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Please upload the product brand fields along with their corresponding values for updating.</p>
                  </div>
                  <div className="space-y-4">
                    <input type="file" accept=".xlsx,.csv" onChange={(e) => setProductFilterValue(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadProductBrandsValues} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "map_product_brands" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading....
                      </span>
                    ) : (
                      'Upload Product Brands'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Section 10: Status Bulk Upload */}
            {selectedSection === "section-status-bulk" && (
              <form id="section-status-bulk" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "map_product_brands")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                    <div className="mb-4">
                      <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Status Bulk Upload</h2>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Update Product Status in Bulk
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">This will update only the status field for each product. Use this to activate or deactivate products in bulk.</p>
                    </div>
                    <div className="mt-6">
                      <Link
                        href="/admin/product/status_bulk"
                        className="inline-flex items-center gap-2 bg-[#d72828] hover:bg-[#d72828] text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Go to Status Bulk Upload
                      </Link>
                    </div>
                  </div>
                </div>
              </form>
            )}


            {/* Section 10: Stock Status Upload */}
            {selectedSection === "section-stock-status-bulk-upload" && (
              <form id="section-stock-status-bulk-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "map_product_brands")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                    <div className="mb-4">
                      <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Stock Status Bulk Upload</h2>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Update Product Stock Status in Bulk
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">This will update only the stock status field for each product. Use this to activate or deactivate products in bulk.</p>
                    </div>
                    <div className="mt-6">
                      <Link
                        href="/admin/product/stock_status_bulk_upload"
                        className="inline-flex items-center gap-2 bg-[#d72828] hover:bg-[#d72828] text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Go to Stock Status Bulk Upload
                      </Link>
                    </div>
                  </div>
                </div>
              </form>
            )}


            {/* Warranty Bulk Upload */}
            {selectedSection === "warranty-bulk-upload" && (
              <form
                id="warranty-bulk-upload"
                onSubmit={handleWarrantyBulkUpload}
                className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8"
              >
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">

                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Warranty Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel / CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Upload warranty data. Existing entries (by QBC Code) will be updated; new entries will be inserted.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={warrantyFileRef}
                      onClick={(e) => {
                        e.target.value = "";
                        setWarrantyFile(null);

                      }}
                      onChange={(e) => setWarrantyFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />


                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement("a");

                        link.href = `/uploads/files/warranty_sample.xlsx?t=${Date.now()}`;
                        link.download = "warranty_sample.xlsx";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                </div>

                <div className="flex mt-5">
                  <button
                    type="submit"
                    disabled={isWarrantyUploadLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                  >
                    {isWarrantyUploadLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Upload Warranties"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Warranty Map Bulk Upload */}
            {selectedSection === "warranty-map-bulk-upload" && (
              <form
                id="warranty-map-bulk-upload"
                onSubmit={handleWarrantyMapUpload}
                className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8"
              >
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Product Warranty Mapping Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel / CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Columns: <code className="bg-gray-100 px-1 rounded">product_item_code</code> and{" "}
                      <code className="bg-gray-100 px-1 rounded">warranty_item_codes</code> (comma separated)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={warrantyMapFileRef}
                      onClick={(e) => {
                        e.target.value = "";
                        setWarrantyMapFile(null);
                      }}
                      onChange={(e) => setWarrantyMapFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />

                    {/* Download Template */}
                    <button
                      type="button"
                      onClick={() => {
                        const XLSX = require("xlsx");
                        const ws = XLSX.utils.aoa_to_sheet([
                          ["product_item_code", "warranty_item_codes"],
                          ["TV001", "PRAC1NXSS17,PRAC2NXSS17"],
                          ["AC002", "PRAC3NXSS17"],
                        ]);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Warranty Mapping");
                        XLSX.writeFile(wb, "warranty_mapping_template.xlsx");
                      }}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Template
                    </button>
                  </div>
                </div>

                <div className="flex mt-5">
                  <button
                    type="submit"
                    disabled={isWarrantyMapLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                  >
                    {isWarrantyMapLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Upload Warranty Mapping"
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "pincode-serviceability-bulk-upload" && (
              <form
                id="pincode-serviceability-bulk-upload"
                onSubmit={handlePincodeUpload}
                className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8"
              >
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Pincode Serviceability Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel / CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Upload Sathya Stores pincode serviceability data. Columns: SAP Code, Branch Name, Branch Pincode, Serviceable Pincode, Distance (km), Nearest Branch Rank, Branch Address.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={pincodeFileRef}
                      onClick={(e) => { e.target.value = ""; setPincodeFile(null); }}
                      onChange={(e) => setPincodeFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePincodeSampleDownload}
                    className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                  >
                    <svg className="w-4 h-4 mt-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>

                <div className="flex mt-5">
                  <button
                    type="submit"
                    disabled={isPincodeUploadLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                  >
                    {isPincodeUploadLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Upload Pincodes"
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "brand-manufacturer-bulk-upload" && (
              <form
                id="brand-manufacturer-bulk-upload"
                onSubmit={handleBrandManufacturerUpload}
                className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8"
              >
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Brand Manufacturer Details Bulk Upload
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel / CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Columns: <code className="bg-gray-100 px-1 rounded">Brand</code>,{" "}
                      <code className="bg-gray-100 px-1 rounded">Manufacturer Details</code>,{" "}
                      <code className="bg-gray-100 px-1 rounded">Address</code>. Existing brands (matched by name) will be updated, new brands will be inserted.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      ref={brandManufacturerFileRef}
                      onClick={(e) => { e.target.value = ""; setBrandManufacturerFile(null); }}
                      onChange={(e) => setBrandManufacturerFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleBrandManufacturerSampleDownload}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                  </div>
                </div>

                <div className="flex mt-5">
                  <button
                    type="submit"
                    disabled={isBrandManufacturerUploadLoading}
                    className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                  >
                    {isBrandManufacturerUploadLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      "Upload Brand Manufacturer Details"
                    )}
                  </button>
                </div>
              </form>
            )}
            {/* Section 10: Delete Item Code in Product Upload */}
            {/* {selectedSection === "section-delete-product-itemcode-upload" && (
              <form id="section-delete-product-itemcode-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "map_product_brands")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                    <div className="mb-4">
                      <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Stock Status Bulk Upload</h2>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Update Item Code Delete in Bulk
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">This will delete only the item code you provide.</p>
                    </div>
                    <div className="mt-6">
                      <Link
                        href="/admin/product/item_code_delete_bulk_upload"
                        className="inline-flex items-center gap-2 bg-[#d72828] hover:bg-[#d72828] text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Go to Item Code Bulk Upload Delete
                      </Link>
                    </div>
                  </div>
                </div>
              </form>
            )} */}

            {/* Section 11: Extended warrenty Upload */}
            {/* {selectedSection === "extended-warrenty-upload" && (
              <form id="extended-warrenty-upload" ref={filterValueFormRef} onSubmit={(e) => handleSubmit(e, "map_product_brands")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">
                      Update Extended Warrenty for Product in Bulk
                    </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your Extended Warrenty data file</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSampleDownloadExtendedWarrenty}
                      className="inline-flex items-center text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Sample Format
                    </button>
                    <div className="flex mt-5 justify-between">
                      <button
                        onClick={handleExtendedWarrentySubmit}
                        disabled={isFilterUploadLoading}
                        className="px-6 py-2.5 bg-[#d72828] text-white font-medium rounded-lg hover:bg-[#d72828] focus:outline-none disabled:opacity-50 transition-colors flex items-center"
                      >
                        {isFilterUploadLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          "Upload Filter"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )} */}


            {selectedSection === "Key-Features" && (
              <form id="Key-Features" ref={sap_featuresFormRef} onSubmit={(e) => handleSubmit(e, "Key-Features")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Product's Key Features Bulk Upload  </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your Product Key Features values file</p>
                  </div>
                  <div className="space-y-4">
                    <input id="Key-Features" type="file" accept=".xlsx,.csv" onChange={(e) => setSap_features(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadSap_featuresFile} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "Key-Features" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Key Features Values'
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "product_name" && (
              <form id="product_name" ref={product_nameRef} onSubmit={(e) => { console.log('teston'), handleSubmit(e, "product_name") }} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Product's Name Bulk Upload  </h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Columns: item_code, name, title, description, keywords</p>
                  </div>
                  <div className="space-y-4">
                    <input id="product_name" type="file" accept=".xlsx,.csv" onChange={(e) => setProduct_name(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadProduct_name_File} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "product_name" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Name Values'
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "product_description" && (
              <form id="product_description" ref={product_descriptionRef} onSubmit={(e) => handleSubmit(e, "product_description")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Product Description Bulk Upload</h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your Product Description values file (columns: item_code, description)</p>
                  </div>
                  <div className="space-y-4">
                    <input id="product_description" type="file" accept=".xlsx,.csv" onChange={(e) => setProduct_description(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadProduct_description_File} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "product_description" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Descriptions'
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "product_meta" && (
              <form id="product_meta" ref={product_metaRef} onSubmit={(e) => handleSubmit(e, "product_meta")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Product Meta Data Bulk Upload</h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Columns: <span className="font-mono text-gray-700 font-semibold">item_code, meta_title, meta_description, meta_keywords</span>
                    </p>
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2.5 mt-2">
                      💡 <strong>Cell Skipping Rule:</strong> For Meta Title, Meta Description, and Meta Keywords — if a cell has a value, it will be uploaded. If a cell is empty or not provided, that cell will be skipped and the existing product data will remain intact.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <input
                      id="product_meta"
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setProduct_meta(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadProduct_meta_File}
                    className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "product_meta" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Product Meta Values'
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "category_meta" && (
              <form id="category_meta" ref={category_metaRef} onSubmit={(e) => handleSubmit(e, "category_meta")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Category Meta Data Bulk Upload</h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Columns: <span className="font-mono text-gray-700 font-semibold">category_name, title, description, keywords</span>
                    </p>
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2.5 mt-2">
                      💡 <strong>Cell Skipping Rule:</strong> For Title, Description, and Keywords — if a cell has a value, it will be uploaded. If a cell is empty or not provided, that cell will be skipped and the existing category data will remain intact.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <input
                      id="category_meta"
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={(e) => setCategory_meta(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCategory_meta_File}
                    className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "category_meta" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Category Meta Values'
                    )}
                  </button>
                </div>
              </form>
            )}

            {selectedSection === "dynamic_filter_upload" && (
              <form id="dynamic_filter_upload" ref={dynamic_filter_uploadRef} onSubmit={(e) => handleSubmit(e, "dynamic_filter_upload")} className="bg-white rounded-xl shadow-lg overflow-hidden p-6 space-y-8">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-[#d72828] transition-colors">
                  <div className="mb-4">
                    <h2 className="text-md font-semibold text-[#d72828] mb-6 border-b pb-2">Dynamic Filter Bulk Upload</h2>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#d72828]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Excel/CSV File
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your Dynamic Filter values file</p>
                  </div>
                  <div className="space-y-4">
                    <input id="dynamic_filter_upload" type="file" accept=".xlsx,.csv" onChange={(e) => setDynamic_filter_upload(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-[#d72828] hover:file:bg-red-100" required />
                  </div>
                  <button type="button" onClick={handleDownloadDynamicFilterFile} className="inline-flex items-center pt-5 text-sm text-[#d72828] hover:text-[#d72828] transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Sample Format
                  </button>
                </div>
                <div className="flex mt-5 justify-between">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-[#d72828] hover:bg-[#d72828] text-white px-3 py-2 rounded-md flex items-center gap-2"
                  >
                    {isLoading && activeUploadType == "dynamic_filter_upload" ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Upload Dynamic Filter'
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Right: Illustration */}
          <div className="w-full lg:w-1/2 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-2 sticky top-8 text-center border border-gray-200">
              {(() => {
                const activeSection = sections.find(s => s.id === selectedSection);
                return activeSection?.image ? (
                  <img
                    src={activeSection.image}
                    alt={activeSection.label}
                    className="w-full h-auto mb-4 rounded-lg object-contain"
                  />
                ) : null;
              })()}
              <h3 className="text-base font-semibold text-gray-800">{sections.find(s => s.id === selectedSection)?.label}</h3>
              {/* <p className="text-xs text-gray-500 mt-2">Select an upload type, choose your file, and click the upload button.</p> */}
            </div>
          </div>

        </div>

        <ToastContainer position="top-right" autoClose={5000} />
      </div>
    </div>
  );
}
