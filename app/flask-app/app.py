from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from PIL import Image
from io import BytesIO
from ultralytics import YOLO
import cv2
import numpy as np
import torch
import seaborn as sns
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# CORS Configuration
cors_origins = os.getenv('CORS_ORIGINS', '*')
if cors_origins == '*':
    CORS(app)
    print("⚠️ CORS: Allowing all origins (development mode)")
else:
    origins_list = [origin.strip() for origin in cors_origins.split(',')]
    CORS(app, resources={r"/*": {"origins": origins_list}})
    print(f"✅ CORS: Restricted to {origins_list}")

# Model Configuration
MODEL_PATH = os.getenv('MODEL_PATH', './models/best_100l.pt')
DEVICE_CONFIG = os.getenv('MODEL_DEVICE', 'auto')
IMAGE_SIZE = int(os.getenv('IMAGE_SIZE', '800'))
DEFAULT_CONF = float(os.getenv('CONFIDENCE_THRESHOLD', '0.25'))
DEFAULT_IOU = float(os.getenv('IOU_THRESHOLD', '0.6'))
MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE_PX', '1920'))
ENABLE_CACHE = os.getenv('ENABLE_CACHE', 'True').lower() == 'true'
CACHE_SIZE = int(os.getenv('CACHE_SIZE', '50'))

# Detect GPU availability
if DEVICE_CONFIG == 'auto':
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
else:
    DEVICE = DEVICE_CONFIG

print(f"🚀 Using device: {DEVICE}")

# Load YOLOv8 model
if not os.path.exists(MODEL_PATH):
    print(f"❌ ERROR: Model file not found at {MODEL_PATH}")
    print("Please download the model or update MODEL_PATH in .env")
    exit(1)

model = YOLO(MODEL_PATH)
if DEVICE == 'cuda':
    model.to(DEVICE)
    print("✅ Model loaded on GPU")
else:
    print("⚠️ Model loaded on CPU (GPU not available)")

# Image cache for faster repeated requests
image_cache = {}
print(f"💾 Cache: {'Enabled' if ENABLE_CACHE else 'Disabled'} (max {CACHE_SIZE} items)")

# function to see if a box1 is inside box2
def is_inside(box1, box2):
    x1, y1, x2, y2 = box1
    x1_, y1_, x2_, y2_ = box2
    return x1 >= x1_ and y1 >= y1_ and x2 <= x2_ and y2 <= y2_

def draw_label_with_background(image, text, position, color=(255, 255, 255), bg_color=(0, 0, 0)):
    """Draw text with background rectangle for better readability"""
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.6
    font_thickness = 2

    # Get text size
    (text_width, text_height), baseline = cv2.getTextSize(
        text, font, font_scale, font_thickness
    )

    x, y = position
    padding = 5

    # Draw background rectangle with some transparency
    overlay = image.copy()
    cv2.rectangle(
        overlay,
        (x - padding, y - text_height - padding),
        (x + text_width + padding, y + baseline + padding),
        bg_color,
        -1  # Filled rectangle
    )

    # Blend the overlay with original image for transparency
    alpha = 0.7  # Transparency factor
    cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0, image)

    # Draw white text on dark background
    cv2.putText(
        image, text, (x, y),
        font, font_scale, color, font_thickness, cv2.LINE_AA
    )

    return image

def get_optimal_label_position(box, label_index, total_labels, image_shape):
    """Calculate optimal position for label to avoid overlap and going off-screen"""
    x1, y1, x2, y2 = box
    img_height, img_width = image_shape[:2]

    label_height = 30
    box_width = x2 - x1
    box_height = y2 - y1

    # Try positions in order of preference:
    positions = [
        # 1. Above the box (top-left)
        (int(x1 + 5), int(y1 - 10 - (label_index * label_height))),
        # 2. Inside top of box
        (int(x1 + 5), int(y1 + 25 + (label_index * label_height))),
        # 3. Right side of box
        (int(x2 + 5), int(y1 + 25 + (label_index * label_height))),
        # 4. Left side of box
        (int(max(5, x1 - 180)), int(y1 + 25 + (label_index * label_height))),
    ]

    # Select first position that doesn't go off-screen
    for pos in positions:
        x, y = pos
        if 10 < x < img_width - 200 and 20 < y < img_height - 10:
            return pos

    # Fallback to inside box
    return (int(x1 + 5), int(y1 + 25 + (label_index * label_height)))

