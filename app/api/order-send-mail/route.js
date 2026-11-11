import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { to, subject, text,html,cc } = await req.json();

   const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false // ⚠️ Disables certificate validation
  }
});

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      cc,
      subject,
      text,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("MAIL ERROR:", error);
    return new Response(JSON.stringify({ error: "Failed to send mail" }), {
      status: 500,
    });
  }
}
