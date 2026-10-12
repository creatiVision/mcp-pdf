/**
 * Polyfills for older Node.js runtimes (< 22.13).
 *
 * `pdfjs-dist` (used by `pdf-to-png-converter`) uses `ArrayBuffer.prototype.transferToFixedLength`
 * when transferring operator buffers to worker streams. On Node < 22, this method is missing,
 * causing PDF page rendering to throw silent errors and hang indefinitely on subsequent pages.
 */

if (typeof ArrayBuffer !== 'undefined') {
  if (!('transfer' in ArrayBuffer.prototype)) {
    // @ts-expect-error Polyfill for Node < 22
    ArrayBuffer.prototype.transfer = function (newByteLength?: number) {
      const len = newByteLength === undefined ? this.byteLength : newByteLength;
      const dest = new ArrayBuffer(len);
      new Uint8Array(dest).set(new Uint8Array(this, 0, Math.min(this.byteLength, len)));
      return dest;
    };
  }

  if (!('transferToFixedLength' in ArrayBuffer.prototype)) {
    // @ts-expect-error Polyfill for Node < 22
    ArrayBuffer.prototype.transferToFixedLength = function (newByteLength?: number) {
      const len = newByteLength === undefined ? this.byteLength : newByteLength;
      const dest = new ArrayBuffer(len);
      new Uint8Array(dest).set(new Uint8Array(this, 0, Math.min(this.byteLength, len)));
      return dest;
    };
  }
}
