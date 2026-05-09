import { NextRequest, NextResponse } from "next/server";
import { 
  sendEmail, 
  getWelcomeEmailTemplate, 
  getInterestEmailTemplate, 
  getMatchEmailTemplate 
} from "@/lib/email";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html: directHtml, templateType, templateData } = await req.json();
    console.log(`[Email API] Request received for: ${to} (Template: ${templateType || 'direct'})`);
    
    // Optional: Verify Authorization
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        console.log(`[Email API] Authorized user: ${decodedToken.email}`);
      } catch (err) {
        console.error("[Email API] Auth verification failed:", err);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.warn("[Email API] No authorization header provided");
    }

    let finalHtml = directHtml;
    let finalSubject = subject;

    if (templateType === "welcome") {
      finalHtml = getWelcomeEmailTemplate(templateData.name);
      finalSubject = finalSubject || `Welcome to Vivah Bandhan, ${templateData.name}`;
    } else if (templateType === "interest") {
      finalHtml = getInterestEmailTemplate(templateData.receiverName, templateData.senderName);
      finalSubject = finalSubject || `New Interest from ${templateData.senderName}`;
    } else if (templateType === "match") {
      finalHtml = getMatchEmailTemplate(templateData.receiverName, templateData.partnerName);
      finalSubject = finalSubject || `Sacred Bond with ${templateData.partnerName}`;
    }

    if (!to || !finalSubject || !finalHtml) {
      console.error("[Email API] Missing required fields", { to, finalSubject, hasHtml: !!finalHtml });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`[Email API] Dispatching email via ${process.env.GMAIL_EMAIL}...`);
    const info = await sendEmail(to, finalSubject, finalHtml);
    console.log(`[Email API] Success: ${info.messageId}`);
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("[Email API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
