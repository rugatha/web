const canvas = document.getElementById("card-canvas");
const ctx = canvas.getContext("2d");

const inputs = {
  name: document.getElementById("name"),
  race: document.getElementById("race"),
  color: document.getElementById("color"),
  colorPicker: document.getElementById("color-picker"),
  class1: document.getElementById("class1"),
  level1: document.getElementById("level1"),
  class2: document.getElementById("class2"),
  level2: document.getElementById("level2"),
  multiclass: document.getElementById("multiclass"),
  hp: document.getElementById("hp"),
  ac: document.getElementById("ac"),
  pp: document.getElementById("pp"),
  cropZoom: document.getElementById("crop-zoom"),
  cropX: document.getElementById("crop-x"),
  cropY: document.getElementById("crop-y"),
  image: document.getElementById("image")
};

const buttons = {
  download: document.getElementById("download"),
  reset: document.getElementById("reset"),
  langToggle: document.getElementById("lang-toggle"),
  cropFlip: document.getElementById("crop-flip")
};

const textNodes = {
  formTitle: document.getElementById("form-title"),
  previewTitle: document.getElementById("preview-title"),
  downloadNote: document.getElementById("download-note"),
  abilityLegend: document.querySelector(".ability-grid legend"),
  cropLegend: document.querySelector(".range-group legend"),
  canvas: document.getElementById("card-canvas")
};

const abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10
};

const FALLBACK_ACCENTS = ["#7bdcb5", "#8bc8ff", "#ffd166", "#c48bff", "#ff9e9e", "#a7f0ba"];
const sharedAccents = getSharedAccents();
const accentPalette = sharedAccents.length ? sharedAccents : FALLBACK_ACCENTS;
const defaultAccent = accentPalette[0];
const LANGS = {
  zh: {
    formTitle: "角色資訊",
    previewTitle: "預覽",
    downloadNote: "若使用手機Messenger app開啟，建議切換至瀏覽器進行下載",
    downloadLabel: "下載角色卡圖檔",
    toggleLabel: "English",
    resetLabel: "重設",
    fallbacks: {
      name: "冒險者",
      race: "種族",
      class1: "職業",
      class2: "職業 2"
    },
    placeholders: {
      name: "Name",
      race: "Race",
      class1: "Class",
      class2: "Class 2"
    },
    labels: {
      name: "姓名",
      race: "種族",
      color: "主色",
      class1: "職業",
      level1: "等級",
      multiclass: "兼職",
      class2: "職業 2",
      level2: "等級",
      hp: "生命值上限",
      ac: "護甲等級 (AC)",
      pp: "被動觀察",
      ability: "能力值",
      image: "角色圖片",
      crop: "裁切圖片",
      cropZoom: "縮放",
      cropX: "水平",
      cropY: "垂直",
      cropFlip: "水平翻轉"
    },
  abilityLabels: ["力量", "敏捷", "體魄", "智力", "感知", "魅力"],
    canvas: {
      uploadHint: "點擊上傳角色圖片",
      hp: "生命值上限",
      ac: "護甲等級",
      pp: "被動觀察"
    },
    overlay: {
      title: "長按圖片即可儲存",
      note:
        "Facebook 內嵌瀏覽器不支援直接下載，請長按下方圖片並選擇儲存。",
      errorTitle: "無法產生圖片",
      errorNote: "抱歉，內嵌瀏覽器封鎖了下載功能。請改用外部瀏覽器（Safari/Chrome），或截圖保存。"
    },
    aria: {
      canvas: "角色卡預覽"
    }
  },
  en: {
    formTitle: "Character Info",
    previewTitle: "Preview",
    downloadNote: "If using Messenger in-app, switch to a browser to download",
    downloadLabel: "Download Character Card",
    toggleLabel: "中文",
    resetLabel: "Reset",
    fallbacks: {
      name: "Adventurer",
      race: "Race",
      class1: "Class",
      class2: "Class 2"
    },
    placeholders: {
      name: "Name",
      race: "Race",
      class1: "Class",
      class2: "Class 2"
    },
    labels: {
      name: "Name",
      race: "Race",
      color: "Accent",
      class1: "Class",
      level1: "Level",
      multiclass: "Multiclass",
      class2: "Class 2",
      level2: "Level",
      hp: "Max HP",
      ac: "Armor Class (AC)",
      pp: "Passive Perception",
      ability: "Abilities",
      image: "Character Image",
      crop: "Crop Image",
      cropZoom: "Zoom",
      cropX: "Horizontal",
      cropY: "Vertical",
      cropFlip: "Flip Horizontal"
    },
    abilityLabels: ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
  canvas: {
    uploadHint: "Upload character image here",
    hp: "Max HP",
    ac: "AC",
    pp: "Passive Perception"
  },
    overlay: {
      title: "Press and hold to save",
      note:
        "Facebook in-app browser blocks direct download. Press and hold the image below to save.",
      errorTitle: "Unable to generate image",
      errorNote: "This in-app browser blocks downloads. Please use Safari/Chrome, or take a screenshot."
    },
    aria: {
      canvas: "Character card preview"
    }
  }
};
let currentLang = "zh";

