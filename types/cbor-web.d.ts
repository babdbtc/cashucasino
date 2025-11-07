declare module 'cbor-web' {
  export function encode(data: any): ArrayBuffer;
  export function decode(data: ArrayBuffer): any;
}
