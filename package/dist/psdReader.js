"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPattern = exports.readColor = exports.readSection = exports.readDataRLE = exports.readDataZip = exports.createImageDataBitDepth = exports.readAdditionalLayerInfo = exports.readGlobalLayerMaskInfo = exports.readData = exports.readLayerInfo = exports.readPsd = exports.checkSignature = exports.skipBytes = exports.readAsciiString = exports.readUnicodeStringWithLengthLE = exports.readUnicodeStringWithLength = exports.readUnicodeString = exports.readPascalString = exports.validSignatureAt = exports.readSignature = exports.readBytes = exports.readFixedPointPath32 = exports.readFixedPoint32 = exports.readFloat64 = exports.readFloat32 = exports.readUint32 = exports.readInt32LE = exports.readInt32 = exports.readUint16LE = exports.readUint16 = exports.readInt16 = exports.peekUint8 = exports.readUint8 = exports.warnOrThrow = exports.createReader = exports.supportedColorModes = void 0;
var pako_1 = require("pako");
var helpers_1 = require("./helpers");
var additionalInfo_1 = require("./additionalInfo");
var imageResources_1 = require("./imageResources");
exports.supportedColorModes = [0 /* ColorMode.Bitmap */, 1 /* ColorMode.Grayscale */, 3 /* ColorMode.RGB */, 2 /* ColorMode.Indexed */];
var colorModes = ['bitmap', 'grayscale', 'indexed', 'RGB', 'CMYK', 'multichannel', 'duotone', 'lab'];
function setupGrayscale(data) {
    var size = data.width * data.height * 4;
    for (var i = 0; i < size; i += 4) {
        data.data[i + 1] = data.data[i];
        data.data[i + 2] = data.data[i];
    }
}
function createReader(buffer, offset, length) {
    var view = new DataView(buffer, offset, length);
    return { view: view, offset: 0, strict: false, debug: false, large: false, globalAlpha: false, log: console.log };
}
exports.createReader = createReader;
function warnOrThrow(reader, message) {
    if (reader.strict)
        throw new Error(message);
    if (reader.debug)
        reader.log(message);
}
exports.warnOrThrow = warnOrThrow;
function readUint8(reader) {
    reader.offset += 1;
    return reader.view.getUint8(reader.offset - 1);
}
exports.readUint8 = readUint8;
function peekUint8(reader) {
    return reader.view.getUint8(reader.offset);
}
exports.peekUint8 = peekUint8;
function readInt16(reader) {
    reader.offset += 2;
    return reader.view.getInt16(reader.offset - 2, false);
}
exports.readInt16 = readInt16;
function readUint16(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, false);
}
exports.readUint16 = readUint16;
function readUint16LE(reader) {
    reader.offset += 2;
    return reader.view.getUint16(reader.offset - 2, true);
}
exports.readUint16LE = readUint16LE;
function readInt32(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, false);
}
exports.readInt32 = readInt32;
function readInt32LE(reader) {
    reader.offset += 4;
    return reader.view.getInt32(reader.offset - 4, true);
}
exports.readInt32LE = readInt32LE;
function readUint32(reader) {
    reader.offset += 4;
    return reader.view.getUint32(reader.offset - 4, false);
}
exports.readUint32 = readUint32;
function readFloat32(reader) {
    reader.offset += 4;
    return reader.view.getFloat32(reader.offset - 4, false);
}
exports.readFloat32 = readFloat32;
function readFloat64(reader) {
    reader.offset += 8;
    return reader.view.getFloat64(reader.offset - 8, false);
}
exports.readFloat64 = readFloat64;
// 32-bit fixed-point number 16.16
function readFixedPoint32(reader) {
    return readInt32(reader) / (1 << 16);
}
exports.readFixedPoint32 = readFixedPoint32;
// 32-bit fixed-point number 8.24
function readFixedPointPath32(reader) {
    return readInt32(reader) / (1 << 24);
}
exports.readFixedPointPath32 = readFixedPointPath32;
function readBytes(reader, length) {
    var start = reader.view.byteOffset + reader.offset;
    reader.offset += length;
    if ((start + length) > reader.view.buffer.byteLength) {
        // fix for broken PSD files that are missing part of file at the end
        warnOrThrow(reader, 'Reading bytes exceeding buffer length');
        if (length > (100 * 1024 * 1024))
            throw new Error('Reading past end of file'); // limit to 100MB
        var result = new Uint8Array(length);
        var len = Math.min(length, reader.view.byteLength - start);
        if (len > 0)
            result.set(new Uint8Array(reader.view.buffer, start, len));
        return result;
    }
    else {
        return new Uint8Array(reader.view.buffer, start, length);
    }
}
exports.readBytes = readBytes;
function readSignature(reader) {
    return readShortString(reader, 4);
}
exports.readSignature = readSignature;
function validSignatureAt(reader, offset) {
    var sig = String.fromCharCode(reader.view.getUint8(offset))
        + String.fromCharCode(reader.view.getUint8(offset + 1))
        + String.fromCharCode(reader.view.getUint8(offset + 2))
        + String.fromCharCode(reader.view.getUint8(offset + 3));
    return sig == '8BIM' || sig == '8B64';
}
exports.validSignatureAt = validSignatureAt;
function readPascalString(reader, padTo) {
    var length = readUint8(reader);
    var text = length ? readShortString(reader, length) : '';
    while (++length % padTo) { // starts with length + 1 so we count the size byte too
        reader.offset++;
    }
    return text;
}
exports.readPascalString = readPascalString;
function readUnicodeString(reader) {
    var length = readUint32(reader);
    return readUnicodeStringWithLength(reader, length);
}
exports.readUnicodeString = readUnicodeString;
function readUnicodeStringWithLength(reader, length) {
    var text = '';
    while (length--) {
        var value = readUint16(reader);
        if (value || length > 0) { // remove trailing \0
            text += String.fromCharCode(value);
        }
    }
    return text;
}
exports.readUnicodeStringWithLength = readUnicodeStringWithLength;
function readUnicodeStringWithLengthLE(reader, length) {
    var text = '';
    while (length--) {
        var value = readUint16LE(reader);
        if (value || length > 0) { // remove trailing \0
            text += String.fromCharCode(value);
        }
    }
    return text;
}
exports.readUnicodeStringWithLengthLE = readUnicodeStringWithLengthLE;
function readAsciiString(reader, length) {
    var text = '';
    while (length--) {
        text += String.fromCharCode(readUint8(reader));
    }
    return text;
}
exports.readAsciiString = readAsciiString;
function skipBytes(reader, count) {
    reader.offset += count;
}
exports.skipBytes = skipBytes;
function checkSignature(reader, a, b) {
    var offset = reader.offset;
    var signature = readSignature(reader);
    if (signature !== a && signature !== b) {
        throw new Error("Invalid signature: '".concat(signature, "' at 0x").concat(offset.toString(16)));
    }
}
exports.checkSignature = checkSignature;
function readShortString(reader, length) {
    var buffer = readBytes(reader, length);
    var result = '';
    for (var i = 0; i < buffer.length; i++) {
        result += String.fromCharCode(buffer[i]);
    }
    return result;
}
function isValidSignature(sig) {
    return sig === '8BIM' || sig === 'MeSa' || sig === 'AgHg' || sig === 'PHUT' || sig === 'DCSR';
}
function readPsd(reader, readOptions) {
    var _a;
    if (readOptions === void 0) { readOptions = {}; }
    // header
    checkSignature(reader, '8BPS');
    var version = readUint16(reader);
    if (version !== 1 && version !== 2)
        throw new Error("Invalid PSD file version: ".concat(version));
    skipBytes(reader, 6);
    var channels = readUint16(reader);
    var height = readUint32(reader);
    var width = readUint32(reader);
    var bitsPerChannel = readUint16(reader);
    var colorMode = readUint16(reader);
    var maxSize = version === 1 ? 30000 : 300000;
    if (width > maxSize || height > maxSize)
        throw new Error("Invalid size: ".concat(width, "x").concat(height));
    if (channels > 16)
        throw new Error("Invalid channel count: ".concat(channels));
    if (![1, 8, 16, 32].includes(bitsPerChannel))
        throw new Error("Invalid bitsPerChannel: ".concat(bitsPerChannel));
    if (exports.supportedColorModes.indexOf(colorMode) === -1)
        throw new Error("Color mode not supported: ".concat((_a = colorModes[colorMode]) !== null && _a !== void 0 ? _a : colorMode));
    var psd = { width: width, height: height, channels: channels, bitsPerChannel: bitsPerChannel, colorMode: colorMode };
    Object.assign(reader, readOptions);
    reader.large = version === 2;
    reader.globalAlpha = false;
    var fixOffsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    // color mode data
    readSection(reader, 1, function (left) {
        if (!left())
            return;
        if (colorMode === 2 /* ColorMode.Indexed */) {
            // should have 256 colors here saved as 8bit channels RGB
            if (left() != 768)
                throw new Error('Invalid color palette size');
            psd.palette = [];
            for (var i = 0; i < 256; i++)
                psd.palette.push({ r: readUint8(reader), g: 0, b: 0 });
            for (var i = 0; i < 256; i++)
                psd.palette[i].g = readUint8(reader);
            for (var i = 0; i < 256; i++)
                psd.palette[i].b = readUint8(reader);
        }
        else {
            // TODO: unknown format for duotone, also seems to have some data here for 32bit colors
            // if (options.throwForMissingFeatures) throw new Error('Color mode data not supported');
        }
        skipBytes(reader, left());
    });
    // image resources
    var imageResources = {};
    readSection(reader, 1, function (left) {
        var _loop_1 = function () {
            var sigOffset = reader.offset;
            var sig = '';
            // attempt to fix broken document by realigning with the signature
            for (var _i = 0, fixOffsets_1 = fixOffsets; _i < fixOffsets_1.length; _i++) {
                var offset = fixOffsets_1[_i];
                try {
                    reader.offset = sigOffset + offset;
                    sig = readSignature(reader);
                }
                catch (_a) { }
                if (isValidSignature(sig))
                    break;
            }
            if (!isValidSignature(sig)) {
                throw new Error("Invalid signature: '".concat(sig, "' at 0x").concat((sigOffset).toString(16)));
            }
            var id = readUint16(reader);
            readPascalString(reader, 2); // name
            readSection(reader, 2, function (left) {
                var handler = imageResources_1.resourceHandlersMap[id];
                var skip = id === 1036 && !!reader.skipThumbnail;
                if (handler && !skip) {
                    try {
                        handler.read(reader, imageResources, left);
                    }
                    catch (e) {
                        if (reader.throwForMissingFeatures)
                            throw e;
                        skipBytes(reader, left());
                    }
                }
                else {
                    // options.logMissingFeatures && console.log(`Unhandled image resource: ${id} (${left()})`);
                    skipBytes(reader, left());
                }
            });
        };
        while (left() > 0) {
            _loop_1();
        }
    });
    var layersGroup = imageResources.layersGroup, layerGroupsEnabledId = imageResources.layerGroupsEnabledId, rest = __rest(imageResources, ["layersGroup", "layerGroupsEnabledId"]);
    if (Object.keys(rest)) {
        psd.imageResources = rest;
    }
    // layer and mask info
    readSection(reader, 1, function (left) {
        readSection(reader, 2, function (left) {
            readLayerInfo(reader, psd, imageResources);
            skipBytes(reader, left());
        }, undefined, reader.large);
        // SAI does not include this section
        if (left() > 0) {
            var globalLayerMaskInfo = readGlobalLayerMaskInfo(reader);
            if (globalLayerMaskInfo)
                psd.globalLayerMaskInfo = globalLayerMaskInfo;
        }
        else {
            // revert back to end of section if exceeded section limits
            // opt.logMissingFeatures && console.log('reverting to end of section');
            skipBytes(reader, left());
        }
        while (left() > 0) {
            // sometimes there are empty bytes here
            while (left() && peekUint8(reader) === 0) {
                // opt.logMissingFeatures && console.log('skipping 0 byte');
                skipBytes(reader, 1);
            }
            if (left() >= 12) {
                readAdditionalLayerInfo(reader, psd, psd, imageResources);
            }
            else {
                // opt.logMissingFeatures && console.log('skipping leftover bytes', left());
                skipBytes(reader, left());
            }
        }
    }, undefined, reader.large);
    var hasChildren = psd.children && psd.children.length;
    var skipComposite = reader.skipCompositeImageData && (reader.skipLayerImageData || hasChildren);
    if (!skipComposite) {
        readImageData(reader, psd);
    }
    // TODO: show converted color mode instead of original PSD file color mode
    //       but add option to preserve file color mode (need to return image data instead of canvas in that case)
    // psd.colorMode = ColorMode.RGB; // we convert all color modes to RGB
    return psd;
}
exports.readPsd = readPsd;
function readLayerInfo(reader, psd, imageResources) {
    var _a, _b;
    var _c = imageResources.layersGroup, layersGroup = _c === void 0 ? [] : _c, _d = imageResources.layerGroupsEnabledId, layerGroupsEnabledId = _d === void 0 ? [] : _d;
    var layerCount = readInt16(reader);
    if (layerCount < 0) {
        reader.globalAlpha = true;
        layerCount = -layerCount;
    }
    var layers = [];
    var layerChannels = [];
    for (var i = 0; i < layerCount; i++) {
        var _e = readLayerRecord(reader, psd, imageResources), layer = _e.layer, channels = _e.channels;
        if (layersGroup[i] !== undefined)
            layer.linkGroup = layersGroup[i];
        if (layerGroupsEnabledId[i] !== undefined)
            layer.linkGroupEnabled = !!layerGroupsEnabledId[i];
        layers.push(layer);
        layerChannels.push(channels);
    }
    if (!reader.skipLayerImageData) {
        for (var i = 0; i < layerCount; i++) {
            readLayerChannelImageData(reader, psd, layers[i], layerChannels[i]);
        }
    }
    if (!psd.children)
        psd.children = [];
    var stack = [psd];
    for (var i = layers.length - 1; i >= 0; i--) {
        var l = layers[i];
        var type = l.sectionDivider ? l.sectionDivider.type : 0 /* SectionDividerType.Other */;
        if (type === 1 /* SectionDividerType.OpenFolder */ || type === 2 /* SectionDividerType.ClosedFolder */) {
            l.opened = type === 1 /* SectionDividerType.OpenFolder */;
            l.children = [];
            if ((_a = l.sectionDivider) === null || _a === void 0 ? void 0 : _a.key) {
                l.blendMode = (_b = helpers_1.toBlendMode[l.sectionDivider.key]) !== null && _b !== void 0 ? _b : l.blendMode;
            }
            stack[stack.length - 1].children.unshift(l);
            stack.push(l);
        }
        else if (type === 3 /* SectionDividerType.BoundingSectionDivider */) {
            stack.pop();
            // this was workaround because I didn't know what `lsdk` section was, now it's probably not needed anymore
            // } else if (l.name === '</Layer group>' && !l.sectionDivider && !l.top && !l.left && !l.bottom && !l.right) {
            // 	// sometimes layer group terminator doesn't have sectionDivider, so we just guess here (PS bug ?)
            // 	stack.pop();
        }
        else {
            stack[stack.length - 1].children.unshift(l);
        }
    }
}
exports.readLayerInfo = readLayerInfo;
function readLayerRecord(reader, psd, imageResources) {
    var layer = {};
    layer.top = readInt32(reader);
    layer.left = readInt32(reader);
    layer.bottom = readInt32(reader);
    layer.right = readInt32(reader);
    var channelCount = readUint16(reader);
    var channels = [];
    for (var i = 0; i < channelCount; i++) {
        var id = readInt16(reader);
        var length_1 = readUint32(reader);
        if (reader.large) {
            if (length_1 !== 0)
                throw new Error('Sizes larger than 4GB are not supported');
            length_1 = readUint32(reader);
        }
        channels.push({ id: id, length: length_1 });
    }
    checkSignature(reader, '8BIM');
    var blendMode = readSignature(reader);
    if (!helpers_1.toBlendMode[blendMode])
        throw new Error("Invalid blend mode: '".concat(blendMode, "'"));
    layer.blendMode = helpers_1.toBlendMode[blendMode];
    layer.opacity = readUint8(reader) / 0xff;
    layer.clipping = readUint8(reader) === 1;
    var flags = readUint8(reader);
    layer.transparencyProtected = (flags & 0x01) !== 0;
    layer.hidden = (flags & 0x02) !== 0;
    if (flags & 0x20)
        layer.effectsOpen = true;
    // 0x04 - obsolete
    // 0x08 - 1 for Photoshop 5.0 and later, tells if bit 4 has useful information
    // 0x10 - pixel data irrelevant to appearance of document
    // 0x20 - effects/filters panel is expanded
    skipBytes(reader, 1);
    readSection(reader, 1, function (left) {
        readLayerMaskData(reader, layer);
        var blendingRanges = readLayerBlendingRanges(reader);
        if (blendingRanges)
            layer.blendingRanges = blendingRanges;
        layer.name = readPascalString(reader, 1); // should be padded to 4, but is not sometimes
        // HACK: fix for sometimes layer.name string not being padded correctly, just skip until we get valid signature
        while (left() > 4 && !validSignatureAt(reader, reader.offset))
            reader.offset++;
        while (left() >= 12)
            readAdditionalLayerInfo(reader, layer, psd, imageResources);
        skipBytes(reader, left());
    });
    return { layer: layer, channels: channels };
}
function readLayerMaskData(reader, layer) {
    return readSection(reader, 1, function (left) {
        if (!left())
            return undefined;
        var mask = {};
        layer.mask = mask;
        mask.top = readInt32(reader);
        mask.left = readInt32(reader);
        mask.bottom = readInt32(reader);
        mask.right = readInt32(reader);
        mask.defaultColor = readUint8(reader);
        var flags = readUint8(reader);
        mask.positionRelativeToLayer = (flags & 1 /* LayerMaskFlags.PositionRelativeToLayer */) !== 0;
        mask.disabled = (flags & 2 /* LayerMaskFlags.LayerMaskDisabled */) !== 0;
        mask.fromVectorData = (flags & 8 /* LayerMaskFlags.LayerMaskFromRenderingOtherData */) !== 0;
        if (left() >= 18) {
            var realMask = {};
            layer.realMask = realMask;
            var realFlags = readUint8(reader);
            realMask.positionRelativeToLayer = (realFlags & 1 /* LayerMaskFlags.PositionRelativeToLayer */) !== 0;
            realMask.disabled = (realFlags & 2 /* LayerMaskFlags.LayerMaskDisabled */) !== 0;
            realMask.fromVectorData = (realFlags & 8 /* LayerMaskFlags.LayerMaskFromRenderingOtherData */) !== 0;
            realMask.defaultColor = readUint8(reader); // Real user mask background. 0 or 255.
            realMask.top = readInt32(reader);
            realMask.left = readInt32(reader);
            realMask.bottom = readInt32(reader);
            realMask.right = readInt32(reader);
        }
        if (flags & 16 /* LayerMaskFlags.MaskHasParametersAppliedToIt */) {
            var params = readUint8(reader);
            if (params & 1 /* MaskParams.UserMaskDensity */)
                mask.userMaskDensity = readUint8(reader) / 0xff;
            if (params & 2 /* MaskParams.UserMaskFeather */)
                mask.userMaskFeather = readFloat64(reader);
            if (params & 4 /* MaskParams.VectorMaskDensity */)
                mask.vectorMaskDensity = readUint8(reader) / 0xff;
            if (params & 8 /* MaskParams.VectorMaskFeather */)
                mask.vectorMaskFeather = readFloat64(reader);
        }
        skipBytes(reader, left());
    });
}
function readBlendingRange(reader) {
    return [readUint8(reader), readUint8(reader), readUint8(reader), readUint8(reader)];
}
function readLayerBlendingRanges(reader) {
    return readSection(reader, 1, function (left) {
        var compositeGrayBlendSource = readBlendingRange(reader);
        var compositeGraphBlendDestinationRange = readBlendingRange(reader);
        var ranges = [];
        while (left() > 0) {
            var sourceRange = readBlendingRange(reader);
            var destRange = readBlendingRange(reader);
            ranges.push({ sourceRange: sourceRange, destRange: destRange });
        }
        return { compositeGrayBlendSource: compositeGrayBlendSource, compositeGraphBlendDestinationRange: compositeGraphBlendDestinationRange, ranges: ranges };
    });
}
function readLayerChannelImageData(reader, psd, layer, channels) {
    var _a, _b, _c, _d;
    var layerWidth = (layer.right || 0) - (layer.left || 0);
    var layerHeight = (layer.bottom || 0) - (layer.top || 0);
    var cmyk = psd.colorMode === 4 /* ColorMode.CMYK */;
    var imageData;
    if (layerWidth && layerHeight) {
        if (cmyk) {
            if (psd.bitsPerChannel !== 8)
                throw new Error('bitsPerChannel Not supproted');
            imageData = { width: layerWidth, height: layerHeight, data: new Uint8ClampedArray(layerWidth * layerHeight * 5) };
            for (var p = 4; p < imageData.data.byteLength; p += 5)
                imageData.data[p] = 255;
        }
        else {
            imageData = createImageDataBitDepth(layerWidth, layerHeight, (_a = psd.bitsPerChannel) !== null && _a !== void 0 ? _a : 8);
            (0, helpers_1.resetImageData)(imageData);
        }
    }
    if (helpers_1.RAW_IMAGE_DATA) {
        layer.imageDataRaw = [];
        layer.imageDataRawCompression = [];
    }
    for (var _i = 0, channels_1 = channels; _i < channels_1.length; _i++) {
        var channel = channels_1[_i];
        if (channel.length === 0)
            continue;
        if (channel.length < 2)
            throw new Error('Invalid channel length');
        var start = reader.offset;
        var compression = readUint16(reader);
        // try to fix broken files where there's 1 byte shift of channel
        if (compression > 3) {
            reader.offset -= 1;
            compression = readUint16(reader);
        }
        // try to fix broken files where there's 1 byte shift of channel
        if (compression > 3) {
            reader.offset -= 3;
            compression = readUint16(reader);
        }
        if (compression > 3)
            throw new Error("Invalid compression: ".concat(compression));
        if (channel.id === -2 /* ChannelID.UserMask */ || channel.id === -3 /* ChannelID.RealUserMask */) {
            var mask = channel.id === -2 /* ChannelID.UserMask */ ? layer.mask : layer.realMask;
            if (!mask)
                throw new Error("Missing layer ".concat(channel.id === -2 /* ChannelID.UserMask */ ? 'mask' : 'real mask', " data"));
            var maskWidth = (mask.right || 0) - (mask.left || 0);
            var maskHeight = (mask.bottom || 0) - (mask.top || 0);
            if (maskWidth < 0 || maskHeight < 0 || maskWidth > 30000 || maskHeight > 30000)
                throw new Error('Invalid mask size');
            if (maskWidth && maskHeight) {
                var maskData = createImageDataBitDepth(maskWidth, maskHeight, (_b = psd.bitsPerChannel) !== null && _b !== void 0 ? _b : 8);
                (0, helpers_1.resetImageData)(maskData);
                var start_1 = reader.offset;
                readData(reader, channel.length, maskData, compression, maskWidth, maskHeight, (_c = psd.bitsPerChannel) !== null && _c !== void 0 ? _c : 8, 0, reader.large, 4);
                if (helpers_1.RAW_IMAGE_DATA) {
                    if (channel.id === -2 /* ChannelID.UserMask */) {
                        layer.maskDataRawCompression = compression;
                        layer.maskDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start_1, reader.offset - start_1);
                    }
                    else {
                        layer.realMaskDataRawCompression = compression;
                        layer.realMaskDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start_1, reader.offset - start_1);
                    }
                }
                setupGrayscale(maskData);
                if (reader.useImageData) {
                    mask.imageData = maskData;
                }
                else {
                    mask.canvas = (0, helpers_1.imageDataToCanvas)(maskData);
                }
            }
        }
        else {
            var offset = (0, helpers_1.offsetForChannel)(channel.id, cmyk);
            var targetData = imageData;
            if (offset < 0) {
                targetData = undefined;
                if (reader.throwForMissingFeatures) {
                    throw new Error("Channel not supported: ".concat(channel.id));
                }
            }
            readData(reader, channel.length, targetData, compression, layerWidth, layerHeight, (_d = psd.bitsPerChannel) !== null && _d !== void 0 ? _d : 8, offset, reader.large, cmyk ? 5 : 4);
            if (helpers_1.RAW_IMAGE_DATA) {
                layer.imageDataRawCompression[channel.id] = compression;
                layer.imageDataRaw[channel.id] = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start + 2, channel.length - 2);
            }
            reader.offset = start + channel.length;
            if (targetData && psd.colorMode === 1 /* ColorMode.Grayscale */) {
                setupGrayscale(targetData);
            }
        }
    }
    if (imageData) {
        if (cmyk) {
            var cmykData = imageData;
            imageData = (0, helpers_1.createImageData)(cmykData.width, cmykData.height);
            cmykToRgb(cmykData, imageData, false);
        }
        if (reader.useImageData) {
            layer.imageData = imageData;
        }
        else {
            layer.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
        }
    }
}
function readData(reader, length, data, compression, width, height, bitDepth, offset, large, step) {
    if (compression === 0 /* Compression.RawData */) {
        readDataRaw(reader, data, width, height, bitDepth, step, offset);
    }
    else if (compression === 1 /* Compression.RleCompressed */) {
        readDataRLE(reader, data, width, height, bitDepth, step, [offset], large);
    }
    else if (compression === 2 /* Compression.ZipWithoutPrediction */) {
        readDataZip(reader, length, data, width, height, bitDepth, step, offset, false);
    }
    else if (compression === 3 /* Compression.ZipWithPrediction */) {
        readDataZip(reader, length, data, width, height, bitDepth, step, offset, true);
    }
    else {
        throw new Error("Invalid Compression type: ".concat(compression));
    }
}
exports.readData = readData;
function readGlobalLayerMaskInfo(reader) {
    return readSection(reader, 1, function (left) {
        if (!left())
            return undefined;
        var overlayColorSpace = readUint16(reader);
        var colorSpace1 = readUint16(reader);
        var colorSpace2 = readUint16(reader);
        var colorSpace3 = readUint16(reader);
        var colorSpace4 = readUint16(reader);
        var opacity = readUint16(reader) / 0xff;
        var kind = readUint8(reader);
        skipBytes(reader, left()); // 3 bytes of padding ?
        return { overlayColorSpace: overlayColorSpace, colorSpace1: colorSpace1, colorSpace2: colorSpace2, colorSpace3: colorSpace3, colorSpace4: colorSpace4, opacity: opacity, kind: kind };
    });
}
exports.readGlobalLayerMaskInfo = readGlobalLayerMaskInfo;
function readAdditionalLayerInfo(reader, target, psd, imageResources) {
    var sig = readSignature(reader);
    if (sig !== '8BIM' && sig !== '8B64')
        throw new Error("Invalid signature: '".concat(sig, "' at 0x").concat((reader.offset - 4).toString(16)));
    var key = readSignature(reader);
    // `largeAdditionalInfoKeys` fallback, because some keys don't have 8B64 signature even when they are 64bit
    var u64 = sig === '8B64' || (reader.large && helpers_1.largeAdditionalInfoKeys.indexOf(key) !== -1);
    readSection(reader, 2, function (left) {
        var handler = additionalInfo_1.infoHandlersMap[key];
        if (handler) {
            try {
                handler.read(reader, target, left, psd, imageResources);
            }
            catch (e) {
                if (reader.throwForMissingFeatures)
                    throw e;
            }
        }
        else {
            reader.logMissingFeatures && reader.log("Unhandled additional info: ".concat(key));
            skipBytes(reader, left());
        }
        if (left()) {
            reader.logMissingFeatures && reader.log("Unread ".concat(left(), " bytes left for additional info: ").concat(key));
            skipBytes(reader, left());
        }
    }, false, u64);
}
exports.readAdditionalLayerInfo = readAdditionalLayerInfo;
function createImageDataBitDepth(width, height, bitDepth, channels) {
    if (channels === void 0) { channels = 4; }
    if (bitDepth === 1 || bitDepth === 8) {
        if (channels === 4) {
            return (0, helpers_1.createImageData)(width, height);
        }
        else {
            return { width: width, height: height, data: new Uint8ClampedArray(width * height * channels) };
        }
    }
    else if (bitDepth === 16) {
        return { width: width, height: height, data: new Uint16Array(width * height * channels) };
    }
    else if (bitDepth === 32) {
        return { width: width, height: height, data: new Float32Array(width * height * channels) };
    }
    else {
        throw new Error("Invalid bitDepth (".concat(bitDepth, ")"));
    }
}
exports.createImageDataBitDepth = createImageDataBitDepth;
function readImageData(reader, psd) {
    var _a;
    var compression = readUint16(reader);
    var bitsPerChannel = (_a = psd.bitsPerChannel) !== null && _a !== void 0 ? _a : 8;
    if (exports.supportedColorModes.indexOf(psd.colorMode) === -1)
        throw new Error("Color mode not supported: ".concat(psd.colorMode));
    if (compression !== 0 /* Compression.RawData */ && compression !== 1 /* Compression.RleCompressed */)
        throw new Error("Compression type not supported: ".concat(compression));
    var imageData = createImageDataBitDepth(psd.width, psd.height, bitsPerChannel);
    (0, helpers_1.resetImageData)(imageData);
    switch (psd.colorMode) {
        case 0 /* ColorMode.Bitmap */: {
            if (bitsPerChannel !== 1)
                throw new Error('Invalid bitsPerChannel for bitmap color mode');
            var bytes = void 0;
            if (compression === 0 /* Compression.RawData */) {
                bytes = readBytes(reader, Math.ceil(psd.width / 8) * psd.height);
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                bytes = new Uint8Array(psd.width * psd.height);
                readDataRLE(reader, { data: bytes, width: psd.width, height: psd.height }, psd.width, psd.height, 8, 1, [0], reader.large);
            }
            else {
                throw new Error("Bitmap compression not supported: ".concat(compression));
            }
            (0, helpers_1.decodeBitmap)(bytes, imageData.data, psd.width, psd.height);
            break;
        }
        case 3 /* ColorMode.RGB */:
        case 1 /* ColorMode.Grayscale */: {
            var channels = psd.colorMode === 1 /* ColorMode.Grayscale */ ? [0] : [0, 1, 2];
            if (psd.channels && psd.channels > 3) {
                for (var i = 3; i < psd.channels; i++) {
                    // TODO: store these channels in additional image data
                    channels.push(i);
                }
            }
            else if (reader.globalAlpha) {
                channels.push(3);
            }
            if (compression === 0 /* Compression.RawData */) {
                for (var i = 0; i < channels.length; i++) {
                    readDataRaw(reader, imageData, psd.width, psd.height, bitsPerChannel, 4, channels[i]);
                }
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                var start = reader.offset;
                readDataRLE(reader, imageData, psd.width, psd.height, bitsPerChannel, 4, channels, reader.large);
                if (helpers_1.RAW_IMAGE_DATA)
                    psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            if (psd.colorMode === 1 /* ColorMode.Grayscale */) {
                setupGrayscale(imageData);
            }
            break;
        }
        case 2 /* ColorMode.Indexed */: {
            if (bitsPerChannel !== 8)
                throw new Error('bitsPerChannel Not supproted');
            if (psd.channels !== 1)
                throw new Error('Invalid channel count');
            if (!psd.palette)
                throw new Error('Missing color palette');
            if (compression === 0 /* Compression.RawData */) {
                throw new Error("Not implemented");
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                var indexedImageData = {
                    width: imageData.width,
                    height: imageData.height,
                    data: new Uint8Array(imageData.width * imageData.height),
                };
                readDataRLE(reader, indexedImageData, psd.width, psd.height, bitsPerChannel, 1, [0], reader.large);
                indexedToRgb(indexedImageData, imageData, psd.palette);
            }
            else {
                throw new Error("Not implemented");
            }
            break;
        }
        case 4 /* ColorMode.CMYK */: {
            if (bitsPerChannel !== 8)
                throw new Error('bitsPerChannel Not supproted');
            if (psd.channels !== 4)
                throw new Error("Invalid channel count");
            var channels = [0, 1, 2, 3];
            if (reader.globalAlpha)
                channels.push(4);
            if (compression === 0 /* Compression.RawData */) {
                throw new Error("Not implemented");
                // TODO: ...
                // for (let i = 0; i < channels.length; i++) {
                // 	readDataRaw(reader, imageData, channels[i], psd.width, psd.height);
                // }
            }
            else if (compression === 1 /* Compression.RleCompressed */) {
                var cmykImageData = {
                    width: imageData.width,
                    height: imageData.height,
                    data: new Uint8Array(imageData.width * imageData.height * 5),
                };
                var start = reader.offset;
                readDataRLE(reader, cmykImageData, psd.width, psd.height, bitsPerChannel, 5, channels, reader.large);
                cmykToRgb(cmykImageData, imageData, true);
                if (helpers_1.RAW_IMAGE_DATA)
                    psd.imageDataRaw = new Uint8Array(reader.view.buffer, reader.view.byteOffset + start, reader.offset - start);
            }
            else {
                throw new Error("Not implemented");
            }
            break;
        }
        default: throw new Error("Color mode not supported: ".concat(psd.colorMode));
    }
    // remove weird white matte
    if (reader.globalAlpha) {
        if (psd.bitsPerChannel !== 8)
            throw new Error('bitsPerChannel Not supproted');
        var p = imageData.data;
        var size = imageData.width * imageData.height * 4;
        for (var i = 0; i < size; i += 4) {
            var pa = p[i + 3];
            if (pa != 0 && pa != 255) {
                var a = pa / 255;
                var ra = 1 / a;
                var invA = 255 * (1 - ra);
                p[i + 0] = p[i + 0] * ra + invA;
                p[i + 1] = p[i + 1] * ra + invA;
                p[i + 2] = p[i + 2] * ra + invA;
            }
        }
    }
    if (reader.useImageData) {
        psd.imageData = imageData;
    }
    else {
        psd.canvas = (0, helpers_1.imageDataToCanvas)(imageData);
    }
}
function cmykToRgb(cmyk, rgb, reverseAlpha) {
    var size = rgb.width * rgb.height * 4;
    var srcData = cmyk.data;
    var dstData = rgb.data;
    for (var src = 0, dst = 0; dst < size; src += 5, dst += 4) {
        var c = srcData[src];
        var m = srcData[src + 1];
        var y = srcData[src + 2];
        var k = srcData[src + 3];
        dstData[dst] = ((((c * k) | 0) / 255) | 0);
        dstData[dst + 1] = ((((m * k) | 0) / 255) | 0);
        dstData[dst + 2] = ((((y * k) | 0) / 255) | 0);
        dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    }
    // for (let src = 0, dst = 0; dst < size; src += 5, dst += 4) {
    // 	const c = 1 - (srcData[src + 0] / 255);
    // 	const m = 1 - (srcData[src + 1] / 255);
    // 	const y = 1 - (srcData[src + 2] / 255);
    // 	// const k = srcData[src + 3] / 255;
    // 	dstData[dst + 0] = ((1 - c * 0.8) * 255) | 0;
    // 	dstData[dst + 1] = ((1 - m * 0.8) * 255) | 0;
    // 	dstData[dst + 2] = ((1 - y * 0.8) * 255) | 0;
    // 	dstData[dst + 3] = reverseAlpha ? 255 - srcData[src + 4] : srcData[src + 4];
    // }
}
function indexedToRgb(indexed, rgb, palette) {
    var size = indexed.width * indexed.height;
    var srcData = indexed.data;
    var dstData = rgb.data;
    for (var src = 0, dst = 0; src < size; src++, dst += 4) {
        var c = palette[srcData[src]];
        dstData[dst + 0] = c.r;
        dstData[dst + 1] = c.g;
        dstData[dst + 2] = c.b;
        dstData[dst + 3] = 255;
    }
}
function verifyCompatible(a, b) {
    if ((a.byteLength / a.length) !== (b.byteLength / b.length)) {
        throw new Error('Invalid array types');
    }
}
function bytesToArray(bytes, bitDepth) {
    if (bitDepth === 8) {
        return bytes;
    }
    else if (bitDepth === 16) {
        if (bytes.byteOffset % 2) {
            var result = new Uint16Array(bytes.byteLength / 2);
            new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(bytes);
            return result;
        }
        else {
            return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
        }
    }
    else if (bitDepth === 32) {
        if (bytes.byteOffset % 4) {
            var result = new Float32Array(bytes.byteLength / 4);
            new Uint8Array(result.buffer, result.byteOffset, result.byteLength).set(bytes);
            return result;
        }
        else {
            return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
        }
    }
    else {
        throw new Error("Invalid bitDepth (".concat(bitDepth, ")"));
    }
}
function copyChannelToPixelData(pixelData, channel, offset, step) {
    verifyCompatible(pixelData.data, channel);
    var size = pixelData.width * pixelData.height;
    var data = pixelData.data;
    for (var i = 0, p = offset | 0; i < size; i++, p = (p + step) | 0) {
        data[p] = channel[i];
    }
}
function readDataRaw(reader, pixelData, width, height, bitDepth, step, offset) {
    var buffer = readBytes(reader, width * height * Math.floor(bitDepth / 8));
    if (bitDepth == 32) {
        for (var i = 0; i < buffer.byteLength; i += 4) {
            var a = buffer[i + 0];
            var b = buffer[i + 1];
            var c = buffer[i + 2];
            var d = buffer[i + 3];
            buffer[i + 0] = d;
            buffer[i + 1] = c;
            buffer[i + 2] = b;
            buffer[i + 3] = a;
        }
    }
    var array = bytesToArray(buffer, bitDepth);
    if (pixelData && offset < step) {
        copyChannelToPixelData(pixelData, array, offset, step);
    }
}
function decodePredicted(data, width, height, mod) {
    for (var y = 0; y < height; y++) {
        var offset = y * width;
        for (var x = 1, o = offset + 1; x < width; x++, o++) {
            data[o] = (data[o - 1] + data[o]) % mod;
        }
    }
}
function readDataZip(reader, length, pixelData, width, height, bitDepth, step, offset, prediction) {
    var compressed = readBytes(reader, length);
    var decompressed = (0, pako_1.inflate)(compressed);
    if (pixelData && offset < step) {
        var array = bytesToArray(decompressed, bitDepth);
        if (bitDepth === 8) {
            if (prediction)
                decodePredicted(decompressed, width, height, 0x100);
            copyChannelToPixelData(pixelData, decompressed, offset, step);
        }
        else if (bitDepth === 16) {
            if (prediction)
                decodePredicted(array, width, height, 0x10000);
            copyChannelToPixelData(pixelData, array, offset, step);
        }
        else if (bitDepth === 32) {
            if (prediction)
                decodePredicted(decompressed, width * 4, height, 0x100);
            var di = offset;
            var dst = new Uint32Array(pixelData.data.buffer, pixelData.data.byteOffset, pixelData.data.length);
            for (var y = 0; y < height; y++) {
                var a = width * 4 * y;
                for (var x = 0; x < width; x++, a++, di += step) {
                    var b = a + width;
                    var c = b + width;
                    var d = c + width;
                    dst[di] = ((decompressed[a] << 24) | (decompressed[b] << 16) | (decompressed[c] << 8) | decompressed[d]) >>> 0;
                }
            }
        }
        else {
            throw new Error('Invalid bitDepth');
        }
    }
}
exports.readDataZip = readDataZip;
function readDataRLE(reader, pixelData, width, height, bitDepth, step, offsets, large) {
    var data = pixelData && pixelData.data;
    var lengths;
    if (large) {
        lengths = new Uint32Array(offsets.length * height);
        for (var o = 0, li = 0; o < offsets.length; o++) {
            for (var y = 0; y < height; y++, li++) {
                lengths[li] = readUint32(reader);
            }
        }
    }
    else {
        lengths = new Uint16Array(offsets.length * height);
        for (var o = 0, li = 0; o < offsets.length; o++) {
            for (var y = 0; y < height; y++, li++) {
                lengths[li] = readUint16(reader);
            }
        }
    }
    if (bitDepth !== 1 && bitDepth !== 8)
        throw new Error("Invalid bit depth (".concat(bitDepth, ")"));
    var extraLimit = (step - 1) | 0; // 3 for rgb, 4 for cmyk
    for (var c = 0, li = 0; c < offsets.length; c++) {
        var offset = offsets[c] | 0;
        var extra = c > extraLimit || offset > extraLimit;
        if (!data || extra) {
            for (var y = 0; y < height; y++, li++) {
                skipBytes(reader, lengths[li]);
            }
        }
        else {
            for (var y = 0, p = offset | 0; y < height; y++, li++) {
                var length_2 = lengths[li];
                var buffer = readBytes(reader, length_2);
                for (var i = 0, x = 0; i < length_2; i++) {
                    var header = buffer[i];
                    if (header > 128) {
                        var value = buffer[++i];
                        header = (256 - header) | 0;
                        for (var j = 0; j <= header && x < width; j = (j + 1) | 0, x = (x + 1) | 0) {
                            data[p] = value;
                            p = (p + step) | 0;
                        }
                    }
                    else if (header < 128) {
                        for (var j = 0; j <= header && x < width; j = (j + 1) | 0, x = (x + 1) | 0) {
                            data[p] = buffer[++i];
                            p = (p + step) | 0;
                        }
                    }
                    else {
                        // ignore 128
                    }
                    // This showed up on some images from non-photoshop programs, ignoring it seems to work just fine.
                    // if (i >= length) throw new Error(`Invalid RLE data: exceeded buffer size ${i}/${length}`);
                }
            }
        }
    }
}
exports.readDataRLE = readDataRLE;
function readSection(reader, round, func, skipEmpty, eightBytes) {
    if (skipEmpty === void 0) { skipEmpty = true; }
    if (eightBytes === void 0) { eightBytes = false; }
    var length = readUint32(reader);
    if (eightBytes) {
        if (length !== 0)
            throw new Error('Sizes larger than 4GB are not supported');
        length = readUint32(reader);
    }
    if (length <= 0 && skipEmpty)
        return undefined;
    var end = reader.offset + length;
    if (end > reader.view.byteLength)
        throw new Error('Section exceeds file size');
    var result = func(function () { return end - reader.offset; });
    if (reader.offset !== end) {
        if (reader.offset > end) {
            warnOrThrow(reader, 'Exceeded section limits');
        }
        else {
            warnOrThrow(reader, "Unread section data"); // : ${end - reader.offset} bytes at 0x${reader.offset.toString(16)}`);
        }
    }
    while (end % round)
        end++;
    reader.offset = end;
    return result;
}
exports.readSection = readSection;
function readColor(reader) {
    var colorSpace = readUint16(reader);
    switch (colorSpace) {
        case 0 /* ColorSpace.RGB */: {
            var r = readUint16(reader) / 257;
            var g = readUint16(reader) / 257;
            var b = readUint16(reader) / 257;
            skipBytes(reader, 2);
            return { r: r, g: g, b: b };
        }
        case 1 /* ColorSpace.HSB */: {
            var h = readUint16(reader) / 0xffff;
            var s = readUint16(reader) / 0xffff;
            var b = readUint16(reader) / 0xffff;
            skipBytes(reader, 2);
            return { h: h, s: s, b: b };
        }
        case 2 /* ColorSpace.CMYK */: {
            var c = readUint16(reader) / 257;
            var m = readUint16(reader) / 257;
            var y = readUint16(reader) / 257;
            var k = readUint16(reader) / 257;
            return { c: c, m: m, y: y, k: k };
        }
        case 7 /* ColorSpace.Lab */: {
            var l = readInt16(reader) / 10000;
            var ta = readInt16(reader);
            var tb = readInt16(reader);
            var a = ta < 0 ? (ta / 12800) : (ta / 12700);
            var b = tb < 0 ? (tb / 12800) : (tb / 12700);
            skipBytes(reader, 2);
            return { l: l, a: a, b: b };
        }
        case 8 /* ColorSpace.Grayscale */: {
            var k = readUint16(reader) * 255 / 10000;
            skipBytes(reader, 6);
            return { k: k };
        }
        default:
            throw new Error('Invalid color space');
    }
}
exports.readColor = readColor;
function readPattern(reader) {
    readUint32(reader); // length
    var version = readUint32(reader);
    if (version !== 1)
        throw new Error("Invalid pattern version: ".concat(version));
    var colorMode = readUint32(reader);
    var x = readInt16(reader);
    var y = readInt16(reader);
    // we only support RGB and grayscale for now
    if (colorMode !== 3 /* ColorMode.RGB */ && colorMode !== 1 /* ColorMode.Grayscale */ && colorMode !== 2 /* ColorMode.Indexed */) {
        throw new Error("Unsupported pattern color mode: ".concat(colorMode));
    }
    var name = readUnicodeString(reader);
    var id = readPascalString(reader, 1);
    var palette = [];
    if (colorMode === 2 /* ColorMode.Indexed */) {
        for (var i = 0; i < 256; i++) {
            palette.push({
                r: readUint8(reader),
                g: readUint8(reader),
                b: readUint8(reader),
            });
        }
        skipBytes(reader, 4); // no idea what this is
    }
    // virtual memory array list
    var version2 = readUint32(reader);
    if (version2 !== 3)
        throw new Error("Invalid pattern VMAL version: ".concat(version2));
    readUint32(reader); // length
    var top = readUint32(reader);
    var left = readUint32(reader);
    var bottom = readUint32(reader);
    var right = readUint32(reader);
    var channelsCount = readUint32(reader);
    var width = right - left;
    var height = bottom - top;
    var data = new Uint8Array(width * height * 4);
    for (var i = 3; i < data.byteLength; i += 4) {
        data[i] = 255;
    }
    for (var i = 0, ch = 0; i < (channelsCount + 2); i++) {
        var has = readUint32(reader);
        if (!has)
            continue;
        var length_3 = readUint32(reader);
        var pixelDepth = readUint32(reader);
        var ctop = readUint32(reader);
        var cleft = readUint32(reader);
        var cbottom = readUint32(reader);
        var cright = readUint32(reader);
        var pixelDepth2 = readUint16(reader);
        var compressionMode = readUint8(reader); // 0 - raw, 1 - zip
        var dataLength = length_3 - (4 + 16 + 2 + 1);
        var cdata = readBytes(reader, dataLength);
        if (pixelDepth !== 8 || pixelDepth2 !== 8) {
            throw new Error('16bit pixel depth not supported for patterns');
        }
        var w = cright - cleft;
        var h = cbottom - ctop;
        var ox = cleft - left;
        var oy = ctop - top;
        if (compressionMode === 0) {
            if (colorMode === 3 /* ColorMode.RGB */ && ch < 3) {
                for (var y_1 = 0; y_1 < h; y_1++) {
                    for (var x_1 = 0; x_1 < w; x_1++) {
                        var src = x_1 + y_1 * w;
                        var dst = (ox + x_1 + (y_1 + oy) * width) * 4;
                        data[dst + ch] = cdata[src];
                    }
                }
            }
            if (colorMode === 1 /* ColorMode.Grayscale */ && ch < 1) {
                for (var y_2 = 0; y_2 < h; y_2++) {
                    for (var x_2 = 0; x_2 < w; x_2++) {
                        var src = x_2 + y_2 * w;
                        var dst = (ox + x_2 + (y_2 + oy) * width) * 4;
                        var value = cdata[src];
                        data[dst + 0] = value;
                        data[dst + 1] = value;
                        data[dst + 2] = value;
                    }
                }
            }
            if (colorMode === 2 /* ColorMode.Indexed */) {
                // TODO:
                throw new Error('Indexed pattern color mode not implemented');
            }
        }
        else if (compressionMode === 1) {
            // console.log({ colorMode });
            // require('fs').writeFileSync('zip.bin', Buffer.from(cdata));
            // const data = require('zlib').inflateRawSync(cdata);
            // const data = require('zlib').unzipSync(cdata);
            // console.log(data);
            // throw new Error('Zip compression not supported for pattern');
            // throw new Error('Unsupported pattern compression');
            reader.log('Unsupported pattern compression');
            name += ' (failed to decode)';
        }
        else {
            throw new Error('Invalid pattern compression mode');
        }
        ch++;
    }
    // TODO: use canvas instead of data ?
    return { id: id, name: name, x: x, y: y, bounds: { x: left, y: top, w: width, h: height }, data: data };
}
exports.readPattern = readPattern;
//# sourceMappingURL=psdReader.js.map