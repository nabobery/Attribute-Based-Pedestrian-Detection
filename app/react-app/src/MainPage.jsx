import React, { useState, Fragment, useEffect } from "react";
import {
  DocumentArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  TrashIcon,
  BookmarkIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentChartBarIcon
} from "@heroicons/react/24/outline";
import { useDropzone } from "react-dropzone";
import { ClipLoader } from "react-spinners";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  ReactCompareSlider,
  ReactCompareSliderImage
} from "react-compare-slider";
import axios from "axios";
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

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

const Backend_API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Predefined presets
const defaultPresets = [
  {
    name: "Male Business Attire",
    attributes: {
      Gender: "Male",
      "Upper Body Clothing": "Shirt",
      "Upper Body Clothing Color": "White",
      "Lower Body Clothing": "Trousers",
      "Lower Body Clothing Color": "Black",
      Footwear: "shoes",
      Umbrella: "no",
      Handbag: "no",
      Backpack: "no",
      Glasses: "no",
      "Cap/Helmet": "no",
    }
  },
  {
    name: "Female with Backpack",
    attributes: {
      Gender: "Female",
      "Upper Body Clothing": "T-shirt",
      "Upper Body Clothing Color": "Blue",
      "Lower Body Clothing": "Trousers",
      "Lower Body Clothing Color": "Black",
      Backpack: "yes",
      Umbrella: "no",
      Handbag: "no",
      Footwear: "shoes",
      Glasses: "no",
      "Cap/Helmet": "no",
    }
  },
  {
    name: "Casual Male",
    attributes: {
      Gender: "Male",
      "Upper Body Clothing": "T-shirt",
      "Upper Body Clothing Color": "Black",
      "Lower Body Clothing": "Shorts",
      "Lower Body Clothing Color": "Blue",
      Footwear: "shoes",
      Umbrella: "no",
      Handbag: "no",
      Backpack: "no",
      Glasses: "no",
      "Cap/Helmet": "no",
    }
  }
];

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

// Confidence Threshold Slider
function ConfidenceSlider({ value, onChange }) {
  return (
    <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
      <div className="flex justify-between items-center">
        <label className="font-semibold text-gray-800">Detection Confidence</label>
        <span className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min="10"
        max="90"
        step="5"
        value={value * 100}
        onChange={(e) => onChange(e.target.value / 100)}
        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-gray-600">
        <span>More Results (Lower Accuracy)</span>
        <span>Fewer Results (Higher Accuracy)</span>
      </div>
    </div>
  );
}

