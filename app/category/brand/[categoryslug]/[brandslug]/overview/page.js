import CategoryOverviewPage from "@/components/categoryPageComponents/CategoryOverviewPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { buildCategoryBrandBasePath } from "@/lib/categoryPageComponents/categoryHref";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const categorySlug = awaitedParams.categoryslug;
  const brandSlug = awaitedParams.brandslug;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  return {
    title: "Category Brand Overview",
    description: "Category and brand overview page",
    alternates: {
      canonical: `${baseUrl}/category/brand/${categorySlug}/${brandSlug}`,
    },
  };
}

export default async function Page({ params }) {
  const awaitedParams = await params;
  const categorySlug = awaitedParams.categoryslug;
  const brandSlug = awaitedParams.brandslug;

  return (
    <CategoryOverviewPage
      pageType={PAGE_TYPES.CATEGORY_BRAND}
      slug={categorySlug}
      brandSlug={brandSlug}
      listingPath={buildCategoryBrandBasePath(categorySlug, brandSlug)}
    />
  );
}
