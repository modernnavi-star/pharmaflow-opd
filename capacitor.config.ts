import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pharmaflow.opd",
  appName: "PharmaStock OPD",
  webDir: "dist/mobile",
  bundledWebRuntime: false,
  android: {
    buildOptions: {
      releaseType: "APK",
    },
  },
};

export default config;