// Attribute Presets Component
function AttributePresets({ onLoadPreset, currentAttributes, onSavePreset }) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [customPresets, setCustomPresets] = useState(() => {
    const saved = localStorage.getItem('attributePresets');
    return saved ? JSON.parse(saved) : [];
  });

  const allPresets = [...defaultPresets, ...customPresets];

  const savePreset = () => {
    const newPreset = {
      name: presetName,
      attributes: currentAttributes
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('attributePresets', JSON.stringify(updated));
    setShowSaveModal(false);
    setPresetName("");
  };

  const deletePreset = (index) => {
    const updated = customPresets.filter((_, i) => i !== index);
    setCustomPresets(updated);
    localStorage.setItem('attributePresets', JSON.stringify(updated));
  };

  return (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <BookmarkIcon className="h-5 w-5 mr-2 text-purple-600" />
          Quick Presets
        </h3>
        <button
          onClick={() => setShowSaveModal(true)}
          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          + Save Current
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {allPresets.map((preset, idx) => (
          <div key={idx} className="relative group">
            <button
              onClick={() => onLoadPreset(preset.attributes)}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 text-sm font-medium transition-colors"
            >
              {preset.name}
            </button>
            {idx >= defaultPresets.length && (
              <button
                onClick={() => deletePreset(idx - defaultPresets.length)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete preset"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Save Attribute Preset</h3>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name"
              className="w-full border rounded p-2 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={savePreset}
                disabled={!presetName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Statistics Dashboard Component
function StatisticsDashboard({ statistics }) {
  if (!statistics) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Detection Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow">
          <p className="text-3xl font-bold text-blue-600">{statistics.total_pedestrians}</p>
          <p className="text-sm text-gray-600 mt-1">Total Detected</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow">
          <p className="text-3xl font-bold text-green-600">{statistics.matching_pedestrians}</p>
          <p className="text-sm text-gray-600 mt-1">Matches Found</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow">
          <p className="text-3xl font-bold text-purple-600">{statistics.avg_confidence}%</p>
          <p className="text-sm text-gray-600 mt-1">Avg Confidence</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow">
          <p className="text-3xl font-bold text-orange-600">{statistics.processing_time}s</p>
          <p className="text-sm text-gray-600 mt-1">Processing Time</p>
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600 bg-white rounded p-3">
        <p><strong>Image:</strong> {statistics.image_dimensions?.width} × {statistics.image_dimensions?.height}px</p>
        <p><strong>Confidence Threshold:</strong> {Math.round(statistics.parameters?.confidence_threshold * 100)}%</p>
        {statistics.device && (
          <p className="flex items-center mt-2">
            <strong>Device:</strong>
            {statistics.device === 'cuda' && <span className="ml-2 text-green-600">🚀 GPU Accelerated</span>}
            {statistics.device === 'cpu' && <span className="ml-2 text-blue-600">💻 CPU Processing</span>}
            {statistics.from_cache && <span className="ml-2 text-yellow-600">⚡ From Cache</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// Export Results Component
function ExportResults({ detections, statistics, inputImage, outputImage, selectedAttributes }) {
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      attributes: selectedAttributes,
      statistics: statistics,
      metadata: {
        exported_by: "Pedestrian Attribute Detection System",
        version: "3.0"
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `detection_results_${Date.now()}.json`);
  };

  const exportCSV = () => {
    // Create CSV header
    let csv = "Metric,Value\n";
    csv += `Timestamp,${new Date().toISOString()}\n`;
    csv += `Total Pedestrians,${statistics.total_pedestrians}\n`;
    csv += `Matching Pedestrians,${statistics.matching_pedestrians}\n`;
    csv += `Average Confidence,${statistics.avg_confidence}%\n`;
    csv += `Processing Time,${statistics.processing_time}s\n`;
    csv += `Image Width,${statistics.image_dimensions?.width}px\n`;
    csv += `Image Height,${statistics.image_dimensions?.height}px\n`;
    csv += `Confidence Threshold,${Math.round(statistics.parameters?.confidence_threshold * 100)}%\n`;
    csv += `IOU Threshold,${statistics.parameters?.iou_threshold}\n`;

    // Add attributes
    csv += "\nAttribute,Value\n";
    Object.entries(selectedAttributes).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `detection_results_${Date.now()}.csv`);
  };

  const exportExcel = () => {
    // Create statistics worksheet
    const statsData = [
      ["Metric", "Value"],
      ["Timestamp", new Date().toISOString()],
      ["Total Pedestrians", statistics.total_pedestrians],
      ["Matching Pedestrians", statistics.matching_pedestrians],
      ["Average Confidence", `${statistics.avg_confidence}%`],
      ["Processing Time", `${statistics.processing_time}s`],
      ["Image Width", `${statistics.image_dimensions?.width}px`],
      ["Image Height", `${statistics.image_dimensions?.height}px`],
      ["Confidence Threshold", `${Math.round(statistics.parameters?.confidence_threshold * 100)}%`],
      ["IOU Threshold", statistics.parameters?.iou_threshold]
    ];

    // Create attributes worksheet
    const attrsData = [
      ["Attribute", "Value"],
      ...Object.entries(selectedAttributes).map(([key, value]) => [key, value])
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(statsData);
    const ws2 = XLSX.utils.aoa_to_sheet(attrsData);

    XLSX.utils.book_append_sheet(wb, ws1, "Statistics");
    XLSX.utils.book_append_sheet(wb, ws2, "Attributes");

    // Write file
    XLSX.writeFile(wb, `detection_results_${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(79, 70, 229); // Indigo
    pdf.text("Pedestrian Detection Report", pageWidth / 2, 20, { align: 'center' });

    // Timestamp
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

    // Statistics Section
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Detection Statistics", 14, 40);

    pdf.setFontSize(11);
    let yPos = 50;
    const stats = [
      [`Total Pedestrians: ${statistics.total_pedestrians}`],
      [`Matching Pedestrians: ${statistics.matching_pedestrians}`],
      [`Average Confidence: ${statistics.avg_confidence}%`],
      [`Processing Time: ${statistics.processing_time}s`],
      [`Image Size: ${statistics.image_dimensions?.width} × ${statistics.image_dimensions?.height}px`],
      [`Confidence Threshold: ${Math.round(statistics.parameters?.confidence_threshold * 100)}%`]
    ];

    stats.forEach(stat => {
      pdf.text(stat[0], 20, yPos);
      yPos += 8;
    });

    // Attributes Section
    yPos += 10;
    pdf.setFontSize(14);
    pdf.text("Search Attributes", 14, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    Object.entries(selectedAttributes).forEach(([key, value]) => {
      pdf.text(`${key}: ${value}`, 20, yPos);
      yPos += 8;

      // Add new page if needed
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
    });

    // Add output image if available
    if (outputImage) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text("Detection Result", 14, 20);

      try {
        // Add image (scaled to fit page)
        const imgWidth = 180;
        const imgHeight = 120;
        pdf.addImage(outputImage, 'JPEG', 15, 30, imgWidth, imgHeight);
      } catch (error) {
        console.error("Could not add image to PDF:", error);
      }
    }

    // Save PDF
    pdf.save(`detection_report_${Date.now()}.pdf`);
  };

  return (
    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
        <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-green-600" />
        Export Results
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportJSON}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          JSON
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
        >
          <TableCellsIcon className="h-4 w-4 mr-2" />
          CSV
        </button>
        <button
          onClick={exportExcel}
          className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
          <TableCellsIcon className="h-4 w-4 mr-2" />
          Excel
        </button>
        <button
          onClick={exportPDF}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <DocumentChartBarIcon className="h-4 w-4 mr-2" />
          PDF
        </button>
      </div>
    </div>
  );
}

// Search History Component
function SearchHistory({ onLoadHistory }) {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  const saveToHistory = (entry) => {
    const updated = [entry, ...history].slice(0, 20); // Keep last 20
    setHistory(updated);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const deleteEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (window.confirm('Clear all search history?')) {
      setHistory([]);
      localStorage.removeItem('searchHistory');
    }
  };

  // Expose saveToHistory via useEffect for parent component
  useEffect(() => {
    window.saveSearchToHistory = saveToHistory;
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-yellow-600" />
          Search History ({history.length})
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
          >
            {showHistory ? 'Hide' : 'Show'}
          </button>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
          {history.map(entry => (
            <div
              key={entry.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="relative" onClick={() => onLoadHistory(entry)}>
                <img
                  src={entry.resultUrl}
                  alt="Search result"
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {entry.matchCount}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {entry.statistics.processing_time}s
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEntry(entry.id);
                }}
                className="w-full py-1 bg-red-50 text-red-600 text-xs hover:bg-red-100 transition-colors flex items-center justify-center"
              >
                <TrashIcon className="h-3 w-3 mr-1" />
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Interactive Results Viewer Component
function InteractiveResultsViewer({ inputImage, outputImage, statistics }) {
  const [viewMode, setViewMode] = useState('split'); // 'split', 'output', 'compare'

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = outputImage;
    link.download = `detection_result_${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
      {/* Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b gap-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('split')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('output')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              viewMode === 'output'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Result Only
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              viewMode === 'compare'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Slider Compare
          </button>
        </div>

        <button
          onClick={downloadImage}
          className="flex items-center px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 font-medium transition-colors"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Download
        </button>
      </div>

      {/* Image Display */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-center font-semibold mb-2 text-gray-700">Original Image</h4>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <TransformWrapper>
                <TransformComponent>
                  <img src={inputImage} alt="Original" className="w-full" />
                </TransformComponent>
              </TransformWrapper>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              <MagnifyingGlassPlusIcon className="inline h-4 w-4 mr-1" />
              Scroll to zoom, drag to pan
            </p>
          </div>
          <div>
            <h4 className="text-center font-semibold mb-2 text-gray-700">Detection Result</h4>
            <div className="border-2 border-green-300 rounded-lg overflow-hidden">
              <TransformWrapper>
                <TransformComponent>
                  <img src={outputImage} alt="Detections" className="w-full" />
                </TransformComponent>
              </TransformWrapper>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              <MagnifyingGlassPlusIcon className="inline h-4 w-4 mr-1" />
              Scroll to zoom, drag to pan
            </p>
          </div>
        </div>
      )}

      {viewMode === 'output' && (
        <div>
          <div className="border-2 border-green-300 rounded-lg overflow-hidden">
            <TransformWrapper>
              <TransformComponent>
                <img src={outputImage} alt="Result" className="w-full" />
              </TransformComponent>
            </TransformWrapper>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            <MagnifyingGlassPlusIcon className="inline h-4 w-4 mr-1" />
            Scroll to zoom, drag to pan
          </p>
        </div>
      )}

      {viewMode === 'compare' && (
        <div>
          <div className="border-2 border-indigo-300 rounded-lg overflow-hidden">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={inputImage} alt="Original" />}
              itemTwo={<ReactCompareSliderImage src={outputImage} alt="Result" />}
              style={{ height: '500px' }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            ← Drag the slider to compare original and detection result →
          </p>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="mt-6">
          <StatisticsDashboard statistics={statistics} />
        </div>
      )}
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
  const [confidence, setConfidence] = useState(0.25);
  const [statistics, setStatistics] = useState(null);

  const handleImageUpload = (file) => {
    if (file) {
      setImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setPredictedImage(null); // Clear previous results
      setStatistics(null);
    } else {
      setImage(null);
      setImagePreviewUrl(null);
      setPredictedImage(null);
      setStatistics(null);
    }
  };

  const handleSelectChange = (event) => {
    setSelectedAttributes({
      ...selectedAttributes,
      [event.target.name]: event.target.value,
    });
  };

  const handleLoadPreset = (presetAttributes) => {
    setSelectedAttributes(presetAttributes);
  };

  const handleSubmit = async () => {
    if (!image) {
      setOpen(true);
      return;
    }

    setIsProcessing(true);
    setPredictedImage(null);
    setStatistics(null);

    const reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onloadend = async function () {
      const base64Image = reader.result;
      const data = {
        image: base64Image,
        attributes: selectedAttributes,
        confidence: confidence,
        iou: 0.6
      };
      try {
        const response = await axios.post(Backend_API + "/process1", data, {
          responseType: "json",
        });
        const resultImage = "data:image/jpeg;base64," + response.data.prediction;
        setPredictedImage(resultImage);
        setStatistics(response.data.statistics);

        // Save to search history
        if (window.saveSearchToHistory) {
          const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            imageUrl: base64Image,
            resultUrl: resultImage,
            attributes: selectedAttributes,
            statistics: response.data.statistics,
            matchCount: response.data.statistics.matching_pedestrians
          };
          window.saveSearchToHistory(historyEntry);
        }
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

  const handleLoadHistory = (entry) => {
    // Load image from history
    const file = new File([entry.imageUrl], "history_image.jpg", { type: "image/jpeg" });
    setImage(file);
    setImagePreviewUrl(entry.imageUrl);
    setSelectedAttributes(entry.attributes);
    setPredictedImage(entry.resultUrl);
    setStatistics(entry.statistics);

    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleReset = () => {
    setSelectedAttributes(initialAttributes);
    setImage(null);
    setImagePreviewUrl(null);
    setPredictedImage(null);
    setStatistics(null);
    setConfidence(0.25);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 w-full py-8 px-4">
      <ProcessingOverlay isProcessing={isProcessing} />

      <div className="max-w-7xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center border-b pb-6">
          <DocumentArrowUpIcon className="mx-auto h-14 w-14 text-indigo-600 mb-4" />
          <h1 className="text-3xl font-extrabold text-gray-900">
            Pedestrian Attribute Detection
          </h1>
          <p className="mt-2 text-gray-600">
            Upload an image, adjust settings, and detect pedestrians with specific attributes
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

        {/* Presets Section */}
        <div>
          <AttributePresets
            onLoadPreset={handleLoadPreset}
            currentAttributes={selectedAttributes}
          />
        </div>

        {/* Search History Section */}
        <div>
          <SearchHistory onLoadHistory={handleLoadHistory} />
        </div>

        {/* Attribute Selection */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            2. Configure Detection
          </h2>

          {/* Confidence Slider */}
          <div className="mb-4">
            <ConfidenceSlider value={confidence} onChange={setConfidence} />
          </div>

          {/* Attribute Sections */}
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
            {isProcessing ? "Processing..." : "🔍 Detect Pedestrians"}
          </button>
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            🔄 Reset
          </button>
        </div>

        {/* Results Display */}
        {predictedImage && (
          <div id="results-section">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              3. Results
            </h2>

            {/* Export Results */}
            <div className="mb-4">
              <ExportResults
                statistics={statistics}
                inputImage={imagePreviewUrl}
                outputImage={predictedImage}
                selectedAttributes={selectedAttributes}
              />
            </div>

            {/* Interactive Viewer */}
            <InteractiveResultsViewer
              inputImage={imagePreviewUrl}
              outputImage={predictedImage}
              statistics={statistics}
            />
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
        <p>Powered by YOLOv8 • Phase 3: Export Formats • Search History • GPU Acceleration • Production Ready</p>
      </div>
    </div>
  );
}

export default MainPage;
