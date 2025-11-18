import React, { useState, Fragment } from "react";
import { DocumentArrowUpIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useDropzone } from "react-dropzone";
import { ClipLoader } from "react-spinners";
import axios from "axios";

import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";

const attributes = {
  Gender: ["Male", "Female"],
  "Upper Body Clothing": ["T-shirt", "Shirt", "Coat"],
  "Upper Body Clothing Color": [
    "Black",
    "White",
    "Red",
    "Green",
    "Blue",
    "Yellow",
    "Brown",
  ],
  Umbrella: ["yes", "no"],
  Handbag: ["yes", "no"],
  Backpack: ["yes", "no"],
  "Lower Body Clothing": ["Trousers", "Skirt", "Shorts"],
  "Lower Body Clothing Color": [
    "Black",
    "White",
    "Red",
    "Green",
    "Blue",
    "Yellow",
    "Brown",
  ],
  Footwear: ["shoes", "Boots"],
  Glasses: ["yes", "no"],
  "Cap/Helmet": ["yes", "no"],
};

// Group attributes for collapsible sections
const attributeGroups = {
  "Basic Information": ["Gender"],
  "Upper Body": ["Upper Body Clothing", "Upper Body Clothing Color"],
  "Lower Body": ["Lower Body Clothing", "Lower Body Clothing Color"],
  "Accessories": ["Backpack", "Handbag", "Glasses", "Cap/Helmet", "Umbrella"],
  "Footwear": ["Footwear"],
};

const Backend_API = "http://localhost:5000";

