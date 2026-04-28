import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const fontData = await readFile(
    path.join(process.cwd(), "app", "fonts", "Transcity.otf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          color: "#e4c76b",
          fontFamily: "Transcity",
          fontSize: 26,
          lineHeight: 1,
          paddingBottom: 2,
        }}
      >
        A
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Transcity",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
