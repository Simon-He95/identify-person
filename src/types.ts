export type Callback = (base64: string) => void
export interface Return {
  changeColor: (color: string) => void
  stop: () => void
}
