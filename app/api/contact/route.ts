import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

function pickEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

export async function POST(request: Request) {
  const apiKey = pickEnv('RESEND_API_KEY');
  const receiverEmail = pickEnv('CONTACT_RECEIVER_EMAIL', 'RESEND_TO_EMAIL', 'RECEIVER_EMAIL');
  const senderEmail = pickEnv('CONTACT_SENDER_EMAIL', 'RESEND_FROM_EMAIL', 'SENDER_EMAIL');
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
    const { name, email, phone, message, service } = await request.json();
    const safeName = typeof name === 'string' ? name.trim() : '';
    const safeEmail = typeof email === 'string' ? email.trim() : '';
    const safePhone = typeof phone === 'string' ? phone.trim() : '';
    const safeMessage = typeof message === 'string' ? message.trim() : '';
    const safeService = typeof service === 'string' ? service.trim() : '';

    if (!safeName || !safeEmail || !safeMessage) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    if (!emailPattern.test(safeEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const fromHeader = `${senderName} <${senderEmail}>`;
    const subject = safeService
      ? `New Contact Form Submission for ${safeService} from ${safeName}`
      : `New Contact Form Submission from ${safeName}`;

    const data = await resend.emails.send({
      from: fromHeader,
      to: receiverEmail,
      subject,
      replyTo: safeEmail,
      text: `Name: ${safeName}\nEmail: ${safeEmail}\n${safePhone ? `Phone: ${safePhone}\n` : ''}${safeService ? `Service: ${safeService}\n\n` : ''}Message:\n${safeMessage}`,
    });

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
