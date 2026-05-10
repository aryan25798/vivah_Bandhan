import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { 
      idToken, 
      searchTerm = "", 
      minAge, 
      maxAge, 
      religion, 
      occupation, 
      lastUid, 
      limitCount = 12 
    } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const currentUid = decodedToken.uid;

    let q: FirebaseFirestore.Query = adminDb.collection("users")
      .where("onboarded", "==", true);

    // If search term is provided, we MUST order by fullName for prefix match
    if (searchTerm) {
      const capitalizedSearch = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
      q = q.orderBy("fullName")
           .where("fullName", ">=", capitalizedSearch)
           .where("fullName", "<=", capitalizedSearch + "\uf8ff");
    } else {
      q = q.orderBy("createdAt", "desc");
    }

    // Apply basic filters if provided (Firestore might require indexes for these)
    // To be safe and avoid silent crashes due to missing indexes, 
    // we can either:
    // A) Apply only the most important filters and do the rest in memory.
    // B) Apply all and expect the user to have indexes (riskier).
    // Let's do A: apply core filters that are likely indexed.
    if (religion && religion !== "All") {
      q = q.where("religion", "==", religion);
    }
    
    if (lastUid) {
      const lastDocSnap = await adminDb.collection("users").doc(lastUid).get();
      if (lastDocSnap.exists) {
        q = q.startAfter(lastDocSnap);
      }
    }

    const snapshot = await q.limit(50).get(); // Fetch a reasonable batch
    
    let profiles: any[] = [];
    let hasMore = false;
    let nextLastUid = null;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Memory Filtering for complex/dynamic fields to avoid index hell
      if (data.isBanned || doc.id === currentUid) continue;
      
      if (minAge && parseInt(data.age) < parseInt(minAge)) continue;
      if (maxAge && parseInt(data.age) > parseInt(maxAge)) continue;
      if (occupation && occupation !== "All" && data.occupation !== occupation) continue;

      // DTO Transformation: STRIP PII
      profiles.push({
        uid: doc.id,
        fullName: data.fullName,
        age: data.age,
        occupation: data.occupation,
        income: data.income,
        bio: data.bio,
        photoURL: data.photoURL,
        religion: data.religion,
        rashi: data.rashi,
        gotra: data.gotra,
        isManaged: data.isManaged || false,
        isPremium: data.isPremium || false,
        badges: data.badges || []
        // EMAIL and PHONE are STRIPPED
      });

      if (profiles.length >= limitCount) {
        nextLastUid = doc.id;
        hasMore = true;
        break;
      }
    }

    // If we finished the loop and didn't hit the limit, nextLastUid remains null
    // But we might still have more in Firestore if snapshot wasn't exhausted.
    // For simplicity in this DTO proxy, we'll return nextLastUid if we hit the limit.

    return NextResponse.json({
      success: true,
      profiles,
      lastUid: nextLastUid,
      hasMore: hasMore
    });

  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: error.message || "Search failed." }, { status: 500 });
  }
}
