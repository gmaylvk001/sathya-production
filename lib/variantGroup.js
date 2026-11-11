import mongoose from "mongoose";
import Product from "@/models/product";
import VariantGroup from "@/models/variantGroup";
import { normalizeVariantValues, valuesKeyFromNames } from "@/lib/variantUtils";

export function normalizeValues(values = {}, attributeNames = []) {
  return normalizeVariantValues(values, attributeNames);
}

function valuesKey(values = {}, attributeNames = []) {
  return valuesKeyFromNames(values, attributeNames);
}

export async function buildPublicVariantGroup(group) {
  if (!group) return null;
  const attributeNames = (group.attributes || []).map((attr) => attr.name).filter(Boolean);
  const ids = (group.products || []).map((entry) => entry.productId).filter(Boolean);
  const siblings = ids.length
    ? await Product.find({ _id: { $in: ids } })
        .select("_id name slug price special_price quantity stock_status images color size capacity item_code status variantGroupId")
        .lean()
    : [];
  const siblingMap = new Map(siblings.map((p) => [String(p._id), p]));

  const products = (group.products || [])
    .map((entry) => {
      const full = siblingMap.get(String(entry.productId));
      if (!full) return null;
      return {
        ...full,
        _id: String(full._id),
        variantGroupId: full.variantGroupId ? String(full.variantGroupId) : null,
        values: normalizeVariantValues(
          entry.values && typeof entry.values === "object" ? entry.values : {},
          attributeNames
        ),
      };
    })
    .filter(Boolean);

  return {
    _id: String(group._id),
    name: group.name || "",
    group_code: group.group_code || "",
    attributes: (group.attributes || []).map((attr) => ({
      name: attr.name,
      type: attr.type === "color" ? "color" : "text",
      options: Array.isArray(attr.options)
        ? attr.options.map((option) => String(option || "").trim()).filter(Boolean)
        : [],
      valuesMeta: (attr.valuesMeta || []).map((meta) => ({
        value: meta.value || "",
        image: meta.image || "",
        colorHex: meta.colorHex || "",
      })),
    })),
    products,
  };
}

export async function attachVariantGroupToProduct(product) {
  if (!product?.variantGroupId) {
    product.variantGroup = null;
    return product;
  }

  const group = await VariantGroup.findById(product.variantGroupId).lean();
  if (!group) {
    product.variantGroup = null;
    return product;
  }

  product.variantGroup = await buildPublicVariantGroup(group);
  return product;
}

export async function applyRegionPricingToVariantGroup(product, region = "tamilnadu") {
  if (!product?.variantGroup?.products?.length) return product;

  const OwnerProduct = (await import("@/models/OwnerProduct")).default;
  const { resolveProductPrice } = await import("@/lib/priceResolver");

  const siblings = product.variantGroup.products;
  const ownerMap = new Map();

  if (region === "karnataka") {
    const ownerProducts = await OwnerProduct.find({
      $or: [
        { product_id: { $in: siblings.map((p) => p._id) } },
        { product_item_code: { $in: siblings.map((p) => p.item_code).filter(Boolean) } },
      ],
      is_active: true,
    }).lean();

    for (const owner of ownerProducts) {
      if (owner.product_id) ownerMap.set(String(owner.product_id), owner);
      if (owner.product_item_code) ownerMap.set(String(owner.product_item_code), owner);
    }
  }

  product.variantGroup.products = siblings.map((sibling) => {
    const owner =
      ownerMap.get(String(sibling._id)) ||
      ownerMap.get(String(sibling.item_code)) ||
      null;
    const priceInfo = resolveProductPrice(sibling, owner, region);
    return {
      ...sibling,
      price: priceInfo.price,
      special_price: priceInfo.special_price,
      quantity: priceInfo.stock,
      stock_status: priceInfo.inStock ? "In Stock" : "Out of Stock",
      isUnilet: priceInfo.isUnilet,
      usingLsp: priceInfo.usingLsp,
      resolvedRegion: region,
    };
  });

  return product;
}

