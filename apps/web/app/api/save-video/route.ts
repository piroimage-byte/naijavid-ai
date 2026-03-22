import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { title, videoUrl, filename, duration, fps, imageName, userId } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Missing video URL" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    await addDoc(collection(db, "videoHistory"), {
      userId,
      title: title || "Untitled Video",
      videoUrl,
      filename: filename || "",
      duration: duration || 0,
      fps: fps || 0,
      imageName: imageName || "",
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save video" },
      { status: 500 }
    );
  }
}