const canvas = document.querySelector('#canvas');
const gl = canvas.getContext('webgl2');

const vert = `
attribute vec2 position;
varying vec2 uv;
void main() {
    gl_Position = vec4(position, 0, 1);
    uv = position * vec2(0.5, -0.5) + 0.5;
}
`;

const frag = `
precision highp float;

varying vec2 uv;
uniform sampler2D diffuseMap;
uniform sampler2D maskMap;
uniform sampler2D normalMap;
uniform bool enableMask;
uniform float ambient;
struct Light {
    vec3 position;
    float brightness;
    float shadowRange;
    float shadowStrength;
    float highlightRange;
    float highlightStrength;
    vec3 highlightColor;
    vec3 shadowColor;
};
uniform Light light;

void main() {
    vec4 color = texture2D(diffuseMap, uv);
    float mask = 1.0;
    if (enableMask) {
        mask = texture2D(maskMap, uv).r;
    }
    vec3 normal = texture2D(normalMap, uv).xyz;
    
    vec3 norm = normalize(normal * 2.0 - 1.0);
    vec3 lightDir = normalize(light.position - vec3(uv, 0));
    
    float diffuse = max(dot(norm, lightDir), 0.0);
    diffuse = diffuse * light.brightness + ambient;
    // diffuse = (diffuse + 1.0) * 0.5;
    
    float shadowThreshold = 1.0 - light.shadowRange;
    float highlightThreshold = 1.0 - light.highlightRange;
    
    float shadowMask = clamp((diffuse - shadowThreshold) / max(light.shadowRange, 1e-6), 0.0, 1.0);
    float highlightMask = clamp((diffuse - highlightThreshold) / max(light.highlightRange, 1e-6), 0.0, 1.0);
    
    float lightIntensity = 1.0;
    if (light.shadowStrength != 1.0) {
        lightIntensity = lightIntensity * (
            shadowMask + 
            (1.0 - shadowMask) * (2.0 - light.shadowStrength)
        );
    }
    if (light.highlightStrength != 1.0) {
        lightIntensity = lightIntensity + highlightMask * (light.highlightStrength - 1.0);
    }

    vec3 colorEffect = shadowMask * light.highlightColor + (1.0 - shadowMask) * light.shadowColor;
    vec3 result = diffuse * color.rgb * lightIntensity * colorEffect;
    
    result = clamp(result, 0.0, 1.0);
    result = mix(color.rgb, result, mask);
    gl_FragColor = vec4(result, 1.0);
}
`;

const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    // console.log(gl.getShaderInfoLog(shader));
    return shader;
};
const createProgram = (vertShader, fragShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    return program;
};
const vertShader = createShader(gl.VERTEX_SHADER, vert);
const fragShader = createShader(gl.FRAGMENT_SHADER, frag);
const program = createProgram(vertShader, fragShader);

const createVbo = (data) => {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return vbo;
};
const vbo = createVbo([-1, 1, -1, -1, 1, -1, 1, -1, 1, 1, -1, 1]);


let images = {
    diffuseMap: {
        image: null,
        texture: null,
    },
    maskMap: {
        image: null,
        texture: null,
    },
    normalMap: {
        image: null,
        texture: null,
    }
};

// 添加全局变量存储nodeId
let currentNodeId = null;

// 添加消息监听器接收数据
window.addEventListener('message', async (event) => {
    if (event.data.type === 'init') {
        const { diffuseMap, normalMap, maskMap, nodeId } = event.data.data;
        
        // 存储nodeId
        currentNodeId = nodeId;
        
        // 创建图片对象并加载数据
        const loadImageFromUrl = async (dataUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = dataUrl;
            });
        };

        // 加载所有图片
        images.diffuseMap.image = await loadImageFromUrl(diffuseMap);
        images.normalMap.image = await loadImageFromUrl(normalMap);
        images.maskMap.image = await loadImageFromUrl(maskMap);

        // 创建纹理
        images.diffuseMap.texture = createTexture(images.diffuseMap.image);
        images.normalMap.texture = createTexture(images.normalMap.image);
        images.maskMap.texture = createTexture(images.maskMap.image);

        // 设置画布尺寸
        canvas.width = images.diffuseMap.image.width;
        canvas.height = images.diffuseMap.image.height;
        
        // 添加以下代码来调整视口
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // 设置canvas的style尺寸以保持宽高比
        const containerWidth = canvas.parentElement.clientWidth;
        const containerHeight = canvas.parentElement.clientHeight;
        const scale = Math.min(
            containerWidth / canvas.width,
            containerHeight / canvas.height
        );
        
        canvas.style.width = `${canvas.width * scale}px`;
        canvas.style.height = `${canvas.height * scale}px`;
    }
});

