export class SceneUtils {
    static base64ToTexture(base64String) {
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

    static createSimpleMaterial(baseTexture, depthMap, normalMap, normalScale = 0) {
        return new THREE.MeshPhongMaterial({
            map: baseTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(normalScale, normalScale),
            displacementMap: depthMap,
            displacementScale: 0.3,
            shininess: 0,
            specular: new THREE.Color(0)
        });
    }

    static adjustSpotlightDirection(spotlight, targetPoint) {
        // 确保目标点被设置并更新
        if (targetPoint) {
            spotlight.target.position.copy(targetPoint);
        }
        
        // 确保目标被添加到场景中才能正常工作
        if (!spotlight.target.parent) {
            console.log('[RelightNode] 聚光灯目标未添加到场景中，请在创建聚光灯后调用 scene.add(spotlight.target)');
        }
        
        spotlight.target.updateMatrixWorld();
    }

    static calculateSpotlightDirection(spotlightPos, targetPos) {
        // 计算从聚光灯位置到目标位置的方向向量
        const direction = new THREE.Vector3(
            targetPos.x - spotlightPos.x,
            targetPos.y - spotlightPos.y,
            targetPos.z - spotlightPos.z
        );
        
        // 归一化方向向量
        direction.normalize();
        
        return direction;
    }

    static visualizeSpotlight(scene, spotlight, color = 0xffffff, segments = 8) {
        // 移除之前的可视化对象
        if (spotlight.visualHelper) {
            scene.remove(spotlight.visualHelper);
        }
        
        // 创建聚光灯锥体可视化几何体
        const angle = spotlight.angle;
        const distance = spotlight.distance || 10;
        
        // 计算锥体顶端半径
        const radius = Math.tan(angle) * distance;
        
        // 创建锥体几何体
        const geometry = new THREE.ConeGeometry(radius, distance, segments, 1, true);
        geometry.rotateX(Math.PI);
        
        // 创建材质
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        
        // 创建网格
        const cone = new THREE.Mesh(geometry, material);
        
        // 设置位置为聚光灯位置
        cone.position.copy(spotlight.position);
        
        // 获取方向
        const target = new THREE.Vector3(
            spotlight.target.position.x,
            spotlight.target.position.y,
            spotlight.target.position.z
        );
        
        // 计算聚光灯到目标的方向
        const direction = this.calculateSpotlightDirection(
            {x: spotlight.position.x, y: spotlight.position.y, z: spotlight.position.z},
            {x: target.x, y: target.y, z: target.z}
        );
        
        // 使锥体指向目标
        cone.lookAt(target);
        
        // 存储可视化对象
        spotlight.visualHelper = cone;
        
        // 添加到场景
        scene.add(cone);
        
        return cone;
    }

    static createMaskedMaterial(baseTexture, depthMap, normalMap, maskTexture, normalScale = 1.0) {
        console.log('[RelightNode] 创建带遮罩的材质');
        const material = new THREE.MeshPhongMaterial({
            map: baseTexture,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(normalScale, normalScale),
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

    static getZValueFromDepthMap(depthMapTexture, x, y, zOffset) {
        // 默认Z值，当无法从深度图获取时使用
        const defaultZ = 1.0;
        
        try {
            if (!depthMapTexture || !depthMapTexture.image) {
                return defaultZ + zOffset;
            }
            
            // 创建临时画布以便于读取深度图像素
            if (!this.depthMapCanvas) {
                this.depthMapCanvas = document.createElement('canvas');
                this.depthMapContext = this.depthMapCanvas.getContext('2d');
            }
            
            const img = depthMapTexture.image;
            this.depthMapCanvas.width = img.width;
            this.depthMapCanvas.height = img.height;
            this.depthMapContext.drawImage(img, 0, 0);
            
            // 计算图像上的坐标
            const pixelX = Math.floor(x * img.width);
            const pixelY = Math.floor(y * img.height);
            
            // 获取像素数据
            try {
                const pixelData = this.depthMapContext.getImageData(pixelX, pixelY, 1, 1).data;
                // 从灰度值计算深度（0-255转为0.1-2.0范围）
                // 通常深度图白色表示更近，黑色表示更远
                const depth = pixelData[0] / 255; // 使用红色通道作为深度值
                
                // 转换为z轴范围，并添加偏移量
                const zValue = 1 + depth * 1 + zOffset;
                return zValue;
            } catch (error) {
                console.error('[RelightNode] 读取深度图像素失败:', error);
                return defaultZ + zOffset;
            }
        } catch (error) {
            console.error('[RelightNode] 获取Z值时出错:', error);
            return defaultZ + zOffset;
        }
    }
}
