
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const sampleProfiles = [
  {
    fullName: "Priya Sharma",
    age: "24",
    occupation: "Software Engineer",
    income: "22 LPA",
    bio: "Passionate about tech and tradition. Looking for a soulmate who values both.",
    photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800",
    rashi: "Mithun",
    gotra: "Kashyap",
    matchScore: "98%",
    onboarded: true,
    gender: "female"
  },
  {
    fullName: "Aravind Iyer",
    age: "28",
    occupation: "Investment Banker",
    income: "45 LPA",
    bio: "Classic values with a modern outlook. Seeking a meaningful connection.",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
    rashi: "Simha",
    gotra: "Bharadwaj",
    matchScore: "92%",
    onboarded: true,
    gender: "male"
  },
  {
    fullName: "Ananya Reddy",
    age: "26",
    occupation: "Product Designer",
    income: "18 LPA",
    bio: "Creative soul who loves traveling and exploring cultural heritage.",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
    rashi: "Kanya",
    gotra: "Vasishta",
    matchScore: "95%",
    onboarded: true,
    gender: "female"
  },
  {
    fullName: "Rohan Malhotra",
    age: "27",
    occupation: "Marketing Director",
    income: "35 LPA",
    bio: "Outgoing and ambitious. Looking for a partner to build a shared future.",
    photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800",
    rashi: "Tula",
    gotra: "Gautama",
    matchScore: "89%",
    onboarded: true,
    gender: "male"
  },
  {
    fullName: "Sanya Gupta",
    age: "25",
    occupation: "Data Scientist",
    income: "28 LPA",
    bio: "Analytical mind with a warm heart. Believe in the magic of destiny.",
    photoURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
    rashi: "Dhanu",
    gotra: "Atri",
    matchScore: "91%",
    onboarded: true,
    gender: "female"
  },
  {
    fullName: "Vikram Singh",
    age: "30",
    occupation: "Entrepreneur",
    income: "80 LPA+",
    bio: "Building a legacy. Seeking a queen to share my empire and values.",
    photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800",
    rashi: "Vrishabh",
    gotra: "Angirasa",
    matchScore: "97%",
    onboarded: true,
    gender: "male"
  },
  {
    fullName: "Ishita Kapoor",
    age: "24",
    occupation: "Fashion Consultant",
    income: "15 LPA",
    bio: "Elegance is the only beauty that never fades. Seeking my perfect match.",
    photoURL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800",
    rashi: "Meen",
    gotra: "Shandilya",
    matchScore: "93%",
    onboarded: true,
    gender: "female"
  },
  {
    fullName: "Kabir Verma",
    age: "29",
    occupation: "Architect",
    income: "40 LPA",
    bio: "Designing spaces and life with purpose. Seeking a creative companion.",
    photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
    rashi: "Makar",
    gotra: "Kashyap",
    matchScore: "90%",
    onboarded: true,
    gender: "male"
  },
  {
    fullName: "Meera Nair",
    age: "23",
    occupation: "Research Scientist",
    income: "20 LPA",
    bio: "Quiet but deeply thoughtful. Lover of literature and classical dance.",
    photoURL: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800",
    rashi: "Kumbh",
    gotra: "Vishwamitra",
    matchScore: "96%",
    onboarded: true,
    gender: "female"
  },
  {
    fullName: "Siddharth Bose",
    age: "31",
    occupation: "Surgeon",
    income: "1.2 Cr",
    bio: "Dedicated to saving lives. Looking for a pillar of support and grace.",
    photoURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
    rashi: "Mesh",
    gotra: "Jamadagni",
    matchScore: "94%",
    onboarded: true,
    gender: "male"
  }
];

async function seed() {
  console.log("Seeding 10 Royal Profiles...");
  for (const profile of sampleProfiles) {
    const docRef = db.collection('users').doc();
    await docRef.set({
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`Added: ${profile.fullName}`);
  }
  console.log("Seeding complete!");
}

seed().catch(console.error);
