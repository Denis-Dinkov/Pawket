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

let petImages = null; // { stageKey, dir } after PetSnapshots
export const setPetImages = (value) => {
  petImages = value;
};

// The dog's picture for a stage and mood, once PetSnapshots has written it to the shared folder
export const getPetImagePath = (stageKey, expression) =>
  petImages && petImages.stageKey === stageKey ? `${petImages.dir}/pet-${stageKey}-${expression}.png` : '';

export function pushToNativeWidget(data) {
  if (!BudgetWidget) return;
  const entries = buildWidgetTimeline(data).map(({ date, props }) => ({
    date,
    props: {
      ...props,
      petImage: petImages && petImages.stageKey === props.stageKey ? `${petImages.dir}/pet-${props.stageKey}-${props.expression}.png` : '',
    },
  }));
  try {
    BudgetWidget.updateTimeline(entries);
  } catch {
    // the widget isn't critical
  }
}
