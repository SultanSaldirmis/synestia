import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type UIState = {
  language: 'tr' | 'en';
  hasSeenOnboarding: boolean;
};

const initialState: UIState = {
  language: 'tr',
  hasSeenOnboarding: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<'tr' | 'en'>) {
      state.language = action.payload;
    },
    markOnboardingSeen(state) {
      state.hasSeenOnboarding = true;
    },
  },
});

export const { setLanguage, markOnboardingSeen } = uiSlice.actions;
export default uiSlice.reducer;
