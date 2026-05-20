export function LoadingScreen() {
  return (
    <div class="flex flex-col gap-3 p-5 min-h-[200px] justify-center">
      <div class="skeleton h-5 w-3/5" />
      <div class="skeleton h-3.5 w-full" />
      <div class="skeleton h-3.5 w-4/5" />
    </div>
  );
}
