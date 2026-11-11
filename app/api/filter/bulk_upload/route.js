import dbConnect from "@/lib/db";
import FilterGroup from "@/models/ecom_filter_group_infos";
import Filter from "@/models/ecom_filter_infos";
import * as xlsx from "xlsx";
import { NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  await dbConnect();

  try {
    const formData = await req.formData();
    const file = formData.get("excel");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const errors = [];
    let addedCount = 0;
    let updatedCount = 0;

    for (let [index, row] of rows.entries()) {
      // Extract values with proper fallbacks
      const filterGroupName = (row.filter_group_name || row.filtergroup_name || "").toString().trim();
      const filterName = (row.filter_name || row.filtername || "").toString().trim();
      const statusValue = (row.status || "Active").toString().trim();

      console.log(`Processing row ${index + 2}:`, { filterGroupName, filterName, statusValue });

      // Validate required fields
      if (!filterGroupName) {
        errors.push({
          row: index + 2,
          data: row,
          error: "Filter group name is required"
        });
        continue;
      }

      if (!filterName) {
        errors.push({
          row: index + 2,
          data: row,
          error: "Filter name is required"
        });
        continue;
      }

      try {
        // Find or create filter group
        let filterGroup = await FilterGroup.findOne({
          filtergroup_name: { $regex: new RegExp(`^${filterGroupName}$`, 'i') }
        });

        if (!filterGroup) {
          filterGroup = await FilterGroup.create({
            filtergroup_name: filterGroupName,
            filtergroup_slug: filterGroupName.toLowerCase().replace(/\s+/g, "-"),
            status: "Active",
          });
          console.log(`Created new filter group: ${filterGroupName}`);
        }

        // Check for existing filter with same name AND same group
        let existingFilter = await Filter.findOne({
          filter_name: { $regex: new RegExp(`^${filterName}$`, 'i') },
          filter_group: filterGroup._id,
        });

        if (existingFilter) {
          // Update only if status changed
          if (existingFilter.status !== statusValue) {
            existingFilter.status = statusValue;
            await existingFilter.save();
            updatedCount++;
            console.log(`Updated filter: ${filterName} in group: ${filterGroupName}`);
          }
        } else {
          // Create unique slug by including filter group reference
          const baseSlug = filterName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
          // const uniqueSlug = `${baseSlug}-${filterGroup._id.toString().slice(-6)}`;

          await Filter.create({
            filter_name: filterName,
            filter_slug: baseSlug,
            filter_group: filterGroup._id,
            status: statusValue,
          });
          addedCount++;
          console.log(`Created new filter: ${filterName} in group: ${filterGroupName}`);
        }
      } catch (error) {
        errors.push({
          row: index + 2,
          data: row,
          error: error.message
        });
        console.error(`Error processing row ${index + 2}:`, error);
      }
    }

    return NextResponse.json(
      {
        message: `Upload completed: ${addedCount} added, ${updatedCount} updated.`,
        errors: errors,
        summary: {
          added: addedCount,
          updated: updatedCount,
          errors: errors.length
        }
      },
      { status: errors.length ? 207 : 201 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      {
        error: "Upload failed. Please try again.",
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}