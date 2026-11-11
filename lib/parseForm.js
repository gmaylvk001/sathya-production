// lib/parseForm.js
import { IncomingForm } from 'formidable';
import { Readable } from 'stream';

// Convert Web Request to Node.js-style IncomingMessage
export async function parseForm(request) {
  const form = new IncomingForm({
    multiples: true,
    keepExtensions: true,
    uploadDir: './public/uploads',
  });

  const stream = Readable.fromWeb(request.body);

  // Add fake headers for compatibility
  stream.headers = Object.fromEntries(request.headers.entries());

  return new Promise((resolve, reject) => {
    form.parse(stream, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