def optimize_image(image):
    """Resize image if too large while maintaining aspect ratio"""
    width, height = image.size

    if width > MAX_IMAGE_SIZE or height > MAX_IMAGE_SIZE:
        if width > height:
            new_width = MAX_IMAGE_SIZE
            new_height = int(height * (MAX_IMAGE_SIZE / width))
        else:
            new_height = MAX_IMAGE_SIZE
            new_width = int(width * (MAX_IMAGE_SIZE / height))

        image = image.resize((new_width, new_height), Image.LANCZOS)
        print(f"📐 Resized image from {width}x{height} to {new_width}x{new_height}")

    return image

def get_cache_key(image_data, attributes, confidence):
    """Generate unique cache key for request"""
    import hashlib
    key_string = f"{image_data[:100]}{str(sorted(attributes.items()))}{confidence}"
    return hashlib.md5(key_string.encode()).hexdigest()



@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/process', methods=['POST'])
def process_image():
    data = request.get_json()
    image_data = data.get('image')
    attributes = data.get('attributes')

    #print(attributes)
    names = ['Backpack', 'Bag', 'Boots', 'Cap', 'Coat_Black', 'Coat_Blue', 'Coat_Brown', 'Coat_Green', 'Coat_Red', 'Coat_White', 'Coat_Yellow', 'Female_Pedestrian', 'Glasses', 'Male_Pedestrian', 'Shirt_Black', 'Shirt_Blue', 'Shirt_Brown', 'Shirt_Green', 'Shirt_Red', 'Shirt_White', 'Shirt_Yellow', 'Shorts_Black', 'Shorts_Blue', 'Shorts_Brown', 'Shorts_Green', 'Shorts_Red', 'Shorts_White', 'Shorts_Yellow', 'Skirt_Black', 'Skirt_Blue', 'Skirt_Brown', 'Skirt_Green', 'Skirt_Red', 'Skirt_White', 'Skirt_Yellow', 'T-shirt_Black', 'T-shirt_Blue', 'T-shirt_Brown', 'T-shirt_Green', 'T-shirt_Red', 'T-shirt_White', 'T-shirt_Yellow', 'Trousers_Black', 'Trousers_Blue', 'Trousers_Brown', 'Trousers_Green', 'Trousers_Red', 'Trousers_White', 'Trousers_Yellow', 'Umbrella', 'shoes']
    required_classes = []
    for key, value in attributes.items():
        if key == "Gender":
            required_classes.append(value + "_Pedestrian")
        elif key == "Upper Body Clothing":
            required_classes.append(value + "_" + attributes['Upper Body Clothing Color'])
        elif key == "Lower Body Clothing":
            required_classes.append(value + "_" + attributes['Lower Body Clothing Color'])
        elif key == "Footwear":
            required_classes.append(value)
        elif key == "Handbag" and value == 'yes':
            required_classes.append("Bag")
        elif key == "Cap/Helmet" and value == 'yes':
            required_classes.append("Cap")
        elif key == "Glasses" or key == "Umbrella" or key == "Backpack":
            if value == 'yes': 
                required_classes.append(key)
        
    # convert the class names to their attribute ids for the model
    required_classes = [names.index(c) for c in required_classes]

    # Convert base64 image to a PIL image
    image_data = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data))

    # Perform object detection on the image using YOLOv8 model
    results = model(image, imgsz=800, conf=0.5, iou = 0.6, device='cpu', classes=required_classes)
    #results = model(image, imgsz=800, conf=0.5, iou = 0.6, device='cpu')

    img_str = None

    for i, r in enumerate(results):
        # get the image with bounding boxes drawn on it and encode it to base64 format and return it
        im_bgr = r.plot()  # BGR-order numpy array
        im_rgb = Image.fromarray(im_bgr[..., ::-1])  # RGB-order PIL image
        buffered = BytesIO()
        im_rgb.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        r.show()

    return jsonify({'prediction': img_str})


