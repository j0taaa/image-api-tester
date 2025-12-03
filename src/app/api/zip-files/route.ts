import { NextResponse } from "next/server";

interface FilePayload {
  filename: string;
  content: string;
}

export async function POST(request: Request) {
  try {
    const { url, files } = (await request.json()) as {
      url?: string;
      files?: FilePayload[];
    };

    if (!url || !files?.length) {
      return NextResponse.json(
        { message: "Missing url or files payload." },
        { status: 400 },
      );
    }

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: `Upstream request failed with ${apiResponse.status}.` },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(await apiResponse.arrayBuffer());
    const filename =
      apiResponse.headers
        .get("content-disposition")
        ?.split("filename=")?.[1]
        ?.replace(/\"/g, "") || "result.zip";

    return NextResponse.json({ zip: buffer.toString("base64"), filename });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not reach the zip API." },
      { status: 500 },
    );
  }
}
