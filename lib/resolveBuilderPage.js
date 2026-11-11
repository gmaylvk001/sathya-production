import CategoryPage from "@/models/categoryPage";
import HomePage from "@/models/homePage";

/**
 * Resolve a page-builder document for either Category Page or Home Page.
 * Config forms reuse the same APIs; home settings pass HomePage._id as pageId.
 */
export async function resolveBuilderPage(pageId) {
  if (!pageId) return null;

  const categoryPage = await CategoryPage.findById(pageId);
  if (categoryPage) {
    return {
      page: categoryPage,
      kind: "category",
      categoryId: categoryPage.categoryId,
      categoryName: categoryPage.categoryName || "",
      categorySlug: categoryPage.categorySlug || "",
    };
  }

  const homePage = await HomePage.findById(pageId);
  if (homePage) {
    return {
      page: homePage,
      kind: "home",
      // Config models still require a categoryId field — reuse HomePage._id
      categoryId: homePage._id,
      categoryName: homePage.name || "Home Page",
      categorySlug: "home",
    };
  }

  return null;
}

/**
 * Resolve home/category context for Top Banner which keys by categoryId.
 * When pageType=home, categoryId is the HomePage._id.
 */
export async function resolveTopBannerOwner({ categoryId, pageType }) {
  if (!categoryId) return null;

  if (pageType === "home") {
    const homePage = await HomePage.findById(categoryId);
    if (!homePage) return null;
    return {
      kind: "home",
      categoryId: homePage._id,
      categoryName: homePage.name || "Home Page",
      categorySlug: "home",
      pageType: "home",
    };
  }

  // Prefer real category; fall back to HomePage if id is a home page doc
  const Category = (await import("@/models/ecom_category_info")).default;
  const category = await Category.findById(categoryId).lean();
  if (category) {
    return {
      kind: "category",
      categoryId: category._id,
      categoryName: category.category_name || "",
      categorySlug: category.category_slug || "",
      pageType: pageType || "category",
    };
  }

  const homePage = await HomePage.findById(categoryId);
  if (homePage) {
    return {
      kind: "home",
      categoryId: homePage._id,
      categoryName: homePage.name || "Home Page",
      categorySlug: "home",
      pageType: "home",
    };
  }

  return null;
}
