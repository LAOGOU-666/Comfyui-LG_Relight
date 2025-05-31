import { api } from '../../../scripts/api.js'
import { app } from '../../../scripts/app.js'
import { t } from '../i18n.js' // Importa el helper de traducción

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
                <div class="relight-modal-title">${t("光照重建 - 3D打光")}</div>
            </div>
            <div class="relight-modal-body">
                <div class="relight-canvas-container">
                    <div class="light-source-indicator"></div>
                    <div class="light-source-hint">${t("点击或拖动图像设置光源位置")}</div>
                </div>
                <div class="relight-controls">
                    <div class="relight-control-group">
                        <h3>${t("光照设置")}</h3>
                        <div class="relight-control-item">
                            <label>${t("光照位置")}: X: <span class="light-x-value">0.0</span>, Y: <span class="light-y-value">0.0</span>, Z: <span class="light-z-value">1.0</span></label>
                        </div>
                        <div class="relight-control-item">
                            <label>${t("Z轴偏移")}</label>
                            <input type="range" class="relight-slider" id="zOffset" min="-1" max="1" step="0.05" value="0">
                        </div>
                        <div class="relight-control-item">
                            <label>${t("光照强度")}</label>
                            <input type="range" class="relight-slider" id="lightIntensity" min="0" max="5" step="0.1" value="1.0">
                            <div class="light-intensity-indicator"></div>
                        </div>
                        <div class="relight-control-item">
                            <label>${t("环境光强度")}</label>
                            <input type="range" class="relight-slider" id="ambientLight" min="0" max="1" step="0.05" value="0.2">
                        </div>
                        <div class="relight-control-item">
                            <label>${t("法线强度")}</label>
                            <input type="range" class="relight-slider" id="normalStrength" min="0" max="2" step="0.1" value="0">
                        </div>
                        <div class="relight-control-item light-type-selector">
                            <label>${t("光源类型")}</label>
                            <select id="lightType" class="relight-select">
                                <option value="point">${t("点光源")}</option>
                                <option value="spot">${t("聚光灯")}</option>
                            </select>
                        </div>
                        <div class="relight-control-item pointlight-controls">
                            <label>${t("光源半径")}</label>
                            <input type="range" class="relight-slider" id="pointlightRadius" min="1" max="20" step="0.5" value="10">
                        </div>
                        <div class="relight-control-item spotlight-controls" style="display: none;">
                            <label>${t("聚光灯角度")}</label>
                            <input type="range" class="relight-slider" id="spotlightAngle" min="0.1" max="1.0" step="0.01" value="0.5">
                        </div>
                        <div class="relight-control-item spotlight-controls" style="display: none;">
                            <label>${t("聚光灯衰减")}</label>
                            <input type="range" class="relight-slider" id="spotlightPenumbra" min="0" max="1" step="0.05" value="0.2">
                        </div>
                    </div>
                    <div class="relight-control-group">
                        <h3>${t("光源管理")}</h3>
                        <div class="light-sources-list">
                            <!-- 这里会动态添加光源项 -->
                        </div>
                        <button class="relight-btn add-light">${t("添加光源")}</button>
                    </div>
                </div>
            </div>
            <div class="relight-buttons">
                <button class="relight-btn cancel">${t("取消")}</button>
                <button class="relight-btn apply">${t("应用")}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Los estilos no requieren traducción.
export const modalStyles = `...`;
