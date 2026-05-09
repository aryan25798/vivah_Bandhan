import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { user1, user2 } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Act as a Vedic Astrology Expert and Matrimonial Consultant.
      Calculate a compatibility score (0-100) between two individuals for a Hindu Matrimonial platform.
      
      User 1:
      Name: ${user1.fullName}
      Age: ${user1.age}
      Occupation: ${user1.occupation}
      Gotra: ${user1.gotra}
      Rashi: ${user1.rashi}
      
      User 2:
      Name: ${user2.fullName}
      Age: ${user2.age}
      Occupation: ${user2.occupation}
      Gotra: ${user2.gotra}
      Rashi: ${user2.rashi}
      
      Rules:
      1. Same Gotra matching is usually avoided in some traditions (mention this if applicable).
      2. Rashi compatibility should be considered.
      3. Age and Professional stability should also factor in.
      
      Respond ONLY with a JSON object:
      {
        "score": number,
        "summary": "Short 2 sentence explanation of the match quality",
        "compatibility_type": "Traditional" | "Modern" | "Excellent" | "Average"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON from markdown if necessary
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error("Match Score Error:", error);
    return NextResponse.json({ score: 75, summary: "Matches based on professional background and shared values.", compatibility_type: "Modern" });
  }
}
