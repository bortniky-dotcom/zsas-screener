(function () {
  var STORE = "zsas.v1";

  function collect() {
    var data = { fields: {}, radios: {} };
    document.querySelectorAll("input[id], select[id], textarea[id]").forEach(function (el) {
      data.fields[el.id] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value;
    });
    document.querySelectorAll("input[type=radio]:checked").forEach(function (el) {
      data.radios[el.name] = el.value;
    });
    return data;
  }
  function apply(data) {
    if (!data) return;
    Object.keys(data.fields || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.type === "checkbox") el.checked = data.fields[id] === "1";
      else if (el) el.value = data.fields[id];
    });
    Object.keys(data.radios || {}).forEach(function (name) {
      var sel = 'input[type=radio][name="' + name + '"][value="' + String(data.radios[name]).replace(/"/g, "") + '"]';
      var el = document.querySelector(sel);
      if (el) el.checked = true;
    });
  }
  function save() {
    var payload = JSON.stringify(collect());
    try { localStorage.setItem(STORE, payload); } catch (e) {}
    document.cookie = STORE + "=" + encodeURIComponent(payload) + ";max-age=" + (60 * 60 * 24 * 14) + ";path=/;SameSite=Lax";
  }
  function load() {
    var raw = "";
    try { raw = localStorage.getItem(STORE) || ""; } catch (e) {}
    if (!raw) {
      var hit = document.cookie.split("; ").find(function (p) { return p.indexOf(STORE + "=") === 0; });
      raw = hit ? decodeURIComponent(hit.slice(STORE.length + 1)) : "";
    }
    if (!raw) return;
    try { apply(JSON.parse(raw)); } catch (e) {}
  }
  function clearStore() {
    try { localStorage.removeItem(STORE); } catch (e) {}
    document.cookie = STORE + "=;max-age=0;path=/;SameSite=Lax";
    try { localStorage.removeItem(STORE + ".sent"); } catch (e) {}
    document.cookie = STORE + ".sent=;max-age=0;path=/;SameSite=Lax";
  }

  var actions = document.querySelector(".actions");
  if (actions && !document.getElementById("resetBtn")) {
    var reset = document.createElement("button");
    reset.type = "button";
    reset.id = "resetBtn";
    reset.className = "secondary";
    reset.textContent = "Reset";
    reset.onclick = function () {
      if (!confirm("Erase this screener on this phone and start over?")) return;
      clearStore();
      location.reload();
    };
    actions.appendChild(reset);
  }

  load();
  document.addEventListener("change", save);
  document.addEventListener("input", save);
})();
