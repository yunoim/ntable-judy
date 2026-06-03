// 사진 / 영상 (mp4·mov) 판별 헬퍼.
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}