const createTexture = (image) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
};

const locations = {
    position: gl.getAttribLocation(program, 'position'),
    diffuseMap: gl.getUniformLocation(program, 'diffuseMap'),
    maskMap: gl.getUniformLocation(program, 'maskMap'),
    normalMap: gl.getUniformLocation(program, 'normalMap'),
    enableMask: gl.getUniformLocation(program, 'enableMask'),
    ambient: gl.getUniformLocation(program, 'ambient'),
    light: {
        position: gl.getUniformLocation(program, 'light.position'),
        brightness: gl.getUniformLocation(program, 'light.brightness'),
        shadowRange: gl.getUniformLocation(program, 'light.shadowRange'),
        shadowStrength: gl.getUniformLocation(program, 'light.shadowStrength'),
        highlightRange: gl.getUniformLocation(program, 'light.highlightRange'),
        highlightStrength: gl.getUniformLocation(program, 'light.highlightStrength'),
        highlightColor: gl.getUniformLocation(program, 'light.highlightColor'),
        shadowColor: gl.getUniformLocation(program, 'light.shadowColor'),
    }
};

let uniforms = {
    light: {
        position: [0, 0, 1],
        enableMask: true,
        ambient: 0.85,
        brightness: 0.15,
        shadowRange: 1.0,
        shadowStrength: 1.0,
        highlightRange: 1.0,
        highlightStrength: 1.0,
        highlightColor: [1, 1, 1],
        shadowColor: [0, 0, 0],
    },
};
const onMoveLightPosition = (x, y) => {
    uniforms.light.position[0] = 1 - x / canvas.offsetWidth * 2;
    uniforms.light.position[1] = 1 - y / canvas.offsetHeight * 2;
};

let moving = false;
const onCanvasMouseDown = (e) => {
    moving = true;
    onMoveLightPosition(e.offsetX, e.offsetY);
    e.preventDefault();
};
const onCanvasMouseUp = (e) => {
    moving = false;
    e.preventDefault();
}
const onCanvasMouseMove = (e) => {
    if (moving) {
        onMoveLightPosition(e.offsetX, e.offsetY);
    }
};
canvas.addEventListener('mousedown', onCanvasMouseDown);
canvas.addEventListener('mouseup', onCanvasMouseUp);
canvas.addEventListener('mousemove', onCanvasMouseMove);


document.getElementById('light-z').value = uniforms.light.position[2];
document.getElementById('light-z').addEventListener('input', (e) => {
    uniforms.light.position[2] = e.target.value;
});
document.getElementById('light-enableMask').checked = uniforms.light.enableMask;
document.getElementById('light-enableMask').addEventListener('change', (e) => {
    uniforms.light.enableMask = e.target.checked;
});
document.getElementById('light-ambient').value = uniforms.light.ambient;
document.getElementById('light-ambient').addEventListener('input', (e) => {
    uniforms.light.ambient = e.target.value;
});
document.getElementById('light-brightness').value = uniforms.light.brightness;
document.getElementById('light-brightness').addEventListener('input', (e) => {
    uniforms.light.brightness = e.target.value;
});
document.getElementById('light-shadowRange').value = uniforms.light.shadowRange;
document.getElementById('light-shadowRange').addEventListener('input', (e) => {
    uniforms.light.shadowRange = e.target.value;
});
document.getElementById('light-shadowStrength').value = uniforms.light.shadowStrength;
document.getElementById('light-shadowStrength').addEventListener('input', (e) => {
    uniforms.light.shadowStrength = e.target.value;
});
document.getElementById('light-highlightRange').value = uniforms.light.highlightRange;
document.getElementById('light-highlightRange').addEventListener('input', (e) => {
    uniforms.light.highlightRange = e.target.value;
});
document.getElementById('light-highlightStrength').value = uniforms.light.highlightStrength;
document.getElementById('light-highlightStrength').addEventListener('input', (e) => {
    uniforms.light.highlightStrength = e.target.value;
});

