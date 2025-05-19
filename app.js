
window.addEventListener("DOMContentLoaded", function () {
    // Kiểm tra thư viện ag-psd đã load chưa
    if (!window.agPsd) {
        console.error('ag-psd library not loaded properly!');
        document.getElementById('exportPSD').style.display = 'none';
    } else {
        console.log('ag-psd library loaded successfully');
    }

    let cardMap = {};
    let fileMap = {};
    let layers = [];
    let originalCardSizes = {}; // Lưu kích thước gốc của ảnh
    let originalHandSizes = {}; // Thêm biến lưu kích thước gốc của ảnh bàn tay
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Thêm các biến cho phần hand
    let handMap = {};
    let currentHand = null;
    let handConfig = null;

    // Biến lưu trữ background
    let backgroundEnabled = true;
    let backgroundImage = null;
    let backgroundImageBase64 = null;
    let backgroundX = 0, backgroundY = 0, backgroundScale = 100, backgroundRotation = 0;
    let backgroundAutoFit = false;

    let aiBackground = true;
    let bg_prompt = "";

    //
    let url_prefix = "https://raw.githubusercontent.com/hoanghdtv/tools/refs/heads/main/images/";
    // let url_cards_prefix = "https://raw.githubusercontent.com/hoanghdtv/tools/refs/heads/main/images/";
    let card_style = "Tongits"

    //
    let generating_image = false;

    // Quản lý upper/lower elements
    let upperElements = [];
    let lowerElements = [];

    // Quản lý text layers bằng mảng
    let textElements = [];

    // Bước 1: Tích hợp Google Fonts tự động cho dropdown font
    const GOOGLE_FONTS = [
        'Roboto','Montserrat','Oswald','Lato','Open Sans','Poppins','Raleway','Merriweather','Bebas Neue','Nunito','Quicksand','Playfair Display','Rubik','PT Sans','Fira Sans','Arimo','Barlow','Bitter','Cabin','Cairo','Dosis','Exo','IBM Plex Sans','Josefin Sans','Kanit','Maven Pro','Mukta','Prompt','Quattrocento','Saira','Titillium Web','Varela Round','Work Sans','Zilla Slab','Arial','Times New Roman','Courier New'
    ];
    function loadGoogleFonts(selectEl, currentFont) {
        // Xóa hết option cũ
        selectEl.innerHTML = '';
        GOOGLE_FONTS.forEach(font => {
            const opt = document.createElement('option');
            opt.value = font;
            opt.textContent = font;
            if (font === currentFont) opt.selected = true;
            selectEl.appendChild(opt);
        });
        // Load font nếu chưa có
        if (currentFont) {
            WebFont.load({ google: { families: [currentFont+':400,700,400italic,700italic'] } });
        }
        selectEl.addEventListener('change', function() {
            WebFont.load({ google: { families: [this.value+':400,700,400italic,700italic'] } });
        });
    }
    const zz = "c2stcHJvai0xVHVBTlVnR29GM1dBcl9yTlhYbWFaM0xCS2dGd3BIRzBiUDAweVRjY2x3YmFWSVB4UVFZQWlzd3dvc1kyT2tmaENoXzFWTnpYc1QzQmxia0ZKQkpNR0FUS2lMY2xPUWVuVlVCOGdBdjl2VXdlZzdzSGx6TElFS1JMYlQybGxUNGNyaUFSQXp3UnNfeERhQldMZkRXVTJ6TENFa0E="
    async function callOpenAI(prompt) {
        let key = atob(zz);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "gpt-4", // hoặc "gpt-3.5-turbo"
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        console.log(data.choices[0].message.content);
    }

    async function generateImage(prompt){
        let key = atob(zz);
        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "gpt-image-1", // hoặc "gpt-3.5-turbo"
                quality: "low",
                prompt: prompt
            })
        });

        const data = await response.json();
        // console.log(data.data[0].b64_json);
        return data.data[0].b64_json;
    }


    function createElementLayerControls(type, idx, element) {
        // type: 'upper' hoặc 'lower'
        const div = document.createElement('div');
        div.className = 'element-layer';
        div.innerHTML = `
            <label>${type === 'upper' ? 'Upper' : 'Lower'} Element #${idx + 1}</label>
            <input type="file" accept="image/png,image/jpeg" class="element-image-input">
            <div class="element-thumb-wrap">$THUMBNAIL$</div>
            <label>Scale (%): <input type="range" min="10" max="300" value="${element.scale}" class="element-scale"></label>
            <label>Rotation (deg): <input type="range" min="-180" max="180" value="${element.rotation}" class="element-rotation"></label>
            <label>X: <input type="range" min="-1000" max="1000" value="${element.x}" class="element-x"></label>
            <label>Y: <input type="range" min="-1000" max="1000" value="${element.y}" class="element-y"></label>
            <button type="button" class="remove-element">Remove</button>
        `;
        // Thêm thumbnail
        const thumbWrap = div.querySelector('.element-thumb-wrap');
        if (element.src) {
            thumbWrap.innerHTML = `<img class='element-thumb' src='${element.src}' alt='thumb'>`;
        } else {
            thumbWrap.innerHTML = `<span style='color:#888;font-size:12px;'>No image</span>`;
        }
        // File input
        div.querySelector('.element-image-input').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                element.src = evt.target.result;
                renderElementControls();
                render();
            };
            reader.readAsDataURL(file);
        });
        // Scale
        div.querySelector('.element-scale').addEventListener('input', function(e) {
            element.scale = parseInt(e.target.value) || 100;
            render();
        });
        // Rotation
        div.querySelector('.element-rotation').addEventListener('input', function(e) {
            element.rotation = parseInt(e.target.value) || 0;
            render();
        });
        // X
        div.querySelector('.element-x').addEventListener('input', function(e) {
            element.x = parseInt(e.target.value) || 0;
            render();
        });
        // Y
        div.querySelector('.element-y').addEventListener('input', function(e) {
            element.y = parseInt(e.target.value) || 0;
            render();
        });
        // Remove
        div.querySelector('.remove-element').addEventListener('click', function() {
            if (type === 'upper') {
                upperElements.splice(idx, 1);
            } else {
                lowerElements.splice(idx, 1);
            }
            renderElementControls();
            render();
        });
        return div;
    }

    function renderElementControls() {
        // Render upper
        const upperContainer = document.getElementById('upperElementsContainer');
        upperContainer.innerHTML = '';
        upperElements.forEach((el, idx) => {
            upperContainer.appendChild(createElementLayerControls('upper', idx, el));
        });
        // Render lower
        const lowerContainer = document.getElementById('lowerElementsContainer');
        lowerContainer.innerHTML = '';
        lowerElements.forEach((el, idx) => {
            lowerContainer.appendChild(createElementLayerControls('lower', idx, el));
        });
    }

    document.getElementById('addUpperElement').addEventListener('click', function() {
        upperElements.push({ src: '', x: 0, y: 0, scale: 100, rotation: 0 });
        renderElementControls();
        render();
    });
    document.getElementById('addLowerElement').addEventListener('click', function() {
        lowerElements.push({ src: '', x: 0, y: 0, scale: 100, rotation: 0 });
        renderElementControls();
        render();
    });

    // Gọi renderElementControls khi load trang
    renderElementControls();

    async function load_cards(url_prefix)  {
        let url_config = url_prefix + "/config.xml"
        const xmlText = await (await fetch(url_config)).text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");


        fileMap = {};
        originalCardSizes = {};
        cardMap = {};

        for (let card of xml.getElementsByTagName("card")) {
            const src = card.getAttribute("src");
            fileMap[src] = url_prefix + "/" + src;
        }

        // Load và lưu kích thước gốc của ảnh
        for (let card of xml.getElementsByTagName("card")) {
            const src = card.getAttribute("src");
            const img = new Image();
            img.crossOrigin = "anonymous"; // Cho phép cross-origin
            img.src = fileMap[src];
            try {
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        originalCardSizes[card.getAttribute("id")] = {
                            width: img.naturalWidth,
                            height: img.naturalHeight
                        };
                        resolve();
                    };
                    img.onerror = (error) => {
                        console.error(`Error loading image ${src}:`, error);
                        reject(error);
                    };
                });
                cardMap[card.getAttribute("id")] = fileMap[src];
            } catch (error) {
                console.error(`Failed to load card ${card.getAttribute("id")}:`, error);
            }
        }

    }

    load_cards(url_prefix + card_style).then(()=>{
        render();
    })

    document.getElementById('folderPicker').addEventListener('change', async (e) => {
        fileMap = {};
        originalCardSizes = {};
        for (let file of e.target.files) {
            if (file.size > MAX_FILE_SIZE) {
                console.warn(`File ${file.name} is too large (${file.size} bytes)`);
                continue;
            }
            try {
                fileMap[file.webkitRelativePath.split('/').pop()] = URL.createObjectURL(file);
            } catch (error) {
                console.error(`Error creating URL for ${file.name}:`, error);
                continue;
            }

        }

        const xmlText = await (await fetch(fileMap["config.xml"])).text();
        console.log(xmlText)
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        cardMap = {};
        
        // Load và lưu kích thước gốc của ảnh
        for (let card of xml.getElementsByTagName("card")) {
            const src = card.getAttribute("src");
            const img = new Image();
            img.crossOrigin = "anonymous"; // Cho phép cross-origin
            img.src = fileMap[src];
            try {
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        originalCardSizes[card.getAttribute("id")] = {
                            width: img.naturalWidth,
                            height: img.naturalHeight
                        };
                        resolve();
                    };
                    img.onerror = (error) => {
                        console.error(`Error loading image ${src}:`, error);
                        reject(error);
                    };
                });
                cardMap[card.getAttribute("id")] = fileMap[src];
            } catch (error) {
                console.error(`Failed to load card ${card.getAttribute("id")}:`, error);
            }
        }
        render();
    });

    document.getElementById('addLayer').addEventListener('click', () => {
        const idx = layers.length + 1;
        const div = document.createElement('div');
        div.className = 'layer';
        div.innerHTML = `
            <label>Layer ${idx}</label>
            <textarea data-layer="${idx - 1}"></textarea>
        `;
        document.getElementById('layers').appendChild(div);
        layers.push("");
        div.querySelector('textarea').addEventListener('input', (e) => {
            layers[parseInt(e.target.dataset.layer)] = e.target.value;
            render();
        });
    });

    // Thêm các hàm xử lý cho phần hand
    document.getElementById('enableHand').addEventListener('change', function(e) {
        const handControls = document.querySelector('.hand-controls');
        handControls.style.display = e.target.checked ? 'block' : 'none';
        render();
    });

    // document.getElementById('browseHands').addEventListener('click', function() {
    //     document.getElementById('handFolderPicker').click();
    // });

    // load hands
    async function loadHands(){
        let url_config = url_prefix + "hands/hands_config.xml";
        handMap = {};
        originalHandSizes = {}; // Reset kích thước gốc của ảnh bàn tay
        const handSelect = document.getElementById('handSelect');
        handSelect.innerHTML = '<option value="">Choose a hand...</option>';
        handSelect.disabled = true;

        const xmlText = await (await fetch(url_config)).text();


        const parser = new DOMParser();
        handConfig = parser.parseFromString(xmlText, "text/xml");

        for (let hand of handConfig.getElementsByTagName("hand")) {
            const topLayerSrc = hand.querySelector("top_layer").getAttribute("src");
            const bottomLayerSrc = hand.querySelector("bottom_layer").getAttribute("src");
            handMap[topLayerSrc] = url_prefix + "hands/" + topLayerSrc;
            handMap[bottomLayerSrc] = url_prefix + "hands/" + bottomLayerSrc;
        }

        // console.log(JSON.stringify(handMap))

        // Load và parse file XML cấu hình
        try {
            // const xmlText = await (await fetch(handMap["hands_config.xml"])).text();
            // const parser = new DOMParser();
            // handConfig = parser.parseFromString(xmlText, "text/xml");

            // Load và lưu kích thước gốc của ảnh bàn tay
            for (let hand of handConfig.getElementsByTagName("hand")) {
                const topLayerSrc = hand.querySelector("top_layer").getAttribute("src");
                const bottomLayerSrc = hand.querySelector("bottom_layer").getAttribute("src");
                const handId = hand.getAttribute("id");

                // Load kích thước cho top layer
                const topImg = new Image();
                topImg.src = handMap[topLayerSrc];
                await new Promise((resolve) => {
                    topImg.onload = () => {
                        originalHandSizes[`${handId}_top`] = {
                            width: topImg.naturalWidth,
                            height: topImg.naturalHeight
                        };
                        resolve();
                    };
                    topImg.onerror = resolve;
                });

                // Load kích thước cho bottom layer
                const bottomImg = new Image();
                bottomImg.src = handMap[bottomLayerSrc];
                await new Promise((resolve) => {
                    bottomImg.onload = () => {
                        originalHandSizes[`${handId}_bottom`] = {
                            width: bottomImg.naturalWidth,
                            height: bottomImg.naturalHeight
                        };
                        resolve();
                    };
                    bottomImg.onerror = resolve;
                });
            }

            // Populate hand select dropdown
            for (let hand of handConfig.getElementsByTagName("hand")) {
                const option = document.createElement('option');
                option.value = hand.getAttribute("id");
                option.textContent = hand.getAttribute("name");
                handSelect.appendChild(option);
            }
            handSelect.disabled = false;
        } catch (error) {
            console.error("Error loading hands configuration:", error);
        }

    }

    loadHands().then(()=>{
        render();
    })

    // document.getElementById('handFolderPicker').addEventListener('change', async function(e) {
    //     handMap = {};
    //     originalHandSizes = {}; // Reset kích thước gốc của ảnh bàn tay
    //     const handSelect = document.getElementById('handSelect');
    //     handSelect.innerHTML = '<option value="">Choose a hand...</option>';
    //     handSelect.disabled = true;
    //
    //     // Load tất cả files trong thư mục hands
    //     for (let file of e.target.files) {
    //         if (file.size > MAX_FILE_SIZE) continue;
    //         try {
    //             const fileName = file.webkitRelativePath.split('/').pop();
    //             handMap[fileName] = URL.createObjectURL(file);
    //         } catch (error) {
    //             console.error(`Error creating URL for ${file.name}:`, error);
    //         }
    //     }
    //
    //     // Load và parse file XML cấu hình
    //     try {
    //         const xmlText = await (await fetch(handMap["hands_config.xml"])).text();
    //         const parser = new DOMParser();
    //         handConfig = parser.parseFromString(xmlText, "text/xml");
    //
    //         // Load và lưu kích thước gốc của ảnh bàn tay
    //         for (let hand of handConfig.getElementsByTagName("hand")) {
    //             const topLayerSrc = hand.querySelector("top_layer").getAttribute("src");
    //             const bottomLayerSrc = hand.querySelector("bottom_layer").getAttribute("src");
    //             const handId = hand.getAttribute("id");
    //
    //             // Load kích thước cho top layer
    //             const topImg = new Image();
    //             topImg.src = handMap[topLayerSrc];
    //             await new Promise((resolve) => {
    //                 topImg.onload = () => {
    //                     originalHandSizes[`${handId}_top`] = {
    //                         width: topImg.naturalWidth,
    //                         height: topImg.naturalHeight
    //                     };
    //                     resolve();
    //                 };
    //                 topImg.onerror = resolve;
    //             });
    //
    //             // Load kích thước cho bottom layer
    //             const bottomImg = new Image();
    //             bottomImg.src = handMap[bottomLayerSrc];
    //             await new Promise((resolve) => {
    //                 bottomImg.onload = () => {
    //                     originalHandSizes[`${handId}_bottom`] = {
    //                         width: bottomImg.naturalWidth,
    //                         height: bottomImg.naturalHeight
    //                     };
    //                     resolve();
    //                 };
    //                 bottomImg.onerror = resolve;
    //             });
    //         }
    //
    //         // Populate hand select dropdown
    //         for (let hand of handConfig.getElementsByTagName("hand")) {
    //             const option = document.createElement('option');
    //             option.value = hand.getAttribute("id");
    //             option.textContent = hand.getAttribute("name");
    //             handSelect.appendChild(option);
    //         }
    //         handSelect.disabled = false;
    //     } catch (error) {
    //         console.error("Error loading hands configuration:", error);
    //     }
    // });

    document.getElementById('handSelect').addEventListener('change', function(e) {
        const handId = e.target.value;
        if (!handId) {
            currentHand = null;
            render();
            return;
        }

        const handElement = handConfig.querySelector(`hand[id="${handId}"]`);
        if (handElement) {
            currentHand = {
                id: handId,
                name: handElement.getAttribute("name"),
                topLayer: handMap[handElement.querySelector("top_layer").getAttribute("src")],
                bottomLayer: handMap[handElement.querySelector("bottom_layer").getAttribute("src")],
                x: 0,
                y: 0,
                rotation: 0,
                scale: 100
            };
            render();
        }
    });

    // Add event listeners for hand controls
    ['handPosX', 'handPosY', 'handRotation', 'handScale'].forEach(id => {
        document.getElementById(id).addEventListener('input', function(e) {
            if (!currentHand) return;
            const value = parseInt(e.target.value);
            switch(id) {
                case 'handPosX': currentHand.x = value; break;
                case 'handPosY': currentHand.y = value; break;
                case 'handRotation': currentHand.rotation = value; break;
                case 'handScale': currentHand.scale = value; break;
            }
            render();
        });
    });

    // Thêm event listener cho group rotation
    document.getElementById('cardGroupRotation').addEventListener('input', render);

    function renderTextElementControls() {
        const container = document.getElementById('textElementsContainer');
        container.innerHTML = '';
        textElements.forEach((el, idx) => {
            const div = document.createElement('div');
            div.className = 'text-layer-block';
            div.innerHTML = `
                <label>Text Preview:</label>
                <input type="text" class="text-content" value="${el.text}">
                <div class="font-row">
                    <select class="text-font"></select>
                </div>
                <div class="slider-row">
                    <label>Font Size:</label>
                    <input type="number" class="font-size" min="10" max="300" value="${el.fontSize || 80}" style="width:70px;">
                </div>
                <div class="slider-row">
                    <input type="range" class="font-size-slider" min="10" max="300" value="${el.fontSize || 80}">
                </div>
                <div class="font-style-row" style="display:flex;gap:8px;margin-bottom:8px;">
                    <button class="bold-btn" style="width:50%;${el.fontWeight==='bold'?'font-weight:bold;background:#333;':''}">B</button>
                    <button class="italic-btn" style="width:50%;${el.fontStyle==='italic'?'font-style:italic;background:#333;':''}">I</button>
                </div>
                <div class="slider-row">
                    <label>Letter Spacing:</label>
                    <input type="range" class="letter-spacing" min="-10" max="50" value="${el.letterSpacing || 0}">
                </div>
                <div class="slider-row">
                    <label>X:</label>
                    <input type="range" class="text-x" min="-1000" max="1000" value="${el.x||0}">
                </div>
                <div class="slider-row">
                    <label>Y:</label>
                    <input type="range" class="text-y" min="-1000" max="1000" value="${el.y||0}">
                </div>
                <div class="slider-row">
                    <label>Rotation:</label>
                    <input type="range" class="text-rotate" min="-180" max="180" value="${el.rotate||0}">
                </div>
                <label>Font Fill:</label>
                <select class="font-fill-type">
                    <option value="color" ${el.fillType === 'color' ? 'selected' : ''}>Color</option>
                    <option value="gradient" ${el.fillType === 'gradient' ? 'selected' : ''}>Gradient</option>
                </select>
                <div class="fill-row">
                    <input type="color" class="fill-color" value="${el.fill}">
                </div>
                <div class="gradient-controls" style="display:${el.fillType === 'gradient' ? 'block' : 'none'};margin-bottom:8px;">
                    <div class="radio-row">
                        <label><input type="radio" name="gradientType${idx}" class="gradient-linear" ${el.gradientType !== 'radial' ? 'checked' : ''}> Linear</label>
                        <label><input type="radio" name="gradientType${idx}" class="gradient-radial" ${el.gradientType === 'radial' ? 'checked' : ''}> Radial</label>
                    </div>
                    <div class="gradient-wheel-row" style="display:flex;align-items:center;gap:12px;">
                        <div class="gradient-wheel-wrap" style="position:relative;width:64px;height:64px;">
                            <img src="lib/wheel.png" class="gradient-wheel" style="width:64px;height:64px;user-select:none;pointer-events:auto;transform:rotate(${el.gradientAngle||0}deg);">
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                            <label style="font-size:13px;">Angle:</label>
                            <input type="number" class="gradient-angle" min="0" max="360" value="${el.gradientAngle || 0}" style="width:60px;">
                        </div>
                    </div>
                    <div class="gradient-row">
                        ${(el.gradientStops||['#ff9966','#ff5e62','#fff']).map((color,stopIdx)=>`<input type="color" class="gradient-stop" data-stop="${stopIdx}" value="${color}">`).join('')}
                        <button class="add-stop" style="width:28px;">+</button>
                        <button class="remove-stop" style="width:28px;">-</button>
                    </div>
                </div>
                <div class="button-row">
                    <button class="remove-layer">Remove</button>
                    <button class="clone-layer">Clone</button>
                    <button class="save-preset">Save Preset</button>
                    <button class="load-preset">Load Preset</button>
                </div>
                <div class="accordion">
                    <div class="accordion-header">Effects <button class="toggle-minimal">+/-</button></div>
                    <div class="accordion-content ${el.fxOpen ? 'open' : ''}">
                        <div class="effect-group">
                            <label>Stroke</label>
                            <label><input type="checkbox" class="enable-stroke" ${el.enableStroke ? 'checked' : ''}> Enable</label>
                            <label>Color: <input type="color" class="stroke-color" value="${el.stroke}"></label>
                            <div class="slider-row"><label>Width:</label><input type="range" class="stroke-width" min="0" max="10" value="${el.strokeWidth}"></div>
                            <div class="slider-row"><label>Opacity:</label><input type="range" class="stroke-opacity" min="0" max="100" value="${el.strokeOpacity||100}"></div>
                        </div>
                        <div class="effect-group">
                            <label>Drop Shadow</label>
                            <label><input type="checkbox" class="enable-shadow" ${el.enableShadow ? 'checked' : ''}> Enable</label>
                            <label>Color: <input type="color" class="shadow-color" value="${el.shadow}"></label>
                            <div class="slider-row"><label>Blur:</label><input type="range" class="shadow-blur" min="0" max="20" value="${el.shadowBlur}"></div>
                            <div class="slider-row"><label>Offset X:</label><input type="range" class="shadow-x" min="-20" max="20" value="${el.shadowX||0}"></div>
                            <div class="slider-row"><label>Offset Y:</label><input type="range" class="shadow-y" min="-20" max="20" value="${el.shadowY||0}"></div>
                            <div class="slider-row"><label>Opacity:</label><input type="range" class="shadow-opacity" min="0" max="100" value="${el.shadowOpacity||60}"></div>
                        </div>
                        <div class="effect-group">
                            <label>Glow</label>
                            <label><input type="checkbox" class="enable-glow" ${el.enableOuterGlow ? 'checked' : ''}> Enable</label>
                            <label>Color: <input type="color" class="glow-color" value="${el.outerGlowColor||'#fff'}"></label>
                            <div class="slider-row"><label>Blur:</label><input type="range" class="glow-blur" min="0" max="20" value="${el.outerGlowBlur||4}"></div>
                            <div class="slider-row"><label>Opacity:</label><input type="range" class="glow-opacity" min="0" max="100" value="${el.outerGlowOpacity||60}"></div>
                        </div>
                    </div>
                </div>
            `;
            // Google Fonts
            const fontSelect = div.querySelector('.text-font');
            loadGoogleFonts(fontSelect, el.font || 'Arial');
            fontSelect.value = el.font || 'Arial';
            fontSelect.addEventListener('change', e => { el.font = e.target.value; render(); });
            // Font size
            const fontSizeInput = div.querySelector('.font-size');
            const fontSizeSlider = div.querySelector('.font-size-slider');
            fontSizeInput.addEventListener('input', e => {
                el.fontSize = e.target.value;
                fontSizeSlider.value = e.target.value;
                render();
            });
            fontSizeSlider.addEventListener('input', e => {
                el.fontSize = e.target.value;
                fontSizeInput.value = e.target.value;
                render();
            });
            // Bold/Italic toggle
            div.querySelector('.bold-btn').addEventListener('click', e => {
                el.fontWeight = (el.fontWeight === 'bold') ? 'normal' : 'bold';
                renderTextElementControls();
                render();
            });
            div.querySelector('.italic-btn').addEventListener('click', e => {
                el.fontStyle = (el.fontStyle === 'italic') ? 'normal' : 'italic';
                renderTextElementControls();
                render();
            });
            // Letter spacing
            div.querySelector('.letter-spacing').addEventListener('input', e => { el.letterSpacing = e.target.value; render(); });
            // Font fill type
            div.querySelector('.font-fill-type').addEventListener('change', e => {
                el.fillType = e.target.value;
                renderTextElementControls();
                render();
            });
            // Fill color
            div.querySelector('.fill-color').addEventListener('input', e => { el.fill = e.target.value; render(); });
            // Text content (sửa lại event này cho chắc chắn)
            div.querySelector('.text-content').addEventListener('input', e => {
                textElements[idx].text = e.target.value;
                render();
            });
            // Gradient controls
            if (div.querySelector('.gradient-controls')) {
                div.querySelector('.gradient-linear').addEventListener('change', e => { el.gradientType = 'linear'; render(); });
                div.querySelector('.gradient-radial').addEventListener('change', e => { el.gradientType = 'radial'; render(); });
                div.querySelector('.gradient-angle').addEventListener('input', e => { el.gradientAngle = e.target.value; render(); });
                div.querySelectorAll('.gradient-stop').forEach(stopInput => {
                    stopInput.addEventListener('input', e => {
                        if (!el.gradientStops) el.gradientStops = ['#ff9966','#ff5e62','#fff'];
                        el.gradientStops[parseInt(stopInput.dataset.stop)] = e.target.value;
                        render();
                    });
                });
                div.querySelector('.add-stop').addEventListener('click', e => {
                    e.preventDefault();
                    if (!el.gradientStops) el.gradientStops = ['#ff9966','#ff5e62','#fff'];
                    el.gradientStops.push('#ffffff');
                    renderTextElementControls();
                    render();
                });
                div.querySelector('.remove-stop').addEventListener('click', e => {
                    e.preventDefault();
                    if (el.gradientStops && el.gradientStops.length > 2) {
                        el.gradientStops.pop();
                        renderTextElementControls();
                        render();
                    }
                });
            }
            // Nút Remove, Clone, Save/Load Preset
            div.querySelector('.remove-layer').addEventListener('click', () => {
                textElements.splice(idx, 1);
                renderTextElementControls();
                render();
            });
            div.querySelector('.clone-layer').addEventListener('click', () => {
                textElements.push({...el});
                renderTextElementControls();
                render();
            });
            div.querySelector('.save-preset').addEventListener('click', () => {
                localStorage.setItem('textPreset', JSON.stringify(el));
                alert('Preset saved!');
            });
            div.querySelector('.load-preset').addEventListener('click', () => {
                const preset = JSON.parse(localStorage.getItem('textPreset'));
                if (preset) {
                    Object.assign(el, preset);
                    renderTextElementControls();
                    render();
                }
            });
            // Accordion Effects
            const accHeader = div.querySelector('.accordion-header');
            const accContent = div.querySelector('.accordion-content');
            accHeader.addEventListener('click', () => {
                el.fxOpen = !el.fxOpen;
                accContent.classList.toggle('open', el.fxOpen);
            });
            // Effects controls
            // Stroke
            div.querySelector('.enable-stroke').addEventListener('change', e => { el.enableStroke = e.target.checked; render(); });
            div.querySelector('.stroke-color').addEventListener('input', e => { el.stroke = e.target.value; render(); });
            div.querySelector('.stroke-width').addEventListener('input', e => { el.strokeWidth = e.target.value; render(); });
            div.querySelector('.stroke-opacity').addEventListener('input', e => { el.strokeOpacity = e.target.value; render(); });
            // Shadow
            div.querySelector('.enable-shadow').addEventListener('change', e => { el.enableShadow = e.target.checked; render(); });
            div.querySelector('.shadow-color').addEventListener('input', e => { el.shadow = e.target.value; render(); });
            div.querySelector('.shadow-blur').addEventListener('input', e => { el.shadowBlur = e.target.value; render(); });
            div.querySelector('.shadow-x').addEventListener('input', e => { el.shadowX = e.target.value; render(); });
            div.querySelector('.shadow-y').addEventListener('input', e => { el.shadowY = e.target.value; render(); });
            div.querySelector('.shadow-opacity').addEventListener('input', e => { el.shadowOpacity = e.target.value; render(); });
            // Glow
            div.querySelector('.enable-glow').addEventListener('change', e => { el.enableOuterGlow = e.target.checked; render(); });
            div.querySelector('.glow-color').addEventListener('input', e => { el.outerGlowColor = e.target.value; render(); });
            div.querySelector('.glow-blur').addEventListener('input', e => { el.outerGlowBlur = e.target.value; render(); });
            div.querySelector('.glow-opacity').addEventListener('input', e => { el.outerGlowOpacity = e.target.value; render(); });
            // Gán event cho các control mới
            div.querySelector('.text-x').addEventListener('input', e => { el.x = e.target.value; render(); });
            div.querySelector('.text-y').addEventListener('input', e => { el.y = e.target.value; render(); });
            div.querySelector('.text-rotate').addEventListener('input', e => { el.rotate = e.target.value; render(); });
            container.appendChild(div);

            // Gradient wheel logic (chỉ xoay ảnh wheel.png)
            const wheel = div.querySelector('.gradient-wheel');
            const angleInput = div.querySelector('.gradient-angle');
            // Đảm bảo wheel luôn đúng góc khi render lại UI
            if (wheel) {
                wheel.style.transform = `rotate(${el.gradientAngle || 0}deg)`;
            }
            if (wheel && angleInput) {
                let dragging = false;
                function setAngle(angle) {
                    angle = ((angle % 360) + 360) % 360;
                    el.gradientAngle = angle;
                    wheel.style.transform = `rotate(${angle}deg)`;
                    angleInput.value = angle;
                    render(); // Gọi lại render preview để cập nhật gradient realtime
                }
                wheel.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    dragging = true;
                });
                document.addEventListener('mousemove', function(e) {
                    if (!dragging) return;
                    const rect = wheel.getBoundingClientRect();
                    const cx = rect.left + rect.width/2;
                    const cy = rect.top + rect.height/2;
                    const dx = e.clientX - cx;
                    const dy = e.clientY - cy;
                    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
                    setAngle(angle);
                });
                document.addEventListener('mouseup', function() {
                    dragging = false;
                });
                angleInput.addEventListener('input', function(e) {
                    setAngle(parseInt(e.target.value) || 0);
                });
            }
        });
    }

    document.getElementById('addTextElement').addEventListener('click', function() {
        textElements.push({
            text: '', font: 'Arial', fill: '#ffffff', stroke: '#000000', strokeWidth: 0,
            shadow: '#000000', shadowBlur: 0, glow: '#000000', glowBlur: 0,
            rotate: 0, scale: 100, x: 0, y: 0
        });
        renderTextElementControls();
        render();
    });

    function render() {
        const preview = document.getElementById('preview');
        preview.innerHTML = '';
        let layerSpacing = parseInt(document.getElementById('layerSpacing').value);
        let cardSpacing = parseInt(document.getElementById('cardSpacing').value);
        let layout = document.getElementById('layoutStyle').value;
        let randomize = document.getElementById('randomSpacing').checked;
        let cardScale = parseInt(document.getElementById('cardScale').value) / 100;
        let enableHand = document.getElementById('enableHand').checked;

        let centerX = preview.clientWidth / 2;
        let centerY = preview.clientHeight * 0.4;

        const cardOffsetX = parseInt(document.getElementById('cardOffsetX').value) || 0;
        const cardOffsetY = parseInt(document.getElementById('cardOffsetY').value) || 0;
        const groupRotation = parseInt(document.getElementById('cardGroupRotation').value) || 0;

        // 1. Render background nếu có (luôn dưới cùng)
        if (backgroundEnabled && backgroundImage) {
            const bgImg = document.createElement('img');
            bgImg.src = backgroundImage;
            bgImg.className = 'background-image';
            bgImg.style.position = 'absolute';
            if (backgroundAutoFit) {
                // Tự động scale vừa khít preview
                bgImg.onload = function() {
                    const pw = preview.clientWidth;
                    const ph = preview.clientHeight;
                    const iw = bgImg.naturalWidth;
                    const ih = bgImg.naturalHeight;
                    const scaleX = pw / iw;
                    const scaleY = ph / ih;
                    const scale = Math.max(scaleX, scaleY); // Đảm bảo phủ kín
                    bgImg.style.left = `${pw/2}px`;
                    bgImg.style.top = `${ph/2}px`;
                    bgImg.style.transform = `translate(-50%, -50%) scale(${scale})`;
                };
                // Nếu ảnh đã load thì gọi lại onload
                if (bgImg.complete) bgImg.onload();
            } else {
                bgImg.style.left = `${centerX + backgroundX}px`;
                bgImg.style.top = `${centerY + backgroundY}px`;
                bgImg.style.transform = `translate(-50%, -50%) scale(${backgroundScale/100}) rotate(${backgroundRotation}deg)`;
            }
            bgImg.style.zIndex = 0;
            preview.appendChild(bgImg);
        } else if(aiBackground && backgroundImageBase64){
            const base64String = "data:image/png;base64," + backgroundImageBase64;
            const bgImg = document.createElement('img');
            bgImg.src = base64String;
            bgImg.className = 'background-image';
            bgImg.style.position = 'absolute';
            if (backgroundAutoFit) {
                // Tự động scale vừa khít preview
                bgImg.onload = function() {
                    const pw = preview.clientWidth;
                    const ph = preview.clientHeight;
                    const iw = bgImg.naturalWidth;
                    const ih = bgImg.naturalHeight;
                    const scaleX = pw / iw;
                    const scaleY = ph / ih;
                    const scale = Math.max(scaleX, scaleY); // Đảm bảo phủ kín
                    bgImg.style.left = `${pw/2}px`;
                    bgImg.style.top = `${ph/2}px`;
                    bgImg.style.transform = `translate(-50%, -50%) scale(${scale})`;
                };
                // Nếu ảnh đã load thì gọi lại onload
                if (bgImg.complete) bgImg.onload();
            } else {
                bgImg.style.left = `${centerX + backgroundX}px`;
                bgImg.style.top = `${centerY + backgroundY}px`;
                bgImg.style.transform = `translate(-50%, -50%) scale(${backgroundScale/100}) rotate(${backgroundRotation}deg)`;
            }
            bgImg.style.zIndex = 0;
            preview.appendChild(bgImg);
        }

        // 2. Render lower elements (trên background, dưới mọi thứ khác)
        lowerElements.forEach(el => {
            if (!el.src) return;
            const img = document.createElement('img');
            img.src = el.src;
            img.className = 'element-image';
            img.style.position = 'absolute';
            img.style.left = `${centerX + el.x}px`;
            img.style.top = `${centerY + el.y}px`;
            img.style.transform = `translate(-50%, -50%) scale(${el.scale/100}) rotate(${el.rotation}deg)`;
            img.style.zIndex = 1;
            preview.appendChild(img);
        });

        // 3. Render bottom hand layer nếu có
        if (enableHand && currentHand) {
            const bottomHand = document.createElement('img');
            bottomHand.src = currentHand.bottomLayer;
            bottomHand.className = 'hand-layer';
            bottomHand.style.position = 'absolute';
            const relativeX = (currentHand.x / 500) * (preview.clientWidth / 2);
            const relativeY = (currentHand.y / 500) * (preview.clientHeight / 2);
            bottomHand.style.left = `${centerX + relativeX}px`;
            bottomHand.style.top = `${centerY + relativeY}px`;
            bottomHand.style.transform = `translate(-50%, -50%) rotate(${currentHand.rotation}deg) scale(${currentHand.scale/100})`;
            bottomHand.style.zIndex = 10;
            preview.appendChild(bottomHand);
        }

        // 4. Tạo groupWrapper và render card layers vào đây
        const groupWrapper = document.createElement('div');
        groupWrapper.style.position = 'absolute';
        groupWrapper.style.left = '0';
        groupWrapper.style.top = '0';
        groupWrapper.style.width = '100%';
        groupWrapper.style.height = '100%';
        groupWrapper.style.transform = `rotate(${groupRotation}deg)`;
        groupWrapper.style.transformOrigin = `${centerX}px ${centerY}px`;
        groupWrapper.style.zIndex = 10;

        for (let i = 0; i < layers.length; i++) {
            const cards = layers[i].split(',').map(s => s.trim()).filter(Boolean);
            const totalWidth = (cards.length - 1) * cardSpacing;
            const startX = centerX - totalWidth / 2 + cardOffsetX;
            const yOffset = centerY - (layers.length * layerSpacing / 2) + i * layerSpacing + cardOffsetY;

            for (let j = 0; j < cards.length; j++) {
                const id = cards[j];
                if (!cardMap[id]) continue;
                const img = document.createElement('img');
                img.src = cardMap[id];
                img.className = 'card';
                const originalSize = originalCardSizes[id];
                if (!originalSize) {
                    console.error(`Failed to load card ${id}: originalSize is undefined`);
                    continue;
                }
                    const aspectRatio = originalSize.height / originalSize.width;
                    const baseWidth = 150 * cardScale;
                    img.style.width = baseWidth + 'px';
                    img.style.height = (baseWidth * aspectRatio) + 'px';
                img.style.left = (startX + j * cardSpacing) + 'px';
                img.style.top = yOffset + 'px';
                img.style.zIndex = 10;
                img.style.transformOrigin = 'center bottom';
                if (layout === 'arc') {
                    let base = (j - (cards.length - 1) / 2);
                    let arcValue = parseInt(document.getElementById('arcControl').value);
                    let angleMultiplier = Math.abs(arcValue) / 5;
                    let rotate = base * angleMultiplier;
                    let direction = Math.sign(arcValue);
                    let intensity = Math.abs(arcValue) / 10;
                    let yAdjust = direction * (Math.pow(base, 2)) * intensity;
                    if (randomize) rotate += (Math.random() - 0.5) * 5;
                    img.style.top = (yOffset + yAdjust) + 'px';
                    img.style.transform = `rotate(${rotate}deg)`;
                }
                groupWrapper.appendChild(img);
            }
        }
        preview.appendChild(groupWrapper);

        // 5. Render top hand layer nếu có
        if (enableHand && currentHand) {
            const topHand = document.createElement('img');
            topHand.src = currentHand.topLayer;
            topHand.className = 'hand-layer';
            topHand.style.position = 'absolute';
            const relativeX = (currentHand.x / 500) * (preview.clientWidth / 2);
            const relativeY = (currentHand.y / 500) * (preview.clientHeight / 2);
            topHand.style.left = `${centerX + relativeX}px`;
            topHand.style.top = `${centerY + relativeY}px`;
            topHand.style.transform = `translate(-50%, -50%) rotate(${currentHand.rotation}deg) scale(${currentHand.scale/100})`;
            topHand.style.zIndex = 10;
            preview.appendChild(topHand);
        }

        // 6. Render upper elements (trên cùng)
        upperElements.forEach(el => {
            if (!el.src) return;
            const img = document.createElement('img');
            img.src = el.src;
            img.className = 'element-image';
            img.style.position = 'absolute';
            img.style.left = `${centerX + el.x}px`;
            img.style.top = `${centerY + el.y}px`;
            img.style.transform = `translate(-50%, -50%) scale(${el.scale/100}) rotate(${el.rotation}deg)`;
            img.style.zIndex = 2000;
            preview.appendChild(img);
        });

        // 7. Render text elements (trên cùng)
        textElements.forEach(el => {
            if (!el.text) return;
            if (el.fillType === 'gradient') {
                // Tính toán width/height text
                const fontSize = el.fontSize || 80;
                const fontFamily = el.font || 'Arial';
                const fontWeight = el.fontWeight || 'normal';
                const fontStyle = el.fontStyle || 'normal';
                const letterSpacing = el.letterSpacing || 0;
                // Tạo SVG
                const svgNS = 'http://www.w3.org/2000/svg';
                const svg = document.createElementNS(svgNS, 'svg');
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', fontSize * 2);
                svg.style.position = 'absolute';
                svg.style.left = `calc(50% + ${el.x}px)`;
                svg.style.top = `calc(40% + ${el.y}px)`;
                svg.style.transform = `translate(-50%, -50%) scale(${el.scale/100}) rotate(${el.rotate}deg)`;
                svg.style.zIndex = 3000;
                svg.style.pointerEvents = 'none';
                svg.style.userSelect = 'none';
                // Gradient
                const gradId = 'grad'+Math.random().toString(36).slice(2,8);
                let gradDef = '';
                if (el.gradientType === 'radial') {
                    gradDef = `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">`;
                    (el.gradientStops||['#ff9966','#ff5e62','#fff']).forEach((color,i,arr)=>{
                        gradDef += `<stop offset="${(i/(arr.length-1))*100}%" stop-color="${color}"/>`;
                    });
                    gradDef += '</radialGradient>';
                } else {
                    const angle = parseInt(el.gradientAngle||0)%360;
                    const rad = angle * Math.PI / 180;
                    const x1 = 50 - Math.cos(rad) * 50;
                    const y1 = 50 - Math.sin(rad) * 50;
                    const x2 = 50 + Math.cos(rad) * 50;
                    const y2 = 50 + Math.sin(rad) * 50;
                    gradDef = `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
                    (el.gradientStops||['#ff9966','#ff5e62','#fff']).forEach((color,i,arr)=>{
                        gradDef += `<stop offset="${(i/(arr.length-1))*100}%" stop-color="${color}"/>`;
                    });
                    gradDef += '</linearGradient>';
                }
                svg.innerHTML = `<defs>${gradDef}</defs>`;
                // Tạo filter cho hiệu ứng
                let filterDefs = '';
                let filterId = '';
                if (el.enableShadow || el.enableOuterGlow || el.enableInnerGlow) {
                    filterId = 'svgfilter'+Math.random().toString(36).slice(2,8);
                    filterDefs += `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">`;
                    if (el.enableShadow) {
                        filterDefs += `<feDropShadow dx="${el.shadowX||0}" dy="${el.shadowY||0}" stdDeviation="${el.shadowBlur||0}" flood-color="${el.shadow||'#000'}" flood-opacity="${(el.shadowOpacity||60)/100}"/>`;
                    }
                    if (el.enableOuterGlow) {
                        filterDefs += `<feDropShadow dx="0" dy="0" stdDeviation="${el.outerGlowBlur||4}" flood-color="${el.outerGlowColor||'#fff'}" flood-opacity="${(el.outerGlowOpacity||60)/100}"/>`;
                    }
                    if (el.enableInnerGlow) {
                        filterDefs += `<feGaussianBlur in="SourceAlpha" stdDeviation="${el.innerGlowBlur||4}" result="blur"/>
                        <feFlood flood-color="${el.innerGlowColor||'#fff'}" flood-opacity="${(el.innerGlowOpacity||60)/100}" result="color"/>
                        <feComposite in="color" in2="blur" operator="in" result="glow"/>
                        <feComposite in="SourceGraphic" in2="glow" operator="over"/>`;
                    }
                    filterDefs += '</filter>';
                }
                if (filterDefs) svg.innerHTML += `<defs>${filterDefs}</defs>`;
                // Tạo text SVG
                const text = document.createElementNS(svgNS, 'text');
                text.setAttribute('x', '50%');
                text.setAttribute('y', '60%');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('font-family', fontFamily);
                text.setAttribute('font-size', fontSize);
                text.setAttribute('font-weight', fontWeight);
                text.setAttribute('font-style', fontStyle);
                text.setAttribute('letter-spacing', el.letterSpacing||0);
                text.setAttribute('fill', `url(#${gradId})`);
                if (el.enableStroke) {
                    text.setAttribute('stroke', el.stroke||'#000');
                    text.setAttribute('stroke-width', el.strokeWidth||0);
                    text.setAttribute('stroke-opacity', (el.strokeOpacity||100)/100);
                }
                if (filterId) text.setAttribute('filter', `url(#${filterId})`);
                text.textContent = el.text;
                svg.appendChild(text);
                preview.appendChild(svg);
            } else {
                // Fill color, render span
                const span = document.createElement('span');
                span.textContent = el.text;
                span.style.position = 'absolute';
                span.style.left = `calc(50% + ${el.x}px)`;
                span.style.top = `calc(40% + ${el.y}px)`;
                span.style.transform = `translate(-50%, -50%) scale(${el.scale/100}) rotate(${el.rotate}deg)`;
                span.style.fontFamily = el.font;
                span.style.fontWeight = el.fontWeight||'normal';
                span.style.fontStyle = el.fontStyle||'normal';
                span.style.fontSize = (el.fontSize||80)+'px';
                span.style.letterSpacing = (el.letterSpacing||0)+'px';
                span.style.color = el.fill;
                span.style.zIndex = 3000;
                span.style.pointerEvents = 'none';
                span.style.userSelect = 'none';
                span.style.whiteSpace = 'pre';
                // Effects
                let textShadow = '';
                if (el.enableShadow) {
                    textShadow += `${el.shadowX||0}px ${el.shadowY||0}px ${el.shadowBlur||0}px ${el.shadow||'#000'}`;
                }
                if (el.enableOuterGlow) {
                    if (textShadow) textShadow += ',';
                    textShadow += `0 0 ${el.outerGlowBlur||4}px ${el.outerGlowColor||'#fff'}`;
                }
                span.style.textShadow = textShadow;
                if (el.enableStroke) {
                    span.style.webkitTextStroke = `${el.strokeWidth||0}px ${el.stroke||'#000'}`;
                    span.style.webkitTextStrokeColor = el.stroke||'#000';
                    span.style.webkitTextStrokeWidth = (el.strokeWidth||0)+'px';
                    span.style.opacity = (el.strokeOpacity||100)/100;
                } else {
                    span.style.webkitTextStroke = 'none';
                }
                preview.appendChild(span);
            }
        });
    }

    document.getElementById('cardSpacing').addEventListener('input', render);
    document.getElementById('layerSpacing').addEventListener('input', render);
    document.getElementById('layoutStyle').addEventListener('change', render);
    document.getElementById('randomSpacing').addEventListener('change', render);
    document.getElementById('cardScale').addEventListener('input', render);
    document.getElementById('arcControl').addEventListener('input', render);

    // Thêm event listener cho offset X/Y
    ['cardOffsetX', 'cardOffsetY'].forEach(id => {
        document.getElementById(id).addEventListener('input', render);
    });

    // Mapping size
    const sizeMap = {
        '1:1': { width: 1080, height: 1080 },
        '5:4': { width: 1350, height: 1080 },
        '16:9': { width: 1920, height: 1080 }
    };
    setTimeout(()=>{
        setPreviewSize('1:1');
        render();
    },100)

    // Set preview size
    function setPreviewSize(sizeKey) {
        const preview = document.getElementById('preview');
        const outline = document.getElementById('previewOutline');
        const w = sizeMap[sizeKey].width;
        const h = sizeMap[sizeKey].height;
        preview.style.width = w + 'px';
        preview.style.height = h + 'px';
        if (outline) {
            outline.style.width = (w + 6) + 'px';
            outline.style.height = (h + 6) + 'px';
        }
    }

    document.getElementById('outputSize').addEventListener('change', function(e) {
        if (!e.target.value) return; // Nếu chưa chọn, không làm gì cả
        setPreviewSize(e.target.value);
        render();
    });

    // Export PNG đúng size, trong suốt, không bị lớp mờ
    document.getElementById('exportPNG').onclick = async function() {
        const preview = document.getElementById('preview');
        const outline = document.querySelector('.preview-outline');
        const sizeKey = document.getElementById('outputSize').value;
        const { width, height } = sizeMap[sizeKey];
        if (outline) outline.style.display = 'none';
        const oldBoxShadow = preview.style.boxShadow;
        preview.style.boxShadow = 'none';

        // Ẩn toàn bộ text HTML/SVG cũ (dù là color hay gradient)
        const svgNodes = Array.from(preview.querySelectorAll('svg'));
        svgNodes.forEach(svg => svg.style.display = 'none');
        const spanNodes = Array.from(preview.querySelectorAll('span'));
        spanNodes.forEach(span => span.style.display = 'none');

        // Bake từng text layer thành PNG và chèn vào preview
        const bakedImgs = [];
        for (const el of textElements) {
            if (!el.text) continue;
            // Tạo canvas tạm
            const fontSize = el.fontSize || 80;
            const fontFamily = el.font || 'Arial';
            const fontWeight = el.fontWeight || 'normal';
            const fontStyle = el.fontStyle || 'normal';
            const letterSpacing = el.letterSpacing || 0;
            // Tạo canvas đủ lớn
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 2000;
            canvas.height = 600;
            ctx.save();
            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px '${fontFamily}'`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            let x = 1000;
            let y = 300;
            // Glow (outer glow)
            if (el.enableOuterGlow) {
                ctx.save();
                ctx.shadowColor = el.outerGlowColor||'#fff';
                ctx.shadowBlur = el.outerGlowBlur||8;
                ctx.globalAlpha = (el.outerGlowOpacity||60)/100;
                ctx.fillStyle = el.fillType === 'gradient' ? '#fff' : el.fill;
                if (letterSpacing) {
                    let chars = el.text.split('');
                    let totalWidth = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + (chars.length-1)*letterSpacing;
                    let xx = 1000 - totalWidth/2;
                    for (let i=0; i<chars.length; ++i) {
                        ctx.fillText(chars[i], xx, y);
                        xx += ctx.measureText(chars[i]).width + letterSpacing;
                    }
                } else {
                    ctx.fillText(el.text, x, y);
                }
                ctx.restore();
            }
            // Glow (inner glow) - mô phỏng bằng cách vẽ text trắng mờ lên trên
            if (el.enableInnerGlow) {
                ctx.save();
                ctx.globalAlpha = (el.innerGlowOpacity||60)/100 * 0.5;
                ctx.shadowColor = el.innerGlowColor||'#fff';
                ctx.shadowBlur = el.innerGlowBlur||8;
                ctx.fillStyle = el.fillType === 'gradient' ? '#fff' : el.fill;
                if (letterSpacing) {
                    let chars = el.text.split('');
                    let totalWidth = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + (chars.length-1)*letterSpacing;
                    let xx = 1000 - totalWidth/2;
                    for (let i=0; i<chars.length; ++i) {
                        ctx.fillText(chars[i], xx, y);
                        xx += ctx.measureText(chars[i]).width + letterSpacing;
                    }
                } else {
                    ctx.fillText(el.text, x, y);
                }
                ctx.restore();
            }
            // Gradient fill
            let fillStyle = el.fill;
            if (el.fillType === 'gradient') {
                let grad;
                if (el.gradientType === 'radial') {
                    grad = ctx.createRadialGradient(1000, 300, 10, 1000, 300, 500);
                } else {
                    const angle = (parseInt(el.gradientAngle||0)%360) * Math.PI/180;
                    const x1 = 1000 - Math.cos(angle)*1000;
                    const y1 = 300 - Math.sin(angle)*300;
                    const x2 = 1000 + Math.cos(angle)*1000;
                    const y2 = 300 + Math.sin(angle)*300;
                    grad = ctx.createLinearGradient(x1, y1, x2, y2);
                }
                (el.gradientStops||['#ff9966','#ff5e62','#fff']).forEach((color,i,arr)=>{
                    grad.addColorStop(i/(arr.length-1), color);
                });
                fillStyle = grad;
            }
            ctx.fillStyle = fillStyle;
            // Letter spacing
            if (letterSpacing) {
                let chars = el.text.split('');
                let totalWidth = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + (chars.length-1)*letterSpacing;
                let xx = 1000 - totalWidth/2;
                for (let i=0; i<chars.length; ++i) {
                    ctx.fillText(chars[i], xx, y);
                    xx += ctx.measureText(chars[i]).width + letterSpacing;
                }
            } else {
                ctx.fillText(el.text, 1000, 300);
            }
            // Stroke
            if (el.enableStroke && el.strokeWidth > 0) {
                ctx.save();
                ctx.lineWidth = el.strokeWidth;
                ctx.strokeStyle = el.stroke||'#000';
                ctx.globalAlpha = (el.strokeOpacity||100)/100;
                if (letterSpacing) {
                    let xx = 1000 - ctx.measureText(el.text).width/2;
                    for (let i=0; i<el.text.length; ++i) {
                        ctx.strokeText(el.text[i], xx, y);
                        xx += ctx.measureText(el.text[i]).width + letterSpacing;
                    }
                } else {
                    ctx.strokeText(el.text, 1000, 300);
                }
                ctx.restore();
            }
            // Shadow
            if (el.enableShadow) {
                ctx.save();
                ctx.shadowColor = el.shadow||'#000';
                ctx.shadowBlur = el.shadowBlur||0;
                ctx.shadowOffsetX = el.shadowX||0;
                ctx.shadowOffsetY = el.shadowY||0;
                ctx.globalAlpha = (el.shadowOpacity||60)/100;
                ctx.fillText(el.text, 1000, 300);
                ctx.restore();
            }
            // Lấy ảnh từ canvas
            const img = document.createElement('img');
            img.src = canvas.toDataURL('image/png');
            img.style.position = 'absolute';
            img.style.left = `calc(50% + ${el.x||0}px)`;
            img.style.top = `calc(40% + ${el.y||0}px)`;
            img.style.transform = `translate(-50%, -50%) scale(${el.scale/100}) rotate(${el.rotate||0}deg)`;
            img.style.zIndex = 3000;
            img.style.pointerEvents = 'none';
            img.style.userSelect = 'none';
            img.style.width = 'auto';
            img.style.height = 'auto';
            preview.appendChild(img);
            bakedImgs.push(img);
        }

        await html2canvas(preview, {
            backgroundColor: null,
            useCORS: true,
            width,
            height,
            scale: 1
        }).then(canvas => {
            preview.style.boxShadow = oldBoxShadow;
            if (outline) outline.style.display = '';
            // Xóa các ảnh text tạm thời vừa thêm vào
            bakedImgs.forEach(img => img.remove());
            // Hiện lại SVG text gradient
            svgNodes.forEach(svg => svg.style.display = '');
            // Hiện lại span text
            spanNodes.forEach(span => span.style.display = '');
            const link = document.createElement('a');
            link.download = 'poker_hand.png';
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        });
    };

    // Hàm load image data từ URL
    async function loadImageData(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, img.width, img.height));
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    // Export PSD: giữ nguyên transform (rotation, scale, translate) của từng lá bài và bàn tay, không bake lên canvas lớn
    document.getElementById('exportPSD').onclick = async function() {
        if (!window.agPsd) {
            alert('ag-psd library not loaded. Cannot export PSD file.');
            return;
        }

        const preview = document.getElementById('preview');
        const psdLayers = [];

        try {
            // Tạo một mảng chứa promises của tất cả các ảnh cần load
            const imageLoadPromises = [];

            // Thêm các layer bài
            const cardElements = Array.from(document.querySelectorAll('.card'));
            for (let i = 0; i < cardElements.length; i++) {
                const card = cardElements[i];
                const loadPromise = new Promise(async (resolve) => {
                    const pos = getElementPosition(card);
                    try {
                        // Tìm ID của card
                        let cardId = '';
                        for (const [id, url] of Object.entries(cardMap)) {
                            if (url === card.src) {
                                cardId = id;
                                break;
                            }
                        }
                        
                        const imageData = await loadImageData(card.src);
                        const style = window.getComputedStyle(card);
                        const transform = style.transform;
                        const scale = parseFloat(style.width) / originalCardSizes[cardId].width;
                        
                        psdLayers.push({
                            name: `card_${cardId}`,
                            imageData: imageData,
                            left: Math.round(pos.left),
                            top: Math.round(pos.top),
                            visible: true,
                            transform: transform,
                            scale: scale
                        });
                    } catch (err) {
                        console.error('Error loading card:', err);
                    }
                    resolve();
                });
                imageLoadPromises.push(loadPromise);
            }

            // Thêm bottom hand layer nếu có
            if (document.getElementById('enableHand').checked && currentHand) {
                const bottomHandImg = document.querySelector('.hand-layer:first-child');
                if (bottomHandImg) {
                    const loadPromise = new Promise(async (resolve) => {
                        const pos = getElementPosition(bottomHandImg);
                        try {
                            const imageData = await loadImageData(currentHand.bottomLayer);
                            const style = window.getComputedStyle(bottomHandImg);
                            const transform = style.transform;
                            
                            // Tính toán scale dựa trên setting của người dùng
                            const scale = currentHand.scale * 100;
                            
                            psdLayers.unshift({
                                name: 'Bottom_Hand',
                                imageData: imageData,
                                left: Math.round(pos.left),
                                top: Math.round(pos.top),
                                visible: true,
                                transform: transform,
                                scale: scale
                            });
                        } catch (err) {
                            console.error('Error loading bottom hand:', err);
                        }
                        resolve();
                    });
                    imageLoadPromises.push(loadPromise);
                }
            }

            // Thêm top hand layer nếu có
            if (document.getElementById('enableHand').checked && currentHand) {
                const topHandImg = document.querySelector('.hand-layer:last-child');
                if (topHandImg) {
                    const loadPromise = new Promise(async (resolve) => {
                        const pos = getElementPosition(topHandImg);
                        try {
                            const imageData = await loadImageData(currentHand.topLayer);
                            const style = window.getComputedStyle(topHandImg);
                            const transform = style.transform;
                            
                            // Tính toán scale dựa trên setting của người dùng
                            const scale = currentHand.scale;
                            
                            psdLayers.push({
                                name: 'Top_Hand',
                                imageData: imageData,
                                left: Math.round(pos.left),
                                top: Math.round(pos.top),
                                visible: true,
                                transform: transform,
                                scale: scale
                            });
                        } catch (err) {
                            console.error('Error loading top hand:', err);
                        }
                        resolve();
                    });
                    imageLoadPromises.push(loadPromise);
                }
            }

            // Đợi tất cả ảnh được load xong
            await Promise.all(imageLoadPromises);

            if (psdLayers.length === 0) {
                throw new Error('No layers to export');
            }

            console.log('Creating PSD with layers:', psdLayers.length);

            // Tạo PSD với ag-psd
            const psd = {
                width: preview.clientWidth * 2,
                height: preview.clientHeight * 2,
                children: psdLayers.map(layer => {
                    // Tính toán scale và rotation từ transform
                    let scale = layer.scale || 1;
                    let rotation = 0;
                    if (layer.transform) {
                        const matrix = new WebKitCSSMatrix(layer.transform);
                        rotation = Math.atan2(matrix.m12, matrix.m11) * 180 / Math.PI;
                    }

                    return {
                        name: layer.name,
                        left: Math.round(layer.left * 2),
                        top: Math.round(layer.top * 2),
                        visible: layer.visible,
                        imageData: layer.imageData,
                        opacity: 255,
                        transform: {
                            scale: scale,
                            rotation: rotation
                        }
                    };
                })
            };

            console.log('PSD options:', psd);

            const buffer = window.agPsd.writePsd(psd);

            console.log('PSD buffer created, size:', buffer.byteLength);

            // Download file
            downloadBufferAsFile(buffer, 'poker_hand.psd');
        } catch (error) {
            console.error('Error creating PSD:', error);
            alert('Error creating PSD file: ' + error.message + '\nPlease check console for details.');
        }
    };

    document.getElementById('addLayer').click();

    // Thêm event listener cho window resize
    window.addEventListener('resize', render);

    // Function to generate JSX script for Adobe Photoshop
    async function generateJSXScript() {
        const preview = document.getElementById('preview');
        const canvasWidth = 1668; // Đồng bộ với Photoshop document
        const canvasHeight = 880;
        
        let jsx = `// Generated JSX script for Adobe Photoshop
var docRef = app.documents.add(${canvasWidth}, ${canvasHeight}, 72, "Poker Cards Layout", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

function getAbsolutePath(filename) {
    return File($.fileName).parent + "/" + filename;
}

function pasteContent() {
    app.activeDocument = docRef;
    docRef.paste();
    return docRef.activeLayer;
}

function openAndCopy(filePath) {
    var fileRef = new File(filePath);
    if (!fileRef.exists) {
        alert("File not found: " + filePath);
        return false;
    }
    app.open(fileRef);
    var tempDoc = app.activeDocument;
    tempDoc.selection.selectAll();
    tempDoc.selection.copy();
    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    return true;
}

try {
`;

        // Bottom hand layer
        if (document.getElementById('enableHand').checked && currentHand) {
            const bottomHandImg = document.querySelector('.hand-layer:first-child');
            if (bottomHandImg) {
                const style = window.getComputedStyle(bottomHandImg);
                const img = new Image();
                img.src = currentHand.bottomLayer;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
                const width = img.naturalWidth * (currentHand.scale / 10);
                const height = img.naturalHeight * (currentHand.scale / 10);
                // Thêm trái 100px và cao 260px
                const left = parseInt(style.left) - 900;  // -800 - 100
                const top = parseInt(style.top) - 640;    // -610 - 30

                console.log('Bottom Hand:', { left, top, width, height });

                jsx += `
    if (openAndCopy(getAbsolutePath("${currentHand.id}_bottom.png"))) {
        var bottomHandLayer = pasteContent();
        bottomHandLayer.name = "Bottom_Hand";
        bottomHandLayer.translate(${left}, ${top});
        bottomHandLayer.resize(${currentHand.scale}, ${currentHand.scale}, AnchorPosition.MIDDLECENTER);
        if (${currentHand.rotation} !== 0) {
            bottomHandLayer.rotate(${currentHand.rotation}, AnchorPosition.MIDDLECENTER);
        }
    }`;
            }
        }

        // Card layers
        for (let i = 0; i < layers.length; i++) {
            const cards = layers[i].split(',').map(s => s.trim()).filter(Boolean);
            for (let j = 0; j < cards.length; j++) {
                const id = cards[j];
                if (!cardMap[id]) continue;
                
                const img = document.querySelector(`img[src="${cardMap[id]}"]`);
                if (!img) continue;
                
                const style = window.getComputedStyle(img);
                const originalSize = originalCardSizes[id];
                if (!originalSize) {
                    console.error(`Failed to load card ${id}: originalSize is undefined`);
                    continue;
                }
                const scale = parseFloat(style.width) / originalSize.width;
                const width = originalSize.width * scale;
                const height = originalSize.height * scale;
                const left = parseInt(style.left) - 800;
                const top = parseInt(style.top) - 380;

                console.log(`Card ${id} position:`, {
                    originalLeft: style.left,
                    originalTop: style.top,
                    parsedLeft: left,
                    parsedTop: top,
                    width,
                    height,
                    scale
                });

                jsx += `
    if (openAndCopy(getAbsolutePath("${id}.png"))) {
        var currentLayer = pasteContent();
        currentLayer.name = "Card_${id}";
        currentLayer.translate(${left}, ${top});
        currentLayer.resize(${scale.toFixed(2)}, ${scale.toFixed(2)}, AnchorPosition.MIDDLECENTER);
        var angle = ${style.transform !== 'none' ? `Math.atan2(${new WebKitCSSMatrix(style.transform).m12}, ${new WebKitCSSMatrix(style.transform).m11}) * 180 / Math.PI` : '0'};
        if (angle !== 0) {
            currentLayer.rotate(angle, AnchorPosition.MIDDLECENTER);
        }
    }`;
            }
        }

        // Top hand layer
        if (document.getElementById('enableHand').checked && currentHand) {
            const topHandImg = document.querySelector('.hand-layer:last-child');
            if (topHandImg) {
                const style = window.getComputedStyle(topHandImg);
                const img = new Image();
                img.src = currentHand.topLayer;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
                const width = img.naturalWidth * (currentHand.scale / 100);
                const height = img.naturalHeight * (currentHand.scale / 100);
                // Điều chỉnh vị trí cho top hand
                const left = parseInt(style.left) - 875;  // -870 - 5 (lệch thêm trái)
                const top = parseInt(style.top) - 530;    // -540 + 10 (thấp xuống)

                console.log('Top Hand:', { left, top, width, height });

                jsx += `
    if (openAndCopy(getAbsolutePath("${currentHand.id}_top.png"))) {
        var topHandLayer = pasteContent();
        topHandLayer.name = "Top_Hand";
        topHandLayer.translate(${left}, ${top});
        topHandLayer.resize(${currentHand.scale}, ${currentHand.scale}, AnchorPosition.MIDDLECENTER);
        if (${currentHand.rotation} !== 0) {
            topHandLayer.rotate(${currentHand.rotation}, AnchorPosition.MIDDLECENTER);
        }
    }`;
            }
        }

        jsx += `
} catch(e) {
    alert("Error: " + e);
}`;

        return jsx;
    }

    // Function to export configuration
    async function exportConfiguration() {
        const zip = new JSZip();
        
        // Add JSX script
        const jsxScript = await generateJSXScript();
        zip.file("layout.jsx", jsxScript);
        
        // Create a Set to track used card IDs
        const usedCardIds = new Set();
        
        // Get all cards in preview
        const cardElements = document.querySelectorAll('.card');
        cardElements.forEach(card => {
            const cardSrc = card.src;
            for (const [id, url] of Object.entries(cardMap)) {
                if (url === cardSrc) {
                    usedCardIds.add(id);
                    break;
                }
            }
        });
        
        // Add only used card images
        for (const id of usedCardIds) {
            const response = await fetch(cardMap[id]);
            const blob = await response.blob();
            zip.file(`${id}.png`, blob);
        }
        
        // Add hand images only if enabled and visible in preview
        if (document.getElementById('enableHand').checked && currentHand) {
            const bottomHandImg = document.querySelector('.hand-layer:first-child');
            const topHandImg = document.querySelector('.hand-layer:last-child');
            
            if (bottomHandImg) {
                const bottomResponse = await fetch(currentHand.bottomLayer);
                const bottomBlob = await bottomResponse.blob();
                zip.file(`${currentHand.id}_bottom.png`, bottomBlob);
            }
            
            if (topHandImg) {
                const topResponse = await fetch(currentHand.topLayer);
                const topBlob = await topResponse.blob();
                zip.file(`${currentHand.id}_top.png`, topBlob);
            }
        }
        
        // Generate and download zip file
        const content = await zip.generateAsync({type: "blob"});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "poker_layout_configuration.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Add export button to UI
    document.getElementById('exportConfig').addEventListener('click', exportConfiguration);

    function downloadBufferAsFile(buffer, filename) {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const previewRect = document.getElementById('preview').getBoundingClientRect();
        return {
            left: rect.left - previewRect.left,
            top: rect.top - previewRect.top
        };
    }

    document.getElementById('aiBackground').addEventListener('change', function(e) {
        aiBackground = e.target.checked;
        // backgroundEnabled = e.target.checked;
        document.getElementById('backgroundAIControl').style.display = aiBackground ? 'block' : 'none';
        render();
    });

    document.getElementById('ai_bg_generate').addEventListener('click', function (){
        let prompt = document.getElementById('bg_prompt').value;
        if(prompt != ""){
            generating_image = true;
            generateImage(prompt).then(ret=>{
                backgroundImageBase64 = ret
                generating_image = false;
                document.getElementById('ai_bg_generate').disabled = false;
                document.getElementById("ai_bg_generate").innerText = "Generate";
                render();
            })
            document.getElementById('ai_bg_generate').disabled = true;
            document.getElementById("ai_bg_generate").innerText = "Generating...";
            render();
        }

        // callOpenAI("introduct about a cat").then(ret=>{
        //     console.log(ret);
        // })

    });

    document.getElementById('enableBackground').addEventListener('change', function(e) {
        backgroundEnabled = e.target.checked;
        document.getElementById('backgroundOptions').style.display = backgroundEnabled ? 'block' : 'none';
        render();
    });
    document.getElementById('backgroundImageInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            backgroundImage = evt.target.result;
            render();
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('backgroundX').addEventListener('input', function(e) {
        backgroundX = parseInt(e.target.value) || 0;
        render();
    });
    document.getElementById('backgroundY').addEventListener('input', function(e) {
        backgroundY = parseInt(e.target.value) || 0;
        render();
    });
    document.getElementById('backgroundScale').addEventListener('input', function(e) {
        backgroundScale = parseInt(e.target.value) || 100;
        render();
    });
    document.getElementById('backgroundRotation').addEventListener('input', function(e) {
        backgroundRotation = parseInt(e.target.value) || 0;
        render();
    });

    document.getElementById('backgroundAutoFit').addEventListener('change', function(e) {
        backgroundAutoFit = e.target.checked;
        // Disable/enable các input scale/x/y/rotation
        document.getElementById('backgroundScale').disabled = backgroundAutoFit;
        document.getElementById('backgroundX').disabled = backgroundAutoFit;
        document.getElementById('backgroundY').disabled = backgroundAutoFit;
        document.getElementById('backgroundRotation').disabled = backgroundAutoFit;
        render();
    });

    // Thêm logic từ font-design.js vào app.js
    document.addEventListener('DOMContentLoaded', function() {
        const textInput = document.getElementById('textInput');
        const fontSelect = document.getElementById('fontSelect');
        const fillColor = document.getElementById('fillColor');
        const strokeColor = document.getElementById('strokeColor');
        const strokeWidth = document.getElementById('strokeWidth');
        const shadowColor = document.getElementById('shadowColor');
        const shadowBlur = document.getElementById('shadowBlur');
        const glowColor = document.getElementById('glowColor');
        const glowBlur = document.getElementById('glowBlur');
        const rotate = document.getElementById('rotate');
        const textScale = document.getElementById('textScale');
        const textX = document.getElementById('textX');
        const textY = document.getElementById('textY');
        const savePreset = document.getElementById('savePreset');
        const loadPreset = document.getElementById('loadPreset');
        const cloneLayer = document.getElementById('cloneLayer');
        const removeLayer = document.getElementById('removeLayer');
        const toggleMinimal = document.getElementById('toggleMinimal');
        const textLayerControls = document.getElementById('textLayerControls');
        const preview = document.getElementById('preview');

        // Hiện UI khi ấn Add Text
        document.getElementById('addTextElement').addEventListener('click', function() {
            textLayerControls.style.display = 'block';
        });

        // Hàm cập nhật preview
        function updatePreview() {
            const text = textInput.value;
            const font = fontSelect.value;
            const fill = fillColor.value;
            const stroke = strokeColor.value;
            const strokeW = strokeWidth.value;
            const shadow = shadowColor.value;
            const shadowB = shadowBlur.value;
            const glow = glowColor.value;
            const glowB = glowBlur.value;
            const rotation = rotate.value;
            const scale = textScale.value;
            const x = textX.value;
            const y = textY.value;

            preview.innerHTML = `<div style="font-family: ${font}; color: ${fill}; stroke: ${stroke}; stroke-width: ${strokeW}px; text-shadow: 0 0 ${shadowB}px ${shadow}; filter: drop-shadow(0 0 ${glowB}px ${glow}); transform: translate(${x}px, ${y}px) scale(${scale/100}) rotate(${rotation}deg);">${text}</div>`;
        }

        // Cập nhật preview khi thay đổi
        textInput.addEventListener('input', updatePreview);
        fontSelect.addEventListener('change', updatePreview);
        fillColor.addEventListener('input', updatePreview);
        strokeColor.addEventListener('input', updatePreview);
        strokeWidth.addEventListener('input', updatePreview);
        shadowColor.addEventListener('input', updatePreview);
        shadowBlur.addEventListener('input', updatePreview);
        glowColor.addEventListener('input', updatePreview);
        glowBlur.addEventListener('input', updatePreview);
        rotate.addEventListener('input', updatePreview);
        textScale.addEventListener('input', updatePreview);
        textX.addEventListener('input', updatePreview);
        textY.addEventListener('input', updatePreview);

        // Lưu preset
        savePreset.addEventListener('click', function() {
            const preset = {
                text: textInput.value,
                font: fontSelect.value,
                fill: fillColor.value,
                stroke: strokeColor.value,
                strokeWidth: strokeWidth.value,
                shadow: shadowColor.value,
                shadowBlur: shadowBlur.value,
                glow: glowColor.value,
                glowBlur: glowBlur.value,
                rotation: rotate.value,
                scale: textScale.value,
                x: textX.value,
                y: textY.value
            };
            localStorage.setItem('textPreset', JSON.stringify(preset));
            alert('Preset saved!');
        });

        // Load preset
        loadPreset.addEventListener('click', function() {
            const preset = JSON.parse(localStorage.getItem('textPreset'));
            if (preset) {
                textInput.value = preset.text;
                fontSelect.value = preset.font;
                fillColor.value = preset.fill;
                strokeColor.value = preset.stroke;
                strokeWidth.value = preset.strokeWidth;
                shadowColor.value = preset.shadow;
                shadowBlur.value = preset.shadowBlur;
                glowColor.value = preset.glow;
                glowBlur.value = preset.glowBlur;
                rotate.value = preset.rotation;
                textScale.value = preset.scale;
                textX.value = preset.x;
                textY.value = preset.y;
                updatePreview();
            }
        });

        // Clone layer
        cloneLayer.addEventListener('click', function() {
            const newText = textInput.value;
            const newFont = fontSelect.value;
            const newFill = fillColor.value;
            const newStroke = strokeColor.value;
            const newStrokeW = strokeWidth.value;
            const newShadow = shadowColor.value;
            const newShadowB = shadowBlur.value;
            const newGlow = glowColor.value;
            const newGlowB = glowBlur.value;
            const newRotation = rotate.value;
            const newScale = textScale.value;
            const newX = textX.value;
            const newY = textY.value;

            const textElementsContainer = document.getElementById('textElementsContainer');
            const newLayer = document.createElement('div');
            newLayer.innerHTML = `<div style="font-family: ${newFont}; color: ${newFill}; stroke: ${newStroke}; stroke-width: ${newStrokeW}px; text-shadow: 0 0 ${newShadowB}px ${newShadow}; filter: drop-shadow(0 0 ${newGlowB}px ${newGlow}); transform: translate(${newX}px, ${newY}px) scale(${newScale/100}) rotate(${newRotation}deg);">${newText}</div>`;
            textElementsContainer.appendChild(newLayer);
        });

        // Remove layer
        removeLayer.addEventListener('click', function() {
            const textElementsContainer = document.getElementById('textElementsContainer');
            if (textElementsContainer.lastChild) {
                textElementsContainer.removeChild(textElementsContainer.lastChild);
            }
        });

        // Toggle minimal
        let isMinimal = false;
        toggleMinimal.addEventListener('click', function() {
            isMinimal = !isMinimal;
            const styleControls = document.querySelector('.style-controls');
            styleControls.style.display = isMinimal ? 'none' : 'block';
        });
    });
});
