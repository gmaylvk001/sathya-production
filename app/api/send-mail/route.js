import nodemailer from 'nodemailer';
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import mongoose from 'mongoose';
import Offer from "@/models/ecom_offer_info";
import fs from 'fs';
import path from 'path';
export async function POST(req) {

  const { products, offerId, subject, message } = await req.json();
console.log(products,offerId, subject, message);
  try {
    await dbConnect();
      // Read logo file
    const logoPath = path.join(process.cwd(), 'public', 'user', 'bea.png');
    const logoContent = fs.readFileSync(logoPath);
    // Configure your email transporter
    const transporter = nodemailer.createTransport({
     host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
const offer = await Offer.findOne({ _id: new mongoose.Types.ObjectId(offerId) });
    console.log(offer);
    const users = await User.find({ user_type: "user" }).select("_id email").lean();

   

    const recipients = users.filter(user => 
      offer.selected_users.includes(user._id) || offer.selected_users.includes("all")
    );
 console.log(recipients);
    // Send email to each recipient
    const mailPromises = recipients.map(user => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        cc: [ "siva96852@gmail.com"],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
  <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 6px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    
    <!-- Logo Header -->
    <div style="background-color:#e5e2c9; padding: 20px; text-align: center;">
      <img src="cid:logo_cid" alt="Logo" style="width: 90px; height: 90px;" />
    </div>
    
    <!-- Body Content -->
    <div style="padding: 30px; color: #333;">
      <h2 style="margin-top: 0; font-size: 22px; color: #444;">Exciting Offer Just for You!</h2>

      <p style="font-size: 15px; line-height: 1.6; margin: 20px 0;">
        Use code <strong>${offer.offer_code}</strong> to get 
        <strong>${offer.offer_type === 'percentage' ? `${offer.percentage}% off` : `₹${offer.fixed_price} discount`}</strong>, 
        valid from <strong>${new Date(offer.from_date).toLocaleDateString()}</strong> to 
        <strong>${new Date(offer.to_date).toLocaleDateString()}</strong>.
      </p>

      <div style="margin-top: 25px; text-align: center;">
        <a href={process.env.NEXT_PUBLIC_API_URL || "https://sathya.store"} style="display: inline-block; background-color: #d1410c; color: #fff; padding: 12px 25px; border-radius: 4px; text-decoration: none; font-weight: bold;">
          Shop Now
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f1f1; text-align: center; padding: 15px; font-size: 13px; color: #777;">
      You're receiving this email because you're subscribed to our offers.
    </div>
  </div>
</div>

        `,
         attachments: [
          {
            filename: 'logo.png',
            content: logoContent,
            cid: 'logo_cid', // used inside the HTML <img src="cid:logo_cid" />
          }
        ]
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(mailPromises);

   
    return NextResponse.json({ success: true, message: 'Emails sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}