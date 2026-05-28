import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const state = {
  pdf: null,
  fileName: "",
  playing: false,
  speed: 24,
  zoom: 1.1,
  renderedZoom: 1.1,
  animationId: null,
  lastFrameTime: 0,
  scrollPosition: 0,
  renderId: 0,
  resizeTimer: null,
  zoomDragging: false,
  zoomCommitTimer: null,
};

const elements = {
  emptyState: document.querySelector("#emptyState"),
  viewer: document.querySelector("#viewer"),
  paper: document.querySelector("#paper"),
  emptyMessage: document.querySelector("#emptyMessage"),
  pdfInput: document.querySelector("#pdfInput"),
  pdfInputCompact: document.querySelector("#pdfInputCompact"),
  playButton: document.querySelector("#playButton"),
  playIcon: document.querySelector("#playIcon"),
  statusLine: document.querySelector("#statusLine"),
  speedRange: document.querySelector("#speedRange"),
  speedValue: document.querySelector("#speedValue"),
  zoomRange: document.querySelector("#zoomRange"),
  zoomValue: document.querySelector("#zoomValue"),
  backButton: document.querySelector("#backButton"),
  topButton: document.querySelector("#topButton"),
  botToast: document.querySelector("#botToast"),
  botMessage: document.querySelector("#botMessage"),
  botClose: document.querySelector("#botClose"),
  botSilence: document.querySelector("#botSilence"),
};

const botUploadMessages = [
  "Score detected. I have tuned the scroll engines.",
  "Fresh pages loaded. Hands on the instrument, I will watch the paper.",
  "Your score is on the stand. May the repeats be merciful.",
  "PDF secured. The page-turning department has been dismissed.",
  "Ready when you are. I will keep the music moving.",
];

const botStorage = {
  muted: "flowscore.bo0thovenMuted",
  welcomed: "flowscore.bo0thovenWelcomed",
};

let botHideTimer = null;

function setControlsEnabled(enabled) {
  elements.playButton.disabled = !enabled;
  elements.backButton.disabled = !enabled;
  elements.topButton.disabled = !enabled;
  elements.speedRange.disabled = !enabled;
  elements.zoomRange.disabled = !enabled;
}

function updatePlayLabel() {
  elements.playIcon.textContent = state.playing ? "Pause" : "Play";
  elements.playButton.setAttribute(
    "aria-label",
    state.playing ? "Pause autoscroll" : "Start autoscroll",
  );
}

function setStatus(message, tone = "") {
  elements.statusLine.textContent = message;
  elements.statusLine.dataset.tone = tone;
}

function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browser modes.
  }
}

function bo0thovenMuted() {
  return readStorage(window.localStorage, botStorage.muted) === "true";
}

function hideBo0thoven() {
  window.clearTimeout(botHideTimer);
  elements.botToast.hidden = true;
}

function showBo0thoven(message, { autoHide = true } = {}) {
  if (bo0thovenMuted()) return;

  window.clearTimeout(botHideTimer);
  elements.botMessage.textContent = message;
  elements.botToast.hidden = false;

  if (autoHide) {
    botHideTimer = window.setTimeout(hideBo0thoven, 8500);
  }
}

function greetWithBo0thoven() {
  if (readStorage(window.sessionStorage, botStorage.welcomed) === "true") return;

  writeStorage(window.sessionStorage, botStorage.welcomed, "true");
  window.setTimeout(() => {
    showBo0thoven("Welcome to FlowScore. bo0thoven is on standby.");
  }, 700);
}

function celebrateUploadWithBo0thoven() {
  const message =
    botUploadMessages[Math.floor(Math.random() * botUploadMessages.length)];
  showBo0thoven(message);
}

function stopScroll() {
  state.playing = false;
  state.lastFrameTime = 0;
  cancelAnimationFrame(state.animationId);
  updatePlayLabel();
}

function startScroll() {
  if (!state.pdf) return;
  state.playing = true;
  updatePlayLabel();
  state.animationId = requestAnimationFrame(tick);
}

function tick(timestamp) {
  if (!state.playing) return;

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const elapsedSeconds = (timestamp - state.lastFrameTime) / 1000;
  state.lastFrameTime = timestamp;
  state.scrollPosition += state.speed * elapsedSeconds;
  elements.viewer.scrollTop = state.scrollPosition;

  const atBottom =
    elements.viewer.scrollTop + elements.viewer.clientHeight >=
    elements.viewer.scrollHeight - 2;

  if (atBottom) {
    stopScroll();
    return;
  }

  state.animationId = requestAnimationFrame(tick);
}

function getScrollProgress() {
  const maxScroll = elements.viewer.scrollHeight - elements.viewer.clientHeight;
  return maxScroll > 0 ? elements.viewer.scrollTop / maxScroll : 0;
}

function applyZoomPreview() {
  const previewScale = state.zoom / state.renderedZoom;
  elements.paper.style.transform = `scale(${previewScale})`;
}

