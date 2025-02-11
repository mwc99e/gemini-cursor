import { BrowserWindow, screen } from "electron";

export class CursorController {
  private cursorX = 500;
  private cursorY = 500;
  private isAnimating = false;
  private animationInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setInitialPosition();
  }

  private setInitialPosition() {
    this.mainWindow?.setPosition(this.cursorX, this.cursorY);
  }

  public smoothlyMoveCursor(targetX: number, targetY: number) {
    if (this.isAnimating || !this.mainWindow) return;

    this.isAnimating = true;
    const startX = this.cursorX;
    const startY = this.cursorY;
    const distanceX = targetX - startX;
    const distanceY = targetY - startY;
    const duration = 500; // Animation duration in ms
    const fps = 60;
    const frames = duration / (1000 / fps);
    let frame = 0;

    this.animationInterval = setInterval(() => {
      frame++;

      // Use easeOutQuad for smooth movement
      const progress = frame / frames;
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      this.cursorX = startX + distanceX * easeProgress;
      this.cursorY = startY + distanceY * easeProgress;

      this.mainWindow?.setPosition(
        Math.round(this.cursorX),
        Math.round(this.cursorY)
      );

      if (frame >= frames) {
        this.isAnimating = false;
        if (this.animationInterval) {
          clearInterval(this.animationInterval);
          this.animationInterval = null;
        }
      }
    }, 1000 / fps);
  }

  public moveTo(normalizedX: number, normalizedY: number) {
    if (this.isAnimating || !this.mainWindow) return;

    // Get the primary display's dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

    // Scale coordinates from 0-1000 to actual screen dimensions
    const targetX = (normalizedX / 1000) * screenWidth;
    const targetY = (normalizedY / 1000) * screenHeight;

    // Trigger smooth movement to the target position
    this.smoothlyMoveCursor(targetX, targetY);
  }

  public cleanup() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
}
