// fantasy/index.tsx - Fantasy Index Screen (Global Team / Leagues toggle)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FantasyScreen from '../../screens/FantasyScreen';
import LeaguesScreen from '../../screens/LeaguesScreen';
import { FONT_FAMILIES } from '../../../fonts';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export default function FantasyIndexScreen() {
  const [mode, setMode] = useState<'global' | 'leagues'>('global');

  return (
    <View style={styles.container}>
      <View style={styles.segWrap}>
        <TouchableOpacity
          onPress={() => setMode('global')}
          style={[styles.segBtn, mode === 'global' && styles.segBtnActive]}
          activeOpacity={0.9}
        >
          <Text style={[styles.segText, mode === 'global' && styles.segTextActive]}>Global Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('leagues')}
          style={[styles.segBtn, mode === 'leagues' && styles.segBtnActive]}
          activeOpacity={0.9}
        >
          <Text style={[styles.segText, mode === 'leagues' && styles.segTextActive]}>Leagues</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {mode === 'global' ? <FantasyScreen /> : <LeaguesScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  segWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07335f',
    borderRadius: 10,
    padding: 6,
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  segBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  segBtnActive: { backgroundColor: YELLOW },
  segText: { color: YELLOW, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  segTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },
});