export async function syncProductVariantGroupLinks(groupId, productIds) {
  const groupObjectId = new mongoose.Types.ObjectId(groupId);
  const uniqueIds = [...new Set((productIds || []).map((id) => String(id)))];

  await Product.updateMany(
    { variantGroupId: groupObjectId, _id: { $nin: uniqueIds } },
    { $set: { variantGroupId: null } }
  );

  if (uniqueIds.length) {
    await Product.updateMany(
      { _id: { $in: uniqueIds } },
      { $set: { variantGroupId: groupObjectId } }
    );
  }
}

export async function unlinkAllProducts(groupId) {
  await Product.updateMany(
    { variantGroupId: groupId },
    { $set: { variantGroupId: null } }
  );
}

export function parseGroupPayload(body = {}) {
  const name = String(body.name || "").trim();
  const group_code =
    body.group_code !== undefined ? String(body.group_code || "").trim() : undefined;
  const attributes = Array.isArray(body.attributes)
    ? body.attributes
        .map((attr) => ({
          name: String(attr.name || "").trim(),
          type: String(attr.type || "").toLowerCase() === "color" ? "color" : "text",
          options: Array.isArray(attr.options)
            ? [...new Set(attr.options.map((option) => String(option || "").trim()).filter(Boolean))]
            : [],
          valuesMeta: Array.isArray(attr.valuesMeta)
            ? attr.valuesMeta
                .map((meta) => ({
                  value: String(meta.value || "").trim(),
                  image: String(meta.image || "").trim(),
                  colorHex: String(meta.colorHex || "").trim(),
                }))
                .filter((meta) => meta.value)
            : [],
        }))
        .filter((attr) => attr.name)
    : [];

  const attributeNames = attributes.map((attr) => attr.name);
  const products = Array.isArray(body.products)
    ? body.products
        .map((entry) => ({
          productId: entry.productId || entry._id,
          values: normalizeValues(entry.values || {}, attributeNames),
        }))
        .filter((entry) => entry.productId)
    : [];

  return { name, group_code, attributes, products, attributeNames };
}

export async function validateGroupPayload({ name, products, attributeNames, groupId = null }) {
  if (!name) {
    return { error: "Variant group name is required", status: 400 };
  }
  if (products.length < 2) {
    return { error: "Select at least two existing products", status: 400 };
  }

  const ids = products.map((p) => String(p.productId));
  if (new Set(ids).size !== ids.length) {
    return { error: "Duplicate products are not allowed in a group", status: 400 };
  }

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length !== ids.length) {
    return { error: "Invalid product id in selection", status: 400 };
  }

  const existing = await Product.find({ _id: { $in: validIds } })
    .select("_id name variantGroupId")
    .lean();
  if (existing.length !== validIds.length) {
    return { error: "One or more selected products were not found", status: 400 };
  }

  const conflict = existing.find((product) => {
    if (!product.variantGroupId) return false;
    return String(product.variantGroupId) !== String(groupId || "");
  });
  if (conflict) {
    return {
      error: `"${conflict.name}" already belongs to another variant group`,
      status: 400,
    };
  }

  if (attributeNames.length) {
    for (const entry of products) {
      const missing = attributeNames.filter((name) => !String(entry.values?.[name] || "").trim());
      if (missing.length) {
        return {
          error: `Fill every variant value for all selected products (${missing.join(", ")})`,
          status: 400,
        };
      }
    }
    const seen = new Set();
    for (const entry of products) {
      const key = valuesKey(entry.values, attributeNames);
      if (seen.has(key)) {
        return {
          error: "Two products share the same variant combination. Each combination must be unique.",
          status: 400,
        };
      }
      seen.add(key);
    }
  } else {
    return { error: "Add at least one variant attribute (for example Storage or Color)", status: 400 };
  }

  return { existing };
}
