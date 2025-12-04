"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const toBase64FromDataUrl = (dataUrl: string) => dataUrl.split(",")[1] ?? "";

const DEFAULT_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAFgwJ/lYw/kwAAAABJRU5ErkJggg==";
const DEFAULT_FILE_CONTENT_BASE64 =
  "VGhpcyBpcyBhIGRlZmF1bHQgZmlsZSBmb3IgdGVzdGluZyB0aGUgemlwIEFQSS4=";

export default function Home() {
  const [imageApiUrl, setImageApiUrl] = useState("");
  const [zipApiUrl, setZipApiUrl] = useState("");

  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(
    null,
  );
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(
    null,
  );
  const [imageOutput, setImageOutput] = useState<string | null>(null);
  const [imageContentType, setImageContentType] = useState<string>("image/png");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [useDefaultImage, setUseDefaultImage] = useState(false);

  const [zipFiles, setZipFiles] = useState<
    { filename: string; content: string; size: number }[]
  >([]);
  const [zipResult, setZipResult] = useState<
    { dataUrl: string; filename: string }
    | null
  >(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [useDefaultZip, setUseDefaultZip] = useState(false);

  const imageReady = useMemo(
    () => Boolean(imageApiUrl && selectedImageBase64),
    [imageApiUrl, selectedImageBase64],
  );

  const zipReady = useMemo(
    () => Boolean(zipApiUrl && zipFiles.length > 0),
    [zipApiUrl, zipFiles],
  );

  const handleImageSelection = (file: File | null) => {
    setUseDefaultImage(false);

    if (!file) {
      setSelectedImageBase64(null);
      setSelectedImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedImagePreview(dataUrl);
      setSelectedImageBase64(toBase64FromDataUrl(dataUrl));
    };
    reader.readAsDataURL(file);
  };

  const handleZipSelection = (files: FileList | null) => {
    setUseDefaultZip(false);

    if (!files) {
      setZipFiles([]);
      return;
    }

    Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<{
            filename: string;
            content: string;
            size: number;
          }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve({
                filename: file.name,
                content: toBase64FromDataUrl(dataUrl),
                size: file.size,
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((encoded) => setZipFiles(encoded))
      .catch(() => setZipError("Could not read selected files."));
  };

  useEffect(() => {
    if (useDefaultImage) {
      const defaultPreview = `data:image/png;base64,${DEFAULT_IMAGE_BASE64}`;
      setSelectedImagePreview(defaultPreview);
      setSelectedImageBase64(DEFAULT_IMAGE_BASE64);
      setImageError(null);
      return;
    }

    setSelectedImagePreview(null);
    setSelectedImageBase64(null);
  }, [useDefaultImage]);

  useEffect(() => {
    if (useDefaultZip) {
      const defaultContent = atob(DEFAULT_FILE_CONTENT_BASE64);
      const defaultSize = new TextEncoder().encode(defaultContent).length;
      setZipFiles([
        {
          filename: "sample.txt",
          content: DEFAULT_FILE_CONTENT_BASE64,
          size: defaultSize,
        },
      ]);
      setZipError(null);
      return;
    }

    setZipFiles([]);
  }, [useDefaultZip]);

  const submitImage = async () => {
    if (!imageReady || !selectedImageBase64) return;
    setImageLoading(true);
    setImageError(null);
    setImageOutput(null);

    try {
      const response = await fetch("/api/invert-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageApiUrl, image: selectedImageBase64 }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Request failed.");
      }

      const payload = (await response.json()) as {
        contentType?: string;
        result: string;
      };

      setImageContentType(payload.contentType || "image/png");
      setImageOutput(payload.result);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setImageLoading(false);
    }
  };

  const submitZip = async () => {
    if (!zipReady) return;
    setZipLoading(true);
    setZipError(null);
    setZipResult(null);

    try {
      const response = await fetch("/api/zip-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: zipApiUrl, files: zipFiles }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Request failed.");
      }

      const payload = (await response.json()) as {
        filename?: string;
        zip: string;
      };

      setZipResult({
        dataUrl: `data:application/zip;base64,${payload.zip}`,
        filename: payload.filename || "result.zip",
      });
    } catch (error) {
      setZipError(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Minimal API testing surface
            </p>
            <h1 className="text-2xl font-semibold">Image API tester</h1>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            The frontend only collects input; all requests go through the backend.
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle className="text-xl">Image inversion</CardTitle>
              <p className="text-sm text-muted-foreground">
                Send a base64-encoded image to your inversion API and view the
                result.
              </p>
            </CardHeader>
            <Separator />
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="image-url">API URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/invert"
                  value={imageApiUrl}
                  onChange={(event) => setImageApiUrl(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="image-upload">Image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  disabled={useDefaultImage}
                  onChange={(event) =>
                    handleImageSelection(event.target.files?.[0] ?? null)
                  }
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    id="use-default-image"
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={useDefaultImage}
                    onChange={(event) => setUseDefaultImage(event.target.checked)}
                  />
                  <Label
                    htmlFor="use-default-image"
                    className="text-sm text-muted-foreground"
                  >
                    Use default sample image
                  </Label>
                </div>
                {selectedImagePreview && (
                  <div className="mt-2 overflow-hidden rounded-md border bg-card p-2">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Preview
                    </p>
                    <img
                      src={selectedImagePreview}
                      alt="Selected"
                      className="h-48 w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {imageError && (
                <p className="text-sm text-destructive">{imageError}</p>
              )}

              <div className="mt-auto flex items-center gap-3">
                <Button onClick={submitImage} disabled={!imageReady || imageLoading}>
                  {imageLoading ? "Sending..." : "Send to API"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Backend forwards the raw image bytes from your selection.
                </p>
              </div>

              {imageOutput && (
                <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
                  <p className="text-sm font-medium">Output</p>
                  <img
                    src={`data:${imageContentType};base64,${imageOutput}`}
                    alt="API result"
                    className="h-64 w-full rounded-sm border object-contain"
                  />
                  <a
                    href={`data:${imageContentType};base64,${imageOutput}`}
                    download="inverted-image"
                    className="text-sm font-medium text-primary underline"
                  >
                    Download result
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle className="text-xl">Zip bundler</CardTitle>
              <p className="text-sm text-muted-foreground">
                Send multiple files to an API that returns a zip archive.
              </p>
            </CardHeader>
            <Separator />
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="zip-url">API URL</Label>
                <Input
                  id="zip-url"
                  type="url"
                  placeholder="https://example.com/zip"
                  value={zipApiUrl}
                  onChange={(event) => setZipApiUrl(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="zip-upload">Files</Label>
                <Input
                  id="zip-upload"
                  type="file"
                  multiple
                  disabled={useDefaultZip}
                  onChange={(event) => handleZipSelection(event.target.files)}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    id="use-default-zip"
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={useDefaultZip}
                    onChange={(event) => setUseDefaultZip(event.target.checked)}
                  />
                  <Label
                    htmlFor="use-default-zip"
                    className="text-sm text-muted-foreground"
                  >
                    Use default sample file
                  </Label>
                </div>
                {zipFiles.length > 0 && (
                  <div className="rounded-md border bg-card p-2 text-sm">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Selected files
                    </p>
                    <ul className="space-y-1">
                      {zipFiles.map((file) => (
                        <li key={file.filename} className="flex justify-between">
                          <span className="truncate text-muted-foreground">
                            {file.filename}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {zipError && <p className="text-sm text-destructive">{zipError}</p>}

              <div className="mt-auto flex items-center gap-3">
                <Button onClick={submitZip} disabled={!zipReady || zipLoading}>
                  {zipLoading ? "Sending..." : "Send to API"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Body matches the expected files JSON structure.
                </p>
              </div>

              {zipResult && (
                <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
                  <p className="text-sm font-medium">Resulting zip</p>
                  <a
                    href={zipResult.dataUrl}
                    download={zipResult.filename}
                    className="text-sm font-medium text-primary underline"
                  >
                    Download {zipResult.filename}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
