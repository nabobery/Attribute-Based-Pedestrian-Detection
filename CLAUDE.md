# CLAUDE.md

Context and conventions for Claude Code when working with the Attribute-Based Pedestrian Detection project.

## Project Context

This is an **academic research project** (2024) for real-time pedestrian attribute detection. The system identifies individuals in images based on 51 physical characteristics using a custom-trained YOLOv8 model.

**Primary Use Cases:**
- Security and surveillance applications
- Crowd analysis and demographic studies
- Lost person search based on clothing descriptions
- Academic research in computer vision

**Project Status:** Research/Demo (not production-ready)

## Quick Start for Claude

### Essential Commands

**Start development environment:**
```bash
# Backend (Terminal 1)
cd app/flask-app && python app.py

# Frontend (Terminal 2)
cd app/react-app && npm run dev
```

**Check system health:**
```bash
# Verify model exists
ls -lh app/flask-app/models/best_100l.pt

# Check backend dependencies
cd app/flask-app && pip list | grep -E "ultralytics|torch|flask"

# Check frontend dependencies
cd app/react-app && npm list --depth=0 | grep -E "react|vite|axios"
```

**Run quality checks:**
```bash
# Frontend linting
cd app/react-app && npm run lint

# Build verification
cd app/react-app && npm run build

# Python syntax check
cd app/flask-app && python -m py_compile app.py
```

## Repository Structure

```
/home/user/Attribute-Based-Pedestrian-Detection/
├── app/
│   ├── flask-app/           # Backend API (Flask + PyTorch)
│   │   ├── app.py          # ⭐ Main application (264 lines, 3 endpoints)
│   │   ├── temp.py         # Testing/demo script
│   │   ├── requirements.txt # 226 Python dependencies
│   │   └── models/         # YOLO weights (gitignored - must download)
│   └── react-app/          # Frontend UI (React + Vite)
│       ├── src/
│       │   ├── MainPage.jsx # ⭐ Main UI component (200 lines)
│       │   ├── App.jsx     # Root component
│       │   └── main.jsx    # Entry point
│       └── package.json    # NPM dependencies
├── notebooks/              # Model training (Jupyter/Kaggle)
│   ├── yolov8n_100_epochs.ipynb
│   ├── yolov8s_100_epochs.ipynb
│   ├── yolov8m_100_epochs.ipynb
│   └── yolov8l_100_epochs.ipynb # Current production model
├── assets/                 # Documentation images
├── README.md              # Main documentation
└── LICENSE                # MIT License

⭐ = Most frequently modified files
```

## Code Standards & Conventions

### Python (Flask Backend)

**Style:**
- `snake_case` for functions and variables
- PEP 8 compliant (mostly)
- Minimal comments (focus on code clarity)

**Import Order:**
```python
# 1. Standard library
import os
import base64
from io import BytesIO

# 2. Third-party packages
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

# 3. Local modules (none in this project)
```

**Pattern: Attribute Mapping**
When modifying attribute detection, follow this pattern:
```python
required_classes = []
for key, value in attributes.items():
    if key == "Gender":
        required_classes.append(value + "_Pedestrian")
    elif key == "Upper Body Clothing":
        upper_clothing = value + "_" + attributes['Upper Body Clothing Color']
        required_classes.append(upper_clothing)
    # ... continue for other attributes
```

**YOLO Inference Pattern:**
```python
# Standard inference call
results = model(image, imgsz=800, conf=0.25, iou=0.6, device='cpu')

# Access results
boxes = results[0].boxes.xyxy.cpu().numpy()  # Bounding boxes
classes = results[0].boxes.cls.cpu().numpy()  # Class IDs
conf = results[0].boxes.conf.cpu().numpy()    # Confidence scores
names = results[0].names                       # ID → Name mapping
```

### JavaScript/React (Frontend)

**Style:**
- `camelCase` for variables and functions
- `PascalCase` for components
- `UPPERCASE` for constants
- Functional components with hooks (no class components)