let imgBitmap = null;
let accent = defaultAccent;
let logoBitmap = null;
const cropState = { zoom: 1, cx: 0.5, cy: 0.5, flipX: false };
let portraitBounds = null;

function toRGBA(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0");
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCard() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const fallbacks = LANGS[currentLang].fallbacks;

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, toRGBA(accent, 0.45));
  grad.addColorStop(1, "#1d2b2d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // card panel
  const panelX = 40;
  const panelY = 40;
  const panelW = w - 80;
  const panelH = h - 80;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.strokeStyle = toRGBA(accent, 0.8);
  ctx.lineWidth = 4;
  roundRect(ctx, panelX, panelY, panelW, panelH, 22, true, true);

  // image area (1:1.3 ratio, portrait on the left)
  const imgX = panelX + 24;
  const availableH = panelH - 56;
  const imgW = Math.min(Math.round(panelW * 0.32), Math.round(availableH / 1.3));
  const imgH = Math.round(imgW * 1.3);
  const imgY = panelY + Math.round((panelH - imgH) / 2);
  portraitBounds = { x: imgX, y: imgY, w: imgW, h: imgH };
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, imgX, imgY, imgW, imgH, 16, true, false);
  if (imgBitmap) {
    const aspect = imgW / imgH;
    const baseCropW = Math.min(imgBitmap.width, imgBitmap.height * aspect);
    const baseCropH = baseCropW / aspect;
    const cropW = baseCropW / cropState.zoom;
    const cropH = cropW / aspect;
    const centerX = imgBitmap.width * cropState.cx;
    const centerY = imgBitmap.height * cropState.cy;
    const sx = clamp(centerX - cropW / 2, 0, imgBitmap.width - cropW);
    const sy = clamp(centerY - cropH / 2, 0, imgBitmap.height - cropH);
    ctx.save();
    if (cropState.flipX) {
      ctx.translate(imgX + imgW, imgY);
      ctx.scale(-1, 1);
      ctx.drawImage(imgBitmap, sx, sy, cropW, cropH, 0, 0, imgW, imgH);
    } else {
      ctx.drawImage(imgBitmap, sx, sy, cropW, cropH, imgX, imgY, imgW, imgH);
    }
    ctx.restore();
  } else {
    const canvasLabels = LANGS[currentLang].canvas;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "26px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(canvasLabels.uploadHint, imgX + imgW / 2, imgY + imgH / 2);
  }
  // logo overlay slightly covering portrait corner
  if (logoBitmap) {
    const logoW = 140;
    const logoH = (logoBitmap.height / logoBitmap.width) * logoW;
    const lx = imgX - 10;
    const ly = imgY - 20;
    ctx.drawImage(logoBitmap, lx, ly, logoW, logoH);
  }

  // text info
  const infoX = imgX + imgW + 32;
  const infoY = panelY + 10;
  ctx.fillStyle = "#ecf2ed";
  ctx.textAlign = "left";
  // H1
  ctx.font = "92px 'Space Grotesk', 800";
  ctx.fillText(inputs.name.value || fallbacks.name, infoX, infoY + 52);

  // H1-like for race/class line
  ctx.font = "48px 'Space Grotesk', 700";
  const raceClass = `${inputs.race.value || fallbacks.race} • ${classLine()}`;
  ctx.fillText(raceClass, infoX, infoY + 102);

  // vitals
  // H2
  ctx.font = "38px 'Space Grotesk', 700";
  const vitalsY = infoY + 158;
  const vitGap = 180;
  const canvasLabels = LANGS[currentLang].canvas;
  drawVital(infoX, vitalsY, canvasLabels.hp, inputs.hp.value || "—");
  drawVital(infoX + vitGap, vitalsY, canvasLabels.ac, inputs.ac.value || "—");
  drawVital(infoX + vitGap * 2, vitalsY, canvasLabels.pp, inputs.pp.value || "—");

  // abilities
  const abilityLabels = LANGS[currentLang].abilityLabels || ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const abilityKeys = ["str", "dex", "con", "int", "wis", "cha"];
  const boxW = 170;
  const boxH = 140;
  const gap = 18;
  const ax = infoX;
  const ay = vitalsY + 90;

  abilityKeys.forEach((key, i) => {
    const val = abilities[key] || 0;
    const highlight = val >= 20;
    const bx = ax + (boxW + gap) * (i % 3);
    const by = ay + Math.floor(i / 3) * (boxH + gap);
    ctx.fillStyle = highlight ? toRGBA("#ffd166", 0.22) : "rgba(255,255,255,0.08)";
    ctx.strokeStyle = highlight ? "#ffd166" : toRGBA(accent, 0.8);
    ctx.lineWidth = highlight ? 4 : 2;
    roundRect(ctx, bx, by, boxW, boxH, 12, true, true);

    const centerX = bx + boxW / 2;
    const labelY = by + boxH * 0.28;
    const valueY = by + boxH * 0.54;
    const modY = by + boxH * 0.8;
    ctx.fillStyle = "#ecf2ed";
    ctx.textAlign = "center";
    ctx.font = "24px 'Space Grotesk', 700";
    ctx.fillText(abilityLabels[i], centerX, labelY);
    ctx.font = "50px 'Space Grotesk', 800";
    ctx.fillText(String(val || 0), centerX, valueY);
    const mod = Math.floor((val - 10) / 2);
    ctx.font = "24px 'Space Grotesk', 700";
    ctx.fillText(mod >= 0 ? `+${mod}` : `${mod}`, centerX, modY);
  });
  ctx.textAlign = "left";
}

