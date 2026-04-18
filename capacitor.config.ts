import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matteq.crewridemap',
  appName: 'Drive Together',
  webDir: 'dist',
  server: {
    url: 'https://27410146-9e85-4aed-81e1-92071c45bfd6.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
  },
};

export default config;
