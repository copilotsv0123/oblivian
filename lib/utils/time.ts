/**
 * Format seconds into MM:SS format
 * @param seconds - Number of seconds (can be float)
 * @returns Formatted time string like "12:05" or "0:48"
 */
export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}