**State Management Pattern:**
```javascript
// Initialize state from object keys
const initialAttributes = Object.keys(attributes).reduce((obj, key) => {
  obj[key] = attributes[key][0];
  return obj;
}, {});

const [selectedAttributes, setSelectedAttributes] = useState(initialAttributes);
```

**API Call Pattern:**
```javascript
// Always use async/await with try-catch
const handleSubmit = async () => {
  try {
    const response = await axios.post(`${Backend_API}/process1`, {
      image: imagePreviewUrl,
      attributes: selectedAttributes,
    });
    setPredictedImage(response.data.prediction);
  } catch (error) {
    console.error("Error:", error);
    setShowModal(true);
  }
};
```

**Styling:**
- Use Tailwind utility classes directly in JSX
- Avoid custom CSS files (use `index.css` only for Tailwind directives)
- Responsive design: `flex`, `grid`, `md:`, `lg:` breakpoints

## Critical Project Quirks

### 1. Model File Location
**THE MOST COMMON ISSUE FOR NEW DEVELOPERS**

The YOLO model (`best_100l.pt`, ~145MB) is **NOT** in the repository due to `.gitignore`.

**Expected location:** `/home/user/Attribute-Based-Pedestrian-Detection/app/flask-app/models/best_100l.pt`

**If missing, you'll see:**
```
FileNotFoundError: [Errno 2] No such file or directory: './models/best_100l.pt'
```

**Solutions:**
1. Train the model using `notebooks/yolov8l_100_epochs.ipynb` in Kaggle
2. Download pre-trained model from project maintainer
3. Use a different YOLO variant (update `app.py:12`)

### 2. Three Similar Endpoints

The Flask app has **duplicate code** across three endpoints:
- `/process` - Basic filtering (deprecated, but not removed)
- `/process1` - **Currently active** (nested attribute detection)
- `/process2` - Experimental (intersection-based)

**IMPORTANT:** React calls `/process1` by default (see `MainPage.jsx:6`).

When modifying detection logic:
1. Always update `/process1` first
2. Test thoroughly before considering `/process2` or `/process`
3. Consider refactoring to share common code (see Known Issues)

### 3. Hardcoded Configuration

**Backend (`app.py`):**
```python
model = YOLO('./models/best_100l.pt')  # Line 12 - Hardcoded path
results = model(image, imgsz=800, conf=0.25, iou=0.6, device='cpu')
```

**Frontend (`MainPage.jsx`):**
```javascript
const Backend_API = "http://localhost:5000";  // Line 6
```

**To modify:**
- For development: Edit directly
- For production: Create `.env` files and use environment variables

### 4. CORS Configuration

CORS is wide open for development:
```python
CORS(app)  # Allows all origins
```

**This is acceptable for local development but DANGEROUS for production.**

Before deploying:
```python
CORS(app, resources={r"/*": {"origins": "https://yourdomain.com"}})
```

### 5. Color Palette Dependency

Seaborn is imported **only** for color generation:
```python
import seaborn as sns
colors = (sns.color_palette("husl", len(model.names)) * 255).astype(np.uint8).tolist()
```

**Do NOT remove Seaborn** even though it seems unrelated to Flask. It generates 51 distinct colors for bounding boxes.

### 6. Base64 Image Encoding

All images are transferred as base64 strings in JSON payloads.

**Implications:**
- Large images create large payloads (~1-5MB typical)
- May hit Flask's default max content length (16MB)
- Slow for high-resolution images (4K+)

**Alternative for production:** Use multipart/form-data or cloud storage URLs.

## Development Workflows

### Adding a New Attribute

**Example: Adding "Hat" attribute**

1. **Update UI** (`app/react-app/src/MainPage.jsx`):
```javascript
const attributes = {
  // ... existing attributes
  Hat: ["yes", "no"],  // Add this line
};
```

