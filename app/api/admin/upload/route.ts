import { NextResponse } from "next/server";
import { uploadManagedImage } from "../../../lib/managed-media";

type UploadSection =
  | "hero"
  | "home-portfolio"
  | "gallery-portrait"
  | "gallery-wedding"
  | "gallery-branding"
  | "client-login"
  | "client-cover"
  | "client-gallery";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");
    const section = formData.get("section");

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (typeof section !== "string") {
      return NextResponse.json({ error: "section is required" }, { status: 400 });
    }

    const typedSection = section as UploadSection;
    if (
      typedSection !== "hero" &&
      typedSection !== "home-portfolio" &&
      typedSection !== "gallery-portrait" &&
      typedSection !== "gallery-wedding" &&
      typedSection !== "gallery-branding" &&
      typedSection !== "client-login" &&
      typedSection !== "client-cover" &&
      typedSection !== "client-gallery"
    ) {
      return NextResponse.json({ error: "invalid section" }, { status: 400 });
    }

    if (!uploaded.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const arrayBuffer = await uploaded.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sectionPath =
      typedSection === "hero"
        ? ["hero"]
        : typedSection === "home-portfolio"
          ? ["home-portfolio"]
          : typedSection === "gallery-portrait"
            ? ["gallery", "portrait"]
            : typedSection === "gallery-wedding"
              ? ["gallery", "wedding"]
              : typedSection === "gallery-branding"
                ? ["gallery", "branding-media"]
                : typedSection === "client-gallery"
                  ? ["client-gallery"]
                  : ["client-login"];

    const result = await uploadManagedImage({
      buffer,
      originalFileName: uploaded.name,
      sectionPath,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}
