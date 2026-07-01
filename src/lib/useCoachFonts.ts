import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

export function useCoachFonts() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    DDIN: require('../../assets/fonts/D-DIN.otf'),
    DDINBold: require('../../assets/fonts/D-DIN-Bold.otf'),
    DDINCondensed: require('../../assets/fonts/D-DINCondensed.otf'),
    DDINCondensedBold: require('../../assets/fonts/D-DINCondensed-Bold.otf'),
    DDINExp: require('../../assets/fonts/D-DINExp.otf'),
    DDINExpBold: require('../../assets/fonts/D-DINExp-Bold.otf'),
  });

  return { loaded, error };
}
