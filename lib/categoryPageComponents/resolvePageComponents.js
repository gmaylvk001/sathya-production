import mongoose from "mongoose";
import CategoryPage from "@/models/categoryPage";
import CategoryTopBanner from "@/models/categoryTopbanner";
import CategoryImageCarousel from "@/models/categoryImageCarousel";
import CategoryProductCarousel from "@/models/categoryProductCarousel";
import CategoryBannerSideProducts from "@/models/categoryBannerSideProducts";
import CategoryBannerFourProducts from "@/models/categoryBannerFourProducts";
import CategoryBannerGrid from "@/models/categoryBannerGrid";
import CategoryImageColumns from "@/models/categoryImageColumns";
import CategorySingleBannerProducts from "@/models/categorySingleBannerProducts";
import CategoryBrandCarousel from "@/models/categoryBrandCarousel";
import CategoryImageHotspotBanner from "@/models/categoryImageHotspotBanner";
import CategoryContent from "@/models/categoryContent";
import CategorySplitBanner from "@/models/categorySplitBanner";
import CategoryCircleImageCarousel from "@/models/categoryCircleImageCarousel";
import ecom_category_info from "@/models/ecom_category_info";
import { resolveCategoryBySlug } from "@/lib/resolveCategorySlug";
import ecom_brand_info from "@/models/ecom_brand_info";
import Product from "@/models/product";
import {
  COMPONENT_TYPES,
  PAGE_TYPES,
} from "@/lib/categoryPageComponents/registry";
import {
  availabilityKey,
  buildCategoryBrandHref,
  CATEGORY_TREE_PAGE_TYPES,
  hasOverviewAvailability,
} from "@/lib/categoryPageComponents/categoryHref";
import {
  brandsToCarouselItems,
  resolveBrandsForCategory,
} from "@/lib/categoryPageComponents/resolveCategoryBrands";

