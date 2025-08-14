// app/screens/HomeScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Linking, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const NAVY = '#001F3F';
const LIGHT_BLUE = '#0b3c70';
const YELLOW = '#FFD700';
const TEXT = '#E9ECEF';

// TODO: replace these with your real links
const WEBSITE_URL = 'https://www.themyft.com';
const INSTAGRAM_URL = 'https://www.instagram.com/myft.25/';
const PHOTOS_URL = 'https://drive.google.com/drive/u/1/folders/1oKW8z7r-OTg8ANJswUAz7qVBn-gIfl3v';

const { width: DEVICE_WIDTH } = Dimensions.get('window');
const BOARD_SRC = require('../../assets/images/board_pics/BOARD_MEMBERS.jpg');

export default function HomeScreen() {
  const router = useRouter();

  const boardAspect = useMemo(() => {
    const { width, height } = Image.resolveAssetSource(BOARD_SRC);
    return width && height ? width / height : 1.6;
  }, []);

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // no-op
    }
  };

  return (
    <View style={styles.outer}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Big welcome */}
        <Text style={styles.welcome}>Welcome to the official MYFT 2025 app!</Text>
        <Text style={styles.subtitle}>
          Browse teams and players, view tournament schedule, set a fantasy football roster, and more!
        </Text>

        {/* Board image */}
        <Text style={styles.subHeader}> Meet the Board!</Text>
        <View style={styles.imageWrap}>
        <Image
          source={BOARD_SRC}
          style={{
            width: DEVICE_WIDTH,           // full device width
            height: DEVICE_WIDTH / boardAspect, // maintain aspect ratio
            borderRadius: 0,                // no crop from radius
          }}
          resizeMode="contain"              // avoid cropping
        />
        </View>

        {/* More content section */}
        <Text style={styles.moreTitle}>Want more MYFT content?</Text>
        <Text style={styles.subtitle}>Press any of the buttons below!</Text>

        <View style={styles.iconRow}>
          <TouchableOpacity style={styles.iconCard} onPress={() => open(WEBSITE_URL)}>
            <Ionicons name="globe-outline" size={28} color={YELLOW} />
            <Text style={styles.iconLabel}>Website</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconCard} onPress={() => open(INSTAGRAM_URL)}>
            <FontAwesome5 name="instagram" size={28} color={YELLOW} />
            <Text style={styles.iconLabel}>Instagram</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconCard} onPress={() => open(PHOTOS_URL)}>
            <MaterialIcons name="photo-library" size={28} color={YELLOW} />
            <Text style={styles.iconLabel}>Photos</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },

  // Headers
  welcome: {
    color: YELLOW,
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subtitle: {
    color: TEXT,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  subHeader: {
    color: YELLOW, 
    fontWeight: '900', 
    fontSize: 20, 
    marginBottom: 10, 
    marginLeft: 5,
    textAlign: 'center' 
  },

  imageWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  boardImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // More content
  moreTitle: {
    color: YELLOW,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  iconCard: {
    flex: 1,
    backgroundColor: LIGHT_BLUE, // lighter blue box
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
  },
  iconLabel: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Buttons
  buttonGroup: {
    marginTop: 8,
  },
  button: {
    backgroundColor: '#003366',
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  buttonText: {
    color: YELLOW,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '800',
  },
});
