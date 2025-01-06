import torch
import numpy as np
from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, 
                           QSlider, QLabel, QPushButton, QColorDialog)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QImage, QPixmap
import torch.nn.functional as F

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
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LG_Relight": "LG_Relight"
}