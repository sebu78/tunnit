// Asetetaan kiinteat palkka arvot
const TUNTIPALKKA = 14.90;
const PAIVARAHA_ARVO = 52.00;

// Haetaan HTML elementit muuttujiin
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutButton = document.getElementById('logoutButton');
const currentUsernameSpan = document.getElementById('currentUsername');

const pvmInput = document.getElementById('pvm');
const asiakasInput = document.getElementById('asiakas');
const paikkakuntaInput = document.getElementById('paikkakunta');
const tunnitInput = document.getElementById('tunnit');
const urakkaInput = document.getElementById('urakka');
const tyontehtavaInput = document.getElementById('tyontehtava');
const paivarahatCheckbox = document.getElementById('paivarahatCheckbox');
const lisaaButton = document.getElementById('lisaaButton');
const merkinnatLista = document.getElementById('merkinnatLista');
const tallennaKuukausiButton = document.getElementById('tallennaKuukausi');
const viestiAlue = document.getElementById('viestiAlue');

const urakkaYhteensaSpan = document.getElementById('urakkaYhteensa');
const tuntiPalkkaYhteensaSpan = document.getElementById('tuntiPalkkaYhteensa');
const paivarahatYhteensaSpan = document.getElementById('paivarahatYhteensa');
const bruttoPalkkaYhteensaSpan = document.getElementById('bruttoPalkkaYhteensa');

let merkinnat = [];
let token = localStorage.getItem('token') || '';

function naytaViesti(teksti, tyyppi = 'info', alue = 'viestiAlue') {
    const viestiElement = document.getElementById(alue);
    if (!viestiElement) return;
    
    viestiElement.textContent = teksti;
    viestiElement.className = 'viesti ' + tyyppi;
    setTimeout(() => {
        viestiElement.textContent = '';
        viestiElement.className = '';
    }, 3000);
}

function paivitaYhteenveto() {
    // Koodi pysyy samana kuin aiemmin
    let kokonaisUrakka = 0;
    let kokonaisTunnit = 0;
    let kokonaisPaivarahat = 0;
    
    merkinnat.forEach(merkinta => {
        if (merkinta.urakka > 0) {
            kokonaisUrakka += parseFloat(merkinta.urakka);
        } else if (merkinta.tunnit > 0) {
            kokonaisTunnit += parseFloat(merkinta.tunnit);
        }
        kokonaisPaivarahat += parseFloat(merkinta.paivarahat);
    });

    const tuntiPalkkaYhteensa = kokonaisTunnit * TUNTIPALKKA;
    const bruttoPalkka = kokonaisUrakka + tuntiPalkkaYhteensa;

    urakkaYhteensaSpan.textContent = kokonaisUrakka.toFixed(2);
    tuntiPalkkaYhteensaSpan.textContent = tuntiPalkkaYhteensa.toFixed(2);
    paivarahatYhteensaSpan.textContent = kokonaisPaivarahat.toFixed(2);
    bruttoPalkkaYhteensaSpan.textContent = bruttoPalkka.toFixed(2);
}

function paivitaMerkinnatLista() {
    // Koodi pysyy samana, mutta poistofunktiota on muutettava
    merkinnatLista.innerHTML = '';
    merkinnat.forEach((merkinta, index) => {
        const li = document.createElement('li');
        let teksti = '' + merkinta.pvm + ': ';
        
        let lisatiedot = [];
        if (merkinta.asiakas) lisatiedot.push(merkinta.asiakas);
        if (merkinta.paikkakunta) lisatiedot.push(merkinta.paikkakunta);
        if (lisatiedot.length > 0) {
            teksti += '(' + lisatiedot.join(', ') + ') ';
        }
        
        if (merkinta.urakka > 0) {
            teksti += 'Urakka (' + parseFloat(merkinta.urakka).toFixed(2) + ' €)';
        } else {
            teksti += '' + parseFloat(merkinta.tunnit).toFixed(2) + ' h';
        }
        
        if (merkinta.paivarahat > 0) {
            teksti += ' + Paivaraha (' + parseFloat(merkinta.paivarahat).toFixed(2) + ' €)';
        }
        
        li.innerHTML = `
            <span>` + teksti + `</span>
            <div class="merkinta-toiminnot">
                <button class="poista-btn" data-index="` + index + `">Poista</button>
            </div>
        `;

        li.querySelector('.poista-btn').addEventListener('click', function() {
            if (confirm("Haluatko varmasti poistaa merkinnan?")) {
                poistaMerkinta(index);
            }
        });
        
        merkinnatLista.appendChild(li);
    });
}

// UUSI FUNKTIO: poista merkinta palvelimelta
async function poistaMerkinta(index) {
    if (!token) {
        naytaViesti('Et ole kirjautunut sisaan.', 'error');
        return;
    }
    
    const merkintaId = merkinnat[index].id;
    
    try {
        const response = await fetch('/api/merkinta', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ merkintaId })
        });
        
        if (response.ok) {
            // Poistetaan merkinta paikallisesta taulukosta
            merkinnat.splice(index, 1);
            paivitaMerkinnatLista();
            paivitaYhteenveto();
            naytaViesti('Merkinta poistettu onnistuneesti.', 'success');
        } else {
            naytaViesti('Merkinnan poisto epaonnistui.', 'error');
        }
    } catch (error) {
        naytaViesti('Virhe yhteydessa palvelimeen.', 'error');
    }
}

