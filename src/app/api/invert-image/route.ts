import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, image, contentType } = (await request.json()) as {
      url?: string;
      image?: string;
      contentType?: string;
    };

    if (!url || !image) {
      return NextResponse.json(
        { message: "Missing url or image payload." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(image, "base64");

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": contentType || "image/png",
      },
      body: imageBuffer,
    });

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: `Upstream request failed with ${apiResponse.status}.` },
        { status: 502 },
      );
    }

    const responseContentType =
      apiResponse.headers.get("content-type") || contentType || "image/png";
    const responseBuffer = Buffer.from(await apiResponse.arrayBuffer());
    const result = responseBuffer.toString("base64");

    return NextResponse.json({ result, contentType: responseContentType });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not reach the image API." },
      { status: 500 },
    );
  }
}
