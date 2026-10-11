/* Language: English source texts, translated on screen to Finnish when the language is 'fi'.
   Every text node (and placeholder / aria-label / title) is translated when it appears:
   1. exact match, 2. match with numbers replaced by {n}, 3. patterns with names,
   4. split into sentences, " · " parts or " — " parts and translate each part. Unknown text stays as it is. */
'use strict';

const I18N = (() => {
  let lang = 'fi';
  try { lang = localStorage.getItem('fuellog-lang') || 'fi'; } catch (e) { /* private mode */ }
  const locale = () => (lang === 'fi' ? 'fi-FI' : 'en-GB');

  const FI = {
    // ---- navigation & common ----
    'Helm': 'Ruori', 'Range': 'Kantama', 'Trips': 'Matkat', 'Curve': 'Käyrät', 'Tanks': 'Tankit', 'More': 'Lisää', 'Main': 'Päävalikko',
    'Back': 'Takaisin', 'Close': 'Sulje', 'Cancel': 'Peruuta', 'Save': 'Tallenna', 'Saved': 'Tallennettu', 'Delete': 'Poista', 'Add': 'Lisää', 'Set': 'Aseta', 'set': 'aseta',
    'Restore': 'Palauta', 'Review': 'Tarkastele', 'Other': 'Muu', 'Now': 'Nyt', 'Both': 'Molemmat', 'Total': 'Yhteensä', 'Name': 'Nimi', 'Date': 'Päivä',
    'Speed': 'Nopeus', 'Price': 'Hinta', 'Cost': 'Hinta', 'Distance': 'Matka', 'Depth': 'Syvyys', 'Capacity': 'Tilavuus', 'Tank': 'Tankki', 'Reserve': 'Reservi', 'reserve': 'reservi',
    'Usable': 'Käytettävä', 'Unusable': 'Pohjajäämä', 'unusable': 'pohjajäämä', 'Measured': 'Mitattu', 'Predicted': 'Ennuste', 'Loss': 'Häviö', 'Clean': 'Puhdas',
    'Diff': 'Ero', 'Difference': 'Ero', 'Readings': 'Lukemat', 'Settings': 'Asetukset', 'Ready': 'Valmis', 'Recording': 'Tallentaa', 'Paused': 'Tauolla', 'Pause': 'Tauko', 'Resume': 'Jatka',
    'Economy': 'Taloudellisin', 'Efficient': 'Tehokas', 'Conditions': 'Olosuhteet', 'Consumption': 'Kulutus', 'Polynomial': 'Polynomi', 'Ruler': 'Mittatikku', 'Backup': 'Varmuuskopio',
    'estimate': 'arvio', 'no data': 'ei tietoa', 'no data yet': 'ei vielä tietoa', 'no dip': 'ei mittausta', 'first dip': 'ensimmäinen mittaus', 'rough': 'epätarkka', 'own curve': 'oma käyrä',
    'shared dip': 'yhteinen mittaus', 'last used': 'viimeksi käytetty', 'sample values': 'esimerkkiarvot', 'your values': 'omat arvot', 'typical now': 'tyypillinen nyt', 'beyond range': 'kantaman ulkopuolella',
    'not reachable': 'ei saavutettavissa', 'straight line': 'suora viiva', 'straight lines': 'suorat viivat', 'open water': 'avovesi', 'along fairways': 'väyliä pitkin', 'over open water': 'avovettä pitkin',
    'reachable fairways': 'saavutettavia väyliä', 'reachable water': 'saavutettavaa vesialuetta', 'both engines': 'molemmat koneet',
    'Light': 'Kevyt', 'Normal': 'Normaali', 'Full': 'Täysi', 'Light load': 'Kevyt kuorma', 'Normal load': 'Normaali kuorma', 'Full load': 'Täysi kuorma',
    '{n}–{n} people, little water and gear': '{n}–{n} henkeä, vähän vettä ja tavaraa', '{n}–{n} people or half water tank, usual gear': '{n}–{n} henkeä tai puoli vesitankkia, tavalliset tavarat',
    '{n} people, luggage, full water tank': '{n} henkeä, matkatavarat, täysi vesitankki',
    'Both engines': 'Molemmat koneet', 'Port only': 'Vain Port', 'Stbd only': 'Vain Stbd', 'Port solo': 'Port yksin', 'Stbd solo': 'Stbd yksin',
    'Both engines {n} h {n} min': 'Molemmat koneet {n} h {n} min', 'Both engines {n} min': 'Molemmat koneet {n} min',
    'Port only {n} h {n} min': 'Vain Port {n} h {n} min', 'Port only {n} min': 'Vain Port {n} min', 'Stbd only {n} h {n} min': 'Vain Stbd {n} h {n} min', 'Stbd only {n} min': 'Vain Stbd {n} min',

    // ---- Helm ----
    'Start trip': 'Aloita matka', 'End trip': 'Lopeta matka', 'End this trip?': 'Lopetetaanko matka?', 'The trip is saved and you can dip the tanks next.': 'Matka tallennetaan, ja voit mitata tankit seuraavaksi.',
    'Ready — start a trip to log it': 'Valmis — aloita matka kirjataksesi sen', 'Trip {n}:{n}:{n}': 'Matka {n}:{n}:{n}', 'Trip {n}:{n}:{n} · paused': 'Matka {n}:{n}:{n} · tauolla',
    'GPS idle': 'GPS lepää', 'GPS {n} m': 'GPS {n} m', 'GPS – no position': 'GPS – ei sijaintia', 'Waiting for GPS…': 'Odotetaan GPS:ää…', 'Centre on boat': 'Keskitä veneeseen',
    'Speed (SOG)': 'Nopeus (SOG)', 'Avg speed': 'Keskinopeus', 'avg {n} kn': 'ka. {n} kn', 'Fuel per mile': 'Kulutus mailia kohden', 'Fuel at {n} kn': 'Kulutus {n} kn:ssa',
    'Used, est.': 'Kulunut, arvio', 'Tanks, estimated': 'Tankit, arvio', 'Now, est.': 'Nyt, arvio', 'Engine RPM': 'Koneen kierrokset', 'Engines running': 'Käynnissä olevat koneet',
    'Load on board': 'Kuorma veneessä', 'Helps the app learn how load changes consumption.': 'Auttaa sovellusta oppimaan, miten kuorma muuttaa kulutusta.',
    'Switch when you start or stop an engine. A stopped engine uses no fuel.': 'Vaihda, kun käynnistät tai sammutat koneen. Sammutettu kone ei kuluta polttoainetta.',
    'Same RPM on both engines. It stays set until you change it.': 'Samat kierrokset molemmilla koneilla. Pysyy asetettuna, kunnes muutat sitä.',
    'Clear RPM': 'Tyhjennä kierrokset', 'Enter RPM between {n} and {n}': 'Anna kierrokset väliltä {n}–{n}',
    'Trip started (light load). Set RPM when you settle on a cruise.': 'Matka aloitettu (kevyt kuorma). Aseta kierrokset, kun matkavauhti vakiintuu.',
    'Trip started (normal load). Set RPM when you settle on a cruise.': 'Matka aloitettu (normaali kuorma). Aseta kierrokset, kun matkavauhti vakiintuu.',
    'Trip started (full load). Set RPM when you settle on a cruise.': 'Matka aloitettu (täysi kuorma). Aseta kierrokset, kun matkavauhti vakiintuu.',
    'Keep the app open on screen while under way: Android pauses GPS for web apps when the screen is off. Set RPM whenever you change throttle — steady stretches teach the app your speed–RPM table and hull condition.':
      'Pidä sovellus auki näytöllä ajon aikana: Android keskeyttää verkkosovellusten GPS:n, kun näyttö sammuu. Aseta kierrokset aina kun muutat kaasua — tasaiset jaksot opettavat sovellukselle nopeus–kierrostaulukon ja pohjan kunnon.',
    'GPS paused while the screen was off. The gap was filled with a straight line.': 'GPS oli tauolla näytön ollessa sammuksissa. Aukko täytettiin suoralla viivalla.',
    'This browser has no GPS access.': 'Tällä selaimella ei ole GPS-oikeutta.', 'Range at {n} kn:': 'Kantama {n} kn:ssa:', 'under {n} kn': 'alle {n} kn', 'both engines ±{n}': 'molemmat koneet ±{n}',
    'port only ±{n}': 'vain Port ±{n}', 'stbd only ±{n}': 'vain Stbd ±{n}',
    'No dip recorded yet. Dip both tanks once (Tanks → Log dip) so the app can follow the levels.': 'Mittauksia ei vielä ole. Mittaa molemmat tankit kerran (Tankit → Kirjaa mittaus), jotta sovellus voi seurata määriä.',
    'Go to Tanks': 'Siirry tankkeihin',

    // ---- trip end / dips ----
    'Trip complete': 'Matka valmis', 'End trip & dip tanks': 'Lopeta matka ja mittaa tankit', 'Dip tanks with ruler': 'Mittaa tankit mittatikulla', 'Save dip': 'Tallenna mittaus', 'Skip dip': 'Ohita mittaus',
    'No dip now? The trip still counts: the next dip measures all trips since the previous one together.': 'Etkö mittaa nyt? Matka lasketaan silti: seuraava mittaus mittaa kaikki edellisen jälkeiset matkat yhdessä.',
    'Dip saved. Consumption curves updated.': 'Mittaus tallennettu. Kulutuskäyrät päivitetty.', 'Trip saved without a dip.': 'Matka tallennettu ilman mittausta.',
    'Rough dip (heel, waves, poor trim) — counts less': 'Epätarkka mittaus (kallistus, aallot, huono trimmi) — painaa vähemmän',
    'Below suction pipe — engine may draw air': 'Imuputken alapuolella — kone voi imeä ilmaa', 'below suction pipe!': 'imuputken alapuolella!',
    "I'll dip the other tank too": 'Mittaan myös toisen tankin', 'Ruler depth. Litres come from the tank curve.': 'Mittatikun syvyys. Litrat lasketaan tankkikäyrästä.',
    'depth on the ruler': 'syvyys mittatikussa', 'Measured since last dip': 'Mitattu edellisen mittauksen jälkeen', 'Curve predicted this trip': 'Käyrän ennuste tälle matkalle',
    'Enter the depth in cm': 'Anna syvyys senttimetreinä', 'Enter the depth in mm': 'Anna syvyys millimetreinä', 'Value out of range': 'Arvo sallitun alueen ulkopuolella',

    // ---- trips ----
    'No trips yet. Start one from the Helm screen.': 'Ei vielä matkoja. Aloita matka Ruori-näkymästä.', '{n} trips · {n} NM · ~{n} L': '{n} matkaa · {n} NM · ~{n} L',
    'Delete trip': 'Poista matka', 'Delete this trip?': 'Poistetaanko matka?', 'Its track, speed and RPM log are removed. This cannot be undone.': 'Reitti, nopeus- ja kierrosloki poistetaan. Tätä ei voi perua.',
    'Save name': 'Tallenna nimi', 'Engine time': 'Koneaika', 'Time at speed': 'Aika nopeuksittain', 'No time logged.': 'Aikaa ei kirjattu.', 'Steady RPM stretches': 'Tasaiset kierrosjaksot',
    'Steady stretches': 'Tasaiset jaksot', '{n} RPM stretches': '{n} kierrosjaksoa', 'No steady stretches yet. Set RPM on the Helm screen while under way.': 'Ei vielä tasaisia jaksoja. Aseta kierrokset Ruori-näkymässä ajon aikana.',
    'est. P {n} · S {n} L': 'arvio P {n} · S {n} L', 'est. used P {n} · S {n} L': 'arvio kulunut P {n} · S {n} L', 'factor ×{n}': 'kerroin ×{n}', 'Conditions effect': 'Olosuhteiden vaikutus',
    'Wind: fetched from FMI when the phone is online': 'Tuuli: haetaan Ilmatieteen laitokselta, kun puhelin on verkossa', 'Wind: not recorded (older trip)': 'Tuuli: ei tallennettu (vanha matka)',
    'Wind {n} m/s average · head wind {n} m/s along the route · {n} FMI station': 'Tuuli keskimäärin {n} m/s · vastatuuli {n} m/s reitin suunnassa · {n} FMI-asema',
    'Wind {n} m/s average · head wind {n} m/s along the route · {n} FMI stations': 'Tuuli keskimäärin {n} m/s · vastatuuli {n} m/s reitin suunnassa · {n} FMI-asemaa',
    'Wind {n} m/s average · tail wind {n} m/s along the route · {n} FMI station': 'Tuuli keskimäärin {n} m/s · myötätuuli {n} m/s reitin suunnassa · {n} FMI-asema',
    'Wind {n} m/s average · tail wind {n} m/s along the route · {n} FMI stations': 'Tuuli keskimäärin {n} m/s · myötätuuli {n} m/s reitin suunnassa · {n} FMI-asemaa',
    'no track': 'ei reittiä', 'no stations': 'ei asemia', 'no moving stretches': 'ei liikkuvia jaksoja',
    '{n} GPS gap(s) in this trip were filled with straight lines.': '{n} GPS-aukkoa tällä matkalla täytettiin suorilla viivoilla.', 'L/NM · shared dip': 'L/NM · yhteinen mittaus',

    // ---- curve ----
    'Consumption curve': 'Kulutuskäyrä', 'Fuel use against speed': 'Kulutus nopeuden mukaan', 'Litres per NM': 'Litraa / NM', 'Litres per hour': 'Litraa / tunti',
    '{n} trips · {n} measured tank intervals': '{n} matkaa · {n} mitattua tankkiväliä', 'From your logged trips': 'Kirjatuista matkoistasi', 'Starting guess until you have trips with dips': 'Alkuarvaus, kunnes on matkoja mittauksineen',
    'cruising from {n} kn': 'matkanopeus alkaen {n} kn', 'RPM from clean-hull table': 'kierrokset puhtaan pohjan taulukosta', 'RPM from clean-hull table.': 'kierrokset puhtaan pohjan taulukosta.',
    'starting guess': 'alkuarvaus', 'Most economical': 'Taloudellisin', 'Efficient cruise': 'Tehokas matkanopeus',
    "Each tank feeds its own engine, so every pair of dips measures one engine. Both engines are fitted together; where one has little data it borrows the other's shape. Grey rows have little data. Rough dips count less.":
      'Kumpikin tankki syöttää omaa konettaan, joten jokainen mittauspari mittaa yhtä konetta. Koneet sovitetaan yhdessä; jos toisella on vähän dataa, se lainaa toisen muotoa. Harmailla riveillä on vähän dataa. Epätarkat mittaukset painavat vähemmän.',
    'This is a starting guess, not your boat yet. It becomes your curve after a few trips with tank dips before and after.': 'Tämä on alkuarvaus, ei vielä veneesi. Siitä tulee oma käyräsi muutaman matkan jälkeen, kun tankit mitataan ennen ja jälkeen.',
    'shaded = uncertainty': 'varjostus = epävarmuus', 'dot size = hours': 'pisteen koko = tunnit', 'grey line = cruising from {n} kn': 'harmaa viiva = matkanopeus alkaen {n} kn',
    'P L/h': 'P L/h', 'S L/h': 'S L/h', 'S/P': 'S/P', 'learned from your trips': 'opittu matkoistasi', 'vs calm water and normal load': 'verrattuna tyyneen veteen ja normaaliin kuormaan',
    '{n} measured intervals with FMI wind': '{n} mitattua väliä FMI-tuulitiedoin', 'Head wind {n} m/s': 'Vastatuuli {n} m/s', 'Wind & waves {n} m/s': 'Tuuli ja aallot {n} m/s',
    'same — every faster speed costs over +{n}% per NM': 'sama — jokainen nopeampi nopeus maksaa yli +{n} % / NM', 'needs ≥ {n} steady stretches ({n})': 'vaatii ≥ {n} tasaista jaksoa ({n})',
    'Hull & RPM': 'Pohja ja kierrokset', 'Hull condition': 'Pohjan kunto', 'Speed loss now': 'Nopeushäviö nyt', 'Speed loss at cruise RPM': 'Nopeushäviö matkakierroksilla', 'Speed loss over time': 'Nopeushäviö ajan mittaan',
    'at cruise RPM, both engines': 'matkakierroksilla, molemmat koneet', 'Speed at RPM, this period': 'Nopeus kierroksilla, tämä jakso', 'This season': 'Tämä kausi',
    'light dots = single stretches': 'vaaleat pisteet = yksittäiset jaksot', 'orange = weekly median': 'oranssi = viikon mediaani',
    'Wind, current and load move single stretches by a few percent; the weekly median shows the trend. A rising speed loss at the same RPM means growth on the hull or propellers.':
      'Tuuli, virta ja kuorma siirtävät yksittäisiä jaksoja muutamalla prosentilla; viikon mediaani näyttää suunnan. Kasvava nopeushäviö samoilla kierroksilla tarkoittaa kasvustoa pohjassa tai potkureissa.',
    'Hull cleaned today': 'Pohja puhdistettu tänään', 'Hull cleaned today?': 'Puhdistettiinko pohja tänään?', 'Mark cleaned': 'Merkitse puhdistetuksi',
    'A new comparison period starts from today. Earlier periods stay viewable.': 'Uusi vertailujakso alkaa tästä päivästä. Aiemmat jaksot jäävät nähtäville.',
    'Clean-hull table': 'Puhtaan pohjan taulukko', 'Clean-hull table saved': 'Puhtaan pohjan taulukko tallennettu', 'clean-hull table': 'puhtaan pohjan taulukko',
    'Speed with a clean hull, both engines, calm water. Enter at the start of the season.': 'Nopeus puhtaalla pohjalla, molemmat koneet, tyyni vesi. Syötä kauden alussa.',
    'Add row': 'Lisää rivi', 'Delete row': 'Poista rivi', 'RPM row {n}': 'Kierrokset, rivi {n}', 'Speed row {n}': 'Nopeus, rivi {n}', 'Save table': 'Tallenna taulukko', 'Enter at least two rows': 'Anna vähintään kaksi riviä',
    'Prediction accuracy': 'Ennusteen tarkkuus', 'Prediction error over time': 'Ennustevirhe ajan mittaan', 'predicted before each dip vs measured': 'ennuste ennen kutakin mittausta vs. mitattu',
    'above 0 = app predicted too much': 'yli 0 = sovellus ennusti liikaa',
    'Each dip is compared with what the app predicted before it. The first comparison appears after your second dip with trips in between.': 'Jokaista mittausta verrataan siihen, mitä sovellus ennusti ennen sitä. Ensimmäinen vertailu näkyy toisen mittauksen jälkeen, kun välissä on matkoja.',
    'Nothing logged yet.': 'Ei vielä kirjauksia.',

    // ---- tanks ----
    'Log dip': 'Kirjaa mittaus', 'Log refuel': 'Kirjaa tankkaus', 'Edit tank': 'Muokkaa tankkia', 'Tank polynomial': 'Tankin polynomi', 'Tank curve': 'Tankkikäyrä', 'Known point': 'Tunnettu piste', 'Known points': 'Tunnetut pisteet',
    'Litres in tank': 'Litraa tankissa', 'Litres against ruler depth': 'Litrat mittatikun syvyyden mukaan', 'Ruler depth → litres': 'Mittatikun syvyys → litrat',
    'Hatched = below suction pipe': 'Viivoitettu = imuputken alapuolella', 
    
    'Full-tank depth': 'Täyden tankin syvyys', 'ruler reading when full': 'mittatikun lukema täytenä', 'Suction pipe ends at': 'Imuputki päättyy kohtaan', '…or unusable litres': '…tai pohjajäämä litroina',
    'leave empty to use the depth': 'jätä tyhjäksi, jos käytät syvyyttä', 'Tank saved': 'Tankki tallennettu', 'Check capacity and full-tank depth': 'Tarkista tilavuus ja täyden tankin syvyys',
    'Saved. Full-tank depth gives {n} L (capacity {n} L)': 'Tallennettu. Täyden tankin syvyys antaa {n} L (tilavuus {n} L)',
    'Last reading {n}': 'Viimeisin lukema {n}', 'Earlier curves': 'Aiemmat käyrät', 'Restore this curve?': 'Palautetaanko tämä käyrä?', 'The current curve is kept in the list so you can switch back.': 'Nykyinen käyrä jää listaan, joten voit vaihtaa takaisin.',
    'Delete reading': 'Poista lukema', 'Delete this reading?': 'Poistetaanko lukema?', 'Levels, consumption curves and the tank-curve fit are recalculated without it.': 'Määrät, kulutuskäyrät ja tankkikäyrän sovitus lasketaan uudelleen ilman sitä.',
    'No readings yet.': 'Ei vielä lukemia.', '{n} readings used': '{n} lukemaa käytössä', 'Error vs readings': 'Virhe lukemiin nähden',
    'The tank polynomial is a sample. Tap Polynomial to enter yours, and Edit tank for capacity and suction-pipe height.': 'Tankin polynomi on esimerkki. Napauta Polynomi syöttääksesi omasi ja Muokkaa tankkia tilavuutta ja imuputken korkeutta varten.',
    'Save polynomial': 'Tallenna polynomi', 'x in cm': 'x senttimetreinä', 'x in mm': 'x millimetreinä', 'A coefficient is not a number': 'Kerroin ei ole luku',
    'Shared by both tanks: litres = c{n} + c{n}·x + c{n}·x² + c{n}·x³ + c{n}·x⁴, where x is the ruler depth. Paste values like {n}e{n}. Saving resets the refuel corrections; the old curve stays under Earlier curves.':
      'Yhteinen molemmille tankeille: litrat = c{n} + c{n}·x + c{n}·x² + c{n}·x³ + c{n}·x⁴, missä x on mittatikun syvyys. Liitä arvot muodossa {n}e{n}. Tallennus nollaa tankkauskorjaukset; vanha käyrä jää kohtaan Aiemmat käyrät.',
    'A depth where you know the litres exactly, e.g. after filling an empty tank in measured steps.': 'Syvyys, jossa tiedät litrat tarkasti, esim. kun tyhjä tankki on täytetty mitatuin erin.',
    'Enter both values': 'Anna molemmat arvot', 'Improved tank curve': 'Parannettu tankkikäyrä', 'Improved tank curve available': 'Parannettu tankkikäyrä saatavilla',
    'Use new curve': 'Ota uusi käyrä käyttöön', 'Keep current': 'Pidä nykyinen', 'Kept the current curve': 'Nykyinen käyrä pidettiin', 'New tank curve in use': 'Uusi tankkikäyrä käytössä',
    'From {n} readings · error {n} → {n} L': '{n} lukemasta · virhe {n} → {n} L',
    'Fitted to {n} readings ({n} refuels). It stays close to your polynomial except where the refuels disagree.': 'Sovitettu {n} lukemaan ({n} tankkausta). Pysyy lähellä polynomiasi paitsi siellä, missä tankkaukset ovat eri mieltä.',
    'This fit would make litres fall with depth somewhere, so it cannot be used. Check the latest readings.': 'Tämä sovitus saisi litrat laskemaan syvyyden kasvaessa jossain kohdassa, joten sitä ei voi käyttää. Tarkista viimeisimmät lukemat.',
    'grey dashed = your polynomial': 'harmaa katkoviiva = polynomisi', 'solid = current curve': 'yhtenäinen = nykyinen käyrä', 'black ticks = refuels (before → after)': 'mustat merkit = tankkaukset (ennen → jälkeen)', 'vertical = suction pipe': 'pystyviiva = imuputki',
    'solid = current': 'yhtenäinen = nykyinen', 'orange dashed = proposed': 'oranssi katkoviiva = ehdotus', 'moves up to {n} L': 'siirtyy enintään {n} L', 'improves the tank curve': 'parantaa tankkikäyrää',
    'before new base polynomial': 'ennen uutta peruspolynomia', 'This difference is what the tank-curve fit learns from.': 'Tästä erosta tankkikäyrän sovitus oppii.',

    // ---- refuel ----
    'Refuel saved': 'Tankkaus tallennettu', 'Save refuel': 'Tallenna tankkaus', 'Depth before': 'Syvyys ennen', 'Depth after': 'Syvyys jälkeen', 'dip before filling': 'mittaus ennen täyttöä',
    'Litres from pump': 'Litrat pumpusta', 'from the pump display': 'pumpun näytöstä', 'one total, split by the dips': 'yksi summa, jaetaan mittausten mukaan', 'needed to split the total': 'tarvitaan summan jakamiseen',
    'Enter the depth before filling and the litres pumped': 'Anna syvyys ennen täyttöä ja pumpatut litrat', 'Enter depth before and after for both tanks and the pump total': 'Anna syvyys ennen ja jälkeen molemmille tankeille sekä pumpun summa',
    'For both tanks, enter the depth before and after for each tank and the pump total.': 'Kun tankkaat molemmat, anna kummallekin tankille syvyys ennen ja jälkeen sekä pumpun summa.',
    'Enter the readings to compare them with the tank curve.': 'Anna lukemat verrataksesi niitä tankkikäyrään.', 'Total {n} €': 'Yhteensä {n} €', 'Enter the price in €/L': 'Anna hinta €/L', 'curve: {n} L': 'käyrä: {n} L',

    // ---- range ----
    'Turn back before': 'Käänny takaisin ennen', 'Reach': 'Kantama', 'One way': 'Yhteen suuntaan', 'Out & back': 'Meno-paluu', 'Open water': 'Avovesi', 'Fairways': 'Väylät', 'Circle': 'Ympyrä',
    'At {n} kn (economy)': '{n} kn (taloudellisin)', 'At {n} kn (now)': '{n} kn (nyt)', 'At {n} kn': '{n} kn', 'Dashed: {n} NM at {n} kn': 'Katkoviiva: {n} NM {n} kn:ssa',
    'Boat (GPS)': 'Vene (GPS)', 'Chosen point ✕': 'Valittu piste ✕', 'Start:': 'Lähtö:', 'or long-press the map': 'tai paina karttaa pitkään', 'Start point': 'Lähtöpiste',
    'Start point set': 'Lähtöpiste asetettu', 'Start from the boat GPS position': 'Lähtö veneen GPS-sijainnista', 'Start from here': 'Lähtö tästä', 'Add fuel station here': 'Lisää tankkausasema tähän',
    'Dip both tanks once (Tanks → Log dip) to see the range.': 'Mittaa molemmat tankit kerran (Tankit → Kirjaa mittaus) nähdäksesi kantaman.', 'Dip both tanks first to calculate a range.': 'Mittaa ensin molemmat tankit kantaman laskemiseksi.',
    'Calculating reachable fairways…': 'Lasketaan saavutettavia väyliä…', 'Calculating reachable water…': 'Lasketaan saavutettavaa vesialuetta…', 'Calculating route…': 'Lasketaan reittiä…', 'Calculating…': 'Lasketaan…',
    'Dark = reachable at {n} kn, light = also at {n} kn': 'Tumma = saavutettavissa {n} kn:ssa, vaalea = myös {n} kn:ssa', 'Black = fairways reachable at {n} kn, blue = also at {n} kn': 'Musta = väylät saavutettavissa {n} kn:ssa, sininen = myös {n} kn:ssa',
    'draft limit {n} m': 'syväysraja {n} m', '{n} s. Tap the map for a route.': '{n} s. Napauta karttaa nähdäksesi reitin.', 'Straight-line circles.': 'Suoran matkan ympyrät.', 'Showing straight-line circles.': 'Näytetään suoran matkan ympyrät.',
    'Circle mode shows straight-line range only. Choose Open water or Fairways for routes.': 'Ympyrä-tila näyttää vain suoran matkan kantaman. Valitse Avovesi tai Väylät reittejä varten.',
    'No sea data downloaded yet (More → Sea data).': 'Merialuedataa ei ole vielä ladattu (Lisää → Merialuedata).', 'The start point is outside the sea-data area.': 'Lähtöpiste on merialuedatan alueen ulkopuolella.',
    'The start point is on land or too far from water deeper than the draft limit — long-press the map at your harbour to choose a start point.': 'Lähtöpiste on maalla tai liian kaukana syväysrajaa syvemmästä vedestä — paina karttaa pitkään satamasi kohdalla valitaksesi lähtöpisteen.',
    'The sea data has no fairways.': 'Merialuedatassa ei ole väyliä.', 'No start point yet.': 'Lähtöpistettä ei vielä ole.',
    'No GPS position. Long-press the map (or tap it and choose "Start from here") to set a start point.': 'Ei GPS-sijaintia. Paina karttaa pitkään (tai napauta ja valitse "Lähtö tästä") asettaaksesi lähtöpisteen.',
    'No route there: tap within about {n} km of a fairway drawn on the map (black or blue).': 'Ei reittiä sinne: napauta enintään noin {n} km:n päähän kartalle piirretystä väylästä (musta tai sininen).',
    'No route there: the point is beyond the fuel range shown, or on land more than about {n} km from reachable water.': 'Ei reittiä sinne: piste on näytetyn kantaman ulkopuolella tai maalla yli noin {n} km:n päässä saavutettavasta vedestä.',
    'Calculation failed ({x}).': 'Laskenta epäonnistui ({x}).',
    'Use the tapped point as…': 'Käytä napautettua kohtaa…', 'Destination': 'Määränpää', 'Destination:': 'Määränpää:', 'Stop-over': 'Välipiste', 'Stop-over (visit on the way)': 'Välipiste (käynti matkalla)',
    'Remove stop-over': 'Poista välipiste', 'Clear destination': 'Tyhjennä määränpää', 'Route over open water': 'Reitti avovettä pitkin', 'Route along fairways': 'Reitti väyliä pitkin',
    '{n} L one way': '{n} L yhteen suuntaan', '{n} L back': '{n} L takaisin', 'one way': 'yhteen suuntaan', '{n} NM out & back': '{n} NM meno-paluu',
    'Port limits': 'Port rajoittaa', 'Stbd limits': 'Stbd rajoittaa',

    'above the suction pipe': 'imuputken yläpuolella', 'both tanks together, usable fuel': 'molemmat tankit yhteensä, käytettävää', 'Usable fuel now: {x}': 'Käytettävää polttoainetta nyt: {x}',
    '"Fuel left at destination" ({n} L) is more than the tanks can hold ({n} L usable).': '"Polttoainetta jäljellä määränpäässä" ({n} L) on enemmän kuin tankkeihin mahtuu ({n} L käytettävää).',
    'reachable': 'saavutettavissa', 'Enough fuel there and back.': 'Polttoaine riittää sinne ja takaisin.', 'Enough one way only — refuel there.': 'Riittää vain yhteen suuntaan — tankkaa perillä.', 'Not enough fuel to get there.': 'Polttoaine ei riitä sinne.',
    'Usable fuel excludes what lies below the suction pipe.': 'Käytettävä polttoaine ei sisällä imuputken alapuolista osaa.',
    'Open water avoids land and water shallower than the {n} m draft limit ({n} m grid); Fairways follows marked fairway lines.': 'Avovesi välttää maata ja {n} m syväysrajaa matalampaa vettä ({n} m ruudukko); Väylät seuraa merkittyjä väyliä.',
    'Planning aid only — wind and sea add to consumption.': 'Vain suunnittelun apuväline — tuuli ja aallokko lisäävät kulutusta.',
    // ---- log, pre-trip dip, refuel source (v4.5) ----
    'Log': 'Loki', 'Range & planning': 'Kantama ja suunnittelu', 'Dip before departure?': 'Mitataanko tankit ennen lähtöä?',
    'The tanks have not been dipped since the last trip. A dip now makes the next consumption measurement exact.': 'Tankkeja ei ole mitattu edellisen matkan jälkeen. Mittaus nyt tekee seuraavasta kulutusmittauksesta tarkan.',
    'Skip': 'Ohita', 'Dip tanks': 'Mittaa tankit', 'Dip before departure': 'Mittaus ennen lähtöä', 'Save & start trip': 'Tallenna ja aloita matka',
    'Marked "before trip" in the log. Then choose the load and the trip starts.': 'Merkitään lokiin "ennen matkaa". Valitse sitten kuorma, ja matka alkaa.',
    'Enter at least one depth, or skip': 'Anna vähintään yksi syvyys tai ohita', 'Dip saved': 'Mittaus tallennettu',
    'Fuel from': 'Polttoaineen lähde', 'Fuel station': 'Tankkausasema', 'Canister': 'Kanisteri', 'Station': 'Asema', 'optional — pick or type': 'valinnainen — valitse tai kirjoita',
    'Refuel and dip log': 'Tankkaus- ja mittausloki', 'All seasons': 'Kaikki kaudet', 'Season {n}': 'Kausi {n}', 'All': 'Kaikki', 'Summary': 'Yhteenveto', '{n} trips': '{n} matkaa', '1 trips': '1 matka',
    'Boat total': 'Vene yhteensä', 'Engine NM = distance with that engine running': 'Koneen NM = matka koneen käydessä',
    'h = engine running time, idling included (boat: trip time)': 'h = koneen käyntiaika joutokäynti mukaan lukien (vene: matka-aika)', 'L = fuel used': 'L = kulunut polttoaine', '€ = refuels in the period': '€ = jakson tankkaukset',
    '~ includes {n} L estimated from the consumption model (trips without dips).': '~ sisältää {n} L kulutusmallin arviota (matkat ilman mittausta).',
    'Refuel log': 'Tankkausloki', '{n} refuels': '{n} tankkausta', '1 refuels': '1 tankkaus', 'Total {n} L': 'Yhteensä {n} L', 'no price': 'ei hintaa', 'Delete refuel': 'Poista tankkaus', 'Delete this refuel?': 'Poistetaanko tankkaus?',
    'No refuels in this period.': 'Ei tankkauksia tällä jaksolla.', 'Export refuel log (CSV)': 'Vie tankkausloki (CSV)', 'Dip log': 'Mittausloki', '{n} dips': '{n} mittausta', '1 dips': '1 mittaus',
    'before trip': 'ennen matkaa', 'after trip': 'matkan jälkeen', 'separate': 'erillinen', 'No dips in this period.': 'Ei mittauksia tällä jaksolla.', 'Export dip log (CSV)': 'Vie mittausloki (CSV)',
    'Time': 'Aika', 'Port L': 'Port L', 'Stbd L': 'Stbd L', 'Total L': 'Yhteensä L', 'Reading cm': 'Lukema cm', 'Reading mm': 'Lukema mm', 'Litres': 'Litrat', 'Type': 'Tyyppi', 'Rough': 'Epätarkka',
    // ---- v4.5: dips, refuel time, trips by hand, helm ----
    '{n} L/NM at {n} kn': '{n} L/NM {n} kn:ssa', 'Trip': 'Matka', 'Estimated': 'Arvio',
    'Curve after': 'Käyrä jälkeen', 'Brim': 'Piripinta', 'level now {n} L': 'määrä nyt {n} L', 'level now +{n} L': 'määrä nyt +{n} L', 'level now −{n} L': 'määrä nyt −{n} L',
    'Green pins = fuel stations (tap for price, distance and fuel needed).': 'Vihreät merkit = tankkausasemat (napauta: hinta, matka ja tarvittava polttoaine).',
    'Range & fuel stations': 'Kantama ja tankkausasemat',
    'today': 'tänään', '{n} d ago': '{n} pv sitten', '{n} wk ago': '{n} vk sitten', '{n} mo ago': '{n} kk sitten',
    'No fuel stations loaded yet.': 'Tankkausasemia ei ole vielä ladattu.', 'Load fuel stations from OpenStreetMap': 'Lataa tankkausasemat OpenStreetMapista',
    'Fuel stations': 'Tankkausasemat', '{n} on the map': '{n} kartalla', '{n} on the map + {n} your own': '{n} kartalla + {n} omaa',
    'Fetched from OpenStreetMap on this phone.': 'Haetaan OpenStreetMapista tällä puhelimella.',
    'Green = boat fuel station; white = ordinary fuel station within about 200 m of water (download the sea data first for this check).': 'Vihreä = veneiden tankkausasema; valkoinen = tavallinen tankkausasema noin 200 m:n päässä vedestä (lataa ensin merialuedata tätä tarkistusta varten).',
    'Update fuel stations from OpenStreetMap': 'Päivitä tankkausasemat OpenStreetMapista', 'Asking OpenStreetMap…': 'Kysytään OpenStreetMapilta…', 'Checking which stations are by the water…': 'Tarkistetaan, mitkä asemat ovat veden äärellä…',
    '{n} fuel stations: {n} boat fuel stations, {n} by the water': '{n} tankkausasemaa: {n} veneasemaa, {n} veden äärellä',
    'Could not reach OpenStreetMap ({x}). Try again on Wi-Fi.': 'OpenStreetMapiin ei saatu yhteyttä ({x}). Yritä uudelleen Wi-Fi-yhteydellä.',
    'Fuel station by the water — not marked as a boat fuel station in OpenStreetMap; check before relying on it.': 'Tankkausasema veden äärellä — OpenStreetMapissa sitä ei ole merkitty veneiden asemaksi; varmista ennen kuin luotat siihen.',
    'Green pins = fuel stations (tap for price, distance and fuel needed).': 'Vihreät merkit = tankkausasemat (napauta: hinta, matka ja tarvittava polttoaine).',
    'Green pins = boat fuel stations, white = fuel station by the water (tap for price, distance and fuel needed).': 'Vihreät merkit = veneiden tankkausasemat, valkoiset = tankkausasema veden äärellä (napauta: hinta, matka ja tarvittava polttoaine).',
    'When': 'Ajankohta', 'change if you log it afterwards': 'muuta, jos kirjaat jälkikäteen', 'Load: Light': 'Kuorma: kevyt', 'Load: Normal': 'Kuorma: normaali', 'Load: Full': 'Kuorma: täysi',
    'Trips without GPS (logged afterwards) can be added on the Trips tab.': 'Ilman GPS:ää ajetut matkat voi lisätä jälkikäteen Matkat-välilehdellä.',
    'No dip recorded yet. A dip before departure lets the app follow the fuel levels and measure consumption.': 'Mittauksia ei vielä ole. Mittaus ennen lähtöä antaa sovelluksen seurata polttoainemääriä ja mitata kulutusta.',
    'Ruler depth. Litres come from the tank curve. Leave a tank empty if you did not dip it.': 'Mittatikun syvyys. Litrat lasketaan tankkikäyrästä. Jätä tyhjäksi tankki, jota et mitannut.',
    'After trip': 'Matkan jälkeen', 'Before trip': 'Ennen matkaa', 'Separate': 'Erillinen', 'The time is in the future': 'Ajankohta on tulevaisuudessa',
    'Depths, pump litres and price': 'Syvyydet, pumpun litrat ja hinta', 'what the canister fuel cost': 'mitä kanisterin polttoaine maksoi', 'paid at the pump': 'pumpulla maksettu',
    'Add trip by hand': 'Lisää matka käsin', 'Add trip': 'Lisää matka', 'by hand': 'käsin', 'No trips yet. Start one from the Helm screen, or add a trip by hand.': 'Ei vielä matkoja. Aloita matka Ruori-näkymästä tai lisää matka käsin.',
    'Entered by hand': 'Syötetty käsin', 'average {n} kn': 'keskinopeus {n} kn', 'no GPS track': 'ei GPS-reittiä', 'Edit': 'Muokkaa', 'Edit trip': 'Muokkaa matkaa', 'For trips logged without GPS': 'Matkoille, jotka ajettiin ilman GPS-tallennusta',
    'Start': 'Lähtö', 'date and time': 'päivä ja kellonaika', 'Time under way': 'Ajoaika', 'hours and minutes': 'tunnit ja minuutit', 'Average speed {n} kn': 'Keskinopeus {n} kn', 'estimated fuel {n} L': 'arvioitu kulutus {n} L',
    'optional': 'valinnainen', 'Save changes': 'Tallenna muutokset', 'Trip added': 'Matka lisätty', 'entered by hand': 'syötetty käsin',
    'The time counts as cruising at the average speed.': 'Aika lasketaan ajoksi keskinopeudella.',
    'The trip is included in the totals and, when there are dips before and after, in the consumption measurement.': 'Matka lasketaan yhteenvetoon ja, kun ennen ja jälkeen on mittaus, myös kulutusmittaukseen.',
    'Enter the distance and the time under way': 'Anna matka ja ajoaika', 'Average speed over {n} kn — check the values': 'Keskinopeus yli {n} kn — tarkista arvot', 'The trip cannot end in the future': 'Matka ei voi päättyä tulevaisuudessa',
    // ---- fuel stations ----
    'Add fuel station': 'Lisää tankkausasema', 'A fuel station missing from the map, at the point you tapped.': 'Kartalta puuttuva tankkausasema napauttamaasi kohtaan.', 'Fuel station added': 'Tankkausasema lisätty',
    'Delete this station?': 'Poistetaanko asema?', 'Its price history is kept in backups but the marker is removed.': 'Hintahistoria säilyy varmuuskopioissa, mutta merkki poistetaan.',
    'Log price seen': 'Kirjaa nähty hinta', 'Diesel price you saw, for example on the price board.': 'Näkemäsi dieselin hinta, esimerkiksi hintataululta.', 'Price saved': 'Hinta tallennettu',
    'no price yet': 'ei vielä hintaa', 'your own station': 'oma asema', 'diesel': 'diesel', 'octane 95': 'bensiini 95', 'octane 98': 'bensiini 98',
    'Price saved for {x}': 'Hinta tallennettu: {x}', '— the price is saved to this station\'s history.': '— hinta tallennetaan tämän aseman historiaan.',

    // ---- trip planner ----
    'Plan trip with refuelling': 'Suunnittele matka tankkauksineen', 'Trip plan': 'Matkasuunnitelma', 'chosen point': 'valittu piste', 'boat (GPS)': 'vene (GPS)', 'not set — long-press the map': 'ei asetettu — paina karttaa pitkään',
    'tap the map or a fuel station': 'napauta karttaa tai tankkausasemaa', 'Stop-over {n}:': 'Välipiste {n}:', 'Economy {n} kn': 'Taloudellisin {n} kn', 'Now {n} kn': 'Nyt {n} kn',
    'Fuel left at destination': 'Polttoainetta jäljellä määränpäässä', 'Extra per refuel': 'Lisävara tankkausta kohden',
    'on top of what the next leg needs': 'seuraavan osuuden tarpeen lisäksi', 'Route: over open water': 'Reitti: avovettä pitkin', 'Route: along fairways': 'Reitti: väyliä pitkin', 'Route: straight lines (Circle mode)': 'Reitti: suorat viivat (Ympyrä-tila)',
    'Calculate plan': 'Laske suunnitelma', 'Calculating sea distances {n}/{n}…': 'Lasketaan meriteitse etäisyyksiä {n}/{n}…', 'Preparing…': 'Valmistellaan…', 'Set a start point first.': 'Aseta ensin lähtöpiste.',
    'Dip both tanks first.': 'Mittaa ensin molemmat tankit.', 'Tap the map or a fuel station to choose the destination.': 'Napauta karttaa tai tankkausasemaa valitaksesi määränpään.', 'Speed {n}–{n} kn': 'Nopeus {n}–{n} kn',
    'Cheapest': 'Halvin', 'Fewest stops': 'Vähiten pysähdyksiä', 'Shortest': 'Lyhin', 'Fuel bought': 'Tankataan', 'includes estimates': 'sisältää arvioita', 'known prices': 'tunnetut hinnat',
    'L · {n} stop': 'L · {n} pysähdys', 'L · {n} stops': 'L · {n} pysähdystä', '{n} € · {n} stop': '{n} € · {n} pysähdys', '{n} € · {n} stops': '{n} € · {n} pysähdystä',
    'NM · {n} h {n} min': 'NM · {n} h {n} min', 'NM · {n} min': 'NM · {n} min', 'arrive with P {n} L / S {n} L': 'perillä P {n} L / S {n} L',
    'At the destination: P {n} L': 'Määränpäässä: P {n} L', 'S {n} L.': 'S {n} L.', '{n} combinations checked': '{n} yhdistelmää tarkistettu', '{n} stations near the route': '{n} asemaa reitin lähellä',
    '{n} stations near the route ({n} not reachable by sea)': '{n} asemaa reitin lähellä ({n} ei saavutettavissa meriteitse)', 'distances open water': 'etäisyydet avovettä pitkin', 'distances fairways': 'etäisyydet väyliä pitkin', 'distances straight lines': 'etäisyydet suorina viivoina',
    '(price estimate)': '(hinta-arvio)', 'No plan found.': 'Suunnitelmaa ei löytynyt.', 'Planning failed: {x}': 'Suunnittelu epäonnistui: {x}',
    
    'consumption {n} L/NM at {n} kn': 'kulutus {n} L/NM {n} kn:ssa', 'direct {n} NM': 'suoraan {n} NM', 'direct not reachable': 'suoraan ei saavutettavissa',
    'Going direct you would be short by about {n} L.': 'Suoraan ajaen polttoainetta puuttuisi noin {n} L.',
    'Going direct you would be short by about {n} L; the best combination with refuelling is still short by about {n} L.': 'Suoraan ajaen polttoainetta puuttuisi noin {n} L; paras yhdistelmä tankkauksineenkin jää noin {n} L vajaaksi.',
    'Try a lower "Fuel left at destination", the economy speed, a fuel station closer to the route, or Circle mode.': 'Kokeile pienempää "Polttoainetta jäljellä määränpäässä" -arvoa, taloudellisinta nopeutta, reittiä lähempänä olevaa asemaa tai Ympyrä-tilaa.',
    
    'There are no fuel stations near the route. Add one on the map (tap the map → Add fuel station here) or download sea data again to update the station list.': 'Reitin lähellä ei ole tankkausasemia. Lisää asema kartalle (napauta karttaa → Lisää tankkausasema tähän) tai lataa merialuedata uudelleen päivittääksesi asemalistan.',
    'None of the fuel stations near the route can be reached by sea with this route type.': 'Yhteenkään reitin lähellä olevaan asemaan ei pääse meriteitse tällä reittityypillä.',
    'Both tanks are empty (at or below the suction pipe) — dip again if this is wrong.': 'Molemmat tankit ovat tyhjiä (imuputken tasolla tai alle) — mittaa uudelleen, jos tämä on väärin.',
    'The destination cannot be reached over open water from the start with the {n} m draft limit. Try another route type or a lower draft limit.': 'Määränpäähän ei pääse avovettä pitkin lähtöpisteestä {n} m syväysrajalla. Kokeile toista reittityyppiä tai pienempää syväysrajaa.',
    'The destination cannot be reached along fairways from the start with the {n} m draft limit. Try another route type or a lower draft limit.': 'Määränpäähän ei pääse väyliä pitkin lähtöpisteestä {n} m syväysrajalla. Kokeile toista reittityyppiä tai pienempää syväysrajaa.',

    // ---- more ----
    'Maps, economy, range, backup': 'Kartat, talous, kantama, varmuuskopio', 'Base map': 'Pohjakartta', 'OpenSeaMap seamarks on top': 'OpenSeaMap-merimerkit päällä', 'Map layers': 'Karttatasot',
    'Traficom chart series': 'Traficomin karttasarja', 'Check Traficom service': 'Tarkista Traficomin palvelu', 'NLS API key': 'MML:n API-avain', 'paste key': 'liitä avain',
    'free from Maanmittauslaitos; needed for the NLS map': 'maksuton Maanmittauslaitokselta; tarvitaan MML-karttaan', 'Add your NLS API key below; until then OSM is shown.': 'Lisää MML:n API-avain alle; siihen asti näytetään OSM.',
    'Open the Helm screen once first.': 'Avaa ensin Ruori-näkymä kerran.', 'Offline charts': 'Kartat ilman verkkoa', 'Save Helm map area for offline': 'Tallenna Ruori-kartan alue käyttöön ilman verkkoa',
    'Saves Traficom chart tiles for the area shown on the Helm map ({n} zoom levels deeper). Do this on Wi-Fi in the harbour.': 'Tallentaa Traficomin karttaruudut Ruori-kartalla näkyvältä alueelta ({n} zoomaustasoa syvemmälle). Tee tämä satamassa Wi-Fi-yhteydellä.',
    'Saving {n} tiles…': 'Tallennetaan {n} karttaruutua…', 'Saved {n} / {n} tiles…': 'Tallennettu {n} / {n} ruutua…', 'Done: {n} of {n} tiles saved.': 'Valmis: {n}/{n} ruutua tallennettu.', 'Done: {n} of {n} tiles saved ({n} failed).': 'Valmis: {n}/{n} ruutua tallennettu ({n} epäonnistui).',
    '{n} tiles is too many. Zoom the Helm map in a bit and try again.': '{n} ruutua on liikaa. Lähennä Ruori-karttaa hieman ja yritä uudelleen.',
    'Economy & range': 'Talous ja kantama', 'Cruising from': 'Matkanopeus alkaen', 'slower = manoeuvring, never proposed': 'hitaampi = ohjailua, ei koskaan ehdoteta',
    'Efficient cruise margin': 'Tehokkaan matkanopeuden marginaali', 'max extra fuel per NM vs the best': 'enimmäislisäkulutus / NM parhaaseen verrattuna', 'RPM rounding': 'Kierrosten pyöristys',
    'Centimetres ({n} cm)': 'Senttimetrit ({n} cm)', 'Millimetres': 'Millimetrit', 'Ruler in centimetres': 'Mittatikku senttimetreinä', 'Ruler in millimetres': 'Mittatikku millimetreinä',
    'Unit for dips, refuels, full-tank depth and suction-pipe height. Readings already saved are converted automatically. The tank polynomial keeps its own unit (Tanks → Polynomial).':
      'Yksikkö mittauksille, tankkauksille, täyden tankin syvyydelle ja imuputken korkeudelle. Jo tallennetut lukemat muunnetaan automaattisesti. Tankin polynomilla on oma yksikkönsä (Tankit → Polynomi).',
    'Sea data for range': 'Merialuedata kantamaa varten', 'Draft limit': 'Syväysraja', 'avoid water shallower than this': 'vältä tätä matalampaa vettä', 'Download / update sea data': 'Lataa / päivitä merialuedata',
    'Land, depth and fairways for Suomenlahti and Saaristomeri, built by the "Build sea data" workflow in your GitHub repository. Download once on Wi-Fi; it then works offline.':
      'Maa-alueet, syvyydet ja väylät Suomenlahdelle ja Saaristomerelle, rakennettu GitHub-repositoriosi "Build sea data" -työnkulussa. Lataa kerran Wi-Fi-yhteydellä; sen jälkeen toimii ilman verkkoa.',
    'Not downloaded yet.': 'Ei vielä ladattu.', 'Sea data ready': 'Merialuedata valmis', 'Downloading description…': 'Ladataan kuvausta…', 'Downloading depth & land grid…': 'Ladataan syvyys- ja maaruudukkoa…',
    'Downloading fairways…': 'Ladataan väyliä…', 'Downloading fuel stations…': 'Ladataan tankkausasemia…',
    'All data lives on this phone only. Export a backup now and then (also before reinstalling).': 'Kaikki tiedot ovat vain tässä puhelimessa. Vie varmuuskopio silloin tällöin (myös ennen uudelleenasennusta).',
    'Export backup': 'Vie varmuuskopio', 'Import backup': 'Tuo varmuuskopio', 'Backup imported': 'Varmuuskopio tuotu', 'Import failed: {x}': 'Tuonti epäonnistui: {x}', 'Not a Fuel Log backup file': 'Ei Fuel Log -varmuuskopiotiedosto',
    'Check for app update': 'Tarkista sovelluksen päivitys', 'Checking… the app reloads if a new version is found': 'Tarkistetaan… sovellus latautuu uudelleen, jos uusi versio löytyy', 'Update check failed: {x}': 'Päivityksen tarkistus epäonnistui: {x}',
    'Load updated — curves refitted': 'Kuorma päivitetty — käyrät sovitettu uudelleen', 'Language': 'Kieli',
    'Fuel stations © OpenStreetMap contributors': 'Tankkausasemat © OpenStreetMap-tekijät', 'Wind data © Finnish Meteorological Institute (CC BY {n})': 'Tuulitiedot © Ilmatieteen laitos (CC BY {n})',
    'Chart data © Traficom, CC BY {n} — not quality-assured, not for navigation.': 'Karttatiedot © Traficom, CC BY {n} — ei laadunvarmistettu, ei navigointiin.',
    'Seamarks © OpenSeaMap, map © OpenStreetMap contributors, background map © Maanmittauslaitos.': 'Merimerkit © OpenSeaMap, kartta © OpenStreetMap-tekijät, taustakartta © Maanmittauslaitos.',
    '{n} s.': '{n} s.', 'Tap the map for a route.': 'Napauta karttaa nähdäksesi reitin.', 'below {n} cm': 'alle {n} cm', 'below {n} mm': 'alle {n} mm', 'dip {n} cm': 'mittaus {n} cm', 'dip {n} mm': 'mittaus {n} mm',
    '{n} NM over open water': '{n} NM avovettä pitkin', '{n} NM along fairways': '{n} NM väyliä pitkin', '{n} NM straight line': '{n} NM suoraan', '{n} L at {n} kn': '{n} L {n} kn:ssa',
    'used {n} L since {n}': 'kulunut {n} L {n} jälkeen', 'below pipe': 'imuputken alla', 'brim: {n} L': 'piripinta: {n} L',
    'dip': 'mittaus', 'refuel +{n} L': 'tankkaus +{n} L', 'refuel +{n} L (brim)': 'tankkaus +{n} L (piripintaan)', '(brim)': '(piripintaan)'
  };

  // name-carrying texts (tank / station names stay as they are)
  const tankName = (n) => n;
  const PATTERNS = [
    [/^Version ([\d.]+)$/, (m, v) => 'Versio ' + v],
    [/^Trip (\d.*)$/, (m, d) => 'Matka ' + d],
    [/^Dip (.+) tank$/, (m, n) => 'Mittaa tankki ' + tankName(n)],
    [/^Edit (.+) tank$/, (m, n) => 'Muokkaa tankkia ' + tankName(n)],
    [/^(.+) filled to the brim \(= (.+) L\)$/, (m, n, l) => `${n} täytetty piripintaan (= ${l} L)`],
    [/^Filled to the brim \(= (.+) L\)$/, (m, l) => `Täytetty piripintaan (= ${l} L)`],
    [/^(.+): Depth (before|after)$/, (m, n, w) => `${n}: Syvyys ${w === 'before' ? 'ennen' : 'jälkeen'}`],
    [/^(.+): before \+ pumped$/, (m, n) => `${n}: ennen + pumpattu`],
    [/^(.+): solid = current$/, (m, n) => `${n}: yhtenäinen = nykyinen`],
    [/^Limited by (.+) tank \(other lasts (.+) NM\)$/, (m, n, x) => `Rajoittaa ${n}-tankki (toinen riittää ${x} NM)`],
    [/^Limited by (.+) tank$/, (m, n) => `Rajoittaa ${n}-tankki`],
    [/^Only the (.+) tank is used$/, (m, n) => `Vain ${n}-tankkia käytetään`],
    [/^The (.+) tank is empty \(at or below the suction pipe\) — dip again if this is wrong\.$/, (m, n) => `${n}-tankki on tyhjä (imuputken tasolla tai alle) — mittaa uudelleen, jos tämä on väärin.`],
    [/^([^·]+?) (-?[\d.]+|–) L usable$/, (m, n, l) => `${n} ${l} L käytettävissä`],
    [/^Price at (.+)$/, (m, n) => 'Hinta: ' + n],
    [/^Price saved for (.+)$/, (m, n) => 'Hinta tallennettu: ' + n],
    [/^Refuel at (.+?): P (.+) L \+ S (.+) L × (.+) €\/L = (.+) €( \(price estimate\))?$/, (m, n, p, s, pr, t, est) => `Tankkaa ${n}: P ${p} L + S ${s} L × ${pr} €/L = ${t} €${est ? ' (hinta-arvio)' : ''}`],
    [/^(\d+)\. (.+) → (.+)$/, (m, i, a, b) => `${i}. ${a === 'Start' ? 'Lähtö' : a} → ${b === 'Start' ? 'Lähtö' : b}`],
    [/^(Start|Destination|Stop-over \d+)((?:, (?:Start|Destination|Stop-over \d+))*) not reachable (over open water|along fairways) with the (.+) m draft limit \(on land, or too shallow nearby\) — using straight lines × (.+) instead\.$/,
      (m, a, rest, how, d, k) => `${(a + rest).replace(/Start/g, 'Lähtö').replace(/Destination/g, 'Määränpää').replace(/Stop-over/g, 'Välipiste')}: ei saavutettavissa ${how === 'along fairways' ? 'väyliä pitkin' : 'avovettä pitkin'} ${d} m syväysrajalla (maalla tai liian matalaa lähellä) — käytetään suoria viivoja × ${k}.`],
    [/^(.+) — (.+) € · (\d+) stops?$/, (m, labels, e, n) => `${labels.split(' · ').map((x) => FI[x] || x).join(' · ')} — ${e} € · ${n} ${n === '1' ? 'pysähdys' : 'pysähdystä'}`],
    [/^Calculation failed \((.*)\)\.$/, (m, x) => `Laskenta epäonnistui (${x}).`],
    [/^(Planning failed|Route failed|Import failed|Update check failed): (.*)$/, (m, w, x) => ({ 'Planning failed': 'Suunnittelu epäonnistui', 'Route failed': 'Reitin laskenta epäonnistui', 'Import failed': 'Tuonti epäonnistui', 'Update check failed': 'Päivityksen tarkistus epäonnistui' }[w]) + ': ' + x],
    [/^Wind: not available \((.*)\)$/, (m, x) => `Tuuli: ei saatavilla (${FI[x] || x})`],
    [/^Loaded: built (.+?), depth: (.+?), (\d+) fairway segments, (\d+) fuel stations, (.+) MB$/, (m, b, d, f, s, mb) => `Ladattu: rakennettu ${b}, syvyys: ${d}, ${f} väyläosuutta, ${s} tankkausasemaa, ${mb} MB`],
    [/^Could not reach OpenStreetMap \((.*)\)\. Try again on Wi-Fi\.$/, (m, x) => `OpenStreetMapiin ei saatu yhteyttä (${x}). Yritä uudelleen Wi-Fi-yhteydellä.`],
    [/^seen (.+)$/, (m, x) => 'nähty ' + tr(x)], [/^you paid (.+)$/, (m, x) => 'maksoit ' + tr(x)]
  ];

  const NUM = /\d{1,2}\.\d{1,2}\.(?:\d{4})?|-?\d+(?:[.,]\d+)?/g;   // dates like 10.10. or 10.10.2026 count as one number
  function one(s) {
    if (Object.prototype.hasOwnProperty.call(FI, s)) return FI[s];
    const nums = s.match(NUM);
    if (nums) {
      const k = s.replace(NUM, '{n}');
      if (Object.prototype.hasOwnProperty.call(FI, k)) { let i = 0; return FI[k].replace(/\{n\}/g, () => nums[i++]); }
    }
    for (const [re, fn] of PATTERNS) { const m = s.match(re); if (m) return fn ? fn(...m) : s; }
    return null;
  }
  // texts with a free part {x}: "Planning failed: …" are handled by patterns; here the generic "Prefix: {x}"
  function tr(s) {
    if (!/[A-Za-z]/.test(s)) return s;
    const r = one(s); if (r !== null) return r;
    const sent = s.split(/(?<=[.!?])\s+(?=["A-Z(\d])/);
    if (sent.length > 1) return sent.map(tr).join(' ');
    const dot = s.split(' · ');
    if (dot.length > 1) return dot.map(tr).join(' · ');
    const pre = s.match(/^([A-Za-z][^:]{2,40}): (.+)$/);
    if (pre && FI[pre[1] + ': {x}']) return FI[pre[1] + ': {x}'].replace('{x}', pre[2]);
    const dash = s.split(' — ');
    if (dash.length > 1) return dash.map(tr).join(' — ');
    return s;
  }
  function text(s) {
    const m = /^(\s*(?:·\s+)?)([\s\S]*?)((?:\s+·)?\s*)$/.exec(s);
    if (!m[2]) return s;
    const out = tr(m[2]);
    return out === m[2] ? s : m[1] + out + m[3];
  }

  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);
  function node(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode; if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest('[data-noi18n]'))) return;
      const v = n.nodeValue, t = text(v); if (t !== v) n.nodeValue = t; return;
    }
    if (n.nodeType !== 1 || n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') return;
    if (n.hasAttribute('data-noi18n')) return;
    for (const a of ATTRS) if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = text(v); if (t !== v) n.setAttribute(a, t); }
    if (SKIP.has(n.nodeName)) return;   // never touch what is typed in fields
    for (let c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function start() {
    document.documentElement.lang = lang;
    if (lang !== 'fi') return;
    node(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') { const el = m.target, v = el.getAttribute(m.attributeName); if (v) { const t = text(v); if (t !== v) el.setAttribute(m.attributeName, t); } }
        else m.addedNodes.forEach(node);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function setLang(l) { try { localStorage.setItem('fuellog-lang', l); } catch (e) { /* ignore */ } lang = l; }

  return { start, setLang, t: (s) => (lang === 'fi' ? text(s) : s), get lang() { return lang; }, get locale() { return locale(); }, _tr: tr };
})();
I18N.start();
