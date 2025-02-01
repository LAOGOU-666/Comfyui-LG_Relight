import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";


app.registerExtension({
    name: "LG_Relight",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "LG_Relight_V2") {

            const origOnNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function() {

                const result = origOnNodeCreated?.apply(this, arguments);

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
    },
    nodeCreated(node) {
        if (node.comfyClass === "LG_Relight_V2") {
            let popupWindow = null;
            let originalImageData = null;  // 添加变量存储初始图片
            const handleRelightInit = async (event) => {
                const data = event.detail;
                console.log("收到重光照初始化消息:", data);

                try {

                    const img = new Image();
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.src = data.image;
                    });

                    // 计算理想的窗口尺寸
                    const browserWidth = window.innerWidth;
                    const browserHeight = window.innerHeight;

                    const controlsHeight = 200;

                    const scale = Math.min(
                        (browserWidth * 0.8) / img.width,
                        (browserHeight * 0.8 - controlsHeight) / img.height
                    );

                    const popupWidth = Math.floor(img.width * scale);
                    const popupHeight = Math.floor(img.height * scale +controlsHeight);
                    const popupLeft = Math.floor((browserWidth - popupWidth) / 2);
                    const popupTop = Math.floor((browserHeight - popupHeight) / 2);

                    if (!popupWindow || popupWindow.closed) {
                        const currentUrl = import.meta.url;
                        const folderName = currentUrl.split('/').slice(-2)[0];
                        const baseUrl = `./extensions/${folderName}/index.html`;
                        
                        popupWindow = window.open(
                            baseUrl,
                            `lg_relight_${data.node_id}`,
                            `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop}`
                        );
            
                        if (!popupWindow) {
                            throw new Error("弹窗被浏览器拦截，请允许弹窗后重试");
                        }
            
                        const checkWindow = setInterval(() => {
                            if (popupWindow.closed) {
                                clearInterval(checkWindow);
                                // 使用保存的初始图片数据
                                fetch('/lg_relight/window_closed', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        node_id: data.node_id,
                                        original_image: originalImageData  // 使用保存的初始图片
                                    })
                                });
                            }
                        }, 100);

                        const windowLoaded = new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error("弹窗加载超时"));
                            }, 5000);

                            popupWindow.onload = () => {
                                clearTimeout(timeout);
                                resolve();
                            };
                        });

                        try {
                            await windowLoaded;
            
                            popupWindow.postMessage({
                                type: 'init',
                                data: {
                                    diffuseMap: data.image,
                                    normalMap: data.normals,
                                    maskMap: data.mask,
                                    nodeId: data.node_id,
                                    originalImage: data.image  // 同时传递原始图像到弹窗
                                }
                            }, '*');
                        } catch (error) {
                            console.error("弹窗加载失败:", error);
                            if (popupWindow) {
                                popupWindow.close();
                            }
                        }
                    }
                } catch (error) {
                    console.error("创建重光照窗口时出错:", error);
                    alert(error.message); 
                }
            };

            api.addEventListener("lg_relight_init", handleRelightInit);

            // 清理函数
            node.onRemoved = () => {
                api.removeEventListener("lg_relight_init", handleRelightInit);
                if (popupWindow && !popupWindow.closed) {
                    popupWindow.close();
                }
                originalImageData = null;  // 清理保存的图片数据
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
