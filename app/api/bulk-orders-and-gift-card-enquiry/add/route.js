import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BulkOrderGiftCardEnquiryModel from "@/models/ecom_bulk_order_gift_card_enquiry_info";
import Notification from "@/models/Notification";
import { appendToContactSheet } from "@/lib/googleSheets";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();

    const {
      company_name,
      name,
      email_address,
      mobile_number,
      city,
      business_type,
      requirement_category,
      /* address,
      landmark,
      state,
      pincode, */
      gst_number,
      product_name_and_quantity,
      contact_method,
      status,
      _hp,
    } = body;

    // Honeypot check
    if (_hp) {
      return NextResponse.json(
        { success: false, message: "Spam detected" },
        { status: 400 }
      );
    }

    // Required field validation
    if (
      !name ||
      !company_name ||
      !email_address ||
      !mobile_number ||
      // !address ||
      !city ||
      !business_type ||
      !requirement_category ||
      !contact_method 
      // !state ||
      // !pincode
    ) {
      return NextResponse.json(
        { success: false, message: "All required fields must be filled" },
        { status: 400 }
      );
    }

    // Product validation
    if (
      !Array.isArray(product_name_and_quantity) ||
      product_name_and_quantity.length === 0
    ) {
      return NextResponse.json(
        { success: false, message: "Product details are required" },
        { status: 400 }
      );
    }

    // Validate each product
    for (const item of product_name_and_quantity) {
      if (
        !item.product_name ||
        item.product_name.trim().length < 2
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid product name" },
          { status: 400 }
        );
      }

      if (
        !item.product_quantity ||
        isNaN(item.product_quantity) ||
        Number(item.product_quantity) <= 0
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid product quantity" },
          { status: 400 }
        );
      }
    }

    // Name / City / State validation
    const textPattern = /^[a-zA-Z\s.'\-]{2,60}$/;

    if (!textPattern.test(name.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid name format" },
        { status: 400 }
      );
    }

    if (!textPattern.test(city.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid city format" },
        { status: 400 }
      );
    }

    /* if (!textPattern.test(state.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid state format" },
        { status: 400 }
      );
    } */

    // Company name validation
    const companyPattern = /^[a-zA-Z0-9\s.&'-]{2,100}$/;

    if (!companyPattern.test(company_name.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid company name" },
        { status: 400 }
      );
    }

    // Email validation
    const emailPattern = /^\S+@\S+\.\S+$/;

    if (!emailPattern.test(email_address)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Mobile validation
    if (!/^[6-9]\d{9}$/.test(mobile_number)) {
      return NextResponse.json(
        { success: false, message: "Invalid mobile number" },
        { status: 400 }
      );
    }

    /* // Pincode validation
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, message: "Invalid pincode" },
        { status: 400 }
      );
    } */

    /* // Address validation
    if (address.trim().length < 5) {
      return NextResponse.json(
        { success: false, message: "Invalid address" },
        { status: 400 }
      );
    } */

      // Business Type validation
      if (!business_type || business_type.trim() === "") {
        return NextResponse.json(
          { success: false, message: "Please select a business type" },
          { status: 400 }
        );
      }

      // Requirement Type validation
      if (!requirement_category || requirement_category.trim() === "") {
        return NextResponse.json(
          { success: false, message: "Please select a requirement type" },
          { status: 400 }
        );
      }

      // Contact Method validation
      if (!contact_method || contact_method.trim() === "") {
        return NextResponse.json(
          { success: false, message: "Please select a contact method" },
          { status: 400 }
        );
      }

    // Create contact
    const newContact = await BulkOrderGiftCardEnquiryModel.create({
      name,
      company_name,
      email_address,
      mobile_number,
      /* address,
      landmark, */
      city,
      business_type,
      requirement_category,
      gst_number,
      /* state,
      pincode, */
      product_name_and_quantity,
      contact_method,
      status,
    });

    // Notification
    await Notification.create({
      type: "contact",
      contactId: newContact._id,
      message: `New bulk enquiry received from ${name}`,
      read: false,
    });

    // Google Sheets
    appendToContactSheet(newContact).catch((err) =>
      console.error("Google Sheets append failed:", err.message)
    );

    return NextResponse.json(
      {
        success: true,
        message: "Contact added successfully",
        data: newContact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding contact:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}