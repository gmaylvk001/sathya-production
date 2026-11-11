import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get("image");

        if (!imageFile || typeof imageFile.name !== "string") {
            return NextResponse.json({ success: false, error: "No valid image received" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public/uploads/blogs");
        if (!fs.existsSync(uploadDir)) {
            await fs.promises.mkdir(uploadDir, { recursive: true });
        }

        const filename = `${Date.now()}-${imageFile.name.replace(/\s+/g, "-")}`;
        const filePath = path.join(uploadDir, filename);
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        
        await writeFile(filePath, buffer);
        
        return NextResponse.json({ success: true, savedImage: `/uploads/blogs/${filename}` }, { status: 200 }); 
    } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
    }
}
