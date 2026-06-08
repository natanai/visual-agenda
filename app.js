var STORAGE_KEY = "visual-agenda-static-v1";
var timerId = null;

var defaultTheme = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  backgroundColor: "#f8f6f1",
  surfaceColor: "#ffffff",
  textColor: "#1f1f1f",
  mutedTextColor: "#666666",
  borderColor: "#1f1f1f",
  activeColor: "#d7e8ff",
  completedColor: "#d7f5df",
  pendingColor: "#ffffff",
  offTopicColor: "#ffe2c7",
  fillColor: "rgba(0, 0, 0, 0.16)",
  borderWidth: 1,
  borderRadius: 6,
  itemGap: 6
};

var state = {
  mode: "setup",
  meetingTitle: "Visual Agenda",
  totalMinutes: 30,
  activeItemId: null,
  isOffTopic: false,
  meetingStartedAt: null,
  meetingEndedAt: null,
  now: Date.now(),
  items: [],
  segments: [],
  theme: copyTheme(defaultTheme),
  isCustomizerOpen: false,
  editingItemId: null
};

var fontOptions = {
  "System UI": "system-ui, sans-serif",
  "Serif": "Georgia, 'Times New Roman', serif",
  "Monospace": "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  "Large Print": "Arial, Verdana, sans-serif"
};

function copyTheme(theme) {
  var next = {};
  Object.keys(defaultTheme).forEach(function (key) {
    next[key] = theme && theme[key] !== undefined ? theme[key] : defaultTheme[key];
  });
  return next;
}

function createId(prefix) {
  var value;
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    value = window.crypto.randomUUID();
  } else {
    value = Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  return prefix + "-" + value;
}

function createItem() {
  return {
    id: createId("item"),
    title: "Agenda item",
    durationMode: "manual",
    plannedMinutes: 5,
    completed: false
  };
}

function createSegment(type, itemId, now) {
  return {
    id: createId("segment"),
    type: type,
    itemId: itemId || null,
    startedAt: now,
    endedAt: null
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return;

    if (typeof saved.meetingTitle === "string" && saved.meetingTitle.trim()) {
      state.meetingTitle = saved.meetingTitle;
    }
    var total = Number(saved.totalMinutes);
    if (isFinite(total) && total > 0) {
      state.totalMinutes = Math.min(1440, total);
    }
    if (Array.isArray(saved.items)) {
      state.items = saved.items.map(function (item) {
        return {
          id: typeof item.id === "string" ? item.id : createId("item"),
          title: typeof item.title === "string" && item.title.trim() ? item.title : "Agenda item",
          durationMode: item.durationMode === "manual" ? "manual" : "auto",
          plannedMinutes: sanitizeMinutes(item.plannedMinutes, 5),
          completed: false
        };
      });
    }
    if (saved.theme && typeof saved.theme === "object") {
      state.theme = validateTheme(saved.theme, state.theme);
    }
  } catch (error) {
    console.warn("Ignoring saved Visual Agenda state:", error);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      meetingTitle: state.meetingTitle,
      totalMinutes: state.totalMinutes,
      items: state.items,
      theme: state.theme
    }));
  } catch (error) {
    console.warn("Visual Agenda could not save state:", error);
  }
}

