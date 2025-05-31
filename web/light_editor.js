import { api } from '../../../scripts/api.js'
import { app } from '../../../scripts/app.js'
import { createRelightModal, modalStyles } from './config.js'
import { SceneUtils } from './scene_utils.js'
import { t } from './i18n.js';

export class LightEditor {
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
        this.zOffset = 0;
        this.lightSources = [];
        this.activeSourceIndex = -1;
        this.bindEvents();
    }

    bindEvents() {
        this.onCanvasMouseDownHandler = this.onCanvasMouseDown.bind(this);
        this.onCanvasMouseMoveHandler = this.onCanvasMouseMove.bind(this);
        this.onCanvasMouseUpHandler = this.onCanvasMouseUp.bind(this);
        this.onSliderChangeHandler = this.onSliderChange.bind(this);
        this.onLightTypeChangeHandler = this.onLightTypeChange.bind(this);
        const cancelBtn = this.modal.querySelector('.relight-btn.cancel');
        cancelBtn.addEventListener('click', () => this.cleanupAndClose(true));
        const applyBtn = this.modal.querySelector('.relight-btn.apply');
        applyBtn.addEventListener('click', () => this.applyChanges());
        this.canvasContainer.addEventListener('mousedown', this.onCanvasMouseDownHandler);
        const sliders = this.modal.querySelectorAll('.relight-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', this.onSliderChangeHandler);
        });
        
        // 添加光源类型切换事件监听
        const lightTypeSelect = this.modal.querySelector('#lightType');
        if (lightTypeSelect) {
            lightTypeSelect.addEventListener('change', this.onLightTypeChangeHandler);
        }
    }

    onLightTypeChange(event) {
        const lightType = event.target.value;
        const spotlightControls = this.modal.querySelectorAll('.spotlight-controls');
        const pointlightControls = this.modal.querySelectorAll('.pointlight-controls');
        
        // 显示或隐藏聚光灯控制项
        spotlightControls.forEach(control => {
            control.style.display = lightType === 'spot' ? 'block' : 'none';
        });
        
        // 显示或隐藏点光源控制项
        pointlightControls.forEach(control => {
            control.style.display = lightType === 'point' ? 'block' : 'none';
        });
        
        // 如果有活动光源，转换其类型
        if (this.activeSourceIndex !== -1) {
            const activeSource = this.lightSources[this.activeSourceIndex];
            if (activeSource) {
                this.convertLightType(activeSource, lightType);
            }
        }
    }
    
    convertLightType(source, newType) {
        // 保存原始光源的属性
        const position = source.position;
        const intensity = source.intensity;
        const color = source.light.color.getHex();
        const visible = source.light.visible;
        
        // 从场景中移除原始光源
        this.scene.remove(source.light);
        if (source.lightType === 'spot' && source.light.target) {
            this.scene.remove(source.light.target);
        }
        
        // 创建新的光源
        let newLight;
        if (newType === 'spot') {
            const spotlightAngleSlider = this.modal.querySelector('#spotlightAngle');
            const spotlightPenumbraSlider = this.modal.querySelector('#spotlightPenumbra');
            const angle = spotlightAngleSlider ? parseFloat(spotlightAngleSlider.value) * Math.PI : Math.PI / 3;
            const penumbra = spotlightPenumbraSlider ? parseFloat(spotlightPenumbraSlider.value) : 0.2;
            
            newLight = new THREE.SpotLight(color, intensity, 10, angle, penumbra);
            
            // 设置目标点位置
            let targetPosition;
            if (source.targetPosition) {
                targetPosition = source.targetPosition;
            } else {
                // 如果没有现成的目标点，默认设置在光源下方一些位置
                targetPosition = {
                    x: position.x,
                    y: position.y - 1,
                    z: 0
                };
            }
            newLight.target.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
            source.targetPosition = targetPosition;
            
            this.scene.add(newLight.target);
            
            // 为光源添加聚光灯特有属性
            source.spotParams = {
                angle: angle,
                penumbra: penumbra
            };
            
            // 聚光灯指示器样式修改
            if (source.indicator) {
                source.indicator.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
                source.indicator.style.transform = 'translate(-50%, -20%)';
            }
            
            // 创建连接线
            if (!source.connectionLine) {
                source.connectionLine = document.createElement('div');
                source.connectionLine.className = 'spotlight-connection-line';
                this.canvasContainer.appendChild(source.connectionLine);
            }
            
            // 创建目标点指示器
            if (!source.targetIndicator) {
                source.targetIndicator = this.createTargetIndicator(
                    source.lightColor || '#ffffff'
                );
                source.targetIndicator.style.display = 'none'; // 默认隐藏
                this.canvasContainer.appendChild(source.targetIndicator);
            }
            
            // 更新连接线位置
            this.updateSpotlightLine(source);
        } else {
            const pointlightRadiusSlider = this.modal.querySelector('#pointlightRadius');
            const radius = pointlightRadiusSlider ? parseFloat(pointlightRadiusSlider.value) : 10;
            
            newLight = new THREE.PointLight(color, intensity, radius, 2);
            
            // 点光源指示器样式恢复
            if (source.indicator) {
                source.indicator.style.clipPath = '';
                source.indicator.style.borderRadius = '50%';
                source.indicator.style.transform = 'translate(-50%, -50%)';
            }
            
            // 隐藏连接线
            if (source.connectionLine) {
                source.connectionLine.style.display = 'none';
            }
            
            // 隐藏目标点指示器
            if (source.targetIndicator) {
                source.targetIndicator.style.display = 'none';
            }
            
            // 移除聚光灯特有属性
            if (source.spotParams) {
                delete source.spotParams;
            }
            
            // 为点光源添加半径参数
            source.pointParams = {
                radius: radius
            };
        }
        
        // 设置新光源的位置和可见性
        newLight.position.set(position.x, position.y, position.z);
        newLight.visible = visible;
        
        // 更新光源对象
        source.light = newLight;
        source.lightType = newType;
        
        // 将新光源添加到场景
        this.scene.add(newLight);
        
        // 更新渲染
        this.render();
    }

    async cleanupAndClose(cancelled = false) {
        if (cancelled && this.currentNode) {
            try {
                await api.fetchApi("/lg_relight_ultra/cancel", {
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
            if (source.targetIndicator && source.targetIndicator.parentNode) {
                source.targetIndicator.remove();
            }
            if (source.connectionLine && source.connectionLine.parentNode) {
                source.connectionLine.remove();
            }
        });
        if (this.scene) {
            this.lightSources.forEach(source => {
                this.scene.remove(source.light);
                if (source.lightType === 'spot' && source.light.target) {
                    this.scene.remove(source.light.target);
                }
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
            event.target !== this.displayRenderer?.domElement) return;
            
        const activeSource = this.activeSourceIndex !== -1 ? this.lightSources[this.activeSourceIndex] : null;
        
        // 鼠标右键，且当前有活动的聚光灯
        if (event.button === 2 && activeSource && activeSource.lightType === 'spot') {
            event.preventDefault();
            event.stopPropagation();
            
            // 切换到目标点编辑模式
            activeSource.editingTarget = true;
            
            // 创建或显示目标点指示器
            if (!activeSource.targetIndicator) {
                activeSource.targetIndicator = this.createTargetIndicator(activeSource.lightColor || '#ffffff');
                this.canvasContainer.appendChild(activeSource.targetIndicator);
            } else {
                activeSource.targetIndicator.style.display = 'block';
            }
            
            // 更新连接线
            if (!activeSource.connectionLine) {
                activeSource.connectionLine = document.createElement('div');
                activeSource.connectionLine.className = 'spotlight-connection-line';
                this.canvasContainer.appendChild(activeSource.connectionLine);
            }
            
            this.isMovingLight = true;
            document.addEventListener('mousemove', this.onCanvasMouseMoveHandler);
            document.addEventListener('mouseup', this.onCanvasMouseUpHandler);
            this.updateLightFromMouseEvent(event);
            
            return;
        }
        
        // 如果之前是在编辑目标点，现在切换回编辑光源位置
        if (activeSource && activeSource.editingTarget) {
            activeSource.editingTarget = false;
        }
        
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
        const activeSource = this.activeSourceIndex !== -1 ? this.lightSources[this.activeSourceIndex] : null;
        
        // 如果处于目标点编辑模式，鼠标抬起后完成目标点的放置
        if (activeSource && activeSource.editingTarget) {
            activeSource.editingTarget = false;
            
            // 隐藏目标点指示器，但保留连接线
            if (activeSource.targetIndicator) {
                activeSource.targetIndicator.style.display = 'none';
            }
        }
        
        this.isMovingLight = false;
        document.removeEventListener('mousemove', this.onCanvasMouseMoveHandler);
        document.removeEventListener('mouseup', this.onCanvasMouseUpHandler);
        event.stopPropagation();
    }

    updateLightFromMouseEvent(event) {
        if (!this.displayRenderer || !this.displayRenderer.domElement || this.activeSourceIndex === -1) return;
        const activeSource = this.lightSources[this.activeSourceIndex];
        if (!activeSource) return;
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const rect = this.displayRenderer.domElement.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (mouseX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (mouseY - rect.top) / rect.height));
        
        this.updateLightIndicatorExact(mouseX, mouseY, activeSource.indicator);
        
        // 移除X轴计算中的负号
        this.lightX = ((x * 2) - 1);
        this.lightY = ((1 - y) * 2) - 1;
        
        // 从深度图获取Z轴高度
        const zValue = SceneUtils.getZValueFromDepthMap(this.depthMapTexture, x, y, this.zOffset);
        
        const xValueEl = this.modal.querySelector('.light-x-value');
        const yValueEl = this.modal.querySelector('.light-y-value');
        const zValueEl = this.modal.querySelector('.light-z-value');
        xValueEl.textContent = this.lightX.toFixed(2);
        yValueEl.textContent = this.lightY.toFixed(2);
        zValueEl.textContent = zValue.toFixed(2);
        
        // 更新光源位置，包括从深度图获取的Z值
        activeSource.position = { x: this.lightX, y: this.lightY, z: zValue };
        activeSource.light.position.set(this.lightX, this.lightY, zValue);
        
        // 如果当前正在编辑目标点而不是光源位置
        if (activeSource.editingTarget && activeSource.lightType === 'spot') {
            // 更新目标点位置
            activeSource.targetPosition = { x: this.lightX, y: this.lightY, z: 0 };
            activeSource.light.target.position.set(this.lightX, this.lightY, 0);
            
            // 更新目标点指示器的位置
            if (activeSource.targetIndicator) {
                this.updateLightIndicatorExact(mouseX, mouseY, activeSource.targetIndicator);
            }
            
            // 更新连接线
            this.updateSpotlightLine(activeSource);
        } else if (activeSource.lightType === 'spot') {
            // 如果没有设置过目标点，默认指向下方
            if (!activeSource.targetPosition) {
                activeSource.targetPosition = { 
                    x: this.lightX, 
                    y: this.lightY - 1, 
                    z: 0 
                };
                activeSource.light.target.position.set(
                    activeSource.targetPosition.x,
                    activeSource.targetPosition.y,
                    activeSource.targetPosition.z
                );
            }
            
            // 更新连接线
            this.updateSpotlightLine(activeSource);
        }
        
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
            case 'zOffset':
                this.zOffset = value;
                // 如果有活动光源，需要更新它的z坐标（需要重新从深度图获取基础z值）
                if (activeSource) {
                    // 从深度图获取当前位置的基础Z值
                    const rect = this.displayRenderer.domElement.getBoundingClientRect();
                    const indicator = activeSource.indicator;
                    const indicatorRect = indicator.getBoundingClientRect();
                    const x = Math.max(0, Math.min(1, (indicatorRect.left + indicatorRect.width/2 - rect.left) / rect.width));
                    const y = Math.max(0, Math.min(1, (indicatorRect.top + indicatorRect.height/2 - rect.top) / rect.height));
                    
                    // 重新计算Z值并更新光源位置
                    const zValue = SceneUtils.getZValueFromDepthMap(this.depthMapTexture, x, y, this.zOffset);
                    activeSource.position.z = zValue;
                    activeSource.light.position.set(
                        activeSource.position.x,
                        activeSource.position.y,
                        zValue
                    );
                    
                    // 更新显示的Z值
                    const zValueEl = this.modal.querySelector('.light-z-value');
                    if (zValueEl) {
                        zValueEl.textContent = zValue.toFixed(2);
                    }
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
                if (this.material) {
                    // 将法线强度应用到材质
                    this.material.normalScale.set(value, value);
                    // 如果有必要，可以存储该值以便保存配置
                    this.normalStrength = value;
                }
                break;
            case 'spotlightAngle':
                if (activeSource.lightType === 'spot') {
                    activeSource.light.angle = value * Math.PI;
                    activeSource.spotParams.angle = value * Math.PI;
                }
                break;
            case 'spotlightPenumbra':
                if (activeSource.lightType === 'spot') {
                    activeSource.light.penumbra = value;
                    activeSource.spotParams.penumbra = value;
                }
                break;
            case 'pointlightRadius':
                if (activeSource.lightType === 'point') {
                    activeSource.light.distance = value;
                    if (activeSource.pointParams) {
                        activeSource.pointParams.radius = value;
                    } else {
                        activeSource.pointParams = { radius: value };
                    }
                }
                break;
        }
        this.render();
    }

    async setupScene(texture, depthMap, normalMap, maskTexture = null) {
        try {
            // 存储深度图纹理引用
            this.depthMapTexture = depthMap;
            
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

            const frustumHeight = 2;
            const frustumWidth = frustumHeight * imageAspect;

            if (!this.isSceneSetup) {
                console.log('[RelightNode] 首次创建场景');
                this.scene = new THREE.Scene();
                this.camera = new THREE.OrthographicCamera(
                    frustumWidth / -2,
                    frustumWidth / 2,
                    frustumHeight / 2,
                    frustumHeight / -2,
                    0.1,
                    1000
                );
                this.camera.position.z = 5;

                this.displayRenderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true
                });

                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    preserveDrawingBuffer: true,
                    alpha: true
                });
                
                this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
                this.scene.add(this.ambientLight);
                this.isSceneSetup = true;
            } else {
                this.camera.left = frustumWidth / -2;
                this.camera.right = frustumWidth / 2;
                this.camera.top = frustumHeight / 2;
                this.camera.bottom = frustumHeight / -2;
                this.camera.updateProjectionMatrix();
            }

            // 设置显示渲染器的尺寸和样式
            this.displayRenderer.setSize(displayWidth, displayHeight);
            const displayCanvas = this.displayRenderer.domElement;
            displayCanvas.style.maxWidth = '100%';
            displayCanvas.style.maxHeight = '100%';
            displayCanvas.style.margin = 'auto';
            displayCanvas.style.position = 'absolute';
            displayCanvas.style.left = '50%';
            displayCanvas.style.top = '50%';
            displayCanvas.style.transform = 'translate(-50%, -50%)';
            
            if (!this.canvasContainer.contains(displayCanvas)) {
                this.canvasContainer.appendChild(displayCanvas);
            }
            
            // 设置输出渲染器为原始图像尺寸
            this.renderer.setSize(imageWidth, imageHeight);
            
            const geometry = new THREE.PlaneGeometry(2 * imageAspect, 2, 32, 32);
            
            // 获取法线强度值（如果已存在）
            const normalStrengthSlider = this.modal.querySelector('#normalStrength');
            this.normalStrength = normalStrengthSlider ? parseFloat(normalStrengthSlider.value) : 0;
            
            let material;
            if (maskTexture) {
                material = SceneUtils.createMaskedMaterial(texture, depthMap, normalMap, maskTexture, this.normalStrength);
            } else {
                material = SceneUtils.createSimpleMaterial(texture, depthMap, normalMap, this.normalStrength);
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
            
            // 更新渲染方法
            this.render();
            
            console.log('[RelightNode] 场景设置完成');
            return true;
        } catch (error) {
            console.error('[RelightNode] 场景设置错误:', error);
            return false;
        }
    }

    uploadCanvasResult(canvas, nodeId) {
        // 使用输出渲染器的画布而不是显示渲染器的画布
        this.renderer.domElement.toBlob(async (blob) => {
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
        const lightIntensitySlider = this.modal.querySelector('#lightIntensity');
        const lightTypeSelect = this.modal.querySelector('#lightType');
        const lightType = lightTypeSelect ? lightTypeSelect.value : 'point';
        
        let light;
        let indicator;
        const lightIntensity = parseFloat(lightIntensitySlider.value);
        
        // 根据选择的光源类型创建对应的光源
        if (lightType === 'spot') {
            const spotlightAngleSlider = this.modal.querySelector('#spotlightAngle');
            const spotlightPenumbraSlider = this.modal.querySelector('#spotlightPenumbra');
            const angle = spotlightAngleSlider ? parseFloat(spotlightAngleSlider.value) * Math.PI : Math.PI / 3;
            const penumbra = spotlightPenumbraSlider ? parseFloat(spotlightPenumbraSlider.value) : 0.2;
            
            light = new THREE.SpotLight(0xffffff, lightIntensity, 10, angle, penumbra);
            light.target.position.set(0, -1, 0); // 默认向下照射
            this.scene.add(light.target);
            
            indicator = this.createLightIndicator('#ffffff', 'spot');
        } else {
            const pointlightRadiusSlider = this.modal.querySelector('#pointlightRadius');
            const radius = pointlightRadiusSlider ? parseFloat(pointlightRadiusSlider.value) : 10;
            
            light = new THREE.PointLight(0xffffff, lightIntensity, radius, 2);
            indicator = this.createLightIndicator('#ffffff', 'point');
        }
        
        const lightSource = {
            id: Date.now(),
            name: `光源 ${this.lightSources.length + 1}`,
            light: light,
            position: { x: 0, y: 0, z: 1.0 }, // 默认值，会在鼠标点击时更新
            intensity: lightIntensity,
            indicatorColor: '#ffffff',
            lightColor: '#ffffff',
            lightType: lightType,
            indicator: indicator,
            editingTarget: false // 是否正在编辑目标点
        };
        
        // 如果是聚光灯，添加额外的聚光灯参数
        if (lightType === 'spot') {
            lightSource.spotParams = {
                angle: light.angle,
                penumbra: light.penumbra
            };
            lightSource.targetPosition = { x: 0, y: -1, z: 0 };
            
            // 创建连接线元素
            lightSource.connectionLine = document.createElement('div');
            lightSource.connectionLine.className = 'spotlight-connection-line';
            this.canvasContainer.appendChild(lightSource.connectionLine);
            
            // 创建目标点指示器
            lightSource.targetIndicator = this.createTargetIndicator('#ffffff');
            lightSource.targetIndicator.style.display = 'none'; // 默认隐藏
            this.canvasContainer.appendChild(lightSource.targetIndicator);
        } else if (lightType === 'point') {
            // 为点光源添加半径参数
            const pointlightRadiusSlider = this.modal.querySelector('#pointlightRadius');
            const radius = pointlightRadiusSlider ? parseFloat(pointlightRadiusSlider.value) : 10;
            lightSource.pointParams = {
                radius: radius
            };
        }
        
        // 直接设置光源位置
        lightSource.light.position.set(0, 0, 1.0);
        this.scene.add(lightSource.light);
        this.lightSources.push(lightSource);
        this.setActiveLight(this.lightSources.length - 1);
        
        // 更新材质参数 - 固定为0
        if (this.material) {
            this.material.shininess = 0;
            this.material.specular.setRGB(0, 0, 0);
            
            // 从滑条获取法线强度值
            const normalStrengthSlider = this.modal.querySelector('#normalStrength');
            const normalStrength = normalStrengthSlider ? parseFloat(normalStrengthSlider.value) : 0;
            this.material.normalScale.set(normalStrength, normalStrength);
            this.normalStrength = normalStrength;
        }
        
        // 确保环境光强度与UI滑块一致
        if (this.ambientLight) {
            const ambientLightSlider = this.modal.querySelector('#ambientLight');
            if (ambientLightSlider) {
                this.ambientLight.intensity = parseFloat(ambientLightSlider.value);
            }
        }
        
        return lightSource;
    }

    createLightIndicator(color, type = 'point') {
        const indicator = document.createElement('div');
        indicator.className = 'light-source-indicator';
        indicator.style.backgroundColor = color;
        indicator.style.boxShadow = `0 0 15px ${color}`;
        
        // 根据光源类型设置指示器样式
        if (type === 'spot') {
            indicator.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            indicator.style.transform = 'translate(-50%, -20%)';
        }
        
        // 添加选中状态的外圈
        const selectionRing = document.createElement('div');
        selectionRing.className = 'selection-ring';
        selectionRing.style.display = 'none'; // 默认隐藏
        selectionRing.style.borderColor = '#00ff00'; // 使用亮绿色
        indicator.appendChild(selectionRing);
        
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
            
            // 根据光源的可见状态选择眼睛图标
            const visibilityIcon = source.light.visible ? '👁️' : '👁️‍🗨️';
            
            // 添加光源类型图标
            const typeIcon = source.lightType === 'spot' ? '🔦' : '💡';
            
            item.innerHTML = `
                <div class="light-source-header">
                    <div class="light-source-color" style="background-color: ${source.indicatorColor}"></div>
                    <span class="light-source-name">${typeIcon} ${source.name}</span>
                    <div class="light-source-controls">
                        <input type="color" class="light-color-picker" value="${source.lightColor || '#ffffff'}" title="选择光源颜色">
                        <button class="light-source-visibility" title="${source.light.visible ? '隐藏' : '显示'}">${visibilityIcon}</button>
                        <button class="light-source-delete" title="删除">🗑️</button>
                    </div>
                </div>
            `;
            // 添加数据属性以识别索引
            item.dataset.lightIndex = index;
            item.addEventListener('click', (e) => {
                // 添加点击时的日志输出
                console.log(`[RelightNode] 点击了光源项 ${index}, 当前活动光源: ${this.activeSourceIndex}`);
                this.setActiveLight(index);
            });
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
                    // 更新按钮图标
                    visibilityBtn.textContent = source.light.visible ? '👁️' : '👁️‍🗨️';
                    visibilityBtn.title = source.light.visible ? '隐藏' : '显示';
                });
            }
            listContainer.appendChild(item);
        });
    }

    setActiveLight(index) {
        console.log(`[RelightNode] 设置活动光源: ${index}, 当前光源数量: ${this.lightSources.length}`);
        
        // 先清除所有光源的选中状态
        this.lightSources.forEach(source => {
            if (source.indicator) {
                const ring = source.indicator.querySelector('.selection-ring');
                if (ring) {
                    ring.style.display = 'none';
                }
            }
        });

        // 设置新的选中光源
        this.activeSourceIndex = index;
        const source = this.lightSources[index];
        if (source && source.indicator) {
            const ring = source.indicator.querySelector('.selection-ring');
            if (ring) {
                console.log(`[RelightNode] 显示光源 ${index} 的选择环`);
                ring.style.display = 'block';
            } else {
                console.warn(`[RelightNode] 光源 ${index} 没有选择环元素`);
            }
        } else {
            console.warn(`[RelightNode] 光源 ${index} 或其指示器不存在`);
        }

        // 更新光源列表UI中的活动项
        const listItems = this.modal.querySelectorAll('.light-source-item');
        listItems.forEach(item => {
            const itemIndex = parseInt(item.dataset.lightIndex);
            if (itemIndex === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 更新控制面板的值
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
            
            // 更新光源类型选择器
            const lightTypeSelect = this.modal.querySelector('#lightType');
            if (lightTypeSelect) {
                lightTypeSelect.value = source.lightType || 'point';
                
                // 显示或隐藏聚光灯控制项
                const spotlightControls = this.modal.querySelectorAll('.spotlight-controls');
                spotlightControls.forEach(control => {
                    control.style.display = source.lightType === 'spot' ? 'block' : 'none';
                });
                
                // 显示或隐藏点光源控制项
                const pointlightControls = this.modal.querySelectorAll('.pointlight-controls');
                pointlightControls.forEach(control => {
                    control.style.display = source.lightType === 'point' ? 'block' : 'none';
                });
                
                // 更新聚光灯参数
                if (source.lightType === 'spot' && source.spotParams) {
                    const spotlightAngleSlider = this.modal.querySelector('#spotlightAngle');
                    const spotlightPenumbraSlider = this.modal.querySelector('#spotlightPenumbra');
                    
                    if (spotlightAngleSlider) {
                        spotlightAngleSlider.value = source.spotParams.angle / Math.PI;
                    }
                    
                    if (spotlightPenumbraSlider) {
                        spotlightPenumbraSlider.value = source.spotParams.penumbra;
                    }
                }
                
                // 更新点光源参数
                if (source.lightType === 'point' && source.pointParams) {
                    const pointlightRadiusSlider = this.modal.querySelector('#pointlightRadius');
                    
                    if (pointlightRadiusSlider) {
                        pointlightRadiusSlider.value = source.pointParams.radius;
                    }
                }
            }
        }
    }

    deleteLight(index) {
        const source = this.lightSources[index];
        if (source) {
            this.scene.remove(source.light);
            if (source.lightType === 'spot' && source.light.target) {
                this.scene.remove(source.light.target);
            }
            if (source.indicator && source.indicator.parentNode) {
                source.indicator.remove();
            }
            if (source.connectionLine && source.connectionLine.parentNode) {
                source.connectionLine.remove();
            }
            if (source.targetIndicator && source.targetIndicator.parentNode) {
                source.targetIndicator.remove();
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
        if (this.displayRenderer && this.renderer && this.scene && this.camera) {
            // 更新显示用的画布
            this.displayRenderer.render(this.scene, this.camera);
            // 同时更新用于输出的画布
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
            
            // 清理之前可能存在的光源
            this.lightSources.forEach(source => {
                if (this.scene) {
                    this.scene.remove(source.light);
                    if (source.lightType === 'spot' && source.light.target) {
                        this.scene.remove(source.light.target);
                    }
                }
                if (source.indicator && source.indicator.parentNode) {
                    source.indicator.remove();
                }
                if (source.targetIndicator && source.targetIndicator.parentNode) {
                    source.targetIndicator.remove();
                }
                if (source.connectionLine && source.connectionLine.parentNode) {
                    source.connectionLine.remove();
                }
            });
            this.lightSources = [];
            this.activeSourceIndex = -1;
            
            const texturePromises = [
                SceneUtils.base64ToTexture(bg_image),
                SceneUtils.base64ToTexture(bg_depth_map),
                SceneUtils.base64ToTexture(bg_normal_map)
            ];
            if (has_mask && mask) {
                texturePromises.push(SceneUtils.base64ToTexture(mask));
                console.log('[RelightNode] 检测到遮罩数据，将加载遮罩纹理');
            }
            const loadedTextures = await Promise.all(texturePromises);
            const texture = loadedTextures[0];
            const depthMap = loadedTextures[1];
            const normalMap = loadedTextures[2];
            const maskTexture = has_mask ? loadedTextures[3] : null;
            console.log('[RelightNode] 纹理加载完成，设置场景...');
            await this.setupScene(texture, depthMap, normalMap, maskTexture);
            
            // 移除画布上的所有指示器元素
            const existingIndicators = this.canvasContainer.querySelectorAll('.light-source-indicator, .spotlight-target-indicator, .spotlight-connection-line');
            existingIndicators.forEach(indicator => indicator.remove());
            
            const configRestored = await this.restoreLightConfiguration(nodeId);
            if (!configRestored) {
                console.log('[RelightNode] 没有找到已保存的配置，使用空白配置');
                // 没有恢复到配置，保持空白状态
            }
            
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            
            // 重新绑定添加光源按钮事件
            const addLightBtn = this.modal.querySelector('.relight-btn.add-light');
            if (addLightBtn) {
                // 移除已有的事件监听器，避免重复添加
                const newAddLightBtn = addLightBtn.cloneNode(true);
                addLightBtn.parentNode.replaceChild(newAddLightBtn, addLightBtn);
                
                // 添加新的事件监听器
                newAddLightBtn.addEventListener('click', () => {
                    console.log('[RelightNode] 添加新光源');
                    if (this.scene) {
                        const newSource = this.createLightSource();
                        console.log('[RelightNode] 新光源已创建，ID:', newSource.id);
                        this.updateLightSourcesList();
                    } else {
                        console.error('[RelightNode] 场景未初始化，无法添加光源');
                    }
                });
            }
            
            // 初始化光源列表
            this.updateLightSourcesList();
            
            console.log('[RelightNode] 编辑器显示成功，当前光源数量:', this.lightSources.length);
        } catch (error) {
            console.error('[RelightNode] 处理图像时出错:', error);
        }
    }

    updateLightColor(index, color) {
        const source = this.lightSources[index];
        if (source) {
            // 更新光源颜色
            source.lightColor = color;
            source.indicatorColor = color; // 同时更新指示器颜色
            const colorObj = new THREE.Color(color);
            source.light.color = colorObj;
    
            // 更新光源列表中的颜色
            const listContainer = this.modal.querySelector('.light-sources-list');
            if (listContainer) {
                const lightItem = listContainer.children[index];
                if (lightItem) {
                    // 更新色板颜色
                    const colorPicker = lightItem.querySelector('.light-color-picker');
                    if (colorPicker) {
                        colorPicker.value = color;
                    }
                    // 更新指示器颜色
                    const indicatorColor = lightItem.querySelector('.light-source-color');
                    if (indicatorColor) {
                        indicatorColor.style.backgroundColor = color;
                    }
                }
            }
    
            // 更新画布中的光源指示器颜色
            if (source.indicator) {
                source.indicator.style.backgroundColor = color;
                source.indicator.style.boxShadow = `0 0 15px ${color}`;
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
                targetPosition: source.targetPosition ? { ...source.targetPosition } : null,
                intensity: source.intensity,
                color: source.lightColor,
                visible: source.light.visible,
                lightType: source.lightType || 'point',
                spotParams: source.spotParams || null,
                pointParams: source.pointParams || null
            })),
            ambientLight: {
                intensity: this.ambientLight.intensity
            },
            material: {
                normalScale: this.normalStrength || 0,
                shininess: this.material.shininess,
                specularStrength: this.material.specular.r
            },
            zOffset: this.zOffset
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
            if (source.lightType === 'spot' && source.light.target) {
                this.scene.remove(source.light.target);
            }
            if (source.indicator && source.indicator.parentNode) {
                source.indicator.remove();
            }
            if (source.targetIndicator && source.targetIndicator.parentNode) {
                source.targetIndicator.remove();
            }
            if (source.connectionLine && source.connectionLine.parentNode) {
                source.connectionLine.remove();
            }
        });
        this.lightSources = [];
        
        // 设置光源类型选择器为默认值
        const lightTypeSelect = this.modal.querySelector('#lightType');
        if (lightTypeSelect) {
            lightTypeSelect.value = 'point';
        }
        
        for (const lightConfig of config.lights) {
            // 临时设置类型选择器的值，这样创建光源时会使用正确的类型
            if (lightConfig.lightType && lightTypeSelect) {
                lightTypeSelect.value = lightConfig.lightType;
            }
            
            const source = this.createLightSource();
            source.position = { ...lightConfig.position };
            source.light.position.set(
                lightConfig.position.x,
                lightConfig.position.y,
                lightConfig.position.z
            );
            source.intensity = lightConfig.intensity;
            source.light.intensity = lightConfig.intensity;
            source.light.visible = lightConfig.visible;
            source.lightType = lightConfig.lightType || 'point';
            
            // 恢复聚光灯参数
            if (source.lightType === 'spot' && lightConfig.spotParams) {
                source.spotParams = { ...lightConfig.spotParams };
                source.light.angle = lightConfig.spotParams.angle;
                source.light.penumbra = lightConfig.spotParams.penumbra;
                
                // 恢复目标点位置
                if (lightConfig.targetPosition) {
                    source.targetPosition = { ...lightConfig.targetPosition };
                    source.light.target.position.set(
                        lightConfig.targetPosition.x,
                        lightConfig.targetPosition.y,
                        lightConfig.targetPosition.z
                    );
                } else {
                    // 如果没有保存目标点，使用默认位置
                    source.targetPosition = {
                        x: lightConfig.position.x,
                        y: lightConfig.position.y - 1,
                        z: 0
                    };
                    source.light.target.position.set(
                        source.targetPosition.x,
                        source.targetPosition.y,
                        source.targetPosition.z
                    );
                }
            }
            
            // 恢复点光源参数
            if (source.lightType === 'point' && lightConfig.pointParams) {
                source.pointParams = { ...lightConfig.pointParams };
                source.light.distance = lightConfig.pointParams.radius;
            }
            
            if (lightConfig.color) {
                this.updateLightColor(this.lightSources.length - 1, lightConfig.color);
            }
            
            if (this.canvasContainer && source.indicator) {
                source.indicator.style.left = `${lightConfig.screenX}px`;
                source.indicator.style.top = `${lightConfig.screenY}px`;
                source.indicator.style.opacity = lightConfig.visible ? '0.7' : '0.2';
                
                // 立即更新聚光灯连接线
                if (source.lightType === 'spot') {
                    // 确保DOM元素已完全加载并计算好尺寸
                    setTimeout(() => {
                        this.updateSpotlightLine(source);
                        console.log('[RelightNode] 更新聚光灯连接线:', source.name);
                    }, 50);
                }
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
            // 恢复法线强度
            if (config.material.normalScale !== undefined) {
                this.normalStrength = config.material.normalScale;
                this.material.normalScale.set(this.normalStrength, this.normalStrength);
                
                const normalStrengthSlider = this.modal.querySelector('#normalStrength');
                if (normalStrengthSlider) {
                    normalStrengthSlider.value = this.normalStrength;
                }
            } else {
                // 默认设置为0
                this.material.normalScale.set(0, 0);
                this.normalStrength = 0;
            }
            
            // 恢复其他材质参数，但固定为0
            this.material.shininess = 0;
            this.material.specular.setRGB(0, 0, 0);
        }
        if (config.zOffset !== undefined) {
            this.zOffset = config.zOffset;
            const zOffsetSlider = this.modal.querySelector('#zOffset');
            if (zOffsetSlider) {
                zOffsetSlider.value = config.zOffset;
            }
        }
        
        // 确保所有聚光灯连接线都更新
        setTimeout(() => {
            this.lightSources.forEach(source => {
                if (source.lightType === 'spot') {
                    this.updateSpotlightLine(source);
                }
            });
        }, 100);
        
        this.updateLightSourcesList();
        this.render();
        return true;
    }

    async processWithoutDialog(nodeId, detail) {
        try {
            this.currentNode = app.graph.getNodeById(nodeId);
            if (!this.currentNode) {
                console.error('[RelightNode] 找不到节点:', nodeId);
                return;
            }
            
            console.log('[RelightNode] 开始无弹窗处理图像...');
            const { bg_image, bg_depth_map, bg_normal_map, has_mask, mask } = detail;
            this.hasMask = has_mask;
            
            // 加载纹理
            const texturePromises = [
                SceneUtils.base64ToTexture(bg_image),
                SceneUtils.base64ToTexture(bg_depth_map),
                SceneUtils.base64ToTexture(bg_normal_map)
            ];
            
            if (has_mask && mask) {
                texturePromises.push(SceneUtils.base64ToTexture(mask));
            }
            
            const loadedTextures = await Promise.all(texturePromises);
            const texture = loadedTextures[0];
            const depthMap = loadedTextures[1];
            const normalMap = loadedTextures[2];
            const maskTexture = has_mask ? loadedTextures[3] : null;
            
            // 设置场景但不显示
            if (!this.scene) {
                // 首次创建场景
                this.scene = new THREE.Scene();
                const imageWidth = texture.image.width;
                const imageHeight = texture.image.height;
                const imageAspect = imageWidth / imageHeight;
                
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
                
                this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
                this.scene.add(this.ambientLight);
                this.isSceneSetup = true;
                
                // 隐藏渲染器设置
                this.renderer.setSize(imageWidth, imageHeight);
            }
            
            // 设置临时场景
            await this.setupTemporaryScene(texture, depthMap, normalMap, maskTexture);
            
            // 尝试恢复配置，如果没有则使用默认配置
            const configRestored = await this.restoreLightConfiguration(nodeId);
            if (!configRestored) {
                // 没有现有配置，创建默认配置
                this.createDefaultLight();
            }
            
            // 渲染场景
            this.renderer.render(this.scene, this.camera);
            
            // 上传结果
            this.uploadCanvasResult(this.renderer.domElement, nodeId);
            
            // 保存当前配置以供将来使用
            this.saveLightConfiguration(nodeId);
            
            console.log('[RelightNode] 无弹窗处理完成');
        } catch (error) {
            console.error('[RelightNode] 无弹窗处理错误:', error);
        }
    }

    async setupTemporaryScene(texture, depthMap, normalMap, maskTexture = null) {
        // 类似setupScene但简化版本，仅用于无弹窗处理
        try {
            const imageWidth = texture.image.width;
            const imageHeight = texture.image.height;
            const imageAspect = imageWidth / imageHeight;
            
            // 更新相机视锥体以匹配新图像的宽高比
            const frustumHeight = 2;
            const frustumWidth = frustumHeight * imageAspect;
            
            this.camera.left = frustumWidth / -2;
            this.camera.right = frustumWidth / 2;
            this.camera.top = frustumHeight / 2;
            this.camera.bottom = frustumHeight / -2;
            this.camera.updateProjectionMatrix();
            
            // 设置渲染器尺寸
            this.renderer.setSize(imageWidth, imageHeight);
            
            // 创建或更新几何体
            const geometry = new THREE.PlaneGeometry(2 * imageAspect, 2, 32, 32);
            
            // 获取法线强度值（如果已存在）
            this.normalStrength = this.normalStrength || 0;
            
            // 创建材质
            let material;
            if (maskTexture) {
                material = SceneUtils.createMaskedMaterial(texture, depthMap, normalMap, maskTexture, this.normalStrength);
            } else {
                material = SceneUtils.createSimpleMaterial(texture, depthMap, normalMap, this.normalStrength);
            }
            
            // 更新或创建网格
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
            
            return true;
        } catch (error) {
            console.error('[RelightNode] 临时场景设置错误:', error);
            return false;
        }
    }

    createDefaultLight() {
        this.lightSources.forEach(source => {
            this.scene.remove(source.light);
            if (source.lightType === 'spot' && source.light.target) {
                this.scene.remove(source.light.target);
            }
        });
        this.lightSources = [];
        
        const defaultLight = {
            id: Date.now(),
            name: "默认光源",
            // 创建默认点光源
            light: new THREE.PointLight(0xffffff, 1.0, 10, 2),
            position: { x: 0, y: 0, z: 1.0 },
            intensity: 1.0,
            lightColor: '#ffffff',
            visible: true,
            lightType: 'point',
            pointParams: {
                radius: 10
            }
        };
        
        // 直接设置点光源位置
        defaultLight.light.position.set(0, 0, 1);
        this.scene.add(defaultLight.light);
        this.lightSources.push(defaultLight);
        
        if (this.ambientLight) {
            this.ambientLight.intensity = 0.2;
        }
        
        return defaultLight;
    }

    createTargetIndicator(color) {
        const indicator = document.createElement('div');
        indicator.className = 'spotlight-target-indicator';
        indicator.style.backgroundColor = color;
        return indicator;
    }

    updateSpotlightLine(source) {
        if (!source.connectionLine || !source.indicator || !source.targetPosition) return;
        
        const lightRect = source.indicator.getBoundingClientRect();
        const canvasRect = this.canvasContainer.getBoundingClientRect();
        
        // 计算光源中心点
        const lightX = lightRect.left + lightRect.width/2 - canvasRect.left;
        const lightY = lightRect.top + lightRect.height/2 - canvasRect.top;
        
        // 如果有目标点指示器，使用它的位置
        let targetX, targetY;
        if (source.targetIndicator && source.targetIndicator.style.display !== 'none') {
            const targetRect = source.targetIndicator.getBoundingClientRect();
            targetX = targetRect.left + targetRect.width/2 - canvasRect.left;
            targetY = targetRect.top + targetRect.height/2 - canvasRect.top;
        } else {
            // 否则使用目标点在3D空间中的位置计算屏幕位置
            // 这需要将3D空间点投影到屏幕空间
            // 简化处理：用已有信息估算
            const displayRect = this.displayRenderer.domElement.getBoundingClientRect();
            const targetPosNormalized = {
                x: (source.targetPosition.x + 1) / 2,
                y: (1 - source.targetPosition.y) / 2
            };
            targetX = displayRect.left + displayRect.width * targetPosNormalized.x - canvasRect.left;
            targetY = displayRect.top + displayRect.height * targetPosNormalized.y - canvasRect.top;
        }
        
        // 计算线段长度和角度
        const length = Math.sqrt(Math.pow(targetX - lightX, 2) + Math.pow(targetY - lightY, 2));
        const angle = Math.atan2(targetY - lightY, targetX - lightX) * 180 / Math.PI;
        
        // 设置线段样式
        source.connectionLine.style.width = `${length}px`;
        source.connectionLine.style.left = `${lightX}px`;
        source.connectionLine.style.top = `${lightY}px`;
        source.connectionLine.style.transform = `rotate(${angle}deg)`;
        source.connectionLine.style.transformOrigin = 'left center';
        source.connectionLine.style.display = 'block';
    }
}
