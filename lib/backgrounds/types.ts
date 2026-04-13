export interface BackgroundController {
  destroy(): void;
  start?(): void;
  stop?(): void;
}

export interface BackgroundScene<TOptions> {
  mount(element: HTMLElement, options: TOptions): BackgroundController;
}

export interface AsciiBackgroundOptions {
  speed?: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
}

export interface BackgroundSceneDefinition<TOptions>
  extends BackgroundScene<TOptions> {
  label: string;
  description: string;
}

export type WindyForestBackgroundOptions = AsciiBackgroundOptions;
export type MoonlitTideBackgroundOptions = AsciiBackgroundOptions;
export type DesertDunesBackgroundOptions = AsciiBackgroundOptions;
export type AuroraPeaksBackgroundOptions = AsciiBackgroundOptions;

export interface BackgroundOptionsMap {
  "windy-forest": WindyForestBackgroundOptions;
  "moonlit-tide": MoonlitTideBackgroundOptions;
  "desert-dunes": DesertDunesBackgroundOptions;
  "aurora-peaks": AuroraPeaksBackgroundOptions;
}

export type BackgroundKind = keyof BackgroundOptionsMap;

export type BackgroundRegistry = {
  [Kind in BackgroundKind]: BackgroundSceneDefinition<BackgroundOptionsMap[Kind]>;
};
