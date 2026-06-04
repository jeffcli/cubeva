import { RefreshCw, Search, UserPlus } from "lucide-react";
import type { SocialProfile } from "../data/database";
import { Button } from "./ui/button";

export function PeoplePage({
  people,
  loading,
  onFollow,
  onRefresh,
  onViewProfile,
}: {
  people: SocialProfile[];
  loading: boolean;
  onFollow: (person: SocialProfile) => void;
  onRefresh: () => void;
  onViewProfile: (person: SocialProfile) => void;
}) {
  return (
    <section
      className="grid gap-3 rounded-lg border border-line bg-card p-4 shadow-sm"
      id="people"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0">Find cubers</h3>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-[0.85rem] font-extrabold text-soft-muted">
              Loading
            </span>
          ) : (
            <Search size={18} />
          )}
          <Button
            size="sm"
            variant="secondary"
            type="button"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>
      {!loading && people.length === 0 && (
        <div className="grid gap-2 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
          <p className="m-0">No other profiles are visible yet.</p>
          <small className="font-medium text-muted">
            People shows rows from public.profiles. If you created users in
            Supabase Auth, run the profile backfill SQL once, then refresh.
          </small>
        </div>
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
          <Button
            aria-label={`Follow ${person.name}`}
            className={person.following ? "bg-green hover:bg-teal" : ""}
            size="icon"
            onClick={() => onFollow(person)}
            type="button"
          >
            <UserPlus size={16} />
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => onViewProfile(person)}
          >
            View
          </Button>
        </div>
      ))}
    </section>
  );
}
