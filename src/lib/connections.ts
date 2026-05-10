import { db, auth } from "./firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  setDoc,
  deleteDoc,
  getDoc,
  increment
} from "firebase/firestore";

export interface ConnectionRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  fromName: string;
  fromPhoto: string;
  toName?: string;
  toPhoto?: string;
}

export const sendConnectionRequest = async (
  fromUser: any, 
  toId: string, 
  toName: string, 
  toPhoto: string,
  fromNameOverride?: string,
  fromPhotoOverride?: string
) => {
  try {
    const { runTransaction, doc, serverTimestamp, increment, collection } = await import("firebase/firestore");
    
    return await runTransaction(db, async (transaction) => {
      // 1. Fetch Sender Profile for Limits
      const senderRef = doc(db, "users", fromUser.uid);
      const senderSnap = await transaction.get(senderRef);
      const senderData = senderSnap.exists() ? senderSnap.data() : {};
      const isAdminUser = senderData.role === 'admin';
      const isPremium = senderData.isPremium === true;

      // 2. Limit Logic
      if (!isAdminUser && !isPremium) {
        const today = new Date().toISOString().split('T')[0];
        const lastReset = senderData.lastRequestReset?.toDate().toISOString().split('T')[0];
        let currentCount = senderData.dailyRequestCount || 0;
        
        if (lastReset !== today) currentCount = 0;
        if (currentCount >= 5) {
          throw new Error("Daily limit reached (5 requests/day). Upgrade to Royal Premium for unlimited soulmate searches.");
        }
      }

      // 3. Duplicate Check
      // Note: Transactional query for collection is complex, so we check for an interaction doc instead
      const interactionRef = doc(db, "interactions", `${fromUser.uid}_${toId}`);
      const interactionSnap = await transaction.get(interactionRef);
      if (interactionSnap.exists() && interactionSnap.data().action === 'like') {
         throw new Error("Request already sent");
      }

      // 4. Create Request
      const requestRef = doc(collection(db, "requests"));
      transaction.set(requestRef, {
        fromId: fromUser.uid,
        fromName: fromNameOverride || fromUser.displayName || "Royal Soul",
        fromPhoto: fromPhotoOverride || fromUser.photoURL || "",
        toId,
        toName: toName || "Royal Member",
        toPhoto: toPhoto || "",
        status: "pending",
        createdAt: serverTimestamp(),
        type: "connection"
      });

      // 5. Update Interaction
      transaction.set(interactionRef, {
        fromId: fromUser.uid,
        toId,
        action: 'like',
        createdAt: serverTimestamp()
      }, { merge: true });

      // 6. Update Counter
      if (!isAdminUser && !isPremium) {
        transaction.update(senderRef, { 
          dailyRequestCount: increment(1),
          lastRequestReset: serverTimestamp() 
        });
      }

      return { success: true };
    });
  } catch (error: any) {
    console.error("Error sending request:", error);
    return { error: error.message || "Failed to send request" };
  }
};

export const acceptRequest = async (requestId: string, fromId: string, toId: string) => {
  try {
    const { runTransaction, doc, serverTimestamp } = await import("firebase/firestore");

    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "requests", requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists()) throw new Error("Request not found");
      if (requestSnap.data().status !== 'pending') throw new Error("Request already processed");

      // 1. Update Request
      transaction.update(requestRef, { status: "accepted" });

      // 2. Create Match
      const matchId = [fromId, toId].sort().join("_");
      const matchRef = doc(db, "matches", matchId);
      transaction.set(matchRef, {
        users: [fromId, toId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "Connection established",
        matchNames: {
          [fromId]: "You",
          [toId]: "Partner"
        }
      }, { merge: true });
    });

    // Email trigger outside transaction (as it's a side effect)
    try {
      const { getDoc, doc } = await import("firebase/firestore");
      const [fromDoc, toDoc] = await Promise.all([
         getDoc(doc(db, "users", fromId)),
         getDoc(doc(db, "users", toId))
      ]);

      if (fromDoc.exists() && fromDoc.data()?.email) {
         const senderEmail = fromDoc.data().email;
         const partnerName = toDoc.data()?.fullName || "A Royal Soul";
         const receiverName = fromDoc.data()?.fullName || "Royal Member";
         const idToken = await auth.currentUser?.getIdToken();

         await fetch("/api/email/send", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              ...(idToken && { "Authorization": `Bearer ${idToken}` })
            },
            body: JSON.stringify({
               to: senderEmail,
               templateType: "match",
               templateData: { receiverName, partnerName }
            })
         });
      }
    } catch (notifErr) {
      console.error("Notification trigger failed:", notifErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error accepting request:", error);
    return { error: error.message || "Failed to accept" };
  }
};

export const declineRequest = async (requestId: string) => {
  try {
    const { runTransaction, doc } = await import("firebase/firestore");
    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "requests", requestId);
      const requestSnap = await transaction.get(requestRef);
      
      if (!requestSnap.exists()) throw new Error("Request not found");
      if (requestSnap.data().status !== 'pending') throw new Error("Request already processed");
      
      transaction.update(requestRef, { status: "declined" });
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error declining:", error);
    return { error: error.message || "Failed to decline" };
  }
};
export const recordAction = async (fromId: string, toId: string, action: 'like' | 'dislike') => {
  try {
    const interactionId = `${fromId}_${toId}`;
    await setDoc(doc(db, "interactions", interactionId), {
      fromId,
      toId,
      action,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error recording action:", error);
  }
};

export const getInteractedIds = async (userId: string) => {
  try {
    const q = query(collection(db, "interactions"), where("fromId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data().toId);
  } catch (error) {
    console.error("Error getting interacted ids:", error);
    return [];
  }
};

export const unfriend = async (userId: string, partnerId: string) => {
  try {
    // Delete Match
    const matchId = [userId, partnerId].sort().join("_");
    await deleteDoc(doc(db, "matches", matchId));

    // Find and Delete/Decline Request
    const qFrom = query(
      collection(db, "requests"),
      where("fromId", "==", userId),
      where("toId", "==", partnerId)
    );
    const qTo = query(
      collection(db, "requests"),
      where("fromId", "==", partnerId),
      where("toId", "==", userId)
    );

    const [snapFrom, snapTo] = await Promise.all([getDocs(qFrom), getDocs(qTo)]);
    
    const deletePromises = [
      ...snapFrom.docs.map(d => deleteDoc(d.ref)),
      ...snapTo.docs.map(d => deleteDoc(d.ref))
    ];
    await Promise.all(deletePromises);

    // Also delete interaction to allow re-liking if desired (or keep it to prevent)
    // Let's delete to allow fresh start
    const interactionId1 = `${userId}_${partnerId}`;
    const interactionId2 = `${partnerId}_${userId}`;
    await deleteDoc(doc(db, "interactions", interactionId1));
    await deleteDoc(doc(db, "interactions", interactionId2));

    return { success: true };
  } catch (error) {
    console.error("Error unfriending:", error);
    return { error: "Failed to unfriend" };
  }
};
