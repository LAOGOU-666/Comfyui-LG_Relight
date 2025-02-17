import torch
import numpy as np
from PIL import Image
import io
import base64
from server import PromptServer
import threading
from aiohttp import web
import json
import torch.nn.functional as F
image_cache = {}
event_dict = {}

@PromptServer.instance.routes.post("/lg_relight/update_image")
async def update_image(request):
    try:
        data = await request.json()
        node_id = data.get("node_id")
        image_data = data.get("image")
        
        if node_id and image_data:
            image_cache[node_id] = image_data
            if node_id in event_dict:
                event_dict[node_id].set()
            return web.Response(text=json.dumps({"status": "success"}))
        else:
            return web.Response(status=400, text=json.dumps({"error": "Invalid data"}))
    except Exception as e:
        return web.Response(status=500, text=json.dumps({"error": str(e)}))

@PromptServer.instance.routes.post("/lg_relight/window_closed")
async def window_closed(request):
    try:
        data = await request.json()
        node_id = data.get("node_id")
        original_image = data.get("original_image")
        
        if node_id:
            if original_image:
                image_cache[node_id] = original_image
            if node_id in event_dict:
                event_dict[node_id].set()
            return web.Response(text=json.dumps({"status": "success"}))
    except Exception as e:
        return web.Response(status=500, text=json.dumps({"error": str(e)}))

