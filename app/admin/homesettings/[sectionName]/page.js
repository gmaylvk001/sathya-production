"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function SectionSettingsPage() {
  const { sectionName } = useParams();
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sectionName) return;

    const fetchBanner = async () => {
      try {
        const res = await fetch(`/api/banners?title=${sectionName}`);
        const data = await res.json();
        setBanner(data.banner || null);
      } catch (err) {
        console.error("Error fetching banner:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, [sectionName]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!banner) return <p className="p-6">No banner found for "{sectionName}"</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Settings for {banner.title}
      </h1>

      {/* ✅ Non-category banners */}
      {banner.bannerType !== "categorybanner" ? (
        <div className="space-y-4">
          {banner.bgImageUrl && (
            <div>
              <p className="font-semibold">Background Image</p>
              <img
                src={banner.bgImageUrl}
                alt="bg"
                className="w-64 rounded shadow"
              />
            </div>
          )}

          {banner.bannerImageUrl && (
            <div>
              <p className="font-semibold">Banner Image</p>
              <img
                src={banner.bannerImageUrl}
                alt="banner"
                className="w-64 rounded shadow"
              />
            </div>
          )}

          {banner.redirectUrl && (
            <p>
              <span className="font-semibold">Redirect URL: </span>
              <a
                href={banner.redirectUrl}
                target="_blank"
                className="text-[#d72828] underline"
              >
                {banner.redirectUrl}
              </a>
            </p>
          )}
        </div>
      ) : (
        /* ✅ Category banner */
        <div className="grid grid-cols-2 gap-4">
          {banner.categoryImages?.map((img, i) => (
            <div key={i} className="border rounded p-2">
              <img
                src={img.imageUrl}
                alt={`category-${i}`}
                className="w-full rounded"
              />
              <a
                href={img.redirectUrl}
                target="_blank"
                className="text-[#d72828] underline text-sm"
              >
                {img.redirectUrl}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
