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
import { toByteArray } from 'base64-js';
import { readUnicodeString, readUint32, readUint16, readUint8, readFloat64, readBytes, skipBytes, readFloat32, readInt16, readFixedPoint32, readSignature, checkSignature, readSection, readColor, readInt32 } from './psdReader';
import { writeUnicodeString, writeUint32, writeUint8, writeFloat64, writeUint16, writeBytes, writeInt16, writeFloat32, writeFixedPoint32, writeUnicodeStringWithPadding, writeColor, writeSignature, writeSection, writeInt32, } from './psdWriter';
import { createCanvasFromData, createEnum, MOCK_HANDLERS } from './helpers';
import { decodeString, encodeString } from './utf8';
import { ESliceBGColorType, ESliceHorzAlign, ESliceOrigin, ESliceType, ESliceVertAlign, frac, parseTrackList, readVersionAndDescriptor, serializeTrackList, writeVersionAndDescriptor } from './descriptor';
export var resourceHandlers = [];
export var resourceHandlersMap = {};
function addHandler(key, has, read, write) {
    var handler = { key: key, has: has, read: read, write: write };
    resourceHandlers.push(handler);
    resourceHandlersMap[handler.key] = handler;
}
var LOG_MOCK_HANDLERS = false;
var RESOLUTION_UNITS = [undefined, 'PPI', 'PPCM'];
var MEASUREMENT_UNITS = [undefined, 'Inches', 'Centimeters', 'Points', 'Picas', 'Columns'];
var hex = '0123456789abcdef';
function charToNibble(code) {
    return code <= 57 ? code - 48 : code - 87;
}
function byteAt(value, index) {
    return (charToNibble(value.charCodeAt(index)) << 4) | charToNibble(value.charCodeAt(index + 1));
}
function readUtf8String(reader, length) {
    var buffer = readBytes(reader, length);
    return decodeString(buffer);
}
function writeUtf8String(writer, value) {
    var buffer = encodeString(value);
    writeBytes(writer, buffer);
}
function readEncodedString(reader) {
    var length = readUint8(reader);
    var buffer = readBytes(reader, length);
    var notAscii = false;
    for (var i = 0; i < buffer.byteLength; i++) {
        if (buffer[i] & 0x80) {
            notAscii = true;
            break;
        }
    }
    if (notAscii) {
        var decoder = new TextDecoder('gbk');
        return decoder.decode(buffer);
    }
    else {
        return decodeString(buffer);
    }
}
function writeEncodedString(writer, value) {
    var ascii = '';
    for (var i = 0, code = value.codePointAt(i++); code !== undefined; code = value.codePointAt(i++)) {
        ascii += code > 0x7f ? '?' : String.fromCodePoint(code);
    }
    var buffer = encodeString(ascii);
    writeUint8(writer, buffer.byteLength);
    writeBytes(writer, buffer);
}
MOCK_HANDLERS && addHandler(1028, // IPTC-NAA record
function (// IPTC-NAA record
target) { return target._ir1028 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1028', left());
    target._ir1028 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1028);
});
addHandler(1061, function (target) { return target.captionDigest !== undefined; }, function (reader, target) {
    var captionDigest = '';
    for (var i = 0; i < 16; i++) {
        var byte = readUint8(reader);
        captionDigest += hex[byte >> 4];
        captionDigest += hex[byte & 0xf];
    }
    target.captionDigest = captionDigest;
}, function (writer, target) {
    for (var i = 0; i < 16; i++) {
        writeUint8(writer, byteAt(target.captionDigest, i * 2));
    }
});
addHandler(1060, function (target) { return target.xmpMetadata !== undefined; }, function (reader, target, left) {
    target.xmpMetadata = readUtf8String(reader, left());
}, function (writer, target) {
    writeUtf8String(writer, target.xmpMetadata);
});
var Inte = createEnum('Inte', 'perceptual', {
    'perceptual': 'Img ',
    'saturation': 'Grp ',
    'relative colorimetric': 'Clrm',
    'absolute colorimetric': 'AClr',
});
addHandler(1082, function (target) { return target.printInformation !== undefined; }, function (reader, target) {
    var _a, _b;
    var desc = readVersionAndDescriptor(reader);
    target.printInformation = {
        printerName: desc.printerName || '',
        renderingIntent: Inte.decode((_a = desc.Inte) !== null && _a !== void 0 ? _a : 'Inte.Img '),
    };
    var info = target.printInformation;
    if (desc.PstS !== undefined)
        info.printerManagesColors = desc.PstS;
    if (desc['Nm  '] !== undefined)
        info.printerProfile = desc['Nm  '];
    if (desc.MpBl !== undefined)
        info.blackPointCompensation = desc.MpBl;
    if (desc.printSixteenBit !== undefined)
        info.printSixteenBit = desc.printSixteenBit;
    if (desc.hardProof !== undefined)
        info.hardProof = desc.hardProof;
    if (desc.printProofSetup) {
        if ('Bltn' in desc.printProofSetup) {
            info.proofSetup = { builtin: desc.printProofSetup.Bltn.split('.')[1] };
        }
        else {
            info.proofSetup = {
                profile: desc.printProofSetup.profile,
                renderingIntent: Inte.decode((_b = desc.printProofSetup.Inte) !== null && _b !== void 0 ? _b : 'Inte.Img '),
                blackPointCompensation: !!desc.printProofSetup.MpBl,
                paperWhite: !!desc.printProofSetup.paperWhite,
            };
        }
    }
}, function (writer, target) {
    var _a, _b;
    var info = target.printInformation;
    var desc = {};
    if (info.printerManagesColors) {
        desc.PstS = true;
    }
    else {
        if (info.hardProof !== undefined)
            desc.hardProof = !!info.hardProof;
        desc.ClrS = 'ClrS.RGBC'; // TODO: ???
        desc['Nm  '] = (_a = info.printerProfile) !== null && _a !== void 0 ? _a : 'CIE RGB';
    }
    desc.Inte = Inte.encode(info.renderingIntent);
    if (!info.printerManagesColors)
        desc.MpBl = !!info.blackPointCompensation;
    desc.printSixteenBit = !!info.printSixteenBit;
    desc.printerName = info.printerName || '';
    if (info.proofSetup && 'profile' in info.proofSetup) {
        desc.printProofSetup = {
            profile: info.proofSetup.profile || '',
            Inte: Inte.encode(info.proofSetup.renderingIntent),
            MpBl: !!info.proofSetup.blackPointCompensation,
            paperWhite: !!info.proofSetup.paperWhite,
        };
    }
    else {
        desc.printProofSetup = {
            Bltn: ((_b = info.proofSetup) === null || _b === void 0 ? void 0 : _b.builtin) ? "builtinProof.".concat(info.proofSetup.builtin) : 'builtinProof.proofCMYK',
        };
    }
    writeVersionAndDescriptor(writer, '', 'printOutput', desc);
});
MOCK_HANDLERS && addHandler(1083, // Print style
function (// Print style
target) { return target._ir1083 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1083', left());
    target._ir1083 = readBytes(reader, left());
    // TODO:
    // const desc = readVersionAndDescriptor(reader);
    // console.log('1083', require('util').inspect(desc, false, 99, true));
}, function (writer, target) {
    writeBytes(writer, target._ir1083);
});
addHandler(1005, function (target) { return target.resolutionInfo !== undefined; }, function (reader, target) {
    var horizontalResolution = readFixedPoint32(reader);
    var horizontalResolutionUnit = readUint16(reader);
    var widthUnit = readUint16(reader);
    var verticalResolution = readFixedPoint32(reader);
    var verticalResolutionUnit = readUint16(reader);
    var heightUnit = readUint16(reader);
    target.resolutionInfo = {
        horizontalResolution: horizontalResolution,
        horizontalResolutionUnit: RESOLUTION_UNITS[horizontalResolutionUnit] || 'PPI',
        widthUnit: MEASUREMENT_UNITS[widthUnit] || 'Inches',
        verticalResolution: verticalResolution,
        verticalResolutionUnit: RESOLUTION_UNITS[verticalResolutionUnit] || 'PPI',
        heightUnit: MEASUREMENT_UNITS[heightUnit] || 'Inches',
    };
}, function (writer, target) {
    var info = target.resolutionInfo;
    writeFixedPoint32(writer, info.horizontalResolution || 0);
    writeUint16(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.horizontalResolutionUnit)));
    writeUint16(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.widthUnit)));
    writeFixedPoint32(writer, info.verticalResolution || 0);
    writeUint16(writer, Math.max(1, RESOLUTION_UNITS.indexOf(info.verticalResolutionUnit)));
    writeUint16(writer, Math.max(1, MEASUREMENT_UNITS.indexOf(info.heightUnit)));
});
var printScaleStyles = ['centered', 'size to fit', 'user defined'];
addHandler(1062, function (target) { return target.printScale !== undefined; }, function (reader, target) {
    target.printScale = {
        style: printScaleStyles[readInt16(reader)],
        x: readFloat32(reader),
        y: readFloat32(reader),
        scale: readFloat32(reader),
    };
}, function (writer, target) {
    var _a = target.printScale, style = _a.style, x = _a.x, y = _a.y, scale = _a.scale;
    writeInt16(writer, Math.max(0, printScaleStyles.indexOf(style)));
    writeFloat32(writer, x || 0);
    writeFloat32(writer, y || 0);
    writeFloat32(writer, scale || 0);
});
addHandler(1006, function (target) { return target.alphaChannelNames !== undefined; }, function (reader, target, left) {
    if (!target.alphaChannelNames) { // skip if the unicode versions are already read
        target.alphaChannelNames = [];
        while (left() > 0) {
            var value = readEncodedString(reader);
            // const value = readPascalString(reader, 1);
            target.alphaChannelNames.push(value);
        }
    }
    else {
        skipBytes(reader, left());
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaChannelNames; _i < _a.length; _i++) {
        var name_1 = _a[_i];
        writeEncodedString(writer, name_1);
        // writePascalString(writer, name, 1);
    }
});
addHandler(1045, function (target) { return target.alphaChannelNames !== undefined; }, function (reader, target, left) {
    target.alphaChannelNames = [];
    while (left() > 0) {
        target.alphaChannelNames.push(readUnicodeString(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaChannelNames; _i < _a.length; _i++) {
        var name_2 = _a[_i];
        writeUnicodeStringWithPadding(writer, name_2);
    }
});
MOCK_HANDLERS && addHandler(1077, function (target) { return target._ir1077 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1077', left());
    target._ir1077 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1077);
});
addHandler(1053, function (target) { return target.alphaIdentifiers !== undefined; }, function (reader, target, left) {
    target.alphaIdentifiers = [];
    while (left() >= 4) {
        target.alphaIdentifiers.push(readUint32(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.alphaIdentifiers; _i < _a.length; _i++) {
        var id = _a[_i];
        writeUint32(writer, id);
    }
});
addHandler(1010, function (target) { return target.backgroundColor !== undefined; }, function (reader, target) { return target.backgroundColor = readColor(reader); }, function (writer, target) { return writeColor(writer, target.backgroundColor); });
addHandler(1037, function (target) { return target.globalAngle !== undefined; }, function (reader, target) { return target.globalAngle = readInt32(reader); }, function (writer, target) { return writeInt32(writer, target.globalAngle); });
addHandler(1049, function (target) { return target.globalAltitude !== undefined; }, function (reader, target) { return target.globalAltitude = readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.globalAltitude); });
addHandler(1011, function (target) { return target.printFlags !== undefined; }, function (reader, target) {
    target.printFlags = {
        labels: !!readUint8(reader),
        cropMarks: !!readUint8(reader),
        colorBars: !!readUint8(reader),
        registrationMarks: !!readUint8(reader),
        negative: !!readUint8(reader),
        flip: !!readUint8(reader),
        interpolate: !!readUint8(reader),
        caption: !!readUint8(reader),
        printFlags: !!readUint8(reader),
    };
}, function (writer, target) {
    var flags = target.printFlags;
    writeUint8(writer, flags.labels ? 1 : 0);
    writeUint8(writer, flags.cropMarks ? 1 : 0);
    writeUint8(writer, flags.colorBars ? 1 : 0);
    writeUint8(writer, flags.registrationMarks ? 1 : 0);
    writeUint8(writer, flags.negative ? 1 : 0);
    writeUint8(writer, flags.flip ? 1 : 0);
    writeUint8(writer, flags.interpolate ? 1 : 0);
    writeUint8(writer, flags.caption ? 1 : 0);
    writeUint8(writer, flags.printFlags ? 1 : 0);
});
MOCK_HANDLERS && addHandler(10000, // Print flags
function (// Print flags
target) { return target._ir10000 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 10000', left());
    target._ir10000 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir10000);
});
MOCK_HANDLERS && addHandler(1013, // Color halftoning
function (// Color halftoning
target) { return target._ir1013 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1013', left());
    target._ir1013 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1013);
});
MOCK_HANDLERS && addHandler(1016, // Color transfer functions
function (// Color transfer functions
target) { return target._ir1016 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1016', left());
    target._ir1016 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1016);
});
addHandler(1080, // Count Information
function (// Count Information
target) { return target.countInformation !== undefined; }, function (reader, target) {
    var desc = readVersionAndDescriptor(reader);
    target.countInformation = desc.countGroupList.map(function (g) { return ({
        color: { r: g['Rd  '], g: g['Grn '], b: g['Bl  '] },
        name: g['Nm  '],
        size: g['Rds '],
        fontSize: g.fontSize,
        visible: g.Vsbl,
        points: g.countObjectList.map(function (p) { return ({ x: p['X   '], y: p['Y   '] }); }),
    }); });
}, function (writer, target) {
    var desc = {
        Vrsn: 1,
        countGroupList: target.countInformation.map(function (g) { return ({
            'Rd  ': g.color.r,
            'Grn ': g.color.g,
            'Bl  ': g.color.b,
            'Nm  ': g.name,
            'Rds ': g.size,
            fontSize: g.fontSize,
            Vsbl: g.visible,
            countObjectList: g.points.map(function (p) { return ({ 'X   ': p.x, 'Y   ': p.y }); }),
        }); }),
    };
    writeVersionAndDescriptor(writer, '', 'Cnt ', desc);
});
addHandler(1024, function (target) { return target.layerState !== undefined; }, function (reader, target) { return target.layerState = readUint16(reader); }, function (writer, target) { return writeUint16(writer, target.layerState); });
addHandler(1026, function (target) { return target.layersGroup !== undefined; }, function (reader, target, left) {
    target.layersGroup = [];
    while (left() > 0) {
        target.layersGroup.push(readUint16(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.layersGroup; _i < _a.length; _i++) {
        var g = _a[_i];
        writeUint16(writer, g);
    }
});
addHandler(1072, function (target) { return target.layerGroupsEnabledId !== undefined; }, function (reader, target, left) {
    target.layerGroupsEnabledId = [];
    while (left() > 0) {
        target.layerGroupsEnabledId.push(readUint8(reader));
    }
}, function (writer, target) {
    for (var _i = 0, _a = target.layerGroupsEnabledId; _i < _a.length; _i++) {
        var id = _a[_i];
        writeUint8(writer, id);
    }
});
addHandler(1069, function (target) { return target.layerSelectionIds !== undefined; }, function (reader, target) {
    var count = readUint16(reader);
    target.layerSelectionIds = [];
    while (count--) {
        target.layerSelectionIds.push(readUint32(reader));
    }
}, function (writer, target) {
    writeUint16(writer, target.layerSelectionIds.length);
    for (var _i = 0, _a = target.layerSelectionIds; _i < _a.length; _i++) {
        var id = _a[_i];
        writeUint32(writer, id);
    }
});
addHandler(1032, function (target) { return target.gridAndGuidesInformation !== undefined; }, function (reader, target) {
    var version = readUint32(reader);
    var horizontal = readUint32(reader);
    var vertical = readUint32(reader);
    var count = readUint32(reader);
    if (version !== 1)
        throw new Error("Invalid 1032 resource version: ".concat(version));
    target.gridAndGuidesInformation = {
        grid: { horizontal: horizontal, vertical: vertical },
        guides: [],
    };
    for (var i = 0; i < count; i++) {
        target.gridAndGuidesInformation.guides.push({
            location: readUint32(reader) / 32,
            direction: readUint8(reader) ? 'horizontal' : 'vertical'
        });
    }
}, function (writer, target) {
    var info = target.gridAndGuidesInformation;
    var grid = info.grid || { horizontal: 18 * 32, vertical: 18 * 32 };
    var guides = info.guides || [];
    writeUint32(writer, 1);
    writeUint32(writer, grid.horizontal);
    writeUint32(writer, grid.vertical);
    writeUint32(writer, guides.length);
    for (var _i = 0, guides_1 = guides; _i < guides_1.length; _i++) {
        var g = guides_1[_i];
        writeUint32(writer, g.location * 32);
        writeUint8(writer, g.direction === 'horizontal' ? 1 : 0);
    }
});
addHandler(1065, // Layer Comps
function (// Layer Comps
target) { return target.layerComps !== undefined; }, function (reader, target) {
    var desc = readVersionAndDescriptor(reader, true);
    // console.log('CompList', require('util').inspect(desc, false, 99, true));
    target.layerComps = { list: [] };
    for (var _i = 0, _a = desc.list; _i < _a.length; _i++) {
        var item = _a[_i];
        target.layerComps.list.push({
            id: item.compID,
            name: item['Nm  '],
            capturedInfo: item.capturedInfo,
        });
        if ('comment' in item)
            target.layerComps.list[target.layerComps.list.length - 1].comment = item.comment;
    }
    if ('lastAppliedComp' in desc)
        target.layerComps.lastApplied = desc.lastAppliedComp;
}, function (writer, target) {
    var layerComps = target.layerComps;
    var desc = { list: [] };
    for (var _i = 0, _a = layerComps.list; _i < _a.length; _i++) {
        var item = _a[_i];
        var t = {};
        t._classID = 'Comp';
        t['Nm  '] = item.name;
        if ('comment' in item)
            t.comment = item.comment;
        t.compID = item.id;
        t.capturedInfo = item.capturedInfo;
        desc.list.push(t);
    }
    if ('lastApplied' in layerComps)
        desc.lastAppliedComp = layerComps.lastApplied;
    // console.log('CompList', require('util').inspect(desc, false, 99, true));
    writeVersionAndDescriptor(writer, '', 'CompList', desc);
});
MOCK_HANDLERS && addHandler(1092, // ???
function (// ???
target) { return target._ir1092 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1092', left());
    // 16 bytes, seems to be 4 integers
    target._ir1092 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1092);
});
// 0 - normal, 7 - multiply, 8 - screen, 23 - difference
var onionSkinsBlendModes = [
    'normal', undefined, undefined, undefined, undefined, undefined, undefined, 'multiply',
    'screen', undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'difference',
];
addHandler(1078, // Onion Skins
function (// Onion Skins
target) { return target.onionSkins !== undefined; }, function (reader, target) {
    var desc = readVersionAndDescriptor(reader);
    // console.log('1078', require('util').inspect(desc, false, 99, true));
    target.onionSkins = {
        enabled: desc.enab,
        framesBefore: desc.numBefore,
        framesAfter: desc.numAfter,
        frameSpacing: desc.Spcn,
        minOpacity: desc.minOpacity / 100,
        maxOpacity: desc.maxOpacity / 100,
        blendMode: onionSkinsBlendModes[desc.BlnM] || 'normal',
    };
}, function (writer, target) {
    var onionSkins = target.onionSkins;
    var desc = {
        Vrsn: 1,
        enab: onionSkins.enabled,
        numBefore: onionSkins.framesBefore,
        numAfter: onionSkins.framesAfter,
        Spcn: onionSkins.frameSpacing,
        minOpacity: (onionSkins.minOpacity * 100) | 0,
        maxOpacity: (onionSkins.maxOpacity * 100) | 0,
        BlnM: Math.max(0, onionSkinsBlendModes.indexOf(onionSkins.blendMode)),
    };
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler(1075, // Timeline Information
function (// Timeline Information
target) { return target.timelineInformation !== undefined; }, function (reader, target) {
    var _a, _b;
    var desc = readVersionAndDescriptor(reader);
    target.timelineInformation = {
        enabled: desc.enab,
        frameStep: frac(desc.frameStep),
        frameRate: desc.frameRate,
        time: frac(desc.time),
        duration: frac(desc.duration),
        workInTime: frac(desc.workInTime),
        workOutTime: frac(desc.workOutTime),
        repeats: desc.LCnt,
        hasMotion: desc.hasMotion,
        globalTracks: parseTrackList(desc.globalTrackList, !!reader.logMissingFeatures),
    };
    if ((_b = (_a = desc.audioClipGroupList) === null || _a === void 0 ? void 0 : _a.audioClipGroupList) === null || _b === void 0 ? void 0 : _b.length) {
        target.timelineInformation.audioClipGroups = desc.audioClipGroupList.audioClipGroupList.map(function (g) { return ({
            id: g.groupID,
            muted: g.muted,
            audioClips: g.audioClipList.map(function (_a) {
                var clipID = _a.clipID, timeScope = _a.timeScope, muted = _a.muted, audioLevel = _a.audioLevel, frameReader = _a.frameReader;
                return ({
                    id: clipID,
                    start: frac(timeScope.Strt),
                    duration: frac(timeScope.duration),
                    inTime: frac(timeScope.inTime),
                    outTime: frac(timeScope.outTime),
                    muted: muted,
                    audioLevel: audioLevel,
                    frameReader: {
                        type: frameReader.frameReaderType,
                        mediaDescriptor: frameReader.mediaDescriptor,
                        link: {
                            name: frameReader['Lnk ']['Nm  '],
                            fullPath: frameReader['Lnk '].fullPath,
                            relativePath: frameReader['Lnk '].relPath,
                        },
                    },
                });
            }),
        }); });
    }
}, function (writer, target) {
    var _a;
    var timeline = target.timelineInformation;
    var desc = {
        Vrsn: 1,
        enab: timeline.enabled,
        frameStep: timeline.frameStep,
        frameRate: timeline.frameRate,
        time: timeline.time,
        duration: timeline.duration,
        workInTime: timeline.workInTime,
        workOutTime: timeline.workOutTime,
        LCnt: timeline.repeats,
        globalTrackList: serializeTrackList(timeline.globalTracks),
        audioClipGroupList: {
            audioClipGroupList: (_a = timeline.audioClipGroups) === null || _a === void 0 ? void 0 : _a.map(function (a) { return ({
                groupID: a.id,
                muted: a.muted,
                audioClipList: a.audioClips.map(function (c) { return ({
                    clipID: c.id,
                    timeScope: {
                        Vrsn: 1,
                        Strt: c.start,
                        duration: c.duration,
                        inTime: c.inTime,
                        outTime: c.outTime,
                    },
                    frameReader: {
                        frameReaderType: c.frameReader.type,
                        descVersion: 1,
                        'Lnk ': {
                            descVersion: 1,
                            'Nm  ': c.frameReader.link.name,
                            fullPath: c.frameReader.link.fullPath,
                            relPath: c.frameReader.link.relativePath,
                        },
                        mediaDescriptor: c.frameReader.mediaDescriptor,
                    },
                    muted: c.muted,
                    audioLevel: c.audioLevel,
                }); }),
            }); }),
        },
        hasMotion: timeline.hasMotion,
    };
    writeVersionAndDescriptor(writer, '', 'null', desc, 'anim');
});
addHandler(1076, // Sheet Disclosure
function (// Sheet Disclosure
target) { return target.sheetDisclosure !== undefined; }, function (reader, target) {
    var desc = readVersionAndDescriptor(reader);
    target.sheetDisclosure = {};
    if (desc.sheetTimelineOptions) {
        target.sheetDisclosure.sheetTimelineOptions = desc.sheetTimelineOptions.map(function (o) { return ({
            sheetID: o.sheetID,
            sheetDisclosed: o.sheetDisclosed,
            lightsDisclosed: o.lightsDisclosed,
            meshesDisclosed: o.meshesDisclosed,
            materialsDisclosed: o.materialsDisclosed,
        }); });
    }
}, function (writer, target) {
    var disclosure = target.sheetDisclosure;
    var desc = { Vrsn: 1 };
    if (disclosure.sheetTimelineOptions) {
        desc.sheetTimelineOptions = disclosure.sheetTimelineOptions.map(function (d) { return ({
            Vrsn: 2,
            sheetID: d.sheetID,
            sheetDisclosed: d.sheetDisclosed,
            lightsDisclosed: d.lightsDisclosed,
            meshesDisclosed: d.meshesDisclosed,
            materialsDisclosed: d.materialsDisclosed,
        }); });
    }
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
addHandler(1054, // URL List
function (// URL List
target) { return target.urlsList !== undefined; }, function (reader, target) {
    var count = readUint32(reader);
    target.urlsList = [];
    for (var i = 0; i < count; i++) {
        var long = readSignature(reader);
        if (long !== 'slic' && reader.throwForMissingFeatures)
            throw new Error('Unknown long');
        var id = readUint32(reader);
        var url = readUnicodeString(reader);
        target.urlsList.push({ id: id, url: url, ref: 'slice' });
    }
}, function (writer, target) {
    var list = target.urlsList;
    writeUint32(writer, list.length);
    for (var i = 0; i < list.length; i++) {
        writeSignature(writer, 'slic');
        writeUint32(writer, list[i].id);
        writeUnicodeString(writer, list[i].url);
    }
});
function boundsToBounds(bounds) {
    return { 'Top ': bounds.top, Left: bounds.left, Btom: bounds.bottom, Rght: bounds.right };
}
function boundsFromBounds(bounds) {
    return { top: bounds['Top '], left: bounds.Left, bottom: bounds.Btom, right: bounds.Rght };
}
function clamped(array, index) {
    return array[Math.max(0, Math.min(array.length - 1, index))];
}
var sliceOrigins = ['autoGenerated', 'layer', 'userGenerated'];
var sliceTypes = ['noImage', 'image'];
var sliceAlignments = ['default'];
addHandler(1050, // Slices
function (// Slices
target) { return target.slices ? target.slices.length : 0; }, function (reader, target) {
    var version = readUint32(reader);
    if (version === 6) {
        if (!target.slices)
            target.slices = [];
        var top_1 = readInt32(reader);
        var left = readInt32(reader);
        var bottom = readInt32(reader);
        var right = readInt32(reader);
        var groupName = readUnicodeString(reader);
        var count = readUint32(reader);
        target.slices.push({ bounds: { top: top_1, left: left, bottom: bottom, right: right }, groupName: groupName, slices: [] });
        var slices_1 = target.slices[target.slices.length - 1].slices;
        for (var i = 0; i < count; i++) {
            var id = readUint32(reader);
            var groupId = readUint32(reader);
            var origin_1 = clamped(sliceOrigins, readUint32(reader));
            var associatedLayerId = origin_1 == 'layer' ? readUint32(reader) : 0;
            var name_3 = readUnicodeString(reader);
            var type = clamped(sliceTypes, readUint32(reader));
            var left_1 = readInt32(reader);
            var top_2 = readInt32(reader);
            var right_1 = readInt32(reader);
            var bottom_1 = readInt32(reader);
            var url = readUnicodeString(reader);
            var target_1 = readUnicodeString(reader);
            var message = readUnicodeString(reader);
            var altTag = readUnicodeString(reader);
            var cellTextIsHTML = !!readUint8(reader);
            var cellText = readUnicodeString(reader);
            var horizontalAlignment = clamped(sliceAlignments, readUint32(reader));
            var verticalAlignment = clamped(sliceAlignments, readUint32(reader));
            var a = readUint8(reader);
            var r = readUint8(reader);
            var g = readUint8(reader);
            var b = readUint8(reader);
            var backgroundColorType = ((a + r + g + b) === 0) ? 'none' : (a === 0 ? 'matte' : 'color');
            slices_1.push({
                id: id,
                groupId: groupId,
                origin: origin_1,
                associatedLayerId: associatedLayerId,
                name: name_3,
                target: target_1,
                message: message,
                altTag: altTag,
                cellTextIsHTML: cellTextIsHTML,
                cellText: cellText,
                horizontalAlignment: horizontalAlignment,
                verticalAlignment: verticalAlignment,
                type: type,
                url: url,
                bounds: { top: top_2, left: left_1, bottom: bottom_1, right: right_1 },
                backgroundColorType: backgroundColorType,
                backgroundColor: { r: r, g: g, b: b, a: a },
            });
        }
        var desc = readVersionAndDescriptor(reader);
        desc.slices.forEach(function (d) {
            var slice = slices_1.find(function (s) { return d.sliceID == s.id; });
            if (slice) {
                slice.topOutset = d.topOutset;
                slice.leftOutset = d.leftOutset;
                slice.bottomOutset = d.bottomOutset;
                slice.rightOutset = d.rightOutset;
            }
        });
    }
    else if (version === 7 || version === 8) {
        var desc = readVersionAndDescriptor(reader);
        if (!target.slices)
            target.slices = [];
        target.slices.push({
            groupName: desc.baseName,
            bounds: boundsFromBounds(desc.bounds),
            slices: desc.slices.map(function (s) { return (__assign(__assign({}, (s['Nm  '] ? { name: s['Nm  '] } : {})), { id: s.sliceID, groupId: s.groupID, associatedLayerId: 0, origin: ESliceOrigin.decode(s.origin), type: ESliceType.decode(s.Type), bounds: boundsFromBounds(s.bounds), url: s.url, target: s.null, message: s.Msge, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horizontalAlignment: ESliceHorzAlign.decode(s.horzAlign), verticalAlignment: ESliceVertAlign.decode(s.vertAlign), backgroundColorType: ESliceBGColorType.decode(s.bgColorType), backgroundColor: s.bgColor ? { r: s.bgColor['Rd  '], g: s.bgColor['Grn '], b: s.bgColor['Bl  '], a: s.bgColor.alpha } : { r: 0, g: 0, b: 0, a: 0 }, topOutset: s.topOutset || 0, leftOutset: s.leftOutset || 0, bottomOutset: s.bottomOutset || 0, rightOutset: s.rightOutset || 0 })); }),
        });
    }
    else {
        throw new Error("Invalid slices version (".concat(version, ")"));
    }
}, function (writer, target, index) {
    var _a = target.slices[index], bounds = _a.bounds, groupName = _a.groupName, slices = _a.slices;
    writeUint32(writer, 6); // version
    writeInt32(writer, bounds.top);
    writeInt32(writer, bounds.left);
    writeInt32(writer, bounds.bottom);
    writeInt32(writer, bounds.right);
    writeUnicodeString(writer, groupName);
    writeUint32(writer, slices.length);
    for (var i = 0; i < slices.length; i++) {
        var slice = slices[i];
        var _b = slice.backgroundColor, a = _b.a, r = _b.r, g = _b.g, b = _b.b;
        if (slice.backgroundColorType === 'none') {
            a = r = g = b = 0;
        }
        else if (slice.backgroundColorType === 'matte') {
            a = 0;
            r = g = b = 255;
        }
        writeUint32(writer, slice.id);
        writeUint32(writer, slice.groupId);
        writeUint32(writer, sliceOrigins.indexOf(slice.origin));
        if (slice.origin === 'layer')
            writeUint32(writer, slice.associatedLayerId);
        writeUnicodeString(writer, slice.name || '');
        writeUint32(writer, sliceTypes.indexOf(slice.type));
        writeInt32(writer, slice.bounds.left);
        writeInt32(writer, slice.bounds.top);
        writeInt32(writer, slice.bounds.right);
        writeInt32(writer, slice.bounds.bottom);
        writeUnicodeString(writer, slice.url);
        writeUnicodeString(writer, slice.target);
        writeUnicodeString(writer, slice.message);
        writeUnicodeString(writer, slice.altTag);
        writeUint8(writer, slice.cellTextIsHTML ? 1 : 0);
        writeUnicodeString(writer, slice.cellText);
        writeUint32(writer, sliceAlignments.indexOf(slice.horizontalAlignment));
        writeUint32(writer, sliceAlignments.indexOf(slice.verticalAlignment));
        writeUint8(writer, a);
        writeUint8(writer, r);
        writeUint8(writer, g);
        writeUint8(writer, b);
    }
    var desc = {
        bounds: boundsToBounds(bounds),
        slices: [],
    };
    slices.forEach(function (s) {
        var slice = __assign(__assign({ sliceID: s.id, groupID: s.groupId, origin: ESliceOrigin.encode(s.origin), Type: ESliceType.encode(s.type), bounds: boundsToBounds(s.bounds) }, (s.name ? { 'Nm  ': s.name } : {})), { url: s.url, null: s.target, Msge: s.message, altTag: s.altTag, cellTextIsHTML: s.cellTextIsHTML, cellText: s.cellText, horzAlign: ESliceHorzAlign.encode(s.horizontalAlignment), vertAlign: ESliceVertAlign.encode(s.verticalAlignment), bgColorType: ESliceBGColorType.encode(s.backgroundColorType) });
        if (s.backgroundColorType === 'color') {
            var _a = s.backgroundColor, r = _a.r, g = _a.g, b = _a.b, a = _a.a;
            slice.bgColor = { 'Rd  ': r, 'Grn ': g, 'Bl  ': b, alpha: a };
        }
        slice.topOutset = s.topOutset || 0;
        slice.leftOutset = s.leftOutset || 0;
        slice.bottomOutset = s.bottomOutset || 0;
        slice.rightOutset = s.rightOutset || 0;
        desc.slices.push(slice);
    });
    writeVersionAndDescriptor(writer, '', 'null', desc, 'slices');
});
addHandler(1064, function (target) { return target.pixelAspectRatio !== undefined; }, function (reader, target) {
    if (readUint32(reader) > 2)
        throw new Error('Invalid pixelAspectRatio version');
    target.pixelAspectRatio = { aspect: readFloat64(reader) };
}, function (writer, target) {
    writeUint32(writer, 2); // version
    writeFloat64(writer, target.pixelAspectRatio.aspect);
});
addHandler(1041, function (target) { return target.iccUntaggedProfile !== undefined; }, function (reader, target) {
    target.iccUntaggedProfile = !!readUint8(reader);
}, function (writer, target) {
    writeUint8(writer, target.iccUntaggedProfile ? 1 : 0);
});
MOCK_HANDLERS && addHandler(1039, // ICC Profile
function (// ICC Profile
target) { return target._ir1039 !== undefined; }, function (reader, target, left) {
    // TODO: this is raw bytes, just return as a byte array
    LOG_MOCK_HANDLERS && console.log('image resource 1039', left());
    target._ir1039 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1039);
});
addHandler(1044, function (target) { return target.idsSeedNumber !== undefined; }, function (reader, target) { return target.idsSeedNumber = readUint32(reader); }, function (writer, target) { return writeUint32(writer, target.idsSeedNumber); });
addHandler(1036, function (target) { return target.thumbnail !== undefined || target.thumbnailRaw !== undefined; }, function (reader, target, left) {
    var format = readUint32(reader); // 1 = kJpegRGB, 0 = kRawRGB
    var width = readUint32(reader);
    var height = readUint32(reader);
    readUint32(reader); // widthBytes = (width * bits_per_pixel + 31) / 32 * 4.
    readUint32(reader); // totalSize = widthBytes * height * planes
    readUint32(reader); // sizeAfterCompression
    var bitsPerPixel = readUint16(reader); // 24
    var planes = readUint16(reader); // 1
    if (format !== 1 || bitsPerPixel !== 24 || planes !== 1) {
        reader.logMissingFeatures && reader.log("Invalid thumbnail data (format: ".concat(format, ", bitsPerPixel: ").concat(bitsPerPixel, ", planes: ").concat(planes, ")"));
        skipBytes(reader, left());
        return;
    }
    var size = left();
    var data = readBytes(reader, size);
    if (reader.useRawThumbnail) {
        target.thumbnailRaw = { width: width, height: height, data: data };
    }
    else if (data.byteLength) {
        target.thumbnail = createCanvasFromData(data);
    }
}, function (writer, target) {
    var _a;
    var width = 0;
    var height = 0;
    var data = new Uint8Array(0);
    if (target.thumbnailRaw) {
        width = target.thumbnailRaw.width;
        height = target.thumbnailRaw.height;
        data = target.thumbnailRaw.data;
    }
    else {
        try {
            var dataUrl = (_a = target.thumbnail.toDataURL('image/jpeg', 1)) === null || _a === void 0 ? void 0 : _a.substring('data:image/jpeg;base64,'.length);
            if (dataUrl) {
                data = toByteArray(dataUrl); // this sometimes fails for some reason, maybe some browser bugs
                width = target.thumbnail.width;
                height = target.thumbnail.height;
            }
        }
        catch (_b) { }
    }
    var bitsPerPixel = 24;
    var widthBytes = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
    var planes = 1;
    var totalSize = widthBytes * height * planes;
    var sizeAfterCompression = data.length;
    writeUint32(writer, 1); // 1 = kJpegRGB
    writeUint32(writer, width);
    writeUint32(writer, height);
    writeUint32(writer, widthBytes);
    writeUint32(writer, totalSize);
    writeUint32(writer, sizeAfterCompression);
    writeUint16(writer, bitsPerPixel);
    writeUint16(writer, planes);
    writeBytes(writer, data);
});
addHandler(1057, function (target) { return target.versionInfo !== undefined; }, function (reader, target, left) {
    var version = readUint32(reader);
    if (version !== 1)
        throw new Error('Invalid versionInfo version');
    target.versionInfo = {
        hasRealMergedData: !!readUint8(reader),
        writerName: readUnicodeString(reader),
        readerName: readUnicodeString(reader),
        fileVersion: readUint32(reader),
    };
    skipBytes(reader, left());
}, function (writer, target) {
    var versionInfo = target.versionInfo;
    writeUint32(writer, 1); // version
    writeUint8(writer, versionInfo.hasRealMergedData ? 1 : 0);
    writeUnicodeString(writer, versionInfo.writerName);
    writeUnicodeString(writer, versionInfo.readerName);
    writeUint32(writer, versionInfo.fileVersion);
});
MOCK_HANDLERS && addHandler(1058, // EXIF data 1.
function (// EXIF data 1.
target) { return target._ir1058 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1058', left());
    target._ir1058 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1058);
});
addHandler(7000, function (target) { return target.imageReadyVariables !== undefined; }, function (reader, target, left) {
    target.imageReadyVariables = readUtf8String(reader, left());
}, function (writer, target) {
    writeUtf8String(writer, target.imageReadyVariables);
});
addHandler(7001, function (target) { return target.imageReadyDataSets !== undefined; }, function (reader, target, left) {
    target.imageReadyDataSets = readUtf8String(reader, left());
}, function (writer, target) {
    writeUtf8String(writer, target.imageReadyDataSets);
});
addHandler(1088, function (target) { return target.pathSelectionState !== undefined; }, function (reader, target, _left) {
    var desc = readVersionAndDescriptor(reader);
    target.pathSelectionState = desc['null'];
}, function (writer, target) {
    var desc = { 'null': target.pathSelectionState };
    writeVersionAndDescriptor(writer, '', 'null', desc);
});
MOCK_HANDLERS && addHandler(1025, function (target) { return target._ir1025 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 1025', left());
    target._ir1025 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir1025);
});
var FrmD = createEnum('FrmD', '', {
    auto: 'Auto',
    none: 'None',
    dispose: 'Disp',
});
addHandler(4000, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target.animations !== undefined; }, function (reader, target, left) {
    var key = readSignature(reader);
    if (key === 'mani') {
        checkSignature(reader, 'IRFR');
        readSection(reader, 1, function (left) {
            var _loop_1 = function () {
                checkSignature(reader, '8BIM');
                var key_1 = readSignature(reader);
                readSection(reader, 1, function (left) {
                    if (key_1 === 'AnDs') {
                        var desc = readVersionAndDescriptor(reader);
                        target.animations = {
                            // desc.AFSt ???
                            frames: desc.FrIn.map(function (x) { return ({
                                id: x.FrID,
                                delay: (x.FrDl || 0) / 100,
                                dispose: x.FrDs ? FrmD.decode(x.FrDs) : 'auto', // missing == auto
                                // x.FrGA ???
                            }); }),
                            animations: desc.FSts.map(function (x) { return ({
                                id: x.FsID,
                                frames: x.FsFr,
                                repeats: x.LCnt,
                                activeFrame: x.AFrm || 0,
                            }); }),
                        };
                        // console.log('#4000 AnDs', require('util').inspect(desc, false, 99, true));
                        // console.log('#4000 AnDs:result', require('util').inspect(target.animations, false, 99, true));
                    }
                    else if (key_1 === 'Roll') {
                        var bytes = readBytes(reader, left());
                        reader.logDevFeatures && reader.log('#4000 Roll', bytes);
                    }
                    else {
                        reader.logMissingFeatures && reader.log('Unhandled subsection in #4000', key_1);
                    }
                });
            };
            while (left() > 0) {
                _loop_1();
            }
        });
    }
    else if (key === 'mopt') {
        var bytes = readBytes(reader, left());
        reader.logDevFeatures && reader.log('#4000 mopt', bytes);
    }
    else {
        reader.logMissingFeatures && reader.log('Unhandled key in #4000:', key);
    }
}, function (writer, target) {
    if (target.animations) {
        writeSignature(writer, 'mani');
        writeSignature(writer, 'IRFR');
        writeSection(writer, 1, function () {
            writeSignature(writer, '8BIM');
            writeSignature(writer, 'AnDs');
            writeSection(writer, 1, function () {
                var desc = {
                    // AFSt: 0, // ???
                    FrIn: [],
                    FSts: [],
                };
                for (var i = 0; i < target.animations.frames.length; i++) {
                    var f = target.animations.frames[i];
                    var frame = {
                        FrID: f.id,
                    };
                    if (f.delay)
                        frame.FrDl = (f.delay * 100) | 0;
                    frame.FrDs = FrmD.encode(f.dispose);
                    // if (i === 0) frame.FrGA = 30; // ???
                    desc.FrIn.push(frame);
                }
                for (var i = 0; i < target.animations.animations.length; i++) {
                    var a = target.animations.animations[i];
                    var anim = {
                        FsID: a.id,
                        AFrm: a.activeFrame | 0,
                        FsFr: a.frames,
                        LCnt: a.repeats | 0,
                    };
                    desc.FSts.push(anim);
                }
                writeVersionAndDescriptor(writer, '', 'null', desc);
            });
            // writeSignature(writer, '8BIM');
            // writeSignature(writer, 'Roll');
            // writeSection(writer, 1, () => {
            // 	writeZeros(writer, 8);
            // });
        });
    }
});
// TODO: Unfinished
MOCK_HANDLERS && addHandler(4001, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4001 !== undefined; }, function (reader, target, left) {
    if (MOCK_HANDLERS) {
        LOG_MOCK_HANDLERS && console.log('image resource 4001', left());
        target._ir4001 = readBytes(reader, left());
        return;
    }
    var key = readSignature(reader);
    if (key === 'mfri') {
        var version = readUint32(reader);
        if (version !== 2)
            throw new Error('Invalid mfri version');
        var length_1 = readUint32(reader);
        var bytes = readBytes(reader, length_1);
        reader.logDevFeatures && reader.log('mfri', bytes);
    }
    else if (key === 'mset') {
        var desc = readVersionAndDescriptor(reader);
        reader.logDevFeatures && reader.log('mset', desc);
    }
    else {
        reader.logMissingFeatures && reader.log('Unhandled key in #4001', key);
    }
}, function (writer, target) {
    writeBytes(writer, target._ir4001);
});
// TODO: Unfinished
MOCK_HANDLERS && addHandler(4002, // Plug-In resource(s)
function (// Plug-In resource(s)
target) { return target._ir4002 !== undefined; }, function (reader, target, left) {
    LOG_MOCK_HANDLERS && console.log('image resource 4002', left());
    target._ir4002 = readBytes(reader, left());
}, function (writer, target) {
    writeBytes(writer, target._ir4002);
});
//# sourceMappingURL=imageResources.js.map