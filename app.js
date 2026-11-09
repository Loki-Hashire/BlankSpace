// ============================================================
// app.js — what your site DOES.
// Plain JavaScript, no libraries, no installs.
// It uses STARTUP and LISTINGS from data.js (loaded first).
// ============================================================

(function () {
  "use strict";

  // ----------------------------------------------------------
  // 1. Saving things in the browser (localStorage).
  //    This only remembers things on THIS browser on THIS device.
  //    Your teammates and your customers will NOT see it.
  //    A real product would need a server and a database for that.
  // ----------------------------------------------------------
  const storage = {
    get: function (key, fallback) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
      } catch (error) {
        return fallback; // storage blocked or broken: just carry on
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // storage blocked (e.g. private window): ignore
      }
    }
  };

  let savedIds = storage.get("savedIds", []);

  const defaultFlowState = {
    arrowheads: 1,
    nodes: [
      { id: "idea", text: "Start with an idea", color: "#c85338", x: 0.06, y: 0.13 },
      { id: "test", text: "See if it works", color: "#45836a", x: 0.41, y: 0.43 },
      { id: "outcome", text: "Do something with it", color: "#2f5bea", x: 0.76, y: 0.13 },
      { id: "arrange", text: "Arrange the pieces", color: "#b700ff", x: 0.41, y: 0.75 }
    ],
    connections: [
      { from: "idea", to: "test", arrowheads: 1 },
      { from: "idea", to: "arrange", arrowheads: 0 },
      { from: "test", to: "arrange", arrowheads: 2 },
      { from: "test", to: "outcome", arrowheads: 1 }
    ]
  };

  function loadFlowState() {
    const saved = storage.get("flowDiagram", null);
    if (!saved || !Array.isArray(saved.nodes) || !Array.isArray(saved.connections)) {
      return defaultFlowState;
    }

    const nodes = saved.nodes.filter(function (node) {
      return node && typeof node.id === "string" && typeof node.text === "string" &&
        /^#[\da-f]{6}$/i.test(node.color) && Number.isFinite(node.x) && Number.isFinite(node.y);
    });
    const nodeIds = new Set(nodes.map(function (node) { return node.id; }));
    const savedArrowheads = [0, 1, 2].indexOf(saved.arrowheads) !== -1 ? saved.arrowheads : 1;
    const connections = saved.connections.filter(function (connection) {
      return connection && nodeIds.has(connection.from) && nodeIds.has(connection.to) &&
        connection.from !== connection.to;
    }).map(function (connection) {
      return {
        from: connection.from,
        to: connection.to,
        arrowheads: [0, 1, 2].indexOf(connection.arrowheads) !== -1
          ? connection.arrowheads
          : savedArrowheads
      };
    });
    return { nodes: nodes, connections: connections, arrowheads: savedArrowheads };
  }

  let flowState = loadFlowState();
  let selectedNodeId = null;
  let isConnecting = false;
  let isDisconnecting = false;
  let pendingConnectionId = null;

  // ----------------------------------------------------------
  // 2. Put the startup's name and pitch on the page.
  // ----------------------------------------------------------
  document.title = STARTUP.name;
  document.getElementById("brand-name").textContent = STARTUP.name;
  document.getElementById("tagline").textContent = STARTUP.tagline;
  document.getElementById("pitch").textContent = STARTUP.pitch;

  function initializeAds(view) {
    if (!/^ca-pub-\d+$/.test(AD_CONFIG.client)) return;

    const placements = view.querySelectorAll(".ad-slot[data-ad-index]");
    const configuredPlacements = Array.prototype.filter.call(placements, function (placement) {
      const slotId = AD_CONFIG.slotIds[Number(placement.dataset.adIndex) - 1];
      return /^\d+$/.test(slotId || "") && placement.dataset.adInitialized !== "true";
    });
    if (configuredPlacements.length === 0) return;

    if (!document.querySelector("script[data-adsense-script]")) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.adsenseScript = "true";
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(AD_CONFIG.client);
      document.head.appendChild(script);
    }

    configuredPlacements.forEach(function (placement) {
      const slotId = AD_CONFIG.slotIds[Number(placement.dataset.adIndex) - 1];
      const ad = document.createElement("ins");
      ad.className = "adsbygoogle";
      ad.style.display = "block";
      ad.dataset.adClient = AD_CONFIG.client;
      ad.dataset.adSlot = slotId;
      ad.dataset.adFormat = "auto";
      ad.dataset.fullWidthResponsive = "true";
      placement.replaceChildren(ad);
      placement.dataset.adInitialized = "true";
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  const flowCanvas = document.getElementById("flow-canvas");
  const flowNodes = document.getElementById("flow-nodes");
  const flowConnections = document.getElementById("flow-connections");
  const addTextBoxButton = document.getElementById("add-text-box");
  const connectBoxesButton = document.getElementById("connect-boxes");
  const disconnectBoxesButton = document.getElementById("disconnect-boxes");
  const boxColorInput = document.getElementById("box-color");
  const deleteTextBoxButton = document.getElementById("delete-text-box");
  const connectionArrowheads = document.getElementById("connection-arrowheads");
  const flowStatus = document.getElementById("flow-status");
  const timelineBoard = document.getElementById("timeline-board");
  const timelineColumns = document.getElementById("timeline-columns");
  const timelineAlignmentBars = document.getElementById("timeline-alignment-bars");
  const timelineStatus = document.getElementById("timeline-status");
  const defaultTimelineState = {
    columns: [
      { id: "phase-1", title: "Phase 1", markers: [] },
      { id: "phase-2", title: "Phase 2", markers: [] },
      { id: "phase-3", title: "Phase 3", markers: [] }
    ],
    alignmentBars: []
  };

  function loadTimelineState() {
    const saved = storage.get("timelineBoard", null);
    if (!saved || !Array.isArray(saved.columns)) return defaultTimelineState;

    const columns = saved.columns.filter(function (column) {
      return column && typeof column.id === "string" && typeof column.title === "string" &&
        Array.isArray(column.markers);
    }).map(function (column) {
      return {
        id: column.id,
        title: column.title.slice(0, 40),
        markers: column.markers.filter(function (marker) {
          return marker && typeof marker.id === "string" && typeof marker.text === "string" &&
            /^#[\da-f]{6}$/i.test(marker.color);
        }).map(function (marker) {
          return { id: marker.id, text: marker.text.slice(0, 100), color: marker.color };
        })
      };
    });
    const columnIds = new Set(columns.map(function (column) { return column.id; }));
    const alignmentBars = Array.isArray(saved.alignmentBars)
      ? saved.alignmentBars.filter(function (bar) {
        return bar && typeof bar.id === "string" && typeof bar.label === "string" && Array.isArray(bar.markers);
      }).map(function (bar) {
        return {
          id: bar.id,
          label: bar.label.slice(0, 40),
          markers: bar.markers.filter(function (marker) {
            return marker && typeof marker.id === "string" && columnIds.has(marker.columnId) &&
              typeof marker.text === "string" && /^#[\da-f]{6}$/i.test(marker.color);
          }).map(function (marker) {
            return {
              id: marker.id,
              columnId: marker.columnId,
              text: marker.text.slice(0, 100),
              color: marker.color
            };
          })
        };
      })
      : [];
    return {
      columns: columns,
      alignmentBars: alignmentBars
    };
  }

  let timelineState = loadTimelineState();

  function updateTimelineStatus() {
    const markerCount = timelineState.columns.reduce(function (total, column) {
      return total + column.markers.length;
    }, 0) + timelineState.alignmentBars.reduce(function (total, bar) {
      return total + bar.markers.length;
    }, 0);
    timelineStatus.textContent = timelineState.columns.length + " columns | " +
      timelineState.alignmentBars.length + " alignment bars | " + markerCount + " markers";
  }

  function saveTimelineState() {
    storage.set("timelineBoard", timelineState);
    updateTimelineStatus();
  }

  function makeTimelineMarkerElement(marker, deleteMarker) {
    const markerElement = document.createElement("article");
    markerElement.className = "timeline-marker";
    markerElement.dataset.markerId = marker.id;
    markerElement.style.setProperty("--marker-color", marker.color);

    const markerText = document.createElement("textarea");
    markerText.className = "timeline-marker__text";
    markerText.maxLength = 100;
    markerText.value = marker.text;
    markerText.setAttribute("aria-label", "Marker text");
    markerText.addEventListener("input", function () {
      marker.text = markerText.value;
      saveTimelineState();
    });
    const controls = document.createElement("div");
    controls.className = "timeline-marker__controls";
    const colorLabel = document.createElement("label");
    colorLabel.className = "timeline-marker__color";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = marker.color;
    colorInput.setAttribute("aria-label", "Marker color");
    colorInput.addEventListener("input", function () {
      marker.color = colorInput.value;
      markerElement.style.setProperty("--marker-color", marker.color);
      saveTimelineState();
    });
    colorLabel.appendChild(colorInput);

    const deleteButton = document.createElement("button");
    deleteButton.className = "timeline-marker__delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", deleteMarker);
    controls.append(colorLabel, deleteButton);
    markerElement.append(markerText, controls);
    return markerElement;
  }

  function createAlignedTimelineMarker(bar, column) {
    const marker = {
      id: "marker-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      columnId: column.id,
      text: "Event",
      color: "#2f5bea"
    };
    bar.markers.push(marker);
    renderTimelineBoard();
    saveTimelineState();
    const input = timelineAlignmentBars.querySelector('[data-marker-id="' + marker.id + '"] .timeline-marker__text');
    input.focus();
    input.select();
  }

  function renderTimelineBoard() {
    timelineBoard.style.gridTemplateColumns = timelineState.columns.length
      ? "repeat(" + timelineState.columns.length + ", 260px)"
      : "none";
    const columnContentRow = timelineState.alignmentBars.length + 3;
    document.getElementById("add-timeline-bar").disabled = timelineState.columns.length === 0;
    timelineAlignmentBars.hidden = timelineState.columns.length === 0;
    timelineColumns.replaceChildren();
    timelineState.columns.forEach(function (column, index) {
      const header = document.createElement("div");
      header.className = "timeline-column__header";
      header.style.gridColumn = String(index + 1);
      header.style.gridRow = "1";

      const title = document.createElement("input");
      title.className = "timeline-column__title";
      title.type = "text";
      title.maxLength = 40;
      title.value = column.title;
      title.setAttribute("aria-label", "Column title");
      title.addEventListener("input", function () {
        column.title = title.value;
        saveTimelineState();
      });

      const deleteColumn = document.createElement("button");
      deleteColumn.className = "timeline-column__delete";
      deleteColumn.type = "button";
      deleteColumn.textContent = "Delete";
      deleteColumn.setAttribute("aria-label", "Delete " + (column.title || "untitled") + " column");
      deleteColumn.addEventListener("click", function () {
        const hasAlignedMarkers = timelineState.alignmentBars.some(function (bar) {
          return bar.markers.some(function (marker) { return marker.columnId === column.id; });
        });
        if ((column.markers.length > 0 || hasAlignedMarkers) &&
          !window.confirm("Are you sure you want to delete this?")) return;
        timelineState.columns = timelineState.columns.filter(function (item) { return item.id !== column.id; });
        timelineState.alignmentBars.forEach(function (bar) {
          bar.markers = bar.markers.filter(function (marker) { return marker.columnId !== column.id; });
        });
        renderTimelineBoard();
        saveTimelineState();
      });
      header.append(title, deleteColumn);

      const track = document.createElement("div");
      track.className = "timeline-column__track";
      track.style.gridColumn = String(index + 1);
      track.style.gridRow = "1 / span " + columnContentRow;
      track.style.pointerEvents = "none";

      const content = document.createElement("div");
      content.className = "timeline-column__content";
      content.style.gridColumn = String(index + 1);
      content.style.gridRow = String(columnContentRow);

      const markers = document.createElement("div");
      markers.className = "timeline-column__markers";
      column.markers.forEach(function (marker) {
        const markerElement = makeTimelineMarkerElement(marker, function () {
          column.markers = column.markers.filter(function (item) { return item.id !== marker.id; });
          renderTimelineBoard();
          saveTimelineState();
        });
        markers.appendChild(markerElement);
      });

      content.appendChild(markers);
      timelineColumns.append(track, header, content);
    });

    timelineAlignmentBars.replaceChildren();
    timelineState.alignmentBars.forEach(function (bar, index) {
      const element = document.createElement("section");
      element.className = "timeline-alignment";
      element.style.gridColumn = "1 / -1";
      element.style.gridRow = String(index + 2);

      const header = document.createElement("div");
      header.className = "timeline-alignment__header";
      const label = document.createElement("input");
      label.className = "timeline-alignment__label";
      label.type = "text";
      label.maxLength = 40;
      label.value = bar.label;
      label.setAttribute("aria-label", "Alignment bar label");
      label.addEventListener("input", function () {
        bar.label = label.value;
        saveTimelineState();
      });

      const deleteBar = document.createElement("button");
      deleteBar.className = "timeline-column__delete";
      deleteBar.type = "button";
      deleteBar.textContent = "Delete bar";
      deleteBar.addEventListener("click", function () {
        if (bar.markers.length > 0 && !window.confirm("Are you sure you want to delete this alignment bar and its markers?")) return;
        timelineState.alignmentBars = timelineState.alignmentBars.filter(function (item) { return item.id !== bar.id; });
        renderTimelineBoard();
        saveTimelineState();
      });
      header.append(label, deleteBar);

      const cells = document.createElement("div");
      cells.className = "timeline-alignment__cells";
      cells.style.gridTemplateColumns = "repeat(" + timelineState.columns.length + ", 260px)";
      timelineState.columns.forEach(function (column) {
        const cell = document.createElement("div");
        cell.className = "timeline-alignment__cell";
        const addMarker = document.createElement("button");
        addMarker.className = "button secondary timeline-column__add";
        addMarker.type = "button";
        addMarker.textContent = "Add event";
        addMarker.setAttribute("aria-label", "Add event to " + column.title + " at " + (bar.label || "same time"));
        addMarker.addEventListener("click", function () {
          createAlignedTimelineMarker(bar, column);
        });
        cell.appendChild(addMarker);
        bar.markers.filter(function (marker) { return marker.columnId === column.id; }).forEach(function (marker) {
          const markerElement = makeTimelineMarkerElement(marker, function () {
            bar.markers = bar.markers.filter(function (item) { return item.id !== marker.id; });
            renderTimelineBoard();
            saveTimelineState();
          });
          cell.appendChild(markerElement);
        });
        cells.appendChild(cell);
      });
      element.append(header, cells);
      timelineAlignmentBars.appendChild(element);
    });
    updateTimelineStatus();
  }

  document.getElementById("add-timeline-column").addEventListener("click", function () {
    const column = {
      id: "phase-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      title: "New column",
      markers: []
    };
    timelineState.columns.push(column);
    renderTimelineBoard();
    saveTimelineState();
    const titles = timelineColumns.querySelectorAll(".timeline-column__title");
    const title = titles[titles.length - 1];
    title.focus();
    title.select();
  });

  document.getElementById("add-timeline-bar").addEventListener("click", function () {
    const bar = {
      id: "alignment-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      label: "Same time",
      markers: []
    };
    timelineState.alignmentBars.push(bar);
    renderTimelineBoard();
    saveTimelineState();
    const labels = timelineAlignmentBars.querySelectorAll(".timeline-alignment__label");
    const label = labels[labels.length - 1];
    label.focus();
    label.select();
  });

  renderTimelineBoard();

  function saveFlowState() {
    storage.set("flowDiagram", flowState);
    updateFlowStatus();
  }

  function updateFlowStatus(message) {
    flowStatus.textContent = message || flowState.nodes.length + " boxes | " + flowState.connections.length + " connections";
  }

  function selectFlowNode(id) {
    selectedNodeId = id;
    const selected = flowState.nodes.find(function (node) { return node.id === id; });
    boxColorInput.disabled = !selected;
    deleteTextBoxButton.disabled = !selected;
    if (selected) boxColorInput.value = selected.color;

    flowNodes.querySelectorAll(".flow-node").forEach(function (element) {
      element.classList.toggle("is-selected", element.dataset.flowNodeId === selectedNodeId);
    });
  }

  function positionFlowNode(element, node) {
    const maxLeft = Math.max(0, flowCanvas.clientWidth - element.offsetWidth);
    const maxTop = Math.max(0, flowCanvas.clientHeight - element.offsetHeight);
    const left = Math.max(0, Math.min(node.x * flowCanvas.clientWidth, maxLeft));
    const top = Math.max(0, Math.min(node.y * flowCanvas.clientHeight, maxTop));
    element.style.left = left + "px";
    element.style.top = top + "px";
    node.x = flowCanvas.clientWidth ? left / flowCanvas.clientWidth : node.x;
    node.y = flowCanvas.clientHeight ? top / flowCanvas.clientHeight : node.y;
  }

  function renderFlowConnections() {
    const width = flowCanvas.clientWidth;
    const height = flowCanvas.clientHeight;
    if (!width || !height) return;

    flowConnections.setAttribute("viewBox", "0 0 " + width + " " + height);
    flowConnections.querySelectorAll(".flow-connector").forEach(function (line) { line.remove(); });
    const elements = new Map();
    flowNodes.querySelectorAll(".flow-node").forEach(function (element) {
      elements.set(element.dataset.flowNodeId, element);
    });

    flowState.connections.forEach(function (connection) {
      const source = elements.get(connection.from);
      const destination = elements.get(connection.to);
      if (!source || !destination) return;

      const sourceX = source.offsetLeft + source.offsetWidth / 2;
      const sourceY = source.offsetTop + source.offsetHeight / 2;
      const destinationX = destination.offsetLeft + destination.offsetWidth / 2;
      const destinationY = destination.offsetTop + destination.offsetHeight / 2;
      const deltaX = destinationX - sourceX;
      const deltaY = destinationY - sourceY;
      const sourceScale = 1 / Math.max(
        Math.abs(deltaX) / (source.offsetWidth / 2),
        Math.abs(deltaY) / (source.offsetHeight / 2),
        0.0001
      );
      const destinationScale = 1 / Math.max(
        Math.abs(deltaX) / (destination.offsetWidth / 2),
        Math.abs(deltaY) / (destination.offsetHeight / 2),
        0.0001
      );
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("flow-connector");
      line.setAttribute("x1", sourceX + deltaX * sourceScale);
      line.setAttribute("y1", sourceY + deltaY * sourceScale);
      line.setAttribute("x2", destinationX - deltaX * destinationScale);
      line.setAttribute("y2", destinationY - deltaY * destinationScale);
      if (connection.arrowheads === 1 || connection.arrowheads === 2) {
        line.setAttribute("marker-end", "url(#flow-arrow)");
      }
      if (connection.arrowheads === 2) {
        line.setAttribute("marker-start", "url(#flow-arrow)");
      }
      flowConnections.appendChild(line);
    });
  }

  function setFlowMode(mode) {
    isConnecting = mode === "connect";
    isDisconnecting = mode === "disconnect";
    pendingConnectionId = null;
    connectBoxesButton.setAttribute("aria-pressed", isConnecting ? "true" : "false");
    connectBoxesButton.textContent = isConnecting ? "Cancel connect" : "Connect boxes";
    disconnectBoxesButton.setAttribute("aria-pressed", isDisconnecting ? "true" : "false");
    disconnectBoxesButton.textContent = isDisconnecting ? "Cancel disconnect" : "Disconnect boxes";
    updateFlowStatus(isConnecting ? "Choose the first box to connect." :
      isDisconnecting ? "Choose the first box to disconnect." : null);
  }

  function chooseFlowConnectionNode(id) {
    if (pendingConnectionId === null) {
      pendingConnectionId = id;
      updateFlowStatus(isDisconnecting ? "Choose the second box to disconnect." : "Choose the second box to connect.");
      return;
    }

    if (pendingConnectionId === id) {
      updateFlowStatus("Choose a different second box.");
      return;
    }

    if (isDisconnecting) {
      const previousCount = flowState.connections.length;
      flowState.connections = flowState.connections.filter(function (connection) {
        return !(
          (connection.from === pendingConnectionId && connection.to === id) ||
          (connection.from === id && connection.to === pendingConnectionId)
        );
      });
      const removedCount = previousCount - flowState.connections.length;
      if (removedCount > 0) {
        renderFlowConnections();
        saveFlowState();
      }
      setFlowMode(null);
      updateFlowStatus(removedCount > 0 ? "Connection removed." : "Those boxes are not connected.");
      return;
    }

    const alreadyConnected = flowState.connections.some(function (connection) {
      return connection.from === pendingConnectionId && connection.to === id;
    });
    if (!alreadyConnected) {
      flowState.connections.push({
        from: pendingConnectionId,
        to: id,
        arrowheads: flowState.arrowheads
      });
      renderFlowConnections();
      saveFlowState();
    }
    setFlowMode(null);
    if (alreadyConnected) updateFlowStatus("Those boxes are already connected.");
  }

  function beginFlowNodeMove(event, node, element, handle) {
    if (isConnecting || isDisconnecting || event.button !== 0) return;
    event.preventDefault();
    selectFlowNode(node.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = element.offsetLeft;
    const startTop = element.offsetTop;
    handle.setPointerCapture(event.pointerId);

    function move(moveEvent) {
      const maxLeft = Math.max(0, flowCanvas.clientWidth - element.offsetWidth);
      const maxTop = Math.max(0, flowCanvas.clientHeight - element.offsetHeight);
      const left = Math.max(0, Math.min(startLeft + moveEvent.clientX - startX, maxLeft));
      const top = Math.max(0, Math.min(startTop + moveEvent.clientY - startY, maxTop));
      element.style.left = left + "px";
      element.style.top = top + "px";
      node.x = left / flowCanvas.clientWidth;
      node.y = top / flowCanvas.clientHeight;
      renderFlowConnections();
    }

    function finish() {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      saveFlowState();
    }

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  function moveFlowNodeWithKeyboard(event, node, element) {
    const step = event.shiftKey ? 40 : 12;
    let deltaX = 0;
    let deltaY = 0;
    if (event.key === "ArrowLeft") deltaX = -step;
    else if (event.key === "ArrowRight") deltaX = step;
    else if (event.key === "ArrowUp") deltaY = -step;
    else if (event.key === "ArrowDown") deltaY = step;
    else return;

    event.preventDefault();
    const maxLeft = Math.max(0, flowCanvas.clientWidth - element.offsetWidth);
    const maxTop = Math.max(0, flowCanvas.clientHeight - element.offsetHeight);
    const left = Math.max(0, Math.min(element.offsetLeft + deltaX, maxLeft));
    const top = Math.max(0, Math.min(element.offsetTop + deltaY, maxTop));
    element.style.left = left + "px";
    element.style.top = top + "px";
    node.x = left / flowCanvas.clientWidth;
    node.y = top / flowCanvas.clientHeight;
    renderFlowConnections();
    saveFlowState();
  }

  function renderFlowCanvas() {
    flowNodes.replaceChildren();
    flowState.nodes.forEach(function (node) {
      const element = document.createElement("article");
      element.className = "flow-node";
      element.dataset.flowNodeId = node.id;
      element.style.setProperty("--node-color", node.color);
      element.setAttribute("role", "group");

      const handle = document.createElement("button");
      handle.className = "flow-node__move";
      handle.type = "button";
      handle.setAttribute("aria-label", "Move text box with pointer or arrow keys");
      handle.addEventListener("click", function () {
        if (isConnecting || isDisconnecting) chooseFlowConnectionNode(node.id);
        else selectFlowNode(node.id);
      });
      handle.addEventListener("pointerdown", function (event) {
        beginFlowNodeMove(event, node, element, handle);
      });
      handle.addEventListener("keydown", function (event) {
        moveFlowNodeWithKeyboard(event, node, element);
      });

      const text = document.createElement("textarea");
      text.className = "flow-node__text";
      text.maxLength = 180;
      text.value = node.text;
      text.setAttribute("aria-label", "Text box content");
      text.addEventListener("focus", function () { selectFlowNode(node.id); });
      text.addEventListener("input", function () {
        node.text = text.value;
        saveFlowState();
      });

      element.append(handle, text);
      flowNodes.appendChild(element);
      positionFlowNode(element, node);
    });

    selectFlowNode(selectedNodeId);
    renderFlowConnections();
    updateFlowStatus();
  }

  addTextBoxButton.addEventListener("click", function () {
    const id = "box-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    const index = flowState.nodes.length;
    const node = {
      id: id,
      text: "Write something...",
      color: boxColorInput.value || "#2f5bea",
      x: 0.08 + (index * 0.17) % 0.7,
      y: 0.16 + (index * 0.21) % 0.62
    };
    flowState.nodes.push(node);
    selectedNodeId = id;
    setFlowMode(null);
    renderFlowCanvas();
    saveFlowState();
    const text = flowNodes.querySelector('[data-flow-node-id="' + id + '"] .flow-node__text');
    text.focus();
    text.select();
  });

  connectBoxesButton.addEventListener("click", function () {
    setFlowMode(isConnecting ? null : "connect");
  });

  disconnectBoxesButton.addEventListener("click", function () {
    setFlowMode(isDisconnecting ? null : "disconnect");
  });

  boxColorInput.addEventListener("input", function () {
    const node = flowState.nodes.find(function (item) { return item.id === selectedNodeId; });
    const element = flowNodes.querySelector(".is-selected");
    if (!node || !element) return;
    node.color = boxColorInput.value;
    element.style.setProperty("--node-color", node.color);
    saveFlowState();
  });

  deleteTextBoxButton.addEventListener("click", function () {
    if (!selectedNodeId) return;
    flowState.nodes = flowState.nodes.filter(function (node) { return node.id !== selectedNodeId; });
    flowState.connections = flowState.connections.filter(function (connection) {
      return connection.from !== selectedNodeId && connection.to !== selectedNodeId;
    });
    selectedNodeId = null;
    renderFlowCanvas();
    saveFlowState();
  });

  connectionArrowheads.value = String(flowState.arrowheads);
  connectionArrowheads.addEventListener("change", function () {
    flowState.arrowheads = Number(connectionArrowheads.value);
    saveFlowState();
  });

  const toolTabs = Array.prototype.slice.call(document.querySelectorAll(".tool-switcher__tab"));

  function selectToolTab(tab) {
    toolTabs.forEach(function (item) {
      const selected = item === tab;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
    if (tab.id === "tool-tab-buliten") renderFlowCanvas();
  }

  toolTabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      selectToolTab(tab);
    });
    tab.addEventListener("keydown", function (event) {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % toolTabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + toolTabs.length) % toolTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = toolTabs.length - 1;
      else return;

      event.preventDefault();
      toolTabs[nextIndex].focus();
      selectToolTab(toolTabs[nextIndex]);
    });
  });

  // ----------------------------------------------------------
  // 3. Views: show one section at a time, based on the #link in the address bar.
  // ----------------------------------------------------------
  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) {
      return view.id === requested;
    });
    const current = exists ? requested : "home";

    views.forEach(function (view) {
      view.hidden = view.id !== current;
    });

    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (current === "create") renderFlowCanvas();
    initializeAds(document.getElementById(current));
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", showView);

  // ----------------------------------------------------------
  // 4. Explore page: build one card per listing.
  //    We use textContent (not innerHTML) so text is always shown
  //    as text — a basic security habit.
  // ----------------------------------------------------------
  const grid = document.getElementById("listing-grid");
  const searchBox = document.getElementById("search-box");
  const emptyMessage = document.getElementById("empty-message");
  const savedCount = document.getElementById("saved-count");

  function makeCard(item) {
    const card = document.createElement("article");
    card.className = "card";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item.category;

    const title = document.createElement("h2");
    title.textContent = item.name;

    const text = document.createElement("p");
    text.textContent = item.description;

    const isSaved = savedIds.indexOf(item.id) !== -1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary";
    button.textContent = isSaved ? "Saved ✓" : "Save";
    button.setAttribute("aria-pressed", isSaved ? "true" : "false");
    button.addEventListener("click", function () {
      toggleSaved(item.id);
    });

    card.append(tag, title, text, button);
    return card;
  }

  function toggleSaved(id) {
    if (savedIds.indexOf(id) === -1) {
      savedIds.push(id);
    } else {
      savedIds = savedIds.filter(function (savedId) { return savedId !== id; });
    }
    storage.set("savedIds", savedIds);
    renderListings();
  }

  function renderListings() {
    const query = searchBox.value.trim().toLowerCase();
    const matches = LISTINGS.filter(function (item) {
      const text = (item.name + " " + item.category + " " + item.description).toLowerCase();
      return text.indexOf(query) !== -1;
    });

    grid.replaceChildren.apply(grid, matches.map(makeCard));
    emptyMessage.hidden = matches.length > 0;
    savedCount.textContent = savedIds.length === 0
      ? "Tap Save on anything you like."
      : "You've saved " + savedIds.length + " item(s) on this device.";
  }

  searchBox.addEventListener("input", renderListings);
  window.addEventListener("resize", function () {
    if (window.location.hash === "#create") renderFlowCanvas();
  });

  // ----------------------------------------------------------
  // 5. Start up.
  // ----------------------------------------------------------
  renderListings();
  showView();
})();
