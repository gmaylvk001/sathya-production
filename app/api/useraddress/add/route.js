import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Useraddress from "@/models/ecom_user_address_info";
export async function POST(req) {
  try {
    const formData        = await req.formData();
    //console.log(formData);
    const userId = formData.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const firstname       = formData.get("firstname")      ||  undefined;
    const lastName        = formData.get("lastName")       ||  undefined;
    const businessName    = formData.get("businessName")   ||  undefined;
    const country         = formData.get("country")        ||  undefined;
    const email           = formData.get("email")          ||  undefined;
    const address         = formData.get("address")        ||  undefined;
    const postCode        = formData.get("postCode")       ||  undefined;
    const city            = formData.get("city")           ||  undefined;
    const state           = formData.get("state")          ||  undefined;
    const landmark        = formData.get("landmark")       ||  undefined;
    const phonenumber     = formData.get("phonenumber")    ||  undefined;
    const altnumber       = formData.get("altnumber")      ||  undefined;
    const gst_name        = formData.get("gst_name")       ||  undefined;
    const gst_number      = formData.get("gst_number")     ||  undefined;
    const additionalInfo  = formData.get("additionalInfo") ||  undefined;

    await connectDB();
        // Prepare address data
        const addressData = {
          firstName       :  firstname,
          lastName        :  lastName,
          businessName    :  businessName,
          country         :  country,
          email           :  email,
          address         :  address,
          postCode        :  postCode,
          city            :  city,
          state           :  state,
          landmark        :  landmark,
          phonenumber     :  phonenumber,
          altnumber       :  altnumber,
          gst_name        :  gst_name,
          gst_number      :  gst_number,
          additionalInfo  :  additionalInfo,
        };
console.log(addressData);
    //existing user 
    const existingUser = await Useraddress.findOne({ userId });
    let result;
    if (existingUser) {
      // Update existing user by adding new address to addresses array
      result = await Useraddress.findOneAndUpdate(
        { userId },
        { $set: addressData },  // Changed from $push to $set
        { new: true }
      );
    } else {
      // Create new user with first address
      result = await Useraddress.create({
        userId,
        ...addressData
      });
    }

    return NextResponse.json(
      { 
        message: "Address saved successfully", 
        userAddress: result 
      },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
