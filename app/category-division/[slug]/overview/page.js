import CategoryOverviewPage from "@/components/categoryPageComponents/CategoryOverviewPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams.slug;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(`${baseUrl}/api/categories/${slug}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        title: "Category Overview",
        description: "Category overview page",
        alternates: { canonical: `${baseUrl}/collection/${slug}` },
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
        canonical: `${baseUrl}/collection/${slug}`,
      },
      openGraph: {
        title: `${title} Overview`,
        description,
        url: `${baseUrl}/collection/${slug}`,
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
  const slug = awaitedParams.slug;

  return (
    <CategoryOverviewPage
      pageType={PAGE_TYPES.CATEGORY}
      slug={slug}
      listingSlugs={[slug]}
    />
  );
}
