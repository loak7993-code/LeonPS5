export type NavHandlers = {
  left(): void;
  right(): void;
  up(): void;
  down(): void;
  jump(delta: number): void;
  confirm(): void;
  back(): void;
};
