import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL?.trim();
  const senderEmail = process.env.CONTACT_SENDER_EMAIL?.trim();
  const senderName = process.env.CONTACT_SENDER_NAME?.trim() || 'Contact Form';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing RESEND_API_KEY environment variable.' },
      { status: 500 }
    );
  }

  if (!receiverEmail) {
    return NextResponse.json(
      { error: 'Missing CONTACT_RECEIVER_EMAIL environment variable.' },
      { status: 500 }
    );
  }

  if (!emailPattern.test(receiverEmail)) {
    return NextResponse.json(
      { error: 'Invalid CONTACT_RECEIVER_EMAIL format. It must be a valid email address.' },
      { status: 500 }
    );
  }

  if (!senderEmail) {
    return NextResponse.json(
      { error: 'Missing CONTACT_SENDER_EMAIL environment variable.' },
      { status: 500 }
    );
  }

  if (!emailPattern.test(senderEmail)) {
    return NextResponse.json(
      { error: 'Invalid CONTACT_SENDER_EMAIL format. It must be a valid email address.' },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    const { name, email, message, service } = await request.json();

    // Basic server-side validation validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Send email using Resend
    const fromHeader = `${senderName} <${senderEmail}>`;
    const subject = service
      ? `New Contact Form Submission for ${service} from ${name}`
      : `New Contact Form Submission from ${name}`;

    const data = await resend.emails.send({
      from: fromHeader,
      to: receiverEmail,
      subject,
      text: `Name: ${name}\nEmail: ${email}\n${service ? `Service: ${service}\n\n` : ''}Message:\n${message}`,
    });

    // Check if Resend returned an error in the response
    if (data.error) {
      console.error('Resend send error:', data.error);
      return NextResponse.json(
        { error: `Email service error: ${data.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Thank you for your inquiry! Will hear from us soon!', data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Something went wrong.' },
      { status: 500 }
    );
  }
}
