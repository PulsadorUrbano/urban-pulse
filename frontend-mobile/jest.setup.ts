// Mocks globales de Jest: evitan cargar `global.css` (Tailwind) y la fuente del icono en los tests.
jest.mock('@/global.css', () => ({}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
