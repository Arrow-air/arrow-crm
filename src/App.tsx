import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Member, MemberStatus, Touchpoint } from "./supabase";

// "Needs attention" ordering: new people first, then people drifting away.
const STATUS_ORDER: MemberStatus[] = ["new", "faded", "met", "introduced", "active"];
const STATUSES: MemberStatus[] = ["new", "met", "introduced", "active", "faded"];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <p className="center">Loading…</p>;
  if (!session) {
    return (
      <div className="center">
        <h1>Arrow CRM</h1>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: "github",
              options: { redirectTo: window.location.origin },
            })
          }
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }
  return <Crm onSignOut={() => supabase.auth.signOut()} />;
}

function Crm({ onSignOut }: { onSignOut: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from("members").select("*");
    if (err) {
      // Most common cause: signed in but not on the allowlist (RLS returns empty/denied).
      setError(err.message);
      return;
    }
    const sorted = (data as Member[]).sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        a.joined_at.localeCompare(b.joined_at),
    );
    setMembers(sorted);
    setError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="layout">
      <header>
        <h1>Arrow CRM</h1>
        <div>
          <AddMember onAdded={load} />
          <button onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      {error && (
        <p className="error">
          {error} — if you just signed in, you may not be on the allowlist yet.
        </p>
      )}
      <main>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Met by</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className={selected?.id === m.id ? "selected" : ""}
                onClick={() => setSelected(m)}
              >
                <td>{m.name}</td>
                <td>
                  <span className={`status status-${m.status}`}>{m.status}</span>
                </td>
                <td>{m.joined_at}</td>
                <td>{m.met_by ?? "—"}</td>
                <td>{m.projects.join(", ") || "—"}</td>
              </tr>
            ))}
            {members.length === 0 && !error && (
              <tr>
                <td colSpan={5}>No members yet — add the first one.</td>
              </tr>
            )}
          </tbody>
        </table>
        {selected && (
          <MemberDetail
            member={selected}
            onChanged={async () => {
              await load();
              const { data } = await supabase
                .from("members")
                .select("*")
                .eq("id", selected.id)
                .single();
              setSelected((data as Member) ?? null);
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  );
}

function AddMember({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [discordId, setDiscordId] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    await supabase.from("members").insert({
      name: name.trim(),
      discord_id: discordId.trim() || null,
    });
    setName("");
    setDiscordId("");
    setOpen(false);
    onAdded();
  };

  if (!open) return <button onClick={() => setOpen(true)}>Add member</button>;
  return (
    <span className="add-form">
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        placeholder="Discord ID (optional)"
        value={discordId}
        onChange={(e) => setDiscordId(e.target.value)}
      />
      <button onClick={submit}>Save</button>
      <button onClick={() => setOpen(false)}>Cancel</button>
    </span>
  );
}

function MemberDetail({
  member,
  onChanged,
  onClose,
}: {
  member: Member;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [note, setNote] = useState("");

  const loadTouchpoints = useCallback(async () => {
    const { data } = await supabase
      .from("touchpoints")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });
    setTouchpoints((data as Touchpoint[]) ?? []);
  }, [member.id]);

  useEffect(() => {
    loadTouchpoints();
  }, [loadTouchpoints]);

  const setStatus = async (status: MemberStatus) => {
    await supabase.from("members").update({ status }).eq("id", member.id);
    onChanged();
  };

  const addTouchpoint = async () => {
    if (!note.trim()) return;
    const { data } = await supabase.auth.getUser();
    const byName =
      (data.user?.user_metadata?.full_name as string | undefined) ??
      (data.user?.user_metadata?.name as string | undefined) ??
      "unknown";
    await supabase.from("touchpoints").insert({
      member_id: member.id,
      by_name: byName,
      note: note.trim(),
    });
    setNote("");
    loadTouchpoints();
  };

  return (
    <aside className="detail">
      <button className="close" onClick={onClose}>
        ×
      </button>
      <h2>{member.name}</h2>
      <p>
        Status:{" "}
        {STATUSES.map((s) => (
          <button
            key={s}
            className={member.status === s ? `status-btn active-btn` : "status-btn"}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </p>
      <h3>Touchpoints</h3>
      <div className="touchpoint-form">
        <input
          placeholder="Talked to them about…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTouchpoint()}
        />
        <button onClick={addTouchpoint}>Log</button>
      </div>
      <ul>
        {touchpoints.map((t) => (
          <li key={t.id}>
            <strong>{t.by_name}</strong> · {new Date(t.created_at).toLocaleDateString()}
            <br />
            {t.note}
          </li>
        ))}
        {touchpoints.length === 0 && <li>No touchpoints logged yet.</li>}
      </ul>
    </aside>
  );
}
