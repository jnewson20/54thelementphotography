import { NextResponse } from "next/server";
import { uploadManagedImage } from "../../../lib/managed-media";
import { resolveSectionPath } from "../../../lib/upload-sections";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");
    const sectionPath = resolveSectionPath(formData.get("section"));

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!sectionPath) {
      return NextResponse.json({ error: "invalid section" }, { status: 400 });
    }

    if (!uploaded.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const result = await uploadManagedImage({
      buffer: Buffer.from(await uploaded.arrayBuffer()),
      originalFileName: uploaded.name,
      sectionPath,
      contentType: uploaded.type,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Image upload failed", error);
    return NextResponse.json({ error: `Unable to upload image: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 500 });
  }
}
