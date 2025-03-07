"use server";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import os from "os";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Use os.tmpdir() for a cross-platform temporary directory
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.name);

    // Convert file to buffer and save it locally
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    const resourceType = file.type.startsWith("video/") ? "video" : "image";

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(tempFilePath, {
      resource_type: resourceType,
      chunk_size: 6000000,

      eager: [{ format: "mp4", video_codec: "h264" }],
      eager_async: true,
    });

    fs.unlinkSync(tempFilePath);

    return NextResponse.json({
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      resource_type: resourceType,
      fileSize: buffer.byteLength,
      format: uploadResponse.format,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
