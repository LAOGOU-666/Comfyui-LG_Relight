import { api } from '../../../scripts/api.js'
import { app } from '../../../scripts/app.js'

export const relightConfig = {
    nodeName: "LG_Relight_Ultra",
    libraryName: "ThreeJS",
    libraryUrl: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    defaultSize: 512,
    routes: {
        uploadEndpoint: "/lg_relight/upload_result",
        dataEvent: "relight_image"
    }
};

export function createRelightModal() {
    const modal = document.createElement("dialog");
    modal.id = "relight-editor-modal";
    modal.innerHTML = `
        <div class="relight-modal-content">
            <div class="relight-modal-header">
                <div class="relight-modal-title">光照重建 Lighting reconstruction - 3D打光</div>
            </div>
            <div class="relight-modal-body">
                <div class="relight-canvas-container">
                    <div class="light-source-indicator"></div>
                    <div class="light-source-hint">点击或拖动图像设置光源位置 Click or drag the image to set the light source position</div>
                </div>
                <div class="relight-controls">
                    <div class="relight-control-group">
                        <h3>光照设置Lighting settings</h3>
                        <div class="relight-control-item">
                            <label>光照位置Lighting Position: X: <span class="light-x-value">0.0</span>, Y: <span class="light-y-value">0.0</span>, Z: <span class="light-z-value">1.0</span></label>
                        </div>
                        <div class="relight-control-item">
                            <label>Z轴偏移Z-axis offset</label>
                            <input type="range" class="relight-slider" id="zOffset" min="-1" max="1" step="0.05" value="0">
                        </div>
                        <div class="relight-control-item">
                            <label>光照强度Light intensity</label>
                            <input type="range" class="relight-slider" id="lightIntensity" min="0" max="5" step="0.1" value="1.0">
                            <div class="light-intensity-indicator"></div>
                        </div>
                        <div class="relight-control-item">
                            <label>环境光强度Ambient light intensity</label>
                            <input type="range" class="relight-slider" id="ambientLight" min="0" max="1" step="0.05" value="0.2">
                        </div>
                        <div class="relight-control-item">
                            <label>法线强度Normal Strength</label>
                            <input type="range" class="relight-slider" id="normalStrength" min="0" max="2" step="0.1" value="0">
                        </div>
                        <div class="relight-control-item light-type-selector">
                            <label>光源类型Light source type</label>
                            <select id="lightType" class="relight-select">
                                <option value="point">点光源Point Light</option>
                                <option value="spot">聚光灯spotlight</option>
                            </select>
                        </div>
                        <div class="relight-control-item pointlight-controls">
                            <label>光源半径Light source radius</label>
                            <input type="range" class="relight-slider" id="pointlightRadius" min="1" max="20" step="0.5" value="10">
                        </div>
                        <div class="relight-control-item spotlight-controls" style="display: none;">
                            <label>聚光灯角度Spotlight Angle</label>
                            <input type="range" class="relight-slider" id="spotlightAngle" min="0.1" max="1.0" step="0.01" value="0.5">
                        </div>
                        <div class="relight-control-item spotlight-controls" style="display: none;">
                            <label>Spotlight Attenuation</label>
                            <input type="range" class="relight-slider" id="spotlightPenumbra" min="0" max="1" step="0.05" value="0.2">
                        </div>
                    </div>
                    <div class="relight-control-group">
                        <h3>Light source management</h3>
                        <div class="light-sources-list">
                            <!-- Light source items will be added dynamically here -->
                        </div>
                        <button class="relight-btn add-light">Adding Light Sources</button>
                    </div>
                </div>
            </div>
            <div class="relight-buttons">
                <button class="relight-btn cancel">Cancel</button>
                <button class="relight-btn apply">apply</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

export const modalStyles = `
    #relight-editor-modal * {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
    #relight-editor-modal {
        border: none;
        border-radius: 8px;
        padding: 0;
        background: #2a2a2a;
        width: 90vw;
        height: 90vh;
        max-width: 90vw;
        max-height: 90vh;
    }
    .relight-modal-content {
        background: #1a1a1a;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .relight-modal-header {
        padding: 10px 15px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #333;
    }
    .relight-modal-title {
        font-size: 18px;
        color: #fff;
    }
    .relight-modal-body {
        flex: 1;
        display: flex;
        overflow: hidden;
        height: calc(100% - 120px);
    }
    .relight-canvas-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #222;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }
    .light-source-indicator {
        position: absolute;
        width: 24px;
        height: 24px;
        background: #ffffff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
        z-index: 100;
        opacity: 1.0;
        transition: opacity 0.3s;
    }
    .spotlight-target-indicator {
        position: absolute;
        width: 12px;
        height: 12px;
        background: #ffffff;
        border: 2px solid rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 90;
        opacity: 0.9;
    }
    .spotlight-connection-line {
        position: absolute;
        height: 2px;
        background: rgba(255, 255, 255, 0.7);
        transform-origin: left center;
        pointer-events: none;
        z-index: 80;
    }
    .light-source-hint {
        position: absolute;
        top: 10px;
        left: 10px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        background: rgba(0, 0, 0, 0.5);
        padding: 5px 10px;
        border-radius: 3px;
        pointer-events: none;
        opacity: 0.7;
        transition: opacity 0.3s;
    }
    .spotlight-hint {
        position: absolute;
        bottom: 10px;
        left: 10px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        background: rgba(0, 0, 0, 0.5);
        padding: 5px 10px;
        border-radius: 3px;
        pointer-events: none;
        opacity: 0.7;
        z-index: 110;
    }
    .relight-canvas-container:hover .light-source-hint {
        opacity: 0.3;
    }
    .relight-controls {
        width: 300px;
        padding: 15px;
        background: #222;
        border-left: 1px solid #333;
        overflow-y: auto;
        height: 100%;
    }
    .relight-control-group {
        margin-bottom: 15px;
    }
    .relight-control-group h3 {
        font-size: 14px;
        color: #ccc;
        margin-bottom: 10px;
        border-bottom: 1px solid #333;
        padding-bottom: 5px;
    }
    .relight-control-item {
        margin-bottom: 10px;
    }
    .relight-control-item label {
        display: block;
        color: #aaa;
        margin-bottom: 5px;
        font-size: 12px;
    }
    .relight-slider {
        width: 100%;
        background: #333;
        height: 6px;
        -webkit-appearance: none;
        border-radius: 3px;
    }
    .relight-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #0080ff;
        border-radius: 50%;
        cursor: pointer;
    }
    .relight-select {
        width: 100%;
        background: #333;
        color: #fff;
        border: none;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
    }
    .relight-select option {
        background: #2a2a2a;
    }
    .relight-buttons {
        padding: 15px;
        border-top: 1px solid #333;
        display: flex;
        justify-content: flex-end;
    }
    .relight-btn {
        background: #0080ff;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        margin-left: 10px;
        cursor: pointer;
        font-size: 14px;
    }
    .relight-btn:hover {
        background: #0070e0;
    }
    .relight-btn.cancel {
        background: #444;
    }
    .relight-btn.cancel:hover {
        background: #555;
    }
    .light-intensity-indicator {
        width: 100%;
        height: 10px;
        background: linear-gradient(to right, #333, #fffa);
        border-radius: 5px;
        margin-top: 5px;
    }
    .light-value-display {
        display: flex;
        justify-content: space-between;
        color: #aaa;
        font-size: 12px;
        margin-top: 5px;
    }
    .light-sources-list {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 10px;
        border: 1px solid #333;
        border-radius: 4px;
        background: #1a1a1a;
    }
    .light-source-item {
        background: #333;
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 4px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;
    }
    .light-source-item:hover {
        background: #444;
    }
    .light-source-item.active {
        border: 1px solid #0080ff;
        background: #2a2a2a;
    }
    .light-source-header {
        display: flex;
        align-items: center;
        width: 100%;
    }
    .light-source-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        margin-right: 5px;
        box-shadow: 0 0 3px rgba(0,0,0,0.3);
        flex-shrink: 0;
    }
    .light-source-name {
        color: #ddd;
        font-size: 12px;
        margin-right: 5px;
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .light-source-controls {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-left: auto;
    }
    .light-source-controls button {
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 16px;
        transition: color 0.2s;
    }
    .light-source-controls button:hover {
        color: #fff;
    }
    .light-source-delete {
        color: #ff4444 !important;
    }
    .light-source-delete:hover {
        color: #ff6666 !important;
    }
    .light-color-picker {
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: none;
    }
    .light-color-picker::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    .light-color-picker::-webkit-color-swatch {
        border: 1px solid #666;
        border-radius: 4px;
    }
    .selection-ring {
        position: absolute;
        top: -6px;
        left: -6px;
        right: -6px;
        bottom: -6px;
        border: 6px solid #00ff00;
        border-radius: 50%;
        box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
    }
    .spotlight-controls {
        transition: display 0.3s;
    }
    #relight-editor-modal::backdrop {
        background: rgba(0, 0, 0, 0.5);
    }
    #relight-editor-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
    }
`;