function toObjectIds(ids = []) {
  return [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

async function collectCategoryScopeIds(rootId) {
  const root = String(rootId || "").trim();
  if (!root) return [];
  const children = await ecom_category_info
    .find({
      $or: [{ parentid: root }, { parentid: rootId }],
    })
    .select("_id")
    .lean();
  return [root, ...children.map((c) => String(c._id))];
}

function categoryIdFilter(categoryId) {
  if (!categoryId) return null;
  const str = String(categoryId);
  const values = [str];
  if (mongoose.Types.ObjectId.isValid(str)) {
    values.push(new mongoose.Types.ObjectId(str));
  }
  return { $in: values };
}

async function findCategoryLayoutPage({
  pageType,
  categoryId,
  slug,
  slugVariants = [],
  brandId,
  brandSlug,
}) {
  const isTree = CATEGORY_TREE_PAGE_TYPES.includes(pageType);
  const catFilter = categoryIdFilter(categoryId);
  const attempts = [];

  if (pageType === PAGE_TYPES.CATEGORY_BRAND) {
    if (catFilter && brandId) {
      attempts.push({
        pageType,
        categoryId: catFilter,
        brandId,
        status: "active",
      });
    }
    if (slug && brandSlug) {
      attempts.push({
        pageType,
        categorySlug: slug,
        brandSlug,
        status: "active",
      });
    }
  } else if (pageType === PAGE_TYPES.BRAND) {
    if (catFilter) {
      attempts.push({ pageType, categoryId: catFilter, status: "active" });
    }
    if (slug) {
      attempts.push({ pageType, categorySlug: slug, status: "active" });
    }
  } else if (catFilter) {
    attempts.push({ pageType, categoryId: catFilter, status: "active" });
    if (isTree) {
      attempts.push({
        categoryId: catFilter,
        status: "active",
        pageType: { $in: CATEGORY_TREE_PAGE_TYPES },
      });
    }
  }

  const slugs = [...new Set(slugVariants.filter(Boolean))];
  if (isTree && slugs.length) {
    const slugFilter = slugs.length > 1 ? { $in: slugs } : slugs[0];
    attempts.push({
      pageType,
      categorySlug: slugFilter,
      status: "active",
    });
    attempts.push({
      categorySlug: slugFilter,
      status: "active",
      pageType: { $in: CATEGORY_TREE_PAGE_TYPES },
    });
  }

  for (const filter of attempts) {
    const page = await CategoryPage.findOne(filter).lean();
    if (page) return page;
  }
  return null;
}

function resolveHref(raw) {
  const link = String(raw || "").trim();
  if (!link) return "";
  if (/^https?:\/\//i.test(link) || link.startsWith("/")) return link;
  return `/category/${link.replace(/^\/+/, "")}`;
}

const PRODUCT_SELECT =
  "name slug images price special_price model_number item_code stock_status quantity brand category sub_category movement lsp";

async function resolveActiveProducts(refs, fallbackOptions = {}) {
  const sorted = [...(refs || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const ids = sorted.map((r) => r.productId).filter(Boolean);
  let found = [];
  if (ids.length) {
    found = await Product.find({
      _id: { $in: ids },
      status: "Active",
    })
      .select(PRODUCT_SELECT)
      .lean();
  }

  const byId = Object.fromEntries(found.map((p) => [String(p._id), p]));
  const seen = new Set();
  let result = sorted
    .map((r) => byId[String(r.productId)])
    .filter((p) => {
      if (!p?._id) return false;
      const id = String(p._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

  const minRequired = fallbackOptions.minCount || 4;
  if (result.length < minRequired) {
    const limit = fallbackOptions.limit || 12;
    const excludeIds = result.map((p) => p._id);
    let fallbackQuery = { status: "Active" };

    if (excludeIds.length) {
      fallbackQuery._id = { $nin: excludeIds };
    }

    if (fallbackOptions.categoryScopeIds && fallbackOptions.categoryScopeIds.length > 0) {
      const scopeIds = fallbackOptions.categoryScopeIds.map((id) => id?.toString?.() || String(id));
      fallbackQuery.$or = [
        { sub_category: { $in: scopeIds } },
        { category: { $in: scopeIds } },
      ];
    } else if (fallbackOptions.searchTerm) {
      fallbackQuery.name = { $regex: fallbackOptions.searchTerm.split(" ")[0], $options: "i" };
    }

    const fallbackProducts = await Product.find(fallbackQuery)
      .select(PRODUCT_SELECT)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit - result.length)
      .lean();

    for (const p of fallbackProducts) {
      const id = String(p._id);
      if (!seen.has(id)) {
        seen.add(id);
        result.push(p);
      }
    }
  }

  return result;
}

/**
 * Resolve storefront-ready components for a category page.
 * Same semantics as GET /api/category-pages/render.
 */
export async function resolveCategoryPageComponents({
  categoryId: rawCategoryId,
  slug,
  parentSlug = null,
  brandSlug,
  brandId: rawBrandId,
  pageType,
  region = "all",
} = {}) {
  if (!pageType || !Object.values(PAGE_TYPES).includes(pageType)) {
    throw new Error("Valid pageType required");
  }

  const filterBannersByRegion = (rawBanners, targetRegion) => {
    let list = (rawBanners || [])
      .filter((b) => b.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (targetRegion && targetRegion !== "all") {
      const reg = String(targetRegion).toLowerCase();
      const regionBanners = list.filter(
        (b) => (b.state || "all").toLowerCase() === reg
      );
      if (regionBanners.length > 0) {
        list = regionBanners;
      } else {
        list = list.filter((b) => !b.state || b.state === "all");
      }
    }
    return list;
  };

  let categoryId = rawCategoryId;
  let brandId = rawBrandId;

  if (pageType === PAGE_TYPES.CATEGORY_BRAND) {
    if (!categoryId && slug) {
      const cat = await ecom_category_info
        .findOne({ category_slug: slug })
        .select("_id")
        .lean();
      if (!cat) {
        return { success: true, hasPage: false, hasDesign: false, components: [] };
      }
      categoryId = cat._id;
    }
    if (!brandId && brandSlug) {
      const brand = await ecom_brand_info
        .findOne({ brand_slug: brandSlug })
        .select("_id")
        .lean();
      if (!brand) {
        return { success: true, hasPage: false, hasDesign: false, components: [] };
      }
      brandId = brand._id;
    }
    if (slug) {
      const catBySlug = await ecom_category_info
        .findOne({ category_slug: slug })
        .select("_id")
        .lean();
      if (catBySlug) categoryId = catBySlug._id;
    }
    if (brandSlug) {
      const brandBySlug = await ecom_brand_info
        .findOne({ brand_slug: brandSlug })
        .select("_id")
        .lean();
      if (brandBySlug) brandId = brandBySlug._id;
    }
    if (!categoryId || !brandId) {
      throw new Error("categoryId/slug and brandId/brandSlug required");
    }
  } else {
    if (!categoryId && slug) {
      if (pageType === PAGE_TYPES.BRAND) {
        const brand = await ecom_brand_info
          .findOne({ brand_slug: slug })
          .select("_id")
          .lean();
        if (!brand) {
          return { success: true, hasPage: false, hasDesign: false, components: [] };
        }
        categoryId = brand._id;
      } else {
        const cat = await resolveCategoryBySlug(slug, parentSlug);
        if (!cat) {
          return { success: true, hasPage: false, hasDesign: false, components: [] };
        }
        categoryId = cat._id;
      }
    }

    if (slug) {
      if (pageType === PAGE_TYPES.BRAND) {
        const brandBySlug = await ecom_brand_info
          .findOne({ brand_slug: slug })
          .select("_id")
          .lean();
        if (brandBySlug) {
          categoryId = brandBySlug._id;
        }
      } else {
        const catBySlug = await resolveCategoryBySlug(slug, parentSlug);
        if (catBySlug) {
          categoryId = catBySlug._id;
        }
      }
    }

    if (!categoryId) {
      throw new Error("categoryId or slug required");
    }
  }

  const categoryScopeIds =
    categoryId &&
    pageType !== PAGE_TYPES.BRAND &&
    pageType !== PAGE_TYPES.CATEGORY_BRAND
      ? await collectCategoryScopeIds(categoryId)
      : [];

  const resolvedCat = categoryId
    ? await ecom_category_info.findById(categoryId).select("category_slug").lean()
    : null;
  const slugVariants = [
    ...new Set(
      [slug, resolvedCat?.category_slug]
        .map((s) => String(s || "").trim())
        .filter(Boolean)
    ),
  ];

  const page = await findCategoryLayoutPage({
    pageType,
    categoryId,
    slug,
    slugVariants,
    brandId,
    brandSlug,
  });

  if (!page) {
    if (pageType === PAGE_TYPES.CATEGORY_BRAND) {
      return { success: true, hasPage: false, hasDesign: false, components: [] };
    }
    const top = await CategoryTopBanner.findOne({
      categoryId,
      status: "active",
      $or: [{ pageId: { $exists: false } }, { pageId: null }],
    }).lean();
    if (!top) {
      return { success: true, hasPage: false, hasDesign: false, components: [] };
    }
    const banners = filterBannersByRegion(top.banners, region);
    const components = banners.length
      ? [
          {
            type: COMPONENT_TYPES.TOP_BANNER,
            order: 0,
            config: { banners },
          },
        ]
      : [];
    return {
      success: true,
      hasPage: false,
      hasDesign: components.length > 0,
      components,
    };
  }

  const sorted = [...(page.components || [])]
    .filter((c) => c.isActive !== false)
    .sort((a, b) => a.order - b.order);

  const components = [];
  for (const item of sorted) {
    try {
    if (item.type === COMPONENT_TYPES.TOP_BANNER) {
      let top = await CategoryTopBanner.findOne({
        pageId: page._id,
        status: "active",
      }).lean();
      if (!top) {
        top = await CategoryTopBanner.findOne({
          categoryId: page.categoryId,
          status: "active",
          $or: [{ pageId: { $exists: false } }, { pageId: null }],
        }).lean();
      }
      if (!top) continue;
      const banners = filterBannersByRegion(top.banners, region);
      if (!banners.length) continue;
      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: { banners },
      });
    } else if (item.type === COMPONENT_TYPES.IMAGE_CAROUSEL) {
      let carousel = null;
      if (item.configId) {
        carousel = await CategoryImageCarousel.findById(item.configId).lean();
      }
      if (!carousel) {
        carousel = await CategoryImageCarousel.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!carousel || carousel.status !== "active") continue;
      const items = (carousel.items || [])
        .filter((i) => i.isActive !== false && i.image)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (!items.length) continue;
      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: carousel.name,
          showGap: Boolean(carousel.showGap),
          items,
        },
      });
    } else if (item.type === COMPONENT_TYPES.PRODUCT_CAROUSEL) {
      let carousel = null;
      if (item.configId) {
        carousel = await CategoryProductCarousel.findById(item.configId).lean();
      }
      if (!carousel) {
        carousel = await CategoryProductCarousel.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!carousel || carousel.status !== "active") continue;
      const products = await resolveActiveProducts(carousel.products, {
        categoryScopeIds,
        searchTerm: carousel.name,
        minCount: 4,
        limit: 12,
      });
      if (!products.length) continue;

      const rawLink = String(carousel.seeAllLink || "").trim();
      let seeAllHref = "";
      if (rawLink) {
        if (/^https?:\/\//i.test(rawLink) || rawLink.startsWith("/")) {
          seeAllHref = rawLink;
        } else {
          seeAllHref = `/category/${rawLink.replace(/^\/+/, "")}`;
        }
      }

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: carousel.name,
          products,
          seeAllHref,
        },
      });
    } else if (item.type === COMPONENT_TYPES.BANNER_SIDE_PRODUCTS) {
      let block = null;
      if (item.configId) {
        block = await CategoryBannerSideProducts.findById(item.configId).lean();
      }
      if (!block) {
        block = await CategoryBannerSideProducts.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;
      if (!block.mainBannerDesktop || !block.sideBannerImage) continue;

      const products = await resolveActiveProducts(block.products, {
        categoryScopeIds,
        searchTerm: block.name,
        minCount: 4,
        limit: 12,
      });

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name,
          mainBannerDesktop: block.mainBannerDesktop,
          mainBannerMobile: block.mainBannerMobile || block.mainBannerDesktop,
          mainBannerHref: resolveHref(block.mainBannerUrl),
          sideBannerImage: block.sideBannerImage,
          sideBannerHref: resolveHref(block.sideBannerUrl),
          sideBannerPosition:
            block.sideBannerPosition === "right" ? "right" : "left",
          products,
        },
      });
    } else if (item.type === COMPONENT_TYPES.BANNER_FOUR_PRODUCTS) {
      let block = null;
      if (item.configId) {
        block = await CategoryBannerFourProducts.findById(item.configId).lean();
      }
      if (!block) {
        block = await CategoryBannerFourProducts.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;
      if (!block.bannerDesktop) continue;

      const tiles = [...(block.tiles || [])]
        .filter((t) => t.image)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, 4);
      if (tiles.length < 3) continue;

      const products = await resolveActiveProducts(block.products, {
        categoryScopeIds,
        searchTerm: block.name,
        minCount: 4,
        limit: 12,
      });

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name,
          bannerDesktop: block.bannerDesktop,
          bannerMobile: block.bannerMobile || block.bannerDesktop,
          bannerHref: resolveHref(block.bannerUrl),
          tilesBgColor: block.tilesBgColor || "#0d9488",
          tiles: tiles.map((t) => ({
            image: t.image,
            url: t.url || "",
          })),
          products,
        },
      });
    } else if (item.type === COMPONENT_TYPES.BANNER_GRID) {
      let block = null;
      if (item.configId) {
        block = await CategoryBannerGrid.findById(item.configId).lean();
      }
      if (!block) {
        block = await CategoryBannerGrid.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;

      const count = [2, 3, 4].includes(block.imageCount)
        ? block.imageCount
        : 4;
      const banners = [...(block.banners || [])]
        .filter((b) => b.image)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, count);
      if (banners.length < 2) continue;

      const refs = [...(block.products || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      let products = [];
      if (block.productName) {
        products = await resolveActiveProducts(refs, {
          categoryScopeIds,
          searchTerm: block.productName || block.name,
          minCount: 6,
          limit: 12,
        });
      }

      const rawLink = String(block.seeAllLink || "").trim();
      let seeAllHref = "";
      if (rawLink) {
        if (/^https?:\/\//i.test(rawLink) || rawLink.startsWith("/")) {
          seeAllHref = rawLink;
        } else {
          seeAllHref = `/category/${rawLink.replace(/^\/+/, "")}`;
        }
      }

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name,
          productName: block.productName,
          seeAllLink: block.seeAllLink || "",
          seeAllHref,
          products,
          showGap: Boolean(block.showGap),
          banners: banners.map((b) => ({
            image: b.image,
            url: b.url || "",
          })),
        },
      });
    } else if (item.type === COMPONENT_TYPES.IMAGE_COLUMNS) {
      let block = null;
      if (item.configId) {
        block = await CategoryImageColumns.findById(item.configId).lean();
      }
      if (!block) {
        block = await CategoryImageColumns.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;

      const layout = ["center_big", "left_big", "right_big"].includes(
        block.layout
      )
        ? block.layout
        : "center_big";
      const images = [...(block.images || [])]
        .filter((img) => img?.image && img?.slot)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (images.length < 5) continue;

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name,
          layout,
          showGap: Boolean(block.showGap),
          images: images.map((img) => ({
            image: img.image,
            url: img.url || "",
            slot: img.slot,
          })),
        },
      });
    } else if (item.type === COMPONENT_TYPES.SINGLE_BANNER_PRODUCTS) {
      let block = null;
      if (item.configId) {
        block = await CategorySingleBannerProducts.findById(
          item.configId
        ).lean();
      }
      if (!block) {
        block = await CategorySingleBannerProducts.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;
      if (!block.bannerDesktop) continue;

      const refs = [...(block.products || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );

      const products = await resolveActiveProducts(refs, {
        categoryScopeIds,
        searchTerm: block.name,
        seeAllLink: block.bannerUrl,
        minCount: 6,
        limit: 12,
      });
      if (products.length < 1) continue;

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name,
          bannerDesktop: block.bannerDesktop,
          bannerMobile: block.bannerMobile || block.bannerDesktop,
          bannerHref: resolveHref(block.bannerUrl),
          products,
        },
      });
    } else if (item.type === COMPONENT_TYPES.BRAND_CAROUSEL) {
      let carousel = null;
      if (item.configId) {
        carousel = await CategoryBrandCarousel.findById(item.configId).lean();
      }
      if (!carousel) {
        carousel = await CategoryBrandCarousel.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!carousel || carousel.status !== "active") continue;

      let items = [];
      if (carousel.autoBrandsFromCategory) {
        const categoryIdForBrands = carousel.categoryId || categoryId;
        const brands = await resolveBrandsForCategory(categoryIdForBrands);
        const availability = await getCategoryPagesAvailability(
          brands
            .filter((b) => b._id)
            .map((b) => ({
              categoryId: String(categoryIdForBrands),
              pageType: PAGE_TYPES.CATEGORY_BRAND,
              brandId: String(b._id),
            }))
        );
        const withUrls = brands.map((brand) => ({
          ...brand,
          url: buildCategoryBrandHref(
            page.categorySlug,
            brand.brand_slug,
            hasOverviewAvailability(
              availability,
              categoryIdForBrands,
              PAGE_TYPES.CATEGORY_BRAND,
              brand._id
            )
          ),
        }));
        items = brandsToCarouselItems(withUrls);
      } else {
        items = (carousel.items || [])
          .filter((i) => i.isActive !== false && i.image)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      if (!items.length) continue;
      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: carousel.name,
          showGap: Boolean(carousel.showGap),
          autoBrandsFromCategory: Boolean(carousel.autoBrandsFromCategory),
          items,
        },
      });
    } else if (item.type === COMPONENT_TYPES.IMAGE_HOTSPOT_BANNER) {
      let block = null;
      if (item.configId) {
        block = await CategoryImageHotspotBanner.findById(
          item.configId
        ).lean();
      }
      if (!block) {
        block = await CategoryImageHotspotBanner.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;
      if (!block.bannerImage) continue;

      const hotspots = [...(block.hotspots || [])]
        .filter((h) => h && h.isActive !== false && h.link)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name,
          bannerImage: block.bannerImage,
          hotspots,
        },
      });
    } else if (item.type === COMPONENT_TYPES.CATEGORY_CONTENT) {
      let block = null;
      if (item.configId) {
        block = await CategoryContent.findById(item.configId).lean();
      }
      if (!block) {
        block = await CategoryContent.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;
      const text = String(block.content || "").trim();
      if (!text) continue;

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: block.name || "",
          content: text,
        },
      });
    } else if (item.type === COMPONENT_TYPES.SPLIT_BANNER) {
      let block = null;
      if (item.configId) {
        block = await CategorySplitBanner.findById(item.configId).lean();
      }
      if (!block) {
        block = await CategorySplitBanner.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!block || block.status !== "active") continue;

      const bannerCount = Number(block.bannerCount) === 2 ? 2 : 1;
      const banners = [...(block.banners || [])]
        .filter((b) => b?.image)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, bannerCount);
      if (banners.length < bannerCount) continue;

      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          bannerCount,
          banners: banners.map((b) => ({
            image: b.image,
            url: b.url || "",
            order: b.order ?? 0,
          })),
        },
      });
    } else if (item.type === COMPONENT_TYPES.CIRCLE_IMAGE_CAROUSEL) {
      let carousel = null;
      if (item.configId) {
        carousel = await CategoryCircleImageCarousel.findById(
          item.configId
        ).lean();
      }
      if (!carousel) {
        carousel = await CategoryCircleImageCarousel.findOne({
          instanceId: item.instanceId,
        }).lean();
      }
      if (!carousel || carousel.status !== "active") continue;
      const items = (carousel.items || [])
        .filter((i) => i.isActive !== false && i.image)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (!items.length) continue;
      components.push({
        instanceId: item.instanceId,
        type: item.type,
        order: item.order,
        config: {
          name: carousel.name,
          items,
        },
      });
    }
    } catch (err) {
      console.error("Category page component failed:", item?.type, err);
    }
  }

  const layoutHasBlocks = (page.components || []).some(
    (c) => c.isActive !== false
  );

  return {
    success: true,
    hasPage: true,
    hasDesign: components.length > 0 || layoutHasBlocks,
    components,
  };
}

