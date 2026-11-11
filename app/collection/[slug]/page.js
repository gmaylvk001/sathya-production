import CategoryPrimaryPage from "@/components/category/sample_cat";
import RedirectToOverviewIfDesigned from "@/components/categoryPageComponents/RedirectToOverviewIfDesigned";
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
        title: "Category Not Found",
        description: "This category does not exist",
      };
    }

    const data = await res.json();
    const category = data.main_category;
    return {
      title:
        category.meta_title && category.meta_title !== "none"
          ? category.meta_title
          : category.category_name,
      description:
        category.meta_description && category.meta_description !== "none"
          ? category.meta_description
          : `Browse products in ${category.category_name}`,

      keywords: category.meta_keyword || "",

      openGraph: {
        title:
          category.meta_title && category.meta_title !== "none"
            ? category.meta_title
            : category.category_name,
        description:
          category.meta_description && category.meta_description !== "none"
            ? category.meta_description
            : `Browse products in ${category.category_name}`,
        url: `${baseUrl}/collection/${slug}`,
        images: category.image ? [`${baseUrl}${category.image}`] : [],
        type: "website",
      },

      twitter: {
        card: "summary_large_image",
        title:
          category.meta_title && category.meta_title !== "none"
            ? category.meta_title
            : category.category_name,
        description:
          category.meta_description && category.meta_description !== "none"
            ? category.meta_description
            : `Browse products in ${category.category_name}`,
      },
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
