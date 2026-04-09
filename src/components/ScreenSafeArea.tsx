import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '../theme';

type Props = {
  children: ReactNode;
  /** Tab ekranlarında alt çentik + tab bar için genelde `bottom` çıkarılır. */
  edges?: readonly Edge[];
};

const defaultEdges: readonly Edge[] = ['top', 'left', 'right', 'bottom'];

export function ScreenSafeArea({ children, edges = defaultEdges }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
