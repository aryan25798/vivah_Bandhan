import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { idToken, lastUid, limitCount = 10 } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const currentUid = decodedToken.uid;

    // 1. Fetch Interactions (Server-Side)
    // We only fetch interactions to filter out users the current user has already seen.
    const interactionsSnap = await adminDb.collection("interactions")
      .where("fromId", "==", currentUid)
      .get();
    
    const interactedIds = new Set<string>();
    interactionsSnap.docs.forEach(doc => interactedIds.add(doc.data().toId));
    interactedIds.add(currentUid); // Filter out self

    // 2. Fetch Users
    let q: FirebaseFirestore.Query = adminDb.collection("users")
      .where("onboarded", "==", true);
    
    // For pagination, if we use orderBy, we can use startAfter.
    // However, Firestore doesn't easily support NOT-IN with large arrays.
    // We will query ordered by createdAt, and filter in memory until we have enough.
    // Note: In a production app with millions of users, a proper recommendations 
    // engine or Bloom filter is required. For 10k users, server-side filtering is acceptable.
    
    q = q.orderBy("createdAt", "desc");

    if (lastUid) {
      const lastDocSnap = await adminDb.collection("users").doc(lastUid).get();
      if (lastDocSnap.exists) {
        q = q.startAfter(lastDocSnap);
      }
    }

    let profiles: any[] = [];
    let currentLastDoc: any = null;
    let hasMore = true;
    
    // We fetch in chunks of 20 and filter until we get the requested limit
    while (profiles.length < limitCount && hasMore) {
      const batchSnap = await q.limit(20).get();
      
      if (batchSnap.empty) {
        hasMore = false;
        break;
      }

      for (const doc of batchSnap.docs) {
        const data = doc.data();
        
        // Skip admins or interacted users
        if (data.role === "admin" || interactedIds.has(doc.id) || data.isBanned) {
          continue;
        }

        // DTO Transformation: Strip PII!
        profiles.push({
          uid: doc.id,
          fullName: data.fullName || "Royal User",
          age: data.age || "",
          occupation: data.occupation || "",
          income: data.income || "",
          bio: data.bio || "",
          photoURL: data.photoURL || "",
          rashi: data.rashi || "",
          gotra: data.gotra || "",
          matchScore: "94% Match", // Keeping the UI element for now, could be dynamic later
          isManaged: data.isManaged || false
          // Intentionally omitting: email, role, isAdmin, phoneNumber, tier, isBanned
        });

        if (profiles.length >= limitCount) {
          currentLastDoc = doc.id;
          break;
        }
      }

      // Update the query for the next batch if we need more
      const lastBatchDoc = batchSnap.docs[batchSnap.docs.length - 1];
      q = adminDb.collection("users").where("onboarded", "==", true)
                 .orderBy("createdAt", "desc").startAfter(lastBatchDoc);
      
      if (!currentLastDoc) {
         currentLastDoc = lastBatchDoc.id;
      }
    }

    return NextResponse.json({
      success: true,
      profiles,
      lastUid: hasMore ? currentLastDoc : null,
      hasMore
    });

  } catch (error: any) {
    console.error("Feed API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch feed." }, { status: 500 });
  }
}
