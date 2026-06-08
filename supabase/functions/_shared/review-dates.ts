export interface ReviewEventDateRecord {
  published_at?: string | null;
  collected_at?: string | null;
  created_at?: string | null;
}

export interface ReviewWindow {
  start: Date;
  end: Date;
}

export function buildReviewWindow(reportDate?: string): ReviewWindow {
  if (reportDate) {
    const end = new Date(`${reportDate}T04:00:00.000Z`);
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end };
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

export function parseReviewTimestamp(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getReviewEventDate(review: ReviewEventDateRecord): Date | null {
  return (
    parseReviewTimestamp(review.published_at) ??
    parseReviewTimestamp(review.collected_at) ??
    parseReviewTimestamp(review.created_at)
  );
}

export function getReviewEventTimestamp(review: ReviewEventDateRecord): number {
  return getReviewEventDate(review)?.getTime() ?? 0;
}

export function isReviewInWindow(
  review: ReviewEventDateRecord,
  window: ReviewWindow,
): boolean {
  const eventDate = getReviewEventDate(review);
  if (!eventDate) return false;
  return eventDate >= window.start && eventDate < window.end;
}

export function filterReviewsInWindow<T extends ReviewEventDateRecord>(
  reviews: T[],
  window: ReviewWindow,
): T[] {
  return reviews.filter((review) => isReviewInWindow(review, window));
}

export function isReviewOlderThanDays(
  publishedAt: string,
  maxAgeDays: number,
  now = new Date(),
): boolean {
  const reviewDate = parseReviewTimestamp(publishedAt);
  if (!reviewDate) return true;

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return now.getTime() - reviewDate.getTime() > maxAgeMs;
}
