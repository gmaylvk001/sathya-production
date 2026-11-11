import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import dbConnect from '@/lib/db';
import Product from '@/models/product';
import FilterGroup from '@/models/ecom_filter_group_infos';
import Filter from '@/models/ecom_filter_infos';
import ProductFilter from '@/models/ecom_productfilter_info';

export const config = {
    api: { bodyParser: false },
};

// Strips tab, non-breaking spaces, collapses whitespace, lowercases
const norm = (s) => s
    .replace(/[\u00A0\u202F\u2009\u200B\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export async function POST(req) {
    await dbConnect();

    try {
        const formData = await req.formData();
        const file = formData.get('excel');

        if (!file) {
            return NextResponse.json({ error: 'Excel or CSV file is required.' }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());

        let rows = [];
        if (fileName.endsWith('.csv')) {
            const csvText = buffer.toString('utf-8');
            const workbook = XLSX.read(csvText, { type: 'string' });
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        } else {
            const workbook = XLSX.read(buffer);
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Excel file is empty.' }, { status: 400 });
        }

        const allColumns = Object.keys(rows[0]);
        const filterGroupColumns = allColumns.filter(col => norm(col) !== 'item_code');

        // Pre-fetch all filter groups.
        // groupMap: norm(name) → FilterGroup[] — keeps ALL groups with the same normalized name
        // so a malformed duplicate (e.g. "\tCAPACITY") never shadows the real one.
        const allGroups = await FilterGroup.find({});
        const groupMap = new Map();
        const groupIdByRef = new Map();
        for (const g of allGroups) {
            const id = g._id.toString();
            const key = norm(g.filtergroup_name);
            if (!groupMap.has(key)) groupMap.set(key, []);
            groupMap.get(key).push(g);

            // Cover every form filter_group may have been stored as
            groupIdByRef.set(id, id);
            groupIdByRef.set(g.filtergroup_slug, id);
            groupIdByRef.set(norm(g.filtergroup_slug), id);
            groupIdByRef.set(g.filtergroup_name, id);
            groupIdByRef.set(norm(g.filtergroup_name), id);
        }

        // Pre-fetch all filters → Map: "canonicalGroupId||norm(filter_name)" → filter doc
        const allFilters = await Filter.find({});
        const filterMap = new Map();
        for (const f of allFilters) {
            const rawRef = f.filter_group.toString();
            const canonicalId = groupIdByRef.get(rawRef) ?? groupIdByRef.get(norm(rawRef));
            if (!canonicalId) continue;
            filterMap.set(`${canonicalId}||${norm(f.filter_name)}`, f);
        }

        let addedCount = 0;
        let skippedCount = 0;
        const errors = [];

        console.log(`Total rows: ${rows.length}, columns: ${filterGroupColumns.join(', ')}`);

        for (let [index, row] of rows.entries()) {
            try {
                const item_code = (row["item_code"] || "").toString().trim();
                if (!item_code) { skippedCount++; continue; }

                const product = await Product.findOne({ item_code });
                if (!product) { skippedCount++; continue; }

                for (const col of filterGroupColumns) {
                    const filterName = norm((row[col] || "").toString());
                    if (!filterName) continue;

                    // All groups whose normalized name matches the column header
                    const matchingGroups = groupMap.get(norm(col)) || [];
                    if (!matchingGroups.length) continue;

                    // Try every matching group until a filter is found in the map
                    let filter = null;
                    let resolvedFilterKey = null;
                    for (const g of matchingGroups) {
                        const fKey = `${g._id.toString()}||${filterName}`;
                        const found = filterMap.get(fKey);
                        if (found) {
                            filter = found;
                            resolvedFilterKey = fKey;
                            break;
                        }
                    }

                    // DB fallback: query across all matching groups at once
                    if (!filter) {
                        const allGroupRefs = [...new Set(
                            matchingGroups.flatMap(g => [
                                g._id.toString(),
                                g.filtergroup_slug,
                                g.filtergroup_name,
                                norm(g.filtergroup_slug),
                                norm(g.filtergroup_name),
                            ])
                        )];
                        const escaped = filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        filter = await Filter.findOne({
                            filter_name: { $regex: new RegExp(`^${escaped}$`, 'i') },
                            filter_group: { $in: allGroupRefs },
                        });
                        if (filter) {
                            // Cache under the first matching group for future rows
                            const cacheKey = `${matchingGroups[0]._id.toString()}||${filterName}`;
                            filterMap.set(cacheKey, filter);
                            console.log(`DB fallback hit: "${filterName}" in col "${col}"`);
                        } else {
                            console.log(`Not found: col="${col}", filter="${filterName}"`);
                            continue;
                        }
                    }

                    // Avoid duplicate product-filter mappings
                    const existing = await ProductFilter.findOne({
                        product_id: product._id.toString(),
                        filter_id: filter._id.toString(),
                    });
                    if (existing) continue;

                    await ProductFilter.create({
                        product_id: product._id.toString(),
                        filter_id: filter._id.toString(),
                    });
                    addedCount++;
                }

            } catch (err) {
                errors.push({ row: index + 2, error: err.message });
            }
        }

        return NextResponse.json(
            {
                message: `Completed: ${addedCount} filter(s) mapped, ${skippedCount} row(s) skipped`,
                errors,
            },
            { status: errors.length ? 207 : 200 }
        );

    } catch (error) {
        console.error('Dynamic filter bulk upload error:', error);
        return NextResponse.json(
            { error: 'Bulk upload error: ' + error.message },
            { status: 500 }
        );
    }
}