@app.route('/process1', methods=['POST'])
def process_image1():
    start_time = time.time()

    data = request.get_json()
    image_data = data.get('image')
    attributes = data.get('attributes')

    # Get user-adjustable parameters (with defaults)
    confidence_threshold = float(data.get('confidence', 0.25))
    iou_threshold = float(data.get('iou', 0.6))

    # Check cache for this request (if caching is enabled)
    if ENABLE_CACHE:
        cache_key = get_cache_key(image_data, attributes, confidence_threshold)
        if cache_key in image_cache:
            print("✨ Cache hit! Returning cached result")
            cached_result = image_cache[cache_key].copy()
            cached_result['statistics']['from_cache'] = True
            return jsonify(cached_result)
    else:
        cache_key = None

    #print(attributes)
    names = ['Backpack', 'Bag', 'Boots', 'Cap', 'Coat_Black', 'Coat_Blue', 'Coat_Brown', 'Coat_Green', 'Coat_Red', 'Coat_White', 'Coat_Yellow', 'Female_Pedestrian', 'Glasses', 'Male_Pedestrian', 'Shirt_Black', 'Shirt_Blue', 'Shirt_Brown', 'Shirt_Green', 'Shirt_Red', 'Shirt_White', 'Shirt_Yellow', 'Shorts_Black', 'Shorts_Blue', 'Shorts_Brown', 'Shorts_Green', 'Shorts_Red', 'Shorts_White', 'Shorts_Yellow', 'Skirt_Black', 'Skirt_Blue', 'Skirt_Brown', 'Skirt_Green', 'Skirt_Red', 'Skirt_White', 'Skirt_Yellow', 'T-shirt_Black', 'T-shirt_Blue', 'T-shirt_Brown', 'T-shirt_Green', 'T-shirt_Red', 'T-shirt_White', 'T-shirt_Yellow', 'Trousers_Black', 'Trousers_Blue', 'Trousers_Brown', 'Trousers_Green', 'Trousers_Red', 'Trousers_White', 'Trousers_Yellow', 'Umbrella', 'shoes']
    required_classes = []
    male_pedestrian = False
    for key, value in attributes.items():
        if key == "Gender":
            required_classes.append(value + "_Pedestrian")
            male_pedestrian = value == "Male"
        elif key == "Upper Body Clothing":
            required_classes.append(value + "_" + attributes['Upper Body Clothing Color'])
        elif key == "Lower Body Clothing":
            required_classes.append(value + "_" + attributes['Lower Body Clothing Color'])
        elif key == "Footwear":
            required_classes.append(value)
        elif key == "Handbag" and value == 'yes':
            required_classes.append("Bag")
        elif key == "Cap/Helmet" and value == 'yes':
            required_classes.append("Cap")
        elif key == "Glasses" or key == "Umbrella" or key == "Backpack":
            if value == 'yes': 
                required_classes.append(key)
        
    # convert the class names to their attribute ids for the model
    required_classes = [names.index(c) for c in required_classes]

    #print([names[c] for c in required_classes])

    # Generate a color palette with 51 distinct colors
    palette = sns.color_palette("hsv", 51)

    # Convert the colors to RGB format
    rgb_colors = [(int(color[0]*255), int(color[1]*255), int(color[2]*255)) for color in palette]

    # Convert base64 image to a PIL image
    image_data_decoded = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data_decoded))

    # Optimize image size for faster processing
    image = optimize_image(image)

    # Convert PIL Image to OpenCV format
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    # Perform object detection on the image using YOLOv8 model with user-provided parameters and auto-detected device
    #results = model(image, imgsz=IMAGE_SIZE, conf=confidence_threshold, iou=iou_threshold, device=DEVICE, classes=required_classes)
    results = model(image, imgsz=IMAGE_SIZE, conf=confidence_threshold, iou=iou_threshold, device=DEVICE)

    box_to_attributes = dict()
    for result in results:
        boxes = result.boxes  # Boxes object for bounding box outputs
        attributes = result.names  # Attributes object for attribute outputs
        confidences = result.probs  # Confidence scores for each attribute

        # print("boxes: ", boxes)
        # print("attributes: ", attributes)
        # print("confidences: ", confidences)
        classes = boxes.cls
        conf = boxes.conf
        bounding_boxes = boxes.xyxy
        req_id = names.index("Male_Pedestrian") if male_pedestrian  else names.index("Female_Pedestrian")
        print("classes: ", classes)
        print("conf: ", conf)
        print("bounding_boxes: ", bounding_boxes)

        required_boxes = []

        # get the bounding boxes of the required class Male_Pedestrian and Female_Pedestrian
        for i, c in enumerate(classes):
            if c == req_id:
                bb = tuple(bounding_boxes[i].tolist())
                required_boxes.append(bb)
                #box_to_attributes[bb] = set()
                box_to_attributes[bb] = list()
                #box_to_attributes[bb].append((names[int(classes[i])], conf[i]))
                #box_to_attributes[bb].add((int(c), conf[i]))

        # get the bounding boxes of required features inside the bounding box of Pedestrian Class        
        for i, box in enumerate(bounding_boxes):
            box = tuple(box.tolist())
            for req_box in required_boxes:
                if is_inside(box, req_box):
                    #box_to_attributes[req_box].append((names[int(classes[i])], conf[i]))
                    box_to_attributes[req_box].append((int(classes[i]), conf[i]))
                    #print(req_box, box, names[int(classes[i])], confidences[i])
                    #box_to_attributes[req_box].add((int(classes[i]), conf[i]))
                    break
        
        # print("box_to_attributes: ")
        # for k, v in box_to_attributes.items():
        #     print("box: ", k)
        #     print("attributes: ", v)
        # draw the bounding box in box_to_attributes and put class and confidence text with smart positioning
        for box, attributes in box_to_attributes.items():
            x1, y1, x2, y2 = box
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

            curr_classes = []
            for i, (attr, conf) in enumerate(attributes):
                if attr != req_id:
                    curr_classes.append(attr)
            check = all(c in required_classes for c in curr_classes)

            if check:
                # Draw main pedestrian bounding box with thicker line (green for match)
                cv2.rectangle(image_cv, (x1, y1), (x2, y2), (0, 255, 0), 4)

                # Draw semi-transparent overlay on matching pedestrian
                overlay = image_cv.copy()
                cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 0), -1)
                cv2.addWeighted(overlay, 0.08, image_cv, 0.92, 0, image_cv)

                # Draw labels with smart positioning and backgrounds
                for i, (attr, conf) in enumerate(attributes):
                    label_text = f"{names[attr]}: {conf:.2f}"
                    position = get_optimal_label_position(
                        (x1, y1, x2, y2), i, len(attributes), image_cv.shape
                    )

                    # Choose background color based on attribute type
                    if attr == req_id:
                        bg_color = (34, 139, 34)  # Green for gender
                    else:
                        bg_color = (0, 0, 0)  # Black for other attributes

                    draw_label_with_background(
                        image_cv, label_text, position, (255, 255, 255), bg_color
                    )
            else:
                # Draw non-matching pedestrians with thinner red line
                cv2.rectangle(image_cv, (x1, y1), (x2, y2), (0, 0, 255), 2)

    # Convert the image back to PIL format
    image_with_boxes = Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

    # show the image with bounding boxes
    image_with_boxes.show()

    # Convert the image with bounding boxes to base64
    buffered = BytesIO()
    image_with_boxes.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

    # Calculate processing time
    processing_time = round(time.time() - start_time, 2)

    # Calculate statistics
    matching_pedestrians = sum(1 for box, attrs in box_to_attributes.items()
                               if all(c in required_classes for c, _ in attrs if c != req_id))

    # Calculate average confidence for matching pedestrians
    all_confidences = []
    for box, attrs in box_to_attributes.items():
        curr_classes = [attr for attr, conf in attrs if attr != req_id]
        if all(c in required_classes for c in curr_classes):
            all_confidences.extend([float(conf) for _, conf in attrs])

    avg_confidence = round(np.mean(all_confidences) * 100, 1) if all_confidences else 0

    # Prepare statistics
    statistics = {
        'total_pedestrians': len(box_to_attributes),
        'matching_pedestrians': matching_pedestrians,
        'avg_confidence': avg_confidence,
        'processing_time': processing_time,
        'image_dimensions': {
            'width': image_cv.shape[1],
            'height': image_cv.shape[0]
        },
        'parameters': {
            'confidence_threshold': confidence_threshold,
            'iou_threshold': iou_threshold
        },
        'device': DEVICE,
        'from_cache': False
    }

    response_data = {
        'prediction': img_str,
        'statistics': statistics
    }

    # Store in cache (if caching is enabled)
    if ENABLE_CACHE and cache_key:
        if len(image_cache) >= CACHE_SIZE:
            # Remove oldest entry (LRU eviction)
            image_cache.pop(next(iter(image_cache)))
        image_cache[cache_key] = response_data.copy()
        print(f"💾 Cached result (cache size: {len(image_cache)}/{CACHE_SIZE})")

    return jsonify(response_data)


