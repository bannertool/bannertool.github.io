// Font Design Tool JavaScript
// Chỉ dùng Google Fonts, không còn custom font

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const previewText = document.getElementById('previewText');
    const previewTextDisplay = document.getElementById('previewTextDisplay');
    const previewBgBox = document.getElementById('previewBgBox');
    const fontSelect = document.getElementById('fontSelect');
    const fontSize = document.getElementById('fontSize');
    const fontWeight = document.getElementById('fontWeight');
    const italic = document.getElementById('italic');
    const underline = document.getElementById('underline');
    const lineThrough = document.getElementById('lineThrough');
    const letterSpacing = document.getElementById('letterSpacing');
    const lineHeight = document.getElementById('lineHeight');
    const textAlign = document.getElementById('textAlign');
    const textTransform = document.getElementById('textTransform');
    const bgColor = document.getElementById('bgColor');
    // Font fill
    const fontFillType = document.getElementById('fontFillType');
    const fontColorBlock = document.getElementById('fontColorBlock');
    const colorPicker = document.getElementById('colorPicker');
    const fontOpacity = document.getElementById('fontOpacity');
    const fontOpacityNum = document.getElementById('fontOpacityNum');
    const fontGradientBlock = document.getElementById('fontGradientBlock');
    const gradientLinear = document.getElementById('gradientLinear');
    const gradientRadial = document.getElementById('gradientRadial');
    const gradientAngle = document.getElementById('gradientAngle');
    const gradientAngleNum = document.getElementById('gradientAngleNum');
    const gradientAngleLabel = document.getElementById('gradientAngleLabel');
    const gradientStops = document.getElementById('gradientStops');
    const addGradientStop = document.getElementById('addGradientStop');
    // Stroke & shadow
    const enableStroke = document.getElementById('enableStroke');
    const strokeColor = document.getElementById('strokeColor');
    const strokeWidth = document.getElementById('strokeWidth');
    const strokeOpacity = document.getElementById('strokeOpacity');
    const enableShadow = document.getElementById('enableShadow');
    const shadowColor = document.getElementById('shadowColor');
    const shadowBlur = document.getElementById('shadowBlur');
    const shadowX = document.getElementById('shadowX');
    const shadowY = document.getElementById('shadowY');
    const shadowOpacity = document.getElementById('shadowOpacity');
    // Preset
    const savePreset = document.getElementById('savePreset');
    const importPresets = document.getElementById('importPresets');
    const importFile = document.getElementById('importFile');
    const presetList = document.getElementById('presetList');

    // Hiện/ẩn block fill
    function updateFontFillUI() {
        if (fontFillType.value === 'color') {
            fontColorBlock.style.display = 'flex';
            fontGradientBlock.style.display = 'none';
        } else {
            fontColorBlock.style.display = 'none';
            fontGradientBlock.style.display = 'flex';
        }
        updatePreview();
    }
    fontFillType.addEventListener('change', updateFontFillUI);
    updateFontFillUI();

    // Hiện/ẩn input góc khi chọn linear/radial
    function updateGradientUI() {
        if (gradientLinear.checked) {
            gradientAngleLabel.style.display = '';
        } else {
            gradientAngleLabel.style.display = 'none';
        }
    }
    gradientLinear.addEventListener('change', updateGradientUI);
    gradientRadial.addEventListener('change', updateGradientUI);
    updateGradientUI();

    // Đồng bộ slider và input số cho angle
    gradientAngle.addEventListener('input', function() {
        gradientAngleNum.value = gradientAngle.value;
        updatePreview();
    });
    gradientAngleNum.addEventListener('input', function() {
        gradientAngle.value = gradientAngleNum.value;
        updatePreview();
    });
    // Đồng bộ opacity font (color)
    fontOpacity.addEventListener('input', function() {
        fontOpacityNum.value = fontOpacity.value;
        updatePreview();
    });
    fontOpacityNum.addEventListener('input', function() {
        fontOpacity.value = fontOpacityNum.value;
        updatePreview();
    });

    // Update preview text
    function updatePreview() {
        // Lấy các giá trị từ UI
        const text = previewText.value;
        const fontFamily = fontSelect.value;
        const fontSizeValue = fontSize.value;
        const fontWeightValue = fontWeight.value;
        const italicVal = italic.checked ? 'italic' : 'normal';
        const underlineVal = underline.checked;
        const lineThroughVal = lineThrough.checked;
        const letterSpacingVal = letterSpacing.value;
        const lineHeightVal = lineHeight.value;
        const textTransformVal = textTransform.value;
        const bgColorVal = bgColor.value;
        const fillType = fontFillType.value;
        const colorVal = colorPicker.value;
        const fontOpacityVal = fontOpacity.value / 100;
        const gradientType = gradientLinear.checked ? 'linear' : 'radial';
        const gradientAngleVal = gradientAngle.value;
        const stops = Array.from(gradientStops.children).map(stop => stop.querySelector('input[type="color"]').value);
        const enableStrokeVal = enableStroke.checked;
        const strokeColorVal = strokeColor.value;
        const strokeWidthVal = strokeWidth.value;
        const strokeOpacityVal = strokeOpacity.value / 100;
        const enableShadowVal = enableShadow.checked;
        const shadowColorVal = shadowColor.value;
        const shadowBlurVal = shadowBlur.value;
        const shadowXVal = shadowX.value;
        const shadowYVal = shadowY.value;
        const shadowOpacityVal = shadowOpacity.value / 100;
        const innerGlowEnabled = document.getElementById('enableInnerGlow').checked;
        const innerGlowColor = document.getElementById('innerGlowColor').value;
        const innerGlowBlur = document.getElementById('innerGlowBlur').value;
        const innerGlowOpacity = document.getElementById('innerGlowOpacity').value / 100;
        const outerGlowEnabled = document.getElementById('enableOuterGlow').checked;
        const outerGlowColor = document.getElementById('outerGlowColor').value;
        const outerGlowBlur = document.getElementById('outerGlowBlur').value;
        const outerGlowOpacity = document.getElementById('outerGlowOpacity').value / 100;

        // Chuẩn bị SVG
        const svg = document.getElementById('svgPreview');
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute('height', fontSizeValue * 2);
        svg.style.background = bgColorVal;

        // Định nghĩa filter cho glow/shadow
        let filterDefs = '';
        let filterId = '';
        let filterCount = 0;
        if (enableShadowVal || outerGlowEnabled || innerGlowEnabled) {
            filterId = 'svgfilter';
            filterDefs += `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">`;
            if (enableShadowVal) {
                filterDefs += `
                    <feDropShadow dx="${shadowXVal}" dy="${shadowYVal}" stdDeviation="${shadowBlurVal}" flood-color="${shadowColorVal}" flood-opacity="${shadowOpacityVal}"/>
                `;
            }
            if (outerGlowEnabled) {
                filterDefs += `
                    <feDropShadow dx="0" dy="0" stdDeviation="${outerGlowBlur}" flood-color="${outerGlowColor}" flood-opacity="${outerGlowOpacity}"/>
                `;
            }
            if (innerGlowEnabled) {
                // Inner glow bằng cách dùng feGaussianBlur + feComposite
                filterDefs += `
                    <feGaussianBlur in="SourceAlpha" stdDeviation="${innerGlowBlur}" result="blur"/>
                    <feFlood flood-color="${innerGlowColor}" flood-opacity="${innerGlowOpacity}" result="color"/>
                    <feComposite in="color" in2="blur" operator="in" result="glow"/>
                    <feComposite in="SourceGraphic" in2="glow" operator="over"/>
                `;
            }
            filterDefs += '</filter>';
        }

        // Định nghĩa gradient nếu cần
        let fillAttr = '';
        let defs = '';
        if (fillType === 'gradient') {
            const gradId = 'svgfontgradient';
            if (gradientType === 'linear') {
                // Tính toán góc cho SVG (SVG 0deg là dọc, CSS 0deg là ngang)
                const angle = (parseInt(gradientAngleVal) || 0) % 360;
                // Chuyển đổi sang tọa độ x1,y1,x2,y2
                const rad = angle * Math.PI / 180;
                const x1 = 50 - Math.cos(rad) * 50;
                const y1 = 50 - Math.sin(rad) * 50;
                const x2 = 50 + Math.cos(rad) * 50;
                const y2 = 50 + Math.sin(rad) * 50;
                defs += `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
                stops.forEach((color, i) => {
                    defs += `<stop offset="${(i/(stops.length-1))*100}%" stop-color="${color}"/>`;
                });
                defs += '</linearGradient>';
            } else {
                defs += `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">`;
                stops.forEach((color, i) => {
                    defs += `<stop offset="${(i/(stops.length-1))*100}%" stop-color="${color}"/>`;
                });
                defs += '</radialGradient>';
            }
            fillAttr = `url(#${gradId})`;
        } else {
            fillAttr = colorVal;
        }

        // Định nghĩa stroke
        let strokeAttr = 'none';
        let strokeWidthAttr = 0;
        let strokeOpacityAttr = 1;
        if (enableStrokeVal) {
            strokeAttr = strokeColorVal;
            strokeWidthAttr = strokeWidthVal;
            strokeOpacityAttr = strokeOpacityVal;
        }

        // Định nghĩa text decoration
        let textDeco = '';
        if (underlineVal) textDeco += ' underline';
        if (lineThroughVal) textDeco += ' line-through';

        // Định nghĩa transform
        let svgText = text;
        if (textTransformVal === 'uppercase') svgText = text.toUpperCase();
        else if (textTransformVal === 'lowercase') svgText = text.toLowerCase();
        else if (textTransformVal === 'capitalize') svgText = text.replace(/\b\w/g, c => c.toUpperCase());

        // Render SVG
        let svgContent = '';
        if (defs || filterDefs) {
            svgContent += `<defs>${defs}${filterDefs}</defs>`;
        }
        svgContent += `<text x="50%" y="60%" text-anchor="middle" dominant-baseline="middle"
            font-family="${fontFamily}"
            font-size="${fontSizeValue}"
            font-weight="${fontWeightValue}"
            font-style="${italicVal}"
            fill="${fillAttr}"
            fill-opacity="${fillType === 'color' ? fontOpacityVal : 1}"
            stroke="${strokeAttr}"
            stroke-width="${strokeWidthAttr}"
            stroke-opacity="${strokeOpacityAttr}"
            filter="${filterId ? 'url(#'+filterId+')' : ''}"
            letter-spacing="${letterSpacingVal}"
            >${svgText}</text>`;
        svg.innerHTML = svgContent;
    }

    function hexToRgba(hex, alpha) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.slice(1,3),16);
            g = parseInt(hex.slice(3,5),16);
            b = parseInt(hex.slice(5,7),16);
        }
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // Event listeners
    previewText.addEventListener('input', updatePreview);
    fontSelect.addEventListener('change', updatePreview);
    fontSize.addEventListener('input', updatePreview);
    fontWeight.addEventListener('change', updatePreview);
    italic.addEventListener('change', updatePreview);
    underline.addEventListener('change', updatePreview);
    lineThrough.addEventListener('change', updatePreview);
    letterSpacing.addEventListener('input', updatePreview);
    lineHeight.addEventListener('input', updatePreview);
    textAlign.addEventListener('change', updatePreview);
    textTransform.addEventListener('change', updatePreview);
    bgColor.addEventListener('input', updatePreview);
    colorPicker.addEventListener('input', updatePreview);
    fontOpacity.addEventListener('input', updatePreview);
    fontOpacityNum.addEventListener('input', updatePreview);
    fontFillType.addEventListener('change', updatePreview);
    gradientLinear.addEventListener('change', updatePreview);
    gradientRadial.addEventListener('change', updatePreview);
    gradientAngle.addEventListener('input', updatePreview);
    gradientAngleNum.addEventListener('input', updatePreview);
    enableStroke.addEventListener('change', updatePreview);
    strokeColor.addEventListener('input', updatePreview);
    strokeWidth.addEventListener('input', updatePreview);
    strokeOpacity.addEventListener('input', updatePreview);
    enableShadow.addEventListener('change', updatePreview);
    shadowColor.addEventListener('input', updatePreview);
    shadowBlur.addEventListener('input', updatePreview);
    shadowX.addEventListener('input', updatePreview);
    shadowY.addEventListener('input', updatePreview);
    shadowOpacity.addEventListener('input', updatePreview);

    // Gradient controls
    addGradientStop.addEventListener('click', () => {
        const stop = document.createElement('div');
        stop.className = 'gradient-stop';
        stop.innerHTML = `
            <input type="color" value="#ffffff">
            <button class="removeStop">-</button>
        `;
        gradientStops.appendChild(stop);
        stop.querySelector('.removeStop').addEventListener('click', () => stop.remove());
        stop.querySelector('input').addEventListener('input', updatePreview);
    });

    // Remove gradient stop
    gradientStops.addEventListener('click', (e) => {
        if (e.target.classList.contains('removeStop')) {
            e.target.parentElement.remove();
            updatePreview();
        }
    });

    // Preset management
    let presets = [];

    savePreset.addEventListener('click', () => {
        const preset = {
            name: prompt('Enter preset name:'),
            settings: {
                text: previewText.value,
                font: fontSelect.value,
                fontSize: fontSize.value,
                fontWeight: fontWeight.value,
                italic: italic.checked,
                underline: underline.checked,
                lineThrough: lineThrough.checked,
                letterSpacing: letterSpacing.value,
                lineHeight: lineHeight.value,
                textAlign: textAlign.value,
                textTransform: textTransform.value,
                bgColor: bgColor.value,
                fontFillType: fontFillType.value,
                color: colorPicker.value,
                fontOpacity: fontOpacity.value,
                gradientType: gradientLinear.checked ? 'linear' : 'radial',
                gradientAngle: gradientAngle.value,
                gradient: fontFillType.value === 'gradient' ? Array.from(gradientStops.children).map(stop => stop.querySelector('input[type="color"]').value) : null,
                stroke: enableStroke.checked ? {
                    color: strokeColor.value,
                    width: strokeWidth.value,
                    opacity: strokeOpacity.value
                } : null,
                shadow: enableShadow.checked ? {
                    color: shadowColor.value,
                    blur: shadowBlur.value,
                    x: shadowX.value,
                    y: shadowY.value,
                    opacity: shadowOpacity.value
                } : null,
                innerGlow: {
                    enabled: false,
                    color: '#ffffff',
                    blur: 4,
                    opacity: 60
                },
                outerGlow: {
                    enabled: false,
                    color: '#ffffff',
                    blur: 4,
                    opacity: 60
                }
            }
        };
        presets.push(preset);
        updatePresetList();
    });

    function updatePresetList() {
        presetList.innerHTML = '';
        presets.forEach((preset, index) => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <span>${preset.name}</span>
                <div>
                    <button onclick="applyPreset(${index})">Apply</button>
                    <button onclick="deletePreset(${index})">Delete</button>
                </div>
            `;
            presetList.appendChild(item);
        });
    }

    window.applyPreset = (index) => {
        const preset = presets[index].settings;
        previewText.value = preset.text;
        fontSelect.value = preset.font;
        fontSize.value = preset.fontSize;
        fontWeight.value = preset.fontWeight;
        italic.checked = preset.italic;
        underline.checked = preset.underline;
        lineThrough.checked = preset.lineThrough;
        letterSpacing.value = preset.letterSpacing;
        lineHeight.value = preset.lineHeight;
        textAlign.value = preset.textAlign;
        textTransform.value = preset.textTransform;
        bgColor.value = preset.bgColor;
        fontFillType.value = preset.fontFillType || 'color';
        colorPicker.value = preset.color;
        fontOpacity.value = preset.fontOpacity || 100;
        fontOpacityNum.value = preset.fontOpacity || 100;
        if (preset.gradientType === 'linear') {
            gradientLinear.checked = true;
        } else {
            gradientRadial.checked = true;
        }
        gradientAngle.value = preset.gradientAngle || 90;
        gradientAngleNum.value = preset.gradientAngle || 90;
        if (preset.gradient) {
            gradientStops.innerHTML = '';
            preset.gradient.forEach(color => {
                const stop = document.createElement('div');
                stop.className = 'gradient-stop';
                stop.innerHTML = `
                    <input type="color" value="${color}">
                    <button class="removeStop">-</button>
                `;
                gradientStops.appendChild(stop);
            });
        }
        if (preset.stroke) {
            enableStroke.checked = true;
            strokeColor.value = preset.stroke.color;
            strokeWidth.value = preset.stroke.width;
            strokeOpacity.value = preset.stroke.opacity;
        } else {
            enableStroke.checked = false;
        }
        if (preset.shadow) {
            enableShadow.checked = true;
            shadowColor.value = preset.shadow.color;
            shadowBlur.value = preset.shadow.blur;
            shadowX.value = preset.shadow.x;
            shadowY.value = preset.shadow.y;
            shadowOpacity.value = preset.shadow.opacity;
        } else {
            enableShadow.checked = false;
        }
        updateFontFillUI();
        updateGradientUI();
        updatePreview();
    };

    window.deletePreset = (index) => {
        presets.splice(index, 1);
        updatePresetList();
    };

    // Export/Import XML
    savePreset.addEventListener('click', () => {
        let xml = `<presets>\n`;
        presets.forEach(preset => {
            xml += `  <preset name=\"${preset.name}\">\n`;
            for (const [key, value] of Object.entries(preset.settings)) {
                if (typeof value === 'object' && value !== null) {
                    xml += `    <${key}>\n`;
                    for (const [subKey, subValue] of Object.entries(value)) {
                        xml += `      <${subKey}>${subValue}</${subKey}>\n`;
                    }
                    xml += `    </${key}>\n`;
                } else if (Array.isArray(value)) {
                    xml += `    <${key}>${value.join(',')}</${key}>\n`;
                } else {
                    xml += `    <${key}>${value}</${key}>\n`;
                }
            }
            xml += `  </preset>\n`;
        });
        xml += `</presets>`;

        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'font-presets.xml';
        a.click();
        URL.revokeObjectURL(url);
    });

    importPresets.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
                    presets = Array.from(xmlDoc.getElementsByTagName('preset')).map(preset => {
                        const name = preset.getAttribute('name');
                        const settings = {};
                        Array.from(preset.children).forEach(child => {
                            if (child.children.length > 0) {
                                settings[child.tagName] = {};
                                Array.from(child.children).forEach(subChild => {
                                    settings[child.tagName][subChild.tagName] = subChild.textContent;
                                });
                            } else if (child.textContent.includes(',')) {
                                settings[child.tagName] = child.textContent.split(',');
                            } else {
                                settings[child.tagName] = child.textContent;
                            }
                        });
                        return { name, settings };
                    });
                    updatePresetList();
                } catch (err) {
                    console.error('Invalid preset file:', err);
                }
            };
            reader.readAsText(file);
        }
    });

    // Add event listeners for new effects
    document.getElementById('enableInnerGlow').addEventListener('change', updatePreview);
    document.getElementById('innerGlowColor').addEventListener('input', updatePreview);
    document.getElementById('innerGlowBlur').addEventListener('input', updatePreview);
    document.getElementById('innerGlowOpacity').addEventListener('input', updatePreview);

    document.getElementById('enableOuterGlow').addEventListener('change', updatePreview);
    document.getElementById('outerGlowColor').addEventListener('input', updatePreview);
    document.getElementById('outerGlowBlur').addEventListener('input', updatePreview);
    document.getElementById('outerGlowOpacity').addEventListener('input', updatePreview);

    // Initial update
    updatePreview();
});

function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} 