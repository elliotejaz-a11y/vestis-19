#!/usr/bin/env node
/**
 * seed-essentials.mjs
 * Pre-analysed bulk upload — no ANTHROPIC_API_KEY needed.
 * Uploads all 118 essential images to Supabase Storage and inserts catalogue rows.
 *
 * Every item below was visually verified against its source image (file 52 is a
 * baby onesie and is skipped; file 19 is a genuine adult item and is included).
 *
 * Usage:
 *   node scripts/seed-essentials.mjs                                    # targets staging by default
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-essentials.mjs   # targets any project (e.g. production)
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sfwneyufnefjgkauilcq.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd25leXVmbmVmamdrYXVpbGNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM0ODQzOSwiZXhwIjoyMDk2OTI0NDM5fQ.aky-_8gwXev4p0q7rqwZQOxuKPRFjYUN8d3mqtP6SXM';
const BUCKET       = 'essentials';
const IMG_DIR       = '/Users/ejazadam/Downloads/Vestis Essentials NOBG';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function toLabel(folder) {
  const map = { tops: 'Tops', bottoms: 'Bottoms', dresses: 'Dresses', jumpers: 'Knitwear', outerwear: 'Outerwear', shoes: 'Shoes', accessories: 'Accessories', hats: 'Accessories', bags: 'Bags' };
  return map[folder];
}

// Pre-analysed, visually-verified catalogue data for all 118 items (file 52 skipped — baby onesie).
const ITEMS = [
  { file: '1',   folder: 'bottoms',     name: 'Black Leggings',                 subcategory: 'Leggings',         colour: 'Black',    colour_hex: '#1A1A1A', description: 'High-waist ribbed leggings in jet black — the everyday base layer for workouts or lounging.', tags: ['leggings','black','ribbed','athleisure','basic'] },
  { file: '2',   folder: 'bags',        name: 'Black Nylon Messenger Bag',      subcategory: 'Messenger Bags',   colour: 'Black',    colour_hex: '#1A1A1A', description: 'A slim nylon messenger bag with adjustable strap — built for the daily commute.', tags: ['bag','messenger','nylon','black','work'] },
  { file: '3',   folder: 'accessories', name: 'Gold Hoop Earrings',             subcategory: 'Jewellery',        colour: 'Gold',     colour_hex: '#C9A227', description: 'Classic thin gold hoops that work from morning meetings to night out.', tags: ['earrings','gold','hoops','jewellery','everyday'] },
  { file: '4',   folder: 'shoes',       name: 'Black Chelsea Boots',            subcategory: 'Boots',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'Sleek leather Chelsea boots with an elastic side panel — the no-fuss boot for any outfit.', tags: ['boots','chelsea','leather','black','classic'] },
  { file: '5',   folder: 'tops',        name: 'White Bandeau Top',              subcategory: 'Tops',             colour: 'White',    colour_hex: '#FAFAFA', description: 'A strapless ribbed bandeau in white — the layering piece for summer styling.', tags: ['bandeau','strapless','white','ribbed','top'] },
  { file: '6',   folder: 'bottoms',     name: 'Cream A-Line Midi Skirt',        subcategory: 'Skirts',           colour: 'Cream',    colour_hex: '#E8DCC8', description: 'A tailored A-line midi skirt in cream cotton with side pockets — smart-casual made simple.', tags: ['skirt','midi','cream','a-line','tailored'] },
  { file: '7',   folder: 'dresses',     name: 'Black Sport Dress',              subcategory: 'Mini Dresses',     colour: 'Black',    colour_hex: '#1A1A1A', description: 'An athletic-cut tank dress in black with built-in support — gym to errands in one piece.', tags: ['dress','sport','black','athletic','tank'] },
  { file: '8',   folder: 'bags',        name: 'Black Leather Tote Bag',         subcategory: 'Tote Bags',        colour: 'Black',    colour_hex: '#1A1A1A', description: 'A structured leather tote with twin handles — the polished everyday workbag.', tags: ['bag','tote','leather','black','structured'] },
  { file: '9',   folder: 'bottoms',     name: 'Black Maxi Skirt',               subcategory: 'Skirts',           colour: 'Black',    colour_hex: '#1A1A1A', description: 'A flowing A-line maxi skirt in black jersey — effortless movement for any season.', tags: ['skirt','maxi','black','a-line','flowy'] },
  { file: '10',  folder: 'accessories', name: 'Silver Mesh Watch',              subcategory: 'Watches',          colour: 'Silver',   colour_hex: '#C0C0C0', description: 'A minimalist mesh-strap watch in silver — the everyday timepiece that pairs with everything.', tags: ['watch','silver','mesh','minimalist','accessory'] },
  { file: '11',  folder: 'outerwear',   name: 'Blue Denim Jacket',              subcategory: 'Denim Jackets',    colour: 'Blue',     colour_hex: '#4A6FA5', description: 'A classic mid-wash denim trucker jacket — the layering piece that never goes out of style.', tags: ['jacket','denim','blue','trucker','classic'] },
  { file: '12',  folder: 'outerwear',   name: 'Navy Hooded Windbreaker',        subcategory: 'Windbreakers',     colour: 'Navy',     colour_hex: '#1F2A44', description: 'A lightweight hooded windbreaker in navy — packable protection for unpredictable weather.', tags: ['jacket','windbreaker','navy','hooded','lightweight'] },
  { file: '13',  folder: 'dresses',     name: 'Grey Knit Sweater Dress',        subcategory: 'Knit Dresses',     colour: 'Grey',     colour_hex: '#A0A0A0', description: 'A relaxed knit sweater dress in heather grey — cosy enough for everyday, polished enough to wear out.', tags: ['dress','knit','grey','sweater','cosy'] },
  { file: '14',  folder: 'bags',        name: 'Tan Leather Crossbody Bag',      subcategory: 'Crossbody Bags',   colour: 'Tan',      colour_hex: '#B97A4D', description: 'A slim tan leather crossbody — the hands-free bag for everyday essentials.', tags: ['bag','crossbody','tan','leather','everyday'] },
  { file: '15',  folder: 'bottoms',     name: 'Blue Tapered Jeans',             subcategory: 'Jeans',            colour: 'Blue',     colour_hex: '#4A6FA5', description: 'Tapered jeans in mid-wash denim with a cropped ankle — a modern everyday fit.', tags: ['jeans','blue','tapered','cropped','denim'] },
  { file: '16',  folder: 'tops',        name: 'White Oxford Shirt',             subcategory: 'Shirts',           colour: 'White',    colour_hex: '#FAFAFA', description: 'A crisp Oxford button-down in white — the sharp foundation for any smart-casual look.', tags: ['shirt','oxford','white','button-down','classic'] },
  { file: '17',  folder: 'accessories', name: 'Black Leather Gloves',           subcategory: 'Gloves',           colour: 'Black',    colour_hex: '#1A1A1A', description: 'Soft leather gloves in black with a fleece lining — cold-weather styling done right.', tags: ['gloves','leather','black','winter','accessory'] },
  { file: '18',  folder: 'jumpers',     name: 'Cream Crew Sweatshirt',          subcategory: 'Sweatshirts',      colour: 'Cream',    colour_hex: '#F5F0E1', description: 'A heavyweight crewneck sweatshirt in cream — the year-round layering essential.', tags: ['sweatshirt','crew','cream','heavyweight','casual'] },
  { file: '19',  folder: 'dresses',     name: 'Black Sheath Dress',             subcategory: 'Midi Dresses',     colour: 'Black',    colour_hex: '#1A1A1A', description: 'A fitted sleeveless sheath dress in black — the office-to-evening staple.', tags: ['dress','sheath','black','sleeveless','fitted'] },
  // file 52 skipped — baby onesie
  { file: '20',  folder: 'outerwear',   name: 'Olive Hooded Parka',             subcategory: 'Parkas',           colour: 'Olive',    colour_hex: '#6B7645', description: 'A utility parka in olive cotton with a drawstring hood — built for the elements.', tags: ['jacket','parka','olive','hooded','utility'] },
  { file: '21',  folder: 'shoes',       name: 'White High-Top Sneakers',        subcategory: 'Sneakers',         colour: 'White',    colour_hex: '#F5F5F5', description: 'Clean leather high-top sneakers in white — a street-classic silhouette.', tags: ['sneakers','high-top','white','leather','classic'] },
  { file: '22',  folder: 'bottoms',     name: 'Blue Straight Leg Jeans',        subcategory: 'Jeans',            colour: 'Blue',     colour_hex: '#4A6FA5', description: 'Classic straight-leg jeans in mid-wash denim — a wardrobe cornerstone.', tags: ['jeans','blue','straight','denim','classic'] },
  { file: '23',  folder: 'accessories', name: 'Black Bandana',                  subcategory: 'Scarves',          colour: 'Black',    colour_hex: '#1A1A1A', description: 'A versatile cotton bandana in black — tie it at the neck, wrist, or bag strap.', tags: ['bandana','scarf','black','cotton','versatile'] },
  { file: '24',  folder: 'bottoms',     name: 'Beige Chino Trousers',           subcategory: 'Trousers',         colour: 'Beige',    colour_hex: '#D4C5A9', description: 'Tailored chino trousers in beige cotton — the smart-casual staple for any season.', tags: ['trousers','chino','beige','tailored','smart-casual'] },
  { file: '25',  folder: 'shoes',       name: 'Tan Leather Flat Sandals',       subcategory: 'Sandals',          colour: 'Tan',      colour_hex: '#C9935A', description: 'Crossover-strap flat sandals in tan leather — easy summer styling.', tags: ['sandals','flat','tan','leather','summer'] },
  { file: '26',  folder: 'bottoms',     name: 'Cream Wide Leg Trousers',        subcategory: 'Trousers',         colour: 'Cream',    colour_hex: '#E8DCC8', description: 'Wide-leg trousers in natural cream cotton — relaxed tailoring for warm days.', tags: ['trousers','wide-leg','cream','cotton','relaxed'] },
  { file: '27',  folder: 'tops',        name: 'White Crop T-Shirt',             subcategory: 'T-Shirts',         colour: 'White',    colour_hex: '#FAFAFA', description: 'A cropped crewneck tee in white cotton — the layering piece for high-waist bottoms.', tags: ['t-shirt','crop','white','cotton','layering'] },
  { file: '28',  folder: 'dresses',     name: 'Black Satin Mini Dress',         subcategory: 'Mini Dresses',     colour: 'Black',    colour_hex: '#1A1A1A', description: 'A cross-back satin mini dress in black — understated glamour for evening.', tags: ['dress','satin','black','mini','evening'] },
  { file: '29',  folder: 'tops',        name: 'White Classic T-Shirt',          subcategory: 'T-Shirts',         colour: 'White',    colour_hex: '#FAFAFA', description: 'A perfectly weighted crewneck tee in white — the foundation of any wardrobe.', tags: ['t-shirt','crew-neck','white','classic','essential'] },
  { file: '30',  folder: 'shoes',       name: 'Black Block Heel Pumps',         subcategory: 'Heels',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'Pointed-toe pumps with a comfortable block heel in black — office-ready elegance.', tags: ['heels','pumps','black','block-heel','pointed-toe'] },
  { file: '31',  folder: 'bottoms',     name: 'Black Bike Shorts',              subcategory: 'Shorts',           colour: 'Black',    colour_hex: '#1A1A1A', description: 'High-waist compression bike shorts in black — built for movement.', tags: ['shorts','bike','black','compression','athletic'] },
  { file: '32',  folder: 'tops',        name: 'White Tank Top',                 subcategory: 'Tank Tops',        colour: 'White',    colour_hex: '#FAFAFA', description: 'A relaxed scoop-neck tank in white cotton — the simple layering essential.', tags: ['tank','white','cotton','scoop-neck','layering'] },
  { file: '33',  folder: 'accessories', name: 'Gold Thick Hoop Earrings',       subcategory: 'Jewellery',        colour: 'Gold',     colour_hex: '#C9A227', description: 'Bold chunky gold hoops that make a statement on their own.', tags: ['earrings','gold','hoops','statement','jewellery'] },
  { file: '34',  folder: 'shoes',       name: 'Black Leather Sneakers',         subcategory: 'Sneakers',         colour: 'Black',    colour_hex: '#1A1A1A', description: 'Minimal low-top leather sneakers in black — sharp enough for smart-casual.', tags: ['sneakers','leather','black','low-top','minimal'] },
  { file: '35',  folder: 'bottoms',     name: 'Olive Cargo Trousers',           subcategory: 'Trousers',         colour: 'Olive',    colour_hex: '#6B7645', description: 'Utility cargo trousers in olive cotton with practical side pockets.', tags: ['trousers','cargo','olive','utility','casual'] },
  { file: '36',  folder: 'shoes',       name: 'Tan Leather Loafers',            subcategory: 'Loafers',          colour: 'Tan',      colour_hex: '#B97A4D', description: 'Classic penny loafers in tan leather — timeless smart-casual footwear.', tags: ['loafers','leather','tan','penny','classic'] },
  { file: '37',  folder: 'shoes',       name: 'White Canvas Slip-Ons',          subcategory: 'Sneakers',         colour: 'White',    colour_hex: '#F5F5F5', description: 'Easy canvas slip-on sneakers in white — grab-and-go warm-weather footwear.', tags: ['sneakers','slip-on','canvas','white','casual'] },
  { file: '38',  folder: 'bags',        name: 'Black Canvas Weekender',         subcategory: 'Duffle Bags',      colour: 'Black',    colour_hex: '#1A1A1A', description: 'A spacious canvas weekender with leather trim — the go-anywhere travel bag.', tags: ['bag','weekender','canvas','black','travel'] },
  { file: '39',  folder: 'shoes',       name: 'White Leather Sneakers',         subcategory: 'Sneakers',         colour: 'White',    colour_hex: '#F5F5F5', description: 'Low-profile leather sneakers in clean white — the everyday footwear essential.', tags: ['sneakers','white','leather','low-top','everyday'] },
  { file: '40',  folder: 'outerwear',   name: 'Black Puffer Jacket',            subcategory: 'Puffer Jackets',   colour: 'Black',    colour_hex: '#1A1A1A', description: 'A hooded down-style puffer jacket in black — serious warmth without the bulk.', tags: ['jacket','puffer','black','hooded','winter'] },
  { file: '41',  folder: 'tops',        name: 'Tan Military Overshirt',         subcategory: 'Shirts',           colour: 'Tan',      colour_hex: '#9B8B6E', description: 'A structured military-inspired overshirt with chest pockets, worn open as a light jacket.', tags: ['overshirt','military','tan','button-up','utility'] },
  { file: '42',  folder: 'outerwear',   name: 'Black Leather Jacket',           subcategory: 'Leather Jackets',  colour: 'Black',    colour_hex: '#1A1A1A', description: 'A clean zip-up leather jacket with a spread collar — a wardrobe-defining piece.', tags: ['leather','jacket','zip','black','classic'] },
  { file: '43',  folder: 'accessories', name: 'Grey Knit Scarf',                subcategory: 'Scarves',          colour: 'Grey',     colour_hex: '#A0A0A0', description: 'A soft knit scarf in heather grey — the cold-weather essential.', tags: ['scarf','knit','grey','winter','soft'] },
  { file: '44',  folder: 'outerwear',   name: 'Grey Fleece Zip Jacket',         subcategory: 'Fleece Jackets',   colour: 'Grey',     colour_hex: '#9B9B9B', description: 'A soft-touch fleece jacket with a stand collar — the perfect mid-layer.', tags: ['fleece','jacket','zip','grey','mid-layer'] },
  { file: '45',  folder: 'accessories', name: 'Black Leather Belt',             subcategory: 'Belts',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'A slim matte-buckle leather belt that works with trousers and jeans alike.', tags: ['belt','leather','black','slim','classic'] },
  { file: '46',  folder: 'dresses',     name: 'Beige Wrap Dress',               subcategory: 'Wrap Dresses',     colour: 'Beige',    colour_hex: '#C4A882', description: 'A flattering wrap dress in warm beige that dresses up or down with ease.', tags: ['dress','wrap','beige','v-neck','versatile'] },
  { file: '47',  folder: 'dresses',     name: 'Black Maxi Dress',               subcategory: 'Maxi Dresses',     colour: 'Black',    colour_hex: '#1A1A1A', description: 'A sleeveless belted maxi dress in black that transitions from day to evening.', tags: ['dress','maxi','black','belted','sleeveless'] },
  { file: '48',  folder: 'outerwear',   name: 'Grey Wool Overcoat',             subcategory: 'Coats',            colour: 'Grey',     colour_hex: '#7A7A7A', description: 'A tailored overcoat in grey wool — the cornerstone of a winter wardrobe.', tags: ['coat','wool','grey','overcoat','tailored'] },
  { file: '49',  folder: 'bottoms',     name: 'Grey Track Pants',               subcategory: 'Trousers',         colour: 'Grey',     colour_hex: '#9B9B9B', description: 'Sleek grey track pants in a straight cut that move between sport and casual wear.', tags: ['trousers','grey','track','athleisure','casual'] },
  { file: '50',  folder: 'accessories', name: 'Cream Silk Scarf',               subcategory: 'Scarves',          colour: 'Cream',    colour_hex: '#F5F0E1', description: 'A whisper-soft silk square in cream — elevates any look worn at the neck or hair.', tags: ['scarf','silk','cream','neckerchief','elegant'] },
  { file: '51',  folder: 'shoes',       name: 'Black Kitten Heel Pumps',        subcategory: 'Heels',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'A pointed kitten-heel loafer pump in black — comfortable elegance for everyday wear.', tags: ['heels','pumps','black','kitten-heel','pointed-toe'] },
  { file: '53',  folder: 'bags',        name: 'Black Mini Backpack',            subcategory: 'Backpacks',        colour: 'Black',    colour_hex: '#1A1A1A', description: 'A compact nylon mini backpack that carries the essentials with clean minimal style.', tags: ['backpack','nylon','black','mini','everyday'] },
  { file: '54',  folder: 'bottoms',     name: 'Blue Straight Leg Jeans',        subcategory: 'Jeans',            colour: 'Blue',     colour_hex: '#4A6FA5', description: 'Classic straight-leg jeans in mid-wash denim — a wardrobe cornerstone.', tags: ['jeans','blue','straight','denim','classic'] },
  { file: '55',  folder: 'shoes',       name: 'Black Knee-High Boots',          subcategory: 'Boots',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'Sleek knee-high leather boots with a low stacked heel that anchor any cold-weather outfit.', tags: ['boots','leather','black','knee-high','winter'] },
  { file: '56',  folder: 'hats',        name: 'Cream Wide Brim Hat',            subcategory: 'Felt Hats',        colour: 'Cream',    colour_hex: '#EDE3CC', description: 'A wide-brimmed felt hat in cream that adds instant polish to any look.', tags: ['hat','wide-brim','cream','felt','elevated'] },
  { file: '57',  folder: 'shoes',       name: 'Black Strappy Heel Sandals',     subcategory: 'Heels',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'Double ankle-strap stiletto sandals in black — transform any dress into an evening look.', tags: ['sandals','heels','black','strappy','evening'] },
  { file: '58',  folder: 'hats',        name: 'Beige Bucket Hat',               subcategory: 'Bucket Hats',      colour: 'Beige',    colour_hex: '#D4C5A9', description: 'A washed cotton bucket hat in warm beige — a casual everyday essential.', tags: ['hat','bucket','beige','cotton','casual'] },
  { file: '59',  folder: 'bottoms',     name: 'Olive Cargo Shorts',             subcategory: 'Shorts',           colour: 'Olive',    colour_hex: '#6B7645', description: 'Utility-inspired cargo shorts in olive cotton with practical side pockets.', tags: ['shorts','cargo','olive','utility','casual'] },
  { file: '60',  folder: 'shoes',       name: 'White Platform Slip-Ons',        subcategory: 'Sneakers',         colour: 'White',    colour_hex: '#F5F5F5', description: 'A minimalist platform slip-on in clean white — effortless and modern.', tags: ['shoes','platform','white','slip-on','minimal'] },
  { file: '61',  folder: 'outerwear',   name: 'Beige Trench Coat',              subcategory: 'Coats',            colour: 'Beige',    colour_hex: '#C4AD8F', description: 'A classic double-breasted trench coat in beige that never goes out of style.', tags: ['coat','trench','beige','classic','belted'] },
  { file: '62',  folder: 'accessories', name: 'Gold Chain Necklace',            subcategory: 'Jewellery',        colour: 'Gold',     colour_hex: '#C9A227', description: 'A long layered chain necklace in gold that adds statement to minimal looks.', tags: ['necklace','gold','chain','layered','statement'] },
  { file: '63',  folder: 'tops',        name: 'Cream Flannel Shirt',            subcategory: 'Shirts',           colour: 'Cream',    colour_hex: '#F0ECE0', description: 'A relaxed brushed-flannel button-down in soft cream — the perfect oversized layer.', tags: ['shirt','flannel','cream','oversized','soft'] },
  { file: '64',  folder: 'tops',        name: 'White Linen Shirt',              subcategory: 'Shirts',           colour: 'White',    colour_hex: '#FAFAFA', description: 'A crisp linen button-down in pure white — essential for warm-weather dressing.', tags: ['shirt','linen','white','button-down','summer'] },
  { file: '65',  folder: 'bottoms',     name: 'Blue Denim Shorts',              subcategory: 'Shorts',           colour: 'Blue',     colour_hex: '#4A6FA5', description: 'High-waisted denim shorts in mid-wash blue that pair with everything casual.', tags: ['shorts','denim','blue','high-waist','summer'] },
  { file: '66',  folder: 'bottoms',     name: 'Blue High-Rise Jeans',           subcategory: 'Jeans',            colour: 'Blue',     colour_hex: '#3A5F8A', description: 'High-rise straight jeans in mid-wash denim — the everyday silhouette that goes with everything.', tags: ['jeans','blue','high-rise','denim','straight'] },
  { file: '67',  folder: 'dresses',     name: 'Black Satin Slip Dress',         subcategory: 'Mini Dresses',     colour: 'Black',    colour_hex: '#1A1A1A', description: 'A figure-skimming satin slip dress with a V-neck that works day-to-night.', tags: ['dress','slip','satin','black','mini'] },
  { file: '68',  folder: 'bags',        name: 'Black Structured Shoulder Bag',  subcategory: 'Shoulder Bags',    colour: 'Black',    colour_hex: '#1A1A1A', description: 'A structured leather shoulder bag with a front clasp — refined and versatile.', tags: ['bag','shoulder','black','leather','structured'] },
  { file: '69',  folder: 'bags',        name: 'Black Canvas Tote',              subcategory: 'Tote Bags',        colour: 'Black',    colour_hex: '#1A1A1A', description: 'A structured canvas work tote with a detachable strap — professional and practical.', tags: ['bag','tote','canvas','black','work'] },
  { file: '70',  folder: 'tops',        name: 'White Classic T-Shirt',          subcategory: 'T-Shirts',         colour: 'White',    colour_hex: '#FAFAFA', description: 'A perfectly weighted crewneck tee in white — the foundation of any wardrobe.', tags: ['t-shirt','crew-neck','white','classic','essential'] },
  { file: '71',  folder: 'shoes',       name: 'White Platform Sneakers',        subcategory: 'Sneakers',         colour: 'White',    colour_hex: '#F5F5F5', description: 'Lace-up platform sneakers in clean white leather — an elevated everyday silhouette.', tags: ['sneakers','platform','white','leather','everyday'] },
  { file: '72',  folder: 'bottoms',     name: 'Cream Pleated Midi Skirt',       subcategory: 'Skirts',           colour: 'Cream',    colour_hex: '#F5F0E1', description: 'A flowy pleated midi skirt in cream that elevates casual and formal looks alike.', tags: ['skirt','pleated','cream','midi','feminine'] },
  { file: '73',  folder: 'accessories', name: 'Black Wayfarer Sunglasses',      subcategory: 'Sunglasses',       colour: 'Black',    colour_hex: '#1A1A1A', description: 'Classic wayfarer-style sunglasses in black — a timeless essential for any face.', tags: ['sunglasses','wayfarer','black','classic','accessory'] },
  { file: '74',  folder: 'outerwear',   name: 'Black Bomber Jacket',            subcategory: 'Bomber Jackets',   colour: 'Black',    colour_hex: '#1A1A1A', description: 'A classic bomber jacket with ribbed trim in jet black — a modern wardrobe staple.', tags: ['bomber','jacket','black','ribbed','casual'] },
  { file: '75',  folder: 'bags',        name: 'Black Mini Backpack',            subcategory: 'Backpacks',        colour: 'Black',    colour_hex: '#1A1A1A', description: 'A compact nylon mini backpack that carries the essentials with clean minimal style.', tags: ['backpack','nylon','black','mini','everyday'] },
  { file: '76',  folder: 'dresses',     name: 'Beige Belted Shift Dress',       subcategory: 'Shift Dresses',    colour: 'Beige',    colour_hex: '#D4C5A9', description: 'A cap-sleeve shift dress in beige with a tie waist for effortless shape.', tags: ['dress','shift','beige','belted','cap-sleeve'] },
  { file: '77',  folder: 'outerwear',   name: 'Black Blazer',                   subcategory: 'Blazers',          colour: 'Black',    colour_hex: '#1A1A1A', description: 'A sharp two-button blazer in black that anchors both formal and casual outfits.', tags: ['blazer','black','tailored','formal','classic'] },
  { file: '78',  folder: 'hats',        name: 'Black Baseball Cap',             subcategory: 'Caps',             colour: 'Black',    colour_hex: '#1A1A1A', description: 'A clean unstructured baseball cap in black — a casual everyday essential.', tags: ['cap','baseball','black','unstructured','casual'] },
  { file: '79',  folder: 'tops',        name: 'White Crop Tank Top',            subcategory: 'Tank Tops',        colour: 'White',    colour_hex: '#FAFAFA', description: 'A cropped tank top in clean white cotton — the essential layering piece.', tags: ['tank','crop','white','cotton','layering'] },
  { file: '80',  folder: 'tops',        name: 'White Oversized T-Shirt',        subcategory: 'T-Shirts',         colour: 'White',    colour_hex: '#FAFAFA', description: 'A boxy oversized tee in heavyweight white cotton — wear alone or layered.', tags: ['t-shirt','oversized','white','boxy','casual'] },
  { file: '81',  folder: 'shoes',       name: 'Black Leather Slides',           subcategory: 'Sandals',          colour: 'Black',    colour_hex: '#1A1A1A', description: 'Minimal leather pool slides in black — understated luxury for everyday wear.', tags: ['slides','leather','black','minimal','sandals'] },
  { file: '82',  folder: 'shoes',       name: 'Black Ballet Flats',             subcategory: 'Flats',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'Square-toe ballet flats in soft leather with an elastic trim for a refined finish.', tags: ['flats','ballet','black','leather','classic'] },
  { file: '83',  folder: 'bottoms',     name: 'Blue Denim Mini Skirt',          subcategory: 'Skirts',           colour: 'Blue',     colour_hex: '#4A6FA5', description: 'An A-line denim mini skirt in mid-wash blue — a timeless wardrobe classic.', tags: ['skirt','denim','blue','mini','a-line'] },
  { file: '84',  folder: 'accessories', name: 'Gold Disc Stud Earrings',        subcategory: 'Jewellery',        colour: 'Gold',     colour_hex: '#C9A227', description: 'Geometric gold disc studs with a loop detail — elevated everyday jewellery.', tags: ['earrings','gold','studs','disc','everyday'] },
  { file: '85',  folder: 'bags',        name: 'Black Envelope Clutch',          subcategory: 'Clutch Bags',      colour: 'Black',    colour_hex: '#1A1A1A', description: 'A flat envelope clutch in smooth black leather — the perfect evening bag.', tags: ['clutch','envelope','black','leather','evening'] },
  { file: '86',  folder: 'shoes',       name: 'Black Leather Boots',            subcategory: 'Boots',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'A polished mid-calf boot with cap-toe and back zip — a refined everyday boot.', tags: ['boots','black','leather','cap-toe','refined'] },
  { file: '87',  folder: 'outerwear',   name: 'Black Puffer Vest',              subcategory: 'Gilets',           colour: 'Black',    colour_hex: '#1A1A1A', description: 'A lightweight puffer gilet in black that adds warmth without bulk.', tags: ['vest','puffer','black','gilet','layer'] },
  { file: '88',  folder: 'tops',        name: 'White Ribbed Tank Top',          subcategory: 'Tank Tops',        colour: 'White',    colour_hex: '#FAFAFA', description: 'A fitted ribbed tank in bright white — the versatile inner layer for any season.', tags: ['tank','ribbed','white','fitted','cotton'] },
  { file: '89',  folder: 'bottoms',     name: 'Stone Chino Shorts',             subcategory: 'Shorts',           colour: 'Stone',    colour_hex: '#D4C5A9', description: 'Clean-cut chino shorts in stone cotton — the smart casual summer staple.', tags: ['shorts','chino','stone','cotton','smart-casual'] },
  { file: '90',  folder: 'bags',        name: 'Natural Canvas Tote',            subcategory: 'Tote Bags',        colour: 'Natural',  colour_hex: '#E8DCC8', description: 'A raw canvas tote in natural cotton — simple, sustainable, and endlessly useful.', tags: ['tote','canvas','natural','cotton','everyday'] },
  { file: '91',  folder: 'shoes',       name: 'Black Stiletto Pumps',           subcategory: 'Heels',            colour: 'Black',    colour_hex: '#1A1A1A', description: 'Classic pointed-toe pumps with a stiletto heel — an evening essential.', tags: ['heels','pumps','black','pointed-toe','stiletto'] },
  { file: '92',  folder: 'bags',        name: 'Tan Leather Bucket Bag',         subcategory: 'Shoulder Bags',    colour: 'Tan',      colour_hex: '#C9935A', description: 'A drawstring bucket bag in tan leather with gold hardware — relaxed and luxe.', tags: ['bag','bucket','tan','leather','drawstring'] },
  { file: '93',  folder: 'tops',        name: 'White Polo Shirt',               subcategory: 'Polo Shirts',      colour: 'White',    colour_hex: '#FAFAFA', description: 'A classic piqué polo shirt in white cotton — smart casual perfected.', tags: ['polo','white','cotton','pique','smart-casual'] },
  { file: '94',  folder: 'bottoms',     name: 'Black Athletic Shorts',          subcategory: 'Shorts',           colour: 'Black',    colour_hex: '#1A1A1A', description: 'Lightweight elastic-waist shorts in black that transition from gym to casual.', tags: ['shorts','athletic','black','elastic','sport'] },
  { file: '95',  folder: 'tops',        name: 'White Pullover Hoodie',          subcategory: 'Hoodies',          colour: 'White',    colour_hex: '#FAFAFA', description: 'A heavyweight pullover hoodie in clean white — casual comfort at its best.', tags: ['hoodie','pullover','white','heavyweight','casual'] },
  { file: '96',  folder: 'accessories', name: 'Gold Coin Pendant Necklace',     subcategory: 'Jewellery',        colour: 'Gold',     colour_hex: '#C9A227', description: 'A delicate gold disc pendant on a fine chain — subtle jewellery that layers beautifully.', tags: ['necklace','gold','pendant','coin','delicate'] },
  { file: '97',  folder: 'bottoms',     name: 'Charcoal Tailored Trousers',     subcategory: 'Trousers',         colour: 'Charcoal', colour_hex: '#4A4A4A', description: 'Slim-cut tailored trousers in charcoal grey — the office-to-evening essential.', tags: ['trousers','charcoal','tailored','slim','formal'] },
  { file: '98',  folder: 'outerwear',   name: 'Black Peak Lapel Blazer',        subcategory: 'Blazers',          colour: 'Black',    colour_hex: '#1A1A1A', description: 'A sharp peak-lapel blazer in black — elevated tailoring for work and events.', tags: ['blazer','black','peak-lapel','formal','tailored'] },
  { file: '99',  folder: 'bottoms',     name: 'Blue Skinny Jeans',              subcategory: 'Jeans',            colour: 'Blue',     colour_hex: '#3A5F8A', description: 'High-rise skinny jeans in mid-wash denim — the slim silhouette that goes with everything.', tags: ['jeans','skinny','blue','high-rise','denim'] },
  { file: '100', folder: 'dresses',     name: 'Natural Fit-and-Flare Dress',    subcategory: 'Midi Dresses',     colour: 'Natural',  colour_hex: '#D4C5A9', description: 'A sleeveless fit-and-flare dress in natural linen — effortlessly polished for warm days.', tags: ['dress','linen','natural','sleeveless','flared'] },
  { file: '101', folder: 'tops',        name: 'White Oversized Oxford Shirt',   subcategory: 'Shirts',           colour: 'White',    colour_hex: '#FAFAFA', description: 'A relaxed oversized Oxford shirt in crisp white — versatile worn tucked or open over a tee.', tags: ['shirt','oxford','white','oversized','relaxed'] },
  { file: '102', folder: 'bottoms',     name: 'Blue Denim Mini Skirt',          subcategory: 'Skirts',           colour: 'Blue',     colour_hex: '#4A6FA5', description: 'An A-line denim mini skirt in mid-wash blue — a timeless wardrobe classic.', tags: ['skirt','denim','blue','mini','a-line'] },
  { file: '103', folder: 'accessories', name: 'Gold Curb Chain Necklace',       subcategory: 'Jewellery',        colour: 'Gold',     colour_hex: '#C9A227', description: 'A medium-weight curb chain in gold that works solo or stacked with finer pieces.', tags: ['necklace','gold','chain','curb','classic'] },
  { file: '104', folder: 'outerwear',   name: 'Camel Wool Coat',                subcategory: 'Coats',            colour: 'Camel',    colour_hex: '#C49A4A', description: 'A three-button camel wool coat with flap pockets — warmly elegant and endlessly wearable.', tags: ['coat','camel','wool','classic','elegant'] },
  { file: '105', folder: 'dresses',     name: 'White Linen Shirt Dress',        subcategory: 'Shirt Dresses',    colour: 'White',    colour_hex: '#FAFAFA', description: 'A crisp linen shirt dress in white — a summer wardrobe staple that dresses up or down.', tags: ['dress','shirt-dress','linen','white','summer'] },
  { file: '106', folder: 'tops',        name: 'White Long Sleeve T-Shirt',      subcategory: 'T-Shirts',         colour: 'White',    colour_hex: '#FAFAFA', description: 'A relaxed long-sleeve tee in clean white cotton — the seasonal layering essential.', tags: ['t-shirt','long-sleeve','white','cotton','layer'] },
  { file: '107', folder: 'bottoms',     name: 'Grey Jogger Sweatpants',         subcategory: 'Trousers',         colour: 'Grey',     colour_hex: '#A0A0A0', description: 'Tapered drawstring joggers in soft grey fleece — elevated loungewear for every day.', tags: ['joggers','grey','sweatpants','tapered','casual'] },
  { file: '108', folder: 'bags',        name: 'Black Belt Bag',                 subcategory: 'Belt Bags',        colour: 'Black',    colour_hex: '#1A1A1A', description: 'A nylon belt bag in black — worn across the body or around the waist for hands-free style.', tags: ['bag','belt-bag','black','nylon','crossbody'] },
  { file: '109', folder: 'jumpers',     name: 'White Quarter Zip Sweatshirt',   subcategory: 'Sweatshirts',      colour: 'White',    colour_hex: '#FAFAFA', description: 'A clean quarter-zip sweatshirt in white — the everyday layer that transitions from gym to casual.', tags: ['sweatshirt','quarter-zip','white','layering','casual'] },
  { file: '110', folder: 'outerwear',   name: 'Black Varsity Jacket',           subcategory: 'Bomber Jackets',   colour: 'Black',    colour_hex: '#1A1A1A', description: 'A varsity jacket with leather sleeves and a wool body in all-black — modern and bold.', tags: ['varsity','jacket','black','leather-sleeves','athletic'] },
  { file: '111', folder: 'bags',        name: 'Black Nylon Laptop Bag',         subcategory: 'Briefcases',       colour: 'Black',    colour_hex: '#1A1A1A', description: 'A slim nylon laptop bag with webbing handles — compact, professional, and everyday ready.', tags: ['bag','laptop','nylon','black','work'] },
  { file: '112', folder: 'hats',        name: 'Grey Knit Beanie',               subcategory: 'Beanies',          colour: 'Grey',     colour_hex: '#A0A0A0', description: 'A ribbed cuff beanie in grey knit — the cold-weather accessory that goes with everything.', tags: ['beanie','grey','knit','ribbed','winter'] },
  { file: '113', folder: 'tops',        name: 'White Classic T-Shirt',          subcategory: 'T-Shirts',         colour: 'White',    colour_hex: '#FAFAFA', description: 'A perfectly weighted crewneck tee in white — the foundation of any wardrobe.', tags: ['t-shirt','crew-neck','white','classic','essential'] },
  { file: '114', folder: 'tops',        name: 'White Zip-Up Hoodie',            subcategory: 'Hoodies',          colour: 'White',    colour_hex: '#FAFAFA', description: 'A zip-through hoodie in soft white fleece — casual layering with a clean look.', tags: ['hoodie','zip-up','white','fleece','casual'] },
  { file: '115', folder: 'accessories', name: 'Cream Woven Belt',               subcategory: 'Belts',            colour: 'Cream',    colour_hex: '#EDE3CC', description: 'A woven cotton belt in natural cream with a silver buckle — relaxed summer styling.', tags: ['belt','woven','cream','cotton','casual'] },
  { file: '116', folder: 'bottoms',     name: 'Blue Wide-Leg Jeans',            subcategory: 'Jeans',            colour: 'Blue',     colour_hex: '#4A6FA5', description: 'Cropped wide-leg barrel jeans in a worn blue wash — the statement denim silhouette.', tags: ['jeans','wide-leg','barrel','blue','cropped'] },
  { file: '117', folder: 'dresses',     name: 'White Linen Sundress',           subcategory: 'Mini Dresses',     colour: 'White',    colour_hex: '#FAFAFA', description: 'A spaghetti-strap linen sundress in white — effortless warm-weather dressing.', tags: ['dress','sundress','linen','white','summer'] },
  { file: '118', folder: 'shoes',       name: 'Charcoal Running Shoes',         subcategory: 'Trainers',         colour: 'Charcoal', colour_hex: '#4A4A4A', description: 'Lightweight running shoes in charcoal grey — performance footwear with a clean aesthetic.', tags: ['shoes','trainers','charcoal','running','sport'] },
  { file: '119', folder: 'bottoms',     name: 'Black Pleated Mini Skirt',       subcategory: 'Skirts',           colour: 'Black',    colour_hex: '#1A1A1A', description: 'A structured mini skirt with pleated detail in black — versatile smart-casual dressing.', tags: ['skirt','mini','black','structured','pleated'] },
];

// ── Cleanup: remove all previously-seeded (incorrectly labelled) rows + files ──

console.log('\nClearing existing essentials_catalogue rows...');
const { error: deleteErr } = await supabase
  .from('essentials_catalogue')
  .delete()
  .not('id', 'is', null);
if (deleteErr) {
  console.error('  ✗  Failed to clear table:', deleteErr.message);
  process.exit(1);
}
console.log('  ✓  Table cleared.');

console.log('Clearing existing storage objects...');
const FOLDERS = ['tops', 'bottoms', 'dresses', 'jumpers', 'outerwear', 'shoes', 'accessories', 'hats', 'bags'];
for (const folder of FOLDERS) {
  const { data: files, error: listErr } = await supabase.storage.from(BUCKET).list(folder);
  if (listErr) { console.error(`  ✗  Failed to list ${folder}:`, listErr.message); continue; }
  if (!files?.length) continue;
  const paths = files.map((f) => `${folder}/${f.name}`);
  const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths);
  if (removeErr) console.error(`  ✗  Failed to remove ${folder} files:`, removeErr.message);
}
console.log('  ✓  Storage cleared.\n');

// ── Main ─────────────────────────────────────────────────────────────────────

let ok = 0, skipped = 0, failed = 0;
console.log(`Seeding ${ITEMS.length} essentials...\n`);

for (const item of ITEMS) {
  const filePath = `${IMG_DIR}/Vestis Essential ${item.file}.jpg`;

  if (!existsSync(filePath)) {
    console.warn(`  ⚠  Missing file: ${filePath}`);
    skipped++;
    continue;
  }

  const fileBytes    = readFileSync(filePath);
  const slug         = slugify(item.name);
  const storagePath  = `${item.folder}/${slug}.jpg`;
  const categoryLabel = toLabel(item.folder);

  process.stdout.write(`  [${String(item.file).padStart(3)}] ${item.name.padEnd(36)} → ${storagePath} ... `);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBytes, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });

  if (uploadErr) {
    console.log(`✗ upload: ${uploadErr.message}`);
    failed++;
    continue;
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { error: insertErr } = await supabase
    .from('essentials_catalogue')
    .upsert({
      name:          item.name,
      category:      categoryLabel,
      subcategory:   item.subcategory,
      colour:        item.colour,
      colour_hex:    item.colour_hex,
      brand:         null,
      description:   item.description,
      image_url:     publicUrl,
      image_url_full: publicUrl,
      tags:          item.tags,
      sort_order:    0,
      is_active:     true,
    }, { onConflict: 'name,category' });

  if (insertErr) {
    console.log(`✗ db: ${insertErr.message}`);
    failed++;
    continue;
  }

  console.log('✓');
  ok++;
}

console.log(`\n─────────────────────────────────────`);
console.log(`✓ ${ok} uploaded   ⚠ ${skipped} skipped   ✗ ${failed} failed`);
console.log(`─────────────────────────────────────\n`);
