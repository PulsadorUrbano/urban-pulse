import type { ComponentRef, Ref } from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Inicio</TabButton>
          </TabTrigger>
          <TabTrigger name="my-incidents" href="/my-incidents" asChild>
            <TabButton>Mis incidencias</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  // `TabTriggerSlotProps.ref` tipa `View` como instancia en vez de componente;
  // es una incompatibilidad de tipos de expo-router con los refs estrictos de RN 0.88.
  return (
    // `style={undefined}` tras el spread: `TabTrigger asChild` inyecta `style` (flexDirection/
    // justifyContent) y debe seguir sin pisar el estilo propio, como antes del refactor.
    <Pressable
      {...props}
      ref={ref as Ref<ComponentRef<typeof Pressable>>}
      style={undefined}
      className="active:opacity-70">
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        className="rounded-2xl px-4 py-1">
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    // `TabList asChild` inyecta `style` (justifyContent: space-between); se descarta para
    // que mande el estilo propio, como antes del refactor.
    <View {...props} style={undefined} className="absolute w-full flex-row items-center justify-center p-4">
      <ThemedView
        type="backgroundElement"
        className="flex-grow flex-row items-center gap-2 rounded-[32px] px-8 py-2"
        style={{ maxWidth: MaxContentWidth }}>
        <ThemedText type="smallBold" className="mr-auto">
          UrbanPulse
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}
