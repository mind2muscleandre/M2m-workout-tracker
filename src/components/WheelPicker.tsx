import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WheelPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: number) => void;
  currentValue: number;
  values: number[];
  unit: string;
  title: string;
}

export default function WheelPicker({
  visible,
  onClose,
  onSelect,
  currentValue,
  values,
  unit,
  title,
}: WheelPickerProps) {
  const flatListRef = useRef<FlatList>(null);
  const selectedIndexRef = useRef<number>(0);

  // Find initial index
  const getInitialIndex = useCallback(() => {
    const index = values.findIndex((v) => v === currentValue);
    return index >= 0 ? index : 0;
  }, [currentValue, values]);

  useEffect(() => {
    if (visible && flatListRef.current) {
      const index = getInitialIndex();
      selectedIndexRef.current = index;
      // Small delay to ensure FlatList is mounted
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [visible, getInitialIndex]);

  const handleMomentumScrollEnd = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      
      if (clampedIndex !== selectedIndexRef.current) {
        selectedIndexRef.current = clampedIndex;
        Haptics.selectionAsync();
      }
    },
    [values.length]
  );

  const handleConfirm = () => {
    const selectedValue = values[selectedIndexRef.current];
    onSelect(selectedValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const renderItem = ({ item, index }: { item: number; index: number }) => {
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemText}>
          {item.toFixed(item % 1 === 0 ? 0 : 1)} {unit}
        </Text>
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>{title}</Text>
            
            <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
              <Text style={styles.confirmText}>Klar</Text>
            </TouchableOpacity>
          </View>

          {/* Picker */}
          <View style={styles.pickerContainer}>
            {/* Selection highlight */}
            <View style={styles.selectionIndicator} pointerEvents="none" />
            
            {/* Gradient overlays for fade effect */}
            <View style={styles.gradientTop} pointerEvents="none" />
            <View style={styles.gradientBottom} pointerEvents="none" />

            <FlatList
              ref={flatListRef}
              data={values}
              renderItem={renderItem}
              keyExtractor={(item) => item.toString()}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleMomentumScrollEnd}
              getItemLayout={getItemLayout}
              contentContainerStyle={{
                paddingVertical: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
              }}
              initialScrollIndex={getInitialIndex()}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: false,
                    viewPosition: 0.5,
                  });
                }, 100);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '500',
  },
  confirmText: {
    fontSize: 17,
    color: '#F7E928',
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerContainer: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(247, 233, 40, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 233, 40, 0.3)',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    backgroundColor: 'transparent',
    // Simulated gradient with multiple layers
    borderBottomWidth: 0,
    zIndex: 1,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