function classLine() {
  const defaults = LANGS[currentLang].fallbacks;
  const cls1 = inputs.class1.value || defaults.class1;
  const lvl1 = inputs.level1.value || "1";
  if (!inputs.multiclass.checked) {
    return `${cls1} ${lvl1}`;
  }
  const cls2 = inputs.class2.value || defaults.class2;
  const lvl2 = inputs.level2.value || "1";
  return `${cls1} ${lvl1} / ${cls2} ${lvl2}`;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const radius = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + w - radius.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
  ctx.lineTo(x + w, y + h - radius.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
  ctx.lineTo(x + radius.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function handleImage(file) {
  if (!file) {
    imgBitmap = null;
    drawCard();
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const img = new Image();
    img.onload = async () => {
      imgBitmap = await createImageBitmap(img);
      resetCrop();
      drawCard();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function resetCrop() {
  cropState.zoom = 1;
  cropState.cx = 0.5;
  cropState.cy = 0.5;
  cropState.flipX = false;
  if (inputs.cropZoom) inputs.cropZoom.value = cropState.zoom;
  if (inputs.cropX) inputs.cropX.value = cropState.cx;
  if (inputs.cropY) inputs.cropY.value = cropState.cy;
  updateFlipButtonState();
}

function updateFlipButtonState() {
  if (!buttons.cropFlip) return;
  buttons.cropFlip.setAttribute("aria-pressed", String(cropState.flipX));
}

function bindInputs() {
  Object.values(inputs).forEach((el) => {
    if (!el) return;
    if (el.type === "file") {
      el.addEventListener("change", () => handleImage(el.files[0]));
    } else if (el.type === "checkbox") {
      el.addEventListener("change", () => {
        document.getElementById("multiclass-row").hidden = !el.checked;
        drawCard();
      });
    } else if (el.type === "range") {
      el.addEventListener("input", () => {
        cropState.zoom = Number(inputs.cropZoom?.value) || 1;
        cropState.cx = Number(inputs.cropX?.value) || 0.5;
        cropState.cy = Number(inputs.cropY?.value) || 0.5;
        drawCard();
      });
    } else {
      el.addEventListener("input", () => {
        if (el === inputs.color) {
          setAccent(inputs.color.value);
        } else {
          drawCard();
        }
      });
    }
  });

  if (inputs.colorPicker) {
    inputs.colorPicker.addEventListener("input", () => {
      setAccent(inputs.colorPicker.value);
    });
  }

  if (buttons.cropFlip) {
    buttons.cropFlip.addEventListener("click", () => {
      cropState.flipX = !cropState.flipX;
      updateFlipButtonState();
      drawCard();
    });
  }

  document.querySelectorAll("[data-ability]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.ability;
      abilities[key] = Number(input.value) || 0;
      drawCard();
    });
  });

  document.getElementById("download").addEventListener("click", downloadImage);
  buttons.langToggle?.addEventListener("click", toggleLanguage);
  const previewCanvas = document.getElementById("card-canvas");
  if (previewCanvas) {
    previewCanvas.style.cursor = "pointer";
    previewCanvas.title = LANGS[currentLang].overlay.title;
    previewCanvas.addEventListener("click", (e) => {
      if (!portraitBounds) return;
      const rect = previewCanvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const { x, y, w, h } = portraitBounds;
      const inside =
        cx >= x && cx <= x + w &&
        cy >= y && cy <= y + h;
      if (inside) {
        inputs.image?.click();
      }
    });
  }

  document.getElementById("reset").addEventListener("click", () => {
    const defaults = LANGS[currentLang].fallbacks;
    inputs.name.value = defaults.name;
    inputs.race.value = defaults.race;
    inputs.class1.value = defaults.class1;
    inputs.class2.value = defaults.class2;
    inputs.level1.value = 3;
    inputs.level2.value = 2;
    inputs.hp.value = 20;
    inputs.ac.value = 15;
    inputs.pp.value = 12;
    inputs.multiclass.checked = false;
    document.getElementById("multiclass-row").hidden = true;
    setAccent(defaultAccent, false);
    inputs.image.value = "";
    Object.assign(abilities, { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    document.querySelectorAll("[data-ability]").forEach((input) => {
      input.value = abilities[input.dataset.ability];
    });
    imgBitmap = null;
    resetCrop();
    drawCard();
  });
}

function initAbilitySelects() {
  const options = Array.from({ length: 20 }, (_, i) => i + 1);
  document.querySelectorAll("[data-ability]").forEach((sel) => {
    sel.innerHTML = options.map((n) => `<option value="${n}">${n}</option>`).join("");
    const key = sel.dataset.ability;
    sel.value = abilities[key] ?? 10;
  });
}

function initLevelSelects() {
  const levels = Array.from({ length: 20 }, (_, i) => i + 1);
  const levelDefaults = [3, 2];
  [inputs.level1, inputs.level2].forEach((sel, idx) => {
    if (!sel) return;
    sel.innerHTML = levels.map((n) => `<option value="${n}">${n}</option>`).join("");
    const preferred = levelDefaults[idx] ?? 1;
    sel.value = String(preferred);
  });
}

function applyTranslations() {
  const t = LANGS[currentLang];
  if (textNodes.formTitle) textNodes.formTitle.textContent = t.formTitle;
  if (textNodes.previewTitle) textNodes.previewTitle.textContent = t.previewTitle;
  if (textNodes.downloadNote) textNodes.downloadNote.textContent = t.downloadNote;
  if (buttons.download) buttons.download.textContent = t.downloadLabel;
  if (buttons.reset) buttons.reset.textContent = t.resetLabel;
  if (buttons.langToggle) buttons.langToggle.textContent = t.toggleLabel;
  if (textNodes.canvas) textNodes.canvas.setAttribute("aria-label", t.aria.canvas);

  const lbl = t.labels;
  setLabelText(document.querySelector('label[for="name"]'), lbl.name);
  setLabelText(document.querySelector('label[for="race"]'), lbl.race);
  setLabelText(document.querySelector('label[for="color"]'), lbl.color);
  setLabelText(document.querySelector('label[for="class1"]'), lbl.class1);
  setLabelText(document.querySelector('label[for="level1"]'), lbl.level1);
  setLabelText(document.querySelector('.field.checkbox label'), lbl.multiclass);
  setLabelText(document.querySelector('label[for="class2"]'), lbl.class2);
  setLabelText(document.querySelector('label[for="level2"]'), lbl.level2);
  setLabelText(document.querySelector('label[for="hp"]'), lbl.hp);
  setLabelText(document.querySelector('label[for="ac"]'), lbl.ac);
  setLabelText(document.querySelector('label[for="pp"]'), lbl.pp);
  setLabelText(textNodes.abilityLegend, lbl.ability);
  updateAbilityFormLabels();
  setLabelText(document.querySelector('label[for="image"]'), lbl.image);
  setLabelText(textNodes.cropLegend, lbl.crop);
  const cropLabels = document.querySelectorAll(".range-group label .label-text");
  if (cropLabels.length >= 3) {
    cropLabels[0].textContent = lbl.cropZoom;
    cropLabels[1].textContent = lbl.cropX;
    cropLabels[2].textContent = lbl.cropY;
  }
  if (buttons.cropFlip) buttons.cropFlip.textContent = lbl.cropFlip;

  inputs.name.placeholder = t.placeholders.name;
  inputs.race.placeholder = t.placeholders.race;
  inputs.class1.placeholder = t.placeholders.class1;
  inputs.class2.placeholder = t.placeholders.class2;

  updateFlipButtonState();
}

function toggleLanguage() {
  currentLang = currentLang === "zh" ? "en" : "zh";
  applyTranslations();
  drawCard();
}

function updateAbilityFormLabels() {
  const labels = LANGS[currentLang].abilityLabels || ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const formLabels = document.querySelectorAll(".ability-grid label");
  formLabels.forEach((label, idx) => {
    const textNode = Array.from(label.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
    const text = labels[idx] || "";
    if (textNode) {
      textNode.nodeValue = `${text} `;
    } else {
      label.insertBefore(document.createTextNode(`${text} `), label.firstChild);
    }
  });
}

function initSwatches(colors) {
  const container = document.querySelector(".swatches");
  if (!container) return;
  container.innerHTML = "";
  colors.forEach((color) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.dataset.color = color;
    btn.style.background = color;
    btn.addEventListener("click", () => setAccent(color));
    container.appendChild(btn);
  });
}

function setAccent(color, shouldDraw = true) {
  if (!color) return;
  accent = color;
  if (inputs.color) inputs.color.value = color;
  if (inputs.colorPicker) inputs.colorPicker.value = color;
  if (shouldDraw) drawCard();
}

function getSharedAccents() {
  const campaigns = window.RUGATHA_CONFIG?.campaigns;
  if (!Array.isArray(campaigns)) return [];
  const seen = new Set();
  const colors = [];
  campaigns.forEach((campaign) => {
    const c = typeof campaign.accent === "string" ? campaign.accent.trim() : "";
    const key = c.toLowerCase();
    if (!c || seen.has(key)) return;
    seen.add(key);
    colors.push(c);
  });
  return colors;
}

function setLabelText(label, text) {
  if (!label) return;
  if (label.classList && label.classList.contains("label-text")) {
    label.textContent = text;
    return;
  }
  const span = label.querySelector(".label-text");
  if (span) {
    span.textContent = text;
    return;
  }
  const textNode = Array.from(label.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.nodeValue = `${text} `;
  }
}

function isFacebookInApp() {
  return /FBAN|FBAV|FB_IAB/.test(navigator.userAgent);
}

function downloadImage() {
  const filename = `${inputs.name.value || "character"}.png`;
  const supportsDownload = "download" in document.createElement("a");

  // In-app Facebook/Messenger webviews: skip download entirely, just show the image to long-press.
  if (isFacebookInApp()) {
    try {
      const dataUrl = canvas.toDataURL("image/png");
      showInAppSavePrompt(dataUrl, filename);
    } catch (err) {
      showInAppSavePrompt("", filename, true);
    }
    return;
  }

  const saveWithBlob = () =>
    new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Blob unavailable"));
            const url = URL.createObjectURL(blob);
            resolve(url);
          },
          "image/png",
          1
        );
      } catch (err) {
        reject(err);
      }
    });

  const triggerDownload = (url) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  saveWithBlob()
    .then((url) => {
      if (supportsDownload) {
        triggerDownload(url);
      } else {
        window.open(url, "_blank");
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    })
    .catch(() => {
      const dataUrl = canvas.toDataURL("image/png");
      if (supportsDownload) {
        triggerDownload(dataUrl);
      } else {
        window.open(dataUrl, "_blank");
      }
    });
}

function showInAppSavePrompt(url, filename, isError = false) {
  const existing = document.getElementById("save-overlay");
  if (existing) existing.remove();
  const overlayText = LANGS[currentLang].overlay;

  const overlay = document.createElement("div");
  overlay.id = "save-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.8)";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.padding = "18px";
  overlay.style.zIndex = "9999";

  const sheet = document.createElement("div");
  sheet.style.background = "#0f172a";
  sheet.style.border = "1px solid rgba(255,255,255,0.16)";
  sheet.style.borderRadius = "18px";
  sheet.style.padding = "14px";
  sheet.style.width = "min(520px, 100%)";
  sheet.style.boxShadow = "0 20px 50px rgba(0,0,0,0.45)";
  sheet.style.color = "#e2e8f0";
  sheet.style.fontFamily = "'Space Grotesk', system-ui, sans-serif";

  const title = document.createElement("div");
  title.textContent = isError ? overlayText.errorTitle : overlayText.title;
  title.style.fontSize = "18px";
  title.style.fontWeight = "800";
  title.style.marginBottom = "10px";

  const note = document.createElement("div");
  note.textContent = isError ? overlayText.errorNote : overlayText.note;
  note.style.color = "#cbd5e1";
  note.style.fontSize = "14px";
  note.style.marginBottom = "12px";

  let img;
  if (!isError && url) {
    img = document.createElement("img");
    img.src = url;
    img.alt = filename;
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "12px";
    img.style.border = "1px solid rgba(255,255,255,0.12)";
    img.style.display = "block";
  }

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "關閉";
  close.style.marginTop = "12px";
  close.style.width = "100%";
  close.style.padding = "10px 12px";
  close.style.borderRadius = "10px";
  close.style.border = "1px solid rgba(255,255,255,0.16)";
  close.style.background = "rgba(255,255,255,0.05)";
  close.style.color = "#e2e8f0";
  close.style.fontWeight = "700";
  close.style.cursor = "pointer";
  close.addEventListener("click", () => overlay.remove());

  sheet.appendChild(title);
  sheet.appendChild(note);
  if (img) sheet.appendChild(img);
  sheet.appendChild(close);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

initAbilitySelects();
initLevelSelects();
initSwatches(accentPalette);
applyTranslations();
setAccent(defaultAccent, false);
bindInputs();
drawCard();

// load Rugatha logo for the card
(function loadLogo() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = async () => {
    logoBitmap = await createImageBitmap(img);
    drawCard();
  };
  img.src = "../assets/rugatha-icon.png";
})();

function drawVital(x, y, label, value) {
  ctx.fillStyle = "#ecf2ed";
  ctx.font = "24px 'Space Grotesk', 700";
  ctx.fillText(label, x, y);
  ctx.font = "36px 'Space Grotesk', 700";
  ctx.fillText(String(value || "—"), x, y + 36);
}
