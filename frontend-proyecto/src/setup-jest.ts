import { setupZoneTestEnv } from "jest-preset-angular/setup-env/zone";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(global as any).ResizeObserver = ResizeObserver;

setupZoneTestEnv();