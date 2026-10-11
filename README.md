# Popcorn Fuel Log (PWA, version 4.8)

Trip, fuel, range and hull log for a twin-engine motorboat whose tanks each feed one engine. It runs as an installable web app on Android and works offline once loaded.

## Put it on your phone (GitHub Pages, free)

1. Create a GitHub repository, for example `fuel-log`. It can be public: only the app code goes there, never your data.
2. Upload every file and folder from this zip to the repository root: `index.html`, `app.js`, `core.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `icons/` and `vendor/`.
3. In the repository, open **Settings → Pages**. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the app is at `https://<your-username>.github.io/fuel-log/`.
5. Open that address in **Chrome on the phone**, then tap the menu (⋮) → **Add to Home screen / Install app**. Allow location access.

**Updating from version 1:** replace the files in the repository and open the app once with network. Your trips, readings and settings are converted automatically. Export a backup first (More → Export backup) to be safe.

## First setup in the app

1. **Tanks → Polynomial:** enter your shared 4th-order polynomial, litres = c0 + c1·x + … + c4·x⁴, and choose whether x is in mm or cm.
2. **Tanks → Edit tank**, for each tank: capacity, full-tank depth, and the depth where the suction pipe ends. You can enter the unusable litres directly instead.
3. **Curve → Hull & RPM → Clean-hull table:** your RPM → speed values for a clean hull.
4. **Tanks → Log dip** for both tanks. This sets the starting levels.
5. **More → Save Helm map area for offline**, on Wi-Fi.

## Under way

- **Start trip**. Set **RPM** whenever you change throttle. Switch **engines** (Both / Port only / Stbd only) when you stop or start one.
- Speed bands, engine mode and steady RPM stretches (at least 3 min at the same RPM with steady speed) are logged automatically.
- **End trip & dip tanks.** Tick **Rough dip** if the boat wasn't level or calm.

## What the app learns

- **Consumption for each engine:** L/h at each 1-knot band, separately for running on both engines and running solo. Every dip interval on a tank measures its own engine. The two engines are fitted together, so one with little data borrows the other's shape.
- **Economy proposal:** the most economical speed of at least 6 kn, and the fastest speed within +10% fuel per NM. Each comes with the RPM to set, taken from this season's speed–RPM table (from the clean-hull table until enough has been logged). Both limits can be changed in More.
- **Tank curve from refuels:** each refuel with depth before and after checks that curve(after) − curve(before) = litres pumped. The app fits small corrections to your polynomial, shared first and per tank only if a tank consistently disagrees. It then shows a proposal that you accept or reject. All versions are kept and can be restored. "Filled to brim" and known points also fix the absolute level.
- **Hull condition:** steady stretches compared with the clean-hull table, giving speed loss % and a weekly trend. "Hull cleaned today" starts a new comparison period.
- **Usable fuel:** level − below-pipe litres − reserve (a % of the capacity above the pipe). Range uses each engine's own curve and shows which tank runs out first.

## Known limits

- **GPS stops when the screen is off** (an Android limit for web apps). The app keeps the screen awake during a trip. The native APK will remove this limit.
- **Range circles are straight-line distance.**
- **Traficom charts:** if the chart stays blank, use More → Check Traficom service, or switch to OSM. Not for navigation.
- **Data lives only on the phone.** Export backups regularly.

Map data: © Traficom (CC BY 4.0), © OpenStreetMap contributors, seamarks © OpenSeaMap, © Maanmittauslaitos. Leaflet 1.9.4 (BSD-2).


---

## Merialue- ja väylärange (versio 3) – käyttöönotto

Range-näkymässä on nyt kolme tilaa: **Open water** (vapaa vesi, kiertää maan ja asetettua syväysrajaa matalammat alueet), **Fairways** (vain merkittyjä väyliä pitkin) ja **Circle** (suoraviivainen ympyrä). Napauttamalla karttaa saat reitin, matkan ja polttoainetarpeen.

Aineisto (Suomenlahti + Saaristomeri) rakennetaan kerran GitHubissa:

1. Varmista, että repositoryssa on kansiot `.github/workflows/` ja `tools/` tästä zipistä.
   - Jos `.github`-kansio ei näy tai siirry selaimeen raahatessa (piilokansio), valitse GitHubissa **Add file → Create new file**, kirjoita nimeksi `.github/workflows/build-sea-data.yml` ja liitä tiedoston sisältö.
