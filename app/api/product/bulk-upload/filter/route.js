import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import FilterGroup from '@/models/ecom_filter_group_infos';
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";
import GroupInfo from '@/models/ecom_group_name_info';

export const config = {
    api: {
        bodyParser: false,
    },
};

const escapeRegex = (text = '') => {
    return text.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const makeSlug = (text = '') => {
    return text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/** Normalize row object keys: trim, lowercase, replace spaces/hyphens with underscores */
function normalizeRow(row = {}) {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
        if (!key) continue;
        const normalizedKey = key
            .replace(/^\uFEFF/, '')
            .trim()
            .toLowerCase()
            .replace(/[\s\-]+/g, '_');
        out[normalizedKey] = value;
    }
    return out;
}

function getCellValue(row, ...keys) {
    for (const key of keys) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
        }
    }
    return '';
}

export async function POST(req) {
    try {
        await dbConnect();

        const formData = await req.formData();
        const file = formData.get('excel');

        if (!file) {
            return NextResponse.json(
                { error: 'Excel or CSV file is required.' },
                { status: 400 }
            );
        }

        const fileName = file.name.toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());
        let rawRows = [];

        if (fileName.endsWith('.csv')) {
            const csvText = buffer.toString('utf-8');
            const workbook = XLSX.read(csvText, { type: 'string' });
            rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        } else {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        }

        if (!rawRows || !rawRows.length) {
            return NextResponse.json({ error: 'No data found in uploaded file.' }, { status: 400 });
        }

        const errors = [];
        let addedCount = 0;
        let updateCount = 0;

        // In-memory caches to speed up processing
        const productCache = new Map();
        const categoryCache = new Map();
        const groupInfoCache = new Map();
        const filterGroupCache = new Map();
        const filterCache = new Map();
        const groupFilterIdsCache = new Map();

        for (let [index, rawRow] of rawRows.entries()) {
            const rowNumber = index + 2;
            const row = normalizeRow(rawRow);

            try {
                // Support variations: item_code, itemcode, item_no, itemno
                const item_code = getCellValue(
                    row,
                    'item_code',
                    'itemcode',
                    'item_no',
                    'itemno',
                    'product_id',
                    'item'
                );

                // Support variations: filter_group_name, filter_group, group_name, group
                let filter_group_name = getCellValue(
                    row,
                    'filter_group_name',
                    'filter_group',
                    'filtergroup_name',
                    'filtergroup',
                    'group_name',
                    'group'
                );

                // Support variations: filter_name, filter_value, value
                const filter_name = getCellValue(
                    row,
                    'filter_name',
                    'filter_value',
                    'filtername',
                    'filtervalue',
                    'value'
                );

                if (!item_code || !filter_group_name || !filter_name) {
                    errors.push({
                        row: rowNumber,
                        error: `Missing required fields (item_code: "${item_code}", filter_group: "${filter_group_name}", filter_name: "${filter_name}")`,
                    });
                    continue;
                }

                // 1. Resolve Product by item_code (exact first, then case-insensitive)
                const itemCodeLower = item_code.toLowerCase();
                let product = productCache.get(itemCodeLower);
                if (!product) {
                    product = await Product.findOne({
                        $or: [
                            { item_code: item_code },
                            { item_code: item_code.toUpperCase() },
                            { item_code: item_code.toLowerCase() },
                            { item_code: new RegExp(`^${escapeRegex(item_code)}$`, 'i') },
                        ]
                    }).select('_id category sub_category item_code');

                    if (product) {
                        productCache.set(itemCodeLower, product);
                        if (product.item_code) {
                            productCache.set(product.item_code.toLowerCase(), product);
                        }
                    }
                }

                if (!product) {
                    errors.push({
                        row: rowNumber,
                        error: `Product not found for item_code: "${item_code}"`,
                    });
                    continue;
                }

                // 2. Special group mapping for "size" filter group
                if (filter_group_name.toLowerCase() === "size") {
                    const cat_id_str = product.sub_category?.toString().trim() || product.category?.toString().trim();

                    if (cat_id_str && mongoose.Types.ObjectId.isValid(cat_id_str)) {
                        let category = categoryCache.get(cat_id_str);
                        if (!category) {
                            category = await Category.findById(cat_id_str).select('category_slug');
                            if (category) categoryCache.set(cat_id_str, category);
                        }

                        if (category) {
                            let groupInfo = groupInfoCache.get(category.category_slug);
                            if (!groupInfo) {
                                groupInfo = await GroupInfo.findOne({ category_slug: category.category_slug });
                                if (groupInfo) groupInfoCache.set(category.category_slug, groupInfo);
                            }

                            if (groupInfo && groupInfo.group_name) {
                                filter_group_name = groupInfo.group_name.trim();
                            }
                        }
                    }
                }

                // 3. Resolve or insert FilterGroup (Type)
                const groupSlug = makeSlug(filter_group_name) || "group-" + Date.now();
                const groupCacheKey = filter_group_name.toLowerCase();
                let filterGroup = filterGroupCache.get(groupCacheKey) || filterGroupCache.get(groupSlug);

                if (!filterGroup) {
                    filterGroup = await FilterGroup.findOne({
                        $or: [
                            { filtergroup_slug: groupSlug },
                            { filtergroup_name: new RegExp(`^${escapeRegex(filter_group_name)}$`, 'i') }
                        ]
                    });

                    if (!filterGroup) {
                        // Avoid slug duplicate conflict
                        let finalGroupSlug = groupSlug;
                        const existingSlug = await FilterGroup.findOne({ filtergroup_slug: finalGroupSlug });
                        if (existingSlug) {
                            finalGroupSlug = `${groupSlug}-${Date.now()}`;
                        }

                        filterGroup = await FilterGroup.create({
                            filtergroup_name: filter_group_name,
                            filtergroup_slug: finalGroupSlug,
                            status: "Active"
                        });
                        console.log(`[Filter Upload] Created new Filter Group: "${filter_group_name}"`);
                    }

                    filterGroupCache.set(groupCacheKey, filterGroup);
                    filterGroupCache.set(groupSlug, filterGroup);
                }

                const filterGroupIdStr = filterGroup._id.toString();

                // 4. Resolve or insert Filter (Value)
                const filterSlug = makeSlug(filter_name) || "val-" + Date.now();
                const filterCacheKey = `${filterGroupIdStr}___${filter_name.toLowerCase()}`;
                let existingFilter = filterCache.get(filterCacheKey);

                if (!existingFilter) {
                    existingFilter = await Filter.findOne({
                        filter_group: { $in: [filterGroupIdStr, filterGroup._id] },
                        $or: [
                            { filter_slug: filterSlug },
                            { filter_name: new RegExp(`^${escapeRegex(filter_name)}$`, 'i') }
                        ]
                    });

                    if (!existingFilter) {
                        let finalFilterSlug = filterSlug;
                        const existingSlug = await Filter.findOne({
                            filter_group: { $in: [filterGroupIdStr, filterGroup._id] },
                            filter_slug: finalFilterSlug
                        });
                        if (existingSlug) {
                            finalFilterSlug = `${filterSlug}-${Date.now()}`;
                        }

                        existingFilter = await Filter.create({
                            filter_name: filter_name,
                            filter_slug: finalFilterSlug,
                            filter_group: filterGroupIdStr,
                            status: "Active"
                        });
                        console.log(`[Filter Upload] Created new Filter Value: "${filter_name}" under Group: "${filter_group_name}"`);

                        // Invalidate cached group filter IDs since a new filter was created
                        groupFilterIdsCache.delete(filterGroupIdStr);
                    }

                    filterCache.set(filterCacheKey, existingFilter);
                    filterCache.set(`${filterGroupIdStr}___${filterSlug}`, existingFilter);
                }

                const existingFilterIdStr = existingFilter._id.toString();

                // 5. Retrieve all filter IDs belonging to this group
                let groupFilterIds = groupFilterIdsCache.get(filterGroupIdStr);
                if (!groupFilterIds) {
                    const groupFilters = await Filter.find({
                        filter_group: { $in: [filterGroupIdStr, filterGroup._id] },
                    }).select('_id');
                    groupFilterIds = groupFilters.map(f => f._id.toString());
                    groupFilterIdsCache.set(filterGroupIdStr, groupFilterIds);
                }

                // Ensure the current filter ID is in groupFilterIds list
                if (!groupFilterIds.includes(existingFilterIdStr)) {
                    groupFilterIds.push(existingFilterIdStr);
                }

                const productIdStr = product._id.toString();

                // Build query array covering both strings and ObjectIds for robust matching
                const filterIdQuery = [
                    ...groupFilterIds,
                    ...groupFilterIds
                        .filter(id => mongoose.Types.ObjectId.isValid(id))
                        .map(id => new mongoose.Types.ObjectId(id))
                ];

                const productIdQuery = [
                    productIdStr,
                    ...(mongoose.Types.ObjectId.isValid(productIdStr) ? [new mongoose.Types.ObjectId(productIdStr)] : [])
                ];

                // 6. Check if this specific filter value is already attached to this product
                // (One product can have multiple values from the same group, e.g. 5L and 6L)
                const existingPF = await ProductFilter.findOne({
                    product_id: { $in: productIdQuery },
                    filter_id: { $in: [existingFilterIdStr, existingFilter._id] },
                });

                if (existingPF) {
                    updateCount++;
                    console.log(`[Filter Upload] Filter "${filter_name}" already exists for Product "${product.item_code}" under Group "${filter_group_name}"`);
                } else {
                    await ProductFilter.create({
                        product_id: productIdStr,
                        filter_id: existingFilterIdStr,
                    });
                    addedCount++;
                    console.log(`[Filter Upload] Added Product "${product.item_code}": Group "${filter_group_name}" -> "${filter_name}"`);
                }

            } catch (rowError) {
                console.error(`[Filter Upload] ❌ Row ${rowNumber} error:`, rowError.message || rowError);
                errors.push({
                    row: rowNumber,
                    error: rowError.message || String(rowError),
                });
            }
        }

        console.log(`[Filter Upload] Finished. Inserted: ${addedCount}, Updated: ${updateCount}, Errors: ${errors.length}`);

        return NextResponse.json(
            {
                message: `Filter values uploaded: ${addedCount} added, ${updateCount} updated${errors.length ? `, ${errors.length} failed` : ''}.`,
                addedCount,
                updateCount,
                errorsCount: errors.length,
                details: errors.slice(0, 50),
            },
            { status: errors.length && (addedCount === 0 && updateCount === 0) ? 400 : 200 }
        );

    } catch (error) {
        console.error('Filter bulk upload error:', error);
        return NextResponse.json(
            { error: 'Bulk filter upload error: ' + error.message },
            { status: 500 }
        );
    }
}
