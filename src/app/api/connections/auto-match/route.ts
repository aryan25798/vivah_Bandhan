import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, getMatchEmailTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { fromUid, toUid, toName, toPhoto, fromName, fromPhoto } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Authorization Logic: Requester must be 'fromUid' OR an Admin
    const requesterDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const isAdmin = requesterDoc.data()?.role === 'admin';

    if (decodedToken.uid !== fromUid && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized command authority' }, { status: 403 });
    }

    // 1. Verify Target is Managed
    const targetDoc = await adminDb.collection('users').doc(toUid).get();
    if (!targetDoc.exists || !targetDoc.data()?.isManaged) {
      return NextResponse.json({ error: 'Target is not a managed profile' }, { status: 400 });
    }

    // 2. Atomic Auto-Match Sequence
    const matchId = [fromUid, toUid].sort().join("_");
    const matchRef = adminDb.collection('matches').doc(matchId);
    
    await matchRef.set({
      users: [fromUid, toUid],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(), // Essential for query indexing
      lastMessage: "Hey, I am interested.",
      lastMessageAt: FieldValue.serverTimestamp(),
      isManagedMatch: true,
      mediatedBy: "Royal Intelligence System"
    }, { merge: true });

    // 3. Automated Initial Engagement Message
    await matchRef.collection('messages').add({
      text: "Hey, I am interested.",
      senderId: toUid,
      createdAt: FieldValue.serverTimestamp(),
      isAutoResponse: true,
      isGhostwritten: true
    });

    // 4. Update existing pending request or create a new accepted one
    const pendingRequests = await adminDb.collection('requests')
      .where('fromId', '==', fromUid)
      .where('toId', '==', toUid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!pendingRequests.empty) {
       await pendingRequests.docs[0].ref.update({
          status: "accepted",
          acceptedAt: FieldValue.serverTimestamp()
       });
    } else {
       // Record as a new accepted connection if no pending was found
       await adminDb.collection('requests').add({
         fromId: fromUid,
         fromName: fromName || "Royal Soul",
         fromPhoto: fromPhoto || "",
         toId: toUid,
         toName: toName || "Royal Member",
         toPhoto: toPhoto || "",
         status: "accepted",
         createdAt: FieldValue.serverTimestamp(),
         type: "connection",
         isAutoAccepted: true
       });
    }

    // 5. Trigger Match Notification for the User
    const fromUserDoc = await adminDb.collection('users').doc(fromUid).get();
    const fromUserData = fromUserDoc.data();
    
    if (fromUserData?.email) {
       try {
          await sendEmail(
             fromUserData.email,
             `Sacred Bond Established with ${toName}`,
             getMatchEmailTemplate(fromUserData.fullName || "Royal Member", toName)
          );
       } catch (emailErr) {
          console.error("Auto-match email notification failed:", emailErr);
       }
    }

    return NextResponse.json({ success: true, matchId: matchRef.id });

  } catch (error: any) {
    console.error('Auto-Match API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
