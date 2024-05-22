import React, { useState, Fragment } from "react";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";
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

const Backend_API = "http://localhost:5000";

function MainPage() {
  // Initialize state
  const initialAttributes = Object.keys(attributes).reduce((obj, key) => {
    obj[key] = attributes[key][0];
    return obj;
  }, {});
  //console.log(initialAttributes);
  const [selectedAttributes, setSelectedAttributes] =
    useState(initialAttributes);

  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [predictedImage, setPredictedImage] = useState(null);

  const handleImageUpload = (event) => {
    setImage(event.target.files[0]);
    setImagePreviewUrl(URL.createObjectURL(event.target.files[0]));
  };

  const handleSelectChange = (event) => {
    console.log(event.target);
    setSelectedAttributes({
      ...selectedAttributes,
      [event.target.name]: event.target.value,
    });
    console.log(selectedAttributes);
  };

  const handleSubmit = async () => {
    //const allAttributesSet = Object.values(selectedAttributes).every(value => value !== null);
    if (!image) {
      setOpen(true);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onloadend = async function () {
        const base64Image = reader.result;
        const data = {
          image: base64Image,
          attributes: selectedAttributes,
        };
        try {
          // for (var pair of formData.entries()) {
          //   console.log(pair[0]+ ', ' + pair[1]);
          // }
          const response = await axios.post(Backend_API + "/process1", data, {
            responseType: "json",
          });
          setPredictedImage(
            "data:image/jpeg;base64," + response.data.prediction
          );
          //setImagePreviewUrl(null);
          console.log(response.data);
        } catch (error) {
          console.error(error);
        }
      };
      reader.onerror = function (error) {
        console.log("Error: ", error);
      };
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 w-full">
      <div className="max-w-5xl w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <div className="flex flex-col items-center">
          <DocumentArrowUpIcon className="mx-auto h-12 w-auto text-blue-500" />
          <h2 className="mt-6 mb-6 text-center text-2xl font-extrabold text-gray-900">
            Upload your Pedestrian Contained image
          </h2>
          <input
            type="file"
            className="cursor-pointer relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            onChange={handleImageUpload}
          />
          <div className="flex justify-center mt-4">
            {imagePreviewUrl && (
              <div className="flex flex-col items-center mr-4">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="h-64 w-auto object-contain"
                />
                <p className="mt-2 font-semibold text-gray-600">
                  Input Image
                </p>
              </div>
            )}
            {predictedImage && (
              <div className="flex flex-col items-center ml-4">
                <img
                  src={predictedImage}
                  alt="Predicted"
                  className="h-64 w-auto object-contain"
                />
                <p className="mt-2 font-semibold text-gray-600">
                  Output Image
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          {Object.entries(attributes).map(([key, values]) => (
            <div key={key} className="flex flex-col space-y-1">
              <label className="font-semibold text-gray-600">{key}</label>
              <select
                name={key}
                onChange={handleSelectChange}
                className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Submit
        </button>
        <Transition appear show={open} as={Fragment}>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
              <DialogPanel className="max-w-lg space-y-4 border bg-white p-12">
                <DialogTitle className="font-bold">
                  Invalid Options Selected or no Image Uploaded
                </DialogTitle>
                <Description>
                  Please check if you have uploaded your Image
                </Description>
                <p>Please check and Try Again!</p>
                <div className="flex gap-4">
                  <button onClick={() => setOpen(false)}>Close</button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
}

export default MainPage;
