# AGENTS.md

Documentation for AI coding agents working with the Attribute-Based Pedestrian Detection project.

## Project Overview

This is a real-time pedestrian attribute detection system using YOLOv8. The application detects and highlights individuals in images based on 51 different physical characteristics including gender, clothing type/color, accessories, and footwear.

**Tech Stack:**
- Backend: Flask + PyTorch + Ultralytics YOLOv8
- Frontend: React + Vite + TailwindCSS
- Training: Jupyter Notebooks (Kaggle)

## Dev Environment Setup

### Backend (Flask)

```bash
# Navigate to Flask app
cd app/flask-app

# Create and activate virtual environment
python -m venv env
source env/bin/activate  # Unix/MacOS
# OR
.\env\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# IMPORTANT: Place the trained YOLO model at:
# app/flask-app/models/best_100l.pt
# This file is gitignored - obtain from Kaggle training runs or project maintainer

# Run Flask server (http://localhost:5000)
python app.py
```

**Key Backend Files:**
- `app/flask-app/app.py` - Main Flask application with 3 detection endpoints
- `app/flask-app/models/` - YOLO model weights (gitignored, must be downloaded)
- `app/flask-app/requirements.txt` - 226 Python dependencies

### Frontend (React + Vite)

```bash
# Navigate to React app
cd app/react-app

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Key Frontend Files:**
- `app/react-app/src/MainPage.jsx` - Main UI component (200 lines)
- `app/react-app/src/App.jsx` - Root component
- `app/react-app/package.json` - NPM dependencies and scripts

### Model Training (Kaggle/Jupyter)

```bash
# Training notebooks are located in notebooks/
# Each notebook trains a different YOLOv8 variant:
# - yolov8n_100_epochs.ipynb (Nano - fastest)
# - yolov8s_100_epochs.ipynb (Small)
# - yolov8m_100_epochs.ipynb (Medium)
# - yolov8l_100_epochs.ipynb (Large - most accurate, currently used)

# Training command pattern:
yolo task=detect mode=train model=yolov8l.pt data=data.yaml epochs=100 imgsz=800 plots=True

# Validation:
yolo task=detect mode=val model=runs/detect/train/weights/best.pt data=data.yaml
```

## Testing

### Current State
- **No formal test suite exists** - this is a research/demo project
- Testing is currently manual through the web UI

### Manual Testing Process

1. Start both backend and frontend servers
2. Upload a test image through the React UI
3. Select attribute combinations from dropdowns
4. Click "Submit" and verify bounding boxes on output image
5. Check browser console for errors

### Frontend Linting

```bash
cd app/react-app
npm run lint
```

**ESLint Configuration:** `.eslintrc.cjs` with React-specific rules

### Testing Artifacts

- `app/flask-app/temp.py` - Manual YOLO inference testing script
- Notebooks contain visual validation through training plots
- Console.log statements in MainPage.jsx for debugging (should be removed for production)

### Recommended Testing for PRs

Before submitting PRs, ensure:
1. Flask server starts without errors
2. React app builds without errors: `npm run build`
3. ESLint passes: `npm run lint`
4. Manual testing with at least 2 different attribute combinations
5. No console errors in browser
6. Both frontend and backend dependencies are up to date

## Pull Request Instructions

### PR Title Format
```
<type>: <description>

Examples:
feat: Add support for video input processing
fix: Resolve bounding box overlap issue
docs: Update setup instructions for Windows
refactor: Consolidate duplicate endpoint code
```

### Before Submitting

**Required Checks:**
- [ ] Backend starts successfully: `python app/flask-app/app.py`
- [ ] Frontend builds successfully: `npm run build --prefix app/react-app`
- [ ] Linting passes: `npm run lint --prefix app/react-app`
- [ ] Manual testing completed with sample images
- [ ] No debug console.log statements added (or mark with TODO for removal)
- [ ] Updated README.md if adding new features or changing setup process

**Recommended:**
- [ ] Check for security vulnerabilities: `pip check` and `npm audit`
- [ ] Verify CORS settings if modifying API endpoints
- [ ] Test with different image sizes and formats
- [ ] Update requirements.txt if adding new Python packages: `pip freeze > requirements.txt`

### Branch Naming

Follow the convention:
- `claude/<description>-<session-id>` for AI-generated branches
- `feat/<description>` for new features
- `fix/<description>` for bug fixes
- `docs/<description>` for documentation updates

## Common Commands

### Navigation
```bash
# View project structure
ls -la
tree -L 2  # If tree is installed

# Find Python files
find . -name "*.py" -not -path "*/env/*" -not -path "*/.venv/*"

# Find React components
find app/react-app/src -name "*.jsx"
```

### Dependency Management
```bash
# Update Python dependencies
cd app/flask-app
pip install --upgrade <package-name>
pip freeze > requirements.txt

# Update NPM dependencies
cd app/react-app
npm update
npm outdated  # Check for outdated packages
```

### Development Workflow
```bash
# Start both servers (in separate terminals)
# Terminal 1 - Backend
cd app/flask-app && source env/bin/activate && python app.py

# Terminal 2 - Frontend
cd app/react-app && npm run dev
```

### Model Management
```bash
# Check model file exists
ls -lh app/flask-app/models/best_100l.pt

