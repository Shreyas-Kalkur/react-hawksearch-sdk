import React, { useState } from "react";
import "./UploadModal.css";

const UploadModal = ({ onClose, onUpload }) => {
  const [dragging, setDragging] = useState(false);

  const handleFileSelect = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(",")[1]; // Extract the Base64 data
        onUpload(base64String); // Pass Base64 string to the parent
        onClose(); // Close the modal
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h1>Upload an image</h1>
        <div
          id="dropZone"
          className={`drop-zone ${dragging ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
        >
          <p>Drag and drop an image, or click to upload</p>
        </div>
        <input
          type="file"
          id="fileInput"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
      </div>
    </div>
  );
};

export default UploadModal;
