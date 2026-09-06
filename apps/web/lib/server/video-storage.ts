import { getAdminBucket } from "@/lib/firebase-admin";

export function getStorageObjectPathFromVideoUrl(
  videoUrl: string
): string | null {
  try {
    const parsed =
      new URL(videoUrl);

    const match =
      parsed.pathname.match(
        /\/o\/(.+)$/
      );

    if (!match?.[1]) {
      return null;
    }

    return decodeURIComponent(
      match[1]
    );
  } catch {
    return null;
  }
}

export async function deleteStorageVideo(
  videoUrl: string
) {
  const objectPath =
    getStorageObjectPathFromVideoUrl(
      videoUrl
    );

  if (!objectPath) {
    return;
  }

  try {
    await getAdminBucket()
      .file(objectPath)
      .delete({
        ignoreNotFound: true,
      });
  } catch (error: any) {
    if (
      error?.code === 404 ||
      error?.code === 404
    ) {
      return;
    }

    throw error;
  }
}