# If missing, download or train:
# 1. Run notebooks/yolov8l_100_epochs.ipynb in Kaggle
# 2. Download best.pt from runs/detect/train/weights/
# 3. Rename to best_100l.pt and place in app/flask-app/models/
```

## Project Quirks & Important Notes

### Model File Not in Repo
The YOLO model weights (`best_100l.pt`, ~145MB) are gitignored. New developers must:
1. Train the model using notebooks in Kaggle, OR
2. Obtain the trained model from the project maintainer

**File location:** `app/flask-app/models/best_100l.pt`

### Three Detection Endpoints
The Flask app has three similar endpoints with different algorithms:
- `/process` - Basic class filtering (deprecated)
- `/process1` - **Currently used** - Nested attribute detection
- `/process2` - Intersection-based filtering (experimental)

**When modifying detection logic, update the endpoint that React calls (currently `/process1`)**

### Hardcoded Configuration
Several values are hardcoded and may need adjustment:
- **Backend API URL:** `http://localhost:5000` in `MainPage.jsx:6`
- **Model path:** `./models/best_100l.pt` in `app.py:12`
- **Image size:** `800px` in YOLO inference calls
- **Confidence threshold:** `0.25` or `0.5` depending on endpoint
- **IoU threshold:** `0.6`

### CORS Configuration
CORS is enabled for all origins (`*`) in `app.py:15`. For production, restrict to specific domains.

### Base64 Image Encoding
Images are transferred as base64 strings in JSON. Large images may hit payload size limits.

### Seaborn Color Palette
The app uses Seaborn's `husl` palette to generate 51 distinct colors for bounding boxes. Don't remove this dependency even though it seems unrelated to Flask.

## Architecture Patterns

### Data Flow
```
User uploads image → React converts to base64 → POST to Flask
→ Flask decodes image → YOLO inference → Attribute filtering
→ Draw bounding boxes → Encode to base64 → Return to React
→ React displays annotated image
```

### Attribute Mapping
The UI attributes are mapped to model class names:
- `"Male"` → `"Male_Pedestrian"`
- `"T-shirt"` + `"Blue"` → `"T-shirt_Blue"`
- `"yes"` (Backpack) → `"Backpack"`
- `"no"` → Excluded from required classes

### Nested Detection Algorithm (endpoint /process1)
1. Find all Male/Female_Pedestrian bounding boxes
2. For each pedestrian box, find all attribute boxes inside it
3. Filter pedestrians matching ALL required attributes
4. Draw custom visualization with all detected attributes

## Code Conventions

### Python (Backend)
- **Naming:** `snake_case` for functions and variables
- **Imports:** Standard library → Third-party → Local
- **Comments:** Minimal, mostly for debugging
- **Error Handling:** Basic try-catch in notebooks, minimal in app.py

### JavaScript/React (Frontend)
- **Naming:** `camelCase` for variables and functions
- **Components:** Functional components with hooks (useState)
- **Styling:** Inline Tailwind classes (utility-first)
- **API Calls:** async/await with axios
- **Constants:** UPPERCASE (e.g., `Backend_API`)

### File Organization
```
app/
├── flask-app/        # Backend (Python)
├── react-app/        # Frontend (JavaScript)
└── README.md         # Setup instructions

notebooks/            # Training (Jupyter)
assets/               # Documentation assets
README.md             # Project overview
```

## Security Considerations

### Current Limitations
- No authentication or authorization
- No rate limiting on API endpoints
- No input validation on uploaded images
- CORS allows all origins
- No HTTPS enforcement

**For production deployment, implement:**
- API key authentication
- Rate limiting (Flask-Limiter)
- Image validation (file type, size, content)
- CORS restriction to specific domains
- HTTPS with proper certificates

## Performance Optimization

### Model Selection
Choose YOLO variant based on requirements:
- **yolov8n** - Fastest (real-time), lower accuracy
- **yolov8s** - Balanced
- **yolov8m** - Good accuracy, slower
- **yolov8l** - Best accuracy (current), slowest

### Configuration Tuning
Adjust in `app.py`:
- `imgsz=800` - Lower for faster processing, higher for better accuracy
- `conf=0.25` - Confidence threshold (0-1)
- `iou=0.6` - IoU threshold for NMS (0-1)
- `device='cpu'` - Change to `'cuda'` if GPU available

## Useful References

- **Main README:** `/home/user/Attribute-Based-Pedestrian-Detection/README.md`
- **App Setup:** `/home/user/Attribute-Based-Pedestrian-Detection/app/README.md`
- **Training Methodology:** `/home/user/Attribute-Based-Pedestrian-Detection/notebooks/README.md`
- **YOLOv8 Docs:** https://docs.ultralytics.com/
- **Flask Docs:** https://flask.palletsprojects.com/
- **React Docs:** https://react.dev/
- **Vite Docs:** https://vitejs.dev/

## Dataset Information

**Sources:**
- Oxford Town Centre Dataset
- Penn-Fudan Pedestrian Detection Dataset
- Roboflow augmentation

**Classes:** 51 total
- 2 gender classes
- 21 upper body clothing classes (3 types × 7 colors)
- 21 lower body clothing classes (3 types × 7 colors)
- 7 accessory classes (backpack, bag, boots, cap, glasses, shoes, umbrella)

**Training Images:** ~4,500 annotated images
**Format:** YOLO format (`.txt` labels with normalized coordinates)

## Known Issues & TODOs

1. **Code Duplication:** Three similar endpoints should be refactored
2. **Debug Statements:** Remove console.log statements before production
3. **Error Handling:** Improve user feedback for errors (network, invalid images)
4. **Configuration:** Externalize hardcoded values to config files
5. **Testing:** Implement unit tests and integration tests
6. **Documentation:** Add API documentation (OpenAPI/Swagger)
7. **Deployment:** Create Docker containers for easy deployment
8. **CI/CD:** Set up GitHub Actions for automated testing

## Contact & Support

**Author:** Avinash Changrani
**License:** MIT (2024)
**Repository:** https://github.com/nabobery/Attribute-Based-Pedestrian-Detection

For issues or questions, please open a GitHub issue.
