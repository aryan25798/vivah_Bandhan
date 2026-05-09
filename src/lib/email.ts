import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"Vivah Bandhan" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

const getBaseTemplate = (title: string, content: string, footerText: string = "Divine Union • Sacred Tradition • Modern Connection") => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Montserrat:wght@300;400;700&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Montserrat:wght@300;400;700&display=swap');
          body { margin: 0; padding: 0; background-color: #050505; color: #E5E5E5; font-family: 'Montserrat', sans-serif; }
          .container { max-width: 600px; margin: 40px auto; background-color: #0A0A0A; border: 1px solid #C5A05933; border-radius: 40px; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8); }
          .header { background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%); padding: 60px 40px; text-align: center; border-bottom: 1px solid #C5A05922; position: relative; }
          .header::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 100px; h: 1px; background: #C5A059; }
          .title { font-family: 'Playfair Display', serif; font-size: 32px; color: #C5A059; margin: 0; letter-spacing: -0.02em; font-weight: 700; font-style: italic; }
          .content { padding: 50px 40px; line-height: 1.8; font-size: 15px; color: #A0A0A0; font-weight: 400; }
          .footer { background-color: #070707; padding: 30px; text-align: center; border-top: 1px solid #ffffff05; }
          .footer-text { font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; color: #444; font-weight: 700; }
          .btn { display: inline-block; padding: 18px 45px; background: linear-gradient(135deg, #C5A059 0%, #A68445 100%); color: #000; text-decoration: none; border-radius: 100px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 30px; box-shadow: 0 20px 40px rgba(197, 160, 89, 0.2); }
          .highlight { color: #C5A059; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p class="footer-text">${footerText}</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const getWelcomeEmailTemplate = (name: string) => {
  return getBaseTemplate(
    "The Royal Circle Awaits",
    `
      <p style="font-size: 20px; color: #ffffff; margin-bottom: 25px; font-family: 'Playfair Display', serif;">Namaste <span class="highlight">${name}</span>,</p>
      <p>It is with great honor that we welcome you to the <span class="highlight">Vivah Bandhan Royal Circle</span>. You have just taken the first step toward a union that transcends time—a connection rooted in tradition yet refined by modern intelligence.</p>
      <p>Our divine algorithms and concierge team are already at work, curating profiles that resonate with your unique values and aspirations.</p>
      <div style="text-align: center;">
        <a href="${BASE_URL}/dashboard" class="btn">Enter The Hub</a>
      </div>
    `
  );
};

export const getInterestEmailTemplate = (receiverName: string, senderName: string) => {
  return getBaseTemplate(
    "A Sacred Signal",
    `
      <p style="font-size: 20px; color: #ffffff; margin-bottom: 25px; font-family: 'Playfair Display', serif;">Namaste <span class="highlight">${receiverName}</span>,</p>
      <p>Intelligence has just intercepted a sacred signal. <span class="highlight">${senderName}</span> has expressed a profound interest in your profile.</p>
      <p>This is more than a notification; it is an invitation to explore a potential destiny. We suggest reviewing their credentials while the alignment is fresh.</p>
      <div style="text-align: center;">
        <a href="${BASE_URL}/dashboard" class="btn">View Interest</a>
      </div>
    `
  );
};

export const getMatchEmailTemplate = (receiverName: string, partnerName: string) => {
  return getBaseTemplate(
    "Sacred Bond Established",
    `
      <p style="font-size: 20px; color: #ffffff; margin-bottom: 25px; font-family: 'Playfair Display', serif;">Congratulations <span class="highlight">${receiverName}</span>,</p>
      <p>The stars have aligned. Your interest has been reciprocated by <span class="highlight">${partnerName}</span>, establishing a sacred bond within the Royal Circle.</p>
      <p>The path is now clear for secure communication. May this dialogue be the beginning of your forever story.</p>
      <div style="text-align: center;">
        <a href="${BASE_URL}/messages" class="btn">Begin Dialogue</a>
      </div>
    `
  );
};
