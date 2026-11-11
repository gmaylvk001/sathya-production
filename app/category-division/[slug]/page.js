import CategoryPrimaryPage from "@/components/category/sample_cat";
import RedirectToOverviewIfDesigned from "@/components/categoryPageComponents/RedirectToOverviewIfDesigned";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { getSiteUrl } from "@/lib/siteUrl";

function buildCategoryMetadata(category, slug, baseUrl) {
  const title =
    category.meta_title && category.meta_title !== "none"
      ? category.meta_title
      : category.category_name;
  const description =
    category.meta_description && category.meta_description !== "none"
      ? category.meta_description
      : `Browse products in ${category.category_name}`;

  return {
    title,
    description,
    keywords: category.meta_keyword || "",
    openGraph: {
      title,
      description,
      url: `${baseUrl}/collection/${slug}`,
      images: category.image ? [`${baseUrl}${category.image}`] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function findCategoryBySlugInsensitive(baseUrl, slug) {
  try {
    const res = await fetch(`${baseUrl}/api/categories`, { cache: "no-store" });
    if (!res.ok) return null;
    const categories = await res.json();
    if (!Array.isArray(categories)) return null;
    const needle = String(slug || "").toLowerCase();
    return (
      categories.find(
        (c) => String(c.category_slug || "").toLowerCase() === needle
      ) || null
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams.slug;
  const baseUrl = getSiteUrl();

  try {
    const res = await fetch(`${baseUrl}/api/categories/${slug}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const category = data.main_category;
      if (category) return buildCategoryMetadata(category, slug, baseUrl);
    }

    // On 404 / missing category: case-insensitive match from categories list
    const matched = await findCategoryBySlugInsensitive(baseUrl, slug);
    if (matched) {
      return buildCategoryMetadata(matched, slug, baseUrl);
    }

    return {
      title: "Category Not Found",
      description: "This category does not exist",
    };
  } catch {
    return {
      title: "Category",
      description: "Browse products by category",
    };
  }
}

export default function Page() {
  return (
    <>
      <RedirectToOverviewIfDesigned pageType={PAGE_TYPES.CATEGORY} />
      <CategoryPrimaryPage />
    </>
  );
}
