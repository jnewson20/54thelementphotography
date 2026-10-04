import { NextResponse } from "next/server";
import { assembleStagedUpload, clearStagedUpload, uploadManagedImage } from "../../../../lib/managed-media";
import { resolveSectionPath } from "../../../../lib/upload-sections";

export const maxDuration = 60;

type CompletePayload = {
  uploadId?: string;
  totalChunks?: number;
  section?: string;
  fileName?: string;
  contentType?: string;
};

export async function POST(request: Request) {
  let uploadId = "";
  let totalChunks = 0;

  try {
    const body = (await request.json()) as CompletePayload;
    const sectionPath = resolveSectionPath(body.section);
    uploadId = body.uploadId || "";
    totalChunks = Number(body.totalChunks);

    if (!sectionPath || !uploadId || !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 101) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }

    if (!body.contentType?.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const buffer = await assembleStagedUpload(uploadId, totalChunks);
    const result = await uploadManagedImage({ buffer, originalFileName: body.fileName, sectionPath, contentType: body.contentType });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Completing upload failed", error);
    return NextResponse.json({ error: `Unable to upload image: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 500 });
  } finally {
    if (uploadId && totalChunks > 0) {
      await clearStagedUpload(uploadId, totalChunks);
    }
  }
}
