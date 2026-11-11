import { notFound } from "next/navigation";
import CategoryClient from "@/components/category/[slug]/[sub_slug]/page";
import CategoryOverviewPage from "@/components/categoryPageComponents/CategoryOverviewPage";
import RedirectToOverviewIfDesigned from "@/components/categoryPageComponents/RedirectToOverviewIfDesigned";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import dbConnect from "@/lib/db";
import { resolveCategoryBySlug } from "@/lib/resolveCategorySlug";

export async function generateMetadata({ params }) {
  const awaitedParams = await params;
  const { slug, sub_slug } = awaitedParams || {};
  if (!slug || !sub_slug || slug === "undefined" || sub_slug === "undefined") {
    return {
      title: "Category Not Found",
      description: "This category does not exist",
    };
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(
      `${baseUrl}/api/categories/${sub_slug}?parent=${encodeURIComponent(slug || "")}`,
      {
        cache: "no-store",
      }
    );

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
      //title: category.meta_title || category.category_name,
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
        url: `${baseUrl}/category/${sub_slug}`,
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

export default async function Page({ params }) {
  const awaitedParams = await params;
  const slug = awaitedParams?.slug;
  const sub_slug = awaitedParams?.sub_slug;

  if (!slug || !sub_slug || slug === "undefined" || sub_slug === "undefined") {
    notFound();
  }

  await dbConnect();

  if (sub_slug === "overview") {
    const category = await resolveCategoryBySlug(slug);
    if (!category || category.status === "Inactive") {
      notFound();
    }
    return (
      <CategoryOverviewPage
        pageType={PAGE_TYPES.CATEGORY}
        slug={slug}
        listingSlugs={[slug]}
      />
    );
  }

  const category = await resolveCategoryBySlug(sub_slug, slug);
  if (!category || category.status === "Inactive") {
    notFound();
  }

  return (
    <>
      <RedirectToOverviewIfDesigned pageType={PAGE_TYPES.SUB_CATEGORY} />
      <CategoryClient />
    </>
  );
}
