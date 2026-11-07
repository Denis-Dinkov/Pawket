import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { widgetProps } from '../widgetData';
import { setCustomCategories } from '../../theme';
import { setLang, resolveLang } from '../../i18n';
import BudgetWidgetAndroid from './BudgetWidgetAndroid';

// The store's save key (store.js KEY). Not imported: store.js pulls in the whole app, and this runs headless.
const KEY = 'spendlite:v2';

// Android asks for the widget (added, resized, every 30 min) even when the app isn't running,
// so the data is read straight from storage here
async function loadProps() {
  try {
    const data = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null') || {};
    setLang(resolveLang(data.settings?.language));
    setCustomCategories(data.categories || []);
    return widgetProps(data, new Date());
  } catch {
    return widgetProps({}, new Date());
  }
}

export default async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const props = await loadProps();
  renderWidget(<BudgetWidgetAndroid props={props} wide={widgetInfo.height >= 140} />);
}
