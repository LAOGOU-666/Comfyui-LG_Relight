import { t } from "./i18n.js"; // Importa el helper de traducción

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
        // Ensure the target point is set and updated
        if (targetPoint) {
            spotlight.target.position.copy(targetPoint);
        }
        
        // Make sure the target is added to the scene to work properly
        if (!spotlight.target.parent) {
            console.log('[RelightNode] ' + t("聚光灯目标未添加到场景中，请在创建聚光灯后调用 scene.add(spotlight.target)"));
        }
        
        spotlight.target.updateMatrixWorld();
    }

    static calculateSpotlightDirection(spotlightPos, targetPos) {
        // Calculate direction vector from spotlight position to target position
        const direction = new THREE.Vector3(
            targetPos.x - spotlightPos.x,
            targetPos.y - spotlightPos.y,
            targetPos.z - spotlightPos.z
        );
        
        // Normalize direction vector
        direction.normalize();
        
        return direction;
    }

    static visualizeSpotlight(scene, spotlight, color = 0xffffff, segments = 8) {
        // Remove previous visual helper
        if (spotlight.visualHelper) {
            scene.remove(spotlight.visualHelper);
        }
        
        // Create cone geometry for spotlight visualization
        const angle = spotlight.angle;
        const distance = spotlight.distance || 10;
        
        // Calculate cone top radius
        const radius = Math.tan(angle) * distance;
        
        // Create cone geometry
        const geometry = new THREE.ConeGeometry(radius, distance, segments, 1, true);
        geometry.rotateX(Math.PI);
        
        // Create material
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        
        // Create mesh
        const cone = new THREE.Mesh(geometry, material);
        
        // Set position to spotlight position
        cone.position.copy(spotlight.position);
        
        // Get direction
        const target = new THREE.Vector3(
            spotlight.target.position.x,
            spotlight.target.position.y,
            spotlight.target.position.z
        );
        
        // Calculate direction from spotlight to target
        const direction = this.calculateSpotlightDirection(
            {x: spotlight.position.x, y: spotlight.position.y, z: spotlight.position.z},
            {x: target.x, y: target.y, z: target.z}
        );
        
        // Make cone look at target
        cone.lookAt(target);
        
        // Store visual helper
        spotlight.visualHelper = cone;
        
        // Add to scene
        scene.add(cone);
        
        return cone;
    }

    static createMaskedMaterial(baseTexture, depthMap, normalMap, maskTexture, normalScale = 1.0) {
        console.log('[RelightNode] ' + t("创建带遮罩的材质"));
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
        // Default Z value, used when depth cannot be read
        const defaultZ = 1.0;
        
        try {
            if (!depthMapTexture || !depthMapTexture.image) {
                return defaultZ + zOffset;
            }
            
            // Create temporary canvas to read pixels from depth map
            if (!this.depthMapCanvas) {
                this.depthMapCanvas = document.createElement('canvas');
                this.depthMapContext = this.depthMapCanvas.getContext('2d');
            }
            
            const img = depthMapTexture.image;
            this.depthMapCanvas.width = img.width;
            this.depthMapCanvas.height = img.height;
            this.depthMapContext.drawImage(img, 0, 0);
            
            // Calculate coordinates
            const pixelX = Math.floor(x * img.width);
            const pixelY = Math.floor(y * img.height);
            
            // Get pixel data
            try {
                const pixelData = this.depthMapContext.getImageData(pixelX, pixelY, 1, 1).data;
                // Convert grayscale value (0-255) to depth (0.1-2.0)
                // Usually, white means closer, black means farther
                const depth = pixelData[0] / 255; // Use red channel as depth value
                
                // Convert to z-axis and add offset
                const zValue = 1 + depth * 1 + zOffset;
                return zValue;
            } catch (error) {
                console.error('[RelightNode] ' + t("读取深度图像素失败") + ":", error);
                return defaultZ + zOffset;
            }
        } catch (error) {
            console.error('[RelightNode] ' + t("获取Z值时出错") + ":", error);
            return defaultZ + zOffset;
        }
    }
}
