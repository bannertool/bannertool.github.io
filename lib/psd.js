// PSD.js - Photoshop Document Parser
(function(global) {
    'use strict';

    var psdjs = {
        writePsdBuffer: function(options) {
            // Basic PSD file structure
            var width = options.width || 0;
            var height = options.height || 0;
            var layers = options.layers || [];
            var maxBufferSize = options.maxBufferSize || (2 * 1024 * 1024 * 1024); // Default 2GB

            // Validate dimensions
            if (width <= 0 || height <= 0) {
                throw new Error('Invalid document dimensions');
            }

            // Calculate total buffer size needed
            var totalSize = 0;
            const headerSize = 8192; // PSB header size
            const colorModeSize = 4;
            const imageResourceSize = 8192;
            const layerAndMaskSize = 16384;

            // Add basic sizes
            totalSize = headerSize + colorModeSize + imageResourceSize + layerAndMaskSize;

            // Calculate size for each layer
            layers.forEach(layer => {
                if (!layer.imageData || !layer.imageData.data) {
                    throw new Error('Invalid layer image data');
                }
                const layerSize = layer.imageData.width * layer.imageData.height * 4;
                const layerHeaderSize = 8192;
                totalSize += layerSize + layerHeaderSize;
            });

            // Add size for merged image data
            const documentSize = width * height * 4;
            totalSize += documentSize;

            // Check if total size exceeds max buffer size
            if (totalSize > maxBufferSize) {
                throw new Error(`Required buffer size (${totalSize} bytes) exceeds maximum allowed size (${maxBufferSize} bytes)`);
            }

            // Create buffer
            var buffer = new ArrayBuffer(totalSize);
            var view = new DataView(buffer);
            var offset = 0;

            // Write PSD Header
            view.setUint32(offset, 0x38425053); // '8BPS'
            offset += 4;

            view.setUint16(offset, 1); // Version
            offset += 2;

            // Reserved bytes
            for (var i = 0; i < 6; i++) {
                view.setUint8(offset + i, 0);
            }
            offset += 6;

            // Channels (RGBA)
            view.setUint16(offset, 4);
            offset += 2;

            // Height and Width
            view.setUint32(offset, height);
            offset += 4;
            view.setUint32(offset, width);
            offset += 4;

            // Bit depth (8 bits per channel)
            view.setUint16(offset, 8);
            offset += 2;

            // Color mode (RGB)
            view.setUint16(offset, 3);
            offset += 2;

            // Color mode data section
            view.setUint32(offset, 0);
            offset += 4;

            // Image resources section
            view.setUint32(offset, 0);
            offset += 4;

            // Layer and mask information section
            var layerInfoStart = offset;
            view.setUint32(offset, 0); // Length placeholder
            offset += 4;

            // Layer info
            var layerInfoLengthPos = offset;
            view.setUint32(offset, 0); // Length placeholder
            offset += 4;

            // Layer count
            view.setInt16(offset, layers.length);
            offset += 2;

            // Write each layer
            layers.forEach((layer, index) => {
                // Layer record
                var top = Math.round(layer.top || 0);
                var left = Math.round(layer.left || 0);
                var bottom = top + layer.imageData.height;
                var right = left + layer.imageData.width;

                // Rectangle
                view.setInt32(offset, top);
                offset += 4;
                view.setInt32(offset, left);
                offset += 4;
                view.setInt32(offset, bottom);
                offset += 4;
                view.setInt32(offset, right);
                offset += 4;

                // Channels (RGBA)
                view.setUint16(offset, 4);
                offset += 2;

                // Channel information
                for (var i = 0; i < 4; i++) {
                    view.setInt16(offset, i);
                    offset += 2;
                    view.setUint32(offset, layer.imageData.width * layer.imageData.height);
                    offset += 4;
                }

                // Blend mode
                view.setUint32(offset, 0x386C796D); // '8BIM'
                offset += 4;
                view.setUint32(offset, 0x6E6F726D); // 'norm'
                offset += 4;

                // Opacity
                view.setUint8(offset, 255);
                offset += 1;

                // Clipping
                view.setUint8(offset, 0);
                offset += 1;

                // Flags
                view.setUint8(offset, layer.visible ? 0 : 2);
                offset += 1;

                // Filler
                view.setUint8(offset, 0);
                offset += 1;

                // Extra data fields
                var extraStart = offset;
                view.setUint32(offset, 0); // Length placeholder
                offset += 4;

                // Layer mask data
                view.setUint32(offset, 0);
                offset += 4;

                // Layer blending ranges
                view.setUint32(offset, 0);
                offset += 4;

                // Layer name
                var name = layer.name || `Layer ${index + 1}`;
                var nameLength = Math.min(name.length, 255);
                view.setUint8(offset, nameLength);
                offset += 1;
                for (var i = 0; i < nameLength; i++) {
                    view.setUint8(offset + i, name.charCodeAt(i));
                }
                offset += nameLength;
                while (offset % 4 !== 0) {
                    view.setUint8(offset, 0);
                    offset += 1;
                }

                // Update extra data length
                var extraLength = offset - extraStart - 4;
                view.setUint32(extraStart, extraLength);

                // Write channel data
                var channelData = layer.imageData.data;
                for (var i = 0; i < channelData.length; i++) {
                    view.setUint8(offset, channelData[i]);
                    offset += 1;
                }
            });

            // Update layer info length
            var layerInfoLength = offset - layerInfoLengthPos - 4;
            view.setUint32(layerInfoLengthPos, layerInfoLength);

            // Update total length
            var totalLength = offset - layerInfoStart - 4;
            view.setUint32(layerInfoStart, totalLength);

            // Return the buffer
            return buffer;
        }
    };

    // Export to global scope
    global.psdjs = psdjs;
})(this); 