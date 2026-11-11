"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { comboImagePublicUrl } from "@/lib/comboOffers/imagePaths";

export default function ComboOffersList() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncMsg, setSyncMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/combo-offers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load");
      setCombos(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this combo offer? The linked product will be inactivated.")) {
      return;
    }
    const res = await fetch(`/api/combo-offers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.error || "Delete failed");
  };

  const handleSync = async () => {
    setSyncMsg("Syncing…");
    const res = await fetch("/api/combo-offers/sync-visibility", { method: "POST" });
    const json = await res.json();
    if (json.success) {
      setSyncMsg(
        `Category: ${json.data.categoryStatus} · Visible: ${json.data.visibleCombos}`
      );
      load();
    } else {
      setSyncMsg(json.error || "Sync failed");
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-700",
      expired: "bg-red-100 text-red-700",
      out_of_stock: "bg-amber-100 text-amber-800",
      draft: "bg-slate-100 text-slate-600",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const thumbFor = (c) =>
    comboImagePublicUrl(c.marketingImage || c.productId?.images?.[0] || "");

  return (
    <div className="py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Combo Offers</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered marketing combos under the Combo Offers category
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
          >
            <Icon icon="mdi:sync" width={18} />
            Sync visibility
          </button>
          <Link
            href="/admin/combo-offers/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Icon icon="mdi:plus" width={18} />
            Create Combo Offer
          </Link>
        </div>
      </div>

      {syncMsg ? (
        <p className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
          {syncMsg}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : combos.length === 0 ? (
          <div className="p-10 text-center">
            <Icon icon="mdi:gift-outline" className="mx-auto text-gray-300" width={48} />
            <p className="mt-3 text-gray-600">No combo offers yet</p>
            <Link
              href="/admin/combo-offers/create"
              className="inline-block mt-4 text-blue-600 text-sm font-medium"
            >
              Create your first combo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Offer</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {combos.map((c) => {
                  const thumb = thumbFor(c);
                  return (
                    <tr key={c._id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="w-12 h-12 object-contain rounded border bg-white"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded border bg-gray-100" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {c.name || c.offerTitle}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {c.purpose}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {(c.productIds || []).length} items
                      </td>
                      <td className="px-4 py-3">
                        <div>₹{c.offerPrice}</div>
                        <div className="text-xs text-gray-500 line-through">
                          ₹{c.originalPrice}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {c.startDate
                          ? new Date(c.startDate).toLocaleDateString()
                          : "—"}
                        {" → "}
                        {c.endDate
                          ? new Date(c.endDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{c.comboStock}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(
                            c.lifecycleStatus || c.status
                          )}`}
                        >
                          {(c.lifecycleStatus || c.status || "").replace(
                            /_/g,
                            " "
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/combo-offers/${c._id}`}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(c._id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
