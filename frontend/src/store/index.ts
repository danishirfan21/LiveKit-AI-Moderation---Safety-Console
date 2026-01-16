import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import roomsReducer from './roomsSlice';
import moderationReducer from './moderationSlice';
import policiesReducer from './policiesSlice';
import auditReducer from './auditSlice';

export const store = configureStore({
  reducer: {
    rooms: roomsReducer,
    moderation: moderationReducer,
    policies: policiesReducer,
    audit: auditReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
