import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SerializableUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type AuthState = {
  user: SerializableUser | null;
  authReady: boolean;
};

const initialState: AuthState = {
  user: null,
  authReady: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<SerializableUser | null>) {
      state.user = action.payload;
      state.authReady = true;
    },
    setAuthReady(state) {
      state.authReady = true;
    },
    clearAuth(state) {
      state.user = null;
      state.authReady = true;
    },
  },
});

export const { setUser, setAuthReady, clearAuth } = authSlice.actions;
export default authSlice.reducer;
