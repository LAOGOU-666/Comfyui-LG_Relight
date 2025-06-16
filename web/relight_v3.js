import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
function createRelightModal() {
    const modal = document.createElement("dialog");
    modal.id = "lg-relight-v3-modal";
    modal.innerHTML = `
        <div class="relight-container">
            <div class="relight-header">
                <h3>LG_Relight</h3>
                <button class="close-button">×</button>
            </div>
            <div class="relight-content">
                <div class="relight-preview">
                    <canvas id="relight-canvas"></canvas>
                </div>
                <div class="relight-controls">
                    <div class="slider-group">
                        <div class="control-row">
                            <label>Z-axis: <span id="z-value">1.000</span></label>
                            <input type="range" id="z-slider" min="-1000" max="1000" value="1000" />
                            <button class="reset-btn" data-slider="z">Reset</button>
                        </div>
                        <div class="control-row">
                            <label>brightness: <span id="brightness-value">1.000</span></label>
                            <input type="range" id="brightness-slider" min="0" max="300" value="100" />
                            <button class="reset-btn" data-slider="brightness">Reset</button>
                        </div>
                        <div class="control-row">
                            <label>Shadow Range: <span id="shadow-range-value">1.000</span></label>
                            <input type="range" id="shadow-range-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="shadow-range">Reset</button>
                        </div>
                        <div class="control-row">
                            <label>Shadow Intensity: <span id="shadow-strength-value">1.000</span></label>
                            <input type="range" id="shadow-strength-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="shadow-strength">Reset</button>
                        </div>
                        <div class="control-row">
                            <label>Highlight Range: <span id="highlight-range-value">1.000</span></label>
                            <input type="range" id="highlight-range-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="highlight-range">Reset</button>
                        </div>
                        <div class="control-row">
                            <label>High light intensity: <span id="highlight-strength-value">1.000</span></label>
                            <input type="range" id="highlight-strength-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="highlight-strength">Reset</button>
                        </div>
                    </div>
                    <div class="bottom-controls">
                        <div class="color-controls">
                            <div class="color-row">
                                <label>Specular Color:</label>
                                <input type="color" id="highlight-color" value="#FFFFFF" />
                                <button class="reset-color-btn" data-color="highlight">Reset</button>
                            </div>
                            <div class="color-row">
                                <label>Shadow Color:</label>
                                <input type="color" id="shadow-color" value="#000000" />
                                <button class="reset-color-btn" data-color="shadow">Reset</button>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button id="apply-relight">apply</button>
                            <button id="cancel-relight">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}
const style = document.createElement("style");
style.textContent = `
    #lg-relight-v3-modal {
        border: none;
        border-radius: 8px;
        padding: 0;
        background: #2a2a2a;
        width: 90vw;
        height: 90vh;
        max-width: 90vw;
        max-height: 90vh;
        margin: 0;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.5);
    }
    .relight-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .relight-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: #333;
        border-bottom: 1px solid #444;
    }
    .relight-header h3 {
        margin: 0;
        color: #fff;
    }
    .close-button {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
    }
    .relight-content {
        padding: 0;
        display: flex;
        flex-direction: row;
        height: calc(100% - 44px);
        overflow: hidden;
    }
    .relight-preview {
        position: relative;
        overflow: hidden;
        background: #1a1a1a;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex: 1;
        height: 100%;
        cursor: crosshair;
    }
    #relight-canvas {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
    .relight-controls {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 300px;
        padding: 20px;
        height: 100%;
        box-sizing: border-box;
        background: #2a2a2a;
        overflow-y: visible;
    }
    .slider-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .control-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .control-row label {
        min-width: 100px;
        white-space: nowrap;
    }
    .control-row input[type="range"] {
        width: 120px;
    }
    .reset-btn, .reset-color-btn {
        padding: 2px 8px;
        background: #555;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        white-space: nowrap;
    }
    .bottom-controls {
        margin-top: 30px;
    }
    .color-controls {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-bottom: 20px;
    }
    .color-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .color-row label {
        min-width: 80px;
    }
    .action-buttons {
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    .action-buttons button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        min-width: 80px;
    }
    #apply-relight {
        background: #2a8af6;
        color: white;
    }
    #cancel-relight {
        background: #666;
        color: white;
    }
