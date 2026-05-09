require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Service account from env
const serviceAccount = {
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  projectId: "matrimonial-69101"
};

if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("Missing admin credentials for seeding.");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const dummyUsers = [
  { fullName: "Aditi Sharma", age: "24", gender: "Female", religion: "Hindu", occupation: "Software Engineer", income: "18 LPA", gotra: "Vatsa", rashi: "Mesha", bio: "Looking for someone who loves coding and trekking.", onboarded: true, photoURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400" },
  { fullName: "Rohan Gupta", age: "27", gender: "Male", religion: "Hindu", occupation: "Doctor", income: "25 LPA", gotra: "Kashyap", rashi: "Vrishabha", bio: "Passionate about healing and music.", onboarded: true, photoURL: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400" },
  { fullName: "Priya Singh", age: "25", gender: "Female", religion: "Hindu", occupation: "Product Manager", income: "22 LPA", gotra: "Bhardwaj", rashi: "Mithuna", bio: "Let's build a future together.", onboarded: true, photoURL: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400" },
];

async function seed() {
  const batch = db.batch();
  dummyUsers.forEach((user, i) => {
    const ref = db.collection('users').doc(`dummy_user_${i}`);
    batch.set(ref, { ...user, createdAt: new Date() });
  });
  await batch.commit();
  console.log("Successfully seeded 3 dummy users.");
}

seed();
