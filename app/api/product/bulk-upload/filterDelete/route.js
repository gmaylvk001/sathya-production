import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Product from "@/models/product";
import FilterGroup from '@/models/ecom_filter_group_infos';
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";

export const config = {
    api: {
        bodyParser: false,
    },
};

const makeSlug = (text = "") =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s.-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('excel');

        if (!file) {
            return NextResponse.json({ error: 'Excel file required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer);

        const rows = XLSX.utils.sheet_to_json(
            workbook.Sheets[workbook.SheetNames[0]]
        );

        const errors = [];
        const deleteConditions = [];

        // 🔹 Cache to avoid repeated DB calls
        const productCache = new Map();
        const groupCache = new Map();
        const filterCache = new Map();

        for (let [index, row] of rows.entries()) {
            try {
                const item_code = row.item_code?.toString()?.trim();
                const group_name = row.filter_group_name?.toString()?.trim();
                const filter_name = row.filter_name?.toString()?.trim();

                if (!item_code || !group_name || !filter_name) {
                    errors.push({ row: index + 2, error: "Missing fields" });
                    continue;
                }

                // ✅ PRODUCT CACHE
                let product = productCache.get(item_code);
                if (!product) {
                    product = await Product.findOne({ item_code }).select("_id");
                    if (product) productCache.set(item_code, product);
                }

                if (!product) {
                    errors.push({ row: index + 2, error: `Product not found: ${item_code}` });
                    continue;
                }

                const groupSlug = makeSlug(group_name);
                const filterSlug = makeSlug(filter_name);

                // ✅ GROUP CACHE
                let filterGroup = groupCache.get(groupSlug);
                if (!filterGroup) {
                    filterGroup = await FilterGroup.findOne({
                        filtergroup_slug: groupSlug
                    }).select("_id");

                    if (filterGroup) groupCache.set(groupSlug, filterGroup);
                }

                if (!filterGroup) {
                    errors.push({ row: index + 2, error: `Group not found: ${group_name}` });
                    continue;
                }

                // ✅ FILTER CACHE
                const filterKey = `${filterSlug}_${filterGroup._id}`;

                let filter = filterCache.get(filterKey);
                if (!filter) {
                    filter = await Filter.findOne({
                        filter_slug: filterSlug,
                        filter_group: filterGroup._id,
                    }).select("_id");

                    if (filter) filterCache.set(filterKey, filter);
                }

                if (!filter) {
                    errors.push({ row: index + 2, error: `Filter not found: ${filter_name}` });
                    continue;
                }

                // ✅ PUSH CONDITION FOR BULK DELETE
                deleteConditions.push({
                    product_id: product._id,
                    filter_id: filter._id,
                });

            } catch (err) {
                errors.push({ row: index + 2, error: err.message });
            }
        }

        // ✅ BULK DELETE
        let deletedCount = 0;

        if (deleteConditions.length > 0) {
            const result = await ProductFilter.deleteMany({
                $or: deleteConditions
            });

            deletedCount = result.deletedCount || 0;
        }

        return NextResponse.json(
            {
                message: `Bulk delete completed: ${deletedCount} records deleted`,
                totalRequested: deleteConditions.length,
                errors,
            },
            { status: errors.length ? 207 : 200 }
        );

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}