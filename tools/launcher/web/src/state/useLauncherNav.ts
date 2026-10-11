import { useEffect, useRef, useState } from "react";
import type { Game } from "../api";
import type { NavHandlers } from "./navigation";

export type NavArgs = {
  filtered: Game[];
  searching: boolean;
  onTopConfirm: (index: number) => void;
  onCardConfirm: (game: Game) => void;
  onBottomConfirm: (index: number) => void;
  onBack: () => void;
};

export type NavigationState = {
  row: number;
  setRow: (row: number) => void;
  topIndex: number;
  setTopIndex: (index: number) => void;
  cardIndex: number;
  setCardIndex: (index: number) => void;
  bottomIndex: number;
  setBottomIndex: (index: number) => void;
  handlers: React.RefObject<NavHandlers>;
};

const TOP_COUNT = 5;
const BOTTOM_COUNT = 4;
const NO_NAV: NavHandlers = {
  left() {},
  right() {},
  up() {},
  down() {},
  confirm() {},
  back() {},
};

export function useLauncherNav({
  filtered,
  searching,
  onTopConfirm,
  onCardConfirm,
  onBottomConfirm,
  onBack,
}: NavArgs): NavigationState {
  const [row, setRow] = useState(1);
  const [topIndex, setTopIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const handlers = useRef<NavHandlers>(NO_NAV);

  useEffect(() => {
    setCardIndex((index) => Math.min(index, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  handlers.current = {
    left() {
      if (row === 0) setTopIndex((index) => Math.max(0, index - 1));
      else if (row === 1) setCardIndex((index) => Math.max(0, index - 1));
      else setBottomIndex((index) => Math.max(0, index - 1));
    },
    right() {
      if (row === 0) setTopIndex((index) => Math.min(TOP_COUNT - 1, index + 1));
      else if (row === 1) setCardIndex((index) => Math.min(filtered.length - 1, index + 1));
      else setBottomIndex((index) => Math.min(BOTTOM_COUNT - 1, index + 1));
    },
    up() {
      setRow((current) => Math.max(0, current - 1));
    },
    down() {
      setRow((current) => Math.min(2, current + 1));
    },
    confirm() {
      if (row === 0) onTopConfirm(topIndex);
      else if (row === 1) {
        const selected = filtered[cardIndex];
        if (selected) onCardConfirm(selected);
      } else onBottomConfirm(bottomIndex);
    },
    back() {
      if (searching) onBack();
    },
  };

  return {
    row,
    setRow,
    topIndex,
    setTopIndex,
    cardIndex,
    setCardIndex,
    bottomIndex,
    setBottomIndex,
    handlers,
  };
}
