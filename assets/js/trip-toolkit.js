(() => {
    "use strict";

    const root = document.querySelector("[data-trip-toolkit]");
    if (!root) return;

    const tripConfig = window.TRIP_CONFIG;
    const mapItems = (tripConfig?.days || []).map((day) => ({
        day: `Day ${day.number}`,
        group: day.route.group,
        title: day.route.title,
        description: day.route.description,
        url: day.route.mapsUrl
    })).concat(tripConfig?.toolkit?.extraMapItems || []);
    const weatherLocations = tripConfig?.toolkit?.weatherLocations || {};
    const phrases = [
        ["greetings", "Hello", "Hallo", "Γεια σας", "Yia sas"],
        ["greetings", "Good morning", "Guten Morgen", "Καλημέρα", "Kaliméra"],
        ["greetings", "Thank you", "Danke", "Ευχαριστώ", "Efcharistó"],
        ["greetings", "Please", "Bitte", "Παρακαλώ", "Parakaló"],
        ["restaurants", "A table for three, please", "Einen Tisch für drei, bitte", "Ένα τραπέζι για τρία άτομα, παρακαλώ", "Éna trapézi gia tría átoma, parakaló"],
        ["restaurants", "The menu, please", "Die Speisekarte, bitte", "Το μενού, παρακαλώ", "To menú, parakaló"],
        ["restaurants", "What do you recommend?", "Was empfehlen Sie?", "Τι προτείνετε;", "Ti protínete?"],
        ["dietary", "I am vegetarian", "Ich bin Vegetarier/in", "Είμαι χορτοφάγος", "Íme chortofágos"],
        ["dietary", "Does this contain nuts?", "Enthält das Nüsse?", "Περιέχει ξηρούς καρπούς;", "Periéchi xiroús karpoús?"],
        ["dietary", "I have a food allergy", "Ich habe eine Lebensmittelallergie", "Έχω τροφική αλλεργία", "Écho trofikí allergía"],
        ["directions", "Where is this address?", "Wo ist diese Adresse?", "Πού είναι αυτή η διεύθυνση;", "Poú íne aftí i diéfthynsi?"],
        ["directions", "How far is it?", "Wie weit ist es?", "Πόσο μακριά είναι;", "Póso makriá íne?"],
        ["directions", "Please take us here", "Bitte bringen Sie uns hierhin", "Παρακαλώ, πηγαίνετέ μας εδώ", "Parakaló, pigéneté mas edó"],
        ["hotels", "We have a reservation", "Wir haben eine Reservierung", "Έχουμε κράτηση", "Échoume krátisi"],
        ["hotels", "Can we leave our luggage here?", "Können wir unser Gepäck hier lassen?", "Μπορούμε να αφήσουμε τις αποσκευές μας εδώ;", "Boroúme na afísoume tis aposkevés mas edó?"],
        ["ferries", "Where is the boarding gate?", "Wo ist das Abfahrtsgate?", "Πού είναι η πύλη επιβίβασης;", "Poú íne i píli epivívasis?"],
        ["ferries", "Is the ferry delayed?", "Hat die Fähre Verspätung?", "Έχει καθυστέρηση το πλοίο;", "Échi kathystérisi to plío?"],
        ["car rental", "Where do we return the car?", "Wo geben wir das Auto zurück?", "Πού επιστρέφουμε το αυτοκίνητο;", "Poú epistréfoume to aftokínito?"],
        ["car rental", "The car has a problem", "Das Auto hat ein Problem", "Το αυτοκίνητο έχει πρόβλημα", "To aftokínito échi próvlima"],
        ["payment", "Can we pay by card?", "Können wir mit Karte bezahlen?", "Μπορούμε να πληρώσουμε με κάρτα;", "Boroúme na plirósoume me kárta?"],
        ["payment", "The bill, please", "Die Rechnung, bitte", "Τον λογαριασμό, παρακαλώ", "Ton logariasmó, parakaló"],
        ["emergencies", "I need help", "Ich brauche Hilfe", "Χρειάζομαι βοήθεια", "Chreiázomai voítheia"],
        ["emergencies", "Call an ambulance", "Rufen Sie einen Krankenwagen", "Καλέστε ασθενοφόρο", "Kaléste asthenofóro"],
        ["emergencies", "Where is the pharmacy?", "Wo ist die Apotheke?", "Πού είναι το φαρμακείο;", "Poú íne to farmakío?"]
    ].map(([category, en, de, greek, pronunciation], index) => ({ id: index, category, en, de, greek, pronunciation }));

    const tabs = [...root.querySelectorAll('.toolkit-tabs [role="tab"]')];
    const panels = [...root.querySelectorAll('.toolkit-panel')];
    const toolkitTabs = root.querySelector(".toolkit-tabs");
    const toolkitOrigin = document.createElement("span");
    toolkitOrigin.className = "toolkit-origin";
    toolkitOrigin.setAttribute("aria-hidden", "true");
    toolkitTabs.before(toolkitOrigin);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const page = document.querySelector(".essentials-page");
    const outerTabbar = document.querySelector(".essentials-tabbar-wrap");
    const desktopStack = 117;
    const mobileStack = 107;
    let toolkitAnchor = 0;
    let lastScrollY = window.scrollY;
    let programmaticScroll = false;

    const visibleStack = () => window.matchMedia("(max-width: 620px)").matches ? mobileStack : desktopStack;
    const condensedStack = () => 59;
    const measureToolkitAnchor = () => {
        toolkitAnchor = toolkitOrigin.getBoundingClientRect().top + window.scrollY;
    };
    const updateOuterNavigation = () => {
        if (!page || !outerTabbar || root.offsetParent === null) return;
        const currentY = window.scrollY;
        const barsTouching = page.classList.contains("toolkit-nav-condensed")
            ? currentY + visibleStack() >= toolkitAnchor
            : toolkitTabs.getBoundingClientRect().top <= outerTabbar.getBoundingClientRect().bottom + 1;
        if (barsTouching && (currentY > lastScrollY + 2 || programmaticScroll)) {
            page.classList.add("toolkit-nav-condensed");
        } else if (!barsTouching) {
            page.classList.remove("toolkit-nav-condensed");
        }
        lastScrollY = currentY;
    };
    const alignToolkit = () => {
        const targetY = Math.max(0, toolkitAnchor - condensedStack());
        if (Math.abs(window.scrollY - targetY) <= 1) {
            lastScrollY = window.scrollY;
            programmaticScroll = false;
            return;
        }
        programmaticScroll = true;
        page?.classList.add("toolkit-nav-condensed");
        window.scrollTo({
            top: targetY,
            behavior: reduceMotion.matches ? "auto" : "smooth"
        });
        window.setTimeout(() => {
            lastScrollY = window.scrollY;
            programmaticScroll = false;
        }, reduceMotion.matches ? 0 : 500);
    };

    requestAnimationFrame(() => {
        measureToolkitAnchor();
        updateOuterNavigation();
    });
    window.addEventListener("scroll", updateOuterNavigation, { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(measureToolkitAnchor));
    document.querySelectorAll(".essentials-tab").forEach(tab => tab.addEventListener("click", () => {
        if (tab.getAttribute("aria-controls") !== "tools") page?.classList.remove("toolkit-nav-condensed");
    }));

    const activateMode = (tab, focus = false, align = false) => {
        const shouldAlign = align && Math.abs(window.scrollY - (toolkitAnchor - condensedStack())) > 1;
        if (shouldAlign) {
            programmaticScroll = true;
            page?.classList.add("toolkit-nav-condensed");
        }
        tabs.forEach(item => {
            const active = item === tab;
            item.setAttribute("aria-selected", String(active));
            item.tabIndex = active ? 0 : -1;
            document.getElementById(item.getAttribute("aria-controls")).hidden = !active;
        });
        if (focus) tab.focus();
        if (shouldAlign) requestAnimationFrame(alignToolkit);
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activateMode(tab, false, true));
        tab.addEventListener("keydown", event => {
            let target = null;
            if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
            if (event.key === "ArrowLeft") target = (index - 1 + tabs.length) % tabs.length;
            if (event.key === "Home") target = 0;
            if (event.key === "End") target = tabs.length - 1;
            if (target !== null) {
                event.preventDefault();
                activateMode(tabs[target], true, true);
            }
        });
    });

    const mapFilters = document.getElementById("map-filters");
    const mapResults = document.getElementById("map-results");
    const mapPreviewFrame = document.getElementById("map-preview-frame");
    const mapPreviewCaption = document.getElementById("map-preview-caption");
    const mapGroups = ["All", ...new Set(mapItems.map(item => item.group))];
    let activeMapGroup = "All";
    const showMapPreview = item => {
        const query = item.group === "Rethymno" ? "Rethymno, Crete" : item.group === "Knossos" ? "Palace of Knossos" : `${item.group}, Greece`;
        mapPreviewFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
        mapPreviewCaption.textContent = `${item.title} · ${item.day}`;
    };
    const renderMaps = () => {
        mapFilters.innerHTML = mapGroups.map(group => `<button type="button" aria-pressed="${group === activeMapGroup}" data-map-group="${group}">${group}</button>`).join("");
        const visible = mapItems.filter(item => activeMapGroup === "All" || item.group === activeMapGroup);
        mapResults.innerHTML = visible.map((item, index) => `<article><span>${item.day}</span><h4>${item.title}</h4><p>${item.description}</p><div><button type="button" data-map-preview="${mapItems.indexOf(item)}" aria-pressed="${index === 0}">Preview</button><a href="${item.url}" target="_blank" rel="noopener">Open Maps<svg class="external-link-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7ZM14 3v2h3.59L7.76 14.83l1.41 1.41L19 6.41V10h2V3h-7Z"/></svg><span class="sr-only">, new tab</span></a></div></article>`).join("");
        if (visible[0]) showMapPreview(visible[0]);
    };
    mapFilters.addEventListener("click", event => {
        const button = event.target.closest("[data-map-group]");
        if (!button) return;
        activeMapGroup = button.dataset.mapGroup;
        renderMaps();
    });
    mapResults.addEventListener("click", event => {
        const button = event.target.closest("[data-map-preview]");
        if (!button) return;
        mapResults.querySelectorAll("[data-map-preview]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        showMapPreview(mapItems[Number(button.dataset.mapPreview)]);
    });
    renderMaps();

    const weatherButtons = document.getElementById("weather-locations");
    const weatherStatus = document.getElementById("weather-status");
    const weatherResult = document.getElementById("weather-result");
    let activeWeatherLocation = "Athens";
    const weatherDescriptions = code => {
        if (code === 0) return "Clear";
        if ([1, 2].includes(code)) return "Mostly clear";
        if (code === 3) return "Overcast";
        if ([45, 48].includes(code)) return "Fog";
        if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
        if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
        if ([95, 96, 99].includes(code)) return "Thunderstorms";
        return "Mixed conditions";
    };
    const formatTime = value => value ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";
    const renderWeatherButtons = () => {
        weatherButtons.innerHTML = Object.keys(weatherLocations).map(name => `<button type="button" aria-pressed="${name === activeWeatherLocation}" data-weather-location="${name}">${name}</button>`).join("");
    };
    const loadWeather = async name => {
        activeWeatherLocation = name;
        renderWeatherButtons();
        weatherStatus.innerHTML = `<span class="tool-spinner" aria-hidden="true"></span> Loading ${name} weather…`;
        weatherResult.innerHTML = "";
        if (!navigator.onLine) {
            weatherStatus.innerHTML = `You appear to be offline. Live weather needs a connection. <button type="button" data-weather-retry>Retry</button>`;
            return;
        }
        const { latitude, longitude } = weatherLocations[name];
        const params = new URLSearchParams({ latitude, longitude, current: "temperature_2m,weather_code,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset", timezone: "auto", forecast_days: "4", wind_speed_unit: "kmh" });
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
            if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
            const data = await response.json();
            const updated = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
            weatherStatus.textContent = `Updated ${updated} · Local time in ${name}`;
            const days = data.daily.time.map((date, index) => ({ date, code: data.daily.weather_code[index], high: data.daily.temperature_2m_max[index], low: data.daily.temperature_2m_min[index], rain: data.daily.precipitation_probability_max[index] }));
            weatherResult.innerHTML = `<article class="weather-now"><div><span>${name} now</span><strong>${Math.round(data.current.temperature_2m)}°</strong><p>${weatherDescriptions(data.current.weather_code)}</p></div><dl><div><dt>Today</dt><dd>${Math.round(days[0].high)}° / ${Math.round(days[0].low)}°</dd></div><div><dt>Rain</dt><dd>${days[0].rain ?? 0}%</dd></div><div><dt>Wind</dt><dd>${Math.round(data.current.wind_speed_10m)} km/h</dd></div><div><dt>Sunset</dt><dd>${formatTime(data.daily.sunset[0])}</dd></div></dl></article><div class="weather-days">${days.slice(1).map(day => `<article><time datetime="${day.date}">${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</time><strong>${Math.round(day.high)}° / ${Math.round(day.low)}°</strong><span>${weatherDescriptions(day.code)}</span><small>${day.rain ?? 0}% rain</small></article>`).join("")}</div>`;
        } catch (error) {
            weatherStatus.innerHTML = `Live weather is unavailable right now. <button type="button" data-weather-retry>Try again</button>`;
            console.warn("Trip Toolkit weather:", error.message);
        }
    };
    weatherButtons.addEventListener("click", event => {
        const button = event.target.closest("[data-weather-location]");
        if (button) loadWeather(button.dataset.weatherLocation);
    });
    weatherStatus.addEventListener("click", event => {
        if (event.target.closest("[data-weather-retry]")) loadWeather(activeWeatherLocation);
    });
    loadWeather(activeWeatherLocation);

    const sourceLanguage = document.getElementById("translate-source-language");
    const translateInput = document.getElementById("translate-input");
    const externalTranslate = document.getElementById("translate-external");
    const phraseSearch = document.getElementById("phrase-search");
    const phraseCategories = document.getElementById("phrase-categories");
    const phraseResults = document.getElementById("phrase-results");
    const categories = ["all", ...new Set(phrases.map(phrase => phrase.category))];
    const speechAvailable = "speechSynthesis" in window;
    let activeCategory = "all";
    const updateTranslateLink = () => {
        const text = translateInput.value.trim();
        const params = new URLSearchParams({ sl: sourceLanguage.value, tl: "el", text, op: "translate" });
        externalTranslate.href = text ? `https://translate.google.com/?${params}` : "https://translate.google.com/";
        externalTranslate.setAttribute("aria-disabled", String(!text));
    };
    const renderPhrases = () => {
        const query = phraseSearch.value.trim().toLocaleLowerCase();
        phraseCategories.innerHTML = categories.map(category => `<button type="button" aria-pressed="${category === activeCategory}" data-phrase-category="${category}">${category.replace(/^./, value => value.toUpperCase())}</button>`).join("");
        const visible = phrases.filter(phrase => (activeCategory === "all" || phrase.category === activeCategory) && (!query || [phrase.en, phrase.de, phrase.greek, phrase.category].some(value => value.toLocaleLowerCase().includes(query))));
        phraseResults.innerHTML = visible.length ? visible.map(phrase => `<article><div><p>${sourceLanguage.value === "de" ? phrase.de : phrase.en}</p><strong lang="el">${phrase.greek}</strong><small>${phrase.pronunciation}</small></div>${speechAvailable ? `<div class="phrase-actions"><button type="button" data-speak-phrase="${phrase.id}">Play<span class="sr-only"> Greek pronunciation</span></button></div>` : ""}</article>`).join("") : `<p class="tool-empty">No phrase found. Try a shorter search or use the translator above.</p>`;
    };
    translateInput.addEventListener("input", updateTranslateLink);
    sourceLanguage.addEventListener("change", () => { updateTranslateLink(); renderPhrases(); });
    phraseSearch.addEventListener("input", renderPhrases);
    phraseCategories.addEventListener("click", event => {
        const button = event.target.closest("[data-phrase-category]");
        if (!button) return;
        activeCategory = button.dataset.phraseCategory;
        renderPhrases();
    });
    phraseResults.addEventListener("click", event => {
        const speakButton = event.target.closest("[data-speak-phrase]");
        const phrase = phrases.find(item => item.id === Number(speakButton?.dataset.speakPhrase));
        if (!phrase) return;
        if (speakButton && speechAvailable) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(phrase.greek);
            utterance.lang = "el-GR";
            speechSynthesis.speak(utterance);
        }
    });
    document.getElementById("clear-translate").addEventListener("click", () => { translateInput.value = ""; updateTranslateLink(); translateInput.focus(); });
    updateTranslateLink();
    renderPhrases();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceButton = document.getElementById("voice-input");
    const voiceStatus = document.getElementById("voice-status");
    if (SpeechRecognition) {
        voiceButton.hidden = false;
        voiceButton.addEventListener("click", () => {
            const recognition = new SpeechRecognition();
            recognition.lang = sourceLanguage.value === "de" ? "de-DE" : "en-US";
            recognition.interimResults = false;
            voiceStatus.textContent = "Listening…";
            voiceButton.disabled = true;
            recognition.onresult = event => { translateInput.value = event.results[0][0].transcript; updateTranslateLink(); voiceStatus.textContent = "Voice text added."; };
            recognition.onerror = () => { voiceStatus.textContent = "Voice input was not available. You can still type the phrase."; };
            recognition.onend = () => { voiceButton.disabled = false; };
            recognition.start();
        });
    } else {
        voiceStatus.textContent = "Voice input is not supported by this browser; typed translation still works.";
    }

    const scannerFile = document.getElementById("scanner-file");
    const scannerWrap = document.getElementById("scanner-preview-wrap");
    const scannerPreview = document.getElementById("scanner-preview");
    const scannerStatus = document.getElementById("scanner-status");
    const scannerOutput = document.getElementById("scanner-output");
    const scannerOpenTranslate = document.getElementById("scanner-open-translate");
    let imageUrl = "";
    const clearImage = () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = "";
        scannerFile.value = "";
        scannerPreview.removeAttribute("src");
        scannerOutput.value = "";
        scannerOpenTranslate.hidden = true;
        scannerWrap.hidden = true;
        scannerStatus.textContent = "";
    };
    scannerFile.addEventListener("change", () => {
        const file = scannerFile.files[0];
        if (!file) return;
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = URL.createObjectURL(file);
        scannerPreview.src = imageUrl;
        scannerWrap.hidden = false;
        scannerStatus.textContent = "Image ready. Text recognition starts only when you choose Extract text.";
    });
    document.getElementById("remove-image").addEventListener("click", clearImage);
    const loadTesseract = () => new Promise((resolve, reject) => {
        if (window.Tesseract) return resolve(window.Tesseract);
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.onload = () => resolve(window.Tesseract);
        script.onerror = () => reject(new Error("OCR component could not load"));
        document.head.appendChild(script);
    });
    document.getElementById("scan-image").addEventListener("click", async event => {
        if (!scannerFile.files[0]) return;
        const button = event.currentTarget;
        button.disabled = true;
        scannerStatus.textContent = "Loading text recognition…";
        try {
            const Tesseract = await loadTesseract();
            const result = await Tesseract.recognize(scannerFile.files[0], "eng+deu+ell", { logger: message => { if (message.status === "recognizing text") scannerStatus.textContent = `Reading text… ${Math.round((message.progress || 0) * 100)}%`; } });
            const text = result.data.text.trim();
            if (!text) throw new Error("No readable text found");
            scannerOutput.value = text.slice(0, 500);
            translateInput.value = text.slice(0, 500);
            updateTranslateLink();
            scannerOpenTranslate.hidden = false;
            scannerStatus.textContent = "Text detected and prepared for translation. Check it first—menus remain capable of surprises.";
        } catch (error) {
            scannerStatus.textContent = "The text could not be read. Try a sharper, well-lit photo or type it manually.";
            console.warn("Trip Toolkit OCR:", error.message);
        } finally {
            button.disabled = false;
        }
    });
    scannerOutput.addEventListener("input", () => {
        translateInput.value = scannerOutput.value.slice(0, 500);
        updateTranslateLink();
        scannerOpenTranslate.hidden = !scannerOutput.value.trim();
    });
    scannerOpenTranslate.addEventListener("click", () => {
        activateMode(document.getElementById("tool-tab-translate"), true, true);
        translateInput.focus();
    });
})();
