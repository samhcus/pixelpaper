export type Orientation = 'desktop' | 'phone' | 'square'
export type Wallpaper = {
  id: string; title: string; category: string; src: string; thumbnail: string;
  width: number; height: number; prompt?: string; model?: string; createdAt?: string
}
