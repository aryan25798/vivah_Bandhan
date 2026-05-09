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
    const { uids, idToken } = await req.json();

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

    if (!Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ error: "No targets specified for neutralization." }, { status: 400 });
    }

    const results = {
      deletedAuth: 0,
      deletedFirestore: 0,
      deletedCloudinary: 0,
      errors: [] as string[]
    };

    // Process in small chunks to avoid timeouts
    for (const uid of uids) {
      try {
        // 1. Fetch User Data for Cloudinary Cleanup
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userData = userDoc.data();

        if (userData?.photoURL && userData.photoURL.includes("cloudinary.com")) {
          // Extract public ID: https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg -> sample
          const parts = userData.photoURL.split('/');
          const lastPart = parts[parts.length - 1];
          const publicId = lastPart.split('.')[0];
          
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            results.deletedCloudinary++;
          }
        }

        // 2. Delete Matches where user is a participant
        const matchesSnap = await adminDb.collection("matches")
          .where("users", "array-contains", uid)
          .get();
        
        const matchBatch = adminDb.batch();
        matchesSnap.docs.forEach(matchDoc => {
          matchBatch.delete(matchDoc.ref);
        });
        await matchBatch.commit();

        // 3. Delete Active Sessions
        const sessionSnap = await adminDb.collection("active_sessions")
          .where("uid", "==", uid)
          .get();
        
        const sessionBatch = adminDb.batch();
        sessionSnap.docs.forEach(sDoc => {
          sessionBatch.delete(sDoc.ref);
        });
        await sessionBatch.commit();

        // 4. Delete Firestore User Document
        await adminDb.collection("users").doc(uid).delete();
        results.deletedFirestore++;

        // 5. Delete from Firebase Auth
        try {
          await adminAuth.deleteUser(uid);
          results.deletedAuth++;
        } catch (authErr: any) {
          // If user doesn't exist in Auth (e.g. managed profile), ignore
          if (authErr.code !== 'auth/user-not-found') throw authErr;
        }

      } catch (err: any) {
        console.error(`Error nuking user ${uid}:`, err);
        results.errors.push(`${uid}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Atomic Nuke complete. wiped ${results.deletedFirestore} records.`,
      results 
    });

  } catch (error: any) {
    console.error("Atomic Nuke Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
