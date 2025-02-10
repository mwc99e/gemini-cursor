import { app, BrowserWindow, systemPreferences } from "electron";
import path from "node:path";
import fs from "node:fs";

export class PermissionManager {
  private grantedPermissions: Set<string>;

  constructor() {
    this.grantedPermissions = new Set<string>();
    this.loadPersistedPermissions();
  }

  private loadPersistedPermissions() {
    const userDataPath = app.getPath("userData");
    const permissionsPath = path.join(userDataPath, "permissions.json");

    try {
      if (fs.existsSync(permissionsPath)) {
        const data = JSON.parse(fs.readFileSync(permissionsPath, "utf-8"));
        data.permissions.forEach((p: string) => this.grantedPermissions.add(p));
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  }

  private savePermissions() {
    const userDataPath = app.getPath("userData");
    const permissionsPath = path.join(userDataPath, "permissions.json");

    try {
      fs.writeFileSync(
        permissionsPath,
        JSON.stringify({ permissions: Array.from(this.grantedPermissions) }),
        "utf-8"
      );
    } catch (error) {
      console.error("Error saving permissions:", error);
    }
  }

  private checkSystemPermission(permission: string) {
    if (process.platform === "darwin") {
      if (
        permission === "screen" ||
        permission === "desktopCapture" ||
        permission === "display-capture"
      ) {
        return systemPreferences.getMediaAccessStatus("screen") === "granted";
      }
      if (permission === "media") {
        return (
          systemPreferences.getMediaAccessStatus("camera") === "granted" ||
          systemPreferences.getMediaAccessStatus("microphone") === "granted"
        );
      }
    }
    return false;
  }

  async requestAppPermissions(window: BrowserWindow) {
    try {
      // Set up a single permission request handler for the window
      window.webContents.session.setPermissionRequestHandler(
        (webContents, permission, callback) => {
          const allowedPermissions = [
            "media",
            "display-capture",
            "screen",
            "desktopCapture",
          ] as const;

          // Check if this is a supported permission type
          if (
            allowedPermissions.includes(
              permission as (typeof allowedPermissions)[number]
            )
          ) {
            // First check system level permissions
            if (this.checkSystemPermission(permission)) {
              this.grantedPermissions.add(permission);
              this.savePermissions();
              callback(true);
              return;
            }

            // Then check our stored permissions
            if (this.grantedPermissions.has(permission)) {
              callback(true);
              return;
            }

            // Let the system handle the permission request
            callback(true);
            this.grantedPermissions.add(permission);
            this.savePermissions();
          } else {
            callback(false);
          }
        }
      );

      // Set up permission check handler to be consistent with request handler
      window.webContents.session.setPermissionCheckHandler(
        (webContents, permission) => {
          const allowedPermissions = [
            "media",
            "display-capture",
            "screen",
            "desktopCapture",
          ] as const;

          // Check both system and stored permissions
          return (
            allowedPermissions.includes(
              permission as (typeof allowedPermissions)[number]
            ) &&
            (this.checkSystemPermission(permission) ||
              this.grantedPermissions.has(permission))
          );
        }
      );
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }
  }
}
