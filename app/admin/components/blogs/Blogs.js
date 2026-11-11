"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import ReactPaginate from "react-paginate";
import CustomJodit from "../blog/CustomJodit";
import {
  BLOG_SITE_URL,
  BLOG_DEFAULT_AUTHOR,
  BLOG_PUBLISHER,
  SCHEMA_INVALID_MESSAGE,
  extractJsonLd,
  normalizeSchemaJson,
} from "@/lib/blogSchema";

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("list"); // 'list' | 'create' | 'edit'
  
  const [formData, setFormData] = useState({
    _id: null,
    existId: "",
    blogTitle: "",
    slug: "",
    category: "",
    shortDescription: "",
    description: "",
    faqs: [],
    author: "",
    readingTime: "",
    publishDate: "",
    bannerImage: "",
    featuredImage: "",
    metaTitle: "",
    metaKeywords: "",
    metaDescription: "",
    schemaJson: "",
    status: "Active",
  });

  const [isMatchingBlogFaqs, setIsMatchingBlogFaqs] = useState(false);
  const [faqMatchMessage, setFaqMatchMessage] = useState("");
  const [schemaMessage, setSchemaMessage] = useState({ text: "", type: "success" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;

  // Bulk Delete State
  const [selectedBlogs, setSelectedBlogs] = useState([]);

  const handleBulkDelete = async () => {
    if (selectedBlogs.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedBlogs.length} selected blog(s)?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/blogs-new/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedBlogs }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMessage(result.message || "Blogs Deleted Successfully");
        setShowSuccessModal(true);
        setSelectedBlogs([]);
        fetchBlogs();
      } else {
        alert(result.error || "Failed to delete blogs");
      }
    } catch (err) {
      console.error("Error bulk deleting blogs:", err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentPageIds = filteredBlogs
        .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
        .map((b) => b._id);
      setSelectedBlogs(currentPageIds);
    } else {
      setSelectedBlogs([]);
    }
  };

  const handleSelectBlog = (id) => {
    setSelectedBlogs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Upload States
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showZipModal, setShowZipModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [faqFile, setFaqFile] = useState(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [isUploadingFaq, setIsUploadingFaq] = useState(false);
  const [excelUploadResult, setExcelUploadResult] = useState(null);
  const [zipUploadResult, setZipUploadResult] = useState(null);
  const [faqUploadResult, setFaqUploadResult] = useState(null);

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      alert("Please select an Excel or CSV file");
      return;
    }
    const fd = new FormData();
    fd.append("file", excelFile);
    try {
      setIsUploadingExcel(true);
      setExcelUploadResult(null);
      const res = await fetch("/api/blogs-new/bulk-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExcelUploadResult(data);
        await fetchBlogs();
      } else {
        alert(data.error || "Bulk upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handleZipUpload = async (e) => {
    e.preventDefault();
    if (!zipFile) {
      alert("Please select a ZIP file");
      return;
    }
    const fd = new FormData();
    fd.append("zip", zipFile);
    try {
      setIsUploadingZip(true);
      setZipUploadResult(null);
      const res = await fetch("/api/blogs-new/zip-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setZipUploadResult(data);
      } else {
        alert(data.error || "ZIP upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading ZIP file");
    } finally {
      setIsUploadingZip(false);
    }
  };

  const handleFaqUpload = async (e) => {
    e.preventDefault();
    if (!faqFile) {
      alert("Please select an FAQ CSV or Excel file");
      return;
    }
    const fd = new FormData();
    fd.append("file", faqFile);
    try {
      setIsUploadingFaq(true);
      setFaqUploadResult(null);
      const res = await fetch("/api/blogs-new/faq-bulk-upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFaqUploadResult(data);
        await fetchBlogs();
      } else {
        alert(data.error || "FAQ bulk upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading FAQ file");
    } finally {
      setIsUploadingFaq(false);
    }
  };

  const downloadSampleFaqCsv = () => {
    const headers = ["id", "exist id", "question", "answer", "timestamp"];
    const sampleRows = [
      `"1","19","Is 6GB RAM enough for everyday smartphone use?","Yes. For most users, 6GB RAM is sufficient for social media and browsing.","2026-07-08 11:14:51"`,
      `"2","19","Should I buy a 5G smartphone in 2026?","Yes. With 5G expanding across India, it offers future readiness.","2026-07-08 11:14:51"`,
      `"3","26","Is MacBook Air enough for students?","Yes, MacBook Air is ideal for students due to lightweight design and battery life.","2026-07-08 11:14:51"`,
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sampleRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "blogs_faq_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSampleCsv = () => {
    const headers = [
      "title",
      "slug",
      "banner_image",
      "featured_image",
      "short_description",
      "description",
      "author",
      "reading_time",
      "publish_date",
      "views",
      "category",
      "category_id",
      "meta_title",
      "meta_keywords",
      "meta_description",
      "status",
    ];
    const sampleRow = [
      `"Choosing the Right Cooling Solution"`,
      `"choosing-the-right-cooling-solution"`,
      `"ac_banner.png"`,
      `"ac_featured.png"`,
      `"Guide to choosing between inverter and non-inverter ACs."`,
      `"<h2>Understanding AC Technology</h2><p>Here are key factors to consider when buying a split AC...</p>"`,
      `"Admin"`,
      `"6"`,
      `"2024-08-28"`,
      `"0"`,
      `"Air Conditioner"`,
      `""`,
      `"Best AC Buying Guide"`,
      `"air conditioner, split ac, inverter ac"`,
      `"Compare inverter and non inverter ACs for your home."`,
      `"active"`,
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n" + sampleRow.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sathya_blogs_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch Data
  const fetchBlogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/blogs-new");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBlogs(data.data);
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories/get");
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, []);

  // Form handling
  const generateSlug = (name = "") =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      blogTitle: title,
      slug: generateSlug(title),
    }));
  };

  const handleOpenCreate = () => {
    setFormData({
      _id: null,
      existId: "",
      blogTitle: "",
      slug: "",
      category: "",
      shortDescription: "",
      description: "",
      faqs: [],
      author: "",
      readingTime: "",
      publishDate: "",
      bannerImage: "",
      featuredImage: "",
      metaTitle: "",
      metaKeywords: "",
      metaDescription: "",
      schemaJson: "",
      status: "Active",
    });
    setFaqMatchMessage("");
    setSchemaMessage({ text: "", type: "success" });
    setView("create");
  };

  const handleOpenEdit = async (item) => {
    setFormData({
      _id: item._id,
      existId: item.existId || "",
      blogTitle: item.blogTitle || "",
      slug: item.slug || "",
      category: item.category || "",
      shortDescription: item.shortDescription || "",
      description: item.description || "",
      faqs: [],
      author: item.author || "",
      readingTime: item.readingTime || "",
      publishDate: item.publishDate ? new Date(item.publishDate).toISOString().split('T')[0] : "",
      bannerImage: item.bannerImage || "",
      featuredImage: item.featuredImage || "",
      metaTitle: item.metaTitle || "",
      metaKeywords: item.metaKeywords || "",
      metaDescription: item.metaDescription || "",
      schemaJson: item.schemaJson || "",
      status: item.status || "Active",
    });
    setFaqMatchMessage("");
    setSchemaMessage({ text: "", type: "success" });
    setView("edit");

    // Fetch matched FAQs from standalone blogs_faq database table for this blog
    try {
      const existParam = item.existId ? `&existId=${encodeURIComponent(item.existId)}` : "";
      const res = await fetch(`/api/blogs-faq?blogId=${item._id}${existParam}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          faqs: json.data.map((f) => ({
            _id: f._id,
            question: f.question,
            answer: f.answer,
            existId: f.existId || item.existId || "",
          })),
        }));
      }
    } catch (err) {
      console.error("Error loading FAQs for blog:", err);
    }
  };

  // Match and reload FAQs directly on the blog form
  const handleMatchBlogFaqs = async () => {
    if (!formData._id && !formData.existId) {
      alert("Please provide an Exist ID (SQL ID) or save the blog first to match FAQs.");
      return;
    }
    try {
      setIsMatchingBlogFaqs(true);
      setFaqMatchMessage("");

      // Fetch FAQs for this specific blog from blogs_faq collection
      const existParam = formData.existId ? `&existId=${encodeURIComponent(formData.existId)}` : "";
      const blogIdParam = formData._id ? `&blogId=${formData._id}` : "";
      const res = await fetch(`/api/blogs-faq?${blogIdParam}${existParam}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        if (json.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            faqs: json.data.map((f) => ({
              _id: f._id,
              question: f.question,
              answer: f.answer,
              existId: f.existId || formData.existId || "",
            })),
          }));
          setFaqMatchMessage(`Loaded ${json.data.length} matched FAQ(s) from blogs_faq table`);
        } else {
          setFaqMatchMessage("No FAQs found for this blog in blogs_faq table");
        }
      }
    } catch (err) {
      console.error("Error matching FAQs:", err);
      alert("Failed to match FAQs");
    } finally {
      setIsMatchingBlogFaqs(false);
      setTimeout(() => setFaqMatchMessage(""), 5000);
    }
  };

  // FAQ Handling
  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  };

  const updateFaq = (index, field, value) => {
    const newFaqs = [...formData.faqs];
    newFaqs[index][field] = value;
    setFormData({ ...formData, faqs: newFaqs });
  };

  const removeFaq = (index) => {
    const newFaqs = formData.faqs.filter((_, i) => i !== index);
    setFormData({ ...formData, faqs: newFaqs });
  };

  // File Upload Handling
  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append("image", file);

    try {
      const res = await fetch("/api/blogs-new/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setFormData((prev) => ({ ...prev, [fieldName]: result.savedImage }));
      } else {
        alert(result.error || "Failed to upload image");
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Error uploading image");
    }
  };

  // Schema JSON (JSON-LD) — browser-only helpers; nothing is saved until Save
  const showSchemaMessage = (text, type = "success") => setSchemaMessage({ text, type });

  const handleGenerateSchemaTemplate = () => {
    const stripTags = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const slug = generateSlug(formData.blogTitle || "") || "blog-slug";
    const template = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: formData.blogTitle.trim() || "Blog title",
      description: formData.metaDescription.trim() || stripTags(formData.shortDescription) || "Blog description",
      image: [`${BLOG_SITE_URL}/uploads/blogs/your-banner.webp`],
      author: { "@type": "Person", name: formData.author.trim() || BLOG_DEFAULT_AUTHOR },
      publisher: BLOG_PUBLISHER,
      mainEntityOfPage: `${BLOG_SITE_URL}/blog-listing/${slug}`,
      ...(formData.publishDate
        ? { datePublished: formData.publishDate, dateModified: formData.publishDate }
        : {}),
    };
    setFormData((prev) => ({ ...prev, schemaJson: JSON.stringify(template, null, 2) }));
    showSchemaMessage("BlogPosting template generated. Review and save.");
  };

  const handleFormatSchemaJson = () => {
    const json = extractJsonLd(formData.schemaJson);
    if (!json) {
      showSchemaMessage("Nothing to format.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(json);
      setFormData((prev) => ({ ...prev, schemaJson: JSON.stringify(parsed, null, 2) }));
      showSchemaMessage("JSON formatted successfully.");
    } catch (err) {
      showSchemaMessage(`Invalid JSON: ${err.message}`, "error");
    }
  };

  const handleClearSchemaJson = () => {
    setFormData((prev) => ({ ...prev, schemaJson: "" }));
    showSchemaMessage("Cleared. Auto BlogPosting schema will be used.");
  };

  // Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.blogTitle.trim()) {
      alert("Blog Title is required");
      return;
    }

    if (!normalizeSchemaJson(formData.schemaJson).ok) {
      showSchemaMessage(SCHEMA_INVALID_MESSAGE, "error");
      alert(SCHEMA_INVALID_MESSAGE);
      return;
    }

    const endpoint = view === "create" ? "/api/blogs-new/add" : "/api/blogs-new/update";
    const method = view === "create" ? "POST" : "PUT";

    try {
      setIsSubmitting(true);
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        await fetchBlogs();
        setView("list");
        setSuccessMessage(view === "create" ? "Blog Created Successfully" : "Blog Updated Successfully");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);
      } else {
        alert(result.error || "Failed to save blog");
      }
    } catch (error) {
      console.error("Error saving blog:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!blogToDelete) return;
    try {
      const res = await fetch("/api/blogs-new/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: blogToDelete }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMessage("Blog Deleted Successfully");
        setShowSuccessModal(true);
        fetchBlogs();
      } else {
        alert(result.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting:", err);
    } finally {
      setShowConfirmationModal(false);
      setBlogToDelete(null);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  // Pagination & Filtering
  const filteredBlogs = blogs.filter((b) =>
    (b.blogTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.slug || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageCount = Math.ceil(filteredBlogs.length / itemsPerPage);
  const totalEntries = filteredBlogs.length;
  const startEntry = currentPage * itemsPerPage + 1;
  const endEntry = Math.min((currentPage + 1) * itemsPerPage, totalEntries);

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-5 mt-5">
        <h2 className="text-3xl font-light text-gray-700">
          {view === "list" ? "Blogs" : view === "create" ? "Create Blog" : "Edit Blog"}
        </h2>
      </div>

      {view === "list" && (
        <div className="bg-white shadow-sm border rounded-lg p-5 overflow-x-auto border-gray-200">
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
            <div className="flex items-center gap-2">
              {selectedBlogs.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="border border-red-200 px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1 text-sm font-medium transition-colors"
                  title="Delete Selected Blogs"
                >
                  <Icon icon="mingcute:delete-2-line" className="text-base" /> Bulk Delete ({selectedBlogs.length})
                </button>
              )}
              <button
                onClick={() => {
                  setExcelUploadResult(null);
                  setShowExcelModal(true);
                }}
                className="border px-3 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium"
              >
                <Icon icon="vscode-icons:file-type-excel" className="text-base" /> Bulk Upload (Excel/CSV)
              </button>
              <button
                onClick={() => {
                  setZipUploadResult(null);
                  setShowZipModal(true);
                }}
                className="border px-3 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium"
              >
                <Icon icon="vscode-icons:file-type-zip" className="text-base" /> Upload Images (ZIP)
              </button>
              <button
                onClick={() => {
                  setFaqUploadResult(null);
                  setShowFaqModal(true);
                }}
                className="border px-3 py-1.5 rounded bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium"
              >
                <Icon icon="fluent:chat-help-24-filled" className="text-base text-purple-600" /> Upload FAQs (CSV)
              </button>
              <a
                href="/admin/blogs-faq"
                className="border border-purple-200 px-3 py-1.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1.5 text-sm font-medium transition-colors"
                title="Open standalone Blog FAQ table"
              >
                <Icon icon="mdi:frequently-asked-questions" className="text-base text-purple-600" /> Blog FAQ Table
              </a>
              <button
                onClick={handleOpenCreate}
                className="border px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 text-sm font-medium shadow-sm"
              >
                <Icon icon="ic:baseline-add" className="text-lg" /> New Blog
              </button>
            </div>
          </div>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-3 text-left pl-4 font-semibold w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={handleSelectAll}
                    checked={
                      filteredBlogs.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).length > 0 &&
                      selectedBlogs.length === filteredBlogs.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).length
                    }
                  />
                </th>
                <th className="p-3 text-left font-semibold w-16">#</th>
                <th className="p-3 text-left font-semibold w-20">Exist ID</th>
                <th className="p-3 text-left font-semibold">Blog Title</th>
                <th className="p-3 text-left font-semibold">Slug</th>
                <th className="p-3 text-center font-semibold w-20">FAQs</th>
                <th className="p-3 text-left font-semibold w-32">Status</th>
                <th className="p-3 text-left font-semibold w-36">Published Date</th>
                <th className="p-3 text-center font-semibold w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-500">Loading...</td>
                </tr>
              ) : filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-500">No blogs found.</td>
                </tr>
              ) : (
                filteredBlogs
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                  .map((b, idx) => (
                    <tr key={b._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 pl-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedBlogs.includes(b._id)}
                          onChange={() => handleSelectBlog(b._id)}
                        />
                      </td>
                      <td className="p-3 text-gray-500 text-sm">{totalEntries - (currentPage * itemsPerPage + idx)}</td>
                      <td className="p-3 text-gray-600 font-mono text-xs">{b.existId || "-"}</td>
                      <td className="p-3">
                        {b.slug ? (
                          <a
                            href={`/blog-listing/${b.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                            title="Open customer blog page"
                          >
                            {b.blogTitle}
                          </a>
                        ) : (
                          <span>{b.blogTitle}</span>
                        )}
                      </td>
                      <td className="p-3">{b.slug}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${b.faqCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                          {b.faqCount || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${b.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3">{formatDate(b.publishDate)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="px-2 py-1 border rounded text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                            title="Edit"
                          >
                            <Icon icon="lucide:edit" className="text-sm" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setBlogToDelete(b._id);
                              setShowConfirmationModal(true);
                            }}
                            className="px-2 py-1 border rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                            title="Delete"
                          >
                            <Icon icon="mingcute:delete-2-line" className="text-sm" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          {filteredBlogs.length > 0 && (
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
                onPageChange={(e) => {
                  handlePageClick(e);
                  setSelectedBlogs([]); // Clear selection on page change
                }}
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
          )}
        </div>
      )}

      {(view === "create" || view === "edit") && (
        <div className="bg-white shadow-sm border rounded-lg p-8 border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Blog Title</label>
              <input
                type="text"
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.blogTitle}
                onChange={handleTitleChange}
                required
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Slug</label>
              <div>
                <input
                  type="text"
                  className="w-full border rounded p-2 bg-gray-50 text-gray-600"
                  value={formData.slug}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated from title on save. Frontend URL: /blog-listing/{formData.slug || "{slug}"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Exist ID (SQL ID)</label>
              <div>
                <input
                  type="text"
                  className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                  placeholder="e.g. 19, 21, 26"
                  value={formData.existId}
                  onChange={(e) => setFormData({ ...formData, existId: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Foreign key matching legacy SQL <code className="bg-gray-100 px-1 rounded font-bold">blogs.id</code>. Used by the Match button to link with <code className="bg-gray-100 px-1 rounded font-bold">blogs_faq</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Category</label>
              <select
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400 bg-white"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.category_name}>{c.category_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Short Description</label>
              <textarea
                rows="4"
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              ></textarea>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Description</label>
              <div className="bg-white">
                <CustomJodit
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  placeholder="Enter blog description..."
                />
              </div>
            </div>

            <hr className="my-6" />

            <div className="space-y-4 bg-gray-50/70 p-5 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Icon icon="fluent:chat-help-24-filled" className="text-xl text-purple-600" />
                    Frequently Asked Questions ({formData.faqs.length})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    FAQs are stored in the separate <code className="bg-purple-100 text-purple-800 px-1 rounded font-semibold">blogs_faq</code> table (not stored in DB as a subfield in Blogs).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMatchBlogFaqs}
                    disabled={isMatchingBlogFaqs}
                    className="border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Match and fetch FAQs from blogs_faq table using Exist ID or Blog ID"
                  >
                    <Icon icon={isMatchingBlogFaqs ? "line-md:loading-loop" : "mdi:link-variant"} className="text-base text-purple-600" />
                    {isMatchingBlogFaqs ? "Matching..." : "Match / Load FAQs"}
                  </button>

                  <button
                    type="button"
                    onClick={addFaq}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Icon icon="ic:baseline-add" className="text-base" /> Add FAQ
                  </button>
                </div>
              </div>

              {faqMatchMessage && (
                <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 rounded text-xs flex items-center gap-2">
                  <Icon icon="lucide:check-circle" className="text-base text-green-600 flex-shrink-0" />
                  <span>{faqMatchMessage}</span>
                </div>
              )}

              {formData.faqs.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg bg-white text-gray-500 text-xs">
                  <Icon icon="mdi:frequently-asked-questions" className="text-3xl text-gray-400 mx-auto mb-1" />
                  <p className="font-medium text-gray-700">No FAQs loaded for this blog yet.</p>
                  <p className="text-gray-400 mt-0.5">
                    Click <span className="font-semibold text-purple-700">Match / Load FAQs</span> to fetch FAQs linked by Exist ID, or click <span className="font-semibold text-blue-700">Add FAQ</span> to create one.
                  </p>
                </div>
              ) : (
                formData.faqs.map((faq, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-start bg-white p-3 rounded border border-gray-200 shadow-sm">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <input
                        type="text"
                        placeholder="FAQ Question"
                        className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                        value={faq.question}
                        onChange={(e) => updateFaq(index, "question", e.target.value)}
                      />
                      <textarea
                        rows="2"
                        placeholder="FAQ Answer"
                        className="w-full border rounded p-2 text-sm focus:outline-none focus:border-blue-400"
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, "answer", e.target.value)}
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded transition-colors flex-shrink-0 mt-1"
                      title="Remove FAQ"
                    >
                      <Icon icon="lucide:trash-2" className="text-base" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <hr className="my-6" />

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Author</label>
              <input
                type="text"
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Reading Time (mins)</label>
              <input
                type="number"
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.readingTime}
                onChange={(e) => setFormData({ ...formData, readingTime: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Publish Date</label>
              <input
                type="date"
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Banner Image (1920×460)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, "bannerImage")}
                  className="border rounded p-1 bg-gray-50"
                  accept="image/*"
                />
                {formData.bannerImage && <span className="text-xs text-green-600 truncate max-w-xs">{formData.bannerImage}</span>}
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Featured Image (534×259)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, "featuredImage")}
                  className="border rounded p-1 bg-gray-50"
                  accept="image/*"
                />
                {formData.featuredImage && <span className="text-xs text-green-600 truncate max-w-xs">{formData.featuredImage}</span>}
              </div>
            </div>

            <hr className="my-6" />

            <div className="space-y-4">
              <h3 className="text-xl font-light text-gray-700">SEO Details</h3>
              
              <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                <label className="font-semibold text-gray-700 mt-2">Meta Title</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                <label className="font-semibold text-gray-700 mt-2">Meta Keywords</label>
                <textarea
                  rows="3"
                  className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                  value={formData.metaKeywords}
                  onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                ></textarea>
              </div>

              <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                <label className="font-semibold text-gray-700 mt-2">Meta Description</label>
                <textarea
                  rows="3"
                  className="w-full border rounded p-2 focus:outline-none focus:border-blue-400"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                ></textarea>
              </div>

              <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                <label className="font-semibold text-gray-700 mt-2">Schema JSON (JSON-LD)</label>
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      type="button"
                      onClick={handleGenerateSchemaTemplate}
                      className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-100 text-gray-700"
                    >
                      Generate BlogPosting Template
                    </button>
                    <button
                      type="button"
                      onClick={handleFormatSchemaJson}
                      className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-100 text-gray-700"
                    >
                      Format JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSchemaJson}
                      className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-gray-100 text-gray-700"
                    >
                      Clear (use Auto Schema)
                    </button>
                  </div>
                  {schemaMessage.text && (
                    <p
                      className={`text-sm mb-2 ${schemaMessage.type === "error" ? "text-red-600" : "text-green-600"}`}
                    >
                      {schemaMessage.text}
                    </p>
                  )}
                  <textarea
                    rows="12"
                    spellCheck={false}
                    className="w-full border rounded p-2 font-mono text-sm focus:outline-none focus:border-blue-400"
                    placeholder={'Leave empty for auto BlogPosting schema. Or paste custom JSON-LD like\n{"@context":"https://schema.org","@type":"BlogPosting",...}'}
                    value={formData.schemaJson}
                    onChange={(e) => setFormData({ ...formData, schemaJson: e.target.value })}
                  ></textarea>
                  <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                    <p>Optional SEO structured data for Google rich results.</p>
                    <p><span className="font-semibold text-gray-700">Empty</span> = automatic BlogPosting (+ FAQPage when FAQs exist).</p>
                    <p><span className="font-semibold text-gray-700">Filled</span> = your custom JSON-LD is used on the blog detail page.</p>
                    <p>
                      You can paste raw JSON or a full{" "}
                      <code className="bg-gray-100 text-pink-600 px-1 rounded text-xs">{'<script type="application/ld+json">'}</code>{" "}
                      block.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="font-semibold text-gray-700 mt-2">Status</label>
              <select
                className="w-full border rounded p-2 focus:outline-none focus:border-blue-400 bg-white"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-3 pt-6 pb-4 border-t">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded shadow-sm transition-colors"
              >
                Save Blog
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="border px-6 py-2 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this blog?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setBlogToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm transition-colors"
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

      {/* Bulk Excel/CSV Upload Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="vscode-icons:file-type-excel" className="text-2xl" />
                Bulk Upload Blogs (Excel / CSV)
              </h3>
              <button
                onClick={() => setShowExcelModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExcelUpload} className="mt-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Format notes:</p>
                <p>• Compatible with Sathya Stores SQL table schema (title, slug, banner_image, featured_image, short_description, description, author, reading_time, publish_date, views, category, status, etc.).</p>
                <p>• Image filenames will automatically be prefixed with <code className="bg-blue-100 px-1 rounded">/uploads/blogs/</code>.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select .xlsx, .xls, or .csv file:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border rounded p-2 focus:outline-none"
                  required
                />
              </div>

              {excelUploadResult && (
                <div className={`p-3 rounded-lg text-xs ${excelUploadResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  <p className="font-bold">Upload Result:</p>
                  <p>• Total rows: {excelUploadResult.totalRows || 0}</p>
                  <p>• Inserted (new): {excelUploadResult.inserted || 0}</p>
                  <p>• Updated (existing): {excelUploadResult.updated || 0}</p>
                  {excelUploadResult.errorsCount > 0 && (
                    <div className="mt-1 text-red-700">
                      <p className="font-semibold">Errors ({excelUploadResult.errorsCount}):</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {excelUploadResult.errors?.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end items-center pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(false)}
                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 text-sm"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingExcel || !excelFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold flex items-center gap-1.5"
                  >
                    {isUploadingExcel ? (
                      <>
                        <Icon icon="line-md:loading-loop" className="text-lg" /> Uploading...
                      </>
                    ) : (
                      "Upload & Import"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Images ZIP Upload Modal */}
      {showZipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="vscode-icons:file-type-zip" className="text-2xl" />
                Upload Images Archive (ZIP)
              </h3>
              <button
                onClick={() => setShowZipModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleZipUpload} className="mt-4 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Image extraction info:</p>
                <p>• All image files in the ZIP (.png, .jpg, .webp, etc.) will be extracted into <code className="bg-amber-100 px-1 rounded">public/uploads/blogs/</code>.</p>
                <p>• In the Excel/CSV file, match the image filenames (e.g. <code className="bg-amber-100 px-1 rounded">imgname_banner.png</code> or <code className="bg-amber-100 px-1 rounded">imgname_featured.png</code>).</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select .zip archive:
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border rounded p-2 focus:outline-none"
                  required
                />
              </div>

              {zipUploadResult && (
                <div className={`p-3 rounded-lg text-xs ${zipUploadResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  <p className="font-bold">Result:</p>
                  <p>{zipUploadResult.message || `Extracted ${zipUploadResult.count} images.`}</p>
                  {zipUploadResult.savedFiles?.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto bg-white border p-2 rounded">
                      <p className="font-semibold mb-1">Extracted Files ({zipUploadResult.savedFiles.length}):</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-600">
                        {zipUploadResult.savedFiles.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowZipModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUploadingZip || !zipFile}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 text-sm font-semibold flex items-center gap-1.5"
                >
                  {isUploadingZip ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="text-lg" /> Extracting...
                    </>
                  ) : (
                    "Upload & Extract"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk FAQs Upload Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="fluent:chat-help-24-filled" className="text-2xl text-purple-600" />
                Upload Blog FAQs (CSV / Excel)
              </h3>
              <button
                onClick={() => setShowFaqModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFaqUpload} className="mt-4 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-900 space-y-1">
                <p className="font-semibold">SQL Foreign Key Matching:</p>
                <p>• Matches each FAQ row using <code className="bg-purple-100 px-1 rounded font-bold">exist id</code> to the blog's existing SQL ID (existId) or slug.</p>
                <p>• Supported SQL columns: <code className="bg-purple-100 px-1 rounded font-bold">id</code>, <code className="bg-purple-100 px-1 rounded font-bold">exist id</code> (or blog_id), <code className="bg-purple-100 px-1 rounded font-bold">question</code>, <code className="bg-purple-100 px-1 rounded font-bold">answer</code>, <code className="bg-purple-100 px-1 rounded">timestamp</code>.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select FAQs file (.csv, .xlsx, .xls, or MySQL TSV dump):
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.txt"
                  onChange={(e) => setFaqFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border rounded p-2 focus:outline-none"
                  required
                />
              </div>

              {faqUploadResult && (
                <div className={`p-3 rounded-lg text-xs ${faqUploadResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  <p className="font-bold">Upload Results:</p>
                  <p>• Total FAQs processed: {faqUploadResult.totalFaqsProcessed ?? faqUploadResult.totalRows ?? 0}</p>
                  <p>• Matched and updated blogs: {faqUploadResult.matchedBlogs ?? 0}</p>
                  {faqUploadResult.notFoundBlogIds?.length > 0 && (
                    <p className="text-amber-700 mt-1">
                      ⚠️ Unmatched blog IDs: {faqUploadResult.notFoundBlogIds.join(", ")}
                    </p>
                  )}
                  {faqUploadResult.errors?.length > 0 && (
                    <p className="text-red-700 mt-1">
                      Errors: {faqUploadResult.errors.join("; ")}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100 text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUploadingFaq || !faqFile}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold flex items-center gap-1.5"
                >
                  {isUploadingFaq ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="text-lg" /> Uploading...
                    </>
                  ) : (
                    "Upload FAQs"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