2. Avaa repositoryn **Actions**-välilehti ja hyväksy työnkulut, jos GitHub kysyy.
3. Valitse vasemmalta **Build sea data** → **Run workflow** → **Run workflow**.
4. Odota, kunnes ajo on vihreä (noin 10–20 min). Se lisää kansion `sea/` repositoryyn ja GitHub Pages julkaisee sen.
   - Jos ajo epäonnistuu, avaa ajo, kopioi punaisen vaiheen loki ja lähetä se Claudelle.
   - Jos virhe koskee oikeuksia (push), mene **Settings → Actions → General → Workflow permissions** → valitse **Read and write permissions** → Save, ja aja uudelleen.
5. Puhelimessa: **More → Sea data for range → Download / update sea data** (wifissä). Aseta samalla **Draft limit** (syväysraja).

**Syvyystiedot:** oletuksena käytetään EMODnet-syvyysmallia (noin 115 m ruudut, karkea rannikon lähellä). Tarkemmat Traficomin syvyysalueet saat näin: lataa ne Traficomin karttapalvelusta (https://julkinen.traficom.fi/oskari/) shapefile-muodossa, lisää zip-tiedosto repositoryyn kansioon `sea-src/traficom/` ja aja **Build sea data** uudelleen. Skripti käyttää kenttää `DRVAL1` (syvyysalueen pienin syvyys).

**Rajoitukset:** 100 m ruudukko – kapeat salmet voivat sulkeutua tai aueta väärin. Väylätila käyttää Väyläviraston navigointilinjoja (mitoitus-/haraussyvyys). Suunnitteluapu, ei navigointiin.

Aineistot: maa © OpenStreetMap contributors (ODbL), väylät © Väylävirasto (CC BY 4.0), syvyys © EMODnet Bathymetry tai © Traficom (CC BY 4.0).


## Versio 4 – tuuli, kuorma ja ennustetarkkuus

- **Kuorma:** Start trip kysyy kuorman (Light / Normal / Full). Voit vaihtaa sen ajon aikana Helm-näkymästä tai jälkikäteen matkan tiedoista.
- **Tuuli:** matkan jälkeen sovellus hakee tuulen Ilmatieteen laitoksen avoimesta datasta (lähimmät rannikkoasemat) ja laskee reitin suuntaisen vasta-/myötätuulen. Ilman verkkoa haku tehdään myöhemmin automaattisesti.
- **Malli** oppii vastatuulen, tuulen/aallokon ja kuorman vaikutuksen prosentteina (Curve → Conditions effect). Kulutuskäyrä kuvaa tyyntä keliä ja normaalia kuormaa.
- **Ennustetarkkuus** (Curve → Prediction accuracy): jokainen mittaus verrataan etukäteen laskettuun ennusteeseen.
- **Range** on omalla välilehdellään.

Tuulidata © Ilmatieteen laitos (CC BY 4.0).

## Versio 4.3 – reittisuunnittelu tankkauksineen

Range-välilehti → **Plan trip with refuelling**. Lähtö = veneen GPS tai pitkällä painalluksella valittu piste. Määränpää ja välipisteet valitaan napauttamalla karttaa tai tankkausasemaa. Sovellus laskee meri- tai väyläetäisyydet lähimpiin (enintään 12) asemiin reitin varrella ja etsii polttoaineen riittävät yhdistelmät (enintään 4 tankkausta). Tuloksena: Halvin / Vähiten pysähdyksiä / Lyhin. Tankkausmäärä = seuraavan osuuden tarve + vara (oletus 20 L) per tankki, ei koskaan alle reservin. Tuntematon hinta = viimeksi maksettu hinta (merkitään "price estimate"). Väylätilassa reitin kumpikin pää saa olla enintään 5 mpk vesitse väylästä.

## Versio 4.4 – suomenkielinen käyttöliittymä

Lisää → Kieli / Language: Suomi tai English (oletus suomi). Käännökset ovat tiedostossa `i18n.js`; NM, kn ja Port/Stbd pidetään ennallaan. Epäonnistumisilmoitus kertoo syyn.

## Versio 4.4.1 – reservi poistettu

Reserviasetus on poistettu. Käytettävä polttoaine = kaikki imuputken yläpuolella oleva; kantama ja reittisuunnittelu laskevat imuputken tasoon asti.

## Versio 4.5 – Loki, käsin lisättävät matkat ja käytettävyys

- Välilehdet: Ruori, Matkat, Loki, Käyrät, Tankit, Lisää. Kantama ja suunnittelu avataan Ruorin Tankit-kortista.
- Loki: kausivalinta, yhteenveto koneittain ja veneelle (NM, tunnit, litrat, €), tankkausloki ja mittausloki.
- Mittauksen tyyppi: ennen matkaa / matkan jälkeen / erillinen. Matkan alussa kysytään mittausta, jos tankkeja ei ole mitattu edellisen matkan jälkeen.
- Tankkauksen lähde: asema (valitaan tai kirjoitetaan) tai kanisteri, litrahinta tallennetaan.
- Matkan voi lisätä käsin (päivä, matka, ajoaika, koneet, kuorma); muokattavissa.
- Tankkauksen ja mittauksen ajankohdan voi muuttaa jälkikirjausta varten. Mittaus molemmille tankeille samassa ikkunassa.
- Suomeksi desimaalipilkku.

## Versio 4.6 – reittisuunnittelu poistettu, selkeät asemamerkit

- Reittisuunnittelu tankkauksineen on poistettu (planner.js ei ole enää käytössä ja sen voi poistaa repositorysta).
- Kantamakartalla tankkausasemat näkyvät vihreinä merkkeinä; lähellä merkin yläpuolella näkyy viimeisin tunnettu hinta, kaukaa pieni pyöreä merkki.

## Versio 4.6.1 – tankkausasemat suoraan OpenStreetMapista

- Lisää → Tankkausasemat → Päivitä tankkausasemat OpenStreetMapista: puhelin hakee asemat itse (ei vaadi GitHub-työnkulkua).
- Vihreä merkki = veneiden tankkausasema (OSM-merkintä), valkoinen = tavallinen asema noin 200 m:n päässä vedestä.
- Jos asemia ei ole ladattu, Kantama-näkymä näyttää latauspainikkeen.

## Versio 4.7 – tankin tilavuussovite taulukosta

Tankit → Tilavuussovite:
- Lukemataulukko: syvyys (cm) ja litrat, rivejä voi lisätä ja poistaa; Täysi tankki -piste valinnaisena.
- Yhteinen sovite molemmille tankeille tai kummallekin erikseen.
- Sovitustavat: suorat viivat, pehmeä käyrä (ei koskaan laske), polynomi 2.–4. aste. Virhe näytetään jättämällä yksi lukema kerrallaan pois; ★ = tarkin.
- Syvyysalueet: 1–3 aluetta, oma sovitustapa kullekin; rajat voi ehdottaa automaattisesti. Alueet liittyvät ilman hyppyä.
- Käyttöönotto tekee sovitteesta tankkikäyrän pohjan; tankkaukset jatkavat tarkentamista. Aiemmat käyrät palautettavissa (myös polynomit ja sovitteet).
- Polynomin syöttö on saman näkymän Polynomi-välilehdellä.

## Versio 4.7.1 – tankkien erojen oppiminen

- Tankkikohtainen korjaus saa poiketa yhteisestä käyrästä noin ±10 L (aiemmin ±4 L).
- Uusi tankkikohtainen kokokerroin: jos toinen tankki on muutaman prosentin isompi, tankkaukset opettavat sen suoraan.
- Tyhjässä tankissa (0 cm) on 0 L: kiintopiste molemmille tankeille.
- Täysi tankki -piste ei ole enää oletuksena päällä; mitattujen syvyyksien yläpuolinen osa merkitään arvioksi.

## Versio 4.8 – Popcornin täyttötaulukko valmiina

- Tilavuussovitteeseen on ladattu valmiiksi veneen täyttötaulukko (33 lukemaa, 0–67,5 cm, molemmat tankit yhdessä).
- Jos käytössä oli esimerkkipolynomi, taulukon sovite (polynomi 2) otetaan käyttöön automaattisesti; oma polynomi säilyy ennallaan.
- Tankkien oletussyvyys 70 cm.
