var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { hasAlpha, createCanvas, writeDataRLE, offsetForChannel, createImageData, fromBlendMode, clamp, largeAdditionalInfoKeys, RAW_IMAGE_DATA, writeDataZipWithoutPrediction, imageDataToCanvas } from './helpers';
import { infoHandlers } from './additionalInfo';
import { resourceHandlers } from './imageResources';
export function createWriter(size) {
    if (size === void 0) { size = 4096; }
    var buffer = new ArrayBuffer(size);
    var view = new DataView(buffer);
    var offset = 0;
    return { buffer: buffer, view: view, offset: offset, tempBuffer: undefined };
}
export function getWriterBuffer(writer) {
    return writer.buffer.slice(0, writer.offset);
}
export function getWriterBufferNoCopy(writer) {
    return new Uint8Array(writer.buffer, 0, writer.offset);
}
export function writeUint8(writer, value) {
    var offset = addSize(writer, 1);
    writer.view.setUint8(offset, value);
}
export function writeInt16(writer, value) {
    var offset = addSize(writer, 2);
    writer.view.setInt16(offset, value, false);
}
export function writeUint16(writer, value) {
    var offset = addSize(writer, 2);
    writer.view.setUint16(offset, value, false);
}
export function writeUint16LE(writer, value) {
    var offset = addSize(writer, 2);
    writer.view.setUint16(offset, value, true);
}
export function writeInt32(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setInt32(offset, value, false);
}
export function writeInt32LE(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setInt32(offset, value, true);
}
export function writeUint32(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setUint32(offset, value, false);
}
export function writeFloat32(writer, value) {
    var offset = addSize(writer, 4);
    writer.view.setFloat32(offset, value, false);
}
export function writeFloat64(writer, value) {
    var offset = addSize(writer, 8);
    writer.view.setFloat64(offset, value, false);
}
// 32-bit fixed-point number 16.16
export function writeFixedPoint32(writer, value) {
    writeInt32(writer, value * (1 << 16));
}
// 32-bit fixed-point number 8.24
export function writeFixedPointPath32(writer, value) {
    writeInt32(writer, value * (1 << 24));
}
export function writeBytes(writer, buffer) {
    if (buffer) {
        ensureSize(writer, writer.offset + buffer.length);
        var bytes = new Uint8Array(writer.buffer);
        bytes.set(buffer, writer.offset);
        writer.offset += buffer.length;
    }
}
export function writeZeros(writer, count) {
    for (var i = 0; i < count; i++) {
        writeUint8(writer, 0);
    }
}
export function writeSignature(writer, signature) {
    if (signature.length !== 4)
        throw new Error("Invalid signature: '".concat(signature, "'"));
    for (var i = 0; i < 4; i++) {
        writeUint8(writer, signature.charCodeAt(i));
    }
}
export function writePascalString(writer, text, padTo) {
    var length = text.length;
    if (length > 255)
        throw new Error("String too long");
    writeUint8(writer, length);
    for (var i = 0; i < length; i++) {
        var code = text.charCodeAt(i);
        // writeUint8(writer, code); // for testing
        writeUint8(writer, code < 128 ? code : '?'.charCodeAt(0));
    }
    while (++length % padTo) {
        writeUint8(writer, 0);
    }
}
export function writeUnicodeStringWithoutLength(writer, text) {
    for (var i = 0; i < text.length; i++) {
        writeUint16(writer, text.charCodeAt(i));
    }
}
export function writeUnicodeStringWithoutLengthLE(writer, text) {
    for (var i = 0; i < text.length; i++) {
        writeUint16LE(writer, text.charCodeAt(i));
    }
}
export function writeUnicodeString(writer, text) {
    writeUint32(writer, text.length);
    writeUnicodeStringWithoutLength(writer, text);
}
export function writeUnicodeStringWithPadding(writer, text) {
    writeUint32(writer, text.length + 1);
    for (var i = 0; i < text.length; i++) {
        writeUint16(writer, text.charCodeAt(i));
    }
    writeUint16(writer, 0);
}
function getLargestLayerSize(layers) {
    if (layers === void 0) { layers = []; }
    var max = 0;
    for (var _i = 0, layers_1 = layers; _i < layers_1.length; _i++) {
        var layer = layers_1[_i];
        if (layer.canvas || layer.imageData) {
            var _a = getLayerDimentions(layer), width = _a.width, height = _a.height;
            max = Math.max(max, 2 * height + 2 * width * height);
        }
        if (layer.children) {
            max = Math.max(max, getLargestLayerSize(layer.children));
        }
    }
    return max;
}
export function writeSection(writer, round, func, writeTotalLength, large) {
    if (writeTotalLength === void 0) { writeTotalLength = false; }
    if (large === void 0) { large = false; }
    if (large)
        writeUint32(writer, 0);
    var offset = writer.offset;
    writeUint32(writer, 0);
    func();
    var length = writer.offset - offset - 4;
    var len = length;
    while ((len % round) !== 0) {
        writeUint8(writer, 0);
        len++;
    }
    // while ((writer.offset % round) !== 0) {
    // 	writeUint8(writer, 0);
    // 	len++;
    // }
    if (writeTotalLength) {
        length = len;
    }
    writer.view.setUint32(offset, length, false);
}
function verifyBitCount(target) {
    var _a;
    (_a = target.children) === null || _a === void 0 ? void 0 : _a.forEach(verifyBitCount);
    var data = target.imageData;
    if (data && (data.data instanceof Uint32Array || data.data instanceof Uint16Array)) {
        throw new Error('imageData has incorrect bitDepth');
    }
    if ('mask' in target && target.mask) {
        var data_1 = target.mask.imageData;
        if (data_1 && (data_1.data instanceof Uint32Array || data_1.data instanceof Uint16Array)) {
            throw new Error('mask imageData has incorrect bitDepth');
        }
    }
}
export function writePsd(writer, psd, options) {
    var _a;
    if (options === void 0) { options = {}; }
    if (!(+psd.width > 0 && +psd.height > 0))
        throw new Error('Invalid document size');
    if ((psd.width > 30000 || psd.height > 30000) && !options.psb)
        throw new Error('Document size is too large (max is 30000x30000, use PSB format instead)');
    var bitsPerChannel = (_a = psd.bitsPerChannel) !== null && _a !== void 0 ? _a : 8;
    if (bitsPerChannel !== 8)
        throw new Error('bitsPerChannel other than 8 are not supported for writing');
    verifyBitCount(psd);
    var imageResources = __assign({}, psd.imageResources);
    var opt = __assign(__assign({}, options), { layerIds: new Set(), layerToId: new Map() });
    if (opt.generateThumbnail) {
        imageResources.thumbnail = createThumbnail(psd);
    }
    var imageData = psd.imageData;
    if (!imageData && psd.canvas) {
        imageData = psd.canvas.getContext('2d').getImageData(0, 0, psd.canvas.width, psd.canvas.height);
    }
    if (imageData && (psd.width !== imageData.width || psd.height !== imageData.height))
        throw new Error('Document canvas must have the same size as document');
    var globalAlpha = !!imageData && hasAlpha(imageData);
    var maxBufferSize = Math.max(getLargestLayerSize(psd.children), 4 * 2 * psd.width * psd.height + 2 * psd.height);
    writer.tempBuffer = new Uint8Array(maxBufferSize);
    // header
    writeSignature(writer, '8BPS');
    writeUint16(writer, options.psb ? 2 : 1); // version
    writeZeros(writer, 6);
    writeUint16(writer, globalAlpha ? 4 : 3); // channels
    writeUint32(writer, psd.height);
    writeUint32(writer, psd.width);
    writeUint16(writer, bitsPerChannel); // bits per channel
    writeUint16(writer, 3 /* ColorMode.RGB */); // we only support saving RGB right now
    // color mode data
    writeSection(writer, 1, function () {
        var _a, _b, _c;
        if (psd.palette) {
            for (var i = 0; i < 256; i++)
                writeUint8(writer, ((_a = psd.palette[i]) === null || _a === void 0 ? void 0 : _a.r) || 0);
            for (var i = 0; i < 256; i++)
                writeUint8(writer, ((_b = psd.palette[i]) === null || _b === void 0 ? void 0 : _b.g) || 0);
            for (var i = 0; i < 256; i++)
                writeUint8(writer, ((_c = psd.palette[i]) === null || _c === void 0 ? void 0 : _c.b) || 0);
        }
        // TODO: other data?
    });
    var layers = [];
    addChildren(layers, psd.children);
    if (!layers.length)
        layers.push({});
    // image resources
    imageResources.layersGroup = layers.map(function (l) { return l.linkGroup || 0; });
    imageResources.layerGroupsEnabledId = layers.map(function (l) { return l.linkGroupEnabled == false ? 0 : 1; });
    writeSection(writer, 1, function () {
        var _loop_1 = function (handler) {
            var has = handler.has(imageResources);
            var count = has === false ? 0 : (has === true ? 1 : has);
            var _loop_2 = function (i) {
                writeSignature(writer, '8BIM');
                writeUint16(writer, handler.key);
                writePascalString(writer, '', 2);
                writeSection(writer, 2, function () { return handler.write(writer, imageResources, i); });
            };
            for (var i = 0; i < count; i++) {
                _loop_2(i);
            }
        };
        for (var _i = 0, resourceHandlers_1 = resourceHandlers; _i < resourceHandlers_1.length; _i++) {
            var handler = resourceHandlers_1[_i];
            _loop_1(handler);
        }
    });
    // layer and mask info
    writeSection(writer, 2, function () {
        writeLayerInfo(writer, layers, psd, globalAlpha, opt);
        writeGlobalLayerMaskInfo(writer, psd.globalLayerMaskInfo);
        writeAdditionalLayerInfo(writer, psd, psd, opt);
    }, undefined, !!opt.psb);
    // image data
    var channels = globalAlpha ? [0, 1, 2, 3] : [0, 1, 2];
    var width = imageData ? imageData.width : psd.width;
    var height = imageData ? imageData.height : psd.height;
    var data = { data: new Uint8Array(width * height * 4), width: width, height: height };
    writeUint16(writer, 1 /* Compression.RleCompressed */); // Photoshop doesn't support zip compression of composite image data
    if (RAW_IMAGE_DATA && psd.imageDataRaw) {
        console.log('writing raw image data');
        writeBytes(writer, psd.imageDataRaw);
    }
    else {
        if (imageData)
            data.data.set(new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength));
        // add weird white matte
        if (globalAlpha) {
            var size = data.width * data.height * 4;
            var p = data.data;
            for (var i = 0; i < size; i += 4) {
                var pa = p[i + 3];
                if (pa != 0 && pa != 255) {
                    var a = pa / 255;
                    var ra = 255 * (1 - a);
                    p[i + 0] = p[i + 0] * a + ra;
                    p[i + 1] = p[i + 1] * a + ra;
                    p[i + 2] = p[i + 2] * a + ra;
                }
            }
        }
        writeBytes(writer, writeDataRLE(writer.tempBuffer, data, channels, !!options.psb));
    }
}
function writeLayerInfo(writer, layers, psd, globalAlpha, options) {
    writeSection(writer, 4, function () {
        var _a;
        writeInt16(writer, globalAlpha ? -layers.length : layers.length);
        var layersData = layers.map(function (l, i) { return getChannels(writer.tempBuffer, l, i === 0, options); });
        var _loop_3 = function (layerData) {
            var layer = layerData.layer, top_1 = layerData.top, left = layerData.left, bottom = layerData.bottom, right = layerData.right, channels = layerData.channels;
            writeInt32(writer, top_1);
            writeInt32(writer, left);
            writeInt32(writer, bottom);
            writeInt32(writer, right);
            writeUint16(writer, channels.length);
            for (var _e = 0, channels_1 = channels; _e < channels_1.length; _e++) {
                var c = channels_1[_e];
                writeInt16(writer, c.channelId);
                if (options.psb)
                    writeUint32(writer, 0);
                writeUint32(writer, c.length);
            }
            writeSignature(writer, '8BIM');
            writeSignature(writer, fromBlendMode[layer.blendMode] || 'norm');
            writeUint8(writer, Math.round(clamp((_a = layer.opacity) !== null && _a !== void 0 ? _a : 1, 0, 1) * 255));
            writeUint8(writer, layer.clipping ? 1 : 0);
            var flags = 0x08; // 1 for Photoshop 5.0 and later, tells if bit 4 has useful information
            if (layer.transparencyProtected)
                flags |= 0x01;
            if (layer.hidden)
                flags |= 0x02;
            if (layer.vectorMask || (layer.sectionDivider && layer.sectionDivider.type !== 0 /* SectionDividerType.Other */) || layer.adjustment) {
                flags |= 0x10; // pixel data irrelevant to appearance of document
            }
            if (layer.effectsOpen)
                flags |= 0x20;
            writeUint8(writer, flags);
            writeUint8(writer, 0); // filler
            writeSection(writer, 1, function () {
                writeLayerMaskData(writer, layer, layerData);
                writeLayerBlendingRanges(writer, layer);
                writePascalString(writer, (layer.name || '').substring(0, 255), 4);
                writeAdditionalLayerInfo(writer, layer, psd, options);
            });
        };
        // layer records
        for (var _i = 0, layersData_1 = layersData; _i < layersData_1.length; _i++) {
            var layerData = layersData_1[_i];
            _loop_3(layerData);
        }
        // layer channel image data
        for (var _b = 0, layersData_2 = layersData; _b < layersData_2.length; _b++) {
            var layerData = layersData_2[_b];
            for (var _c = 0, _d = layerData.channels; _c < _d.length; _c++) {
                var channel = _d[_c];
                writeUint16(writer, channel.compression);
                if (channel.buffer) {
                    writeBytes(writer, channel.buffer);
                }
            }
        }
    }, true, options.psb);
}
function writeLayerMaskData(writer, _a, layerData) {
    var mask = _a.mask, realMask = _a.realMask;
    writeSection(writer, 1, function () {
        if (!mask && !realMask)
            return;
        var params = 0, flags = 0, realFlags = 0;
        if (mask) {
            if (mask.userMaskDensity !== undefined)
                params |= 1 /* MaskParams.UserMaskDensity */;
            if (mask.userMaskFeather !== undefined)
                params |= 2 /* MaskParams.UserMaskFeather */;
            if (mask.vectorMaskDensity !== undefined)
                params |= 4 /* MaskParams.VectorMaskDensity */;
            if (mask.vectorMaskFeather !== undefined)
                params |= 8 /* MaskParams.VectorMaskFeather */;
            if (mask.disabled)
                flags |= 2 /* LayerMaskFlags.LayerMaskDisabled */;
            if (mask.positionRelativeToLayer)
                flags |= 1 /* LayerMaskFlags.PositionRelativeToLayer */;
            if (mask.fromVectorData)
                flags |= 8 /* LayerMaskFlags.LayerMaskFromRenderingOtherData */;
            if (params)
                flags |= 16 /* LayerMaskFlags.MaskHasParametersAppliedToIt */;
        }
        var m = layerData.mask || {};
        writeInt32(writer, m.top || 0);
        writeInt32(writer, m.left || 0);
        writeInt32(writer, m.bottom || 0);
        writeInt32(writer, m.right || 0);
        writeUint8(writer, mask && mask.defaultColor || 0);
        writeUint8(writer, flags);
        if (realMask) {
            if (realMask.disabled)
                realFlags |= 2 /* LayerMaskFlags.LayerMaskDisabled */;
            if (realMask.positionRelativeToLayer)
                realFlags |= 1 /* LayerMaskFlags.PositionRelativeToLayer */;
            if (realMask.fromVectorData)
                realFlags |= 8 /* LayerMaskFlags.LayerMaskFromRenderingOtherData */;
            var r = layerData.realMask || {};
            writeUint8(writer, realFlags);
            writeUint8(writer, realMask.defaultColor || 0);
            writeInt32(writer, r.top || 0);
            writeInt32(writer, r.left || 0);
            writeInt32(writer, r.bottom || 0);
            writeInt32(writer, r.right || 0);
        }
        if (params && mask) {
            writeUint8(writer, params);
            if (mask.userMaskDensity !== undefined)
                writeUint8(writer, Math.round(mask.userMaskDensity * 0xff));
            if (mask.userMaskFeather !== undefined)
                writeFloat64(writer, mask.userMaskFeather);
            if (mask.vectorMaskDensity !== undefined)
                writeUint8(writer, Math.round(mask.vectorMaskDensity * 0xff));
            if (mask.vectorMaskFeather !== undefined)
                writeFloat64(writer, mask.vectorMaskFeather);
        }
        writeZeros(writer, 2);
    });
}
function writerBlendingRange(writer, range) {
    writeUint8(writer, range[0]);
    writeUint8(writer, range[1]);
    writeUint8(writer, range[2]);
    writeUint8(writer, range[3]);
}
function writeLayerBlendingRanges(writer, layer) {
    writeSection(writer, 1, function () {
        var ranges = layer.blendingRanges;
        if (ranges) {
            writerBlendingRange(writer, ranges.compositeGrayBlendSource);
            writerBlendingRange(writer, ranges.compositeGraphBlendDestinationRange);
            for (var _i = 0, _a = ranges.ranges; _i < _a.length; _i++) {
                var r = _a[_i];
                writerBlendingRange(writer, r.sourceRange);
                writerBlendingRange(writer, r.destRange);
            }
        }
    });
}
function writeGlobalLayerMaskInfo(writer, info) {
    writeSection(writer, 1, function () {
        if (info) {
            writeUint16(writer, info.overlayColorSpace);
            writeUint16(writer, info.colorSpace1);
            writeUint16(writer, info.colorSpace2);
            writeUint16(writer, info.colorSpace3);
            writeUint16(writer, info.colorSpace4);
            writeUint16(writer, info.opacity * 0xff);
            writeUint8(writer, info.kind);
            writeZeros(writer, 3);
        }
    });
}
function writeAdditionalLayerInfo(writer, target, psd, options) {
    var _loop_4 = function (handler) {
        var key = handler.key;
        if (key === 'Txt2' && options.invalidateTextLayers)
            return "continue";
        if (key === 'vmsk' && options.psb)
            key = 'vsms';
        if (handler.has(target)) {
            var large = options.psb && largeAdditionalInfoKeys.indexOf(key) !== -1;
            var writeTotalLength = key !== 'Txt2' && key !== 'cinf' && key !== 'extn' && key !== 'CAI ' && key !== 'OCIO';
            var fourBytes = key === 'Txt2' || key === 'luni' || key === 'vmsk' || key === 'artb' || key === 'artd' ||
                key === 'vogk' || key === 'SoLd' || key === 'lnk2' || key === 'vscg' || key === 'vsms' || key === 'GdFl' ||
                key === 'lmfx' || key === 'lrFX' || key === 'cinf' || key === 'PlLd' || key === 'Anno' || key === 'CAI ' || key === 'OCIO' || key === 'GenI' || key === 'FEid';
            writeSignature(writer, large ? '8B64' : '8BIM');
            writeSignature(writer, key);
            writeSection(writer, fourBytes ? 4 : 2, function () {
                handler.write(writer, target, psd, options);
            }, writeTotalLength, large);
        }
    };
    for (var _i = 0, infoHandlers_1 = infoHandlers; _i < infoHandlers_1.length; _i++) {
        var handler = infoHandlers_1[_i];
        _loop_4(handler);
    }
}
function addChildren(layers, children) {
    if (!children)
        return;
    // const layerIds: number[] = [2];
    // const timestamps: number[] = [1740120767.0230637];
    for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
        var c = children_1[_i];
        if (c.children && c.canvas)
            throw new Error("Invalid layer, cannot have both 'canvas' and 'children' properties");
        if (c.children && c.imageData)
            throw new Error("Invalid layer, cannot have both 'imageData' and 'children' properties");
        if (c.children) {
            layers.push({
                name: '</Layer group>',
                sectionDivider: {
                    type: 3 /* SectionDividerType.BoundingSectionDivider */,
                },
                // blendingRanges: children[0].blendingRanges,
                // nameSource: 'lset',
                // id: layerIds.shift(),
                // protected: {
                // 	transparency: false,
                // 	composite: false,
                // 	position: false,
                // },
                // layerColor: 'red',
                // timestamp: timestamps.shift(),
                // referencePoint: { x: 0, y: 0 },
            });
            addChildren(layers, c.children);
            layers.push(__assign(__assign({}, c), { blendMode: c.blendMode === 'pass through' ? 'normal' : c.blendMode, sectionDivider: {
                    type: c.opened === false ? 2 /* SectionDividerType.ClosedFolder */ : 1 /* SectionDividerType.OpenFolder */,
                    key: fromBlendMode[c.blendMode] || 'pass',
                    subType: 0,
                } }));
        }
        else {
            layers.push(__assign({}, c));
        }
    }
}
function resizeBuffer(writer, size) {
    var newLength = writer.buffer.byteLength;
    do {
        newLength *= 2;
    } while (size > newLength);
    var newBuffer = new ArrayBuffer(newLength);
    var newBytes = new Uint8Array(newBuffer);
    var oldBytes = new Uint8Array(writer.buffer);
    newBytes.set(oldBytes);
    writer.buffer = newBuffer;
    writer.view = new DataView(writer.buffer);
}
function ensureSize(writer, size) {
    if (size > writer.buffer.byteLength) {
        resizeBuffer(writer, size);
    }
}
function addSize(writer, size) {
    var offset = writer.offset;
    ensureSize(writer, writer.offset += size);
    return offset;
}
function createThumbnail(psd) {
    var canvas = createCanvas(10, 10);
    var scale = 1;
    if (psd.width > psd.height) {
        canvas.width = 160;
        canvas.height = Math.floor(psd.height * (canvas.width / psd.width));
        scale = canvas.width / psd.width;
    }
    else {
        canvas.height = 160;
        canvas.width = Math.floor(psd.width * (canvas.height / psd.height));
        scale = canvas.height / psd.height;
    }
    var context = canvas.getContext('2d');
    context.scale(scale, scale);
    if (psd.imageData) {
        context.drawImage(imageDataToCanvas(psd.imageData), 0, 0);
    }
    else if (psd.canvas) {
        context.drawImage(psd.canvas, 0, 0);
    }
    return canvas;
}
function getMaskChannels(tempBuffer, layerData, layer, mask, options, realMask) {
    var top = mask.top | 0;
    var left = mask.left | 0;
    var right = mask.right | 0;
    var bottom = mask.bottom | 0;
    var _a = getLayerDimentions(mask), width = _a.width, height = _a.height;
    var imageData = mask.imageData;
    if (!imageData && mask.canvas && width && height) {
        imageData = mask.canvas.getContext('2d').getImageData(0, 0, width, height);
    }
    if (width && height && imageData) {
        right = left + width;
        bottom = top + height;
        if (imageData.width !== width || imageData.height !== height) {
            throw new Error('Invalid imageData dimentions');
        }
        var buffer = void 0;
        var compression = void 0;
        if (RAW_IMAGE_DATA && layer[realMask ? 'realMaskDataRaw' : 'maskDataRaw']) {
            buffer = layer[realMask ? 'realMaskDataRaw' : 'maskDataRaw'];
            compression = layer[realMask ? 'realMaskDataRawCompression' : 'maskDataRawCompression'];
        }
        else if (options.compress) {
            buffer = writeDataZipWithoutPrediction(imageData, [0]);
            compression = 2 /* Compression.ZipWithoutPrediction */;
        }
        else {
            buffer = writeDataRLE(tempBuffer, imageData, [0], !!options.psb);
            compression = 1 /* Compression.RleCompressed */;
        }
        layerData.channels.push({ channelId: realMask ? -3 /* ChannelID.RealUserMask */ : -2 /* ChannelID.UserMask */, compression: compression, buffer: buffer, length: 2 + buffer.length });
    }
    layerData[realMask ? 'realMask' : 'mask'] = { top: top, left: left, right: right, bottom: bottom };
}
function getChannels(tempBuffer, layer, background, options) {
    var layerData = getLayerChannels(tempBuffer, layer, background, options);
    if (layer.mask)
        getMaskChannels(tempBuffer, layerData, layer, layer.mask, options, false);
    if (layer.realMask)
        getMaskChannels(tempBuffer, layerData, layer, layer.realMask, options, true);
    return layerData;
}
function getLayerDimentions(_a) {
    var canvas = _a.canvas, imageData = _a.imageData;
    return imageData || canvas || { width: 0, height: 0 };
}
function cropImageData(data, left, top, width, height) {
    if (data.data instanceof Uint32Array || data.data instanceof Uint16Array) {
        throw new Error('imageData has incorrect bit depth');
    }
    var croppedData = createImageData(width, height);
    var srcData = data.data;
    var dstData = croppedData.data;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var src = ((x + left) + (y + top) * data.width) * 4;
            var dst = (x + y * width) * 4;
            dstData[dst] = srcData[src];
            dstData[dst + 1] = srcData[src + 1];
            dstData[dst + 2] = srcData[src + 2];
            dstData[dst + 3] = srcData[src + 3];
        }
    }
    return croppedData;
}
function getLayerChannels(tempBuffer, layer, background, options) {
    var _a;
    var top = layer.top | 0;
    var left = layer.left | 0;
    var right = layer.right | 0;
    var bottom = layer.bottom | 0;
    var channels = [
        { channelId: -1 /* ChannelID.Transparency */, compression: 0 /* Compression.RawData */, buffer: undefined, length: 2 },
        { channelId: 0 /* ChannelID.Color0 */, compression: 0 /* Compression.RawData */, buffer: undefined, length: 2 },
        { channelId: 1 /* ChannelID.Color1 */, compression: 0 /* Compression.RawData */, buffer: undefined, length: 2 },
        { channelId: 2 /* ChannelID.Color2 */, compression: 0 /* Compression.RawData */, buffer: undefined, length: 2 },
    ];
    var _b = getLayerDimentions(layer), width = _b.width, height = _b.height;
    if (!(layer.canvas || layer.imageData) || !width || !height) {
        right = left;
        bottom = top;
        return { layer: layer, top: top, left: left, right: right, bottom: bottom, channels: channels };
    }
    right = left + width;
    bottom = top + height;
    var data = layer.imageData || layer.canvas.getContext('2d').getImageData(0, 0, width, height);
    if (options.trimImageData) {
        var trimmed = trimData(data);
        if (trimmed.left !== 0 || trimmed.top !== 0 || trimmed.right !== data.width || trimmed.bottom !== data.height) {
            left += trimmed.left;
            top += trimmed.top;
            right -= (data.width - trimmed.right);
            bottom -= (data.height - trimmed.bottom);
            width = right - left;
            height = bottom - top;
            if (!width || !height)
                return { layer: layer, top: top, left: left, right: right, bottom: bottom, channels: channels };
            data = cropImageData(data, trimmed.left, trimmed.top, width, height);
        }
    }
    var channelIds = [
        0 /* ChannelID.Color0 */,
        1 /* ChannelID.Color1 */,
        2 /* ChannelID.Color2 */,
    ];
    if (!background || options.noBackground || layer.mask || hasAlpha(data) || (RAW_IMAGE_DATA && ((_a = layer.imageDataRaw) === null || _a === void 0 ? void 0 : _a['-1']))) {
        channelIds.unshift(-1 /* ChannelID.Transparency */);
    }
    channels = channelIds.map(function (channelId) {
        var offset = offsetForChannel(channelId, false); // TODO: psd.colorMode === ColorMode.CMYK);
        var buffer;
        var compression;
        if (RAW_IMAGE_DATA && layer.imageDataRaw) {
            // console.log('written raw layer image data');
            buffer = layer.imageDataRaw[channelId];
            compression = layer.imageDataRawCompression[channelId];
        }
        else if (options.compress) {
            buffer = writeDataZipWithoutPrediction(data, [offset]);
            compression = 2 /* Compression.ZipWithoutPrediction */;
        }
        else {
            buffer = writeDataRLE(tempBuffer, data, [offset], !!options.psb);
            compression = 1 /* Compression.RleCompressed */;
        }
        return { channelId: channelId, compression: compression, buffer: buffer, length: 2 + buffer.length };
    });
    return { layer: layer, top: top, left: left, right: right, bottom: bottom, channels: channels };
}
function isRowEmpty(_a, y, left, right) {
    var data = _a.data, width = _a.width;
    var start = ((y * width + left) * 4 + 3) | 0;
    var end = (start + (right - left) * 4) | 0;
    for (var i = start; i < end; i = (i + 4) | 0) {
        if (data[i] !== 0) {
            return false;
        }
    }
    return true;
}
function isColEmpty(_a, x, top, bottom) {
    var data = _a.data, width = _a.width;
    var stride = (width * 4) | 0;
    var start = (top * stride + x * 4 + 3) | 0;
    for (var y = top, i = start; y < bottom; y++, i = (i + stride) | 0) {
        if (data[i] !== 0) {
            return false;
        }
    }
    return true;
}
function trimData(data) {
    var top = 0;
    var left = 0;
    var right = data.width;
    var bottom = data.height;
    while (top < bottom && isRowEmpty(data, top, left, right))
        top++;
    while (bottom > top && isRowEmpty(data, bottom - 1, left, right))
        bottom--;
    while (left < right && isColEmpty(data, left, top, bottom))
        left++;
    while (right > left && isColEmpty(data, right - 1, top, bottom))
        right--;
    return { top: top, left: left, right: right, bottom: bottom };
}
export function writeColor(writer, color) {
    if (!color) {
        writeUint16(writer, 0 /* ColorSpace.RGB */);
        writeZeros(writer, 8);
    }
    else if ('r' in color) {
        writeUint16(writer, 0 /* ColorSpace.RGB */);
        writeUint16(writer, Math.round(color.r * 257));
        writeUint16(writer, Math.round(color.g * 257));
        writeUint16(writer, Math.round(color.b * 257));
        writeUint16(writer, 0);
    }
    else if ('fr' in color) {
        writeUint16(writer, 0 /* ColorSpace.RGB */);
        writeUint16(writer, Math.round(color.fr * 255 * 257));
        writeUint16(writer, Math.round(color.fg * 255 * 257));
        writeUint16(writer, Math.round(color.fb * 255 * 257));
        writeUint16(writer, 0);
    }
    else if ('l' in color) {
        writeUint16(writer, 7 /* ColorSpace.Lab */);
        writeInt16(writer, Math.round(color.l * 10000));
        writeInt16(writer, Math.round(color.a < 0 ? (color.a * 12800) : (color.a * 12700)));
        writeInt16(writer, Math.round(color.b < 0 ? (color.b * 12800) : (color.b * 12700)));
        writeUint16(writer, 0);
    }
    else if ('h' in color) {
        writeUint16(writer, 1 /* ColorSpace.HSB */);
        writeUint16(writer, Math.round(color.h * 0xffff));
        writeUint16(writer, Math.round(color.s * 0xffff));
        writeUint16(writer, Math.round(color.b * 0xffff));
        writeUint16(writer, 0);
    }
    else if ('c' in color) {
        writeUint16(writer, 2 /* ColorSpace.CMYK */);
        writeUint16(writer, Math.round(color.c * 257));
        writeUint16(writer, Math.round(color.m * 257));
        writeUint16(writer, Math.round(color.y * 257));
        writeUint16(writer, Math.round(color.k * 257));
    }
    else {
        writeUint16(writer, 8 /* ColorSpace.Grayscale */);
        writeUint16(writer, Math.round(color.k * 10000 / 255));
        writeZeros(writer, 6);
    }
}
//# sourceMappingURL=psdWriter.js.map