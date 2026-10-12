/* ReadyWell screener engine. Content and scoring live in window.CFG (index.html). */
(function () {
  var C = window.CFG;
  var OFFICE_EMAIL = ["office", "readywellpsych.com"].join("@");
  var CC_EMAIL = ["moshe", "agentmail.to"].join("@");
  var FU = "Follow up, not scored";
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var ALL = []; // every rated item: {id, text, sec, opts}
  function optsFor(sec, it) { return it.opts || sec.opts || (sec.type === "yn" ? [{ v: 1, l: "Yes" }, { v: 0, l: "No" }] : []); }

  function build() {
    var h = '';
    h += '<header><div class="brand"><img src="yb-crest.svg" alt="YB crest" /><div>';
    h += '<div class="clinic">ReadyWell · Yuriy Bortnik, PMHNP</div><h1>' + esc(C.short) + '</h1><p class="sub">' + esc(C.sub) + '</p></div></div></header><main>';
    if (C.clinician) h += '<p class="clin-only">For clinician use only. Not for self-report.</p>';
    if (C.custom) h += '<p class="custom-flag">' + esc(C.custom) + '</p>';
    if (C.intro) h += '<div class="card note">' + C.intro + '</div>';
    h += '<form id="scr" autocomplete="off" onsubmit="return false">';
    h += '<div class="card"><h2>' + esc(C.whoTitle || "Patient") + '</h2><div class="grid-2">';
    h += '<div><label class="field" for="initials">' + esc(C.initialsLabel || "Patient initials (required)") + '</label><input id="initials" name="initials" type="text" maxlength="12" placeholder="e.g. Y.B." /></div>';
    h += '<div><label class="field" for="date">Date</label><input id="date" name="date" type="date" /></div>';
    (C.fields || []).forEach(function (f) {
      h += '<div><label class="field" for="' + f.id + '">' + esc(f.label) + '</label>';
      if (f.type === "select") {
        h += '<select id="' + f.id + '" name="' + f.id + '"><option value="">Choose</option>' + f.options.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join("") + '</select>';
      } else h += '<input id="' + f.id + '" name="' + f.id + '" type="' + (f.type || "text") + '" />';
      h += '</div>';
    });
    h += '</div></div>';
    (C.sections || []).forEach(function (s) {
      h += '<div class="card sec" data-sec="' + s.id + '"' + (s.variant ? ' data-variant="' + esc(s.variant) + '"' : '') + '>';
      if (s.red) h += '<p class="clin-only">' + esc(s.red) + '</p>';
      h += '<h2>' + esc(s.title) + '</h2>';
      if (s.note) h += '<p class="hint">' + s.note + '</p>';
      if (s.type === "text") {
        s.items.forEach(function (it) {
          h += '<label class="field" for="' + it.id + '">' + esc(it.text) + '</label><textarea id="' + it.id + '" name="' + it.id + '"></textarea>';
        });
      } else if (s.type === "check") {
        h += '<div class="scale">';
        s.items.forEach(function (it) {
          h += '<label><input type="checkbox" id="' + it.id + '" data-check="1" /><span>' + esc(it.text) + '</span></label>';
        });
        h += '</div>';
      } else {
        s.items.forEach(function (it) {
          var o = optsFor(s, it);
          ALL.push({ id: it.id, text: it.text, num: it.num, sec: s, opts: o });
          h += '<div class="item" id="wrap_' + it.id + '"><p><span class="code">' + esc(it.num || "") + '</span> ' + esc(it.text) + '</p>';
          if (it.ex) h += '<p class="hint">' + esc(it.ex) + '</p>';
          h += '<div class="scale">';
          o.forEach(function (op) {
            h += '<label><input type="radio" name="' + it.id + '" value="' + esc(op.v) + '" /><span>' + (op.show === false ? '' : '<b>' + esc(op.n !== undefined ? op.n : op.v) + '</b> ') + esc(op.l) + '</span></label>';
          });
          h += '</div><p class="fu" id="fu_' + it.id + '"></p></div>';
        });
      }
      h += '</div>';
    });
    h += '<div class="card totals"><h2>Scoring</h2>';
    if (C.scoreRed) h += '<p class="clin-only">' + esc(C.scoreRed) + '</p>';
    h += '<div id="scoreRows"></div><div id="flags"></div><div id="missing" class="incomplete"></div>';
    h += (C.scoringHint || "") + '</div>';
    h += '<div class="actions sticky"><button type="button" id="scoreBtn">Score and Submit</button>';
    h += '<button type="button" class="secondary" id="copyBtn">Copy summary</button>';
    h += '<button type="button" class="secondary" id="printBtn">Print / save as PDF</button></div>';
    h += '<p class="hint">Sends to the office once. Copy and Print do not email.</p>';
    h += '<p id="copyStatus" role="status"></p></form>';
    h += '<div class="card" id="results"><h2>Summary</h2><textarea id="summaryBox" readonly></textarea></div>';
    h += '</main><footer>' + esc(C.footer || (C.short + " · ReadyWell")) + '</footer>';
    document.body.insertAdjacentHTML("afterbegin", h);
  }

  function variant() { return C.variantField ? ($(C.variantField).value || "") : ""; }
  function active(it) { var v = it.sec.variant; return !v || v === variant(); }
  function ans() {
    var a = {};
    ALL.forEach(function (it) {
      if (!active(it)) return;
      var r = document.querySelector('input[name="' + it.id + '"]:checked');
      if (!r) { a[it.id] = null; return; }
      var op = it.opts.filter(function (o) { return String(o.v) === r.value; })[0];
      a[it.id] = (op && op.v !== null && op.v !== "" && !op.unclear) ? op.v : null;
      if (op && op.unclear) a[it.id] = null;
    });
    return a;
  }
  function labelOf(it) {
    var r = document.querySelector('input[name="' + it.id + '"]:checked');
    if (!r) return null;
    var op = it.opts.filter(function (o) { return String(o.v) === r.value; })[0];
    return op ? op.l : r.value;
  }
  // helpers exposed to configs
  var H = {
    ids: function (pfx, a, b) { var o = []; for (var i = a; i <= b; i++) o.push(pfx + i); return o; },
    missing: function (A, ids) { return ids.filter(function (k) { return A[k] === null || A[k] === undefined; }); },
    sum: function (A, ids) { var m = H.missing(A, ids); if (m.length) return null; return ids.reduce(function (s, k) { return s + Number(A[k]); }, 0); },
    count: function (A, ids, f) { return ids.filter(function (k) { return A[k] !== null && A[k] !== undefined && f(Number(A[k])); }).length; },
    known: function (A, ids) { return ids.filter(function (k) { return A[k] !== null && A[k] !== undefined; }); }
  };
  window.SCR_H = H;

  function compute() {
    var A = ans();
    var r = C.score(A, H, variant()) || {};
    r.A = A;
    r.blank = ALL.filter(function (it) { return active(it) && A[it.id] === null && !(it.sec.optional); }).map(function (it) { return it; });
    return r;
  }
  function render() {
    var r = compute();
    document.querySelectorAll(".sec[data-variant]").forEach(function (el) { el.style.display = el.getAttribute("data-variant") === variant() ? "" : "none"; });
    ALL.forEach(function (it) { var f = $("fu_" + it.id); if (f) f.textContent = ""; });
    $("scoreRows").innerHTML = (r.rows || []).map(function (x) { return '<div class="score-row"><span>' + esc(x[0]) + '</span><strong>' + esc(x[1]) + '</strong></div>'; }).join("");
    $("flags").innerHTML = (r.flags || []).map(function (f) { return '<div class="flag">' + esc(f) + '</div>'; }).join("");
    var m = $("missing");
    var bl = r.blank.map(function (it) { return it.num || it.id; });
    m.style.display = bl.length ? "block" : "none";
    m.textContent = bl.length ? FU + ": items " + bl.join(", ") + (r.incomplete ? ". Incomplete, not scored where a total needs every item." : ".") : "";
    return r;
  }
  function val(id) { var e = $(id); return e ? e.value.trim() : ""; }
  function buildSummary(r) {
    var L = [];
    L.push(C.short + " | " + C.sub);
    if (C.custom) L.push(C.custom);
    L.push("Initials: " + val("initials") + "   Date: " + (val("date") || "not entered"));
    (C.fields || []).forEach(function (f) { L.push(f.label + ": " + (val(f.id) || "-")); });
    L.push("");
    var lastSec = null;
    ALL.forEach(function (it) {
      if (!active(it)) return;
      if (it.sec !== lastSec) { L.push("[" + it.sec.title + "]"); lastSec = it.sec; }
      var a = r.A[it.id], lb = labelOf(it);
      L.push((it.num || it.id) + ". " + it.text + ": " + (a === null ? (lb ? lb + " (" + FU + ")" : FU) : lb + " (" + a + ")"));
    });
    (C.sections || []).forEach(function (s) {
      if (s.variant && s.variant !== variant()) return;
      if (s.type === "text") s.items.forEach(function (it) { L.push(it.text + ": " + (val(it.id) || "-")); });
      if (s.type === "check") L.push(s.title + ": " + (s.items.filter(function (it) { return $(it.id).checked; }).map(function (it) { return it.text; }).join(", ") || "none checked"));
    });
    L.push("");
    (r.rows || []).forEach(function (x) { L.push(x[0] + ": " + x[1]); });
    (r.flags || []).forEach(function (f) { L.push("FLAG: " + f); });
    if (r.blank.length) L.push(FU + ": items " + r.blank.map(function (it) { return it.num || it.id; }).join(", "));
    L.push("Status: " + (r.incomplete ? "INCOMPLETE, not scored where a total needs every item" : "complete"));
    return L.join("\n");
  }
  function score() {
    var r = render();
    window._sum = buildSummary(r); window._res = r;
    $("summaryBox").value = window._sum;
    $("results").classList.add("show");
    return r;
  }
  function copySummary() {
    score();
    var st = $("copyStatus");
    $("summaryBox").select();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(window._sum).then(function () { st.textContent = "Summary copied."; }, function () { st.textContent = "Select the box and copy (Ctrl+C or Cmd+C)."; });
    } else { var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} st.textContent = ok ? "Summary copied." : "Select the box and copy (Ctrl+C or Cmd+C)."; }
  }

  var SENT_KEY = C.slug + ".v1.sent";
  function isSent() {
    try { if (localStorage.getItem(SENT_KEY) === "1") return true; } catch (e) {}
    return document.cookie.split("; ").some(function (p) { return p === SENT_KEY + "=1"; });
  }
  function markSent() {
    try { localStorage.setItem(SENT_KEY, "1"); } catch (e) {}
    document.cookie = SENT_KEY + "=1;max-age=" + (60 * 60 * 24 * 14) + ";path=/;SameSite=Lax";
  }
  function showThanks() {
    var b = $("scoreBtn"); b.disabled = true; b.style.display = "none";
    var t = $("thanksBox");
    if (!t) {
      t = document.createElement("div"); t.id = "thanksBox"; t.setAttribute("role", "status");
      t.innerHTML = C.clinician
        ? "<strong>Thank you.</strong> This " + esc(C.short) + " was sent to the office. Use Reset to start a new one."
        : "<strong>Thank you.</strong> Your answers were sent to the office. You can close this page. Your clinician will review them with you.";
      var ac = document.querySelector(".actions"); ac.parentNode.insertBefore(t, ac);
    }
    $("copyStatus").textContent = "";
  }
  var sending = false;
  function sendOffice() {
    if (sending || isSent()) return;
    sending = true;
    var b = $("scoreBtn"), st = $("copyStatus"), r = window._res;
    var F = {
      _subject: "FOR REVIEW : " + C.short, _template: "box", _captcha: "false", _cc: CC_EMAIL,
      _url: "https://" + C.slug + ".yuriybortnik.com",
      initials: val("initials"), date: val("date")
    };
    (C.fields || []).forEach(function (f) { F[f.id] = val(f.id); });
    ALL.forEach(function (it) {
      if (!active(it)) return;
      var a = r.A[it.id], lb = labelOf(it);
      F["item_" + it.id] = it.text + ": " + (a === null ? (lb ? lb + " | " + FU : FU) : lb + " (" + a + ")");
    });
    (C.sections || []).forEach(function (s) {
      if (s.variant && s.variant !== variant()) return;
      if (s.type === "text") s.items.forEach(function (it) { F[it.id] = val(it.id); });
      if (s.type === "check") s.items.forEach(function (it) { F[it.id] = $(it.id).checked ? "checked" : "not checked"; });
    });
    (r.rows || []).forEach(function (x) { F["score_" + x[0].replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase()] = String(x[1]); });
    F.flags = (r.flags || []).join(" | ") || "none";
    F.follow_up_not_scored = r.blank.map(function (it) { return it.num || it.id; }).join(", ") || "none";
    F.status = r.incomplete ? "INCOMPLETE, not scored where a total needs every item" : "complete";
    F.message = window._sum;
    b.disabled = true; b.textContent = "Sending\u2026"; st.textContent = "";
    fetch("https://formsubmit.co/ajax/" + OFFICE_EMAIL, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(F)
    }).then(function (res) { return res.json(); }).then(function (d) {
      if (d && (d.success === true || d.success === "true")) { markSent(); showThanks(); } else throw new Error("not sent");
    }).catch(function () {
      sending = false; b.disabled = false; b.textContent = "Retry sending";
      st.textContent = "This did not send. Please check the connection and press Retry sending.";
    });
  }
  function scoreAndSubmit() {
    if (isSent()) { showThanks(); return; }
    if (sending) return;
    var st = $("copyStatus"), r = score();
    if (!val("initials")) { st.textContent = "Enter initials before submitting."; $("initials").focus(); return; }
    if (C.variantField && !variant()) { st.textContent = "Choose who is filling this out before submitting."; $(C.variantField).focus(); return; }
    if (C.clinician && r.incomplete) { st.textContent = "Incomplete, not scored. Rate every item before submitting."; $("missing").scrollIntoView({ block: "center" }); return; }
    if (r.blank.length && !window._blankOk) {
      window._blankOk = true;
      st.textContent = "Some items are blank (" + r.blank.map(function (it) { return it.num || it.id; }).join(", ") + "). They will be marked " + FU + ". Answer them, or press Score and Submit again to send as is.";
      return;
    }
    sendOffice();
  }
  build();
  document.addEventListener("change", function () { window._blankOk = false; render(); });
  $("scoreBtn").onclick = scoreAndSubmit;
  $("copyBtn").onclick = copySummary;
  $("printBtn").onclick = function () { score(); window.print(); };
  window.SCR = { render: render, score: score, isSent: isSent, showThanks: showThanks };
})();
