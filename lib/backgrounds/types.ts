export interface BackgroundController {
  destroy(): void;
  start?(): void;
  stop?(): void;
}

export interface BackgroundScene<TOptions> {
  mount(element: HTMLElement, options: TOptions): BackgroundController;
}

export interface WindyForestBackgroundOptions {
  speed?: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
}

export interface BackgroundOptionsMap {
  "windy-forest": WindyForestBackgroundOptions;
}

export type BackgroundKind = keyof BackgroundOptionsMap;

export type BackgroundRegistry = {
  [Kind in BackgroundKind]: BackgroundScene<BackgroundOptionsMap[Kind]>;
};