function validateTheme(theme, fallback) {
  var next = copyTheme(fallback || defaultTheme);
  var colorKeys = ["backgroundColor", "surfaceColor", "textColor", "mutedTextColor", "borderColor", "activeColor", "completedColor", "pendingColor", "offTopicColor"];
  colorKeys.forEach(function (key) {
    if (typeof theme[key] === "string" && /^#[0-9a-fA-F]{6}$/.test(theme[key])) next[key] = theme[key];
  });
  if (typeof theme.fillColor === "string" && (/^#[0-9a-fA-F]{6}$/.test(theme.fillColor) || /^rgba?\([0-9.,\s]+\)$/.test(theme.fillColor))) next.fillColor = theme.fillColor;
  if (typeof theme.fontFamily === "string" && theme.fontFamily.length <= 80) next.fontFamily = theme.fontFamily;
  next.borderWidth = clampNumber(theme.borderWidth, 1, 8, next.borderWidth);
  next.borderRadius = clampNumber(theme.borderRadius, 0, 36, next.borderRadius);
  next.itemGap = clampNumber(theme.itemGap, 0, 24, next.itemGap);
  return next;
}

function applyTheme() {
  var root = document.documentElement;
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

function render() {
  applyTheme();
  manageTimer();
  var app = document.getElementById("app");
  app.textContent = "";
  if (state.mode === "running") app.appendChild(renderRunning());
  else if (state.mode === "paused") app.appendChild(renderPaused());
  else if (state.mode === "ended") app.appendChild(renderEnded());
  else app.appendChild(renderSetup());
}

function renderSetup() {
  syncAutoItemMinutes();
  var shell = div("app-shell");
  var agendaPanel = div("agenda-panel");
  agendaPanel.appendChild(renderAgendaStack());
  shell.appendChild(agendaPanel);

  var side = div("side-panel");
  var panel = div("panel");
  panel.appendChild(heading("h2", "Setup"));
  var form = div("form-grid two");
  form.appendChild(labelInput("Meeting title", "text", state.meetingTitle, function (value) {
    state.meetingTitle = value || "Visual Agenda";
    saveState();
  }));
  form.appendChild(labelInput("Total minutes", "number", state.totalMinutes, function (value) {
    state.totalMinutes = sanitizeMinutes(value, 30);
    syncAutoItemMinutes();
    saveState();
    render();
  }, { min: "1", step: "1" }));
  panel.appendChild(form);

  var manualSeconds = state.items.reduce(function (sum, item) {
    return sum + (item.durationMode === "manual" ? sanitizeMinutes(item.plannedMinutes, 0) * 60 : 0);
  }, 0);
  if (manualSeconds > state.totalMinutes * 60) {
    var warning = paragraph("Manual durations exceed the total meeting length. Auto items receive 0 planned time, but you can still start the meeting.", "warning");
    panel.appendChild(warning);
  }

  var row = div("button-row");
  var start = button("Start Meeting", startMeeting, "primary");
  start.disabled = state.items.length === 0;
  row.appendChild(start);
  panel.appendChild(row);
  side.appendChild(panel);
  side.appendChild(renderCustomizer());
  shell.appendChild(side);
  return shell;
}

function renderRunning() {
  var shell = div("app-shell");
  var agendaPanel = div("agenda-panel");
  agendaPanel.appendChild(renderAgendaStack());
  shell.appendChild(agendaPanel);
  var side = div("side-panel");
  var panel = div("panel");
  panel.appendChild(heading("h2", state.meetingTitle));
  var row = div("button-row");
  row.appendChild(button("Done / Next", doneNext, "primary"));
  row.appendChild(button(state.isOffTopic ? "Back to Topic" : "Off Topic", toggleOffTopic, state.isOffTopic ? "primary" : "danger"));
  row.appendChild(button("Pause", pauseMeeting));
  row.appendChild(button("End Meeting", endMeeting));
  panel.appendChild(row);
  side.appendChild(panel);
  side.appendChild(renderCustomizer());
  shell.appendChild(side);
  return shell;
}

function renderPaused() {
  var shell = div("app-shell");
  var agendaPanel = div("agenda-panel");
  agendaPanel.appendChild(renderAgendaStack());
  shell.appendChild(agendaPanel);
  var side = div("side-panel");
  var panel = div("panel");
  panel.appendChild(heading("h2", "Paused"));
  panel.appendChild(paragraph("Timing is paused. Resume to continue the current segment.", "muted"));
  var row = div("button-row");
  row.appendChild(button("Resume", resumeMeeting, "primary"));
  row.appendChild(button("End Meeting", endMeeting));
  panel.appendChild(row);
  side.appendChild(panel);
  side.appendChild(renderCustomizer());
  shell.appendChild(side);
  return shell;
}

function renderEnded() {
  var shell = div("app-shell");
  var agendaPanel = div("agenda-panel");
  agendaPanel.appendChild(renderAgendaStack());
  shell.appendChild(agendaPanel);
  var side = div("side-panel");
  var panel = div("panel");
  panel.appendChild(heading("h2", "Meeting ended"));
  panel.appendChild(renderSummary());
  var row = div("button-row");
  row.appendChild(button("Reset Meeting", resetMeeting, "danger"));
  row.appendChild(button("Back to Setup With Same Agenda", backToSetup, "primary"));
  panel.appendChild(row);
  side.appendChild(panel);
  shell.appendChild(side);
  return shell;
}

function renderAgendaStack() {
  var box = div("agenda-box" + (state.mode === "setup" ? " setup-box" : ""));
  box.setAttribute("aria-label", "Visual meeting agenda");
  var blocks = calculateVisualBlocks();
  if (blocks.length === 0) {
    var empty = div("agenda-empty");
    empty.appendChild(button("+ Add Agenda Item", function () { addItem(); }, "full-button"));
    box.appendChild(empty);
    return box;
  }
  blocks.forEach(function (blockData, index) {
    box.appendChild(renderBlock(blockData));
    if (state.mode === "setup" && index === 0) {
      box.appendChild(button("+ Add Agenda Item", function () { addItem(); }, "full-button add-after-first"));
    }
  });
  return box;
}

function renderBlock(blockData) {
  var block = div("agenda-block " + blockData.status);
  if (state.mode === "setup" && blockData.type === "agenda") {
    block.className += state.editingItemId === blockData.id ? " setup-editing" : " setup-collapsed";
  }
  if (state.mode === "setup") {
    block.style.flexBasis = "auto";
  } else {
    block.style.flexBasis = safePercent(blockData.heightPercent) + "%";
  }
  block.setAttribute("aria-label", blockData.title + ", " + statusLabel(blockData.status));
  var fill = div("fill");
  fill.style.height = safePercent(blockData.fillPercent) + "%";
  block.appendChild(fill);
  var content = div("block-content");
  if (state.mode === "setup" && blockData.type === "agenda") {
    content.appendChild(renderSetupItem(blockData.id, blockData));
  } else {
    content.className += " block-content-line";
    content.appendChild(renderInlineBlockLabel(blockData));
  }
  block.appendChild(content);
  return block;
}

function renderInlineBlockLabel(blockData) {
  var row = div("block-inline");
  var left = div("block-inline-main");
  var right = div("block-inline-side");
  if (blockData.type === "offTopic") {
    left.textContent = "Off topic";
    right.textContent = formatDuration(blockData.actualSeconds);
  } else if (blockData.status === "completed") {
    left.textContent = "Done " + blockData.title;
    right.textContent = formatDuration(blockData.actualSeconds);
  } else if (blockData.status === "active") {
    left.textContent = formatDuration(Math.max(0, blockData.plannedSeconds - blockData.actualSeconds)) + " available · " + blockData.title;
    right.textContent = formatDuration(blockData.actualSeconds) + " elapsed";
  } else {
    left.textContent = formatDuration(blockData.visualSeconds) + " available · " + blockData.title;
    right.textContent = "";
  }
  left.title = left.textContent;
  right.title = right.textContent;
  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function renderSetupItem(itemId, blockData) {
  return state.editingItemId === itemId ? renderSetupItemForm(itemId) : renderSetupItemSummary(itemId, blockData);
}

function renderSetupItemSummary(itemId, blockData) {
  var summary = div("setup-item-summary");
  summary.appendChild(renderReorderControls(itemId));

  var main = div("setup-item-summary-main");
  var title = textDiv(blockData.title, "setup-item-summary-title");
  title.title = blockData.title;
  main.appendChild(title);
  main.appendChild(textDiv(formatDuration(blockData.visualSeconds), "setup-item-summary-meta"));
  summary.appendChild(main);

  var actions = div("setup-summary-actions");
  actions.appendChild(textAction("edit", function () { setEditingItem(itemId); }, "edit-action"));
  summary.appendChild(actions);
  return summary;
}

function renderSetupItemForm(itemId) {
  var item = findItem(itemId);
  var form = div("setup-item-form");
  form.appendChild(labelInput("Item title", "text", item.title, function (value) {
    item.title = value || "Agenda item";
    saveState();
  }));
  var controls = div("setup-controls");
  controls.appendChild(labelSelect("Duration mode", item.durationMode, [
    { value: "manual", label: "Set minutes" },
    { value: "auto", label: "Split remaining time" }
  ], function (value) {
    item.durationMode = value === "manual" ? "manual" : "auto";
    syncAutoItemMinutes();
    saveState();
    render();
  }));
  var minuteValue = item.durationMode === "auto" ? formatMinuteInput((getResolvedPlannedSeconds()[item.id] || 0) / 60) : item.plannedMinutes;
  var minutes = labelInput("Minutes", "number", minuteValue, function (value) {
    item.plannedMinutes = sanitizeMinutes(value, 5);
    syncAutoItemMinutes();
    saveState();
    render();
  }, { min: "0", step: "1", disabled: item.durationMode !== "manual" });
  controls.appendChild(minutes);
  form.appendChild(controls);
  var actions = div("item-actions");
  actions.appendChild(renderReorderControls(itemId));
  actions.appendChild(textAction("delete", function () { deleteItem(itemId); }, "delete-action"));
  actions.appendChild(button("Done", function () { finishEditingItem(itemId); }, "primary done-action"));
  form.appendChild(actions);
  return form;
}

function renderReorderControls(itemId) {
  var controls = div("reorder-controls");
  var up = button("↑", function () { moveItem(itemId, -1); }, "icon-button reorder-button");
  up.setAttribute("aria-label", "Move item up");
  up.title = "Move item up";
  up.disabled = isFirstItem(itemId);
  controls.appendChild(up);

  var down = button("↓", function () { moveItem(itemId, 1); }, "icon-button reorder-button");
  down.setAttribute("aria-label", "Move item down");
  down.title = "Move item down";
  down.disabled = isLastItem(itemId);
  controls.appendChild(down);
  return controls;
}

function renderCustomizer() {
  var details = document.createElement("details");
  details.className = "customizer";
  details.open = !!state.isCustomizerOpen;
  details.addEventListener("toggle", function () {
    state.isCustomizerOpen = details.open;
  });
  var summary = document.createElement("summary");
  summary.textContent = "Customize";
  details.appendChild(summary);
  var grid = div("customizer-grid");
  grid.appendChild(labelFontSelect());
  var colors = [
    ["Background color", "backgroundColor"], ["Surface color", "surfaceColor"], ["Text color", "textColor"],
    ["Muted text color", "mutedTextColor"], ["Border color", "borderColor"], ["Active item color", "activeColor"],
    ["Completed item color", "completedColor"], ["Pending item color", "pendingColor"], ["Off-topic color", "offTopicColor"], ["Fill color", "fillColor"]
  ];
  colors.forEach(function (entry) {
    grid.appendChild(labelInput(entry[0], "color", state.theme[entry[1]], function (value) { setThemeValue(entry[1], value); }));
  });
  grid.appendChild(labelInput("Border width", "range", state.theme.borderWidth, function (value) { setThemeValue("borderWidth", Number(value)); }, { min: "1", max: "8", step: "1" }));
  grid.appendChild(labelInput("Corner roundness", "range", state.theme.borderRadius, function (value) { setThemeValue("borderRadius", Number(value)); }, { min: "0", max: "36", step: "1" }));
  grid.appendChild(labelInput("Item gap", "range", state.theme.itemGap, function (value) { setThemeValue("itemGap", Number(value)); }, { min: "0", max: "24", step: "1" }));
  details.appendChild(grid);

  var jsonArea = div("style-json");
  jsonArea.appendChild(labelTextarea("Style JSON", "", function () {}));
  var textarea = jsonArea.querySelector("textarea");
  var row = div("button-row");
  row.appendChild(button("Reset Style", function () { state.theme = copyTheme(defaultTheme); saveState(); render(); }));
  row.appendChild(button("Export Style JSON", function () { textarea.value = JSON.stringify(state.theme, null, 2); }));
  row.appendChild(button("Import Style JSON", function () {
    try {
      var parsed = JSON.parse(textarea.value);
      state.theme = validateTheme(parsed, state.theme);
      saveState();
      render();
    } catch (error) {
      textarea.value = "Could not import style JSON: " + error.message;
    }
  }));
  jsonArea.appendChild(row);
  details.appendChild(jsonArea);
  return details;
}

function renderSummary() {
  var wrap = div("summary-card");
  var planned = state.totalMinutes * 60;
  var actual = getTotalElapsedSeconds();
  var offTopic = getOffTopicSeconds();
  var relation = "on time";
  if (actual < planned - 60) relation = "early";
  if (actual > planned + 60) relation = "overtime";
  var grid = div("summary-grid");
  grid.appendChild(metric("Planned length", formatDuration(planned)));
  grid.appendChild(metric("Actual elapsed", formatDuration(actual)));
  grid.appendChild(metric("Off-topic time", formatDuration(offTopic)));
  wrap.appendChild(grid);
  wrap.appendChild(paragraph("Meeting ended " + relation + ".", "status-line"));
  var list = document.createElement("ul");
  list.className = "summary-list";
  var plannedMap = getResolvedPlannedSeconds();
  state.items.forEach(function (item) {
    var li = document.createElement("li");
    li.textContent = item.title + ": planned " + formatDuration(plannedMap[item.id] || 0) + ", actual " + formatDuration(getItemActualSeconds(item.id));
    list.appendChild(li);
  });
  wrap.appendChild(list);
  return wrap;
}

function getResolvedPlannedSeconds() {
  var totalSeconds = sanitizeMinutes(state.totalMinutes, 30) * 60;
  var manualSeconds = 0;
  var autoItems = [];
  state.items.forEach(function (item) {
    if (item.durationMode === "manual") manualSeconds += sanitizeMinutes(item.plannedMinutes, 0) * 60;
    else autoItems.push(item);
  });
  var remainingSeconds = Math.max(0, totalSeconds - manualSeconds);
  var autoSeconds = autoItems.length ? remainingSeconds / autoItems.length : 0;
  var result = {};
  state.items.forEach(function (item) {
    result[item.id] = item.durationMode === "manual" ? sanitizeMinutes(item.plannedMinutes, 0) * 60 : autoSeconds;
  });
  return result;
}

function syncAutoItemMinutes() {
  var plannedMap = getResolvedPlannedSeconds();
  state.items.forEach(function (item) {
    if (item.durationMode === "auto") {
      item.plannedMinutes = Number(formatMinuteInput((plannedMap[item.id] || 0) / 60));
    }
  });
}

function getSegmentDuration(segment) {
  if (!segment) return 0;
  var end = segment.endedAt || (state.mode === "running" ? state.now : Date.now());
  return Math.max(0, (end - segment.startedAt) / 1000);
}

function getItemActualSeconds(itemId) {
  return state.segments.reduce(function (sum, segment) {
    return sum + (segment.type === "agenda" && segment.itemId === itemId ? getSegmentDuration(segment) : 0);
  }, 0);
}

function getOffTopicSeconds() {
  return state.segments.reduce(function (sum, segment) {
    return sum + (segment.type === "offTopic" ? getSegmentDuration(segment) : 0);
  }, 0);
}

function getTotalElapsedSeconds() {
  return state.segments.reduce(function (sum, segment) { return sum + getSegmentDuration(segment); }, 0);
}

function getOpenSegment() {
  for (var i = state.segments.length - 1; i >= 0; i -= 1) {
    if (state.segments[i].endedAt === null) return state.segments[i];
  }
  return null;
}

function closeOpenSegment(now) {
  var open = getOpenSegment();
  if (open) open.endedAt = now;
}

function calculateVisualBlocks() {
  var plannedMap = getResolvedPlannedSeconds();
  if (state.mode === "setup") {
    return withHeights(state.items.map(function (item) {
      return blockObject(item.id, "agenda", item.title, "pending", plannedMap[item.id] || 0, 0, plannedMap[item.id] || 0, 0);
    }));
  }

  var offByItem = {};
  state.segments.forEach(function (segment) {
    if (segment.type === "offTopic") {
      var key = segment.itemId || "__none__";
      if (!offByItem[key]) offByItem[key] = [];
      offByItem[key].push(segment);
    }
  });

  var activeVisualSeconds = 0;
  var completedActual = 0;
  var pendingItems = [];
  var baseBlocks = [];

  state.items.forEach(function (item) {
    var planned = plannedMap[item.id] || 0;
    var actual = getItemActualSeconds(item.id);
    var status = "pending";
    var visual = planned;
    var fill = 0;
    if (item.completed) {
      status = "completed";
      visual = actual;
      fill = 100;
      completedActual += actual;
    } else if (item.id === state.activeItemId) {
      status = "active";
      visual = Math.max(planned, actual);
      activeVisualSeconds = visual;
      fill = visual > 0 ? actual / visual * 100 : 0;
    } else {
      pendingItems.push(item);
    }
    baseBlocks.push({ item: item, block: blockObject(item.id, "agenda", item.title, status, planned, actual, visual, fill) });
  });

  var offVisual = getOffTopicSeconds();
  var consumed = completedActual + activeVisualSeconds + offVisual;
  var remaining = Math.max(0, state.totalMinutes * 60 - consumed);
  var pendingPlannedTotal = pendingItems.reduce(function (sum, item) { return sum + (plannedMap[item.id] || 0); }, 0);
  baseBlocks.forEach(function (entry) {
    if (entry.block.status === "pending") {
      var share = pendingPlannedTotal > 0 ? (plannedMap[entry.item.id] || 0) / pendingPlannedTotal : (pendingItems.length ? 1 / pendingItems.length : 0);
      entry.block.visualSeconds = Math.max(0, remaining * share);
    }
  });

  var result = [];
  baseBlocks.forEach(function (entry) {
    result.push(entry.block);
    var segments = offByItem[entry.item.id] || [];
    segments.forEach(function (segment) { result.push(offTopicBlock(segment)); });
  });
  (offByItem.__none__ || []).forEach(function (segment) { result.push(offTopicBlock(segment)); });
  return withHeights(result);
}

function blockObject(id, type, title, status, plannedSeconds, actualSeconds, visualSeconds, fillPercent) {
  return {
    id: id,
    type: type,
    title: title,
    status: status,
    plannedSeconds: safeNumber(plannedSeconds),
    actualSeconds: safeNumber(actualSeconds),
    visualSeconds: safeNumber(visualSeconds),
    heightPercent: 0,
    fillPercent: safePercent(fillPercent)
  };
}

function offTopicBlock(segment) {
  var actual = getSegmentDuration(segment);
  return blockObject(segment.id, "offTopic", "Off topic", "off-topic", 0, actual, actual, 100);
}

function withHeights(blocks) {
  var totalMeetingSeconds = Math.max(0, sanitizeMinutes(state.totalMinutes, 30) * 60);
  var sumVisualSeconds = blocks.reduce(function (sum, block) { return sum + safeNumber(block.visualSeconds); }, 0);
  var totalVisualSeconds = Math.max(totalMeetingSeconds, sumVisualSeconds, 1);
  blocks.forEach(function (block) {
    block.visualSeconds = safeNumber(block.visualSeconds);
    block.heightPercent = safePercent(block.visualSeconds / totalVisualSeconds * 100);
  });
  return blocks;
}

function startMeeting() {
  if (!state.items.length) return;
  var now = Date.now();
  state.mode = "running";
  state.editingItemId = null;
  state.meetingStartedAt = now;
  state.meetingEndedAt = null;
  state.isOffTopic = false;
  state.items.forEach(function (item) { item.completed = false; });
  state.activeItemId = state.items[0].id;
  state.segments = [createSegment("agenda", state.activeItemId, now)];
  state.now = now;
  render();
}

function doneNext() {
  var now = Date.now();
  closeOpenSegment(now);
  var active = findItem(state.activeItemId);
  if (active) active.completed = true;
  state.isOffTopic = false;
  var next = state.items.find(function (item) { return !item.completed; });
  if (next) {
    state.activeItemId = next.id;
    state.segments.push(createSegment("agenda", next.id, now));
    state.now = now;
    render();
  } else {
    endMeeting(now);
  }
}

function toggleOffTopic() {
  var now = Date.now();
  closeOpenSegment(now);
  if (state.isOffTopic) {
    state.isOffTopic = false;
    state.segments.push(createSegment("agenda", state.activeItemId, now));
  } else {
    state.isOffTopic = true;
    state.segments.push(createSegment("offTopic", state.activeItemId, now));
  }
  state.now = now;
  render();
}

function pauseMeeting() {
  var now = Date.now();
  closeOpenSegment(now);
  state.mode = "paused";
  state.now = now;
  render();
}

function resumeMeeting() {
  var now = Date.now();
  state.mode = "running";
  state.now = now;
  state.segments.push(createSegment(state.isOffTopic ? "offTopic" : "agenda", state.isOffTopic ? state.activeItemId : state.activeItemId, now));
  render();
}

function endMeeting(forcedNow) {
  var now = typeof forcedNow === "number" ? forcedNow : Date.now();
  closeOpenSegment(now);
  state.mode = "ended";
  state.meetingEndedAt = now;
  state.now = now;
  render();
}

function backToSetup() {
  state.mode = "setup";
  state.editingItemId = null;
  state.activeItemId = null;
  state.isOffTopic = false;
  state.meetingStartedAt = null;
  state.meetingEndedAt = null;
  state.segments = [];
  state.items.forEach(function (item) { item.completed = false; });
  saveState();
  render();
}

function resetMeeting() {
  var theme = copyTheme(state.theme);
  state.mode = "setup";
  state.editingItemId = null;
  state.meetingTitle = "Visual Agenda";
  state.totalMinutes = 30;
  state.activeItemId = null;
  state.isOffTopic = false;
  state.meetingStartedAt = null;
  state.meetingEndedAt = null;
  state.now = Date.now();
  state.items = [];
  state.segments = [];
  state.theme = theme;
  saveState();
  render();
}

function addItem() {
  var item = createItem();
  state.items.push(item);
  state.editingItemId = item.id;
  syncAutoItemMinutes();
  saveState();
  render();
}

function moveItem(itemId, direction) {
  var index = state.items.findIndex(function (item) { return item.id === itemId; });
  var nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.items.length) return;
  var item = state.items.splice(index, 1)[0];
  state.items.splice(nextIndex, 0, item);
  syncAutoItemMinutes();
  saveState();
  render();
}

function deleteItem(itemId) {
  state.items = state.items.filter(function (item) { return item.id !== itemId; });
  if (state.editingItemId === itemId) state.editingItemId = null;
  syncAutoItemMinutes();
  saveState();
  render();
}

function setEditingItem(itemId) {
  state.editingItemId = itemId;
  render();
}

function finishEditingItem(itemId) {
  if (state.editingItemId === itemId) state.editingItemId = null;
  saveState();
  render();
}

function isFirstItem(itemId) {
  return state.items.findIndex(function (item) { return item.id === itemId; }) === 0;
}

function isLastItem(itemId) {
  var index = state.items.findIndex(function (item) { return item.id === itemId; });
  return index === state.items.length - 1;
}

function manageTimer() {
  if (state.mode === "running" && !timerId) {
    timerId = setInterval(function () {
      state.now = Date.now();
      if (!isCustomizerControlActive()) {
        render();
      }
    }, 500);
  }
  if (state.mode !== "running" && timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function formatDuration(seconds) {
  var total = Math.max(0, Math.round(safeNumber(seconds)));
  var hours = Math.floor(total / 3600);
  var minutes = Math.floor((total % 3600) / 60);
  var secs = total % 60;
  if (hours > 0) return hours + "h " + pad(minutes) + "m";
  if (minutes > 0) return minutes + "m " + pad(secs) + "s";
  return secs + "s";
}

function pad(number) { return number < 10 ? "0" + number : String(number); }
function formatMinuteInput(minutes) { var rounded = Math.round(safeNumber(minutes) * 10) / 10; return Math.floor(rounded) === rounded ? String(rounded) : rounded.toFixed(1); }
function findItem(id) { return state.items.find(function (item) { return item.id === id; }); }
function safeNumber(value) { return isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0; }
function safePercent(value) { return Math.max(0, Math.min(100, safeNumber(value))); }
function clampNumber(value, min, max, fallback) { var number = Number(value); return isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback; }
function sanitizeMinutes(value, fallback) { return clampNumber(value, 0, 1440, fallback); }
function setThemeValue(key, value) { state.isCustomizerOpen = true; state.theme[key] = value; state.theme = validateTheme(state.theme, state.theme); applyTheme(); saveState(); }
function statusLabel(status) { return status === "off-topic" ? "Off topic" : status.charAt(0).toUpperCase() + status.slice(1); }
function isCustomizerControlActive() { return !!(document.activeElement && document.activeElement.closest && document.activeElement.closest(".customizer")); }

function div(className) { var el = document.createElement("div"); if (className) el.className = className; return el; }
function textDiv(text, className) { var el = div(className); el.textContent = text; return el; }
function heading(level, text) { var el = document.createElement(level); el.textContent = text; return el; }
function paragraph(text, className) { var el = document.createElement("p"); if (className) el.className = className; el.textContent = text || ""; return el; }
function button(text, onClick, className) { var el = document.createElement("button"); el.type = "button"; if (className) el.className = className; el.textContent = text; el.addEventListener("click", onClick); return el; }
function textAction(text, onClick, className) { return button(text, onClick, "text-action " + (className || "")); }

function labelInput(labelText, type, value, onChange, attrs) {
  var id = createId("input");
  var wrap = div("field");
  var label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = labelText;
  var input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.value = value;
  if (attrs) Object.keys(attrs).forEach(function (key) {
    if (key === "disabled") input.disabled = !!attrs[key];
    else if (key !== "helpText") input.setAttribute(key, attrs[key]);
  });
  input.addEventListener("change", function () { onChange(input.value); });
  input.addEventListener("input", function () { if (type === "color" || type === "range") onChange(input.value); });
  wrap.appendChild(label);
  wrap.appendChild(input);
  if (attrs && attrs.helpText) {
    wrap.appendChild(textDiv(attrs.helpText, "field-help"));
  }
  return wrap;
}

function labelSelect(labelText, value, options, onChange) {
  var id = createId("select");
  var wrap = div("field");
  var label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = labelText;
  var select = document.createElement("select");
  select.id = id;
  options.forEach(function (optionItem) {
    var optionValue = typeof optionItem === "string" ? optionItem : optionItem.value;
    var optionLabel = typeof optionItem === "string" ? optionItem.charAt(0).toUpperCase() + optionItem.slice(1) : optionItem.label;
    var option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    select.appendChild(option);
  });
  select.value = value;
  select.addEventListener("change", function () { onChange(select.value); });
  wrap.appendChild(label);
  wrap.appendChild(select);
  return wrap;
}

function labelFontSelect() {
  var id = createId("font");
  var wrap = div("field");
  var label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = "Font family";
  var select = document.createElement("select");
  select.id = id;
  Object.keys(fontOptions).forEach(function (name) {
    var option = document.createElement("option");
    option.value = fontOptions[name];
    option.textContent = name;
    select.appendChild(option);
  });
  select.value = state.theme.fontFamily;
  select.addEventListener("change", function () { setThemeValue("fontFamily", select.value); });
  wrap.appendChild(label);
  wrap.appendChild(select);
  return wrap;
}

function labelTextarea(labelText, value, onChange) {
  var id = createId("textarea");
  var wrap = div("field");
  var label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = labelText;
  var textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.value = value;
  textarea.addEventListener("change", function () { onChange(textarea.value); });
  wrap.appendChild(label);
  wrap.appendChild(textarea);
  return wrap;
}

function metric(label, value) {
  var el = div("metric");
  var strong = document.createElement("strong");
  strong.textContent = value;
  el.appendChild(strong);
  el.appendChild(textDiv(label, "muted"));
  return el;
}

function showFatalError(error) {
  var app = document.getElementById("app");
  if (!app) return;
  app.textContent = "";
  var panel = div("panel fatal-error");
  panel.appendChild(heading("h2", "Visual Agenda failed to load."));
  panel.appendChild(paragraph(error && error.message ? error.message : String(error)));
  app.appendChild(panel);
}

try {
  loadState();
  render();
} catch (error) {
  showFatalError(error);
}
