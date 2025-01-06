import { app } from "../../scripts/app.js";


app.registerExtension({
    name: "LG.Relight",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "LG_Relight") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                
                // 创建种子组件
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
                
                // 创建更新按钮并设置其位置覆盖种子组件
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