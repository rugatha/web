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

let imgBitmap = null;
let accent = defaultAccent;
let logoBitmap = null;
const cropState = { zoom: 1, cx: 0.5, cy: 0.5 };

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
    ctx.drawImage(imgBitmap, sx, sy, cropW, cropH, imgX, imgY, imgW, imgH);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "26px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("上傳角色圖片", imgX + imgW / 2, imgY + imgH / 2);
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
  ctx.font = "78px 'Space Grotesk', 800";
  ctx.fillText(inputs.name.value || "Adventurer", infoX, infoY + 52);

  // H1-like for race/class line
  ctx.font = "48px 'Space Grotesk', 700";
  const raceClass = `${inputs.race.value || "Race"} • ${classLine()}`;
  ctx.fillText(raceClass, infoX, infoY + 102);

  // vitals
  // H2
  ctx.font = "38px 'Space Grotesk', 700";
  const vitalsY = infoY + 158;
  const vitGap = 180;
  drawVital(infoX, vitalsY, "生命值上限", inputs.hp.value || "—");
  drawVital(infoX + vitGap, vitalsY, "AC", inputs.ac.value || "—");
  drawVital(infoX + vitGap * 2, vitalsY, "被動觀察", inputs.pp.value || "—");

  // abilities
  const abilityLabels = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
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

    ctx.fillStyle = "#ecf2ed";
    ctx.textAlign = "center";
    ctx.font = "24px 'Space Grotesk', 700";
    ctx.fillText(abilityLabels[i], bx + boxW / 2, by + 34);
    ctx.font = "50px 'Space Grotesk', 800";
    ctx.fillText(String(val || 0), bx + boxW / 2, by + 92);
    const mod = Math.floor((val - 10) / 2);
    ctx.font = "24px 'Space Grotesk', 700";
    ctx.fillText(mod >= 0 ? `+${mod}` : `${mod}`, bx + boxW / 2, by + 126);
  });
  ctx.textAlign = "left";
}

function classLine() {
  const cls1 = inputs.class1.value || "Class";
  const lvl1 = inputs.level1.value || "1";
  if (!inputs.multiclass.checked) {
    return `${cls1} ${lvl1}`;
  }
  const cls2 = inputs.class2.value || "Class";
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
  if (inputs.cropZoom) inputs.cropZoom.value = cropState.zoom;
  if (inputs.cropX) inputs.cropX.value = cropState.cx;
  if (inputs.cropY) inputs.cropY.value = cropState.cy;
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

  document.querySelectorAll("[data-ability]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.ability;
      abilities[key] = Number(input.value) || 0;
      drawCard();
    });
  });

  document.getElementById("download").addEventListener("click", () => {
    const dataUrl = canvas.toDataURL("image/png");
    const filename = `${inputs.name.value || "character"}.png`;
    const supportsDownload = "download" in document.createElement("a");
    const isFacebookInApp = /FBAN|FBAV|FB_IAB/.test(navigator.userAgent);

    // Desktop / browsers that honor download attribute
    if (supportsDownload) {
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // In-app browsers (e.g., Facebook Messenger) often block window.open; navigate in-place
    if (isFacebookInApp) {
      window.location.href = dataUrl;
      return;
    }

    // Last resort: open in new tab for manual save
    window.open(dataUrl, "_blank");
  });

  document.getElementById("reset").addEventListener("click", () => {
    inputs.name.value = "Adventurer";
    inputs.race.value = "Human";
    inputs.class1.value = "Fighter";
    inputs.level1.value = 3;
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
  const options = Array.from({ length: 30 }, (_, i) => i + 1);
  document.querySelectorAll("[data-ability]").forEach((sel) => {
    sel.innerHTML = options.map((n) => `<option value="${n}">${n}</option>`).join("");
    const key = sel.dataset.ability;
    sel.value = abilities[key] ?? 10;
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

initAbilitySelects();
initSwatches(accentPalette);
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
