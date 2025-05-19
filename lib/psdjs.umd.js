// PSD.js - Photoshop Document Parser
(function(global) {
    'use strict';

    var psdjs = {
        writePsdBuffer: function(options) {
            // Basic PSD file structure
            var width = options.width || 0;
            var height = options.height || 0;
            var layers = options.layers || [];
            
            // Create buffer for PSD file
            var buffer = new ArrayBuffer(1024 + (width * height * 4)); // Basic header + image data
            var view = new DataView(buffer);
            
            // PSD File Header (26 bytes)
            var offset = 0;
            
            // Signature: '8BPS'
            view.setUint32(offset, 0x38425053); offset += 4;
            
            // Version: always 1
            view.setUint16(offset, 1); offset += 2;
            
            // Reserved: 6 bytes of zeros
            for (var i = 0; i < 6; i++) {
                view.setUint8(offset + i, 0);
            }
            offset += 6;
            
            // Channels: 4 (RGBA)
            view.setUint16(offset, 4); offset += 2;
            
            // Height
            view.setUint32(offset, height); offset += 4;
            
            // Width
            view.setUint32(offset, width); offset += 4;
            
            // Depth: 8 bits
            view.setUint16(offset, 8); offset += 2;
            
            // Color Mode: RGB
            view.setUint16(offset, 3); offset += 2;

            // Layer and Mask Information Section
            var layerInfoStart = offset;
            view.setUint32(offset, 0); // Length placeholder
            offset += 4;

            // Layer Info
            var layerInfoLengthPos = offset;
            view.setUint32(offset, 0); // Length placeholder
            offset += 4;

            // Layer Count
            view.setInt16(offset, layers.length);
            offset += 2;

            // Layer Records
            layers.forEach(function(layer, index) {
                // Layer Record
                var top = Math.round(layer.top || 0);
                var left = Math.round(layer.left || 0);
                var bottom = top + (layer.imageData ? layer.imageData.height : 0);
                var right = left + (layer.imageData ? layer.imageData.width : 0);

                // Rectangle containing layer
                view.setInt32(offset, top); offset += 4;
                view.setInt32(offset, left); offset += 4;
                view.setInt32(offset, bottom); offset += 4;
                view.setInt32(offset, right); offset += 4;

                // Number of channels
                view.setUint16(offset, 4); // RGBA
                offset += 2;

                // Channel information
                for (var i = 0; i < 4; i++) {
                    view.setInt16(offset, i); // Channel ID
                    offset += 2;
                    view.setUint32(offset, (right - left) * (bottom - top)); // Channel data length
                    offset += 4;
                }

                // Blend mode signature
                view.setUint32(offset, 0x386C796D); // '8BIM'
                offset += 4;

                // Blend mode key
                var blendMode = 'norm'; // Normal blend mode
                for (var i = 0; i < 4; i++) {
                    view.setUint8(offset + i, blendMode.charCodeAt(i));
                }
                offset += 4;

                // Opacity
                view.setUint8(offset, 255); // 100% opacity
                offset += 1;

                // Clipping
                view.setUint8(offset, 0);
                offset += 1;

                // Flags
                view.setUint8(offset, 0);
                offset += 1;

                // Filler
                view.setUint8(offset, 0);
                offset += 1;

                // Extra data length
                var extraDataLengthPos = offset;
                view.setUint32(offset, 0); // Length placeholder
                offset += 4;

                // Layer mask data
                view.setUint32(offset, 0);
                offset += 4;

                // Layer blending ranges
                view.setUint32(offset, 0);
                offset += 4;

                // Layer name
                var name = layer.name || "Layer " + (index + 1);
                var nameLength = Math.min(name.length, 255);
                view.setUint8(offset, nameLength);
                offset += 1;
                for (var i = 0; i < nameLength; i++) {
                    view.setUint8(offset + i, name.charCodeAt(i));
                }
                offset += nameLength;
                // Pad to multiple of 4
                while (offset % 4 !== 0) {
                    view.setUint8(offset, 0);
                    offset += 1;
                }

                // Additional Layer Information
                // Transform info
                if (layer.scale || layer.rotation || layer.left || layer.top) {
                    // Transform signature
                    view.setUint32(offset, 0x386C796D); // '8BIM'
                    offset += 4;
                    
                    // Transform key 'Tfmr'
                    view.setUint32(offset, 0x54666D72);
                    offset += 4;

                    // Data length
                    view.setUint32(offset, 16); // 4 floats: scale x, scale y, rotation, reserved
                    offset += 4;

                    // Scale X and Y (as percentage)
                    var scale = layer.scale || 100;
                    view.setFloat32(offset, scale / 100);
                    offset += 4;
                    view.setFloat32(offset, scale / 100);
                    offset += 4;

                    // Rotation (in radians)
                    var rotation = (layer.rotation || 0) * Math.PI / 180;
                    view.setFloat32(offset, rotation);
                    offset += 4;

                    // Reserved
                    view.setFloat32(offset, 0);
                    offset += 4;
                }

                // Update extra data length
                var extraDataLength = offset - extraDataLengthPos - 4;
                view.setUint32(extraDataLengthPos, extraDataLength);
            });

            // Update layer info length
            var layerInfoLength = offset - layerInfoLengthPos - 4;
            view.setUint32(layerInfoLengthPos, layerInfoLength);

            // Image Data
            layers.forEach(function(layer) {
                if (layer.imageData) {
                    var data = layer.imageData.data;
                    for (var i = 0; i < data.length; i++) {
                        view.setUint8(offset + i, data[i]);
                    }
                    offset += data.length;
                }
            });

            // Update total length
            var totalLength = offset - layerInfoStart - 4;
            view.setUint32(layerInfoStart, totalLength);

            return buffer;
        }
    };

    // Export to global scope
    global.psdjs = psdjs;
})(this); 