async function renderPdf({ preserveScroll = false } = {}) {
  if (!state.pdf) return;

  const renderId = (state.renderId += 1);
  const scrollProgress = preserveScroll ? getScrollProgress() : 0;
  stopScroll();
  setControlsEnabled(false);
  document.body.classList.add("is-loading");
  elements.paper.style.transform = "";
  setStatus(`Rendering ${state.fileName || "score"}...`);
  elements.paper.replaceChildren();
  elements.viewer.scrollTop = 0;
  state.scrollPosition = 0;

  const availableWidth = Math.min(elements.viewer.clientWidth - 56, 980);

  for (let pageNumber = 1; pageNumber <= state.pdf.numPages; pageNumber += 1) {
    if (renderId !== state.renderId) return;

    const page = await state.pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = availableWidth / baseViewport.width;
    const viewport = page.getViewport({ scale: fitScale * state.zoom });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.className = "page-canvas";
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    elements.paper.append(canvas);

    await page.render({ canvasContext: context, viewport }).promise;
  }

  if (renderId !== state.renderId) return;

  document.body.classList.remove("is-loading");
  setControlsEnabled(true);
  state.renderedZoom = state.zoom;

  if (preserveScroll) {
    const maxScroll = elements.viewer.scrollHeight - elements.viewer.clientHeight;
    state.scrollPosition = Math.max(0, maxScroll * scrollProgress);
    elements.viewer.scrollTop = state.scrollPosition;
  }

  setStatus(
    `${state.fileName || "Score"} ready. ${state.pdf.numPages} ${
      state.pdf.numPages === 1 ? "page" : "pages"
    }.`,
  );
}

function revealViewer() {
  requestAnimationFrame(() => {
    elements.viewer.scrollIntoView({ block: "start" });
  });
}
async function loadFile(file) {
  if (!file) return;

  setControlsEnabled(false);
  stopScroll();
  document.body.classList.add("is-loading");
  setStatus(`Opening ${file.name}...`);
  elements.emptyState.hidden = true;
  elements.viewer.hidden = false;
  elements.paper.replaceChildren();

  try {
    const buffer = await file.arrayBuffer();
    state.fileName = file.name;
    state.pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    await renderPdf();
    revealViewer();
    celebrateUploadWithBo0thoven();
  } catch (error) {
    console.error(error);
    state.pdf = null;
    state.fileName = "";
    elements.viewer.hidden = true;
    elements.emptyState.hidden = false;
    elements.paper.replaceChildren();
    elements.emptyMessage.textContent =
      "That file could not be opened as a PDF. Please choose another score.";
    setStatus("Could not open that PDF.", "error");
    setControlsEnabled(false);
  } finally {
    document.body.classList.remove("is-loading");
    elements.pdfInput.value = "";
    elements.pdfInputCompact.value = "";
  }
}

function changeSpeed(value) {
  state.speed = Number(value);
  elements.speedRange.value = String(state.speed);
  elements.speedValue.value = `${state.speed} px/s`;
}

function changeZoom(value) {
  state.zoom = Number(value) / 100;
  elements.zoomRange.value = String(value);
  elements.zoomValue.value = `${value}%`;
}

async function commitZoom() {
  if (!state.pdf) return;
  window.clearTimeout(state.zoomCommitTimer);
  if (Math.abs(state.zoom - state.renderedZoom) < 0.001) return;
  await renderPdf({ preserveScroll: true });
}

function scheduleZoomCommit() {
  window.clearTimeout(state.zoomCommitTimer);
  state.zoomCommitTimer = window.setTimeout(() => {
    commitZoom();
  }, 500);
}

function previewZoom(value) {
  changeZoom(value);

  if (!state.pdf) return;

  stopScroll();
  applyZoomPreview();
  setStatus("Previewing page size. Release to render.");
}

elements.pdfInput.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
});

elements.pdfInputCompact.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
});

elements.playButton.addEventListener("click", () => {
  if (state.playing) {
    stopScroll();
  } else {
    startScroll();
  }
});

elements.speedRange.addEventListener("input", (event) => {
  changeSpeed(event.target.value);
});

elements.speedRange.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
  }
});

elements.zoomRange.addEventListener("pointerdown", () => {
  state.zoomDragging = true;
  window.clearTimeout(state.zoomCommitTimer);
});

elements.zoomRange.addEventListener("input", (event) => {
  previewZoom(event.target.value);

  if (!state.zoomDragging) {
    scheduleZoomCommit();
  }
});

elements.zoomRange.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
  }
});

window.addEventListener("pointerup", () => {
  if (!state.zoomDragging) return;

  state.zoomDragging = false;
  commitZoom();
});

elements.backButton.addEventListener("click", () => {
  state.scrollPosition = Math.max(0, elements.viewer.scrollTop - state.speed * 10);
  elements.viewer.scrollTop = state.scrollPosition;
});

elements.topButton.addEventListener("click", () => {
  state.scrollPosition = 0;
  elements.viewer.scrollTop = 0;
});

elements.botClose.addEventListener("click", hideBo0thoven);

elements.botSilence.addEventListener("click", () => {
  writeStorage(window.localStorage, botStorage.muted, "true");
  hideBo0thoven();
});

elements.viewer.addEventListener("scroll", () => {
  if (!state.playing) {
    state.scrollPosition = elements.viewer.scrollTop;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && state.pdf) {
    event.preventDefault();
    state.playing ? stopScroll() : startScroll();
  }

  if ((event.key === "ArrowUp" || event.key === "ArrowDown") && state.pdf) {
    event.preventDefault();
  }

  if (event.target === elements.zoomRange) {
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    changeSpeed(Math.min(90, state.speed + 2));
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    changeSpeed(Math.max(4, state.speed - 2));
  }

  if (event.key === "Home" && state.pdf) {
    event.preventDefault();
    state.scrollPosition = 0;
    elements.viewer.scrollTop = 0;
  }
});

window.addEventListener("resize", () => {
  window.clearTimeout(state.resizeTimer);
  state.resizeTimer = window.setTimeout(() => {
    if (state.pdf) renderPdf({ preserveScroll: true });
  }, 180);
});

changeSpeed(state.speed);
changeZoom(110);
updatePlayLabel();
greetWithBo0thoven();
