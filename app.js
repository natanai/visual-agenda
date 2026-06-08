(function () {
  "use strict";

  const STORAGE_KEY = "visual-agenda-static-v1";
  const MIN_BLOCK_SECONDS = 18;
  const DEFAULT_THEME = {
    fontFamily: "system-ui, sans-serif",
    backgroundColor: "#f7f4ef",
    surfaceColor: "#ffffff",
    textColor: "#1f1f1f",
    mutedTextColor: "#666666",
    borderColor: "#1f1f1f",
    activeColor: "#d7e8ff",
    completedColor: "#d7f5df",
    pendingColor: "#ffffff",
    offTopicColor: "#ffe2c7",
    fillColor: "rgba(0, 0, 0, 0.16)",
    borderWidth: 2,
    borderRadius: 14,
    itemGap: 8
  };

  const state = {
    mode: "setup",
    meetingTitle: "Visual Agenda",
    totalMinutes: 30,
    activeIndex: null,
    isOffTopic: false,
    meetingStartedAt: null,
    meetingEndedAt: null,
    now: Date.now(),
    items: [],
    segments: [],
    theme: Object.assign({}, DEFAULT_THEME)
  };

  window.visualAgendaState = state;

  let timerId = null;
  let styleJsonValue = "";
  let isCustomizerOpen = false;

  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Visual Agenda could not find #app.");
  }

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return prefix + "-" + window.crypto.randomUUID();
    }
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function createAgendaItem(title) {
    return {
      id: makeId("item"),
      title: title || "Agenda item",
      durationMode: "auto",
      plannedMinutes: 5,
      completed: false
    };
  }

  function createSegment(type, itemId) {
    return {
      id: makeId("segment"),
      type: type,
      itemId: itemId || null,
      startedAt: Date.now(),
      endedAt: null
    };
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function toNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(number, min, max) {
    return Math.min(max, Math.max(min, number));
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    if (hours > 0) {
      return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }
    return minutes + ":" + String(secs).padStart(2, "0");
  }

  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function button(text, className, onClick) {
    const element = el("button", className || "", text);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
  }

  function label(text, input) {
    const wrapper = el("label");
    wrapper.append(el("span", "", text), input);
    return wrapper;
  }

  function input(type, value, onInput, onBlur) {
    const element = document.createElement("input");
    element.type = type;
    element.value = value;
    element.addEventListener("input", function () {
      onInput(element.value, element);
    });
    if (onBlur) {
      element.addEventListener("blur", function () {
        onBlur(element.value, element);
      });
    }
    return element;
  }

  function select(options, value, onChange) {
    const element = document.createElement("select");
    options.forEach(function (option) {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      element.append(item);
    });
    element.value = value;
    element.addEventListener("change", function () {
      onChange(element.value);
    });
    return element;
  }

  function closeOpenSegment() {
    const open = state.segments.find(function (segment) {
      return segment.endedAt === null;
    });
    if (open) open.endedAt = Date.now();
  }

  function getActiveItem() {
    if (state.activeIndex === null) return null;
    return state.items[state.activeIndex] || null;
  }

  function getNextIncompleteIndex(startAt) {
    for (let index = startAt; index < state.items.length; index += 1) {
      if (!state.items[index].completed) return index;
    }
    return null;
  }

  function persistSetup() {
    try {
      const payload = {
        meetingTitle: state.meetingTitle,
        totalMinutes: state.totalMinutes,
        items: state.items,
        theme: state.theme
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Storage may be unavailable for local files or private browsing; the app should keep working.
    }
  }

  function isValidItem(item) {
    return isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      (item.durationMode === "auto" || item.durationMode === "manual") &&
      Number.isFinite(Number(item.plannedMinutes));
  }

  function isValidTheme(theme) {
    if (!isRecord(theme)) return false;
    return Object.keys(DEFAULT_THEME).every(function (key) {
      return key in theme;
    });
  }

  function loadSavedSetup() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!isRecord(saved)) return;
      if (typeof saved.meetingTitle === "string") state.meetingTitle = saved.meetingTitle;
      if (Number.isFinite(Number(saved.totalMinutes)) && Number(saved.totalMinutes) > 0) {
        state.totalMinutes = Number(saved.totalMinutes);
      }
      if (Array.isArray(saved.items) && saved.items.every(isValidItem)) {
        state.items = saved.items.map(function (item) {
          return {
            id: item.id,
            title: item.title,
            durationMode: item.durationMode,
            plannedMinutes: Math.max(0, Number(item.plannedMinutes)),
            completed: false
          };
        });
      }
      if (isValidTheme(saved.theme)) {
        state.theme = Object.assign({}, DEFAULT_THEME, saved.theme);
      }
    } catch (error) {
      // Malformed saved data is ignored so the fallback setup screen remains usable.
    }
  }

  function getResolvedPlannedSeconds() {
    const totalSeconds = Math.max(0, Number(state.totalMinutes) * 60);
    const result = {};
    let manualSeconds = 0;
    const autoItems = [];

    state.items.forEach(function (item) {
      if (item.durationMode === "manual") {
        const seconds = Math.max(0, Number(item.plannedMinutes) * 60);
        result[item.id] = seconds;
        manualSeconds += seconds;
      } else {
        autoItems.push(item);
      }
    });

    const remainingSeconds = Math.max(0, totalSeconds - manualSeconds);
    const autoSeconds = autoItems.length ? remainingSeconds / autoItems.length : 0;
    autoItems.forEach(function (item) {
      result[item.id] = autoSeconds;
    });

    return result;
  }

  function getSegmentDuration(segment) {
    const endedAt = segment.endedAt === null ? state.now : segment.endedAt;
    return Math.max(0, (endedAt - segment.startedAt) / 1000);
  }

  function getItemActualSeconds(itemId) {
    return state.segments.reduce(function (sum, segment) {
      if (segment.type === "agenda" && segment.itemId === itemId) {
        return sum + getSegmentDuration(segment);
      }
      return sum;
    }, 0);
  }

  function getOffTopicSeconds() {
    return state.segments.reduce(function (sum, segment) {
      return segment.type === "offTopic" ? sum + getSegmentDuration(segment) : sum;
    }, 0);
  }

  function getTotalElapsedSeconds() {
    return state.segments.reduce(function (sum, segment) {
      return sum + getSegmentDuration(segment);
    }, 0);
  }

  function calculateVisualBlocks() {
    const planned = getResolvedPlannedSeconds();
    const totalMeetingSeconds = Math.max(1, Number(state.totalMinutes) * 60);
    const activeItem = getActiveItem();
    const offTopicSeconds = getOffTopicSeconds();
    const completedEntries = [];
    const pendingEntries = [];
    let activeEntry = null;
    let committedVisualSeconds = offTopicSeconds;

    state.items.forEach(function (item) {
      const plannedSeconds = Math.max(0, planned[item.id] || 0);
      const actualSeconds = getItemActualSeconds(item.id);
      const isActive = activeItem && activeItem.id === item.id && state.mode !== "setup" && state.mode !== "ended";
      if (state.mode === "setup") {
        pendingEntries.push({ item, plannedSeconds, actualSeconds: 0, visualSeconds: plannedSeconds, status: "pending" });
      } else if (item.completed || (state.mode === "ended" && actualSeconds > 0)) {
        const visualSeconds = Math.max(0, actualSeconds);
        completedEntries.push({ item, plannedSeconds, actualSeconds, visualSeconds, status: "completed" });
        committedVisualSeconds += visualSeconds;
      } else if (isActive) {
        const visualSeconds = Math.max(plannedSeconds, actualSeconds);
        activeEntry = { item, plannedSeconds, actualSeconds, visualSeconds, status: "active" };
        committedVisualSeconds += visualSeconds;
      } else {
        pendingEntries.push({ item, plannedSeconds, actualSeconds, visualSeconds: plannedSeconds, status: "pending" });
      }
    });

    if (state.mode !== "setup") {
      const pendingPlanTotal = pendingEntries.reduce(function (sum, entry) {
        return sum + entry.plannedSeconds;
      }, 0);
      const remainingSeconds = totalMeetingSeconds - committedVisualSeconds;
      pendingEntries.forEach(function (entry) {
        if (remainingSeconds < 0) {
          entry.visualSeconds = MIN_BLOCK_SECONDS;
        } else if (pendingPlanTotal > 0) {
          entry.visualSeconds = remainingSeconds * (entry.plannedSeconds / pendingPlanTotal);
        } else {
          entry.visualSeconds = pendingEntries.length ? remainingSeconds / pendingEntries.length : 0;
        }
      });
    }

    const entriesById = {};
    completedEntries.concat(pendingEntries).forEach(function (entry) {
      entriesById[entry.item.id] = entry;
    });
    if (activeEntry) entriesById[activeEntry.item.id] = activeEntry;

    const orderedEntries = [];
    state.items.forEach(function (item) {
      const entry = entriesById[item.id];
      if (entry) {
        orderedEntries.push(entry);
        if (activeItem && item.id === activeItem.id && offTopicSeconds > 0) {
          orderedEntries.push({
            id: "off-topic",
            type: "offTopic",
            title: "Off topic",
            status: "off-topic",
            plannedSeconds: 0,
            actualSeconds: offTopicSeconds,
            visualSeconds: offTopicSeconds,
            fillPercent: 100
          });
        }
      }
    });

    if ((!activeItem || state.mode === "ended") && offTopicSeconds > 0 && !orderedEntries.some(function (entry) { return entry.type === "offTopic"; })) {
      orderedEntries.push({
        id: "off-topic",
        type: "offTopic",
        title: "Off topic",
        status: "off-topic",
        plannedSeconds: 0,
        actualSeconds: offTopicSeconds,
        visualSeconds: offTopicSeconds,
        fillPercent: 100
      });
    }

    const sumVisualSeconds = orderedEntries.reduce(function (sum, entry) {
      return sum + Math.max(0, entry.visualSeconds || 0);
    }, 0);
    const totalVisualSeconds = Math.max(totalMeetingSeconds, sumVisualSeconds, 1);

    return orderedEntries.map(function (entry) {
      const type = entry.type || "agenda";
      const id = entry.id || entry.item.id;
      const visualSeconds = Math.max(0, Number(entry.visualSeconds) || 0);
      const fillPercent = type === "offTopic" || entry.status === "completed"
        ? 100
        : entry.status === "active"
          ? clamp(visualSeconds > 0 ? (entry.actualSeconds / visualSeconds) * 100 : 0, 0, 100)
          : 0;
      const heightPercent = clamp((visualSeconds / totalVisualSeconds) * 100 || 0, 0, 100);
      return {
        id: id,
        type: type,
        title: entry.title || entry.item.title,
        status: entry.status,
        plannedSeconds: Math.max(0, entry.plannedSeconds || 0),
        actualSeconds: Math.max(0, entry.actualSeconds || 0),
        visualSeconds: visualSeconds,
        heightPercent: heightPercent,
        fillPercent: fillPercent
      };
    });
  }

  window.getResolvedPlannedSeconds = getResolvedPlannedSeconds;
  window.getSegmentDuration = getSegmentDuration;
  window.getItemActualSeconds = getItemActualSeconds;
  window.getOffTopicSeconds = getOffTopicSeconds;
  window.getTotalElapsedSeconds = getTotalElapsedSeconds;
  window.calculateVisualBlocks = calculateVisualBlocks;

  function applyTheme() {
    const root = document.documentElement;
    root.style.setProperty("--font-family", state.theme.fontFamily);
    root.style.setProperty("--background-color", state.theme.backgroundColor);
    root.style.setProperty("--surface-color", state.theme.surfaceColor);
    root.style.setProperty("--text-color", state.theme.textColor);
    root.style.setProperty("--muted-text-color", state.theme.mutedTextColor);
    root.style.setProperty("--border-color", state.theme.borderColor);
    root.style.setProperty("--active-color", state.theme.activeColor);
    root.style.setProperty("--completed-color", state.theme.completedColor);
    root.style.setProperty("--pending-color", state.theme.pendingColor);
    root.style.setProperty("--off-topic-color", state.theme.offTopicColor);
    root.style.setProperty("--fill-color", state.theme.fillColor);
    root.style.setProperty("--border-width", state.theme.borderWidth + "px");
    root.style.setProperty("--border-radius", state.theme.borderRadius + "px");
    root.style.setProperty("--item-gap", state.theme.itemGap + "px");
  }

  function startTimer() {
    stopTimer();
    if (state.mode === "running") {
      timerId = window.setInterval(function () {
        state.now = Date.now();
        render();
      }, 500);
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startMeeting() {
    if (!state.items.length) return;
    state.items.forEach(function (item) { item.completed = false; });
    state.mode = "running";
    state.activeIndex = getNextIncompleteIndex(0);
    state.isOffTopic = false;
    state.now = Date.now();
    state.meetingStartedAt = state.now;
    state.meetingEndedAt = null;
    state.segments = [createSegment("agenda", getActiveItem().id)];
    startTimer();
    render();
  }

  function pauseMeeting() {
    if (state.mode !== "running") return;
    closeOpenSegment();
    state.mode = "paused";
    state.now = Date.now();
    stopTimer();
    render();
  }

  function resumeMeeting() {
    if (state.mode !== "paused") return;
    const active = getActiveItem();
    state.mode = "running";
    state.now = Date.now();
    if (state.isOffTopic) {
      state.segments.push(createSegment("offTopic", null));
    } else if (active) {
      state.segments.push(createSegment("agenda", active.id));
    }
    startTimer();
    render();
  }

  function toggleOffTopic() {
    if (state.mode !== "running") return;
    closeOpenSegment();
    state.now = Date.now();
    const active = getActiveItem();
    if (state.isOffTopic) {
      state.isOffTopic = false;
      if (active) state.segments.push(createSegment("agenda", active.id));
    } else {
      state.isOffTopic = true;
      state.segments.push(createSegment("offTopic", null));
    }
    render();
  }

  function doneNext() {
    if (state.mode !== "running") return;
    if (state.isOffTopic) toggleOffTopic();
    closeOpenSegment();
    const active = getActiveItem();
    if (active) active.completed = true;
    const nextIndex = getNextIncompleteIndex((state.activeIndex || 0) + 1);
    state.activeIndex = nextIndex;
    state.now = Date.now();
    if (nextIndex === null) {
      endMeeting();
      return;
    }
    state.segments.push(createSegment("agenda", getActiveItem().id));
    render();
  }

  function endMeeting() {
    if (state.mode === "ended") return;
    closeOpenSegment();
    state.mode = "ended";
    state.isOffTopic = false;
    state.activeIndex = null;
    state.meetingEndedAt = Date.now();
    state.now = state.meetingEndedAt;
    stopTimer();
    render();
  }

  function resetMeeting() {
    stopTimer();
    state.mode = "setup";
    state.meetingTitle = "Visual Agenda";
    state.totalMinutes = 30;
    state.activeIndex = null;
    state.isOffTopic = false;
    state.meetingStartedAt = null;
    state.meetingEndedAt = null;
    state.now = Date.now();
    state.items = [];
    state.segments = [];
    state.theme = Object.assign({}, DEFAULT_THEME);
    persistSetup();
    render();
  }

  function backToSetupSameAgenda() {
    stopTimer();
    state.mode = "setup";
    state.activeIndex = null;
    state.isOffTopic = false;
    state.meetingStartedAt = null;
    state.meetingEndedAt = null;
    state.now = Date.now();
    state.segments = [];
    state.items.forEach(function (item) { item.completed = false; });
    persistSetup();
    render();
  }

  function addAgendaItem() {
    state.items.push(createAgendaItem("Agenda item " + (state.items.length + 1)));
    persistSetup();
    render();
  }

  function moveItem(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= state.items.length) return;
    const item = state.items.splice(index, 1)[0];
    state.items.splice(next, 0, item);
    persistSetup();
    render();
  }

  function deleteItem(index) {
    state.items.splice(index, 1);
    persistSetup();
    render();
  }

  function renderStatusBar(parent) {
    const statusBar = el("div", "status-bar");
    statusBar.append(el("span", "pill", "Mode: " + state.mode));
    statusBar.append(el("span", "pill", "Elapsed: " + formatDuration(getTotalElapsedSeconds())));
    statusBar.append(el("span", "pill", "Off topic: " + formatDuration(getOffTopicSeconds())));
    parent.append(statusBar);
  }

  function renderSetupControls(parent) {
    const panel = el("section", "panel");
    panel.append(el("p", "eyebrow", "Setup"), el("h2", "Plan the meeting"));

    const fields = el("div", "field-grid two");
    fields.append(
      label("Meeting title", input("text", state.meetingTitle, function (value) {
        state.meetingTitle = value || "Visual Agenda";
        persistSetup();
      })),
      label("Total meeting length (minutes)", input("number", state.totalMinutes, function (value, inputElement) {
        inputElement.min = "1";
        state.totalMinutes = Math.max(1, toNumber(value, 30));
        persistSetup();
      }))
    );
    panel.append(fields);

    const planned = getResolvedPlannedSeconds();
    const manualSeconds = state.items.reduce(function (sum, item) {
      return item.durationMode === "manual" ? sum + Math.max(0, item.plannedMinutes * 60) : sum;
    }, 0);
    if (manualSeconds > state.totalMinutes * 60) {
      panel.append(el("p", "warning", "Manual agenda durations exceed the total meeting length. Auto items will receive 0 minutes."));
    }

    const editor = el("div", "item-editor");
    state.items.forEach(function (item, index) {
      const card = el("section", "item-card");
      const grid = el("div", "item-card-grid");
      grid.append(
        label("Agenda item title", input("text", item.title, function (value) {
          item.title = value;
          persistSetup();
        })),
        label("Duration mode", select([
          { value: "auto", label: "Auto" },
          { value: "manual", label: "Manual" }
        ], item.durationMode, function (value) {
          item.durationMode = value;
          persistSetup();
          render();
        })),
        label("Planned minutes", input("number", item.plannedMinutes, function (value) {
          item.plannedMinutes = Math.max(0, toNumber(value, 0));
          persistSetup();
        }))
      );
      const minuteInput = grid.querySelector("label:last-child input");
      minuteInput.disabled = item.durationMode === "auto";
      minuteInput.min = "0";
      card.append(grid);
      card.append(el("p", "block-meta", "Resolved plan: " + formatDuration(planned[item.id] || 0)));
      const actions = el("div", "item-actions");
      actions.append(
        button("Move up", "", function () { moveItem(index, -1); }),
        button("Move down", "", function () { moveItem(index, 1); }),
        button("Delete", "danger", function () { deleteItem(index); })
      );
      card.append(actions);
      editor.append(card);
    });
    panel.append(editor);

    const row = el("div", "button-row");
    row.append(button("Start Meeting", "primary", startMeeting));
    row.firstChild.disabled = state.items.length === 0;
    panel.append(row);
    parent.append(panel);
  }

  function renderMeetingControls(parent) {
    const panel = el("section", "panel");
    panel.append(el("p", "eyebrow", "Controls"), el("h2", state.mode === "paused" ? "Meeting paused" : "Meeting controls"));
    renderStatusBar(panel);
    const row = el("div", "button-row");
    if (state.mode === "paused") {
      row.append(button("Resume", "primary", resumeMeeting));
    } else if (state.mode === "running") {
      row.append(
        button("Done / Next", "primary", doneNext),
        button("Pause", "", pauseMeeting),
        button(state.isOffTopic ? "Back to topic" : "Off topic", "", toggleOffTopic),
        button("End Meeting", "danger", endMeeting)
      );
    } else if (state.mode === "ended") {
      row.append(
        button("Reset Meeting", "danger", resetMeeting),
        button("Back to Setup With Same Agenda", "", backToSetupSameAgenda)
      );
    }
    panel.append(row);
    parent.append(panel);
  }

  function renderAgendaStack(parent) {
    const shell = el("section", "panel agenda-shell");
    shell.append(el("p", "eyebrow", "Visual stack"), el("h2", state.meetingTitle));
    const stack = el("div", "agenda-stack");
    stack.setAttribute("aria-label", "Visual meeting agenda");

    const blocks = calculateVisualBlocks();
    if (!blocks.length) {
      stack.append(el("div", "empty-note", "No agenda items yet."));
    }

    blocks.forEach(function (visualBlock) {
      const block = el("article", "agenda-block " + visualBlock.status.replace("-", "-"));
      block.style.flexBasis = visualBlock.heightPercent + "%";
      block.style.minHeight = "36px";

      const fill = el("div", "block-fill");
      fill.style.height = visualBlock.fillPercent + "%";
      block.append(fill);

      const content = el("div", "block-content");
      const top = el("div", "block-topline");
      top.append(el("span", "block-title", visualBlock.title), el("span", "block-status", labelForStatus(visualBlock.status)));
      content.append(top);
      content.append(el("span", "block-meta", "Planned " + formatDuration(visualBlock.plannedSeconds) + " · Actual " + formatDuration(visualBlock.actualSeconds)));
      block.append(content);
      stack.append(block);
    });

    if (state.mode === "setup") {
      stack.append(button("+ Add agenda item", "add-inside-stack", addAgendaItem));
    }

    shell.append(stack);
    parent.append(shell);
  }

  function labelForStatus(status) {
    if (status === "active") return "Active";
    if (status === "completed") return "Completed";
    if (status === "off-topic") return "Off topic";
    return "Pending";
  }

  function colorValue(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  }

  function renderCustomizer(parent) {
    const wrapper = el("section", "customizer-floating");
    const toggle = button(isCustomizerOpen ? "Close customize" : "Customize", "primary customizer-toggle", function () {
      isCustomizerOpen = !isCustomizerOpen;
      render();
    });
    toggle.setAttribute("aria-expanded", String(isCustomizerOpen));
    wrapper.append(toggle);

    if (!isCustomizerOpen) {
      parent.append(wrapper);
      return;
    }

    const panel = el("div", "panel customizer-popover");
    panel.append(el("p", "eyebrow", "Customize"), el("h2", "Style controls"));
    const grid = el("div", "customizer-grid");

    grid.append(label("Font family", select([
      { value: "system-ui, sans-serif", label: "System" },
      { value: "Georgia, serif", label: "Serif" },
      { value: "Arial, sans-serif", label: "Arial" },
      { value: "Courier New, monospace", label: "Monospace" }
    ], state.theme.fontFamily, function (value) {
      state.theme.fontFamily = value;
      persistSetup();
      applyTheme();
    })));

    [
      ["Background color", "backgroundColor"],
      ["Surface color", "surfaceColor"],
      ["Text color", "textColor"],
      ["Muted text color", "mutedTextColor"],
      ["Border color", "borderColor"],
      ["Active item color", "activeColor"],
      ["Completed item color", "completedColor"],
      ["Pending item color", "pendingColor"],
      ["Off-topic color", "offTopicColor"],
      ["Fill color", "fillColor"]
    ].forEach(function (entry) {
      grid.append(label(entry[0], input("color", colorValue(state.theme[entry[1]]), function (value) {
        state.theme[entry[1]] = value;
        persistSetup();
        applyTheme();
      })));
    });

    [
      ["Border width", "borderWidth", 1, 8],
      ["Corner roundness", "borderRadius", 0, 32],
      ["Item gap", "itemGap", 0, 24]
    ].forEach(function (entry) {
      const control = input("range", state.theme[entry[1]], function (value) {
        state.theme[entry[1]] = toNumber(value, DEFAULT_THEME[entry[1]]);
        persistSetup();
        applyTheme();
      });
      control.min = entry[2];
      control.max = entry[3];
      grid.append(label(entry[0] + " (" + state.theme[entry[1]] + "px)", control));
    });

    panel.append(grid);
    const row = el("div", "button-row");
    row.append(
      button("Reset style", "", function () {
        state.theme = Object.assign({}, DEFAULT_THEME);
        styleJsonValue = "";
        persistSetup();
        render();
      }),
      button("Export style JSON", "", function () {
        styleJsonValue = JSON.stringify(state.theme, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(styleJsonValue).catch(function () {});
        }
        render();
      }),
      button("Import style JSON", "", function () {
        const value = window.prompt("Paste style JSON");
        if (!value) return;
        try {
          const parsed = JSON.parse(value);
          if (!isValidTheme(parsed)) throw new Error("Invalid theme JSON");
          state.theme = Object.assign({}, DEFAULT_THEME, parsed);
          styleJsonValue = "";
          persistSetup();
          render();
        } catch (error) {
          window.alert("Style JSON could not be imported.");
        }
      })
    );
    panel.append(row);
    if (styleJsonValue) {
      const area = document.createElement("textarea");
      area.className = "style-json";
      area.readOnly = true;
      area.value = styleJsonValue;
      panel.append(label("Exported style JSON", area));
    }
    wrapper.append(panel);
    parent.append(wrapper);
  }

  function renderSummary(parent) {
    if (state.mode !== "ended") return;
    const planned = getResolvedPlannedSeconds();
    const totalElapsed = getTotalElapsedSeconds();
    const plannedMeeting = state.totalMinutes * 60;
    const difference = totalElapsed - plannedMeeting;
    const status = difference < -1 ? "Ended early" : difference > 1 ? "Overtime" : "On time";
    const panel = el("section", "summary-panel");
    panel.append(el("p", "eyebrow", "Summary"), el("h2", "Final meeting summary"));
    const grid = el("div", "summary-grid");
    [
      ["Planned meeting length", formatDuration(plannedMeeting)],
      ["Actual elapsed time", formatDuration(totalElapsed)],
      ["Total off-topic time", formatDuration(getOffTopicSeconds())],
      ["Result", status]
    ].forEach(function (entry) {
      const card = el("div", "summary-card");
      card.append(el("span", "", entry[0]), el("strong", "", entry[1]));
      grid.append(card);
    });
    panel.append(grid);

    const table = el("table", "summary-table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Agenda item", "Planned", "Actual"].forEach(function (heading) {
      headRow.append(el("th", "", heading));
    });
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    state.items.forEach(function (item) {
      const row = document.createElement("tr");
      row.append(el("td", "", item.title), el("td", "", formatDuration(planned[item.id] || 0)), el("td", "", formatDuration(getItemActualSeconds(item.id))));
      tbody.append(row);
    });
    table.append(thead, tbody);
    panel.append(table);
    parent.append(panel);
  }

  function render() {
    document.querySelectorAll(".summary-panel").forEach(function (summary) {
      summary.remove();
    });
    applyTheme();
    app.className = "app-layout";
    app.replaceChildren();

    const left = el("div", "left-column");
    const right = el("div", "right-column");

    if (state.mode === "setup") {
      renderSetupControls(left);
    } else {
      renderMeetingControls(left);
    }
    renderCustomizer(left);
    renderAgendaStack(right);
    app.append(left, right);
    renderSummary(document.body);
  }

  loadSavedSetup();
  render();
})();
