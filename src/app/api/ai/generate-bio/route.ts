import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized access to Royal AI Scribe." }, { status: 401 });
  }

  const idToken = authHeader.split("Bearer ")[1];
  let uid = "";
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken) throw new Error("Invalid token");
    uid = decodedToken.uid;
  } catch (err) {
    return NextResponse.json({ error: "Divine identity could not be verified." }, { status: 401 });
  }

  // 1. Rate Limiting Logic (3 requests per day)
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    
    const today = new Date().toISOString().split('T')[0];
    const lastAiReset = userData.lastAiReset || "";
    let aiCount = userData.aiCount || 0;

    if (lastAiReset !== today) {
      aiCount = 0;
    }

    if (aiCount >= 3) {
      return NextResponse.json({ 
        error: "Daily scribe limit reached.", 
        details: "You have exhausted your daily divine inspirations. Please return tomorrow or upgrade to Royal Premium." 
      }, { status: 429 });
    }

    // Update counter
    await userRef.update({
      aiCount: aiCount + 1,
      lastAiReset: today
    });
  } catch (rateLimitErr) {
    console.error("Rate limit check failed:", rateLimitErr);
    // Continue anyway but log it
  }

  console.log("AI Bio API: Received authenticated request");
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("AI Bio API: API Key missing");
      return NextResponse.json({ error: "Gemini API Key is missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body = await request.json();
    console.log("AI Bio API: Body parsed", body);

    const { fullName, age, occupation, religion, hobbies } = body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("AI Bio API: Model initialized (2.5 Flash)");

    const prompt = `
      Create a premium, elegant, and attractive matrimonial bio for the following person:
      Name: ${fullName}
      Age: ${age}
      Occupation: ${occupation}
      Religion: ${religion}
      Additional Info: ${hobbies || "N/A"}
      
      The bio should be in first person, sound sophisticated yet traditional, and appeal to someone looking for a serious life partner. 
      Focus on values, career aspirations, and personality.
      Keep it around 150-200 words.
      Format it with a catchy opening and a clear closing.
    `;

    console.log("AI Bio API: Generating content with Gemini 2.5...");
    let text = "";
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = response.text();
    } catch (geminiError) {
      console.error("Gemini Failed, falling back to Groq:", geminiError);
      
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }]
          })
        });
        
        if (groqRes.ok) {
          const groqData = await groqRes.json();
          text = groqData.choices[0].message.content;
          console.log("AI Bio API: Content generated successfully via Groq (Llama 3.3)");
        } else {
          const errText = await groqRes.text();
          console.error("Groq Failed:", errText);
          throw new Error("Both Gemini and Groq failed.");
        }
      } else {
        throw geminiError;
      }
    }

    if (!text) {
      throw new Error("AI returned empty content");
    }

    return NextResponse.json({ bio: text });
  } catch (error: any) {
    console.error("Error generating bio:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate bio",
      details: "Our royal AI scribe is currently unavailable. Please try again in a moment." 
    }, { status: 500 });
  }
}