// Collapsible Section Component
function AttributeSection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-300 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-semibold text-lg text-gray-800">{title}</h3>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-600" />
        )}
      </button>
      {isOpen && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

// Image Upload Component with Drag-and-Drop
function ImageUploadZone({ onImageUpload, currentImage, currentFile }) {
  const [error, setError] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxSize: 10485760, // 10MB
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.file.size > 10485760) {
          setError("File too large. Maximum size is 10MB");
        } else {
          setError("Invalid file format. Please upload JPEG, PNG, or WebP");
        }
        return;
      }

      const file = acceptedFiles[0];

      // Validate image dimensions
      const img = new Image();
      img.onload = () => {
        if (img.width < 200 || img.height < 200) {
          setError("Image too small. Minimum 200x200px required");
        } else {
          setError(null);
          onImageUpload(file);
        }
      };
      img.onerror = () => {
        setError("Failed to load image. Please try another file");
      };
      img.src = URL.createObjectURL(file);
    },
  });

  const removeImage = (e) => {
    e.stopPropagation();
    onImageUpload(null);
    setError(null);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
          ${error ? "border-red-500 bg-red-50" : ""}
          ${currentImage ? "bg-gray-50" : ""}`}
      >
        <input {...getInputProps()} />
        {currentImage ? (
          <div className="relative">
            <img
              src={currentImage}
              alt="Upload preview"
              className="max-h-96 mx-auto rounded shadow-lg"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-colors"
              title="Remove image"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            {currentFile && (
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-semibold">{currentFile.name}</p>
                <p>
                  {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-700">
              {isDragActive
                ? "Drop image here"
                : "Drag & drop image or click to browse"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              JPEG, PNG, WebP • Max 10MB • Min 200x200px
            </p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-red-600 text-sm font-medium flex items-center">
          <span className="mr-2">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}

// Loading Overlay Component
function ProcessingOverlay({ isProcessing }) {
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          <ClipLoader size={60} color="#4F46E5" />
          <h3 className="text-xl font-semibold text-gray-800">
            Analyzing Image...
          </h3>
          <p className="text-gray-600 text-center">
            Detecting pedestrians and matching attributes
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainPage() {
  // Initialize state
  const initialAttributes = Object.keys(attributes).reduce((obj, key) => {
    obj[key] = attributes[key][0];
    return obj;
  }, {});

  const [selectedAttributes, setSelectedAttributes] = useState(initialAttributes);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [predictedImage, setPredictedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (file) => {
    if (file) {
      setImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setPredictedImage(null); // Clear previous results
    } else {
      setImage(null);
      setImagePreviewUrl(null);
      setPredictedImage(null);
    }
  };

  const handleSelectChange = (event) => {
    setSelectedAttributes({
      ...selectedAttributes,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async () => {
    if (!image) {
      setOpen(true);
      return;
    }

    setIsProcessing(true);
    setPredictedImage(null);

    const reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onloadend = async function () {
      const base64Image = reader.result;
      const data = {
        image: base64Image,
        attributes: selectedAttributes,
      };
      try {
        const response = await axios.post(Backend_API + "/process1", data, {
          responseType: "json",
        });
        setPredictedImage(
          "data:image/jpeg;base64," + response.data.prediction
        );
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to process image. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = function (error) {
      console.error("Error reading file:", error);
      setIsProcessing(false);
      alert("Failed to read image file. Please try again.");
    };
  };

  const handleReset = () => {
    setSelectedAttributes(initialAttributes);
    setImage(null);
    setImagePreviewUrl(null);
    setPredictedImage(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 w-full py-8 px-4">
      <ProcessingOverlay isProcessing={isProcessing} />

      <div className="max-w-6xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center border-b pb-6">
          <DocumentArrowUpIcon className="mx-auto h-14 w-14 text-indigo-600 mb-4" />
          <h1 className="text-3xl font-extrabold text-gray-900">
            Pedestrian Attribute Detection
          </h1>
          <p className="mt-2 text-gray-600">
            Upload an image and select attributes to find matching pedestrians
          </p>
        </div>

        {/* Image Upload Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            1. Upload Image
          </h2>
          <ImageUploadZone
            onImageUpload={handleImageUpload}
            currentImage={imagePreviewUrl}
            currentFile={image}
          />
        </div>

        {/* Attribute Selection */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            2. Select Attributes
          </h2>
          <div className="space-y-2">
            {Object.entries(attributeGroups).map(([groupName, groupAttrs]) => (
              <AttributeSection
                key={groupName}
                title={groupName}
                defaultOpen={groupName === "Basic Information"}
              >
                {groupAttrs.map((key) => (
                  <div key={key} className="flex flex-col space-y-1">
                    <label className="font-semibold text-gray-700 text-sm">
                      {key}
                    </label>
                    <select
                      name={key}
                      value={selectedAttributes[key]}
                      onChange={handleSelectChange}
                      className="border border-gray-300 p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      {attributes[key].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </AttributeSection>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            disabled={!image || isProcessing}
            className="flex-1 py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "Processing..." : "Detect Pedestrians"}
          </button>
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Results Display */}
        {(imagePreviewUrl || predictedImage) && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              3. Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {imagePreviewUrl && (
                <div className="flex flex-col">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                    <img
                      src={imagePreviewUrl}
                      alt="Original"
                      className="w-full h-auto object-contain rounded"
                    />
                  </div>
                  <p className="mt-3 text-center font-semibold text-gray-700">
                    Original Image
                  </p>
                </div>
              )}
              {predictedImage && (
                <div className="flex flex-col">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-green-200">
                    <img
                      src={predictedImage}
                      alt="Detection Result"
                      className="w-full h-auto object-contain rounded"
                    />
                  </div>
                  <p className="mt-3 text-center font-semibold text-gray-700">
                    Detection Result
                  </p>
                  <div className="mt-2 text-center">
                    <a
                      href={predictedImage}
                      download={`detection_result_${Date.now()}.jpg`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download Result
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Modal */}
        <Transition appear show={open} as={Fragment}>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
              <DialogPanel className="max-w-lg space-y-4 border bg-white p-8 rounded-lg shadow-xl">
                <DialogTitle className="font-bold text-xl text-red-600">
                  No Image Uploaded
                </DialogTitle>
                <Description className="text-gray-700">
                  Please upload an image before processing.
                </Description>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                  >
                    OK
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        </Transition>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Powered by YOLOv8 • Upload images to detect pedestrian attributes</p>
      </div>
    </div>
  );
}

export default MainPage;
