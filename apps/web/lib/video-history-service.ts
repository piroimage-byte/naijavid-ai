export type VideoHistoryItem = {
  id: string;
  userId: string;
  title?: string;
  videoUrl: string;
  createdAt?: any;
};

const mockVideos: VideoHistoryItem[] = [];

export async function getUserVideos(
  userId: string
): Promise<VideoHistoryItem[]> {
  return mockVideos.filter((item) => item.userId === userId);
}

export async function deleteUserVideo(id: string): Promise<void> {
  const index = mockVideos.findIndex((item) => item.id === id);

  if (index >= 0) {
    mockVideos.splice(index, 1);
  }
}

export async function saveUserVideo(data: {
  userId: string;
  title?: string;
  videoUrl: string;
}): Promise<VideoHistoryItem> {
  const item: VideoHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId: data.userId,
    title: data.title || "Generated Video",
    videoUrl: data.videoUrl,
    createdAt: new Date(),
  };

  mockVideos.unshift(item);
  return item;
}