const parseColor = (color) => {
    if (color.startsWith('#')) {
        color = color.substring(1);
    }
    return [
        color.substring(0, 2),
        color.substring(2, 4),
        color.substring(4, 6),
    ].map(x => parseInt(x, 16)).map(x => x / 255);
};
document.getElementById('light-highlightColor').addEventListener('input', (e) => {
    console.log(e.target.value);
    uniforms.light.highlightColor = parseColor(e.target.value);
});
document.getElementById('light-shadowColor').addEventListener('input', (e) => {
    uniforms.light.shadowColor = parseColor(e.target.value);
});


console.log(images);
console.log(locations);

const update = () => {
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0, 1, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.useProgram(program);

    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, images.diffuseMap.texture);
    gl.uniform1i(locations.diffuseMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, images.maskMap.texture);
    gl.uniform1i(locations.maskMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, images.normalMap.texture);
    gl.uniform1i(locations.normalMap, 2);

    gl.uniform3fv(locations.light.position, uniforms.light.position);
    gl.uniform1i(locations.enableMask, uniforms.light.enableMask ? 1 : 0);
    gl.uniform1f(locations.ambient, uniforms.light.ambient);
    gl.uniform1f(locations.light.brightness, uniforms.light.brightness);
    gl.uniform1f(locations.light.shadowRange, uniforms.light.shadowRange);
    gl.uniform1f(locations.light.shadowStrength, uniforms.light.shadowStrength);
    gl.uniform1f(locations.light.highlightRange, uniforms.light.highlightRange);
    gl.uniform1f(locations.light.highlightStrength, uniforms.light.highlightStrength);
    gl.uniform3fv(locations.light.highlightColor, uniforms.light.highlightColor);
    gl.uniform3fv(locations.light.shadowColor, uniforms.light.shadowColor);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    requestAnimationFrame(update);
};

update();

// 添加调试日志函数
function debugLog(message) {
    console.log(message);  // 保留本地控制台日志
    if (window.opener) {
        window.opener.console.log('[Relight Window]:', message);
    }
}

// 修改getCanvasImageData函数
function getCanvasImageData() {
    debugLog("开始获取canvas数据...");
    
    // 确保完成所有渲染命令
    gl.finish();
    
    // 创建一个临时canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    debugLog(`Canvas尺寸: ${canvas.width}x${canvas.height}`);
    
    // 使用已存在的 gl 上下文读取像素数据
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // 检查像素数据是否为空
    const isAllZero = pixels.every(val => val === 0);
    if (isAllZero) {
        debugLog("警告：读取的像素数据全为0");
    } else {
        debugLog("成功读取像素数据");
    }
    
    // 创建ImageData对象
    const imageData = new ImageData(new Uint8ClampedArray(pixels), canvas.width, canvas.height);
    
    // 翻转图像（因为WebGL和Canvas的Y轴方向相反）
    tempCtx.putImageData(imageData, 0, 0);
    
    // 在另一个canvas上翻转图像
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');
    
    // 翻转绘制
    finalCtx.scale(1, -1);
    finalCtx.translate(0, -canvas.height);
    finalCtx.drawImage(tempCanvas, 0, 0);
    
    const dataUrl = finalCanvas.toDataURL('image/png');
    debugLog("canvas数据转换完成，数据长度: " + dataUrl.length);
    
    return dataUrl;
}

// 修改应用按钮的点击事件处理
document.getElementById('apply-button').addEventListener('click', async () => {
    try {
        // 先执行一次渲染确保画面是最新的
        update();
        // 确保渲染完成
        gl.finish();
        
        if (!currentNodeId) {
            throw new Error('未找到节点ID');
        }

        debugLog(`开始处理节点ID: ${currentNodeId}`);

        // 获取canvas图像数据
        const imageData = getCanvasImageData();
        
        // 发送数据到后端
        debugLog("开始发送数据到后端...");
        const response = await fetch('/lg_relight/update_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                node_id: currentNodeId,
                image: imageData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            debugLog(`请求失败: ${response.status} - ${errorText}`);
            throw new Error(`发送数据失败: ${response.status}`);
        }

        debugLog("数据发送成功，准备关闭窗口");
        window.close();

    } catch (error) {
        debugLog(`发生错误: ${error.message}`);
        console.error('应用更改时发生错误:', error);
        alert('应用更改失败: ' + error.message);
    }
});

// 添加窗口关闭事件处理
window.addEventListener('beforeunload', async () => {
    try {
        // 发送窗口关闭消息到后端
        await fetch('/lg_relight/window_closed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                node_id: currentNodeId
            })
        });
    } catch (error) {
        console.error('发送窗口关闭消息失败:', error);
    }
});
