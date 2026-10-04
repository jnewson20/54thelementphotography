import { NextResponse } from "next/server";
import { stageUploadChunk } from "../../../../lib/managed-media";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk");
    const uploadId = formData.get("uploadId");
    const index = Number(formData.get("index"));

    if (!(chunk instanceof File) || typeof uploadId !== "string" || !Number.isInteger(index) || index < 0 || index > 100) {
      return NextResponse.json({ error: "invalid chunk" }, { status: 400 });
    }

    await stageUploadChunk(uploadId, index, Buffer.from(await chunk.arrayBuffer()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Chunk upload failed", error);
    return NextResponse.json({ error: `Unable to upload image: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 500 });
  }
}
