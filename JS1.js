document.addEventListener("DOMContentLoaded", () => {
const burgerBtn = document.getElementById("burgerBtn");
const sideMenu = document.getElementById("sideMenu");
const closeMenu = sideMenu.querySelector(".close-menu");
const menuItems = document.querySelectorAll(".menu-item");
const workspaces = document.querySelectorAll(".workspace");
const segmentsContainer = document.getElementById("segmentsContainer");
const compileBtn = document.getElementById("compileBtn");
const statusFeed = document.getElementById("statusFeedForward");
const outputManifest = document.getElementById("outputManifest");
const totalDurationInput = document.getElementById("totalDurationInput");
const rawScriptBox = document.getElementById("rawScriptBox");
const partsConfig = [
{ id: 1, name: "Part 1: Hook", pctStart: 0.0, pctEnd: 0.15, trans: 0 },
{ id: 2, name: "Part 2: Body A", pctStart: 0.15, pctEnd: 0.40, trans: 3 },
{ id: 3, name: "Part 3: Body B", pctStart: 0.40, pctEnd: 0.65, trans: 3 },
{ id: 4, name: "Part 4: Body C", pctStart: 0.65, pctEnd: 0.90, trans: 3 },
{ id: 5, name: "Part 5: Outro", pctStart: 0.90, pctEnd: 1.00, trans: 1 }
];
let trackDurations = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
burgerBtn.addEventListener("click", () => {
sideMenu.classList.add("open");
sideMenu.setAttribute("aria-hidden", "false");
});
const closeSidebar = () => {
sideMenu.classList.remove("open");
sideMenu.setAttribute("aria-hidden", "true");
};
closeMenu.addEventListener("click", closeSidebar);
menuItems.forEach(item => {
item.addEventListener("click", () => {
menuItems.forEach(i => i.classList.remove("active-menu"));
item.classList.add("active-menu");
const target = item.getAttribute("data-target");
workspaces.forEach(ws => {
ws.classList.remove("active");
if (ws.id === target) {
ws.classList.add("active");
}
});
closeSidebar();
});
});
const logStatus = msg => {
const div = document.createElement("div");
div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
statusFeed.appendChild(div);
statusFeed.scrollTop = statusFeed.scrollHeight;
};
const renderSegments = (totalSec) => {
segmentsContainer.innerHTML = "";
partsConfig.forEach(p => {
const startSec = (totalSec * p.pctStart).toFixed(1);
const endSec = (totalSec * p.pctEnd).toFixed(1);
const reqSec = (endSec - startSec).toFixed(1);
trackDurations[p.id] = parseFloat(reqSec);
const block = document.createElement("div");
block.className = "segment-block";
block.innerHTML = `
<div class="segment-meta">
<span>${p.name} (${startSec}s - ${endSec}s)</span>
<span class="req-time" id="req-${p.id}">Target: ${reqSec}s</span>
</div>
<div class="file-row">
<input type="file" class="clip-input" data-id="${p.id}" accept="video/*">
<div class="validation-indicator" id="val-${p.id}">No Asset</div>
</div>`;
segmentsContainer.appendChild(block);
});
setupValidationListeners();
};
totalDurationInput.addEventListener("input", e => {
const val = parseFloat(e.target.value);
if (val > 0) {
renderSegments(val);
logStatus(`Recalculated segment constraints for ${val}s runtime.`);
}
});
const setupValidationListeners = () => {
const inputs = document.querySelectorAll(".clip-input");
inputs.forEach(input => {
input.addEventListener("change", e => {
const pid = input.getAttribute("data-id");
const file = e.target.files[0];
const indicator = document.getElementById(`val-${pid}`);
if (!file) {
indicator.textContent = "No Asset";
indicator.className = "validation-indicator";
return;
}
const video = document.createElement("video");
video.preload = "metadata";
video.src = URL.createObjectURL(file);
video.onloadedmetadata = () => {
URL.revokeObjectURL(video.src);
const actualDur = video.duration;
const requiredDur = trackDurations[pid];
if (actualDur >= requiredDur) {
indicator.textContent = "Valid Asset";
indicator.className = "validation-indicator valid";
logStatus(`${partsConfig[pid - 1].name} passed validation (${actualDur.toFixed(1)}s asset meets ${requiredDur}s req).`);
} else {
indicator.textContent = "Too Short";
indicator.className = "validation-indicator invalid";
logStatus(`ERROR: ${partsConfig[pid - 1].name} asset is ${actualDur.toFixed(1)}s! Needs ${requiredDur}s.`);
}
};
});
});
};
compileBtn.addEventListener("click", () => {
const totalSec = parseFloat(totalDurationInput.value);
const script = rawScriptBox.value;
const videoId = document.getElementById("videoTitle").value || "unnamed_short";
if (!totalSec || !script) {
logStatus("ERROR: Runtime duration and script text are required.");
return;
}
let allValid = true;
partsConfig.forEach(p => {
const ind = document.getElementById(`val-${p.id}`);
if (!ind || !ind.classList.contains("valid")) {
allValid = false;
}
});
if (!allValid) {
logStatus("COMPILE BLOCKED: Invalid or missing video clips detected.");
alert("Please load clips that meet or exceed the required segment durations.");
return;
}
const manifest = {
video_id: videoId,
total_duration: totalSec,
raw_script: script,
structure_version: "v2_validated",
chapters: []
};
const fileInputs = document.querySelectorAll(".clip-input");
partsConfig.forEach((p, idx) => {
const file = fileInputs[idx].files[0];
manifest.chapters.push({
part_id: p.id,
name: p.name,
start_time: parseFloat((totalSec * p.pctStart).toFixed(2)),
end_time: parseFloat((totalSec * p.pctEnd).toFixed(2)),
duration_req: trackDurations[p.id],
transition: p.trans,
filename: file.name
});
});
logStatus("Payload finalized and exported.");
outputManifest.value = JSON.stringify(manifest, null, 2);
});
renderSegments(30.0);
});
