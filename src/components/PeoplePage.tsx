import { Search, UserPlus } from "lucide-react";
import type { SocialProfile } from "../data/database";

export function PeoplePage({
  people,
  loading,
  onFollow,
  onViewProfile,
}: {
  people: SocialProfile[];
  loading: boolean;
  onFollow: (person: SocialProfile) => void;
  onViewProfile: (person: SocialProfile) => void;
}) {
  return (
    <section
      className="grid gap-3 rounded-lg border border-line bg-card p-4 shadow-[0_18px_45px_rgba(29,35,32,0.08)]"
      id="people"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0">Find cubers</h3>
        {loading ? (
          <span className="text-[0.85rem] font-extrabold text-soft-muted">
            Loading
          </span>
        ) : (
          <Search size={18} />
        )}
      </div>
      {!loading && people.length === 0 && (
        <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
          No other profiles yet. Create another account to test follows.
        </p>
      )}
      {people.map((person) => (
        <div
          className="flex items-center gap-3 border-t border-rule pt-3 [&_small]:block [&_strong]:block"
          key={person.id}
        >
          <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-teal font-black text-white">
            {person.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <strong>{person.name}</strong>
            <small className="text-soft-muted">
              {person.handle} · {person.average}
            </small>
          </div>
          <button
            aria-label={`Follow ${person.name}`}
            className={`h-[38px] w-[38px] p-0 text-white ${
              person.following ? "bg-green" : "bg-ink"
            }`}
            onClick={() => onFollow(person)}
            type="button"
          >
            <UserPlus size={16} />
          </button>
          <button
            className="h-[38px] w-auto bg-panel px-3 text-ink"
            type="button"
            onClick={() => onViewProfile(person)}
          >
            View
          </button>
        </div>
      ))}
    </section>
  );
}
