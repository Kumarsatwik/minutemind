import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "file not found" }, { status: 400 });
    }
    const fileExtension = file.name.split(".").pop();
    const fileName = `bot-avatars/${userId}-${Date.now()}.${fileExtension}`;
    if (!fileExtension) {
      return NextResponse.json({ error: "invalid file" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });
    await s3Client.send(uploadCommand);

    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}
