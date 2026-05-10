import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { userId, uids, isPremium, all, searchTerm, idToken } = await req.json();

    // 1. Verify Admin Status
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUser = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminData = adminUser.data();

    if (!decodedToken.admin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    let targetUids: string[] = [];

    if (all) {
      let q = adminDb.collection("users").where("role", "!=", "admin");
      if (searchTerm) {
        const capitalizedSearch = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
        q = q.where("fullName", ">=", capitalizedSearch)
             .where("fullName", "<=", capitalizedSearch + "\uf8ff");
      }
      const snap = await q.get();
      targetUids = snap.docs.map(doc => doc.id);
    } else if (uids && Array.isArray(uids)) {
      targetUids = uids;
    } else if (userId) {
      targetUids = [userId];
    }

    if (targetUids.length === 0) {
      return NextResponse.json({ error: "No targets identified." }, { status: 400 });
    }

    // 2. Process in Batches
    const CHUNK_SIZE = 450;
    const results = { updated: 0, errors: [] as string[] };

    for (let i = 0; i < targetUids.length; i += CHUNK_SIZE) {
      const chunk = targetUids.slice(i, i + CHUNK_SIZE);
      const batch = adminDb.batch();

      chunk.forEach(uid => {
        const userRef = adminDb.collection("users").doc(uid);
        batch.update(userRef, {
          isPremium: isPremium,
          tier: isPremium ? 'premium' : 'standard',
          updatedAt: new Date().toISOString()
        });
        results.updated++;
      });

      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Royal status updated for ${results.updated} souls.`,
      results
    });

  } catch (error: any) {
    console.error("Premium Update Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update premium status." }, { status: 500 });
  }
}
