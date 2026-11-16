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

  const themeToggle = document.getElementById("theme-toggle");

  function setNightMode(enabled, savePreference) {
    document.body.classList.toggle("night-mode", enabled);
    themeToggle.setAttribute("aria-pressed", String(enabled));
    if (savePreference) storage.set("nightMode", enabled);
  }

  setNightMode(storage.get("nightMode", false) === true, false);
  themeToggle.addEventListener("click", function () {
    setNightMode(themeToggle.getAttribute("aria-pressed") !== "true", true);
  });

  let savedIds = storage.get("savedIds", []);

  const defaultFlowState = {
    arrowheads: 1,
    nodes: [
      { id: "idea", text: "Start with an idea", color: "#c85338", x: 0.06, y: 0.13 },
      { id: "test", text: "See if it works", color: "#45836a", x: 0.41, y: 0.43 },
      { id: "outcome", text: "Do something with it", color: "#2f5bea", x: 0.76, y: 0.13 },
      { id: "arrange", text: "Arrange the pieces", color: "#b700ff", x: 0.41, y: 0.09 }
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
  const calendarMonthCount = document.getElementById("calendar-month-count");
  const calendarMonthDayList = document.getElementById("calendar-month-day-list");
  const calendarWeekLength = document.getElementById("calendar-week-length");
  const calendarYearStart = document.getElementById("calendar-year-start");
  const calendarMonthNames = document.getElementById("calendar-month-names");
  const calendarDayNames = document.getElementById("calendar-day-names");
  const calendarMonthSelect = document.getElementById("calendar-month-select");
  const calendarGrid = document.getElementById("calendar-grid");
  const calendarStatus = document.getElementById("calendar-status");
  const calendarDayDetails = document.getElementById("calendar-day-details");
  const calendarDayTitle = document.getElementById("calendar-day-title");
  const calendarDaySummary = document.getElementById("calendar-day-summary");
  const calendarDayNote = document.getElementById("calendar-day-note");
  const calendarNoteLinks = document.getElementById("calendar-note-links");
  const calendarDayEvent = document.getElementById("calendar-day-event");
  const calendarEventStatus = document.getElementById("calendar-event-status");
  const notesList = document.getElementById("notes-list");
  const notesEditor = document.getElementById("notes-editor");
  const notesTitle = document.getElementById("notes-title");
  const notesContent = document.getElementById("notes-content");
  const notesEmpty = document.getElementById("notes-empty");
  const notesStatus = document.getElementById("notes-status");
  const notesSortSelect = document.getElementById("notes-sort-select");
  const notesCreateButton = document.getElementById("notes-create");
  const notesDeleteButton = document.getElementById("notes-delete");
  const baseMapCanvas = document.getElementById("sketch-canvas-base");
  const overlayMapCanvas = document.getElementById("sketch-canvas-overlay");
  const mapColorInput = document.getElementById("sketch-color");
  const clearMapButton = document.getElementById("clear-sketch");
  const mapEraserButton = document.getElementById("toggle-sketch-eraser");
  const mapPageSelect = document.getElementById("sketch-page-select");
  const mapStatus = document.getElementById("sketch-status");
  const mapCanvasWrap = document.querySelector(".sketch-canvas-wrap");
  const baseMapContext = baseMapCanvas.getContext("2d");
  const overlayMapContext = overlayMapCanvas.getContext("2d");
  let isDrawingOnMap = false;
  let lastMapPoint = null;
  let drawingMapCanvas = null;
  let drawingMapContext = null;
  let drawingMapPage = null;
  let drawingMapPointerId = null;
  let isMapEraser = false;
  let activeMapLayer = "base";
  function loadMapPages() {
    try {
      const saved = localStorage.getItem("mapPageImages");
      if (saved === null) return { base: null };
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Saved map data has an invalid format.");
      }
      const pages = { base: null };
      Object.keys(parsed).forEach(function (key) {
        const value = parsed[key];
        if ((key === "base" || /^alignment-[a-z\d-]+$/i.test(key)) &&
          (value === null || (typeof value === "string" && value.indexOf("data:image/png;base64,") === 0))) {
          pages[key] = value;
        }
      });
      return pages;
    } catch (error) {
      console.error("Could not load saved map data.", error);
      mapStatus.textContent = "Saved map data could not be loaded.";
      return { base: null };
    }
  }

  let savedMapPages = loadMapPages();
  let mapCanvasScale = window.devicePixelRatio || 1;
  let mapRestoreToken = 0;
  let isRestoringMapPage = false;
  let hasLoadedMapPages = false;
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

  function loadNotesDocuments() {
    const saved = storage.get("notesDocuments", []);
    if (!Array.isArray(saved)) return [];
    return saved.filter(function (document) {
      return document && typeof document.id === "string" && typeof document.name === "string" &&
        typeof document.content === "string";
    }).map(function (document) {
      return {
        id: document.id,
        name: document.name.trim().slice(0, 80) || "Untitled document",
        content: document.content.slice(0, 50000),
        updatedAt: Number.isFinite(document.updatedAt) ? document.updatedAt : 0
      };
    });
  }

  let notesDocuments = loadNotesDocuments();
  let selectedNoteId = notesDocuments.length ? notesDocuments[0].id : null;

  function getSelectedNote() {
    return notesDocuments.find(function (document) { return document.id === selectedNoteId; }) || null;
  }

  function saveNotesDocuments() {
    storage.set("notesDocuments", notesDocuments);
  }

  function renderNotesSurface(note, editing) {
    notesContent.contentEditable = editing ? "true" : "false";
    notesContent.replaceChildren();
    if (editing) {
      notesContent.textContent = note.content;
      return;
    }
    if (!note.content) {
      const emptyPreview = document.createElement("p");
      emptyPreview.className = "notes-content__empty";
      emptyPreview.textContent = "Your document preview will appear here.";
      notesContent.appendChild(emptyPreview);
      return;
    }

    const availableDocuments = new Map(notesDocuments.map(function (item) {
      return [item.name.toLocaleLowerCase(), item];
    }));
    note.content.split(/\r?\n/).forEach(function (line) {
      const paragraph = document.createElement("p");
      const shortcutPattern = /_([^_\r\n]+)_/g;
      let cursor = 0;
      let match;
      while ((match = shortcutPattern.exec(line)) !== null) {
        if (match.index > cursor) paragraph.appendChild(document.createTextNode(line.slice(cursor, match.index)));
        const calendarDate = findCalendarReference(match[1]);
        const target = availableDocuments.get(match[1].trim().toLocaleLowerCase());
        if (calendarDate) {
          const shortcut = document.createElement("button");
          shortcut.type = "button";
          shortcut.className = "notes-shortcut notes-shortcut--calendar";
          shortcut.textContent = match[1].trim();
          shortcut.setAttribute("aria-label", "Open calendar day: " + calendarDate.label);
          shortcut.addEventListener("click", function () {
            selectedCalendarMonth = calendarDate.month;
            selectedCalendarDay = { month: calendarDate.month, day: calendarDate.day };
            selectToolTab(document.getElementById("tool-tab-calendar"));
          });
          paragraph.appendChild(shortcut);
        } else if (target) {
          const shortcut = document.createElement("button");
          shortcut.type = "button";
          shortcut.className = "notes-shortcut";
          shortcut.textContent = target.name;
          shortcut.setAttribute("aria-label", "Open document: " + target.name);
          shortcut.addEventListener("click", function () {
            selectedNoteId = target.id;
            renderNotes();
            selectToolTab(document.getElementById("tool-tab-notes"));
          });
          paragraph.appendChild(shortcut);
        } else {
          paragraph.appendChild(document.createTextNode(match[0]));
        }
        cursor = match.index + match[0].length;
      }
      if (cursor < line.length) paragraph.appendChild(document.createTextNode(line.slice(cursor)));
      if (!line) paragraph.appendChild(document.createElement("br"));
      notesContent.appendChild(paragraph);
    });
  }

  function renderNotesList() {
    notesList.replaceChildren();
    const sortBy = notesSortSelect.value;
    const sortedDocuments = notesDocuments.slice().sort(function (first, second) {
      if (sortBy === "updated" && first.updatedAt !== second.updatedAt) {
        return second.updatedAt - first.updatedAt;
      }
      return first.name.localeCompare(second.name, undefined, { sensitivity: "base" });
    });
    sortedDocuments.forEach(function (note) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "notes-list__item";
      item.textContent = note.name;
      item.setAttribute("aria-current", note.id === selectedNoteId ? "true" : "false");
      item.addEventListener("click", function () {
        selectedNoteId = note.id;
        notesStatus.textContent = "";
        renderNotes();
      });
      notesList.appendChild(item);
    });
  }

  function renderNotes() {
    const document = getSelectedNote();
    renderNotesList();
    notesEmpty.hidden = Boolean(document);
    notesEditor.hidden = !document;
    if (!document) return;
    notesTitle.value = document.name;
    renderNotesSurface(document, false);
  }

  notesCreateButton.addEventListener("click", function () {
    let name = "Untitled document";
    let suffix = 2;
    while (notesDocuments.some(function (item) {
      return item.name.toLocaleLowerCase() === name.toLocaleLowerCase();
    })) {
      name = "Untitled document " + suffix;
      suffix += 1;
    }
    const document = {
      id: "note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      name: name,
      content: "",
      updatedAt: Date.now()
    };
    notesDocuments.push(document);
    selectedNoteId = document.id;
    saveNotesDocuments();
    notesStatus.textContent = "";
    renderNotes();
    notesTitle.focus();
    notesTitle.select();
  });

  notesDeleteButton.addEventListener("click", function () {
    const note = getSelectedNote();
    if (!note) return;
    const hasIncomingShortcut = notesDocuments.some(function (otherNote) {
      if (otherNote.id === note.id) return false;
      const shortcutPattern = /_([^_\r\n]+)_/g;
      let match;
      while ((match = shortcutPattern.exec(otherNote.content)) !== null) {
        if (match[1].trim().toLocaleLowerCase() === note.name.toLocaleLowerCase()) return true;
      }
      return false;
    });
    if ((note.content.trim().length > 0 || hasIncomingShortcut) &&
      !window.confirm("Are you sure you want to delete this?")) return;

    notesDocuments = notesDocuments.filter(function (item) { return item.id !== note.id; });
    selectedNoteId = notesDocuments.length ? notesDocuments[0].id : null;
    saveNotesDocuments();
    notesStatus.textContent = "";
    renderNotes();
  });

  notesSortSelect.addEventListener("change", renderNotesList);
  notesTitle.addEventListener("change", function () {
    const document = getSelectedNote();
    if (!document) return;
    const name = notesTitle.value.trim();
    if (!name) {
      notesTitle.value = document.name;
      notesStatus.textContent = "A document needs a name.";
      return;
    }
    const duplicate = notesDocuments.some(function (item) {
      return item.id !== document.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase();
    });
    if (duplicate) {
      notesTitle.value = document.name;
      notesStatus.textContent = "Each document must have a unique name for shortcuts to work.";
      return;
    }
    document.name = name.slice(0, 80);
    document.updatedAt = Date.now();
    saveNotesDocuments();
    notesStatus.textContent = "";
    renderNotes();
  });
  notesContent.addEventListener("input", function () {
    const document = getSelectedNote();
    if (!document) return;
    document.content = notesContent.textContent.slice(0, 50000);
    document.updatedAt = Date.now();
    saveNotesDocuments();
    renderNotesList();
  });
  notesContent.addEventListener("focus", function () {
    const document = getSelectedNote();
    if (document) renderNotesSurface(document, true);
  });
  notesContent.addEventListener("blur", function () {
    const document = getSelectedNote();
    if (document) renderNotesSurface(document, false);
  });
  notesContent.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const lineBreak = document.createTextNode("\n");
    range.insertNode(lineBreak);
    range.setStartAfter(lineBreak);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    notesContent.dispatchEvent(new Event("input", { bubbles: true }));
  });
  notesContent.addEventListener("paste", function (event) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const pastedContent = document.createTextNode(pastedText);
    range.insertNode(pastedContent);
    range.setStartAfter(pastedContent);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    notesContent.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const defaultCalendarSettings = {
    months: 12,
    monthDays: Array(12).fill(30),
    weekLength: 7,
    yearStart: 0,
    monthNames: "January\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember",
    dayNames: "Sunday\nMonday\nTuesday\nWednesday\nThursday\nFriday\nSaturday"
  };

  function boundedCalendarNumber(value, minimum, maximum, fallback) {
    return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
  }

  function loadCalendarSettings() {
    const saved = storage.get("calendarSettings", null);
    if (!saved || typeof saved !== "object") {
      return Object.assign({}, defaultCalendarSettings, { monthDays: defaultCalendarSettings.monthDays.slice() });
    }
    const months = boundedCalendarNumber(saved.months, 1, 24, defaultCalendarSettings.months);
    const legacyDays = boundedCalendarNumber(saved.daysPerMonth, 1, 60, 30);
    const savedMonthDays = Array.isArray(saved.monthDays) ? saved.monthDays : [];
    const settings = {
      months: months,
      monthDays: Array.from({ length: months }, function (_, index) {
        return boundedCalendarNumber(savedMonthDays[index], 1, 60, legacyDays);
      }),
      weekLength: boundedCalendarNumber(saved.weekLength, 1, 14, defaultCalendarSettings.weekLength),
      yearStart: boundedCalendarNumber(saved.yearStart, 0, 13, defaultCalendarSettings.yearStart),
      monthNames: typeof saved.monthNames === "string" ? saved.monthNames : defaultCalendarSettings.monthNames,
      dayNames: typeof saved.dayNames === "string" ? saved.dayNames : defaultCalendarSettings.dayNames
    };
    if (settings.yearStart >= settings.weekLength) settings.yearStart = 0;
    return settings;
  }

  let calendarSettings = loadCalendarSettings();
  let selectedCalendarMonth = 0;
  let selectedCalendarDay = null;
  const calendarDayEntries = loadCalendarDayEntries();

  function loadCalendarDayEntries() {
    const saved = storage.get("calendarDayEntries", null);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.keys(saved).reduce(function (entries, key) {
      const entry = saved[key];
      if (!/^\d+:\d+$/.test(key) || !entry || typeof entry !== "object") return entries;
      entries[key] = {
        note: typeof entry.note === "string" ? entry.note.slice(0, 5000) : "",
        eventId: typeof entry.eventId === "string" ? entry.eventId.slice(0, 100) : ""
      };
      return entries;
    }, {});
  }

  function getCalendarDayEntry() {
    if (!selectedCalendarDay) return null;
    const key = selectedCalendarDay.month + ":" + selectedCalendarDay.day;
    if (!calendarDayEntries[key]) calendarDayEntries[key] = { note: "", eventId: "" };
    return calendarDayEntries[key];
  }

  function saveCalendarDayEntries() {
    storage.set("calendarDayEntries", calendarDayEntries);
  }

  function getCalendarDatesForEvent(eventId) {
    const monthNames = calendarNames(calendarSettings.monthNames, calendarSettings.months, "Month");
    const dates = [];
    Object.keys(calendarDayEntries).forEach(function (key) {
      const entry = calendarDayEntries[key];
      if (entry.eventId !== eventId) return;
      const parts = key.split(":").map(Number);
      const month = parts[0];
      const day = parts[1];
      if (!Number.isInteger(month) || !Number.isInteger(day) ||
        month < 0 || month >= calendarSettings.months ||
        day < 1 || day > calendarSettings.monthDays[month]) return;
      const monthName = monthNames[month];
      const shortMonthName = monthName.length > 10 ? monthName.slice(0, 10) + "..." : monthName;
      dates.push({ month: month, day: day, label: day + " " + shortMonthName, fullLabel: day + " " + monthName });
    });
    return dates.sort(function (first, second) {
      return first.month - second.month || first.day - second.day;
    });
  }

  function hasCalendarDayDetails(month, day) {
    const entry = calendarDayEntries[month + ":" + day];
    return Boolean(entry && (entry.note.trim() || entry.eventId));
  }

  function updateCalendarDayMarker(month, day) {
    if (month !== selectedCalendarMonth) return;
    const dayButton = calendarGrid.querySelectorAll("button.calendar-day")[day - 1];
    if (!dayButton) return;
    const hasDetails = hasCalendarDayDetails(month, day);
    dayButton.classList.toggle("calendar-day--has-details", hasDetails);
    dayButton.setAttribute("aria-label", dayButton.dataset.baseLabel +
      (hasDetails ? ", has notes or a linked event" : ""));
  }

  function getTimelineEvents() {
    const events = [];
    timelineState.columns.forEach(function (column) {
      column.markers.forEach(function (marker) {
        events.push({
          id: marker.id,
          label: (marker.text.trim() || "Untitled event") + " (" + column.title + ")"
        });
      });
    });
    timelineState.alignmentBars.forEach(function (bar) {
      bar.markers.forEach(function (marker) {
        const column = timelineState.columns.find(function (item) { return item.id === marker.columnId; });
        const columnName = column ? column.title : "Timeline";
        events.push({
          id: marker.id,
          label: (marker.text.trim() || "Untitled event") + " (" + bar.label + " · " + columnName + ")"
        });
      });
    });
    return events;
  }

  function updateCalendarEventOptions() {
    if (!selectedCalendarDay) return;
    const entry = getCalendarDayEntry();
    const linkedEventId = entry.eventId;
    const events = getTimelineEvents();
    calendarDayEvent.replaceChildren();

    const noEvent = document.createElement("option");
    noEvent.value = "";
    noEvent.textContent = "No event linked";
    calendarDayEvent.appendChild(noEvent);
    events.forEach(function (event) {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = event.label;
      calendarDayEvent.appendChild(option);
    });

    const linkedEventExists = events.some(function (event) { return event.id === linkedEventId; });
    if (linkedEventId && !linkedEventExists) {
      const missingEvent = document.createElement("option");
      missingEvent.value = linkedEventId;
      missingEvent.textContent = "Event no longer in Timeline";
      calendarDayEvent.appendChild(missingEvent);
    }
    calendarDayEvent.value = linkedEventId;
    calendarEventStatus.textContent = linkedEventId && !linkedEventExists
      ? "This linked event is no longer in the Timeline tool."
      : "";
  }

  function calendarNames(value, count, fallbackPrefix) {
    const names = value.split(/\r?\n/).map(function (name) { return name.trim(); }).filter(Boolean);
    return Array.from({ length: count }, function (_, index) {
      return names[index] || fallbackPrefix + " " + (index + 1);
    });
  }

  function findCalendarReference(reference) {
    const normalizedReference = reference.trim().toLocaleLowerCase();
    const monthNames = calendarNames(calendarSettings.monthNames, calendarSettings.months, "Month")
      .map(function (name, index) { return { name: name, index: index }; })
      .sort(function (first, second) { return second.name.length - first.name.length; });
    for (let index = 0; index < monthNames.length; index += 1) {
      const month = monthNames[index];
      const normalizedMonth = month.name.toLocaleLowerCase();
      if (!normalizedReference.startsWith(normalizedMonth)) continue;
      const dayText = normalizedReference.slice(normalizedMonth.length).trim();
      if (!/^\d+$/.test(dayText)) continue;
      const day = Number(dayText);
      if (day >= 1 && day <= calendarSettings.monthDays[month.index]) {
        return { month: month.index, day: day, label: month.name + " " + day };
      }
    }
    return null;
  }

  function renderCalendarNoteLinks(content) {
    calendarNoteLinks.replaceChildren();
    const notesByName = new Map(notesDocuments.map(function (note) {
      return [note.name.toLocaleLowerCase(), note];
    }));
    const linkedNotes = new Set();
    const shortcutPattern = /_([^_\r\n]+)_/g;
    let match;
    while ((match = shortcutPattern.exec(content)) !== null) {
      const note = notesByName.get(match[1].trim().toLocaleLowerCase());
      if (note && !linkedNotes.has(note.id)) {
        linkedNotes.add(note.id);
        const shortcut = document.createElement("button");
        shortcut.type = "button";
        shortcut.className = "notes-shortcut";
        shortcut.textContent = note.name;
        shortcut.setAttribute("aria-label", "Open note: " + note.name);
        shortcut.addEventListener("click", function () {
          selectedNoteId = note.id;
          renderNotes();
          selectToolTab(document.getElementById("tool-tab-notes"));
        });
        calendarNoteLinks.appendChild(shortcut);
      }
    }
    calendarNoteLinks.hidden = linkedNotes.size === 0;
  }

  function calendarDaysBeforeMonth(monthIndex) {
    return calendarSettings.monthDays.slice(0, monthIndex).reduce(function (total, days) {
      return total + days;
    }, 0);
  }

  function renderCalendarMonthDaySettings() {
    const monthNames = calendarNames(calendarSettings.monthNames, calendarSettings.months, "Month");
    calendarMonthDayList.replaceChildren();
    monthNames.forEach(function (name, index) {
      const label = document.createElement("label");
      const monthName = document.createElement("span");
      const input = document.createElement("input");
      label.className = "calendar-month-day-setting";
      monthName.textContent = name;
      input.type = "number";
      input.min = "1";
      input.max = "60";
      input.step = "1";
      input.value = String(calendarSettings.monthDays[index]);
      input.setAttribute("aria-label", "Days in " + name);
      input.addEventListener("change", function () {
        const value = Number(input.value);
        if (!Number.isInteger(value) || value < 1 || value > 60) {
          input.value = String(calendarSettings.monthDays[index]);
          calendarStatus.textContent = "Enter a whole number from 1 to 60.";
          return;
        }
        calendarSettings.monthDays[index] = value;
        saveCalendarSettings();
      });
      label.append(monthName, input);
      calendarMonthDayList.appendChild(label);
    });
  }

  function saveCalendarSettings() {
    storage.set("calendarSettings", calendarSettings);
    renderCalendar();
    renderTimelineBoard();
  }

  function renderCalendar() {
    calendarNoteLinks.hidden = true;
    const monthNames = calendarNames(calendarSettings.monthNames, calendarSettings.months, "Month");
    const dayNames = calendarNames(calendarSettings.dayNames, calendarSettings.weekLength, "Day");
    selectedCalendarMonth = Math.min(selectedCalendarMonth, calendarSettings.months - 1);
    if (selectedCalendarDay && (selectedCalendarDay.month >= calendarSettings.months ||
        selectedCalendarDay.day > calendarSettings.monthDays[selectedCalendarDay.month])) {
      selectedCalendarDay = null;
    }

    calendarYearStart.replaceChildren();
    dayNames.forEach(function (name, index) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = name;
      calendarYearStart.appendChild(option);
    });
    if (calendarSettings.yearStart >= calendarSettings.weekLength) calendarSettings.yearStart = 0;
    calendarYearStart.value = String(calendarSettings.yearStart);

    calendarMonthSelect.replaceChildren();
    monthNames.forEach(function (name, index) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = name;
      calendarMonthSelect.appendChild(option);
    });
    calendarMonthSelect.value = String(selectedCalendarMonth);

    calendarGrid.replaceChildren();
    calendarGrid.style.setProperty("--calendar-week-length", String(calendarSettings.weekLength));
    calendarGrid.setAttribute("aria-label", monthNames[selectedCalendarMonth]);
    dayNames.forEach(function (name) {
      const heading = document.createElement("div");
      heading.className = "calendar-weekday";
      heading.textContent = name;
      calendarGrid.appendChild(heading);
    });

    const firstWeekday = (calendarSettings.yearStart +
      calendarDaysBeforeMonth(selectedCalendarMonth)) % calendarSettings.weekLength;
    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar-day calendar-day--empty";
      emptyCell.setAttribute("aria-hidden", "true");
      calendarGrid.appendChild(emptyCell);
    }
    for (let day = 1; day <= calendarSettings.monthDays[selectedCalendarMonth]; day += 1) {
      const weekdayIndex = (firstWeekday + day - 1) % calendarSettings.weekLength;
      const dayButton = document.createElement("button");
      const selected = selectedCalendarDay &&
        selectedCalendarDay.month === selectedCalendarMonth && selectedCalendarDay.day === day;
      const baseLabel = dayNames[weekdayIndex] + ", " + monthNames[selectedCalendarMonth] + " " + day;
      const hasDetails = hasCalendarDayDetails(selectedCalendarMonth, day);
      dayButton.type = "button";
      dayButton.className = "calendar-day";
      dayButton.textContent = String(day);
      dayButton.dataset.baseLabel = baseLabel;
      dayButton.setAttribute("aria-label", baseLabel +
        (hasDetails ? ", has notes or a linked event" : ""));
      dayButton.classList.toggle("calendar-day--has-details", hasDetails);
      dayButton.setAttribute("aria-pressed", selected ? "true" : "false");
      dayButton.addEventListener("click", function () {
        selectedCalendarDay = { month: selectedCalendarMonth, day: day };
        renderCalendar();
        calendarGrid.querySelectorAll("button.calendar-day")[day - 1].focus();
      });
      calendarGrid.appendChild(dayButton);
    }

    const totalDays = calendarDaysBeforeMonth(calendarSettings.months);
    calendarStatus.textContent = calendarSettings.months + " months · " + totalDays +
      " days total";
    if (!selectedCalendarDay) {
      calendarDayDetails.hidden = true;
      return;
    }
    const selectedDayOfYear = calendarDaysBeforeMonth(selectedCalendarDay.month) + selectedCalendarDay.day;
    const selectedWeekday = (calendarSettings.yearStart + selectedDayOfYear - 1) %
      calendarSettings.weekLength;
    calendarDayTitle.textContent = dayNames[selectedWeekday] + ", " +
      monthNames[selectedCalendarDay.month] + " " + selectedCalendarDay.day;
    calendarDaySummary.textContent = "Day " + selectedDayOfYear + " of " + totalDays +
      " · Week " + Math.ceil(selectedDayOfYear / calendarSettings.weekLength);
    const entry = getCalendarDayEntry();
    calendarDayNote.value = entry.note;
    renderCalendarNoteLinks(entry.note);
    updateCalendarEventOptions();
    calendarDayDetails.hidden = false;
  }

  calendarMonthCount.value = String(calendarSettings.months);
  calendarWeekLength.value = String(calendarSettings.weekLength);
  calendarMonthNames.value = calendarSettings.monthNames;
  calendarDayNames.value = calendarSettings.dayNames;
  renderCalendarMonthDaySettings();

  [
    { input: calendarMonthCount, key: "months", minimum: 1, maximum: 24 },
    { input: calendarWeekLength, key: "weekLength", minimum: 1, maximum: 14 }
  ].forEach(function (control) {
    control.input.addEventListener("change", function () {
      const value = Number(control.input.value);
      if (!Number.isInteger(value) || value < control.minimum || value > control.maximum) {
        control.input.value = String(calendarSettings[control.key]);
        calendarStatus.textContent = "Enter a whole number from " + control.minimum + " to " +
          control.maximum + ".";
        return;
      }
      calendarSettings[control.key] = value;
      if (control.key === "months") {
        const previousMonthDays = calendarSettings.monthDays;
        const addedMonthDays = previousMonthDays[previousMonthDays.length - 1] || 30;
        calendarSettings.monthDays = Array.from({ length: value }, function (_, index) {
          return previousMonthDays[index] || addedMonthDays;
        });
        renderCalendarMonthDaySettings();
      }
      saveCalendarSettings();
    });
  });
  calendarYearStart.addEventListener("change", function () {
    calendarSettings.yearStart = Number(calendarYearStart.value);
    saveCalendarSettings();
  });
  calendarMonthNames.addEventListener("input", function () {
    calendarSettings.monthNames = calendarMonthNames.value;
    renderCalendarMonthDaySettings();
    saveCalendarSettings();
  });
  calendarDayNames.addEventListener("input", function () {
    calendarSettings.dayNames = calendarDayNames.value;
    saveCalendarSettings();
  });
  calendarMonthSelect.addEventListener("change", function () {
    selectedCalendarMonth = Number(calendarMonthSelect.value);
    selectedCalendarDay = null;
    renderCalendar();
  });
  document.getElementById("calendar-previous-month").addEventListener("click", function () {
    selectedCalendarMonth = (selectedCalendarMonth - 1 + calendarSettings.months) % calendarSettings.months;
    selectedCalendarDay = null;
    renderCalendar();
  });
  document.getElementById("calendar-next-month").addEventListener("click", function () {
    selectedCalendarMonth = (selectedCalendarMonth + 1) % calendarSettings.months;
    selectedCalendarDay = null;
    renderCalendar();
  });
  calendarDayNote.addEventListener("input", function () {
    const entry = getCalendarDayEntry();
    if (!entry) return;
    entry.note = calendarDayNote.value;
    saveCalendarDayEntries();
    updateCalendarDayMarker(selectedCalendarDay.month, selectedCalendarDay.day);
    renderCalendarNoteLinks(entry.note);
  });
  calendarDayEvent.addEventListener("change", function () {
    const entry = getCalendarDayEntry();
    if (!entry) return;
    entry.eventId = calendarDayEvent.value;
    saveCalendarDayEntries();
    calendarEventStatus.textContent = "";
    updateCalendarDayMarker(selectedCalendarDay.month, selectedCalendarDay.day);
    renderTimelineBoard();
  });
  renderCalendar();
  renderNotes();

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
    updateCalendarEventOptions();
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

    const eventDates = document.createElement("span");
    eventDates.className = "timeline-marker__date";
    const dates = getCalendarDatesForEvent(marker.id);
    eventDates.hidden = dates.length === 0;
    eventDates.textContent = dates.map(function (date) { return date.label; }).join(", ");
    if (dates.length) {
      const fullDateLabels = dates.map(function (date) { return date.fullLabel; });
      eventDates.title = fullDateLabels.join(", ");
      eventDates.setAttribute("aria-label", "Calendar date" + (dates.length > 1 ? "s" : "") +
        ": " + fullDateLabels.join(", "));
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "timeline-marker__delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", deleteMarker);
    controls.append(colorLabel, eventDates, deleteButton);
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
        populateMapPageOptions();
      });

      const deleteBar = document.createElement("button");
      deleteBar.className = "timeline-column__delete";
      deleteBar.type = "button";
      deleteBar.textContent = "Delete";
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
    populateMapPageOptions();
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

  function configureMapContext(context, color, eraser) {
    if (!context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = (eraser ? 18 : 3) * mapCanvasScale;
    context.strokeStyle = eraser ? "rgba(0,0,0,1)" : color;
    context.globalCompositeOperation = eraser ? "destination-out" : "source-over";
  }

  function resizeMapCanvas() {
    const rect = mapCanvasWrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (isDrawingOnMap) endMapDraw();

    const restorePending = isRestoringMapPage;
    if (restorePending) cancelMapRestore();
    mapCanvasScale = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.round(rect.width * mapCanvasScale);
    const height = Math.round(rect.height * mapCanvasScale);
    if (!restorePending && hasLoadedMapPages) saveMapPageState(activeMapLayer, getActiveMapCanvas());

    [baseMapCanvas, overlayMapCanvas].forEach(function (canvas) {
      if (canvas.width === width && canvas.height === height) return;

      const previousCanvas = document.createElement("canvas");
      if (canvas.width && canvas.height) {
        previousCanvas.width = canvas.width;
        previousCanvas.height = canvas.height;
        previousCanvas.getContext("2d").drawImage(canvas, 0, 0);
      }

      canvas.width = width;
      canvas.height = height;
      if (previousCanvas.width && previousCanvas.height) {
        canvas.getContext("2d").drawImage(previousCanvas, 0, 0, width, height);
      }
    });

    configureMapContext(baseMapContext, mapColorInput.value, isMapEraser);
    configureMapContext(overlayMapContext, mapColorInput.value, isMapEraser);
    if (!hasLoadedMapPages) {
      hasLoadedMapPages = true;
      restoreMapCanvasState(baseMapCanvas, baseMapContext, savedMapPages.base, "base");
    } else if (restorePending && activeMapLayer !== "base") {
      restoreMapCanvasState(overlayMapCanvas, overlayMapContext, savedMapPages[activeMapLayer], activeMapLayer);
    } else {
      saveMapPageState(activeMapLayer, getActiveMapCanvas());
    }
  }

  function getMapPointerPosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(Math.max((event.clientX - rect.left) * canvas.width / rect.width, 0), canvas.width),
      y: Math.min(Math.max((event.clientY - rect.top) * canvas.height / rect.height, 0), canvas.height)
    };
  }

  function getActiveMapCanvas() {
    return activeMapLayer === "base" ? baseMapCanvas : overlayMapCanvas;
  }

  function getActiveMapContext() {
    return activeMapLayer === "base" ? baseMapContext : overlayMapContext;
  }

  function persistMapPages() {
    try {
      localStorage.setItem("mapPageImages", JSON.stringify(savedMapPages));
      mapStatus.textContent = "";
      return true;
    } catch (error) {
      console.error("Could not save map data.", error);
      mapStatus.textContent = "Map could not be saved. Device storage may be full or unavailable.";
      return false;
    }
  }

  function saveMapPageState(pageKey, canvas) {
    const key = pageKey || activeMapLayer;
    const targetCanvas = canvas || getActiveMapCanvas();
    if (!targetCanvas) return;
    if (isRestoringMapPage && key === activeMapLayer) return;
    try {
      savedMapPages[key] = targetCanvas.toDataURL();
      persistMapPages();
    } catch (error) {
      console.error("Could not capture the current map page.", error);
      mapStatus.textContent = "Map could not be saved.";
    }
  }

  function cancelMapRestore() {
    mapRestoreToken += 1;
    isRestoringMapPage = false;
  }

  function restoreMapCanvasState(canvas, context, dataUrl, pageKey) {
    cancelMapRestore();
    const restoreToken = mapRestoreToken;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!dataUrl) return;

    isRestoringMapPage = true;
    const image = new Image();
    image.onload = function () {
      if (restoreToken !== mapRestoreToken || activeMapLayer !== pageKey) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      isRestoringMapPage = false;
    };
    image.onerror = function () {
      if (restoreToken !== mapRestoreToken) return;
      isRestoringMapPage = false;
      console.error("Could not restore the selected map page.");
      mapStatus.textContent = "Could not restore the selected map page.";
    };
    image.src = dataUrl;
  }

  function updateMapView() {
    const isBaseSelected = activeMapLayer === "base";
    baseMapCanvas.hidden = false;
    overlayMapCanvas.hidden = isBaseSelected;
    baseMapCanvas.style.pointerEvents = isBaseSelected ? "auto" : "none";
    overlayMapCanvas.style.pointerEvents = isBaseSelected ? "none" : "auto";
  }

  function beginMapDraw(event) {
    const canvas = event.currentTarget;
    if (isRestoringMapPage || canvas !== getActiveMapCanvas()) return;

    drawingMapCanvas = canvas;
    drawingMapContext = getActiveMapContext();
    drawingMapPage = activeMapLayer;
    drawingMapPointerId = event.pointerId;
    isDrawingOnMap = true;
    lastMapPoint = getMapPointerPosition(event, canvas);
    configureMapContext(drawingMapContext, mapColorInput.value, isMapEraser);
    drawingMapContext.beginPath();
    drawingMapContext.moveTo(lastMapPoint.x, lastMapPoint.y);
    drawingMapContext.lineTo(lastMapPoint.x, lastMapPoint.y);
    drawingMapContext.stroke();
    canvas.setPointerCapture(event.pointerId);
  }

  function drawMapStroke(event) {
    if (!isDrawingOnMap || event.pointerId !== drawingMapPointerId ||
      !drawingMapCanvas || !drawingMapContext || !lastMapPoint) return;
    const point = getMapPointerPosition(event, drawingMapCanvas);
    configureMapContext(drawingMapContext, mapColorInput.value, isMapEraser);
    drawingMapContext.beginPath();
    drawingMapContext.moveTo(lastMapPoint.x, lastMapPoint.y);
    drawingMapContext.lineTo(point.x, point.y);
    drawingMapContext.stroke();
    lastMapPoint = point;
  }

  function endMapDraw(event) {
    if (!isDrawingOnMap) return;
    if (event && event.pointerId !== drawingMapPointerId) return;
    isDrawingOnMap = false;
    lastMapPoint = null;
    saveMapPageState(drawingMapPage, drawingMapCanvas);
    drawingMapCanvas = null;
    drawingMapContext = null;
    drawingMapPage = null;
    drawingMapPointerId = null;
  }

  function toggleMapEraser() {
    isMapEraser = !isMapEraser;
    mapEraserButton.setAttribute("aria-pressed", String(isMapEraser));
    mapEraserButton.classList.toggle("secondary", !isMapEraser);
    configureMapContext(baseMapContext, mapColorInput.value, isMapEraser);
    configureMapContext(overlayMapContext, mapColorInput.value, isMapEraser);
  }

  function populateMapPageOptions() {
    const pages = [{ value: "base", label: "Base" }].concat(
      timelineState.alignmentBars.map(function (bar) {
        return { value: bar.id, label: bar.label.trim() || "Untitled bar" };
      })
    );
    mapPageSelect.replaceChildren();
    pages.forEach(function (page) {
      const option = document.createElement("option");
      option.value = page.value;
      option.textContent = page.label;
      mapPageSelect.appendChild(option);
    });

    if (!pages.some(function (page) { return page.value === activeMapLayer; })) {
      if (activeMapLayer !== "base") saveMapPageState();
      cancelMapRestore();
      activeMapLayer = "base";
      updateMapView();
      restoreMapCanvasState(overlayMapCanvas, overlayMapContext, null, "base");
    }
    mapPageSelect.value = activeMapLayer;
  }

  function switchMapLayer(value) {
    if (isDrawingOnMap) endMapDraw();
    saveMapPageState();
    activeMapLayer = value;
    updateMapView();
    if (value !== "base") {
      restoreMapCanvasState(overlayMapCanvas, overlayMapContext, savedMapPages[value], value);
    } else {
      restoreMapCanvasState(overlayMapCanvas, overlayMapContext, null, value);
    }
  }

  clearMapButton.addEventListener("click", function () {
    const targetCanvas = activeMapLayer === "base" ? baseMapCanvas : overlayMapCanvas;
    const targetContext = activeMapLayer === "base" ? baseMapContext : overlayMapContext;
    if (!targetCanvas || !targetContext) return;
    cancelMapRestore();
    targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    savedMapPages[activeMapLayer] = null;
    persistMapPages();
  });

  mapEraserButton.addEventListener("click", toggleMapEraser);

  mapColorInput.addEventListener("input", function () {
    if (!isMapEraser) {
      configureMapContext(baseMapContext, mapColorInput.value, false);
      configureMapContext(overlayMapContext, mapColorInput.value, false);
    }
  });

  mapPageSelect.addEventListener("change", function () {
    switchMapLayer(mapPageSelect.value);
  });

  baseMapCanvas.addEventListener("pointerdown", beginMapDraw);
  overlayMapCanvas.addEventListener("pointerdown", beginMapDraw);
  baseMapCanvas.addEventListener("pointermove", drawMapStroke);
  overlayMapCanvas.addEventListener("pointermove", drawMapStroke);
  baseMapCanvas.addEventListener("pointerup", endMapDraw);
  overlayMapCanvas.addEventListener("pointerup", endMapDraw);
  baseMapCanvas.addEventListener("pointercancel", endMapDraw);
  overlayMapCanvas.addEventListener("pointercancel", endMapDraw);
  baseMapCanvas.addEventListener("lostpointercapture", endMapDraw);
  overlayMapCanvas.addEventListener("lostpointercapture", endMapDraw);
  resizeMapCanvas();
  updateMapView();
  populateMapPageOptions();

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
    if (tab.id === "tool-tab-sketch") resizeMapCanvas();
    if (tab.id === "tool-tab-calendar") renderCalendar();
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

    if (current === "create") {
      renderFlowCanvas();
      resizeMapCanvas();
    }
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
    if (window.location.hash === "#create") {
      renderFlowCanvas();
      resizeMapCanvas();
    }
  });

  // ----------------------------------------------------------
  // 5. Start up.
  // ----------------------------------------------------------
  renderListings();
  showView();
})();
