import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { userId, uids, all, searchTerm, idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized. Token missing." }, { status: 401 });
    }

    // 1. Verify Admin Status
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUser = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminData = adminUser.data();

    if (!decodedToken.admin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized. God Mode rights required." }, { status: 403 });
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
      return NextResponse.json({ error: "No targets identified for neutralization." }, { status: 400 });
    }

    const results = {
      deletedAuth: 0,
      deletedFirestore: 0,
      deletedCloudinary: 0,
      errors: [] as string[]
    };

    // 2. Robust Batch Processing
    // We use a small concurrency limit to avoid hitting rate limits or timing out
    const CONCURRENCY_LIMIT = 5; 
    const CHUNK_SIZE = 100;

    for (let i = 0; i < targetUids.length; i += CHUNK_SIZE) {
      const chunk = targetUids.slice(i, i + CHUNK_SIZE);
      
      // Process each chunk in limited parallel blocks
      for (let j = 0; j < chunk.length; j += CONCURRENCY_LIMIT) {
        const batch = chunk.slice(j, j + CONCURRENCY_LIMIT);
        
        await Promise.all(batch.map(async (uid) => {
          try {
            // A. Fetch User Data for Cloudinary Cleanup
            const userDoc = await adminDb.collection("users").doc(uid).get();
            const userData = userDoc.data();

            if (userData?.photoURL && userData.photoURL.includes("cloudinary.com")) {
              const parts = userData.photoURL.split('/');
              const lastPart = parts[parts.length - 1];
              const publicId = lastPart.split('.')[0];
              
              if (publicId) {
                try {
                  await cloudinary.uploader.destroy(publicId);
                  results.deletedCloudinary++;
                } catch (cErr) {
                  console.warn(`Cloudinary cleanup failed for ${uid}:`, cErr);
                }
              }
            }

            // B. Delete Dependencies (Matches & Sessions)
            // Note: For 10k users, this is many queries. 
            // Future optimization: If all=true, maybe wipe collections if safe.
            const [matchesSnap, sessionSnap] = await Promise.all([
              adminDb.collection("matches").where("users", "array-contains", uid).get(),
              adminDb.collection("active_sessions").where("uid", "==", uid).get()
            ]);

            const depBatch = adminDb.batch();
            matchesSnap.docs.forEach(d => depBatch.delete(d.ref));
            sessionSnap.docs.forEach(d => depBatch.delete(d.ref));
            await depBatch.commit();

            // C. Delete Firestore User Document
            await adminDb.collection("users").doc(uid).delete();
            results.deletedFirestore++;

            // D. Delete from Firebase Auth
            try {
              await adminAuth.deleteUser(uid);
              results.deletedAuth++;
            } catch (authErr: any) {
              if (authErr.code !== 'auth/user-not-found') throw authErr;
            }

          } catch (err: any) {
            console.error(`Error nuking user ${uid}:`, err);
            results.errors.push(`${uid}: ${err.message}`);
          }
        }));
      }
      
      // Check if we are approaching timeout (standard is 10-60s)
      // For now, we just keep going, but a real background task would be better for 10k.
    }

    return NextResponse.json({ 
      success: true, 
      message: `Atomic Nuke complete. Wiped ${results.deletedFirestore} records.`,
      results 
    });

  } catch (error: any) {
    console.error("Atomic Nuke Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
