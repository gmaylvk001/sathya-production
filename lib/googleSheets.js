import { google } from "googleapis";

async function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  return d.toISOString(); // e.g. 2024-10-26T06:07:33.825Z
}

// Contact form → "contact" sheet
export async function appendToContactSheet(contact) {
  const { name, mobile_number,email_address,  city, message, createdAt } = contact;
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Contact Form!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[name, email_address, mobile_number, city,"NA", message,formatDate(createdAt)]],
    },
  });
}

// Feedback form → "feedback" sheet
export async function appendToFeedbackSheet(feedback) {
  const { name, email_address, mobile_number, city, invoice_number, products, feedback: feedbackText, createdAt } = feedback;
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Feedback Form!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[name, mobile_number, email_address, invoice_number, products, city, feedbackText,formatDate(createdAt)]],
    },
  });
}


// Promo video  form → "promovideo" sheet
export async function appendToPromovideoFormSheet(promovideo) {
  const { name, mobile_number, email_address, city, products, createdAt,  } = promovideo;
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Special Offer and Promo Form!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[name, mobile_number, email_address, city, products,formatDate(createdAt),""]],
    },
  });
}

// Jobs / Careers form → "Jobs" sheet
export async function appendToJobsSheet({ name, mobile_number, email, city, job_post, resume_url, createdAt }) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Careers!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[name, mobile_number, email, city, job_post, resume_url, formatDate(createdAt)]],
    },
  });
}

// Promo video  form → "prebookSamsungS26Ultra" sheet
export async function appendToSamsungS26UltraFormSheet(prebook) {
  const { name, mobile_number, email_address, city, products, createdAt,  } = prebook;
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Pre Book!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[name, mobile_number, email_address, city, products,formatDate(createdAt),""]],
    },
  });
}