class LG_Relight_V2:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "normals": ("IMAGE",),
                "mask": ("MASK",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "relight"
    CATEGORY = "🎈LAOGOU"
    OUTPUT_NODE = True

    def encode_image_to_base64(self, image, is_mask=False):
        image = (image * 255).clip(0, 255).astype(np.uint8)
        
        if is_mask:
            if len(image.shape) == 3:
                image = image[0]
            image = np.stack([image] * 3, axis=-1)
        else:
            if len(image.shape) == 4:
                image = image[0]
        
        image = Image.fromarray(image)
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()

    def relight(self, image, normals, mask, unique_id):
        try:
            print(f"[DEBUG] 开始处理 relight 请求: node_id={unique_id}")
            print(f"[DEBUG] 输入图像形状: image={image.shape}, normals={normals.shape}, mask={mask.shape}")
            
            event = threading.Event()
            event_dict[unique_id] = event
            print(f"[DEBUG] 创建事件对象: event_id={id(event)}")
            
            # 转换图像为base64
            print("[DEBUG] 开始转换图像为base64...")
            image_b64 = self.encode_image_to_base64(image.cpu().numpy()[0])
            normals_b64 = self.encode_image_to_base64(normals.cpu().numpy()[0])
            mask_b64 = self.encode_image_to_base64(mask.cpu().numpy(), is_mask=True)
            print("[DEBUG] 图像转换完成")
            
            # 准备发送数据
            send_data = {
                "node_id": unique_id,
                "image": f"data:image/png;base64,{image_b64}",
                "normals": f"data:image/png;base64,{normals_b64}",
                "mask": f"data:image/png;base64,{mask_b64}"
            }
            print(f"[DEBUG] 准备发送数据到前端: node_id={unique_id}, data_size={len(str(send_data))}")
            
            # 发送数据到前端
            print("[DEBUG] 发送数据到前端...")
            PromptServer.instance.send_sync("lg_relight_init", send_data)
            print("[DEBUG] 数据发送完成，等待前端响应...")
            
            # 等待前端响应
            event.wait()
            print(f"[DEBUG] 收到前端响应: node_id={unique_id}")
            del event_dict[unique_id]
            
            # 处理返回的图像
            if unique_id in image_cache:
                print(f"[DEBUG] 找到缓存的图像: node_id={unique_id}")
                img_data = base64.b64decode(image_cache[unique_id].split(",")[1])
                img = Image.open(io.BytesIO(img_data))
                img_np = np.array(img).astype(np.float32) / 255.0
                
                print(f"[DEBUG] 处理后的图像形状: {img_np.shape}")
                
                if len(img_np.shape) == 2:
                    print("[DEBUG] 转换灰度图为RGB")
                    img_np = np.stack([img_np] * 3, axis=-1)
                elif len(img_np.shape) == 3 and img_np.shape[-1] == 4:
                    print("[DEBUG] 移除alpha通道")
                    img_np = img_np[..., :3]
                
                result = torch.from_numpy(img_np).unsqueeze(0)
                print(f"[DEBUG] 最终输出图像形状: {result.shape}")
                
                del image_cache[unique_id]
                return (result,)
            else:
                print(f"[DEBUG] 未找到缓存的图像，返回原始图像: node_id={unique_id}")
                return (image,)
            
        except Exception as e:
            print(f"[ERROR] relight处理发生错误: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return (image,)
        finally:
            print(f"[DEBUG] 清理资源: node_id={unique_id}")
            if unique_id in event_dict:
                del event_dict[unique_id]
            if unique_id in image_cache:
                del image_cache[unique_id]


class LG_Relight_Basic:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "normals": ("IMAGE",),
                "x": ("FLOAT", { 
                    "display": "slider",
                    "default": 0.0, 
                    "min": -1.0, 
                    "max": 1.0, 
                    "step": 0.001 
                }),
                "y": ("FLOAT", { 
                    "display": "slider",
                    "default": 0.0, 
                    "min": -1.0, 
                    "max": 1.0, 
                    "step": 0.001 
                }),
                "z": ("FLOAT", { 
                    "display": "slider",
                    "default": 1.0, 
                    "min": -1.0, 
                    "max": 1.0, 
                    "step": 0.001 
                }),
                "brightness": ("FLOAT", { 
                    "display": "slider",
                    "default": 1.0, 
                    "min": 0.0, 
                    "max": 3.0, 
                    "step": 0.001 
                }),
                "shadow_range": ("FLOAT", { 
                    "display": "slider",
                    "default": 1.0, 
                    "min": 0.0, 
                    "max": 2.0, 
                    "step": 0.001 
                }),
                "shadow_strength": ("FLOAT", { 
                    "display": "slider",
                    "default": 1.0, 
                    "min": 0.0, 
                    "max": 2.0, 
                    "step": 0.001 
                }),
                "highlight_range": ("FLOAT", { 
                    "display": "slider",
                    "default": 1.0, 
                    "min": 0.0, 
                    "max": 2.0, 
                    "step": 0.001 
                }),
                "highlight_strength": ("FLOAT", { 
                    "display": "slider",
                    "default": 1.0, 
                    "min": 0.0, 
                    "max": 2.0, 
                    "step": 0.001 
                }),
                "highlight_color": ("COLOR", {"default": "#FFFFFF"}),
                "shadow_color": ("COLOR", {"default": "#000000"}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    OUTPUT_NODE = True
    FUNCTION = "relight"
    CATEGORY = "🎈LAOGOU"

    def relight(self, image, normals, x, y, z, brightness, 
              shadow_range, shadow_strength, highlight_range, highlight_strength,
              highlight_color, shadow_color):
        
        # 将十六进制颜色转换为RGB值
        def hex_to_rgb(hex_color):
            hex_color = hex_color.lstrip('#')
            return [int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4)]
        
        highlight_color = hex_to_rgb(highlight_color)
        shadow_color = hex_to_rgb(shadow_color)
        
        norm = normals.detach().clone() * 2 - 1
        norm = F.interpolate(norm.movedim(-1,1), 
                        size=(image.shape[1], image.shape[2]), 
                        mode='bilinear').movedim(1,-1)

        light = torch.tensor([x, y, z], device=image.device)
        light = F.normalize(light, dim=0)

        diffuse = norm[:,:,:,0] * light[0] + norm[:,:,:,1] * light[1] + norm[:,:,:,2] * light[2]
        diffuse = (diffuse + 1.0) * 0.5
        
        shadow_offset = shadow_strength - 1.0
        highlight_offset = highlight_strength - 1.0

        shadow_threshold = 1.0 - shadow_range
        highlight_threshold = 1.0 - highlight_range
        
        shadow_mask = torch.clamp((diffuse - shadow_threshold) / max(shadow_range, 1e-6), 0, 1)
        highlight_mask = torch.clamp((diffuse - highlight_threshold) / max(highlight_range, 1e-6), 0, 1)

        light_intensity = torch.ones_like(diffuse)

        if shadow_strength != 1.0:
            light_intensity = light_intensity * (
                shadow_mask + 
                (1.0 - shadow_mask) * (2.0 - shadow_strength)
            )

        if highlight_strength != 1.0:
            light_intensity = light_intensity + highlight_mask * highlight_offset

        color_effect = torch.ones_like(image[:,:,:,:3])
        if highlight_color != [1.0, 1.0, 1.0] or shadow_color != [0.0, 0.0, 0.0]:
            highlight_color = torch.tensor(highlight_color, device=image.device)
            shadow_color = torch.tensor(shadow_color, device=image.device)
            color_effect = (
                shadow_mask.unsqueeze(-1) * highlight_color +
                (1.0 - shadow_mask).unsqueeze(-1) * shadow_color
            )

        brightness_factor = brightness if brightness != 1.0 else 1.0

        relit = image.detach().clone()
        light_intensity = light_intensity.unsqueeze(-1).repeat(1,1,1,3)
        
        relit[:,:,:,:3] = torch.clip(
            relit[:,:,:,:3] * light_intensity * brightness_factor * color_effect,
            0, 1
        )
        
        return (relit,)
    

from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, 
                           QSlider, QLabel, QPushButton, QColorDialog)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QImage, QPixmap

class LightPreviewDialog(QDialog):
    def __init__(self, initial_values=None, parent=None):
        super().__init__(parent)
        self.setWindowTitle("LG_Relight")
        self.setMinimumSize(512, 600)

        self.current_values = initial_values.copy() if initial_values else {
            'x': 0.0,
            'y': 0.0,
            'z': 1.0,
            'brightness': 1.0,
            'shadow_range': 1.0,
            'shadow_strength': 1.0,
            'highlight_range': 1.0,
            'highlight_strength': 1.0,
            'highlight_color': [1.0, 1.0, 1.0], 
            'shadow_color': [0.0, 0.0, 0.0] 
        }  
        layout = QVBoxLayout()

        self.preview_label = ImageLabel()
        self.preview_label.setMinimumSize(512, 512)
        self.preview_label.setAlignment(Qt.AlignCenter)
        self.preview_label.mouseMoveHandler = self.on_image_mouse_move
        layout.addWidget(self.preview_label)
        

        sliders_layout = QVBoxLayout()

        SLIDER_WIDTH = 300

        z_layout = QHBoxLayout()
        z_layout.addWidget(QLabel("Z 轴:"))
        self.z_slider = QSlider(Qt.Horizontal)
        self.z_slider.setFixedWidth(SLIDER_WIDTH)
        self.z_slider.setRange(-1000, 1000)
        self.z_slider.setValue(1000)

        z_layout.addWidget(self.z_slider)
        self.z_value = QLabel("1.0")
        z_layout.addWidget(self.z_value)
        reset_z = QPushButton("重置")

        z_layout.addWidget(reset_z)
        sliders_layout.addLayout(z_layout)
        

        shadow_range_layout = QHBoxLayout()
        shadow_range_layout.addWidget(QLabel("阴影范围:"))
        self.shadow_range_slider = QSlider(Qt.Horizontal)
        self.shadow_range_slider.setFixedWidth(SLIDER_WIDTH)
        self.shadow_range_slider.setRange(0, 200)
        self.shadow_range_slider.setValue(100)

        shadow_range_layout.addWidget(self.shadow_range_slider)
        self.shadow_range_value = QLabel("1.0")
        shadow_range_layout.addWidget(self.shadow_range_value)
        reset_sr = QPushButton("重置")

        shadow_range_layout.addWidget(reset_sr)
        sliders_layout.addLayout(shadow_range_layout)

        shadow_strength_layout = QHBoxLayout()
        shadow_strength_layout.addWidget(QLabel("阴影强度:"))
        self.shadow_strength_slider = QSlider(Qt.Horizontal)
        self.shadow_strength_slider.setFixedWidth(SLIDER_WIDTH)
        self.shadow_strength_slider.setRange(0, 200)
        self.shadow_strength_slider.setValue(100)

        shadow_strength_layout.addWidget(self.shadow_strength_slider)
        self.shadow_strength_value = QLabel("1.0")
        shadow_strength_layout.addWidget(self.shadow_strength_value)
        reset_ss = QPushButton("重置")

        shadow_strength_layout.addWidget(reset_ss)
        sliders_layout.addLayout(shadow_strength_layout)

        highlight_range_layout = QHBoxLayout()
        highlight_range_layout.addWidget(QLabel("高光范围:"))
        self.highlight_range_slider = QSlider(Qt.Horizontal)
        self.highlight_range_slider.setFixedWidth(SLIDER_WIDTH)
        self.highlight_range_slider.setRange(0, 200)
        self.highlight_range_slider.setValue(100)

        highlight_range_layout.addWidget(self.highlight_range_slider)
        self.highlight_range_value = QLabel("1.0")
        highlight_range_layout.addWidget(self.highlight_range_value)
        reset_hr = QPushButton("重置")

        highlight_range_layout.addWidget(reset_hr)
        sliders_layout.addLayout(highlight_range_layout)

        highlight_strength_layout = QHBoxLayout()
        highlight_strength_layout.addWidget(QLabel("高光强度:"))
        self.highlight_strength_slider = QSlider(Qt.Horizontal)
        self.highlight_strength_slider.setFixedWidth(SLIDER_WIDTH)
        self.highlight_strength_slider.setRange(0, 200)
        self.highlight_strength_slider.setValue(100)
        highlight_strength_layout.addWidget(self.highlight_strength_slider)
        self.highlight_strength_value = QLabel("1.0")
        highlight_strength_layout.addWidget(self.highlight_strength_value)
        reset_hs = QPushButton("重置")

        highlight_strength_layout.addWidget(reset_hs)
        sliders_layout.addLayout(highlight_strength_layout)

        brightness_layout = QHBoxLayout()
        brightness_layout.addWidget(QLabel("亮度:"))
        self.brightness_slider = QSlider(Qt.Horizontal)
        self.brightness_slider.setFixedWidth(SLIDER_WIDTH)
        self.brightness_slider.setRange(0, 300)
        self.brightness_slider.setValue(100)

        brightness_layout.addWidget(self.brightness_slider)
        self.brightness_value = QLabel("1.0")
        brightness_layout.addWidget(self.brightness_value)
        reset_b = QPushButton("重置")
        reset_b.clicked.connect(lambda: self.brightness_slider.setValue(100))
        brightness_layout.addWidget(reset_b)
        sliders_layout.addLayout(brightness_layout)
        
        layout.addLayout(sliders_layout)

        color_layout = QHBoxLayout()
        

        highlight_color_layout = QHBoxLayout()
        highlight_color_layout.addWidget(QLabel("高光颜色:"))
        self.highlight_color_button = QPushButton()
        self.highlight_color_button.setFixedSize(50, 25)
        self.set_button_color(self.highlight_color_button, self.current_values['highlight_color'])

        highlight_color_layout.addWidget(self.highlight_color_button)

        highlight_reset_button = QPushButton("重置")
        highlight_reset_button.setFixedSize(50, 25)

        highlight_color_layout.addWidget(highlight_reset_button)
        
        color_layout.addLayout(highlight_color_layout)

        color_layout.addSpacing(20)

        shadow_color_layout = QHBoxLayout()
        shadow_color_layout.addWidget(QLabel("阴影颜色:"))
        self.shadow_color_button = QPushButton()
        self.shadow_color_button.setFixedSize(50, 25)
        self.set_button_color(self.shadow_color_button, self.current_values['shadow_color'])

        shadow_color_layout.addWidget(self.shadow_color_button)

        shadow_reset_button = QPushButton("重置")
        shadow_reset_button.setFixedSize(50, 25)

        shadow_color_layout.addWidget(shadow_reset_button)
        
        color_layout.addLayout(shadow_color_layout)
        
        layout.addLayout(color_layout)

        self.ok_button = QPushButton("确定")

        layout.addWidget(self.ok_button)

        self.z_slider.valueChanged.connect(lambda x: self.on_slider_changed())
        self.shadow_range_slider.valueChanged.connect(lambda x: self.on_slider_changed())
        self.shadow_strength_slider.valueChanged.connect(lambda x: self.on_slider_changed())
        self.highlight_range_slider.valueChanged.connect(lambda x: self.on_slider_changed())
        self.highlight_strength_slider.valueChanged.connect(lambda x: self.on_slider_changed())
        self.brightness_slider.valueChanged.connect(lambda x: self.on_slider_changed())

        reset_z.clicked.connect(lambda x: self.z_slider.setValue(1000))
        reset_sr.clicked.connect(lambda x: self.shadow_range_slider.setValue(100))
        reset_ss.clicked.connect(lambda x: self.shadow_strength_slider.setValue(100))
        reset_hr.clicked.connect(lambda x: self.highlight_range_slider.setValue(100))
        reset_hs.clicked.connect(lambda x: self.highlight_strength_slider.setValue(100))
        reset_b.clicked.connect(lambda x: self.brightness_slider.setValue(100))

        self.highlight_color_button.clicked.connect(lambda x: self.on_highlight_color_click())
        self.shadow_color_button.clicked.connect(lambda x: self.on_shadow_color_click())
        highlight_reset_button.clicked.connect(lambda x: self.reset_highlight_color())
        shadow_reset_button.clicked.connect(lambda x: self.reset_shadow_color())

        self.ok_button.clicked.connect(lambda x: self.accept())
        
        self.setLayout(layout)

        self.x_slider = QSlider(Qt.Horizontal)
        self.y_slider = QSlider(Qt.Horizontal)
        self.x_slider.setRange(-1000, 1000)
        self.y_slider.setRange(-1000, 1000)
        self.x_slider.hide()
        self.y_slider.hide()
        
        if initial_values:

            self.z_slider.setValue(int(initial_values['z'] * 1000))
            self.brightness_slider.setValue(int(initial_values['brightness'] * 100))
            self.shadow_range_slider.setValue(int((2.0 - initial_values['shadow_range']) * 100))
            self.shadow_strength_slider.setValue(int(initial_values['shadow_strength'] * 100))
            self.highlight_range_slider.setValue(int(initial_values['highlight_range'] * 100))
            self.highlight_strength_slider.setValue(int(initial_values['highlight_strength'] * 100))

            self.x_slider.setValue(int(initial_values['x'] * 1000))
            self.y_slider.setValue(int(initial_values['y'] * 1000))

            self.z_value.setText(f"{initial_values['z']:.3f}")
            self.brightness_value.setText(f"{initial_values['brightness']:.3f}")
            self.shadow_range_value.setText(f"{2.0 - initial_values['shadow_range']:.3f}")
            self.shadow_strength_value.setText(f"{initial_values['shadow_strength']:.3f}")
            self.highlight_range_value.setText(f"{initial_values['highlight_range']:.3f}")
            self.highlight_strength_value.setText(f"{initial_values['highlight_strength']:.3f}")

            self.set_button_color(self.highlight_color_button, initial_values['highlight_color'])
            self.set_button_color(self.shadow_color_button, initial_values['shadow_color'])

    def reset_highlight_color(self):
        self.current_values['highlight_color'] = [1.0, 1.0, 1.0]
        self.set_button_color(self.highlight_color_button, self.current_values['highlight_color'])
        self.on_value_changed()

    def reset_shadow_color(self):
        self.current_values['shadow_color'] = [0.0, 0.0, 0.0] 
        self.set_button_color(self.shadow_color_button, self.current_values['shadow_color'])
        self.on_value_changed()

    def set_button_color(self, button, color):
        r, g, b = [int(c * 255) for c in color]
        button.setStyleSheet(f"background-color: rgb({r},{g},{b})")

    def on_highlight_color_click(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.current_values['highlight_color'] = [c/255.0 for c in color.getRgb()[:3]]
            self.set_button_color(self.highlight_color_button, self.current_values['highlight_color'])
            self.on_value_changed()

    def on_shadow_color_click(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.current_values['shadow_color'] = [c/255.0 for c in color.getRgb()[:3]]
            self.set_button_color(self.shadow_color_button, self.current_values['shadow_color'])
            self.on_value_changed()

    def on_value_changed(self):
        if hasattr(self, 'update_preview'):
            self.update_preview(
                self.current_values['x'],
                self.current_values['y'],
                self.current_values['z'],
                self.current_values['brightness'],
                self.current_values['shadow_range'],
                self.current_values['shadow_strength'],
                self.current_values['highlight_range'],
                self.current_values['highlight_strength'],
                self.current_values['highlight_color'],
                self.current_values['shadow_color']
            )
    def on_slider_changed(self):

        x = self.x_slider.value() / 1000.0
        y = self.y_slider.value() / 1000.0
        z = self.z_slider.value() / 1000.0
        brightness = self.brightness_slider.value() / 100.0
        

        raw_shadow_range = self.shadow_range_slider.value() / 100.0
        shadow_range = 2.0 - raw_shadow_range
        
        shadow_strength = self.shadow_strength_slider.value() / 100.0
        highlight_range = self.highlight_range_slider.value() / 100.0
        highlight_strength = self.highlight_strength_slider.value() / 100.0
        

        self.z_value.setText(f"{z:.3f}")
        self.brightness_value.setText(f"{brightness:.3f}")
        self.shadow_range_value.setText(f"{raw_shadow_range:.3f}")
        self.shadow_strength_value.setText(f"{shadow_strength:.3f}")
        self.highlight_range_value.setText(f"{highlight_range:.3f}")
        self.highlight_strength_value.setText(f"{highlight_strength:.3f}")
        
        # 更新存储的值
        self.current_values.update({
            'x': x,
            'y': y,
            'z': z,
            'brightness': brightness,
            'shadow_range': shadow_range,
            'shadow_strength': shadow_strength,
            'highlight_range': highlight_range,
            'highlight_strength': highlight_strength
        })
        
        self.on_value_changed() 

    def set_preview_image(self, image_tensor):
        if image_tensor is None:
            return
            
        image_np = (image_tensor[0].cpu().numpy() * 255).astype(np.uint8)
        height, width = image_np.shape[:2]
        
        bytes_per_line = 3 * width
        q_img = QImage(image_np.data, width, height, bytes_per_line, QImage.Format_RGB888)
        
        pixmap = QPixmap.fromImage(q_img)
        scaled_pixmap = pixmap.scaled(self.preview_label.size(), 
                                    Qt.KeepAspectRatio, 
                                    Qt.SmoothTransformation)
        
        self.preview_label.setPixmap(scaled_pixmap)

    def on_image_mouse_move(self, x, y):
        width = self.preview_label.width()
        height = self.preview_label.height()
        
        center_x = width / 2
        center_y = height / 2

        norm_x = -((x - center_x) / (width / 2)) 
        norm_y = -(y - center_y) / (height / 2)

        self.x_slider.setValue(int(norm_x * 1000))
        self.y_slider.setValue(int(norm_y * 1000))

        self.on_slider_changed()

class ImageLabel(QLabel):
    def __init__(self):
        super().__init__()
        self.setMouseTracking(False) 
        self.mouseMoveHandler = None
        self.mousePressed = False 
        
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.mousePressed = True
            if self.mouseMoveHandler:
                self.mouseMoveHandler(event.x(), event.y())
    
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.mousePressed = False
            
    def mouseMoveEvent(self, event):
        if self.mousePressed and self.mouseMoveHandler: 
            self.mouseMoveHandler(event.x(), event.y())

class LG_Relight:

    default_values = {
        'x': 0.0,
        'y': 0.0,
        'z': 1.0,
        'brightness': 1.0,
        'shadow_range': 1.0,
        'shadow_strength': 1.0,
        'highlight_range': 1.0,
        'highlight_strength': 1.0,
        'highlight_color': [1.0, 1.0, 1.0], 
        'shadow_color': [0.0, 0.0, 0.0]     
    }
    def __init__(self):
        self.last_values = self.default_values.copy()
    @classmethod
    def INPUT_TYPES(cls):

        return {
            "required": {
                "image": ("IMAGE",),
                "normals": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    OUTPUT_NODE = True
    FUNCTION = "relight_with_preview"
    CATEGORY = "🎈LAOGOU"

    def relight_calculation(self, image, normals, x, y, z, brightness, 
                        shadow_range, shadow_strength, 
                        highlight_range, highlight_strength,
                        highlight_color, shadow_color):
        if image.shape[0] != normals.shape[0]:
            raise Exception("Batch size for image and normals must match")

        norm = normals.detach().clone() * 2 - 1
        norm = F.interpolate(norm.movedim(-1,1), 
                        size=(image.shape[1], image.shape[2]), 
                        mode='bilinear').movedim(1,-1)

        light = torch.tensor([x, y, z], device=image.device)
        light = F.normalize(light, dim=0)

        diffuse = norm[:,:,:,0] * light[0] + norm[:,:,:,1] * light[1] + norm[:,:,:,2] * light[2]

        diffuse = (diffuse + 1.0) * 0.5
        
        shadow_offset = shadow_strength - 1.0
        highlight_offset = highlight_strength - 1.0

        shadow_threshold = 1.0 - shadow_range
        highlight_threshold = 1.0 - highlight_range
        
        shadow_mask = torch.clamp((diffuse - shadow_threshold) / max(shadow_range, 1e-6), 0, 1)
        highlight_mask = torch.clamp((diffuse - highlight_threshold) / max(highlight_range, 1e-6), 0, 1)

        light_intensity = torch.ones_like(diffuse)

        if shadow_strength != 1.0:
            light_intensity = light_intensity * (
                shadow_mask + 
                (1.0 - shadow_mask) * (2.0 - shadow_strength)
            )

        if highlight_strength != 1.0:
            light_intensity = light_intensity + highlight_mask * highlight_offset

        color_effect = torch.ones_like(image[:,:,:,:3])
        if highlight_color != [1.0, 1.0, 1.0] or shadow_color != [0.0, 0.0, 0.0]:
            highlight_color = torch.tensor(highlight_color, device=image.device)
            shadow_color = torch.tensor(shadow_color, device=image.device)
            color_effect = (
                shadow_mask.unsqueeze(-1) * highlight_color +
                (1.0 - shadow_mask).unsqueeze(-1) * shadow_color
            )

        brightness_factor = brightness if brightness != 1.0 else 1.0

        relit = image.detach().clone()
        light_intensity = light_intensity.unsqueeze(-1).repeat(1,1,1,3)
        
        relit[:,:,:,:3] = torch.clip(
            relit[:,:,:,:3] * light_intensity * brightness_factor * color_effect,
            0, 1
        )
        
        return (relit,)

    def relight_with_preview(self, image, normals):
        from PyQt5.QtWidgets import QApplication
        app = QApplication.instance()
        if app is None:
            app = QApplication([])

        if not hasattr(self, 'last_values'):
            self.last_values = self.default_values.copy()
            
        dialog = LightPreviewDialog(initial_values=self.last_values)
        
        def update_preview(x, y, z, brightness, shadow_range, shadow_strength, 
                             highlight_range, highlight_strength,
                             highlight_color, shadow_color):
            result = self.relight_calculation(
                image, normals, x, y, z, brightness,
                shadow_range, shadow_strength,
                highlight_range, highlight_strength,
                highlight_color, shadow_color
            )
            dialog.set_preview_image(result[0])

            self.last_values = dialog.current_values.copy()
            return result
        
        dialog.update_preview = update_preview

        initial_result = update_preview(
            self.last_values['x'], self.last_values['y'], self.last_values['z'],
            self.last_values['brightness'],
            self.last_values['shadow_range'],
            self.last_values['shadow_strength'],
            self.last_values['highlight_range'],
            self.last_values['highlight_strength'],
            self.last_values['highlight_color'],
            self.last_values['shadow_color']
        )
        
        if dialog.exec_():

            self.last_values = dialog.current_values.copy()
            return self.relight_calculation(
                image, normals,
                self.last_values['x'],
                self.last_values['y'],
                self.last_values['z'],
                self.last_values['brightness'],
                self.last_values['shadow_range'],
                self.last_values['shadow_strength'],
                self.last_values['highlight_range'],
                self.last_values['highlight_strength'],
                self.last_values['highlight_color'],
                self.last_values['shadow_color']
            )
        
        return initial_result



WEB_DIRECTORY = "web"

NODE_CLASS_MAPPINGS = {
    "LG_Relight": LG_Relight,
    "LG_Relight_V2": LG_Relight_V2,
    "LG_Relight_Basic": LG_Relight_Basic
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LG_Relight": "LG Relight",
    "LG_Relight_V2": "LG Relight V2",
    "LG_Relight_Basic": "LG Relight Basic"
}
