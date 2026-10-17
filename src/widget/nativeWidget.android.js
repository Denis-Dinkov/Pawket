import React from 'react';
import { widgetProps } from './widgetData';

let api = null;
try {
  api = require('react-native-android-widget');
} catch {
  api = null;
}

export const widgetsAvailable = !!api;

export function pushToNativeWidget(data) {
  if (!api) return;
  // The import is here so it isn't loaded on other platforms
  const BudgetWidgetAndroid = require('./android/BudgetWidgetAndroid').default;
  const props = widgetProps(data, new Date());
  api
    .requestWidgetUpdate({
      widgetName: 'Budget',
      renderWidget: (info) => <BudgetWidgetAndroid props={props} wide={info.height >= 140} />,
    })
    .catch(() => {});
}
