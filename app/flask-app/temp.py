from ultralytics import YOLO
from PIL import Image

# Load YOLOv8 model
model = YOLO('./models/best.pt')


results = model(r'D:\Downloads\WhatsApp Image 2024-05-14 at 00.32.11.jpeg', imgsz=800, conf=0.5, iou = 0.6, device='cpu')

for i, r in enumerate(results):
        # get the image with bounding boxes drawn on it and encode it to base64 format and return it
        im_bgr = r.plot()  # BGR-order numpy array
        im_rgb = Image.fromarray(im_bgr[..., ::-1])  # RGB-order PIL image
        r.show()