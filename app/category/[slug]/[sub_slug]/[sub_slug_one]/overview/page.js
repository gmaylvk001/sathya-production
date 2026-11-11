import CategoryOverviewPage from "@/components/categoryPageComponents/CategoryOverviewPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const { slug, sub_slug, sub_slug_one } = awaitedParams;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(
      `${baseUrl}/api/categories/${sub_slug_one}?parent=${encodeURIComponent(sub_slug || "")}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return {
        title: "Category Overview",
        description: "Category overview page",
        alternates: {
          canonical: `${baseUrl}/category/${slug}/${sub_slug}/${sub_slug_one}`,
        },
      };
    }

    const data = await res.json();
    const category = data.main_category;
    const title =
      category.meta_title && category.meta_title !== "none"
        ? category.meta_title
        : category.category_name;
    const description =
      category.meta_description && category.meta_description !== "none"
        ? category.meta_description
        : `Browse products in ${category.category_name}`;

    return {
      title: `${title} Overview`,
      description,
      keywords: category.meta_keyword || "",
      alternates: {
        canonical: `${baseUrl}/category/${slug}/${sub_slug}/${sub_slug_one}`,
      },
      openGraph: {
        title: `${title} Overview`,
        description,
        url: `${baseUrl}/category/${slug}/${sub_slug}/${sub_slug_one}`,
        images: category.image ? [`${baseUrl}${category.image}`] : [],
        type: "website",
      },
    };
  } catch {
    return {
      title: "Category Overview",
      description: "Category overview page",
    };
  }
}

export default async function Page({ params }) {
  const awaitedParams = await params;
  const { slug, sub_slug, sub_slug_one } = awaitedParams;

  return (
    <CategoryOverviewPage
      pageType={PAGE_TYPES.CHILD_CATEGORY}
      slug={sub_slug_one}
      parentSlug={sub_slug}
      listingSlugs={[slug, sub_slug, sub_slug_one]}
    />
  );
}
