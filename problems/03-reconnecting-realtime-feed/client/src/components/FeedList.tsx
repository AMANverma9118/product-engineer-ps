import type { IncidentUpdate } from "../types/update.ts";

type FeedListProps = {
  updates: IncidentUpdate[];
};

export function FeedList({ updates }: FeedListProps) {
  if (updates.length === 0) {
    return <p className="empty">No updates yet.</p>;
  }

  return (
    <ol className="feed">
      {updates.map((update) => (
        <li key={update.updateId}>
          <span className="seq">#{update.sequence}</span>
          <span className="message">{update.message}</span>
        </li>
      ))}
    </ol>
  );
}
