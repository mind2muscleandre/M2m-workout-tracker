import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { coachColors } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'ClientDetail'>;

/** Legacy route — redirects to AthleteDetail. */
export default function ClientDetailRedirectScreen({ route, navigation }: Props) {
  useEffect(() => {
    navigation.replace('AthleteDetail', { clientId: route.params.clientId });
  }, [navigation, route.params.clientId]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={coachColors.coach} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: coachColors.bg,
  },
});
