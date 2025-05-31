import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { t } from "./i18n.js"; // <--- Añadir import para traducción

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
                            <label>${t("Z轴")}: <span id="z-value">1.000</span></label>
                            <input type="range" id="z-slider" min="-1000" max="1000" value="1000" />
                            <button class="reset-btn" data-slider="z">${t("重置")}</button>
                        </div>
                        <div class="control-row">
                            <label>${t("亮度")}: <span id="brightness-value">1.000</span></label>
                            <input type="range" id="brightness-slider" min="0" max="300" value="100" />
                            <button class="reset-btn" data-slider="brightness">${t("重置")}</button>
                        </div>
                        <div class="control-row">
                            <label>${t("阴影范围")}: <span id="shadow-range-value">1.000</span></label>
                            <input type="range" id="shadow-range-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="shadow-range">${t("重置")}</button>
                        </div>
                        <div class="control-row">
                            <label>${t("阴影强度")}: <span id="shadow-strength-value">1.000</span></label>
                            <input type="range" id="shadow-strength-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="shadow-strength">${t("重置")}</button>
                        </div>
                        <div class="control-row">
                            <label>${t("高光范围")}: <span id="highlight-range-value">1.000</span></label>
                            <input type="range" id="highlight-range-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="highlight-range">${t("重置")}</button>
                        </div>
                        <div class="control-row">
                            <label>${t("高光强度")}: <span id="highlight-strength-value">1.000</span></label>
                            <input type="range" id="highlight-strength-slider" min="0" max="200" value="100" />
                            <button class="reset-btn" data-slider="highlight-strength">${t("重置")}</button>
                        </div>
                    </div>
                    <div class="bottom-controls">
                        <div class="color-controls">
                            <div class="color-row">
                                <label>${t("高光颜色")}:</label>
                                <input type="color" id="highlight-color" value="#FFFFFF" />
                                <button class="reset-color-btn" data-color="highlight">${t("重置")}</button>
                            </div>
                            <div class="color-row">
                                <label>${t("阴影颜色")}:</label>
                                <input type="color" id="shadow-color" value="#000000" />
                                <button class="reset-color-btn" data-color="shadow">${t("重置")}</button>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button id="apply-relight">${t("应用")}</button>
                            <button id="cancel-relight">${t("取消")}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// ... (el resto del código JS permanece igual hasta los mensajes de error/cancelación)

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
                console.error(t("发送取消信号失败") + ":", error);
            }
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.originalImage = null;
        this.normalsImage = null;
        this.processedImage = null;
        this.modal.close();
    }

// ... (resto igual, hasta los mensajes de error en applyRelight y show)

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
            console.error(t("应用重光照失败") + ":", error);
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
            console.error(t("显示重光照窗口失败") + ":", error);
            this.cleanupAndClose(true);
        }
    }
// ... (el resto sin cambios, salvo las cadenas chinas que veas en el código, siempre reemplazarlas por t("..."))
// Por ejemplo, "更新种子" => t("更新种子") en los widgets/button, etc.
