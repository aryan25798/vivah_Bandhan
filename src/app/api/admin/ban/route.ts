import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { userId, action, idToken } = await req.json(); // action: 'ban' | 'unban'

    // 1. Verify Admin Status
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUser = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminData = adminUser.data();

    if (!decodedToken.admin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized. Admin rights required." }, { status: 403 });
    }

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
    }

    const isBanning = action === 'ban';

    // 2. Update Auth Status (Disable/Enable)
    await adminAuth.updateUser(userId, {
      disabled: isBanning
    });

    // 3. Update Firestore
    await adminDb.collection("users").doc(userId).update({
      banned: isBanning,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: `User ${isBanning ? 'banned' : 'restored'} successfully.` 
    });

  } catch (error: any) {
    console.error("Ban Action Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update ban status." }, { status: 500 });
  }
}
