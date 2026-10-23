import AppTabs from '@/components/app-tabs';

// Capa de layout del grupo de pestañas: expone las secciones fijas de la app.
// El Stack raíz (`src/app/_layout.tsx`) envuelve este grupo para poder empujar
// pantallas (como el formulario) por encima de la tab bar.
export default function TabsLayout() {
  return <AppTabs />;
}
