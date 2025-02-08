import React from "react";
import "../styles/control.css";

// Add TypeScript declaration for the window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      moveRight: () => void;
    };
  }
}

const Control: React.FC = () => {
  const handleMoveRight = () => {
    window.electronAPI.moveRight();
  };

  return (
    <div className="container">
      <h1>Gemini Controls</h1>
      <button className="control-button" onClick={handleMoveRight}>
        Move Right
      </button>
    </div>
  );
};

export default Control;
