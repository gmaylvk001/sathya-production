
import { notFound } from "next/navigation";
import CategoryPrimaryPage from "@/components/category/sample_cat";
import RedirectToOverviewIfDesigned from "@/components/categoryPageComponents/RedirectToOverviewIfDesigned";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import dbConnect from "@/lib/db";
import { resolveCategoryBySlug } from "@/lib/resolveCategorySlug";

export async function generateMetadata({ params }) {
  //const { slug } = params;
  const awaitedParams = await params;
  const slug = awaitedParams?.slug;
  if (!slug || slug === "undefined") {
    return {
      title: "Category Not Found",
      description: "This category does not exist",
    };
  }
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
    //console.log('category',category);
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
        description: category.meta_description && category.meta_description !== "none"
    ? category.meta_description
    : `Browse products in ${category.category_name}`,
        url: `${baseUrl}/category/${slug}`,
        images: category.image ? [`${baseUrl}${category.image}`] : [],
        type: "website",
      },

      twitter: {
        card: "summary_large_image",
        title:
  category.meta_title && category.meta_title !== "none"
    ? category.meta_title
    : category.category_name,
        description: category.meta_description && category.meta_description !== "none"
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

export default async function Page({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams?.slug;
  if (!slug || slug === "undefined") {
    notFound();
  }

  await dbConnect();
  const category = await resolveCategoryBySlug(slug);
  if (!category || (category.status === "Inactive" && category.category_slug !== "combo-offers")) {
    notFound();
  }

  return (
    <>
      <RedirectToOverviewIfDesigned pageType={PAGE_TYPES.CATEGORY} />
      <CategoryPrimaryPage />
    </>
  );
}

