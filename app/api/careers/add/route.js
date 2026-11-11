import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ContactModel from "@/models/ecom_contact_info";
import fs from "fs";
import path from "path";
import { appendToJobsSheet } from "@/lib/googleSheets";

export async function POST(request) {
  try {
    await dbConnect();

    const formData = await request.formData();

    const name = formData.get("name");
    const email = formData.get("email");
    const mobile_number = formData.get("mobile_number");
    const city = formData.get("city");
    const job_post = formData.get("job_post");

    const resumeFile = formData.get("resume");

    // ❌ Validate missing fields
    if (!name || !email || !mobile_number || !city || !job_post || !resumeFile) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // ✔ Save Resume to /public/uploads/resumes
    const uploadDir = path.join(process.cwd(), "public/uploads/resumes");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const fileName = `${Date.now()}-${resumeFile.name}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);
    
    
    // Email list
    const emailadmin = ["ecom@sathya.store","customercare@bharatelectronics.in","careers@sathya.store"];
    // const emailadmin = ["sorambeeviuit@gmail.com"];
    
    //"arunkarthik@sathya.store"

    // Loop through emails one by one
    for (const adminEmail of emailadmin) {
      const adminForm = new FormData();
      adminForm.append("campaign_id", "ce8a4ccc-8ade-4cdb-b850-fe3d4574ddc5");
      adminForm.append("email", adminEmail);
      //const resume_link = `<a style="background-color: #d62828; padding: 12px 20px; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;" href="${process.env.NEXT_PUBLIC_API_URL}/uploads/resumes/${fileName}" target="_blank"> View Resume </a>`;
      const resume_link = `<a style="background-color:#d62828;color:#fff;padding: 12px 20px;border-radius:5px;font-weight:bold;text-decoration:none;" href="${process.env.NEXT_PUBLIC_API_URL}/uploads/resumes/${fileName}" > View Resume </a>`;
      adminForm.append("params", JSON.stringify([name, mobile_number, email, city, job_post, resume_link]));
      
   /*  return NextResponse.json(
      { success: true, resume_link },
      { status: 201 }
    );  */
       

      const adminresponse = { ok: true, status: 200, json: async () => ({ success: true, message: 'Disabled' }), text: async () => '{}' };

      const adminData = await adminresponse.json();
      //console.log("Mail Sent:", adminEmail, adminData);
    }


    /* return NextResponse.json(
      { success: true, adminData },
      { status: 201 }
    ); */
        
        


    /*
    // ✔ Save in DB
    const newEntry = new ContactModel({
      name,
      email_address: email,
      mobile_number,
      city,
      job_post,
      resume_path: `/uploads/resumes/${fileName}`, // store file path
      status: 1,
    });

    await newEntry.save();*/

    // 📊 APPEND TO GOOGLE SHEET
    appendToJobsSheet({
      name,
      mobile_number,
      email,
      city,
      job_post,
      resume_url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/resumes/${fileName}`,
      createdAt: new Date(),
    }).catch((err) => console.error("Google Sheets jobs append failed:", err.message));

    return NextResponse.json(
      { success: true, message: "Form submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
