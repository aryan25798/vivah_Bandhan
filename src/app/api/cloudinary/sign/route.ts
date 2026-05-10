import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { adminAuth } from "@/lib/firebase-admin";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // --- Rate Limiting Logic (Max 15 uploads per day) ---
    const { adminDb } = await import("@/lib/firebase-admin");
    const userRef = adminDb.collection("users").doc(uid);
    
    // We run a quick transaction/update or just read/write since it's server-side
    // Using a simple read/write for performance, though transaction is safer for strict limits
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    
    const today = new Date().toISOString().split('T')[0];
    const lastUploadReset = userData.lastUploadReset || "";
    let uploadCount = userData.uploadCount || 0;

    if (lastUploadReset !== today) {
      uploadCount = 0;
    }

    if (uploadCount >= 15 && userData.role !== 'admin' && !userData.isPremium) {
      return NextResponse.json({ 
        error: "Daily image upload limit reached. Please try again tomorrow." 
      }, { status: 429 });
    }

    await userRef.update({
      uploadCount: uploadCount + 1,
      lastUploadReset: today
    });
    // ----------------------------------------------------

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp: timestamp,
      folder: "user_profiles",
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });

  } catch (error: any) {
    console.error("Cloudinary signing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
