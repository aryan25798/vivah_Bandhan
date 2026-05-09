const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkFleet() {
    console.log("Checking Fleet...");
    const snap = await db.collection('users').where('isManaged', '==', true).get();
    console.log("Found", snap.size, "managed users");
    snap.docs.slice(0, 5).forEach(d => {
        console.log(d.id, d.data().fullName, "createdAt:", d.data().createdAt?.toDate?.());
    });

    const pendingReqs = await db.collection('requests').where('status', '==', 'pending').get();
    console.log("Found", pendingReqs.size, "pending requests total");
    
    const managedIds = snap.docs.map(d => d.id);
    const fleetSignals = pendingReqs.docs.filter(d => managedIds.includes(d.data().toId));
    console.log("Found", fleetSignals.size, "signals for fleet");
}

checkFleet().catch(console.error);
