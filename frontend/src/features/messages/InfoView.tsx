import { Link } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import type { Profile } from "../profile/types";

/**
 * The other one's card, from their name in the conversation: their MemoCat
 * profile, the search, and MemoCat itself, one tap each.
 */
export function InfoView({ partner, onBack, onSearch }: { partner: Profile | null; onBack: () => void; onSearch: () => void }) {
  const name = partner?.displayName ?? "…";
  return (
    <>
      <header className="msg-bar flex shrink-0 items-center gap-2 px-2 py-2">
        <button type="button" onClick={onBack} aria-label="Retour" className="grid h-10 w-10 place-items-center rounded-full press">
          <Icon name="chevronLeft" size={22} />
        </button>
        <h1 className="text-[15px] font-bold">Infos</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-4 pt-8">
        {partner && <Avatar name={partner.displayName} size={96} assetId={partner.avatarAssetId} framing={partner.avatarFraming} />}
        <h2 className="mt-3 text-[22px] font-bold tracking-tight">{name}</h2>
        <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2.5">
          {partner && <Action to={`/profile/${partner.userId}`} icon="user" label="Son profil" />}
          <button type="button" onClick={onSearch} className="msg-field flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-xs font-semibold press">
            <Icon name="search" size={21} className="text-primary" />
            Rechercher
          </button>
          <Action to="/" icon="home" label="MemoCat" />
        </div>
      </div>
    </>
  );
}

function Action({ to, icon, label }: { to: string; icon: "user" | "home"; label: string }) {
  return (
    <Link to={to} className="msg-field flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-xs font-semibold press">
      <Icon name={icon} size={21} className="text-primary" />
      {label}
    </Link>
  );
}
