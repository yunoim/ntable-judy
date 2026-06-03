// GIF 파일의 전체 재생 시간 (ms) 계산. Graphic Control Extension 블록들의
// delay (in centiseconds) 를 합산. 정확히 한 사이클 재생 시간.
// 파싱 실패 / GIF 아님 → null.

export async function getGifDurationMs(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = new Uint8Array(ab);
    // GIF header: "GIF87a" or "GIF89a"
    if (buf.length < 6) return null;
    if (buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46) return null;
    let total = 0;
    let frames = 0;
    // Graphic Control Extension: 0x21 0xF9 0x04 ?? <delay-lo> <delay-hi>
    for (let i = 0; i < buf.length - 5; i++) {
      if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) {
        const delay = buf[i + 4] | (buf[i + 5] << 8); // 1/100s
        // delay 0 면 브라우저가 보통 100ms 로 처리. 평균값 추정.
        total += (delay > 0 ? delay : 10) * 10; // → ms
        frames++;
      }
    }
    if (frames === 0) return null;
    return total;
  } catch {
    return null;
  }
}
