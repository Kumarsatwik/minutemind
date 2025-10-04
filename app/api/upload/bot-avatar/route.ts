// API route for uploading bot avatar images to S3
// Import S3 client and put object command from AWS SDK
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// Import auth from Clerk for user authentication
import { auth } from "@clerk/nextjs/server";
// Import NextRequest and NextResponse for handling HTTP requests
import { NextRequest, NextResponse } from "next/server";

// Initialize S3 client with AWS credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// POST handler to upload bot avatar images
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user using Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Parse the form data to extract the file
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "no file provided" }, { status: 400 });
    }

    // Generate a unique filename for the uploaded image
    const fileExtension = file.name.split(".").pop();
    const fileName = `bot-avatars/${userId}-${Date.now()}.${fileExtension}`;

    // Convert the file to a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Prepare the S3 upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    // Upload the file to S3
    await s3Client.send(uploadCommand);

    // Generate the public URL for the uploaded image
    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    // Log the error and return a 500 response
    console.error("s3 upload error:", error);
    return NextResponse.json(
      { error: "failed to upload image" },
      { status: 500 }
    );
  }
}