2. **Update Backend Mapping** (`app/flask-app/app.py`, all endpoints):
```python
# In attribute mapping section
elif key == "Hat":
    if value == "yes":
        required_classes.append("Hat")  # Assumes "Hat" class exists in model
```

3. **Retrain Model** with "Hat" class in dataset
4. **Update Class Count** from 51 to 52 in documentation

### Modifying Detection Logic

**Current Algorithm (endpoint `/process1`):**
```
1. Detect all pedestrians (Male/Female_Pedestrian)
2. For each pedestrian bounding box:
   - Find all attribute boxes inside it
   - Create mapping: pedestrian → [attributes]
3. Filter pedestrians with ALL required attributes
4. Draw custom bounding boxes with labels
```

**To modify:**
- Edit `@app.route('/process1', methods=['POST'])` in `app.py:70-165`
- Key function: `is_inside(box1, box2)` at `app.py:20-33`
- Test with various attribute combinations

### Updating Dependencies

**Python:**
```bash
cd app/flask-app
source env/bin/activate

# Update specific package
pip install --upgrade ultralytics

# Update all (risky)
pip list --outdated
pip install --upgrade <package-name>

# Freeze new versions
pip freeze > requirements.txt
```

**NPM:**
```bash
cd app/react-app

# Check outdated
npm outdated

# Update specific package
npm update axios

# Update all minor/patch versions
npm update

# Update to latest (including major versions)
npm install <package>@latest
```

**IMPORTANT:** Test thoroughly after updates, especially PyTorch/Ultralytics.

### Building for Production

**Frontend:**
```bash
cd app/react-app
npm run build

# Output: dist/ folder with optimized static files
# Serve with: npm run preview (port 4173)
```

**Backend:**
```bash
# For production, use gunicorn instead of Flask dev server
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Or use Docker (not yet implemented)
```

## Testing Guidelines

### Manual Testing Checklist

**Before committing changes:**

1. **Backend Health Check:**
   - [ ] Flask starts without errors
   - [ ] Model loads successfully (check console)
   - [ ] `/process1` endpoint responds (use Postman or curl)

2. **Frontend Health Check:**
   - [ ] `npm run build` succeeds
   - [ ] `npm run lint` passes (or fix warnings)
   - [ ] No console errors in browser

3. **Integration Testing:**
   - [ ] Upload image with all attributes set
   - [ ] Upload image with mixed attributes
   - [ ] Upload large image (>5MB)
   - [ ] Upload unsupported format (.gif, .bmp)
   - [ ] Test without selecting image (error modal should appear)

4. **Visual Verification:**
   - [ ] Bounding boxes are correctly placed
   - [ ] Labels are readable (not overlapping)
   - [ ] Colors are distinct for different classes
   - [ ] Confidence scores are displayed

### Testing Tools

**Backend Testing:**
```bash
# Test YOLO model directly
cd app/flask-app
python temp.py  # Manual test script

# Test endpoint with curl
curl -X POST http://localhost:5000/process1 \
  -H "Content-Type: application/json" \
  -d '{"image": "base64string...", "attributes": {...}}'
```

**Frontend Testing:**
```bash
# Component linting
npm run lint

# Build verification
npm run build

# Type checking (if TypeScript added)
npm run type-check
```

## Common Tasks & Solutions

### Task: "Fix detection accuracy"

**Possible approaches:**
1. Adjust confidence threshold (`conf` parameter in `app.py`)
2. Adjust IoU threshold (`iou` parameter in `app.py`)
3. Retrain model with more data
4. Use larger YOLO variant (n → s → m → l)
5. Increase image size (`imgsz` parameter)

### Task: "Speed up processing"

**Optimization options:**
1. Use smaller YOLO variant (l → m → s → n)
2. Reduce image size (`imgsz=800` → `640` or `512`)
3. Enable GPU: `device='cuda'` (requires CUDA setup)
4. Lower confidence threshold to reduce post-processing
5. Use YOLO's `stream=True` for batch processing

### Task: "Add video support"

