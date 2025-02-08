declare global {
  interface Window {
    electronAPI: {
      moveRight: () => void;
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const moveRightButton = document.getElementById("moveRight");

  if (moveRightButton) {
    moveRightButton.addEventListener("click", () => {
      window.electronAPI.moveRight();
    });
  }
});

// This empty export makes this file a module
export {};
