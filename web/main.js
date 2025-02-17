import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// 将事件监听器和状态管理移到全局作用域
let isProcessing = false;
let processingNodeId = null;
let popupWindow = null;
let eventListenerRegistered = false;  // 新增：标记事件监听器是否已注册

// 创建事件处理函数
const handleRelightInit = async (event) => {
    const data = event.detail;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] 收到重光照初始化消息:`, data);
    
    try {
        isProcessing = true;
        processingNodeId = data.node_id;
        
        if (!popupWindow || popupWindow.closed) {
            // 计算窗口尺寸
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = data.image;
            });

            const browserWidth = window.innerWidth;
            const browserHeight = window.innerHeight;
            const controlsHeight = 200; // 控制面板的预估高度
            
            // 计算适当的缩放比例
            const scale = Math.min(
                (browserWidth * 0.8) / img.width,
                (browserHeight * 0.8 - controlsHeight) / img.height
            );
            
            // 计算弹窗尺寸
            const popupWidth = Math.floor(img.width * scale);
            const popupHeight = Math.floor(img.height * scale + controlsHeight);
            
            // 计算弹窗位置（居中）
            const popupLeft = Math.floor((browserWidth - popupWidth) / 2);
            const popupTop = Math.floor((browserHeight - popupHeight) / 2);

            const currentUrl = import.meta.url;
            const folderName = currentUrl.split('/').slice(-2)[0];
            const baseUrl = `./extensions/${folderName}/index.html`;
            
            console.log("[DEBUG] 尝试打开窗口:", baseUrl, {
                尺寸: {
                    width: popupWidth,
                    height: popupHeight,
                    left: popupLeft,
                    top: popupTop
                }
            });
            
            popupWindow = window.open(
                baseUrl,
                `lg_relight_${data.node_id}`,
                `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop}`
            );

            if (!popupWindow) {
                throw new Error("弹窗被浏览器拦截，请允许弹窗后重试");
            }

            // 添加窗口关闭事件处理
            const handleWindowClose = async () => {
                if (popupWindow.closed) {
                    console.log("[DEBUG] 窗口被关闭，通知后端");
                    try {
                        const response = await fetch('/lg_relight/window_closed', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                node_id: data.node_id,
                                original_image: data.image
                            })
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        console.log("[DEBUG] 成功通知后端窗口关闭");
                    } catch (error) {
                        console.error("通知后端窗口关闭失败:", error);
                    }
                    
                    // 清理资源
                    clearInterval(checkInterval);
                    popupWindow = null;
                }
            };

            // 定期检查窗口是否关闭
            const checkInterval = setInterval(handleWindowClose, 500);

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (popupWindow.closed) {
                        reject(new Error("窗口已被关闭"));
                        return;
                    }
                    reject(new Error("弹窗加载超时"));
                }, 5000);

                popupWindow.onload = () => {
                    console.log("[DEBUG] 窗口onload事件触发");
                    clearTimeout(timeout);
                    setTimeout(resolve, 100);
                };
            });

            console.log("[DEBUG] 窗口加载完成，准备发送初始化数据");
        }
        
        popupWindow.postMessage({
            type: 'init',
            data: {
                diffuseMap: data.image,
                normalMap: data.normals,
                maskMap: data.mask,
                nodeId: data.node_id,
                originalImage: data.image
            }
        }, '*');
        
    } catch (error) {
        console.error("弹窗加载失败:", error);
        if (popupWindow && !popupWindow.closed) {
            popupWindow.close();
        }
        popupWindow = null;
        throw error;
    } finally {
        isProcessing = false;
        processingNodeId = null;
    }
};

// 在 app.registerExtension 中注册事件监听器
app.registerExtension({
    name: "Comfyui.LG_Relight",
    async setup() {
        // 确保事件监听器只注册一次
        if (!eventListenerRegistered) {
            console.log("[DEBUG] 注册重光照事件监听器");
            api.addEventListener("lg_relight_init", handleRelightInit);
            eventListenerRegistered = true;
            
            // 添加清理函数
            window.addEventListener('beforeunload', () => {
                if (popupWindow && !popupWindow.closed) {
                    popupWindow.close();
                }
                api.removeEventListener("lg_relight_init", handleRelightInit);
                eventListenerRegistered = false;
            });
        }
    }
});

app.registerExtension({
    name: "LG_Relight",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "LG_Relight_V2") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                // 添加种子输入框
                const seedWidget = this.addWidget(
                    "number",
                    "Seed",
                    this.seed || 0,
                    function(v) {
                        this.seed = v;
                    }.bind(this),
                    {
                        min: 0,
                        max: Number.MAX_SAFE_INTEGER,
                        step: 1,
                        precision: 0
                    }
                );

                // 添加更新按钮
                const updateButton = this.addWidget("button", "Update", null, () => {
                    const newSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                    seedWidget.value = newSeed;
                    seedWidget.callback(newSeed);
                    if (this.id) {
                        rgthree.queueOutputNodes([this.id]);
                    }
                });
                
                // 监听重光照初始化事件
                api.addEventListener("lg_relight_init", (event) => {
                    const data = event.detail;
                    if (data.node_id === this.id) {
                        const currentUrl = import.meta.url;
                        const folderName = currentUrl.split('/').slice(-2)[0];
                        const baseUrl = `./extensions/${folderName}/web/index.html`;
                        
                        // 计算窗口尺寸
                        const img = new Image();
                        img.onload = () => {
                            const browserWidth = window.innerWidth;
                            const browserHeight = window.innerHeight;
                            const controlsHeight = 200;
                            
                            const scale = Math.min(
                                (browserWidth * 0.8) / img.width,
                                (browserHeight * 0.8 - controlsHeight) / img.height
                            );
                            
                            const popupWidth = Math.floor(img.width * scale);
                            const popupHeight = Math.floor(img.height * scale + controlsHeight);
                            const popupLeft = Math.floor((browserWidth - popupWidth) / 2);
                            const popupTop = Math.floor((browserHeight - popupHeight) / 2);
                            
                            const popupWindow = window.open(
                                baseUrl,
                                `lg_relight_${data.node_id}`,
                                `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop}`
                            );

                            if (popupWindow) {
                                popupWindow.onload = () => {
                                    popupWindow.postMessage({
                                        type: 'init',
                                        data: {
                                            diffuseMap: data.image,
                                            normalMap: data.normals,
                                            maskMap: data.mask,
                                            nodeId: data.node_id,
                                            originalImage: data.image
                                        }
                                    }, '*');
                                };
                            }
                        };
                        img.src = data.image;
                    }
                });

                return result;
            };

            // 修复序列化方法
            const onSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function(o) {
                if (onSerialize) {
                    onSerialize.apply(this, arguments);
                }
                o.seed = this.seed;
            };

            // 从序列化中恢复种子
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(data) {
                onConfigure?.apply(this, arguments);
                if (data.seed !== undefined) {
                    this.seed = data.seed;
                }
            };
        }
    }
});


app.registerExtension({
    name: "LG.Relight",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "LG_Relight") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);

                const seedWidget = this.addWidget(
                    "number",
                    "Seed",
                    0,
                    function(v) {
                        this.seed = v;
                    }.bind(this),
                    {
                        min: 0,
                        max: Number.MAX_SAFE_INTEGER,
                        step: 1,
                        precision: 0
                    }
                );

                const updateButton = this.addWidget("button", "Update", null, () => {
                    const newSeed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
                    seedWidget.value = newSeed;
                    seedWidget.callback(newSeed);
                    if (this.id) {
                        rgthree.queueOutputNodes([this.id]);
                    }
                });

            };
        }
    }
});