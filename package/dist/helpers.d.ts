import { Layer, BlendMode, LayerColor, PixelData, PixelArray } from './psd';
export declare const MOCK_HANDLERS = false;
export declare const RAW_IMAGE_DATA = false;
export declare const fromBlendMode: {
    [key: string]: string;
};
export declare const toBlendMode: {
    [key: string]: BlendMode;
};
export declare const layerColors: LayerColor[];
export declare const largeAdditionalInfoKeys: string[];
export interface Dict {
    [key: string]: string;
}
export declare function revMap(map: Dict): Dict;
export declare function createEnum<T>(prefix: string, def: string, map: Dict): {
    decode: (val: string) => T;
    encode: (val: T | undefined) => string;
};
export declare const enum ColorSpace {
    RGB = 0,
    HSB = 1,
    CMYK = 2,
    Lab = 7,
    Grayscale = 8
}
export declare const enum LayerMaskFlags {
    PositionRelativeToLayer = 1,
    LayerMaskDisabled = 2,
    InvertLayerMaskWhenBlending = 4,
    LayerMaskFromRenderingOtherData = 8,
    MaskHasParametersAppliedToIt = 16
}
export declare const enum MaskParams {
    UserMaskDensity = 1,
    UserMaskFeather = 2,
    VectorMaskDensity = 4,
    VectorMaskFeather = 8
}
export declare const enum ChannelID {
    Color0 = 0,
    Color1 = 1,
    Color2 = 2,
    Color3 = 3,
    Transparency = -1,
    UserMask = -2,
    RealUserMask = -3
}
export declare const enum Compression {
    RawData = 0,
    RleCompressed = 1,
    ZipWithoutPrediction = 2,
    ZipWithPrediction = 3
}
export interface ChannelData {
    channelId: ChannelID;
    compression: Compression;
    buffer: Uint8Array | undefined;
    length: number;
}
export interface Bounds {
    top: number;
    left: number;
    right: number;
    bottom: number;
}
export interface LayerChannelData {
    layer: Layer;
    channels: ChannelData[];
    top: number;
    left: number;
    right: number;
    bottom: number;
    mask?: Bounds;
    realMask?: Bounds;
}
export declare function offsetForChannel(channelId: ChannelID, cmyk: boolean): number;
export declare function clamp(value: number, min: number, max: number): number;
export declare function hasAlpha(data: PixelData): boolean;
export declare function resetImageData({ data }: PixelData): void;
export declare function imageDataToCanvas(pixelData: PixelData): HTMLCanvasElement;
export declare function decodeBitmap(input: PixelArray, output: PixelArray, width: number, height: number): void;
export declare function writeDataRaw(data: PixelData, offset: number, width: number, height: number): Uint8Array | undefined;
export declare function writeDataRLE(buffer: Uint8Array, { data, width, height }: PixelData, offsets: number[], large: boolean): Uint8Array | undefined;
export declare function writeDataZipWithoutPrediction({ data, width, height }: PixelData, offsets: number[]): Uint8Array;
export declare let createCanvas: (width: number, height: number) => HTMLCanvasElement;
export declare let createCanvasFromData: (data: Uint8Array) => HTMLCanvasElement;
export declare let createImageData: (width: number, height: number) => ImageData;
export declare function initializeCanvas(createCanvasMethod: (width: number, height: number) => HTMLCanvasElement, createCanvasFromDataMethod?: (data: Uint8Array) => HTMLCanvasElement, createImageDataMethod?: (width: number, height: number) => ImageData): void;
