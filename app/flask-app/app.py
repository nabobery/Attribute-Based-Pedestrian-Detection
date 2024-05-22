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


app = Flask(__name__)

CORS(app) 

# Load YOLOv8 model
model = YOLO('./models/best_100l.pt')

# function to see if a box1 is inside box2
def is_inside(box1, box2):
    x1, y1, x2, y2 = box1
    x1_, y1_, x2_, y2_ = box2
    return x1 >= x1_ and y1 >= y1_ and x2 <= x2_ and y2 <= y2_



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
    data = request.get_json()
    image_data = data.get('image')
    attributes = data.get('attributes')

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
    image_data = base64.b64decode(image_data.split(',')[1])
    image = Image.open(BytesIO(image_data))

    # Convert PIL Image to OpenCV format
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    # Perform object detection on the image using YOLOv8 model
    #results = model(image, imgsz=800, conf=0.25, iou = 0.6, device='cpu', classes=required_classes)
    results = model(image, imgsz=800, conf=0.25, iou = 0.6, device='cpu')

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
        # draw the bounding box in box_to_attributes and put class and confidence text at the top right of the bounding box
        for box, attributes in box_to_attributes.items():
            x1, y1, x2, y2 = box
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            cv2.rectangle(image_cv, (x1, y1), (x2, y2), rgb_colors[req_id], 2)
            curr_classes = []
            for i, (attr, conf) in enumerate(attributes):
                if attr != req_id:
                    curr_classes.append(attr)
            check = all(c in required_classes for c in curr_classes)
            if check:
                for i, (attr, conf) in enumerate(attributes):
                    # print(attr, conf)
                    # print(f"{names[attr]} {conf:.2f}")
                    cv2.putText(image_cv, f"{names[attr]} {conf:.2f}", (x2-20, y1 + i * 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, rgb_colors[attr], 2)

    # Convert the image back to PIL format
    image_with_boxes = Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

    # show the image with bounding boxes
    image_with_boxes.show()

    # Convert the image with bounding boxes to base64
    buffered = BytesIO()
    image_with_boxes.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

    return jsonify({'prediction': img_str})


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