import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { idToken, uids } = await req.json();

    if (!idToken || !uids || !Array.isArray(uids)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (uids.length === 0) return NextResponse.json({ success: true, profiles: {} });

    // Firestore 'in' query limit is 30
    const profileMap: Record<string, any> = {};
    for (let i = 0; i < uids.length; i += 30) {
      const chunk = uids.slice(i, i + 30);
      const snap = await adminDb.collection("users").where("uid", "in", chunk).get();
      
      snap.docs.forEach(doc => {
        const data = doc.data();
        profileMap[doc.id] = {
          uid: doc.id,
          fullName: data.fullName,
          photoURL: data.photoURL,
          occupation: data.occupation,
          income: data.income,
          age: data.age,
          religion: data.religion,
          rashi: data.rashi,
          gotra: data.gotra,
          isManaged: data.isManaged || false
          // PII STRIPPED
        };
      });
    }

    return NextResponse.json({ success: true, profiles: profileMap });

  } catch (error: any) {
    console.error("Batch Profiles API Error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