**Implementation steps:**
1. Add video upload in React (accept `.mp4`, `.avi`)
2. Backend: Process video frame-by-frame with OpenCV
3. Apply YOLO to each frame
4. Stitch frames back into video with `cv2.VideoWriter`
5. Stream output or save to temporary file

**Challenges:**
- Large file sizes (use chunked upload)
- Processing time (consider async processing with Celery)
- Memory usage (process frames in batches)

### Task: "Deploy to production"

**Required changes:**
1. **Security:**
   - Add authentication (Flask-Login, JWT)
   - Restrict CORS to specific domains
   - Validate uploaded images (file type, size, content)
   - Add rate limiting (Flask-Limiter)
   - Enable HTTPS (nginx reverse proxy)

2. **Configuration:**
   - Environment variables for API URLs, model paths
   - Separate dev/staging/prod configs
   - Secure secrets management (not in code)

3. **Infrastructure:**
   - Dockerize both frontend and backend
   - Use production WSGI server (gunicorn)
   - Serve React build with nginx
   - Set up CI/CD (GitHub Actions)
   - Add monitoring (Sentry, DataDog)
   - Use cloud storage for models (S3, GCS)

4. **Performance:**
   - Enable GPU for inference
   - Add caching (Redis)
   - Use CDN for frontend assets
   - Optimize images (compression, lazy loading)

## File Modification Guide

### When modifying `app.py`:

**Lines to avoid changing:**
- `12`: Model path (unless you have a different model)
- `15`: CORS setup (needed for React communication)
- `20-33`: `is_inside()` function (used by nested detection)

**Lines safe to modify:**
- `36-68`: `/process` endpoint (deprecated, can refactor/remove)
- `70-165`: `/process1` endpoint (main logic)
- `167-227`: `/process2` endpoint (experimental)
- Inference parameters: `imgsz`, `conf`, `iou`, `device`

**Common changes:**
```python
# Change model
model = YOLO('./models/best_100m.pt')  # Use medium variant

# Enable GPU
results = model(image, imgsz=800, conf=0.25, iou=0.6, device='cuda')

# Lower confidence threshold
results = model(image, imgsz=800, conf=0.15, iou=0.6, device='cpu')
```

### When modifying `MainPage.jsx`:

**Lines to avoid changing:**
- `6`: Backend API URL (unless backend port changed)
- `8-20`: Attributes object (UI contract with backend)
- `22-26`: State initialization (complex reduce logic)

**Lines safe to modify:**
- `93-109`: Image upload handler (can add validation)
- `111-121`: Dropdown change handler (can add validation)
- `147-159`: Submit button styles (can customize UI)
- `186-end`: Layout and styling (Tailwind classes)

**Common changes:**
```javascript
// Add image validation
const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file.size > 10 * 1024 * 1024) {  // 10MB limit
    alert("Image too large");
    return;
  }
  // ... rest of handler
};

// Change API endpoint
const Backend_API = "http://localhost:8000";  // Different port
```

## Git Workflow

### Branch Naming
- `claude/<description>-<session-id>` - AI-assisted changes
- `feat/<description>` - New features
- `fix/<description>` - Bug fixes
- `docs/<description>` - Documentation

### Commit Message Format
```
<type>: <description>

Types: feat, fix, docs, refactor, test, chore

Examples:
feat: Add video processing endpoint
fix: Resolve bounding box overlap on mobile devices
docs: Update setup instructions for CUDA
refactor: Consolidate duplicate attribute mapping code
test: Add unit tests for is_inside function
chore: Update dependencies to latest versions
```

### Before Pushing

**Checklist:**
- [ ] Code passes linting
- [ ] Manual testing completed
- [ ] No sensitive data (API keys, passwords)
- [ ] No large files (model weights, videos)
- [ ] Commit messages are descriptive
- [ ] No debug/console.log statements (or marked with TODO)

## Performance Benchmarks

