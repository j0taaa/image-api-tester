import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, image } = (await request.json()) as {
      url?: string;
      image?: string;
    };

    if (!url || !image) {
      return NextResponse.json(
        { message: "Missing url or image payload." },
        { status: 400 },
      );
    }

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: image,
    });

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: `Upstream request failed with ${apiResponse.status}.` },
        { status: 502 },
      );
    }

    const contentType = apiResponse.headers.get("content-type") || "image/png";
    const result = await apiResponse.text();

    return NextResponse.json({ result, contentType });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not reach the image API." },
      { status: 500 },
    );
  }
}