// UUSI FUNKTIO: lisataan merkinta palvelimelle
async function lisaaMerkinta() {
    if (!token) {
        naytaViesti('Et ole kirjautunut sisaan.', 'error');
        return;
    }
    
    const pvm = pvmInput.value;
    const tunnit = parseFloat(tunnitInput.value) || 0;
    const urakka = parseFloat(urakkaInput.value) || 0;

    if (!pvm || (tunnit <= 0 && urakka <= 0)) {
        naytaViesti("Syota paivamaara seka tunnit tai urakan hinta.", "error");
        return;
    }

    const uusiMerkinta = {
        pvm: pvm,
        asiakas: asiakasInput.value,
        paikkakunta: paikkakuntaInput.value,
        tunnit: tunnit,
        urakka: urakka,
        tyontehtava: tyontehtavaInput.value,
        paivarahat: paivarahatCheckbox.checked ? PAIVARAHA_ARVO : 0
    };

    try {
        const response = await fetch('/api/merkinta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(uusiMerkinta)
        });
        
        if (response.ok) {
            const data = await response.json();
            merkinnat.push(data); // Lisataan palvelimen palauttama data, jossa on ID
            tyhjennaLomake();
            paivitaMerkinnatLista();
            paivitaYhteenveto();
            naytaViesti('Merkinta lisatty onnistuneesti.', 'success');
        } else {
            naytaViesti('Merkinnan lisays epaonnistui.', 'error');
        }
    } catch (error) {
        naytaViesti('Virhe yhteydessa palvelimeen.', 'error');
    }
}

// UUSI FUNKTIO: ladataan merkinnat palvelimelta
async function lataaMerkinnat() {
    if (!token) {
        naytaViesti('Et ole kirjautunut sisaan.', 'error', 'viestiAlueLogin');
        return;
    }

    try {
        const response = await fetch('/api/merkinnat', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (response.ok) {
            const data = await response.json();
            merkinnat = data.merkinnat;
            paivitaMerkinnatLista();
            paivitaYhteenveto();
        } else {
            naytaViesti('Merkintojen lataus epaonnistui.', 'error');
        }
    } catch (error) {
        naytaViesti('Virhe yhteydessa palvelimeen.', 'error');
    }
}

// Tallenna kuukausi (PDF) funktio pysyy samana, mutta merkintojä ei tyhjennetä
function tallennaKuukausi() {
    // ... koodi pysyy samana ...
}

// Kirjautumisen ja rekisteröitymisen kasittely
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kayttajanimi = e.target.loginKayttajanimi.value;
    const salasana = e.target.loginSalasana.value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kayttajanimi, salasana })
        });

        if (response.ok) {
            const data = await response.json();
            token = data.token;
            localStorage.setItem('token', token);
            localStorage.setItem('username', kayttajanimi);
            naytaViesti('Kirjautuminen onnistui!', 'success', 'viestiAlueLogin');
            siirryAppNakymaan();
            lataaMerkinnat();
        } else {
            naytaViesti('Kirjautuminen epaonnistui.', 'error', 'viestiAlueLogin');
        }
    } catch (error) {
        naytaViesti('Virhe yhteydessa palvelimeen.', 'error', 'viestiAlueLogin');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kayttajanimi = e.target.registerKayttajanimi.value;
    const salasana = e.target.registerSalasana.value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kayttajanimi, salasana })
        });
        
        if (response.ok) {
            naytaViesti('Rekisteröityminen onnistui! Voit nyt kirjautua sisaan.', 'success', 'viestiAlueLogin');
        } else {
            const error = await response.json();
            naytaViesti(error.message, 'error', 'viestiAlueLogin');
        }
    } catch (error) {
        naytaViesti('Virhe yhteydessa palvelimeen.', 'error', 'viestiAlueLogin');
    }
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    token = '';
    merkinnat = [];
    siirryLoginNakymaan();
    paivitaMerkinnatLista();
    paivitaYhteenveto();
});

function siirryAppNakymaan() {
    loginSection.style.display = 'none';
    appSection.style.display = 'grid';
    currentUsernameSpan.textContent = localStorage.getItem('username');
}

function siirryLoginNakymaan() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
}

function tyhjennaLomake() {
    pvmInput.value = '';
    asiakasInput.value = '';
    paikkakuntaInput.value = '';
    tunnitInput.value = '';
    urakkaInput.value = '';
    tyontehtavaInput.value = '';
    paivarahatCheckbox.checked = false;
}

// Kutsutaan funktioita sivun latautuessa
if (token) {
    siirryAppNakymaan();
    lataaMerkinnat();
} else {
    siirryLoginNakymaan();
}

lisaaButton.addEventListener('click', lisaaMerkinta);
tallennaKuukausiButton.addEventListener('click', tallennaKuukausi);