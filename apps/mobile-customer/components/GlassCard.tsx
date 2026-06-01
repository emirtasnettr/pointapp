import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { customerTheme as t } from '../lib/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** `plain`: düz yüzey, ince çerçeve — formlar için. Varsayılan cam kart. */
  variant?: 'glass' | 'plain';
};

export function GlassCard({ children, style, variant = 'glass' }: Props) {
  return <View style={[variant === 'plain' ? styles.plain : styles.glass, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    padding: 18,
    ...t.shadow,
  },
  plain: {
    backgroundColor: t.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
  },
});
