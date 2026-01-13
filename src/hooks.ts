import { useDispatch, useSelector } from 'react-redux';
// Agregamos "type" antes de TypedUseSelectorHook
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;