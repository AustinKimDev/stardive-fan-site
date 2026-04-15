/**
 * 날짜를 한국어 형식으로 포매팅합니다.
 * e.g. 2026-04-15 → 2026년 4월 15일
 */
export function formatDateKo(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * ISO 날짜 문자열을 YYYY-MM-DD 형식으로 반환합니다.
 */
export function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
