"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  getComponentMeta,
  getInstanceLabels,
} from "@/lib/categoryPageComponents/registry";

export default function HomeOrderTemplate() {
  const [page, setPage] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/home-pages");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPage(data.page);
      setItems(
        [...(data.page.components || [])].sort((a, b) => a.order - b.order)
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const labels = getInstanceLabels(items);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const next = Array.from(items);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setItems(next.map((item, index) => ({ ...item, order: index })));
    setMessage("");
  };

  const toggleActive = (instanceId) => {
    setItems((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? { ...item, isActive: !item.isActive }
          : item
      )
    );
    setMessage("");
  };

  const handleSave = async () => {
    if (!page?._id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/home-pages/${page._id}/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedInstanceIds: items.map((i) => i.instanceId),
          activeStates: Object.fromEntries(
            items.map((i) => [i.instanceId, i.isActive !== false])
          ),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMessage("Order saved. Storefront will use this order.");
      if (data.page?.components) {
        setItems(
          [...data.page.components].sort((a, b) => a.order - b.order)
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#ED1C24]" />
      </div>
    );
  }

  return (
    <div className="py-4 w-full">
      <Link
        href="/admin/homesettings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 mb-2"
      >
        <Icon icon="mdi:arrow-left" /> Back to Home Builder
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Order Home Components</h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag to reorder. Use the toggle to activate/deactivate each component.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#ED1C24] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Icon icon="mdi:content-save" />
          {saving ? "Saving…" : "Save Order"}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center text-sm text-gray-500">
          No components yet. Add from Home Page Builder first.
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="home-page-order">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {items.map((item, index) => {
                  const meta = getComponentMeta(item.type);
                  const label =
                    labels[item.instanceId] || meta?.label || item.type;
                  return (
                    <Draggable
                      key={item.instanceId}
                      draggableId={item.instanceId}
                      index={index}
                    >
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${
                            snapshot.isDragging
                              ? "border-[#ED1C24] shadow-md"
                              : "border-gray-200"
                          }`}
                        >
                          <button
                            type="button"
                            className="cursor-grab text-gray-400 p-1"
                            {...drag.dragHandleProps}
                          >
                            <Icon icon="mdi:drag-vertical" className="text-2xl" />
                          </button>
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={meta?.preview}
                            alt=""
                            className="h-10 w-20 object-cover rounded border"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{label}</p>
                            <p className="text-xs text-gray-400">
                              {meta?.allowMultiple
                                ? "Multi-set component"
                                : "Single (carousel images inside)"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleActive(item.instanceId)}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                              item.isActive !== false
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {item.isActive !== false ? "ON" : "OFF"}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