`;
document.head.appendChild(style);
class RelightProcessor {
    constructor() {
        this.modal = createRelightModal();
        this.canvas = this.modal.querySelector("#relight-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.originalImage = null;
        this.normalsImage = null;
        this.processedImage = null;
        this.values = {
            x: 0.0,
            y: 0.0,
            z: 1.0,
            brightness: 1.0,
            shadowRange: 1.0,
            shadowStrength: 1.0,
            highlightRange: 1.0,
            highlightStrength: 1.0,
            highlightColor: [1.0, 1.0, 1.0],
            shadowColor: [0.0, 0.0, 0.0]
        };
        this.isDragging = false;
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.modal.querySelector(".close-button").addEventListener("click", () => {
            this.cleanupAndClose(true);
        });
        this.modal.querySelector("#cancel-relight").addEventListener("click", () => {
            this.cleanupAndClose(true);
        });
        this.modal.querySelector("#apply-relight").addEventListener("click", () => {
            this.applyRelight();
        });
        this.modal.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.cleanupAndClose(true);
            }
        });
        const previewArea = this.modal.querySelector(".relight-preview");
        previewArea.addEventListener("mousedown", (e) => {
            this.isDragging = true;
            this.updateLightDirection(e);
        });
        previewArea.addEventListener("mousemove", (e) => {
            if (this.isDragging) {
                this.updateLightDirection(e);
            }
        });
        previewArea.addEventListener("mouseup", () => {
            this.isDragging = false;
        });
        previewArea.addEventListener("mouseleave", () => {
            this.isDragging = false;
        });
        const sliders = {
            "z": this.modal.querySelector("#z-slider"),
            "brightness": this.modal.querySelector("#brightness-slider"),
            "shadow-range": this.modal.querySelector("#shadow-range-slider"),
            "shadow-strength": this.modal.querySelector("#shadow-strength-slider"),
            "highlight-range": this.modal.querySelector("#highlight-range-slider"),
            "highlight-strength": this.modal.querySelector("#highlight-strength-slider")
        };
        for (const [key, slider] of Object.entries(sliders)) {
            slider.addEventListener("input", () => {
                this.updateValues();
                this.updateUI();
                this.processAndUpdatePreview();
            });
        }
        this.modal.querySelector("#highlight-color").addEventListener("input", () => {
            this.updateValues();
            this.processAndUpdatePreview();
        });
        this.modal.querySelector("#shadow-color").addEventListener("input", () => {
            this.updateValues();
            this.processAndUpdatePreview();
        });
        this.modal.querySelectorAll(".reset-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const sliderName = btn.dataset.slider;
                const slider = sliders[sliderName];
                if (sliderName === "z") {
                    slider.value = 1000;
                } else {
                    slider.value = 100;
                }
                this.updateValues();
                this.updateUI();
                this.processAndUpdatePreview();
            });
        });
        this.modal.querySelector("[data-color='highlight']").addEventListener("click", () => {
            this.modal.querySelector("#highlight-color").value = "#FFFFFF";
            this.updateValues();
            this.processAndUpdatePreview();
        });
        this.modal.querySelector("[data-color='shadow']").addEventListener("click", () => {
            this.modal.querySelector("#shadow-color").value = "#000000";
            this.updateValues();
            this.processAndUpdatePreview();
        });
    }
    updateLightDirection(e) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const x = (e.clientX - rect.left - centerX) / centerX;
        const y = -(e.clientY - rect.top - centerY) / centerY;
        this.values.x = Math.max(-1, Math.min(1, x));
        this.values.y = Math.max(-1, Math.min(1, y));
        this.updateUI();
        this.processAndUpdatePreview();
    }
    updateValues() {
        const getSliderValue = (id, scale = 1000) => {
            return parseFloat(this.modal.querySelector(id).value) / scale;
        };
        this.values.z = getSliderValue("#z-slider");
        this.values.brightness = getSliderValue("#brightness-slider", 100);
        this.values.shadowRange = 2.0 - getSliderValue("#shadow-range-slider", 100);
        this.values.shadowStrength = getSliderValue("#shadow-strength-slider", 100);
        this.values.highlightRange = getSliderValue("#highlight-range-slider", 100);
        this.values.highlightStrength = getSliderValue("#highlight-strength-slider", 100);
        const hexToRgb = (hex) => {
            const r = parseInt(hex.substring(1, 3), 16) / 255;
            const g = parseInt(hex.substring(3, 5), 16) / 255;
            const b = parseInt(hex.substring(5, 7), 16) / 255;
            return [r, g, b];
        };
        this.values.highlightColor = hexToRgb(this.modal.querySelector("#highlight-color").value);
        this.values.shadowColor = hexToRgb(this.modal.querySelector("#shadow-color").value);
    }
    updateUI() {
        this.modal.querySelector("#z-value").textContent = this.values.z.toFixed(3);
        this.modal.querySelector("#brightness-value").textContent = this.values.brightness.toFixed(3);
        this.modal.querySelector("#shadow-range-value").textContent = (2.0 - this.values.shadowRange).toFixed(3);
        this.modal.querySelector("#shadow-strength-value").textContent = this.values.shadowStrength.toFixed(3);
        this.modal.querySelector("#highlight-range-value").textContent = this.values.highlightRange.toFixed(3);
        this.modal.querySelector("#highlight-strength-value").textContent = this.values.highlightStrength.toFixed(3);
    }
    async cleanupAndClose(cancelled = false) {
        if (cancelled && this.currentNodeId) {
            try {
                await api.fetchApi("/lg_relight/cancel", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        node_id: this.currentNodeId
                    })
                });
            } catch (error) {
                console.error("发送取消信号失败:", error);
            }
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.originalImage = null;
        this.normalsImage = null;
        this.processedImage = null;
        this.modal.close();
    }
    loadImages(imageData, normalsData) {
        return new Promise((resolve, reject) => {
            const imgOriginal = new Image();
            const imgNormals = new Image();
            let loadedCount = 0;
            const checkAllLoaded = () => {
                loadedCount++;
                if (loadedCount === 2) {
                    resolve({ original: imgOriginal, normals: imgNormals });
                }
            };
            imgOriginal.onload = checkAllLoaded;
            imgNormals.onload = checkAllLoaded;
            imgOriginal.onerror = () => reject(new Error("Failed to load original image"));
            imgNormals.onerror = () => reject(new Error("Failed to load normal map"));
            imgOriginal.src = imageData;
            imgNormals.src = normalsData;
        });
    }
    processAndUpdatePreview() {
        if (!this.originalImage || !this.normalsImage) return;
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = this.originalImage.width;
        offscreenCanvas.height = this.originalImage.height;
        const offCtx = offscreenCanvas.getContext("2d");
        offCtx.drawImage(this.originalImage, 0, 0);
        const imageData = offCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const normalsCanvas = document.createElement("canvas");
        normalsCanvas.width = this.normalsImage.width;
        normalsCanvas.height = this.normalsImage.height;
        const normalsCtx = normalsCanvas.getContext("2d");
        normalsCtx.drawImage(this.normalsImage, 0, 0);
        const normalsData = normalsCtx.getImageData(0, 0, normalsCanvas.width, normalsCanvas.height);
        this.processImage(imageData, normalsData);
        offCtx.putImageData(imageData, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = offscreenCanvas.width;
        this.canvas.height = offscreenCanvas.height;
        this.ctx.drawImage(offscreenCanvas, 0, 0);
        this.processedImage = offscreenCanvas;
    }
    processImage(imageData, normalsData) {
        const { x, y, z, brightness, shadowRange, shadowStrength, highlightRange, highlightStrength, highlightColor, shadowColor } = this.values;
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        const lightX = magnitude > 0 ? x / magnitude : 0;
        const lightY = magnitude > 0 ? y / magnitude : 0;
        const lightZ = magnitude > 0 ? z / magnitude : 0;
        const imgData = imageData.data;
        const norData = normalsData.data;
        const width = imageData.width;
        const height = imageData.height;
        const shadowThreshold = 1.0 - shadowRange;
        const highlightThreshold = 1.0 - highlightRange;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                let nx = norData[i] / 127.5 - 1.0;
                let ny = norData[i + 1] / 127.5 - 1.0;
                let nz = norData[i + 2] / 127.5 - 1.0;
                let diffuse = nx * lightX + ny * lightY + nz * lightZ;
                diffuse = (diffuse + 1.0) * 0.5;
                let shadowMask = Math.min(Math.max((diffuse - shadowThreshold) / Math.max(shadowRange, 0.000001), 0), 1);
                let highlightMask = Math.min(Math.max((diffuse - highlightThreshold) / Math.max(highlightRange, 0.000001), 0), 1);
                let lightIntensity = 1.0;
                if (shadowStrength !== 1.0) {
                    lightIntensity = lightIntensity * (
                        shadowMask +
                        (1.0 - shadowMask) * (2.0 - shadowStrength)
                    );
                }
                if (highlightStrength !== 1.0) {
                    const highlightOffset = highlightStrength - 1.0;
                    lightIntensity = lightIntensity + highlightMask * highlightOffset;
                }
                let finalR = imgData[i];
                let finalG = imgData[i + 1];
                let finalB = imgData[i + 2];
                if (highlightColor[0] !== 1.0 || highlightColor[1] !== 1.0 || highlightColor[2] !== 1.0 ||
                    shadowColor[0] !== 0.0 || shadowColor[1] !== 0.0 || shadowColor[2] !== 0.0) {
                    const colorR = shadowMask * highlightColor[0] + (1.0 - shadowMask) * shadowColor[0];
                    const colorG = shadowMask * highlightColor[1] + (1.0 - shadowMask) * shadowColor[1];
                    const colorB = shadowMask * highlightColor[2] + (1.0 - shadowMask) * shadowColor[2];
                    finalR *= lightIntensity * brightness * colorR;
                    finalG *= lightIntensity * brightness * colorG;
                    finalB *= lightIntensity * brightness * colorB;
                } else {
                    finalR *= lightIntensity * brightness;
                    finalG *= lightIntensity * brightness;
                    finalB *= lightIntensity * brightness;
                }
                imgData[i] = Math.min(Math.max(finalR, 0), 255);
                imgData[i + 1] = Math.min(Math.max(finalG, 0), 255);
                imgData[i + 2] = Math.min(Math.max(finalB, 0), 255);
            }
        }
    }
    async applyRelight() {
        if (!this.processedImage) return;
        try {
            const dataURL = this.processedImage.toDataURL('image/png');
            await api.fetchApi("/lg_relight/update_image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    node_id: this.currentNodeId,
                    image: dataURL
                })
            });
            this.cleanupAndClose();
        } catch (error) {
            console.error("应用重光照失败:", error);
            this.cleanupAndClose();
        }
    }
    async show(nodeId, imageData, normalsData) {
        this.currentNodeId = nodeId;
        try {
            const images = await this.loadImages(imageData, normalsData);
            this.originalImage = images.original;
            this.normalsImage = images.normals;
            this.canvas.width = this.originalImage.width;
            this.canvas.height = this.originalImage.height;
            this.updateValues();
            this.updateUI();
            this.processAndUpdatePreview();
            this.modal.showModal();
        } catch (error) {
            console.error("显示重光照窗口失败:", error);
            this.cleanupAndClose(true);
        }
    }
}
app.registerExtension({
    name: "Comfy.LGRelightV3",
    async setup() {
        const relightProcessor = new RelightProcessor();
        api.addEventListener("lg_relight_init", ({ detail }) => {
            const { node_id, image, normals } = detail;
            relightProcessor.show(node_id, image, normals);
        });
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "LG_Relight") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                const seedWidget = this.addWidget(
                    "number",
                    "seed",
                    0,
                    (value) => {
                        this.seed = value;
                    },
                    {
                        min: 0,
                        max: Number.MAX_SAFE_INTEGER,
                        step: 1,
                        precision: 0
                    }
                );
                const seed_modeWidget = this.addWidget(
                    "combo",
                    "seed_mode",
                    "randomize",
                    () => {},
                    {
                        values: ["fixed", "increment", "decrement", "randomize"],
                        serialize: false
                    }
                );
                seed_modeWidget.beforeQueued = () => {
                    const mode = seed_modeWidget.value;
                    let newValue = seedWidget.value;
                    if (mode === "randomize") {
                        newValue = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                    } else if (mode === "increment") {
                        newValue += 1;
                    } else if (mode === "decrement") {
                        newValue -= 1;
                    } else if (mode === "fixed") {
                        if (!this.hasFixedSeed) {
                            newValue = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                            this.hasFixedSeed = true;
                        }
                    }
                    seedWidget.value = newValue;
                    this.seed = newValue;
                };
                seed_modeWidget.callback = (value) => {
                    if (value !== "fixed") {
                        this.hasFixedSeed = false;
                    }
                };
                const updateButton = this.addWidget("button", "Update torrent", null, () => {
                    const mode = seed_modeWidget.value;
                    let newValue = seedWidget.value;
                    if (mode === "randomize") {
                        newValue = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                    } else if (mode === "increment") {
                        newValue += 1;
                    } else if (mode === "decrement") {
                        newValue -= 1;
                    } else if (mode === "fixed") {
                        newValue = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                        this.hasFixedSeed = true;
                    }
                    seedWidget.value = newValue;
                    seedWidget.callback(newValue);
                    if (window.rgthree && window.rgthree.queueOutputNodes) {
                        window.rgthree.queueOutputNodes([this.id]);
                    }
                });
            };
        }
    }
});
