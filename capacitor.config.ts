import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swami.goalascent',
  appName: 'GoalAscent',
  webDir: 'public',
  server: {
    url: 'https://goalascent.vercel.app'
  }
};

export default config;
