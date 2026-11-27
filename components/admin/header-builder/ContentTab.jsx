"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiPlus, FiTrash2, FiEye, FiEyeOff, FiUpload, FiMenu } from "react-icons/fi";
import { toast } from "react-toastify";

export default function ContentTab({ settings, onChange, getAuthHeaders }) {
  const isModern = settings.design === "modern";
  const [uploading, setUploading] = useState(false);

  const updateLogo = (patch) =>
    onChange({ ...settings, logo: { ...settings.logo, ...patch } });
  const updateTopbar = (patch) =>
    onChange({ ...settings, topbar: { ...settings.topbar, ...patch } });
  const updateMain = (patch) =>
    onChange({ ...settings, main: { ...settings.main, ...patch } });
  const updateItems = (items) =>
    onChange({
      ...settings,
      menu: {
        ...settings.menu,
        items: items.map((it, i) => ({ ...it, order: i })),
      },
    });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/header-settings/upload-logo", {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (json.success && json.url) {
        updateLogo({ url: json.url });
        toast.success("Logo uploaded!");
      } else {
        toast.error(json.message || "Upload failed");
      }
    } catch {
      toast.error("Error uploading logo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const list = Array.from(settings.menu?.items || []);
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);
    updateItems(list);
  };

  const addMenuItem = () => {
    const current = settings.menu?.items || [];
    updateItems([
      ...current,
      { label: "New Link", link: "/", order: current.length, visible: true },
    ]);
  };

  const updateMenuItem = (idx, patch) => {
    const current = [...(settings.menu?.items || [])];
    current[idx] = { ...current[idx], ...patch };
    updateItems(current);
  };

  const removeMenuItem = (idx) => {
    const current = (settings.menu?.items || []).filter((_, i) => i !== idx);
    updateItems(current);
  };

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Brand Logo</h3>
          <p className="text-xs text-gray-500">Upload a custom logo or paste an image path, and adjust its height.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Logo Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.logo?.url || ""}
                onChange={(e) => updateLogo({ url: e.target.value })}
                placeholder="/uploads/sathya-header-logo.webp"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer shrink-0 transition-colors">
                <FiUpload size={14} />
                <span>{uploading ? "..." : "Upload"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-gray-700">
              <span>Logo Height</span>
              <span className="font-mono text-red-600">{settings.logo?.height || 48}px</span>
            </div>
            <input
              type="range"
              min={28}
              max={64}
              value={settings.logo?.height || 48}
              onChange={(e) => updateLogo({ height: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Top Announcement Bar Texts (Modern Only) */}
      {isModern && (
        <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Top Announcement Bar (Modern Only)</h3>
            <p className="text-xs text-gray-500">Shown at the very top of the Modern Retail header.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Badge Text</label>
              <input
                type="text"
                value={settings.topbar?.badge_text || ""}
                onChange={(e) => updateTopbar({ badge_text: e.target.value })}
                placeholder="FLASH SALE"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Stores Text</label>
              <input
                type="text"
                value={settings.topbar?.stores_text || ""}
                onChange={(e) => updateTopbar({ stores_text: e.target.value })}
                placeholder="180+ Stores in South India"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-gray-700">Announcement Message</label>
              <input
                type="text"
                value={settings.topbar?.message || ""}
                onChange={(e) => updateTopbar({ message: e.target.value })}
                placeholder="Smart TVs & Inverter ACs up to 55% Off..."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Deals, Helpline & Search Placeholder */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Quick Links & Search</h3>
          <p className="text-xs text-gray-500">Configure Deals pill, customer helpline, and search input prompt.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Deals Button Label</label>
            <input
              type="text"
              value={settings.topbar?.deals_label || ""}
              onChange={(e) => updateTopbar({ deals_label: e.target.value })}
              placeholder="Deals"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Deals Button Link</label>
            <input
              type="text"
              value={settings.topbar?.deals_link || ""}
              onChange={(e) => updateTopbar({ deals_link: e.target.value })}
              placeholder="/deals-offer"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          {isModern && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">24/7 Helpline Number</label>
              <input
                type="text"
                value={settings.topbar?.helpline || ""}
                onChange={(e) => updateTopbar({ helpline: e.target.value })}
                placeholder="+91 88805 98985"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Search Placeholder Prefix</label>
            <input
              type="text"
              value={settings.main?.search_placeholder || ""}
              onChange={(e) => updateMain({ search_placeholder: e.target.value })}
              placeholder="Search for"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Menu Items Editor (Drag-Reorder, Add, Edit, Show/Hide, Delete) */}
      <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Menu Bar Items</h3>
            <p className="text-xs text-gray-500">Drag to reorder, rename labels, update links, or toggle visibility.</p>
          </div>
          <button
            type="button"
            onClick={addMenuItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <FiPlus size={14} />
            Add Item
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="header-menu-items">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {(settings.menu?.items || []).map((item, idx) => (
                  <Draggable key={`item-${idx}`} draggableId={`item-${idx}`} index={idx}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl border bg-gray-50/70 ${
                          snapshot.isDragging ? "border-red-400 shadow-md bg-white" : "border-gray-200"
                        } ${item.visible === false ? "opacity-60" : ""}`}
                      >
                        <div
                          {...dragProvided.dragHandleProps}
                          className="p-1.5 text-gray-400 hover:text-gray-700 cursor-grab shrink-0"
                          title="Drag to reorder"
                        >
                          <FiMenu size={15} />
                        </div>

                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateMenuItem(idx, { label: e.target.value })}
                          placeholder="Menu Label"
                          className="w-full sm:w-40 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
                        />

                        <input
                          type="text"
                          value={item.link}
                          onChange={(e) => updateMenuItem(idx, { link: e.target.value })}
                          placeholder="/category/..."
                          className="w-full sm:flex-1 px-2.5 py-1.5 text-xs font-mono border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
                        />

                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          <button
                            type="button"
                            onClick={() => updateMenuItem(idx, { visible: item.visible === false })}
                            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                              item.visible !== false
                                ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                                : "border-gray-200 bg-gray-200 text-gray-500"
                            }`}
                            title={item.visible !== false ? "Hide item" : "Show item"}
                          >
                            {item.visible !== false ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeMenuItem(idx)}
                            className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
