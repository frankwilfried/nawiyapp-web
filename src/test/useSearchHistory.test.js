import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from '../hooks/useSearchHistory';

const place = (id, name) => ({ id, name, lat: 4.05, lng: 9.71, type: 'carrefour' });

beforeEach(() => localStorage.clear());

describe('useSearchHistory', () => {
  it('démarre avec listes vides', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.recents).toHaveLength(0);
    expect(result.current.favorites).toHaveLength(0);
  });

  it('addRecent ajoute un lieu en tête', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addRecent(place('a', 'Akwa')));
    expect(result.current.recents[0].id).toBe('a');
  });

  it('addRecent déduplique (même id revient en tête)', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => { result.current.addRecent(place('a', 'Akwa')); result.current.addRecent(place('b', 'Bonaberi')); result.current.addRecent(place('a', 'Akwa')); });
    expect(result.current.recents).toHaveLength(2);
    expect(result.current.recents[0].id).toBe('a');
  });

  it('addRecent limite à 5 entrées', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => { for (let i = 0; i < 7; i++) result.current.addRecent(place(`p${i}`, `Place ${i}`)); });
    expect(result.current.recents).toHaveLength(5);
  });

  it('addRecent ignore les lieux sans nom', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addRecent({ id: 'x' }));
    expect(result.current.recents).toHaveLength(0);
  });

  it('toggleFavorite ajoute un favori', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.toggleFavorite(place('a', 'Akwa')));
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.isFavorite('a')).toBe(true);
  });

  it('toggleFavorite retire si déjà favori', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => { result.current.toggleFavorite(place('a', 'Akwa')); result.current.toggleFavorite(place('a', 'Akwa')); });
    expect(result.current.favorites).toHaveLength(0);
    expect(result.current.isFavorite('a')).toBe(false);
  });

  it('isFavorite retourne false pour id inconnu', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.isFavorite('inconnu')).toBe(false);
  });

  it('persiste les données dans localStorage', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => { result.current.addRecent(place('a', 'Akwa')); result.current.toggleFavorite(place('b', 'Bonaberi')); });
    // Nouvel hook = relit localStorage
    const { result: result2 } = renderHook(() => useSearchHistory());
    expect(result2.current.recents[0].id).toBe('a');
    expect(result2.current.favorites[0].id).toBe('b');
  });
});
