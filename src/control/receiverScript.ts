// The tiny receiver injected into an exported graphic's index.html. It lets a standalone
// control panel (controlpanel.html, same browser + origin) drive the graphic live over a
// BroadcastChannel — useful when the graphic runs as an OBS/browser source and you operate
// it from another tab. It only ADDS a listener; SPX/CasparCG still call the same globals
// directly, so nothing conflicts. On a renderer without BroadcastChannel it does nothing.

export function controlReceiverScript(templateName: string, channelName: string): string {
  return `<script id="spx-control-receiver">
/* Control receiver — ${templateName}.
   A control panel on the same machine (controlpanel.html) posts messages here; we forward
   them to the graphic's own update()/play()/stop()/next() — and, when this graphic carries a
   state machine, 'event' and 'snap' to noacgDispatch()/noacgSnap() (the machine cues a
   generated control page sends). After every handled message the receiver answers with the
   machine state, and a lightweight watcher reports timer-driven changes too, so the panel's
   state chip stays honest. Remove this block to opt out. */
(function () {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    var ch = new BroadcastChannel('${channelName}');
    var lastSent = '';
    function reply(force) {
      if (typeof noacgMachineState !== 'function') return;
      try {
        var state = noacgMachineState();
        var key = JSON.stringify(state);
        if (!force && key === lastSent) return;
        lastSent = key;
        ch.postMessage({ t: 'state', state: state });
      } catch (e) { /* state unavailable — the panel just shows no chip */ }
    }
    ch.onmessage = function (ev) {
      var m = ev.data || {};
      if (m.t === 'update' && typeof update === 'function') update(JSON.stringify(m.data || {}));
      else if (m.t === 'play' && typeof play === 'function') play();
      else if (m.t === 'stop' && typeof stop === 'function') stop();
      else if (m.t === 'next' && typeof next === 'function') next();
      else if (m.t === 'event' && typeof noacgDispatch === 'function') noacgDispatch(m.event, m.payload);
      else if (m.t === 'snap' && typeof noacgSnap === 'function') noacgSnap(m.snap || null);
      reply(m.t === 'hello');
    };
    // Timers advance the machine with no message to answer — a cheap watcher reports those.
    if (typeof noacgMachineState === 'function') setInterval(function () { reply(false); }, 1000);
  } catch (e) { /* channel unavailable — the graphic still works, just not remotely driven */ }
})();
</script>`;
}
