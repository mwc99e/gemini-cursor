import { BrowserWindow } from "electron";

export class CursorController {
  private cursorX = 100;
  private readonly cursorY = 100;
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

  public smoothlyMoveCursor(targetX: number) {
    if (this.isAnimating || !this.mainWindow) return;

    this.isAnimating = true;
    const startX = this.cursorX;
    const distance = targetX - startX;
    const duration = 500; // Animation duration in ms
    const fps = 60;
    const frames = duration / (1000 / fps);
    let frame = 0;

    this.animationInterval = setInterval(() => {
      frame++;

      // Use easeOutQuad for smooth movement
      const progress = frame / frames;
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      this.cursorX = startX + distance * easeProgress;

      this.mainWindow?.setPosition(Math.round(this.cursorX), this.cursorY);

      if (frame >= frames) {
        this.isAnimating = false;
        if (this.animationInterval) {
          clearInterval(this.animationInterval);
          this.animationInterval = null;
        }
      }
    }, 1000 / fps);
  }

  public moveRight() {
    if (!this.isAnimating) {
      const targetX = this.cursorX + 100;
      const finalX = targetX > 500 ? 100 : targetX;
      this.smoothlyMoveCursor(finalX);
    }
  }

  public cleanup() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
}