**YOLO Inference Times (CPU):**
- yolov8n: ~200ms per image (800px)
- yolov8s: ~400ms per image (800px)
- yolov8m: ~800ms per image (800px)
- yolov8l: ~1.5s per image (800px) ⬅️ **Current**

**With GPU (CUDA):**
- All variants: 50-100ms per image

**Frontend Build Times:**
- Development: ~1-2s (Vite HMR)
- Production build: ~15-20s

## Security & Privacy Notes

### Current State
- **No authentication** - Anyone can access the API
- **No encryption** - HTTP only (no HTTPS)
- **No rate limiting** - Vulnerable to DoS
- **No input validation** - Can process any uploaded file
- **No logging** - No audit trail

### Privacy Considerations
This system processes images of people, which may contain:
- Personally identifiable information (PII)
- Sensitive biometric data
- Children's images

**Before production deployment:**
1. Add GDPR/CCPA compliance (consent, data retention)
2. Implement data anonymization
3. Add audit logging
4. Provide data deletion mechanisms
5. Review legal requirements in target jurisdiction

## Known Issues & Limitations

### Code Quality
1. **Code duplication** - Three similar endpoints should be refactored
2. **Magic numbers** - Hardcoded thresholds (0.25, 0.5, 0.6, 800)
3. **No error handling** - Crashes on invalid inputs
4. **Debug code** - console.log statements in production code
5. **No tests** - No unit or integration tests

### Functionality
1. **Single image only** - No batch processing or video support
2. **CPU-bound** - No GPU support configured (though code supports it)
3. **Limited attributes** - Fixed to 51 classes, can't add dynamically
4. **English only** - No internationalization (i18n)
5. **Desktop-focused** - Mobile UI needs improvement

### Deployment
1. **No Docker** - Manual setup required
2. **No CI/CD** - Manual testing and deployment
3. **No monitoring** - No error tracking or analytics
4. **Development server** - Flask dev server not for production
5. **Model management** - No versioning or rollback strategy

## External Resources

**Official Documentation:**
- YOLOv8: https://docs.ultralytics.com/
- Flask: https://flask.palletsprojects.com/
- React: https://react.dev/
- Vite: https://vitejs.dev/
- TailwindCSS: https://tailwindcss.com/

**Project Documentation:**
- Main README: `/home/user/Attribute-Based-Pedestrian-Detection/README.md`
- App Setup: `/home/user/Attribute-Based-Pedestrian-Detection/app/README.md`
- Training Guide: `/home/user/Attribute-Based-Pedestrian-Detection/notebooks/README.md`

**Related Research:**
- YOLO Series: Redmon et al., "You Only Look Once: Unified, Real-Time Object Detection"
- Attribute Recognition: Li et al., "Pedestrian Attribute Recognition: A Survey"

## Tips for Claude Code

### Exploration Strategy
1. **Start with README files** - Three levels of documentation
2. **Check model availability** - First thing to verify
3. **Understand data flow** - User → React → Flask → YOLO → Flask → React → User
4. **Identify active code** - `/process1` is current, others are legacy

### Common Gotchas
- Don't assume model file exists (it's gitignored)
- Don't remove Seaborn (needed for colors)
- Don't change `/process1` endpoint name (React calls it)
- Don't commit large model files (use .gitignore)
- Don't use Flask dev server in production

### When Stuck
1. Check if model file exists: `ls app/flask-app/models/`
2. Verify dependencies: `pip list` and `npm list`
3. Check server logs in terminal
4. Check browser console for frontend errors
5. Test backend independently with `temp.py` or curl

### Optimization Priorities
1. **First**: Make it work (correctness)
2. **Second**: Make it fast (performance)
3. **Third**: Make it clean (refactoring)
4. **Fourth**: Make it secure (production-ready)

---

**Last Updated:** 2025-11-18
**Project Version:** Research/Demo (v1.0)
**Author:** Avinash Changrani
**License:** MIT

For questions or issues, open a GitHub issue or contact the maintainer.
