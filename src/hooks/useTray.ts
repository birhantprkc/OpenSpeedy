import { useEffect } from "react";
import { TrayIcon } from "@tauri-apps/api/tray";
import { Menu } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import i18n, { languageReady } from "../i18n";

const TRAY_ID = "main";

// The tray lives outside the React tree, so it never re-renders on its own —
// the menu is rebuilt from the *current* i18n language at each call site.
const buildMenu = () => {
  const window = getCurrentWindow();
  // Plain options, not `MenuItem` instances: the backend creates the items in
  // one call, so a failure cannot leave a half-built menu behind.
  return Menu.new({
    items: [
      { id: "show", text: i18n.t("tray.show"), action: async () => {
        await window.unminimize();
        await window.show();
        await window.setFocus();
      }},
      // Reachable even when the main window never appeared — a user whose
      // app fails to start can still get at the log from here.
      { id: "logs", text: i18n.t("tray.logs"), action: async () => {
        await revealItemInDir(await invoke<string>("get_log_path"));
      }},
      { id: "quit", text: i18n.t("tray.quit"), action: async () => {
        await window.destroy();
      }},
    ],
  });
};

let trayPromise: Promise<TrayIcon | null> | null = null;

/** The tray icon, created on first use. Resolves `null` if creating it failed. */
const tray = () => trayPromise ??= (async (): Promise<TrayIcon | null> => {
  // Wait for the startup language before the first build: on a first run the
  // settings file still has to be created, and an English menu built and then
  // never rebuilt is exactly the bug this avoids.
  await languageReady;
  try {
    const icon = await defaultWindowIcon();
    return await TrayIcon.new({ id: TRAY_ID, icon: icon ?? undefined, menu: await buildMenu() });
  } catch (e) {
    // Without a tray the app is still usable, just without the "open log"
    // entry point — fail soft.
    console.error("failed to create the tray icon", e);
    return null;
  }
})();

/** Re-render the menu in the current language. A no-op if the tray never came up. */
const rebuildMenu = async () => {
  const icon = await tray();
  if (!icon) return;
  try {
    icon.setMenu(await buildMenu());
  } catch (e) {
    console.error("failed to rebuild the tray menu", e);
  }
};

export function useTray() {
  useEffect(() => {
    const window = getCurrentWindow();
    let live = true;

    (async () => {
      // Hide to tray instead of closing
      const unlistenClose = await window.onCloseRequested(async (e) => {
        e.preventDefault();
        await window.hide();
      });
      if (!live) unlistenClose();
    })();

    i18n.on("languageChanged", rebuildMenu);
    return () => {
      live = false;
      // The tray itself outlives this component on purpose: closing the window
      // hides it, so the app only ever ends through the tray's own quit item.
      i18n.off("languageChanged", rebuildMenu);
    };
  }, []);
}
