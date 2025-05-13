import { api } from '../../../scripts/api.js'
import { app } from '../../../scripts/app.js'
const relightConfig = {
    nodeName: "LG_Relight_Ultra",
    libraryName: "ThreeJS",
    libraryUrl: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    defaultSize: 512,
    routes: {
        uploadEndpoint: "/lg_relight/upload_result",
        dataEvent: "relight_image"
    }
};
function createRelightModal() {
    const modal = document.createElement("dialog");
    modal.id = "relight-editor-modal";
    modal.innerHTML = `
        <div class="relight-modal-content">
            <div class="relight-modal-header">
                <div class="relight-modal-title">光照重建 - 3D打光</div>
            </div>
            <div class="relight-modal-body">
                <div class="relight-canvas-container">
                    <div class="light-source-indicator"></div>
                    <div class="light-source-hint">点击或拖动图像设置光源位置</div>
                </div>
                <div class="relight-controls">
                    <div class="relight-control-group">
                        <h3>光照设置</h3>
                        <div class="relight-control-item">
                            <label>光照位置: X: <span class="light-x-value">0.0</span>, Y: <span class="light-y-value">0.0</span>, Z: <span class="light-z-value">1.0</span></label>
                        </div>
                        <div class="relight-control-item">
                            <label>Z轴高度</label>
                            <input type="range" class="relight-slider" id="lightZ" min="0.1" max="2" step="0.1" value="1.0">
                        </div>
                        <div class="relight-control-item">
                            <label>光照强度</label>
                            <input type="range" class="relight-slider" id="lightIntensity" min="0" max="2" step="0.1" value="1.0">
                            <div class="light-intensity-indicator"></div>
                        </div>
                        <div class="relight-control-item">
                            <label>环境光强度</label>
                            <input type="range" class="relight-slider" id="ambientLight" min="0" max="1" step="0.05" value="0.2">
                        </div>
                    </div>
                    <div class="relight-control-group">
                        <h3>材质设置</h3>
                        <div class="relight-control-item">
                            <label>法线强度</label>
                            <input type="range" class="relight-slider" id="normalStrength" min="0" max="2" step="0.1" value="1.0">
                        </div>
                        <div class="relight-control-item">
                            <label>高光强度</label>
                            <input type="range" class="relight-slider" id="specularStrength" min="0" max="2" step="0.05" value="0.2">
                        </div>
                        <div class="relight-control-item">
                            <label>光泽度</label>
                            <input type="range" class="relight-slider" id="shininess" min="1" max="100" step="1" value="0">
                        </div>
                    </div>
                    <div class="relight-control-group">
                        <h3>光源管理</h3>
                        <div class="light-sources-list">
                            <!-- 这里会动态添加光源项 -->
                        </div>
                        <button class="relight-btn add-light">添加光源</button>
                    </div>
                </div>
            </div>
            <div class="relight-buttons">
                <button class="relight-btn cancel">取消</button>
                <button class="relight-btn apply">应用</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}
const modalStyles = `
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
    background: rgba(255, 255, 0, 0.8);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-shadow: 0 0 15px rgba(255, 255, 100, 0.9);
    z-index: 100;
    opacity: 0.7;
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
}
.light-source-item {
    background: #333;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;
    position: relative;
}
.light-source-item.active {
    border: 1px solid #0080ff;
}
.light-source-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px;
}
.light-source-color {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    margin-right: 8px;
    box-shadow: 0 0 5px rgba(0,0,0,0.3);
}
.light-source-controls {
    display: flex;
    gap: 8px;
}
.light-source-controls button {
    background: none;
    border: none;
    color: #aaa;
    cursor: pointer;
    padding: 2px 5px;
    font-size: 12px;
}
.light-source-controls button:hover {
    color: #fff;
}
.light-source-delete {
    color: #ff4444 !important;
}
.light-source-indicator {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 100;
    opacity: 0.7;
    transition: opacity 0.3s;
}
.light-source-item {
    background: #333;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;
    position: relative;
}
.light-source-item.active {
    border: 1px solid var(--light-color, #0080ff);
}
.light-source-header {
    display: flex;
    align-items: center;
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
.light-color-picker {
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: none;
    margin-right: 8px;
}
.light-color-picker::-webkit-color-swatch-wrapper {
    padding: 0;
}
.light-color-picker::-webkit-color-swatch {
    border: 2px solid #666;
    border-radius: 4px;
}
.light-source-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}
`;
class LightEditor {
    constructor() {
        const styleElement = document.createElement('style');
        styleElement.textContent = modalStyles;
        document.head.appendChild(styleElement);
        this.modal = createRelightModal();
        this.canvasContainer = this.modal.querySelector('.relight-canvas-container');
        this.lightIndicator = this.modal.querySelector('.light-source-indicator');
        this.isMovingLight = false;
        this.currentNode = null;
        this.isSceneSetup = false;
        this.lightX = 0;
        this.lightY = 0;
        this.lightZ = 1;
        this.lightSources = [];
        this.activeSourceIndex = -1;
        this.indicatorColors = [
            { color: '#FFD700', name: '黄色' },
            { color: '#00FFFF', name: '青色' },
            { color: '#FF69B4', name: '粉色' },
            { color: '#32CD32', name: '绿色' },
            { color: '#FF4500', name: '橙色' },
            { color: '#9370DB', name: '紫色' },
            { color: '#4169E1', name: '蓝色' },
            { color: '#FF6347', name: '红色' }
        ];
        this.bindEvents();
    }
    bindEvents() {
        this.onCanvasMouseDownHandler = this.onCanvasMouseDown.bind(this);
        this.onCanvasMouseMoveHandler = this.onCanvasMouseMove.bind(this);
        this.onCanvasMouseUpHandler = this.onCanvasMouseUp.bind(this);
        this.onSliderChangeHandler = this.onSliderChange.bind(this);
        const cancelBtn = this.modal.querySelector('.relight-btn.cancel');
        cancelBtn.addEventListener('click', () => this.cleanupAndClose(true));
        const applyBtn = this.modal.querySelector('.relight-btn.apply');
        applyBtn.addEventListener('click', () => this.applyChanges());
        this.canvasContainer.addEventListener('mousedown', this.onCanvasMouseDownHandler);
        const sliders = this.modal.querySelectorAll('.relight-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', this.onSliderChangeHandler);
        });
    }
    async cleanupAndClose(cancelled = false) {
        if (cancelled && this.currentNode) {
            try {
                await api.fetchApi("/lg_relight/cancel", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        node_id: this.currentNode.id
                    })
                });
                console.log('[RelightNode] 已发送取消信号');
            } catch (error) {
                console.error('[RelightNode] 发送取消信号失败:', error);
            }
        }
        document.removeEventListener('mousemove', this.onCanvasMouseMoveHandler);
        document.removeEventListener('mouseup', this.onCanvasMouseUpHandler);
        this.lightSources.forEach(source => {
            if (source.indicator && source.indicator.parentNode) {
                source.indicator.remove();
            }
        });
        if (this.scene) {
            this.lightSources.forEach(source => {
                this.scene.remove(source.light);
            });
            this.lightSources = [];
            this.activeSourceIndex = -1;
        }
        this.isMovingLight = false;
        this.modal.close();
    }
    applyChanges() {
        if (this.renderer && this.scene && this.camera && this.currentNode) {
            this.renderer.render(this.scene, this.camera);
            this.uploadCanvasResult(this.renderer.domElement, this.currentNode.id);
            this.saveLightConfiguration(this.currentNode.id);
        }
        this.cleanupAndClose();
    }
    onCanvasMouseDown(event) {
        if (event.target !== this.canvasContainer &&
            event.target !== this.renderer?.domElement) return;
        this.isMovingLight = true;
        document.addEventListener('mousemove', this.onCanvasMouseMoveHandler);
        document.addEventListener('mouseup', this.onCanvasMouseUpHandler);
        this.updateLightFromMouseEvent(event);
        event.stopPropagation();
    }
    onCanvasMouseMove(event) {
        if (!this.isMovingLight) return;
        this.updateLightFromMouseEvent(event);
        event.stopPropagation();
    }
    onCanvasMouseUp(event) {
        this.isMovingLight = false;
        document.removeEventListener('mousemove', this.onCanvasMouseMoveHandler);
        document.removeEventListener('mouseup', this.onCanvasMouseUpHandler);
        event.stopPropagation();
    }
    updateLightFromMouseEvent(event) {
        if (!this.renderer || !this.renderer.domElement || this.activeSourceIndex === -1) return;
        const activeSource = this.lightSources[this.activeSourceIndex];
        if (!activeSource) return;
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (mouseX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (mouseY - rect.top) / rect.height));
        this.updateLightIndicatorExact(mouseX, mouseY, activeSource.indicator);
        this.lightX = -((x * 2) - 1);
        this.lightY = ((1 - y) * 2) - 1;
        this.lightZ = Math.max(0.1, 1.0 - (Math.sqrt(this.lightX*this.lightX + this.lightY*this.lightY) / Math.SQRT2));
        const xValueEl = this.modal.querySelector('.light-x-value');
        const yValueEl = this.modal.querySelector('.light-y-value');
        const zValueEl = this.modal.querySelector('.light-z-value');
        xValueEl.textContent = this.lightX.toFixed(2);
        yValueEl.textContent = this.lightY.toFixed(2);
        zValueEl.textContent = this.lightZ.toFixed(2);
        activeSource.position = { x: this.lightX, y: this.lightY, z: this.lightZ };
        activeSource.light.position.set(this.lightX, this.lightY, this.lightZ).normalize();
        this.render();
    }
    updateLightIndicatorExact(clientX, clientY, indicator) {
        if (!indicator) return;
        const rect = this.canvasContainer.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        indicator.style.position = 'absolute';
        indicator.style.left = `${offsetX}px`;
        indicator.style.top = `${offsetY}px`;
        indicator.style.display = 'block';
    }
    onSliderChange(event) {
        const sliderId = event.target.id;
        const value = parseFloat(event.target.value);
        const activeSource = this.lightSources[this.activeSourceIndex];
        if (!activeSource) return;
        switch (sliderId) {
            case 'lightZ':
                this.lightZ = value;
                activeSource.position.z = value;
                activeSource.light.position.set(
                    activeSource.position.x,
                    activeSource.position.y,
                    value
                ).normalize();
                const zValueEl = this.modal.querySelector('.light-z-value');
                if (zValueEl) {
                    zValueEl.textContent = value.toFixed(2);
                }
                break;
            case 'lightIntensity':
                activeSource.light.intensity = value;
                activeSource.intensity = value;
                break;
            case 'ambientLight':
                if (this.ambientLight) {
                    this.ambientLight.intensity = value;
                }
                break;
            case 'normalStrength':
                if (this.material && this.material.uniforms && this.material.uniforms.normalScale) {
                    this.material.uniforms.normalScale.value = value;
                } else if (this.material && this.material.normalScale) {
                    this.material.normalScale.set(value, value);
                }
                break;
            case 'specularStrength':
                if (this.material && this.material.uniforms && this.material.uniforms.specularStrength) {
                    this.material.uniforms.specularStrength.value = value;
                } else if (this.material && this.material.specular) {
                    const intensity = value;
                    this.material.specular.setRGB(intensity, intensity, intensity);
                }
                break;
            case 'shininess':
                if (this.material && this.material.uniforms && this.material.uniforms.shininess) {
                    this.material.uniforms.shininess.value = value;
                } else if (this.material) {
                    this.material.shininess = value;
                }
                break;
        }
        this.render();
    }
    base64ToTexture(base64String) {
        return new Promise((resolve) => {
            const texture = new THREE.Texture();
            const img = new Image();
            img.src = `data:image/png;base64,${base64String}`;
            img.onload = () => {
                texture.image = img;
                texture.needsUpdate = true;
                resolve(texture);
            };
        });
    }
    async setupScene(texture, depthMap, normalMap, maskTexture = null) {
        try {
            if (!texture.image || !texture.image.complete) {
                console.warn('[RelightNode] 纹理图像未完全加载');
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            const imageWidth = texture.image.width;
            const imageHeight = texture.image.height;
            const imageAspect = imageWidth / imageHeight;
            const containerRect = this.canvasContainer.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;
            const containerAspect = containerWidth / containerHeight;
            let displayWidth, displayHeight;
            if (imageAspect > containerAspect) {
                displayWidth = containerWidth;
                displayHeight = containerWidth / imageAspect;
            } else {
                displayHeight = containerHeight;
                displayWidth = containerHeight * imageAspect;
            }
            if (!this.isSceneSetup) {
                console.log('[RelightNode] 首次创建场景');
                this.scene = new THREE.Scene();
                const frustumHeight = 2;
                const frustumWidth = frustumHeight * imageAspect;
                this.camera = new THREE.OrthographicCamera(
                    frustumWidth / -2,
                    frustumWidth / 2,
                    frustumHeight / 2,
                    frustumHeight / -2,
                    0.1,
                    1000
                );
                this.camera.position.z = 5;
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    preserveDrawingBuffer: true,
                    alpha: true
                });
                this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
                this.scene.add(this.ambientLight);
                this.isSceneSetup = true;
            }
            this.renderer.setSize(displayWidth, displayHeight);
            if (!this.canvasContainer.contains(this.renderer.domElement)) {
                this.canvasContainer.appendChild(this.renderer.domElement);
            }
            const geometry = new THREE.PlaneGeometry(2 * imageAspect, 2, 32, 32);
            let material;
            if (maskTexture) {
                material = this.createMaskedMaterial(texture, depthMap, normalMap, maskTexture);
            } else {
                material = this.createSimpleMaterial(texture, depthMap, normalMap);
            }
            if (this.mesh) {
                this.mesh.geometry.dispose();
                this.mesh.geometry = geometry;
                this.mesh.material.dispose();
                this.mesh.material = material;
            } else {
                this.mesh = new THREE.Mesh(geometry, material);
                this.scene.add(this.mesh);
            }
            this.material = material;
            this.renderer.setClearColor(0x000000, 0);
            const canvas = this.renderer.domElement;
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            canvas.style.margin = 'auto';
            canvas.style.position = 'absolute';
            canvas.style.left = '50%';
            canvas.style.top = '50%';
            canvas.style.transform = 'translate(-50%, -50%)';
            this.renderer.render(this.scene, this.camera);
            console.log('[RelightNode] 场景设置完成');
            return true;
        } catch (error) {
            console.error('[RelightNode] 场景设置错误:', error);
            return false;
        }
    }
    createSimpleMaterial(baseTexture, depthMap, normalMap) {
        const shininessSlider = this.modal.querySelector('#shininess');
        const specularStrengthSlider = this.modal.querySelector('#specularStrength');
        return new THREE.MeshPhongMaterial({
            map: baseTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(1, 1),
            displacementMap: depthMap,
            displacementScale: 0.3,
            shininess: parseFloat(shininessSlider.value),
            specular: new THREE.Color(parseFloat(specularStrengthSlider.value))
        });
    }
    uploadCanvasResult(canvas, nodeId) {
        canvas.toBlob(async (blob) => {
            try {
                console.log('[RelightNode] 正在上传渲染结果...');
                const formData = new FormData();
                formData.append('node_id', nodeId);
                formData.append('result_image', blob, 'result.png');
                const response = await api.fetchApi('/lg_relight/upload_result', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.error) {
                    console.error('[RelightNode] 上传失败:', result.error);
                } else {
                    console.log('[RelightNode] 上传成功');
                }
            } catch (error) {
                console.error('[RelightNode] 上传失败:', error);
            }
        }, 'image/png', 1.0);
    }
    createLightSource() {
        const colorIndex = this.lightSources.length % this.indicatorColors.length;
        const currentColor = this.indicatorColors[colorIndex];
        const lightSource = {
            id: Date.now(),
            name: `光源 ${this.lightSources.length + 1}`,
            light: new THREE.DirectionalLight(0xffffff, 1.0),
            position: { x: 0, y: 0, z: 2.0 },
            intensity: 1.0,
            indicatorColor: currentColor.color,
            lightColor: '#ffffff',
            indicator: this.createLightIndicator(currentColor.color)
        };
        lightSource.light.position.set(0, 0, 1).normalize();
        this.scene.add(lightSource.light);
        this.lightSources.push(lightSource);
        this.setActiveLight(this.lightSources.length - 1);
        if (this.canvasContainer) {
            const rect = this.canvasContainer.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            this.updateLightIndicatorExact(centerX, centerY, lightSource.indicator);
        }
        if (this.material) {
            const shininessSlider = this.modal.querySelector('#shininess');
            const specularStrengthSlider = this.modal.querySelector('#specularStrength');
            this.material.shininess = parseFloat(shininessSlider.value);
            this.material.specular.setRGB(
                parseFloat(specularStrengthSlider.value),
                parseFloat(specularStrengthSlider.value),
                parseFloat(specularStrengthSlider.value)
            );
        }
        return lightSource;
    }
    createLightIndicator(color) {
        const indicator = document.createElement('div');
        indicator.className = 'light-source-indicator';
        indicator.style.backgroundColor = color;
        indicator.style.boxShadow = `0 0 15px ${color}`;
        this.canvasContainer.appendChild(indicator);
        return indicator;
    }
    updateLightSourcesList() {
        const listContainer = this.modal.querySelector('.light-sources-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        this.lightSources.forEach((source, index) => {
            const item = document.createElement('div');
            item.className = `light-source-item ${index === this.activeSourceIndex ? 'active' : ''}`;
            item.innerHTML = `
                <div class="light-source-header">
                    <div class="light-source-color" style="background-color: ${source.indicatorColor}"></div>
                    <div class="light-source-controls">
                        <input type="color" class="light-color-picker" value="${source.lightColor || '#ffffff'}" title="选择光源颜色">
                        <button class="light-source-visibility" title="显示/隐藏">👁</button>
                        <button class="light-source-delete" title="删除">🗑</button>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => this.setActiveLight(index));
            const colorPicker = item.querySelector('.light-color-picker');
            colorPicker.addEventListener('input', (e) => {
                e.stopPropagation();
                this.updateLightColor(index, e.target.value);
            });
            const deleteBtn = item.querySelector('.light-source-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteLight(index);
                });
            }
            const visibilityBtn = item.querySelector('.light-source-visibility');
            if (visibilityBtn) {
                visibilityBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleLightVisibility(index);
                });
            }
            listContainer.appendChild(item);
        });
    }
    setActiveLight(index) {
        this.activeSourceIndex = index;
        this.updateLightSourcesList();
        const source = this.lightSources[index];
        if (source) {
            const lightIntensitySlider = this.modal.querySelector('#lightIntensity');
            if (lightIntensitySlider) {
                lightIntensitySlider.value = source.light.intensity;
            }
            const xValueEl = this.modal.querySelector('.light-x-value');
            const yValueEl = this.modal.querySelector('.light-y-value');
            const zValueEl = this.modal.querySelector('.light-z-value');
            if (xValueEl && yValueEl && zValueEl) {
                xValueEl.textContent = source.position.x.toFixed(2);
                yValueEl.textContent = source.position.y.toFixed(2);
                zValueEl.textContent = source.position.z.toFixed(2);
            }
        }
    }
    deleteLight(index) {
        const source = this.lightSources[index];
        if (source) {
            this.scene.remove(source.light);
            if (source.indicator && source.indicator.parentNode) {
                source.indicator.remove();
            }
            this.lightSources.splice(index, 1);
            if (this.activeSourceIndex === index) {
                this.activeSourceIndex = Math.max(-1, this.lightSources.length - 1);
            } else if (this.activeSourceIndex > index) {
                this.activeSourceIndex--;
            }
            if (this.lightSources.length === 0) {
                this.activeSourceIndex = -1;
                if (this.ambientLight) {
                    this.ambientLight.intensity = 1.0;
                }
            }
            this.updateLightSourcesList();
            this.render();
        }
    }
    toggleLightVisibility(index) {
        const source = this.lightSources[index];
        if (source) {
            source.light.visible = !source.light.visible;
            source.indicator.style.opacity = source.light.visible ? '0.7' : '0.2';
            this.render();
        }
    }
    updateLightIntensity(index, value) {
        const source = this.lightSources[index];
        if (source) {
            source.intensity = value;
            source.light.intensity = value;
            this.render();
        }
    }
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    async show(nodeId, detail) {
        try {
            this.currentNode = app.graph.getNodeById(nodeId);
            if (!this.currentNode) {
                console.error('[RelightNode] 找不到节点:', nodeId);
                return;
            }
            console.log('[RelightNode] 开始处理图像...');
            const { bg_image, bg_depth_map, bg_normal_map, has_mask, mask } = detail;
            this.hasMask = has_mask;
            this.modal.showModal();
            const texturePromises = [
                this.base64ToTexture(bg_image),
                this.base64ToTexture(bg_depth_map),
                this.base64ToTexture(bg_normal_map)
            ];
            if (has_mask && mask) {
                texturePromises.push(this.base64ToTexture(mask));
                console.log('[RelightNode] 检测到遮罩数据，将加载遮罩纹理');
            }
            const loadedTextures = await Promise.all(texturePromises);
            const texture = loadedTextures[0];
            const depthMap = loadedTextures[1];
            const normalMap = loadedTextures[2];
            const maskTexture = has_mask ? loadedTextures[3] : null;
            console.log('[RelightNode] 纹理加载完成，设置场景...');
            await this.setupScene(texture, depthMap, normalMap, maskTexture);
            const configRestored = await this.restoreLightConfiguration(nodeId);
            if (!configRestored) {
                this.lightSources = [];
                this.activeSourceIndex = -1;
                const existingIndicators = this.canvasContainer.querySelectorAll('.light-source-indicator');
                existingIndicators.forEach(indicator => indicator.remove());
            }
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            const addLightBtn = this.modal.querySelector('.relight-btn.add-light');
            if (addLightBtn) {
                const newAddLightBtn = addLightBtn.cloneNode(true);
                addLightBtn.parentNode.replaceChild(newAddLightBtn, addLightBtn);
                newAddLightBtn.addEventListener('click', () => {
                    if (this.scene) {
                        this.createLightSource();
                    } else {
                        console.error('[RelightNode] 场景未初始化，无法添加光源');
                    }
                });
            }
            console.log('[RelightNode] 编辑器显示成功');
        } catch (error) {
            console.error('[RelightNode] 处理图像时出错:', error);
        }
    }
    updateLightColor(index, color) {
        const source = this.lightSources[index];
        if (source) {
            source.lightColor = color;
            const colorObj = new THREE.Color(color);
            source.light.color = colorObj;
            const listContainer = this.modal.querySelector('.light-sources-list');
            if (listContainer) {
                const lightItem = listContainer.children[index];
                if (lightItem) {
                    const colorPicker = lightItem.querySelector('.light-color-picker');
                    if (colorPicker) {
                        colorPicker.value = color;
                    }
                }
            }
            this.render();
        }
    }
    saveLightConfiguration(nodeId) {
        const config = {
            lights: this.lightSources.map(source => ({
                screenX: source.indicator.offsetLeft,
                screenY: source.indicator.offsetTop,
                position: { ...source.position },
                intensity: source.intensity,
                color: source.lightColor,
                visible: source.light.visible
            })),
            ambientLight: {
                intensity: this.ambientLight.intensity
            },
            material: {
                normalScale: this.material.normalScale.x,
                shininess: this.material.shininess,
                specularStrength: this.material.specular.r
            }
        };
        if (this.currentNode) {
            this.currentNode.lightConfig = config;
        }
    }
    async restoreLightConfiguration(nodeId) {
        const node = app.graph.getNodeById(nodeId);
        if (!node || !node.lightConfig) return false;
        const config = node.lightConfig;
        this.lightSources.forEach(source => {
            this.scene.remove(source.light);
            if (source.indicator && source.indicator.parentNode) {
                source.indicator.remove();
            }
        });
        this.lightSources = [];
        for (const lightConfig of config.lights) {
            const source = this.createLightSource();
            source.position = { ...lightConfig.position };
            source.light.position.set(
                lightConfig.position.x,
                lightConfig.position.y,
                lightConfig.position.z
            ).normalize();
            source.intensity = lightConfig.intensity;
            source.light.intensity = lightConfig.intensity;
            source.light.visible = lightConfig.visible;
            if (lightConfig.color) {
                this.updateLightColor(this.lightSources.length - 1, lightConfig.color);
            }
            if (this.canvasContainer && source.indicator) {
                source.indicator.style.left = `${lightConfig.screenX}px`;
                source.indicator.style.top = `${lightConfig.screenY}px`;
                source.indicator.style.opacity = lightConfig.visible ? '0.7' : '0.2';
            }
        }
        if (config.ambientLight && this.ambientLight) {
            this.ambientLight.intensity = config.ambientLight.intensity;
            const ambientLightSlider = this.modal.querySelector('#ambientLight');
            if (ambientLightSlider) {
                ambientLightSlider.value = config.ambientLight.intensity;
            }
        }
        if (config.material && this.material) {
            if (config.material.normalScale !== undefined) {
                this.material.normalScale.set(config.material.normalScale, config.material.normalScale);
                const normalStrengthSlider = this.modal.querySelector('#normalStrength');
                if (normalStrengthSlider) {
                    normalStrengthSlider.value = config.material.normalScale;
                }
            }
            if (config.material.shininess !== undefined) {
                this.material.shininess = config.material.shininess;
                const shininessSlider = this.modal.querySelector('#shininess');
                if (shininessSlider) {
                    shininessSlider.value = config.material.shininess;
                }
            }
            if (config.material.specularStrength !== undefined) {
                this.material.specular.setRGB(
                    config.material.specularStrength,
                    config.material.specularStrength,
                    config.material.specularStrength
                );
                const specularStrengthSlider = this.modal.querySelector('#specularStrength');
                if (specularStrengthSlider) {
                    specularStrengthSlider.value = config.material.specularStrength;
                }
            }
        }
        this.updateLightSourcesList();
        this.render();
        return true;
    }
    createMaskedMaterial(baseTexture, depthMap, normalMap, maskTexture) {
        console.log('[RelightNode] 创建带遮罩的材质');
        const material = new THREE.MeshPhongMaterial({
            map: baseTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(1, 1),
            displacementMap: depthMap,
            displacementScale: 0.3,
            shininess: 30,
            specular: new THREE.Color(0x444444)
        });
        material.onBeforeCompile = (shader) => {
            shader.uniforms.maskTexture = { value: maskTexture };
            shader.fragmentShader = shader.fragmentShader.replace(
                'uniform float opacity;',
                'uniform float opacity;\nuniform sampler2D maskTexture;'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                float maskValue = texture2D(maskTexture, vUv).r;
                vec3 originalColor = diffuseColor.rgb;
                reflectedLight.directDiffuse *= maskValue;
                reflectedLight.directSpecular *= maskValue;
                reflectedLight.indirectDiffuse *= maskValue;
                reflectedLight.indirectSpecular *= maskValue;
                `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
                `
                vec3 finalColor = mix(originalColor, outgoingLight, maskValue);
                gl_FragColor = vec4(finalColor, diffuseColor.a);
                `
            );
        };
        return material;
    }
}
app.registerExtension({
    name: "LG_Relight_Ultra",
    async setup() {
        console.log('[RelightNode] 开始初始化扩展...');
        if (!window.THREE) {
            console.log('[RelightNode] 正在加载 Three.js...');
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = relightConfig.libraryUrl;
                script.onload = () => {
                    console.log('[RelightNode] Three.js 加载成功');
                    resolve();
                };
                script.onerror = (error) => {
                    console.error('[RelightNode] Three.js 加载失败:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        }
        const lightEditor = new LightEditor();
        api.addEventListener("relight_image", async ({ detail }) => {
            try {
                const { node_id } = detail;
                console.log('[RelightNode] 处理节点:', node_id);
                await lightEditor.show(node_id, detail);
            } catch (error) {
                console.error('[RelightNode] 处理错误:', error);
            }
        });
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeType.comfyClass === "LG_Relight_Ultra") {
            console.log('[RelightNode] 注册节点定义...');
            const originalOnAdded = nodeType.prototype.onAdded;
            const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
            const originalOnRemoved = nodeType.prototype.onRemoved;
            const originalOnClearError = nodeType.prototype.onClearError;
            nodeType.prototype.onAdded = function() {
                console.log('[RelightNode] 节点添加到画布, ID:', this.id);
                if (originalOnAdded) {
                    return originalOnAdded.apply(this, arguments);
                }
            };
            nodeType.prototype.onNodeCreated = function() {
                if (originalOnNodeCreated) {
                    originalOnNodeCreated.apply(this, arguments);
                }
                this.hasFixedSeed = false;
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
                const updateButton = this.addWidget("button", "更新种子", null, () => {
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
                    console.log('[RelightNode] 种子已更新为:', newValue);
                });
                nodeType.prototype.resetLightConfig = function() {
                    if (this.lightConfig) {
                        delete this.lightConfig;
                    }
                    const defaultValues = {
                        'lightZ': 2.0,
                        'lightIntensity': 1.0,
                        'ambientLight': 0.2,
                        'normalStrength': 1.0,
                        'specularStrength': 0.2,
                        'shininess': 0
                    };
                    const modal = document.getElementById('relight-editor-modal');
                    if (modal) {
                        Object.entries(defaultValues).forEach(([id, value]) => {
                            const slider = modal.querySelector(`#${id}`);
                            if (slider) {
                                slider.value = value;
                                const event = new Event('input', { bubbles: true });
                                slider.dispatchEvent(event);
                            }
                        });
                        const lightSourcesList = modal.querySelector('.light-sources-list');
                        if (lightSourcesList) {
                            lightSourcesList.innerHTML = '';
                        }
                        const indicators = modal.querySelectorAll('.light-source-indicator');
                        indicators.forEach(indicator => indicator.remove());
                    }
                    console.log('[RelightNode] 光照配置和UI已重置');
                };
                nodeType.prototype.onRemoved = function() {
                    this.resetLightConfig();
                    if (originalOnRemoved) {
                        return originalOnRemoved.apply(this, arguments);
                    }
                };
                nodeType.prototype.onClearError = function() {
                    this.resetLightConfig();
                    if (originalOnClearError) {
                        return originalOnClearError.apply(this, arguments);
                    }
                };
            }
        }
    }
});