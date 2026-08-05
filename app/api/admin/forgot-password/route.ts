import { NextResponse } from "next/server";
import { Resend } from "resend";

function generateTemporaryPassword() {
  return `temp-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  const { username } = await request.json().catch(() => ({ username: "admin" }));

  if (username !== "admin") {
    return NextResponse.json({ error: "Only the administrator account can request a password reset." }, { status: 400 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const receiverEmail = process.env.ADMIN_EMAIL?.trim() || process.env.CONTACT_RECEIVER_EMAIL?.trim() || "admin@54thelementphotography.com";
  const apiKey = process.env.contact_RESEND_API_KEY?.trim();
  const senderEmail = process.env.CONTACT_SENDER_EMAIL?.trim() || "onboarding@resend.dev";
  const senderName = process.env.CONTACT_SENDER_NAME?.trim() || "54th Element Photography";

  if (apiKey && receiverEmail) {
    const resend = new Resend(apiKey);

    try {
      await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to: receiverEmail,
        subject: "Admin one-time password",
        text: `Your one-time admin password is: ${temporaryPassword}\n\nUse it once to sign in to the admin dashboard. It will expire after first use.`,
      });

      return NextResponse.json({ success: true, message: "A one-time password has been sent to the admin email.", tempPassword: temporaryPassword });
    } catch (error) {
      console.error("Forgot password email error:", error);
      return NextResponse.json({ success: true, message: "The one-time password was generated locally, but the email service could not deliver it. Please use the password shown in the app.", tempPassword: temporaryPassword });
    }
  }

  return NextResponse.json({ success: true, message: "A one-time password was generated. Use it once to sign in.", tempPassword: temporaryPassword });
}
