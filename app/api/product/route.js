import { NextResponse } from 'next/server';
import Product from '@/models/product';
import dbConnect from '@/lib/db';

export async function POST(request) {
  try {
    // 1. Connect to database
    await dbConnect();

    // 2. Parse the request body
    const body = await request.json();
    const { _id, ...updateData } = body;

    console.log('Updating product with ID:', _id);
    console.log('Update data:', updateData);

    // 3. Validate required fields
    if (!_id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    // 4. Prepare the update object
    const updateObj = {
      ...updateData,
      updatedAt: new Date() // Always update the timestamp
    };

    // 5. Perform the update
    const updatedProduct = await Product.findByIdAndUpdate(
      _id,
      updateObj,
      { new: true } // Return the updated document
    ).lean();

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // 6. Convert MongoDB ObjectId to string
    if (updatedProduct._id) {
      updatedProduct._id = updatedProduct._id.toString();
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct
    });

  } catch (error) {
    console.error("Update Product Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}