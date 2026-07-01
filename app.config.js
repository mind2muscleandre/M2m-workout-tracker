require('dotenv').config();

module.exports = {
  expo: {
    name: 'M2m-workout-tracker',
    slug: 'M2m-workout-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.M2mworkouttracker',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.anonymous.M2mworkouttracker',
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'single',
      name: 'M2M Workout Tracker',
      shortName: 'M2M',
      lang: 'sv',
      description: 'Träningsapp för att spåra pass och progression',
      themeColor: '#F7E928',
      backgroundColor: '#0F0F0F',
      display: 'standalone',
      orientation: 'portrait',
      startUrl: '/',
      scope: '/',
      manifest: {
        name: 'M2M Workout Tracker',
        short_name: 'M2M',
        description: 'Träningsapp för att spåra pass och progression',
        theme_color: '#F7E928',
        background_color: '#0F0F0F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: './assets/icon.png',
            sizes: [96, 128, 192, 256, 384, 512],
            type: 'image/png',
          },
        ],
      },
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
