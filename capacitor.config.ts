import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matteq.crewridemap',
  appName: 'Drive Together',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
  },
};

export default config;
