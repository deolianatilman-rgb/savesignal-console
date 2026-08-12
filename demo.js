(function () {
  "use strict";

  var field = document.getElementById("meshField");
  var nodesLayer = document.getElementById("meshNodes");
  var svg = document.getElementById("meshLines");
  var sendBtn = document.getElementById("sendSosBtn");
  var resetBtn = document.getElementById("resetBtn");
  var statusLine = document.getElementById("statusLine");
  var logEl = document.getElementById("relayLog");

  if (!field) return; // demo panel not on this page

  var RELAY_TYPES = ["Dog Collar", "Phone", "Wearable"];
  var RELAY_COUNT = 9;
  var MIN_DIST_PCT = 16; // minimum spacing between nodes, in % of field
  var BLE_RANGE_PCT = 26; // "short range" edge threshold
  var LORA_PENALTY = 1.9; // long-range hops cost more, so BLE hops are preferred

  var nodes = [];
  var isAnimating = false;

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function buildNodes() {
    nodes = [];

    nodes.push({
      id: "base",
      role: "base",
      label: "Base Station",
      x: 88,
      y: 16,
      offline: false,
    });

    nodes.push({
      id: "victim",
      role: "victim",
      label: "Victim SOS",
      x: randBetween(8, 24),
      y: randBetween(58, 84),
      offline: false,
    });

    var typeBag = [];
    for (var b = 0; b < RELAY_COUNT; b++) typeBag.push(RELAY_TYPES[b % RELAY_TYPES.length]);
    for (var s = typeBag.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = typeBag[s]; typeBag[s] = typeBag[j]; typeBag[j] = tmp;
    }

    var typeCounts = { "Dog Collar": 0, "Phone": 0, "Wearable": 0 };
    for (var i = 0; i < RELAY_COUNT; i++) {
      var type = typeBag[i];
      var placed = false;
      var candidate = null;
      for (var attempt = 0; attempt < 60 && !placed; attempt++) {
        candidate = { x: randBetween(14, 92), y: randBetween(12, 90) };
        var tooClose = nodes.some(function (n) {
          return dist(n, candidate) < MIN_DIST_PCT;
        });
        if (!tooClose) placed = true;
      }
      typeCounts[type]++;
      nodes.push({
        id: "relay-" + i,
        role: "relay",
        label: type + " #" + typeCounts[type],
        x: candidate.x,
        y: candidate.y,
        offline: false,
      });
    }
  }

  function renderNodes() {
    nodesLayer.innerHTML = "";
    nodes.forEach(function (n) {
      var el = document.createElement("div");
      el.className = "demo-node is-" + n.role;
      el.style.left = n.x + "%";
      el.style.top = n.y + "%";
      el.dataset.id = n.id;

      var dot = document.createElement("div");
      dot.className = "demo-node-dot";
      dot.style.position = "relative";

      var label = document.createElement("div");
      label.className = "demo-node-label";
      label.textContent = n.label;

      el.appendChild(dot);
      el.appendChild(label);

      if (n.role === "relay") {
        var xMark = document.createElement("div");
        xMark.className = "demo-offline-x";
        xMark.textContent = "";
        dot.appendChild(xMark);

        el.addEventListener("click", function () {
          if (isAnimating) return;
          n.offline = !n.offline;
          el.classList.toggle("is-offline", n.offline);
          xMark.textContent = n.offline ? "×" : "";
          statusLine.textContent = n.offline
            ? n.label + " marked offline. Resend to see it reroute."
            : n.label + " is back online.";
        });
      }

      n.el = el;
      nodesLayer.appendChild(el);
    });
  }

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function drawBackgroundLinks() {
    clearSvg();
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");

    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        if (dist(a, b) <= BLE_RANGE_PCT) {
          addLine(a, b, "demo-link");
        }
      }
    }
  }

  function addLine(a, b, cls) {
    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", cls);
    line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(line);
    return line;
  }

  // Dijkstra over the online-node graph. BLE-range edges are cheap;
  // longer LoRa hops are allowed but penalized, so short relays are preferred.
  function findRoute() {
    var online = nodes.filter(function (n) { return !n.offline; });
    var victim = online.find(function (n) { return n.role === "victim"; });
    var base = online.find(function (n) { return n.role === "base"; });
    if (!victim || !base) return null;

    var dists = {}, prev = {}, visited = {};
    online.forEach(function (n) { dists[n.id] = Infinity; });
    dists[victim.id] = 0;

    while (true) {
      var current = null, currentDist = Infinity;
      online.forEach(function (n) {
        if (!visited[n.id] && dists[n.id] < currentDist) {
          current = n;
          currentDist = dists[n.id];
        }
      });
      if (!current) break;
      if (current.id === base.id) break;
      visited[current.id] = true;

      online.forEach(function (other) {
        if (visited[other.id] || other.id === current.id) return;
        var d = dist(current, other);
        var weight = d <= BLE_RANGE_PCT ? d : d * LORA_PENALTY;
        var alt = dists[current.id] + weight;
        if (alt < dists[other.id]) {
          dists[other.id] = alt;
          prev[other.id] = current.id;
        }
      });
    }

    if (dists[base.id] === undefined || dists[base.id] === Infinity) return null;

    var path = [base.id];
    var walk = base.id;
    while (walk !== victim.id) {
      walk = prev[walk];
      if (!walk) return null;
      path.unshift(walk);
    }
    return path.map(function (id) {
      return nodes.find(function (n) { return n.id === id; });
    });
  }

  function logMessage(html, cls) {
    var p = document.createElement("p");
    p.className = "demo-log-entry" + (cls ? " " + cls : "");
    p.innerHTML = html;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog() {
    logEl.innerHTML = "";
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function resetNodeVisualState() {
    nodes.forEach(function (n) {
      if (n.el) n.el.classList.remove("is-active", "is-delivered");
    });
  }

  async function sendSOS() {
    if (isAnimating) return;

    var route = findRoute();
    drawBackgroundLinks();
    resetNodeVisualState();
    clearLog();

    if (!route) {
      statusLine.textContent = "No path available — too many devices offline.";
      logMessage('<span class="text-alert">✕ No route found.</span> <span class="text-txt-secondary">The mesh is too fragmented — bring a device back online.</span>');
      return;
    }

    isAnimating = true;
    sendBtn.disabled = true;
    sendBtn.classList.add("opacity-60", "cursor-not-allowed");
    statusLine.textContent = "Transmitting SOS signal…";

    logMessage('<span class="text-amber-700">SOS initiated at ' + route[0].label + '</span>');
    route[0].el.classList.add("is-active");

    for (var i = 0; i < route.length - 1; i++) {
      var a = route[i];
      var b = route[i + 1];
      await sleep(550);

      var activeLine = addLine(a, b, "demo-link-active");
      b.el.classList.add("is-active");
      statusLine.textContent = "Relaying: " + a.label + " → " + b.label + "…";

      await sleep(650);

      activeLine.setAttribute("class", "demo-link-done");
      a.el.classList.remove("is-active");

      var isFinal = i === route.length - 2;
      if (isFinal) {
        b.el.classList.add("is-delivered");
        logMessage('<span class="text-teal-700">' + a.label + " → " + b.label + " ✓ Delivered</span>");
      } else {
        logMessage('<span class="text-teal-700">' + a.label + " → " + b.label + " relayed</span>");
      }
    }

    var fullPath = route.map(function (n) { return n.label; }).join(" → ");
    logMessage('<span class="text-txt-secondary">Full path: ' + fullPath + "</span>", "pt-1 border-t border-slate-line mt-1");

    statusLine.textContent = "Delivered to Base Station in " + (route.length - 1) + " hop" + (route.length - 1 === 1 ? "" : "s") + ".";

    isAnimating = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove("opacity-60", "cursor-not-allowed");
  }

  function resetAll() {
    if (isAnimating) return;
    buildNodes();
    renderNodes();
    drawBackgroundLinks();
    resetNodeVisualState();
    clearLog();
    logMessage('<span class="text-txt-secondary">No signal sent yet. Press "Send SOS Signal" to begin.</span>');
    statusLine.textContent = "Ready to transmit.";
  }

  sendBtn.addEventListener("click", sendSOS);
  resetBtn.addEventListener("click", resetAll);
  window.addEventListener("resize", drawBackgroundLinks);

  buildNodes();
  renderNodes();
  drawBackgroundLinks();
})();
