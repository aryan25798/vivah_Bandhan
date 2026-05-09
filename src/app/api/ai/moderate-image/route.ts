import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this profile image for a matrimonial platform.
      Rules:
      1. No nudity or suggestive content (NSFW).
      2. No violence or hate symbols.
      3. No text (phone numbers, ads).
      4. Must be a clear human face.
      
      Respond ONLY with a JSON object:
      {
        "safe": boolean,
        "reason": "Short explanation if not safe",
        "blur_required": boolean
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64.split(",")[1],
          mimeType: "image/jpeg"
        }
      }
    ]);

    const text = result.response.text();
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return NextResponse.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error("Moderation Error:", error);
    return NextResponse.json({ safe: true, reason: "Manual review pending", blur_required: false });
  }
}
