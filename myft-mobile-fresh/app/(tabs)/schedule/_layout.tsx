import { Stack } from 'expo-router';
import { FONT_FAMILIES } from '../../../fonts';

export default function ScheduleStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { color: '#FFD700', fontWeight: 'bold', fontFamily: FONT_FAMILIES.archivoBlack },
        contentStyle: { backgroundColor: '#001F3F' },
      }}
    />
  );
}