/**
 * Fast batched availability check used by header navigation.
 * Matches render semantics for "active page with at least one active layout
 * component", plus legacy Top Banner fallback when no CategoryPage exists.
 */
export async function getCategoryPagesAvailability(pages = []) {
  const availability = {};
  const normalized = [];

  for (const entry of pages) {
    const pageType = entry?.pageType;
    if (!pageType || !Object.values(PAGE_TYPES).includes(pageType)) continue;

    let categoryId = entry?.categoryId ? String(entry.categoryId) : "";
    let brandId = entry?.brandId ? String(entry.brandId) : "";

    if (!categoryId && entry?.slug) {
      if (pageType === PAGE_TYPES.BRAND) {
        const brand = await ecom_brand_info
          .findOne({ brand_slug: entry.slug })
          .select("_id")
          .lean();
        if (brand) categoryId = String(brand._id);
      } else {
        const cat = await resolveCategoryBySlug(entry.slug, entry.parentSlug);
        if (cat) categoryId = String(cat._id);
      }
    }

    if (pageType === PAGE_TYPES.CATEGORY_BRAND && !brandId && entry?.brandSlug) {
      const brand = await ecom_brand_info
        .findOne({ brand_slug: entry.brandSlug })
        .select("_id")
        .lean();
      if (brand) brandId = String(brand._id);
    }

    if (!categoryId) continue;
    if (pageType === PAGE_TYPES.CATEGORY_BRAND && !brandId) continue;

    const key = availabilityKey(categoryId, pageType, brandId);
    availability[key] = false;
    normalized.push({ categoryId, pageType, brandId, key });
  }

  if (!normalized.length) return availability;

  const uniqueIds = [...new Set(normalized.map((n) => n.categoryId))];
  const objectIds = toObjectIds(uniqueIds);
  const pageTypes = [...new Set(normalized.map((n) => n.pageType))];
  const queryTypes = pageTypes.some((t) => CATEGORY_TREE_PAGE_TYPES.includes(t))
    ? [...new Set([...pageTypes, ...CATEGORY_TREE_PAGE_TYPES])]
    : pageTypes;

  if (!objectIds.length) return availability;

  const categoryDocs = await ecom_category_info
    .find({ _id: { $in: objectIds } })
    .select("_id category_slug")
    .lean();
  const slugByCategoryId = new Map(
    categoryDocs.map((c) => [String(c._id), String(c.category_slug || "").trim()])
  );
  const categoryIdsBySlug = new Map();
  for (const cat of categoryDocs) {
    const slug = String(cat.category_slug || "").trim();
    if (!slug) continue;
    if (!categoryIdsBySlug.has(slug)) categoryIdsBySlug.set(slug, []);
    categoryIdsBySlug.get(slug).push(String(cat._id));
  }
  const slugs = [...categoryIdsBySlug.keys()];

  const foundPages = await CategoryPage.find({
    status: "active",
    pageType: { $in: queryTypes },
    $or: [
      { categoryId: { $in: objectIds } },
      ...(slugs.length ? [{ categorySlug: { $in: slugs } }] : []),
    ],
  })
    .select("_id categoryId pageType brandId categorySlug components")
    .lean();

  const pageHasDesign = (page) =>
    (page?.components || []).some((c) => c.isActive !== false);

  const pageMap = new Map(
    foundPages.map((p) => [
      availabilityKey(
        String(p.categoryId),
        p.pageType,
        p.brandId ? String(p.brandId) : ""
      ),
      p,
    ])
  );

  const designedTreeCategoryIds = new Set();
  for (const page of foundPages) {
    if (!CATEGORY_TREE_PAGE_TYPES.includes(page.pageType)) continue;
    designedTreeCategoryIds.add(String(page.categoryId));
    const slug = String(page.categorySlug || "").trim();
    const slugIds = slug ? categoryIdsBySlug.get(slug) : null;
    if (slugIds) {
      slugIds.forEach((id) => designedTreeCategoryIds.add(id));
    }
    const slugFromId = slugByCategoryId.get(String(page.categoryId));
    if (slugFromId && categoryIdsBySlug.has(slugFromId)) {
      categoryIdsBySlug.get(slugFromId).forEach((id) =>
        designedTreeCategoryIds.add(id)
      );
    }
  }

  const missingCategoryIds = new Set();
  const missingPageIds = [];

  for (const item of normalized) {
    if (CATEGORY_TREE_PAGE_TYPES.includes(item.pageType)) {
      const designed = designedTreeCategoryIds.has(item.categoryId);
      availability[item.key] = designed;
      if (designed) {
        for (const type of CATEGORY_TREE_PAGE_TYPES) {
          availability[availabilityKey(item.categoryId, type)] = true;
        }
      } else {
        missingCategoryIds.add(item.categoryId);
      }
      continue;
    }

    const page = pageMap.get(item.key);
    if (page) {
      availability[item.key] = pageHasDesign(page);
      if (item.slug && item.pageType === PAGE_TYPES.BRAND) {
        availability[availabilityKey(item.slug, item.pageType)] = availability[item.key];
      }
      if (!availability[item.key] && item.pageType === PAGE_TYPES.CATEGORY_BRAND) {
        missingPageIds.push(page._id);
      }
    } else if (item.pageType !== PAGE_TYPES.CATEGORY_BRAND) {
      if (item.slug && item.pageType === PAGE_TYPES.BRAND) {
        availability[availabilityKey(item.slug, item.pageType)] = false;
      }
      missingCategoryIds.add(item.categoryId);
    }
  }

  for (const item of normalized) {
    if (availability[item.key]) continue;
    if (item.pageType === PAGE_TYPES.CATEGORY_BRAND) continue;
    missingCategoryIds.add(item.categoryId);
  }

  if (missingPageIds.length > 0) {
    const topsByPage = await CategoryTopBanner.find({
      pageId: { $in: missingPageIds },
      status: "active",
    })
      .select("pageId banners")
      .lean();
    const topByPageId = new Map(
      topsByPage.map((t) => [String(t.pageId), t])
    );
    for (const item of normalized) {
      if (availability[item.key] || item.pageType !== PAGE_TYPES.CATEGORY_BRAND) {
        continue;
      }
      const page = pageMap.get(item.key);
      if (!page) continue;
      const top = topByPageId.get(String(page._id));
      if (!top) continue;
      const banners = (top.banners || []).filter((b) => b.isActive !== false);
      if (banners.length > 0) availability[item.key] = true;
    }
  }

  if (missingCategoryIds.size > 0) {
    const missingObjectIds = toObjectIds([...missingCategoryIds]);
    const tops = missingObjectIds.length
      ? await CategoryTopBanner.find({
          categoryId: { $in: missingObjectIds },
          status: "active",
          pageId: { $exists: false },
        })
          .select("categoryId banners")
          .lean()
      : [];

    const topByCategory = new Map(
      tops.map((t) => [String(t.categoryId), t])
    );

    for (const item of normalized) {
      if (availability[item.key]) continue;
      if (item.pageType === PAGE_TYPES.CATEGORY_BRAND) continue;
      if (!missingCategoryIds.has(item.categoryId)) continue;
      const top = topByCategory.get(item.categoryId);
      if (!top) continue;
      const banners = (top.banners || []).filter((b) => b.isActive !== false);
      if (banners.length > 0) {
        availability[item.key] = true;
      }
    }
  }

  return availability;
}

