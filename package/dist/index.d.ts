/// <reference types="node" />
import { Psd, ReadOptions, WriteOptions } from './psd';
import { PsdWriter } from './psdWriter';
import { PsdReader } from './psdReader';
import { fromByteArray } from 'base64-js';
export * from './abr';
export * from './csh';
export { initializeCanvas } from './helpers';
export * from './psd';
export type { PsdReader, PsdWriter };
interface BufferLike {
    buffer: ArrayBuffer;
    byteOffset: number;
    byteLength: number;
}
export declare const byteArrayToBase64: typeof fromByteArray;
export declare function readPsd(buffer: ArrayBuffer | BufferLike, options?: ReadOptions): Psd;
export declare function writePsd(psd: Psd, options?: WriteOptions): ArrayBuffer;
export declare function writePsdUint8Array(psd: Psd, options?: WriteOptions): Uint8Array;
export declare function writePsdBuffer(psd: Psd, options?: WriteOptions): Buffer;
