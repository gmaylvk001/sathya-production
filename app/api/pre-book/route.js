import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Lead from '@/models/leads';

export async function POST(req) {
  try {
    await dbConnect();

    const data = await req.json();
    const {
      name,
      email,
      mobile,
      store_id,
      product_name,
      utm_source,
      utm_campaign,
      referrel_url,
    } = data;

    // Basic validation
    if (!name || !email || !mobile) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || '';

    // Lookup store name
    let storeName = 'Online';
    let resolvedStoreId = null;

    if (store_id && String(store_id).trim() !== '' && store_id !== 'Online') {
      try {
        const StoreListing = (await import('@/models/store_listings')).default;
        let storeDoc = null;

        if (mongoose.Types.ObjectId.isValid(store_id)) {
          storeDoc = await StoreListing.findById(store_id).lean();
        } else {
          storeDoc = await StoreListing.findOne({
            $or: [{ branch_code: store_id }, { title: store_id }, { exist_id: store_id }]
          }).lean();
        }

        if (storeDoc) {
          storeName = storeDoc.title || storeDoc.branch_name || storeDoc.name || String(store_id);
          resolvedStoreId = storeDoc.exist_id || storeDoc.branch_code || String(storeDoc._id);
        } else {
          storeName = String(store_id);
          resolvedStoreId = String(store_id);
        }
      } catch (err) {
        console.error("Store lookup error:", err);
        storeName = String(store_id);
        resolvedStoreId = String(store_id);
      }
    } else if (store_id === 'Online') {
      storeName = 'Online Team';
      resolvedStoreId = 'Online';
    }

    // Determine Source and Campaign from URL parameter, or default to pre_book
    const leadSource = utm_source && String(utm_source).trim() !== ''
      ? String(utm_source).trim()
      : 'pre_book';

    const leadCampaign = utm_campaign && String(utm_campaign).trim() !== ''
      ? String(utm_campaign).trim()
      : 'pre_book';

    // Create lead
    const newLead = await Lead.create({
      name,
      email,
      mobile,
      lead_title: 'Pre-Book Enquiry',
      lead_type: 'Pre-Book',
      product_looking_for: product_name || '',
      store_id: resolvedStoreId,
      store: storeName,
      lead_source: leadSource,
      lead_campaign: leadCampaign,
      product_url: referrel_url || '',
      referrel_url: referrel_url || req.headers.get('referer') || '',
      ip_address
    });

    // Notify admin
    try {
      const Notification = (await import('@/models/Notification')).default;
      await Notification.create({
        type: 'contact',
        contactId: newLead._id,
        message: `New Pre-Book Enquiry for ${product_name || 'Product'} from ${name}`,
        read: false,
      });
    } catch (notifErr) {
      // Non-blocking notification failure
    }

    return NextResponse.json({ success: true, message: "Thank you! Your pre-booking enquiry has been submitted." }, { status: 200 });

  } catch (error) {
    console.error("Pre-Book Lead Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
