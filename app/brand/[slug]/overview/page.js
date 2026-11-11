import CategoryOverviewPage from "@/components/categoryPageComponents/CategoryOverviewPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { buildBrandBasePath } from "@/lib/categoryPageComponents/categoryHref";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams.slug;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  return {
    title: "Brand Overview",
    description: "Brand overview page",
    alternates: {
      canonical: `${baseUrl}/brand/${slug}`,
    },
  };
}

export default async function Page({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams.slug;

  return (
    <CategoryOverviewPage
      pageType={PAGE_TYPES.BRAND}
      slug={slug}
      listingPath={buildBrandBasePath(slug)}
    />
  );
}
