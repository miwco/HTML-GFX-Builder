import { useEffect, useMemo, useRef, useState } from 'react';
import { eventButtons, eventLegality, fieldDescriptors, type ControlMessage } from '../control/controlModel';
import {
  controlShowBySlug,
  hostedControlTail,
  sendHostedControl,
  stageHostedData,
  subscribeControlEvents,
  type ControlEventRow,
  type PanelGraphicSpec,
  type ResolvedControlShow,
} from '../control/hostedControl';
import { isBackendConfigured } from '../backend/config';
import { FieldControl } from './fields/FieldControl';

/**
 * The HOSTED control page (Phase 5). Reached at <app-url>?control=<slug> — no login, no
 * builder shell; the unguessable slug is the capability (the ?chat= pattern). One card per
 * graphic, generated from the show's panel spec: the machine's event buttons, the fields,
 * and the lifecycle row.
 *
 * Multi-operator by construction: staged edits go to the SHARED staging buffer (every open
 * page follows them), a take publishes them as an update command, and each graphic reports
 * what it actually applied — the live state every page's chip and button-greying read. All
 * of it rides the one durable log, so a refresh of any participant recovers: this page
 * re-reads the row, a rebooted graphic rebuilds from its own last report.
 */
export default function HostedControlPage({ slug }: { slug: string }) {
  const [show, setShow] = useState<ResolvedControlShow | null | 'loading'>('loading');
  const [error, setError] = useState<string | null>(null);
  const lastIdRef = useRef(0);

  useEffect(() => {
    if (!isBackendConfigured()) {
      setShow(null);
      return;
    }
    let live = true;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      const resolved = await controlShowBySlug(slug);
      if (!live) return;
      setShow(resolved);
      if (!resolved) return;
      // Follow the log: staged/live meta rows update the shared view; command rows from
      // other operators need no handling here (the graphic's own live report follows).
      const applyRow = (row: ControlEventRow) => {
        if (row.id <= lastIdRef.current) return;
        lastIdRef.current = row.id;
        const msg = row.msg;
        if (msg.t === 'staged') {
          setShow((s) => (s && s !== 'loading' ? { ...s, staged: { ...s.staged, [row.graphic]: msg.data } } : s));
        } else if (msg.t === 'live') {
          setShow((s) =>
            s && s !== 'loading' ? { ...s, live: { ...s.live, [row.graphic]: { data: msg.data, state: msg.state } } } : s,
          );
        }
      };
      unsubscribe = await subscribeControlEvents(resolved.id, (row) => {
        // A hole in the ids means missed rows — recover order from the log's tail.
        if (row.id > lastIdRef.current + 1) {
          void hostedControlTail(slug, lastIdRef.current).then((rows) => rows.forEach(applyRow));
        }
        applyRow(row);
      });
    })();
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [slug]);

  if (show === 'loading') {
    return (
      <div className="sendin">
        <div className="sendin-card"><p className="muted">Loading…</p></div>
      </div>
    );
  }
  if (!show) {
    return (
      <div className="sendin">
        <div className="sendin-card">
          <div className="sendin-title">Control page not found</div>
          <p className="muted">
            {isBackendConfigured()
              ? 'This link is invalid or the page was unpublished.'
              : 'Hosted control needs the cloud backend — this build runs offline.'}
          </p>
          {error && <p className="muted">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="hosted-control">
      <header className="hosted-header">
        <h1>{show.title}</h1>
        <span className="muted">hosted control</span>
      </header>
      <main>
        {show.panel.length === 0 && <p className="muted">This show has no graphics yet.</p>}
        {show.panel.map((g) => (
          <HostedGraphicCard
            key={g.name}
            slug={slug}
            spec={g}
            staged={show.staged[g.name] ?? {}}
            live={show.live[g.name]}
            onError={setError}
          />
        ))}
        {error && <p className="hosted-error">{error}</p>}
      </main>
    </div>
  );
}

function HostedGraphicCard({
  slug,
  spec,
  staged,
  live,
  onError,
}: {
  slug: string;
  spec: PanelGraphicSpec;
  staged: Record<string, string>;
  live: { data?: Record<string, string>; state?: { groups: Record<string, string> } | null } | undefined;
  onError: (message: string) => void;
}) {
  const descriptors = useMemo(() => fieldDescriptors(spec.fields), [spec.fields]);
  const events = useMemo(() => eventButtons(spec.js), [spec.js]);
  const legality = useMemo(() => eventLegality(spec.js), [spec.js]);
  const defaults = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of spec.fields) map[f.field] = f.value ?? '';
    return map;
  }, [spec.fields]);

  // What the operator sees while typing: a LOCAL echo (instant), reconciled with the shared
  // staging buffer as its rows arrive — an operator's own edits echo back identically, other
  // operators' edits merge in (last writer wins on the shared buffer, by design).
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...defaults,
    ...(live?.data ?? {}),
    ...staged,
  }));
  useEffect(() => {
    setValues((v) => ({ ...v, ...staged }));
  }, [staged]);

  // The value an operator sees: the local echo, then on-air, then the default.
  const valueOf = (key: string) => values[key] ?? live?.data?.[key] ?? defaults[key] ?? '';
  const stagedDirty = descriptors.some((d) => valueOf(d.key) !== (live?.data?.[d.key] ?? defaults[d.key]));

  // Debounced shared staging: edits batch per card, so a typing operator sends a few rows,
  // not one per keystroke (the send burst cap is for commands, not typing).
  const pendingRef = useRef<Record<string, string>>({});
  const stageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageSoon = (key: string, value: string) => {
    pendingRef.current[key] = value;
    if (stageTimer.current) clearTimeout(stageTimer.current);
    stageTimer.current = setTimeout(() => {
      const batch = pendingRef.current;
      pendingRef.current = {};
      void stageHostedData(slug, spec.name, batch);
    }, 400);
  };

  const state = live?.state ?? null;
  const stateLabel = state
    ? Object.entries(state.groups)
        .map(([gid, sid]) => (Object.keys(state.groups).length > 1 ? `${gid}: ${sid}` : sid))
        .join(' · ')
    : null;
  const legalNow = (event: string) => {
    if (!state) return true;
    const perGroup = legality[event];
    if (!perGroup) return false;
    return Object.entries(perGroup).some(([gid, froms]) => froms.includes(state.groups[gid]));
  };

  const send = (msg: ControlMessage) => {
    void sendHostedControl(slug, spec.name, msg).catch((e: Error) =>
      onError(/slow down/i.test(e.message) ? 'Too many commands — slow down a moment.' : `Send failed: ${e.message}`),
    );
  };
  const currentData = () => {
    const data: Record<string, string> = {};
    for (const d of descriptors) data[d.key] = valueOf(d.key);
    return data;
  };
  // Edits STAGE (shared, visible to every operator); nothing airs until an explicit take.
  const stage = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    stageSoon(key, value);
  };
  const take = () => send({ t: 'update', data: currentData() });
  const fire = (event: string, payloadKeys?: string[]) => {
    const payload: Record<string, string> = {};
    for (const key of payloadKeys ?? []) payload[key] = valueOf(key);
    send(payloadKeys?.length ? { t: 'event', event, payload } : { t: 'event', event });
  };

  const sections = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const name = e.section ?? 'Events';
      map.set(name, [...(map.get(name) ?? []), e]);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <div className="hosted-card">
      <h2>
        {spec.name}
        {stateLabel && <span className="hosted-state-chip">{stateLabel}</span>}
        {stagedDirty && <span className="hosted-staged-chip" title="Staged — not on air until you Take">● staged</span>}
      </h2>
      {sections.map(([section, btns]) => (
        <div key={section} className="hosted-events">
          <h3>{section}</h3>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {btns.map((e) => (
              <button
                key={e.event}
                disabled={!legalNow(e.event)}
                className={e.destructive ? 'ctl-event-destructive' : undefined}
                onClick={() => fire(e.event, e.payload)}
                title={`Fires "${e.event}" — only where the graph allows it`}
              >
                ⚡ {e.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {descriptors.map((d) => (
        <div key={d.key} className="field-row">
          <label>{d.label}</label>
          <FieldControl
            descriptor={d}
            value={valueOf(d.key)}
            onChange={(v: string | number) => stage(d.key, String(v))}
            images={spec.images.map((i) => ({ value: i.value }))}
          />
        </div>
      ))}
      <div className="ctl-actions">
        <button className="primary" onClick={() => { take(); send({ t: 'play' }); }}>▶ Play</button>
        <button onClick={() => send({ t: 'stop' })}>■ Stop</button>
        <button onClick={take} title="Take the staged values on air">⟳ Take</button>
        <button onClick={() => send({ t: 'next' })}>» Next</button>
      </div>
    </div>
  );
}
