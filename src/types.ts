export type Orientation = 'desktop' | 'phone' | 'square'
export type Wallpaper = {
  id: string; title: string; category: string; src: string; thumbnail: string;
  width: number; height: number; prompt?: string; model?: string; createdAt?: string
}
export type GenerationJob = {
  id: string; prompt: string; orientation: Orientation;
  status: 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled';
  createdAt: string; queuePosition?: number; waitTime?: number;
  message?: string; result?: Wallpaper
}
