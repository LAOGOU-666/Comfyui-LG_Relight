import { api } from '../../../scripts/api.js'
import { app } from '../../../scripts/app.js'
import { relightConfig } from './config.js'
import { LightEditor } from './light_editor.js'

app.registerExtension({
    name: "LG_Relight_Ultra",
    async setup() {
        console.log('[RelightNode] 开始初始化扩展 Start initializing the extension...');
        if (!window.THREE) {
            console.log('[RelightNode] 正在加载 Loading Three.js...');
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = relightConfig.libraryUrl;
                script.onload = () => {
                    console.log('[RelightNode] Three.js 加载成功 Loading Successfully');
                    resolve();
                };
                script.onerror = (error) => {
                    console.error('[RelightNode] Three.js 加载失败: Loading failed:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        }
        const lightEditor = new LightEditor();
        api.addEventListener("relight_image", async ({ detail }) => {
            try {
                const { node_id, skip_dialog } = detail;
                console.log('[RelightNode] 处理节点: Processing Node:', node_id);
                
                if (skip_dialog) {
                    // 跳过弹窗，直接使用现有配置进行处理
                    await lightEditor.processWithoutDialog(node_id, detail);
                } else {
                    // 显示弹窗让用户编辑
                    await lightEditor.show(node_id, detail);
                    
                    // 添加聚光灯操作提示
                    const canvasContainer = document.querySelector('.relight-canvas-container');
                    if (canvasContainer) {
                        const spotlightHint = document.createElement('div');
                        spotlightHint.className = 'spotlight-hint';
                        spotlightHint.textContent = '聚光灯模式: 左键拖动移动光源位置，右键点击设置照射目标方向, Spotlight mode: left-click and drag to move the light source, right-click to set the target direction';
                        canvasContainer.appendChild(spotlightHint);
                        
                        // 禁用右键菜单以便使用右键点击
                        canvasContainer.addEventListener('contextmenu', (e) => {
                            e.preventDefault();
                            return false;
                        });
                    }
                }
            } catch (error) {
                console.error('[RelightNode] 处理错误: Handling Errors:', error);
            }
        });
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeType.comfyClass === "LG_Relight_Ultra") {
            console.log('[RelightNode] 注册节点定义 Registering Node Definitions...');
            const originalOnAdded = nodeType.prototype.onAdded;
            const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
            const originalOnRemoved = nodeType.prototype.onRemoved;
            const originalOnClearError = nodeType.prototype.onClearError;
            nodeType.prototype.onAdded = function() {
                console.log('[RelightNode] 节点添加到画布 Adding nodes to the canvas, ID:', this.id);
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
                const updateButton = this.addWidget("button", "更新种子 Update torrent", null, () => {
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
                    console.log('[RelightNode] 种子已更新为: The torrent has been updated to:', newValue);
                });
                
                // 默认光照设置
                this.defaultLightConfig = {
                    lightType: 'point', // 'point' 或 'spot'
                    lightZ: 2.0,
                    lightIntensity: 1.0,
                    ambientLight: 0.2,
                    normalStrength: 1.0,
                    specularStrength: 0.2,
                    shininess: 0,
                    spotlight: {
                        angle: 0.5,
                        penumbra: 0.2
                    }
                };
                
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
                        'shininess': 0,
                        'spotlightAngle': 0.5,
                        'spotlightPenumbra': 0.2
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
                        
                        // 重置光源类型选择器 Reset Light Type Selector
                        const lightTypeSelect = modal.querySelector('#lightType');
                        if (lightTypeSelect) {
                            lightTypeSelect.value = 'point';
                            const event = new Event('change', { bubbles: true });
                            lightTypeSelect.dispatchEvent(event);
                        }
                        
                        // 重置光源列表 Reset Light List
                        const lightSourcesList = modal.querySelector('.light-sources-list');
                        if (lightSourcesList) {
                            lightSourcesList.innerHTML = '';
                        }
                        const indicators = modal.querySelectorAll('.light-source-indicator, .spotlight-target-indicator, .spotlight-connection-line');
                        indicators.forEach(indicator => indicator.remove());
                        
                        // 移除操作提示 Remove operation prompt
                        const spotlightHint = modal.querySelector('.spotlight-hint');
                        if (spotlightHint) {
                            spotlightHint.remove();
                        }
                    }
                    console.log('[RelightNode] 光照配置和UI已重置 Lighting configuration and UI have been reset');
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
