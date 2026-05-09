import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { userId, isPremium, idToken } = await req.json();

    // 1. Verify Admin Status
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUser = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminData = adminUser.data();

    if (!decodedToken.admin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: "No user specified." }, { status: 400 });
    }

    // 2. Update Firestore
    await adminDb.collection("users").doc(userId).update({
      isPremium: isPremium,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: `User premium status set to ${isPremium}.` 
    });

  } catch (error: any) {
    console.error("Premium Update Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update premium status." }, { status: 500 });
  }
}
