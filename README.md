This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment variables

This project requires the following environment variables for the contact form API:

```bash
contact_RESEND_API_KEY=your_resend_api_key_here
CONTACT_RECEIVER_EMAIL=your_email@example.com
```

Copy `.env.example` to `.env.local` and replace the placeholder values with your real credentials.

```bash
cp .env.example .env.local
```

Then restart the development server.

## AWS S3 setup (recommended)

This project supports AWS S3 for:

1. Persistent site content JSON
2. Uploaded image storage
3. Deleting replaced/removed uploaded images

### 1) Create an S3 bucket

Create a bucket in your preferred region (example: `us-east-1`), for example:

`54thelementphotography-media`

### 2) Create an IAM user for the app

Create an IAM user with programmatic access and attach a policy limited to your bucket.

Use this policy (replace bucket name):

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Action": [
				"s3:GetObject",
				"s3:PutObject",
				"s3:DeleteObject"
			],
			"Resource": "arn:aws:s3:::54thelementphotography-media/*"
		},
		{
			"Effect": "Allow",
			"Action": [
				"s3:ListBucket"
			],
			"Resource": "arn:aws:s3:::54thelementphotography-media"
		}
	]
}
```

### 3) Bucket public-read for uploaded images

If you want direct image URLs to be publicly viewable, allow read-only access for `uploads/*`.

Bucket policy example:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "PublicReadUploads",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::54thelementphotography-media/uploads/*"
		}
	]
}
```

### 4) Configure `.env.local`

Add the following values:

```bash
S3_BUCKET_NAME=54thelementphotography-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://54thelementphotography-media.s3.us-east-1.amazonaws.com
S3_CONTENT_KEY=admin-content.json
S3_UPLOAD_PREFIX=uploads
```

For AWS S3, leave these empty/default:

```bash
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
```

### 5) Restart app and test

```bash
npm run dev
```

Then in `/admin`:

1. Upload/replace an image
2. Save changes (auto-save also runs)
3. Refresh and confirm image persists
4. Remove an uploaded image and confirm it disappears

If S3 variables are missing, the app automatically falls back to local filesystem storage.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
