/// <reference types="vite/client" />
/// <reference types="electron-vite/node" />

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png?asset" {
  const content: string;
  export default content;
}
