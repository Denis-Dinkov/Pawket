import { buildWidgetTimeline } from './widgetData';

// Expo Go has no native module and the import throws — then the widget simply isn't updated
let BudgetWidget = null;
let widgetsDirectory = null;
try {
  BudgetWidget = require('./BudgetWidget').default;
  widgetsDirectory = require('expo-widgets/build/ExpoWidgets').default.widgetsDirectory || null;
} catch {
  BudgetWidget = null;
}

export const widgetsAvailable = !!BudgetWidget;
export const getWidgetsDirectory = () => widgetsDirectory;

let petImages = null; // { key, dir } after PetSnapshots (key = stage + outfit, see lookKey)
export const setPetImages = (value) => {
  petImages = value;
};

// The dog's picture for a look and mood, once PetSnapshots has written it to the shared folder.
// small: the lighter version for the Dynamic Island.
export const getPetImagePath = (key, expression, small = false) =>
  petImages && petImages.key === key ? `${petImages.dir}/pet-${key}-${expression}${small ? '-sm' : ''}.png` : '';

export function pushToNativeWidget(data) {
  if (!BudgetWidget) return;
  const entries = buildWidgetTimeline(data).map(({ date, props }) => ({
    date,
    props: { ...props, petImage: getPetImagePath(props.lookKey, props.expression) },
  }));
  try {
    BudgetWidget.updateTimeline(entries);
  } catch {
    // the widget isn't critical
  }
}