@app.route('/process2', methods=['POST'])
def process_image2():
    data = request.get_json()
    image_data = data.get('image')
    attributes = data.get('attributes')

    #print(attributes)
    names = ['Backpack', 'Bag', 'Boots', 'Cap', 'Coat_Black', 'Coat_Blue', 'Coat_Brown', 'Coat_Green', 'Coat_Red', 'Coat_White', 'Coat_Yellow', 'Female_Pedestrian', 'Glasses', 'Male_Pedestrian', 'Shirt_Black', 'Shirt_Blue', 'Shirt_Brown', 'Shirt_Green', 'Shirt_Red', 'Shirt_White', 'Shirt_Yellow', 'Shorts_Black', 'Shorts_Blue', 'Shorts_Brown', 'Shorts_Green', 'Shorts_Red', 'Shorts_White', 'Shorts_Yellow', 'Skirt_Black', 'Skirt_Blue', 'Skirt_Brown', 'Skirt_Green', 'Skirt_Red', 'Skirt_White', 'Skirt_Yellow', 'T-shirt_Black', 'T-shirt_Blue', 'T-shirt_Brown', 'T-shirt_Green', 'T-shirt_Red', 'T-shirt_White', 'T-shirt_Yellow', 'Trousers_Black', 'Trousers_Blue', 'Trousers_Brown', 'Trousers_Green', 'Trousers_Red', 'Trousers_White', 'Trousers_Yellow', 'Umbrella', 'shoes']
    image_data = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data))

    # Convert PIL Image to OpenCV format
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    # Perform object detection on the image using YOLOv8 model
    results = model(image, imgsz=800, conf=0.25, iou = 0.6, device='cpu')

    required_classes = []
    for key, value in attributes.items():
        if key == "Gender":
            required_classes.append(value + "_Pedestrian")
        elif key == "Upper Body Clothing":
            required_classes.append(value + "_" + attributes['Upper Body Clothing Color'])
        elif key == "Lower Body Clothing":
            required_classes.append(value + "_" + attributes['Lower Body Clothing Color'])
        elif key == "Footwear":
            required_classes.append(value)
        elif key == "Handbag" and value == 'yes':
            required_classes.append("Bag")
        elif key == "Cap/Helmet" and value == 'yes':
            required_classes.append("Cap")
        elif key == "Glasses" or key == "Umbrella" or key == "Backpack":
            if value == 'yes': 
                required_classes.append(key)

    for result in results:
        boxes = result.boxes  # Boxes object for bounding box outputs
        attributes = result.names  # Attributes object for attribute outputs


        for box, attribute in zip(boxes, attributes):
            # print(box, attribute)
            # Check if the detected object's attributes intersect with the user-selected attributes
            if set(attribute).intersection(set(required_classes)):
                # Draw bounding box on the image
                cv2.rectangle(image_cv, (box.x1, box.y1), (box.x2, box.y2), (0, 255, 0), 2)

    # Convert the image back to PIL format
    image_with_boxes = Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

    # Convert the image with bounding boxes to base64
    buffered = BytesIO()
    image_with_boxes.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({'prediction': img_str})

if __name__ == '__main__':
    app.run(debug=True)