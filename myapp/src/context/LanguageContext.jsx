import { createContext, useContext, useState } from 'react'

const T = {
  sv: {
    // Nav
    home:       'Hem',
    wardrobe:   'Garderob',
    feed:       'The Market',
    plan:       'Planera',
    // Side panel
    myFleaMarket: 'Min loppis',
    myProfile:    'Min profil',
    logout:       'Logga ut',
    // Home page
    goodMorning:  'God morgon',
    goodAfternoon:'God eftermiddag',
    goodEvening:  'God kväll',
    whatToday:    'Vad vill du göra idag?',
    myWardrobe:   'Min garderob',
    browseStyle:  'Bläddra och styla dina kläder',
    planWeek:     'Planera veckan',
    chooseOutfit: 'Välj outfit för varje dag',
    styleBoard:   'Kollage',
    buildOutfits: 'Sätt ihop outfits på canvas',
    collections:  'Samlingar',
    savedOutfits: 'Dina sparade outfits',
    myProfileTile:'Min profil',
    settingsStats:'Inställningar och statistik',
    todaysOutfit: 'DAGENS OUTFIT',  // keep OUTFIT
    noPlanned:    'Inget planerat för idag',
    clickToplan:  'Klicka för att planera',
    changeOutfit: 'Ändra outfit',
    noItemsYet:   'INGA PLAGG TILL SALU ÄN',
    othersAppear: 'Andras plagg dyker upp när communityt växer',
    seeAll:       'Se alla',
    // Wardrobe
    addItem:      'Lägg till plagg',
    collections2: 'Samlingar',
    collage:      'Kollage',
    // Flea market
    searchUser:   'Användare',
    searchBrand:  'Märke',
    searchPerson: 'Sök person…',
    searchBrandP: 'Sök märke…',
    search:       'SÖK',
    itemsForSale: 'plagg till salu',
    seeFleaMarket:'Se loppis',
    contactSeller:'KONTAKTA SÄLJAREN',
    yourItem:     'Det här är ditt eget plagg',
    // Planner
    loading:      'Laddar…',
  },
  en: {
    // Nav
    home:       'Home',
    wardrobe:   'Wardrobe',
    feed:       'The Market',
    plan:       'Plan',
    // Side panel
    myFleaMarket: 'My flea market',
    myProfile:    'My profile',
    logout:       'Log out',
    // Home page
    goodMorning:  'Good morning',
    goodAfternoon:'Good afternoon',
    goodEvening:  'Good evening',
    whatToday:    'What do you want to do today?',
    myWardrobe:   'My wardrobe',
    browseStyle:  'Browse and style your clothes',
    planWeek:     'Plan the week',
    chooseOutfit: 'Pick an outfit for every day',
    styleBoard:   'Kollage',
    buildOutfits: 'Build outfits on canvas',
    collections:  'Collections',
    savedOutfits: 'Your saved outfits',
    myProfileTile:'My profile',
    settingsStats:'Settings and statistics',
    todaysOutfit: 'TODAY\'S OUTFIT',
    noPlanned:    'Nothing planned for today',
    clickToplan:  'Click to plan',
    changeOutfit: 'Change outfit',
    noItemsYet:   'NO ITEMS FOR SALE YET',
    othersAppear: 'Others\' items appear as the community grows',
    seeAll:       'See all',
    // Wardrobe
    addItem:      'Add item',
    collections2: 'Collections',
    collage:      'Collage',
    // Flea market
    searchUser:   'User',
    searchBrand:  'Brand',
    searchPerson: 'Search person…',
    searchBrandP: 'Search brand…',
    search:       'SEARCH',
    itemsForSale: 'items for sale',
    seeFleaMarket:'See flea market',
    contactSeller:'CONTACT SELLER',
    yourItem:     'This is your own item',
    // Planner
    loading:      'Loading…',
  }
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'sv')

  const toggleLang = () => {
    const next = lang === 'sv' ? 'en' : 'sv'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  const t = (key) => T[lang][key] ?? T['sv'][key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
