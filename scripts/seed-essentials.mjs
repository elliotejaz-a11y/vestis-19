#!/usr/bin/env node
/**
 * seed-essentials.mjs
 * Pre-analysed bulk upload — no ANTHROPIC_API_KEY needed.
 * Uploads all 118 essential images to Supabase Storage and inserts catalogue rows.
 *
 * Usage:
 *   node scripts/seed-essentials.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfwneyufnefjgkauilcq.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd25leXVmbmVmamdrYXVpbGNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM0ODQzOSwiZXhwIjoyMDk2OTI0NDM5fQ.aky-_8gwXev4p0q7rqwZQOxuKPRFjYUN8d3mqtP6SXM';
const BUCKET       = 'essentials';
const IMG_DIR      = '/Users/ejazadam/Downloads/Vestis Essentials NOBG';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function toLabel(folder) {
  const map = { tops: 'Tops', bottoms: 'Bottoms', dresses: 'Dresses', jumpers: 'Knitwear', outerwear: 'Outerwear', shoes: 'Shoes', accessories: 'Accessories', hats: 'Accessories', bags: 'Bags' };
  return map[folder];
}

// Pre-analysed catalogue data for all 118 items (file 19 skipped — baby onesie).
// Duplicate file numbers are handled by the upsert constraint on (name, category).
const ITEMS = [
  { file: '1',   folder: 'dresses',     name: 'Black Maxi Dress',               subcategory: 'Maxi Dresses',     colour: 'Black',     colour_hex: '#1A1A1A', description: 'A sleeveless belted maxi dress that transitions effortlessly from day to evening.',                   tags: ['sleeveless','belted','maxi','black','versatile'] },
  { file: '2',   folder: 'dresses',     name: 'Beige Wrap Dress',               subcategory: 'Wrap Dresses',     colour: 'Beige',     colour_hex: '#C4A882', description: 'A flattering wrap silhouette in warm beige that dresses up or down with ease.',                       tags: ['wrap','v-neck','beige','dress'] },
  { file: '3',   folder: 'outerwear',   name: 'Black Leather Jacket',           subcategory: 'Leather Jackets',  colour: 'Black',     colour_hex: '#1A1A1A', description: 'A clean zip-up leather jacket with a spread collar that defines any wardrobe.',                        tags: ['leather','zip','jacket','black','classic'] },
  { file: '4',   folder: 'accessories', name: 'Black Leather Belt',             subcategory: 'Belts',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'A slim matte-buckle leather belt that works with trousers and jeans alike.',                            tags: ['belt','leather','black','slim'] },
  { file: '5',   folder: 'accessories', name: 'Grey Cashmere Scarf',            subcategory: 'Scarves',          colour: 'Grey',      colour_hex: '#A0A0A0', description: 'A luxuriously soft cashmere scarf in heather grey — the ultimate cold-weather essential.',              tags: ['scarf','cashmere','grey','winter'] },
  { file: '6',   folder: 'accessories', name: 'Cream Silk Scarf',               subcategory: 'Scarves',          colour: 'Cream',     colour_hex: '#F5F0E1', description: 'A whisper-soft silk square that elevates any look worn at the neck or hair.',                            tags: ['scarf','silk','cream','neckerchief'] },
  { file: '7',   folder: 'outerwear',   name: 'Grey Fleece Zip Jacket',         subcategory: 'Fleece Jackets',   colour: 'Grey',      colour_hex: '#9B9B9B', description: 'A soft-touch fleece jacket with a stand collar — the perfect mid-layer essential.',                     tags: ['fleece','zip','grey','mid-layer'] },
  { file: '8',   folder: 'tops',        name: 'Tan Military Overshirt',         subcategory: 'Shirts',           colour: 'Tan',       colour_hex: '#9B8B6E', description: 'A structured military-inspired overshirt with chest pockets, ideal worn open as a jacket.',            tags: ['overshirt','military','tan','button-up'] },
  { file: '9',   folder: 'bags',        name: 'Black Canvas Weekender',         subcategory: 'Duffle Bags',      colour: 'Black',     colour_hex: '#1A1A1A', description: 'A spacious canvas weekender with leather trim — the go-everywhere travel essential.',                  tags: ['bag','weekender','canvas','travel'] },
  { file: '10',  folder: 'shoes',       name: 'Black Knee High Boots',          subcategory: 'Boots',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'Sleek knee-high leather boots with a low heel that anchor any autumn outfit.',                          tags: ['boots','leather','black','knee-high'] },
  { file: '11',  folder: 'shoes',       name: 'White Platform Slip-Ons',        subcategory: 'Sneakers',         colour: 'White',     colour_hex: '#F5F5F5', description: 'A minimalist platform slip-on in clean white — effortless and modern.',                                tags: ['shoes','platform','white','slip-on'] },
  { file: '12',  folder: 'bottoms',     name: 'Grey Track Pants',               subcategory: 'Trousers',         colour: 'Grey',      colour_hex: '#9B9B9B', description: 'Sleek grey track pants in a straight cut that move between sport and casual wear.',                    tags: ['trousers','grey','track','athleisure'] },
  { file: '13',  folder: 'bottoms',     name: 'Blue Relaxed Tapered Jeans',     subcategory: 'Jeans',            colour: 'Blue',      colour_hex: '#4A6FA5', description: 'A relaxed tapered fit in mid-wash denim with a naturally worn-in feel.',                               tags: ['jeans','blue','relaxed','tapered','denim'] },
  { file: '14',  folder: 'bottoms',     name: 'Grey Track Pants',               subcategory: 'Trousers',         colour: 'Grey',      colour_hex: '#9B9B9B', description: 'Sleek grey track pants in a straight cut that move between sport and casual wear.',                    tags: ['trousers','grey','track','athleisure'] },
  { file: '15',  folder: 'shoes',       name: 'Black Strappy Heel Sandals',     subcategory: 'Heels',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'An ankle-strap stiletto sandal that transforms any dress into an evening look.',                        tags: ['sandals','heels','black','strappy','evening'] },
  { file: '16',  folder: 'outerwear',   name: 'Grey Wool Overcoat',             subcategory: 'Coats',            colour: 'Grey',      colour_hex: '#7A7A7A', description: 'A mid-length tailored overcoat in grey wool — the cornerstone of a winter wardrobe.',                  tags: ['coat','wool','grey','overcoat','tailored'] },
  { file: '17',  folder: 'bags',        name: 'Black Mini Backpack',            subcategory: 'Backpacks',        colour: 'Black',     colour_hex: '#1A1A1A', description: 'A compact nylon backpack that carries the essentials with clean minimal style.',                        tags: ['backpack','nylon','black','mini'] },
  { file: '18',  folder: 'hats',        name: 'Cream Wide Brim Hat',            subcategory: 'Felt Hats',        colour: 'Cream',     colour_hex: '#EDE3CC', description: 'A wide-brimmed felt hat in cream that adds instant polish to any summer look.',                         tags: ['hat','wide-brim','cream','felt'] },
  // file 19 skipped — baby onesie
  { file: '20',  folder: 'hats',        name: 'Beige Bucket Hat',               subcategory: 'Bucket Hats',      colour: 'Beige',     colour_hex: '#D4C5A9', description: 'A washed cotton bucket hat in warm beige — a casual everyday essential.',                              tags: ['hat','bucket','beige','cotton'] },
  { file: '21',  folder: 'bottoms',     name: 'Olive Cargo Shorts',             subcategory: 'Shorts',           colour: 'Olive',     colour_hex: '#6B7645', description: 'Utility-inspired cargo shorts in olive cotton with practical side pockets.',                            tags: ['shorts','cargo','olive','utility'] },
  { file: '22',  folder: 'dresses',     name: 'Black Satin Slip Dress',         subcategory: 'Mini Dresses',     colour: 'Black',     colour_hex: '#1A1A1A', description: 'A figure-skimming satin slip dress with a V-neck that works day-to-night.',                            tags: ['dress','slip','satin','black','mini'] },
  { file: '23',  folder: 'bottoms',     name: 'Blue Straight Leg Jeans',        subcategory: 'Jeans',            colour: 'Blue',      colour_hex: '#4A6FA5', description: 'Classic straight-leg jeans in a clean mid-wash — a wardrobe cornerstone.',                              tags: ['jeans','blue','straight','denim','classic'] },
  { file: '24',  folder: 'bottoms',     name: 'Blue High Waist Denim Shorts',   subcategory: 'Shorts',           colour: 'Blue',      colour_hex: '#4A6FA5', description: 'High-waisted denim shorts in a mid-wash that pair with everything casual.',                              tags: ['shorts','denim','blue','high-waist'] },
  { file: '25',  folder: 'accessories', name: 'Gold Oval Link Necklace',        subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'A long layered oval-link chain in gold that adds statement to minimal looks.',                          tags: ['necklace','gold','chain','layered','statement'] },
  { file: '26',  folder: 'tops',        name: 'White Flannel Shirt',            subcategory: 'Shirts',           colour: 'Off-White', colour_hex: '#F0ECE0', description: 'A relaxed flannel button-down in off-white — the perfect oversized shirt for layering.',               tags: ['shirt','flannel','white','oversized'] },
  { file: '27',  folder: 'outerwear',   name: 'Beige Trench Coat',              subcategory: 'Coats',            colour: 'Beige',     colour_hex: '#C4AD8F', description: 'A classic double-breasted trench coat that never goes out of style.',                                  tags: ['coat','trench','beige','classic','belted'] },
  { file: '28',  folder: 'bags',        name: 'Black Structured Shoulder Bag',  subcategory: 'Shoulder Bags',    colour: 'Black',     colour_hex: '#1A1A1A', description: 'A structured leather shoulder bag with a front clasp — refined and versatile.',                        tags: ['bag','shoulder','black','leather','structured'] },
  { file: '29',  folder: 'tops',        name: 'White Linen Shirt',              subcategory: 'Shirts',           colour: 'White',     colour_hex: '#FAFAFA', description: 'A crisp linen button-down in pure white — essential for warm-weather dressing.',                        tags: ['shirt','linen','white','button-down','summer'] },
  { file: '30',  folder: 'shoes',       name: 'White Leather Sneakers',         subcategory: 'Sneakers',         colour: 'White',     colour_hex: '#F5F5F5', description: 'Low-profile leather platform sneakers in clean white — the everyday footwear essential.',              tags: ['sneakers','white','leather','platform'] },
  { file: '31',  folder: 'tops',        name: 'White V-Neck T-Shirt',           subcategory: 'T-Shirts',         colour: 'White',     colour_hex: '#FAFAFA', description: 'A fitted V-neck tee in crisp white cotton — the building block of any outfit.',                         tags: ['t-shirt','v-neck','white','cotton','fitted'] },
  { file: '32',  folder: 'bags',        name: 'Black Canvas Work Bag',          subcategory: 'Tote Bags',        colour: 'Black',     colour_hex: '#1A1A1A', description: 'A structured canvas work tote with a detachable strap — professional and practical.',                  tags: ['bag','tote','canvas','black','work'] },
  { file: '33',  folder: 'outerwear',   name: 'Black Two Button Blazer',        subcategory: 'Blazers',          colour: 'Black',     colour_hex: '#1A1A1A', description: 'A sharp two-button blazer in black that anchors both formal and casual outfits.',                       tags: ['blazer','black','tailored','formal'] },
  { file: '34',  folder: 'hats',        name: 'Black Baseball Cap',             subcategory: 'Caps',             colour: 'Black',     colour_hex: '#1A1A1A', description: 'A clean unstructured baseball cap in black — a casual everyday essential.',                             tags: ['cap','baseball','black','unstructured'] },
  { file: '35',  folder: 'outerwear',   name: 'Black Bomber Jacket',            subcategory: 'Bomber Jackets',   colour: 'Black',     colour_hex: '#1A1A1A', description: 'A classic bomber jacket with ribbed trim in jet black — a modern wardrobe staple.',                    tags: ['bomber','jacket','black','ribbed'] },
  { file: '36',  folder: 'tops',        name: 'White Oversized T-Shirt',        subcategory: 'T-Shirts',         colour: 'White',     colour_hex: '#FAFAFA', description: 'A boxy oversized tee in heavyweight white cotton — wear alone or layered.',                             tags: ['t-shirt','oversized','white','boxy'] },
  { file: '37',  folder: 'bags',        name: 'Black Nylon Backpack',           subcategory: 'Backpacks',        colour: 'Black',     colour_hex: '#1A1A1A', description: 'A sleek nylon backpack with front zipper — lightweight and versatile.',                                 tags: ['backpack','nylon','black','compact'] },
  { file: '38',  folder: 'shoes',       name: 'Black Ballet Flats',             subcategory: 'Flats',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'Rounded-toe ballet flats in soft leather with an elastic trim for a refined finish.',                  tags: ['flats','ballet','black','leather','classic'] },
  { file: '39',  folder: 'accessories', name: 'Black Wayfarer Sunglasses',      subcategory: 'Sunglasses',       colour: 'Black',     colour_hex: '#1A1A1A', description: 'Classic wayfarer-style sunglasses in black — a timeless essential for any face.',                      tags: ['sunglasses','wayfarer','black','classic'] },
  { file: '40',  folder: 'dresses',     name: 'Beige Linen Belted Dress',       subcategory: 'Midi Dresses',     colour: 'Beige',     colour_hex: '#C4AD8F', description: 'A relaxed midi dress in natural linen with a self-tie belt for effortless shape.',                     tags: ['dress','linen','beige','belted','midi'] },
  { file: '41',  folder: 'shoes',       name: 'Black Leather Slides',           subcategory: 'Sandals',          colour: 'Black',     colour_hex: '#1A1A1A', description: 'Minimal leather pool slides in black — understated luxury for everyday wear.',                          tags: ['slides','leather','black','minimal','sandals'] },
  { file: '42',  folder: 'bottoms',     name: 'Cream Pleated Midi Skirt',       subcategory: 'Skirts',           colour: 'Cream',     colour_hex: '#F5F0E1', description: 'A flowy pleated midi skirt in cream that elevates casual and formal looks alike.',                      tags: ['skirt','pleated','cream','midi','feminine'] },
  { file: '43',  folder: 'tops',        name: 'White Crop Tank Top',            subcategory: 'Tank Tops',        colour: 'White',     colour_hex: '#FAFAFA', description: 'A cropped tank top in clean white cotton — the essential layering piece.',                              tags: ['tank','crop','white','cotton','layering'] },
  { file: '44',  folder: 'accessories', name: 'Gold Disc Stud Earrings',        subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'Geometric gold disc studs with a loop detail — elevated everyday jewellery.',                           tags: ['earrings','gold','studs','disc','everyday'] },
  { file: '45',  folder: 'bottoms',     name: 'Blue Denim Mini Skirt',          subcategory: 'Skirts',           colour: 'Blue',      colour_hex: '#4A6FA5', description: 'An A-line denim mini skirt in mid-wash blue — a timeless wardrobe classic.',                           tags: ['skirt','denim','blue','mini','a-line'] },
  { file: '46',  folder: 'outerwear',   name: 'Black Puffer Vest',              subcategory: 'Gilets',           colour: 'Black',     colour_hex: '#1A1A1A', description: 'A lightweight puffer gilet in black that adds warmth without bulk.',                                   tags: ['vest','puffer','black','gilet','layer'] },
  { file: '47',  folder: 'bags',        name: 'Natural Canvas Tote',            subcategory: 'Tote Bags',        colour: 'Natural',   colour_hex: '#E8DCC8', description: 'A raw canvas tote in natural cotton — simple, sustainable, and endlessly useful.',                     tags: ['tote','canvas','natural','cotton','everyday'] },
  { file: '48',  folder: 'bottoms',     name: 'Black Athletic Shorts',          subcategory: 'Shorts',           colour: 'Black',     colour_hex: '#1A1A1A', description: 'Lightweight elastic-waist shorts in black that transition from gym to casual.',                         tags: ['shorts','athletic','black','elastic','sport'] },
  { file: '49',  folder: 'shoes',       name: 'Black Leather Ankle Boots',      subcategory: 'Boots',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'A polished ankle boot with cap-toe and back zip — a refined everyday boot.',                           tags: ['boots','ankle','black','leather','cap-toe'] },
  { file: '50',  folder: 'bags',        name: 'Black Envelope Clutch',          subcategory: 'Clutch Bags',      colour: 'Black',     colour_hex: '#1A1A1A', description: 'A flat envelope clutch in smooth black leather — the perfect evening bag.',                            tags: ['clutch','envelope','black','leather','evening'] },
  { file: '51',  folder: 'shoes',       name: 'Black Stiletto Court Shoes',     subcategory: 'Heels',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'Classic pointed-toe court shoes with a stiletto heel — an evening essential.',                         tags: ['heels','court','black','pointed-toe','stiletto'] },
  { file: '52',  folder: 'bottoms',     name: 'Stone Chino Shorts',             subcategory: 'Shorts',           colour: 'Stone',     colour_hex: '#D4C5A9', description: 'Clean-cut chino shorts in stone cotton — the smart casual summer staple.',                             tags: ['shorts','chino','stone','cotton','smart-casual'] },
  { file: '53',  folder: 'bags',        name: 'Tan Leather Bucket Bag',         subcategory: 'Shoulder Bags',    colour: 'Tan',       colour_hex: '#C9935A', description: 'A drawstring bucket bag in tan leather with gold hardware — relaxed and luxe.',                         tags: ['bag','bucket','tan','leather','drawstring'] },
  { file: '54',  folder: 'tops',        name: 'White Polo Shirt',               subcategory: 'Polo Shirts',      colour: 'White',     colour_hex: '#FAFAFA', description: 'A classic piqué polo shirt in white cotton — smart casual perfected.',                                 tags: ['polo','white','cotton','pique','smart-casual'] },
  { file: '55',  folder: 'tops',        name: 'White Ribbed Tank Top',          subcategory: 'Tank Tops',        colour: 'White',     colour_hex: '#FAFAFA', description: 'A fitted ribbed tank in bright white — the versatile inner layer for any season.',                     tags: ['tank','ribbed','white','fitted','cotton'] },
  { file: '56',  folder: 'tops',        name: 'White Pullover Hoodie',          subcategory: 'Hoodies',          colour: 'White',     colour_hex: '#FAFAFA', description: 'A heavyweight pullover hoodie in clean white — casual comfort at its best.',                           tags: ['hoodie','pullover','white','heavyweight','casual'] },
  { file: '57',  folder: 'accessories', name: 'Gold Coin Pendant Necklace',     subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'A delicate gold disc pendant on a fine chain — subtle jewellery that layers beautifully.',             tags: ['necklace','gold','pendant','coin','delicate'] },
  { file: '58',  folder: 'accessories', name: 'Gold Curb Chain Necklace',       subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'A medium-weight curb chain in gold that works solo or stacked with finer pieces.',                    tags: ['necklace','gold','chain','curb','classic'] },
  { file: '59',  folder: 'tops',        name: 'White Oversized Oxford Shirt',   subcategory: 'Shirts',           colour: 'White',     colour_hex: '#FAFAFA', description: 'A relaxed oversized Oxford shirt in crisp white — versatile worn tucked or open over a tee.',         tags: ['shirt','oxford','white','oversized','relaxed'] },
  { file: '60',  folder: 'bottoms',     name: 'Blue Denim Mini Skirt',          subcategory: 'Skirts',           colour: 'Blue',      colour_hex: '#4A6FA5', description: 'An A-line denim mini skirt in mid-wash blue — a timeless wardrobe classic.',                           tags: ['skirt','denim','blue','mini','a-line'] },
  { file: '61',  folder: 'outerwear',   name: 'Black Peak Lapel Blazer',        subcategory: 'Blazers',          colour: 'Black',     colour_hex: '#1A1A1A', description: 'A sharp peak-lapel blazer in black — elevated tailoring for work and events.',                         tags: ['blazer','black','peak-lapel','formal','tailored'] },
  { file: '62',  folder: 'dresses',     name: 'Natural Linen Flared Dress',     subcategory: 'Midi Dresses',     colour: 'Natural',   colour_hex: '#D4C5A9', description: 'A sleeveless fit-and-flare dress in natural linen — effortlessly polished for warm days.',            tags: ['dress','linen','natural','sleeveless','flared'] },
  { file: '63',  folder: 'bottoms',     name: 'Charcoal Tailored Trousers',     subcategory: 'Trousers',         colour: 'Charcoal',  colour_hex: '#4A4A4A', description: 'Slim-cut tailored trousers in charcoal grey — the office-to-evening essential.',                       tags: ['trousers','charcoal','tailored','slim','formal'] },
  { file: '64',  folder: 'bottoms',     name: 'Grey Sweatpant Joggers',         subcategory: 'Trousers',         colour: 'Grey',      colour_hex: '#A0A0A0', description: 'Tapered drawstring joggers in soft grey fleece — elevated loungewear for every day.',                  tags: ['joggers','grey','sweatpants','tapered','casual'] },
  { file: '65',  folder: 'dresses',     name: 'White Linen Shirt Dress',        subcategory: 'Shirt Dresses',    colour: 'White',     colour_hex: '#FAFAFA', description: 'A crisp linen shirt dress in white — a summer wardrobe staple that dresses up or down.',              tags: ['dress','shirt-dress','linen','white','summer'] },
  { file: '66',  folder: 'bottoms',     name: 'Blue High Rise Skinny Jeans',    subcategory: 'Jeans',            colour: 'Blue',      colour_hex: '#3A5F8A', description: 'High-rise skinny jeans in mid-wash denim — the slim silhouette that goes with everything.',            tags: ['jeans','skinny','blue','high-rise','denim'] },
  { file: '67',  folder: 'outerwear',   name: 'Camel Wool Car Coat',            subcategory: 'Coats',            colour: 'Camel',     colour_hex: '#C59B5F', description: 'A single-breasted car coat in camel wool — a heritage silhouette that never dates.',                   tags: ['coat','camel','wool','car-coat','classic'] },
  { file: '68',  folder: 'tops',        name: 'White Long Sleeve T-Shirt',      subcategory: 'T-Shirts',         colour: 'White',     colour_hex: '#FAFAFA', description: 'A relaxed long-sleeve tee in clean white cotton — the seasonal layering essential.',                   tags: ['t-shirt','long-sleeve','white','cotton','layer'] },
  { file: '69',  folder: 'accessories', name: 'Cream Linen Belt',               subcategory: 'Belts',            colour: 'Cream',     colour_hex: '#EDE3CC', description: 'A woven linen belt in natural cream with a silver buckle — relaxed summer styling.',                   tags: ['belt','linen','cream','woven','casual'] },
  { file: '70',  folder: 'tops',        name: 'White Classic T-Shirt',          subcategory: 'T-Shirts',         colour: 'White',     colour_hex: '#FAFAFA', description: 'A perfectly weighted classic crew neck tee in white — the foundation of any wardrobe.',                tags: ['t-shirt','crew-neck','white','classic','essential'] },
  { file: '71',  folder: 'tops',        name: 'White Zip-Up Hoodie',            subcategory: 'Hoodies',          colour: 'White',     colour_hex: '#FAFAFA', description: 'A zip-through hoodie in soft white fleece — casual layering with a clean look.',                        tags: ['hoodie','zip-up','white','fleece','casual'] },
  { file: '72',  folder: 'shoes',       name: 'Charcoal Running Shoes',         subcategory: 'Trainers',         colour: 'Charcoal',  colour_hex: '#4A4A4A', description: 'Lightweight running shoes in charcoal grey — performance footwear with a clean aesthetic.',             tags: ['shoes','trainers','charcoal','running','sport'] },
  { file: '73',  folder: 'hats',        name: 'Grey Knit Beanie',               subcategory: 'Beanies',          colour: 'Grey',      colour_hex: '#A0A0A0', description: 'A ribbed cuff beanie in grey knit — the cold-weather accessory that goes with everything.',             tags: ['beanie','grey','knit','ribbed','winter'] },
  { file: '74',  folder: 'bags',        name: 'Black Nylon Briefcase',          subcategory: 'Briefcases',       colour: 'Black',     colour_hex: '#1A1A1A', description: 'A flat nylon laptop bag with dual handles — clean and professional for work travel.',                  tags: ['bag','briefcase','nylon','black','work','laptop'] },
  { file: '75',  folder: 'bottoms',     name: 'Blue Wide Leg Jeans',            subcategory: 'Jeans',            colour: 'Blue',      colour_hex: '#4A6FA5', description: 'High-rise wide-leg jeans in a washed blue denim — the contemporary relaxed silhouette.',               tags: ['jeans','wide-leg','blue','high-rise','denim'] },
  { file: '76',  folder: 'dresses',     name: 'White Linen Sundress',           subcategory: 'Mini Dresses',     colour: 'White',     colour_hex: '#FAFAFA', description: 'A spaghetti-strap linen sundress in white — effortless warm-weather dressing.',                         tags: ['dress','sundress','linen','white','strappy','summer'] },
  { file: '77',  folder: 'jumpers',     name: 'Cream Quarter Zip Sweatshirt',   subcategory: 'Sweatshirts',      colour: 'Cream',     colour_hex: '#F5F0E1', description: 'A classic quarter-zip sweatshirt in cream — the preppy essential that works season-round.',             tags: ['sweatshirt','quarter-zip','cream','preppy','classic'] },
  { file: '78',  folder: 'outerwear',   name: 'Black Varsity Jacket',           subcategory: 'Bomber Jackets',   colour: 'Black',     colour_hex: '#1A1A1A', description: 'A varsity jacket with leather sleeves and wool body in all-black — modern and bold.',                  tags: ['varsity','jacket','black','leather-sleeves','athletic'] },
  { file: '79',  folder: 'bottoms',     name: 'Black Mini Skirt',               subcategory: 'Skirts',           colour: 'Black',     colour_hex: '#1A1A1A', description: 'A structured mini skirt with pleated detail in black — versatile smart-casual dressing.',               tags: ['skirt','mini','black','structured','pleated'] },
  { file: '80',  folder: 'bags',        name: 'Black Belt Bag',                 subcategory: 'Belt Bags',        colour: 'Black',     colour_hex: '#1A1A1A', description: 'A nylon belt bag in black — worn across the body or around the waist for hands-free style.',           tags: ['bag','belt-bag','black','nylon','crossbody'] },
  { file: '81',  folder: 'shoes',       name: 'Black Leather Slides',           subcategory: 'Sandals',          colour: 'Black',     colour_hex: '#1A1A1A', description: 'Minimal leather pool slides in black — understated luxury for everyday wear.',                          tags: ['slides','leather','black','minimal','sandals'] },
  { file: '82',  folder: 'shoes',       name: 'Black Square Toe Ballet Flats',  subcategory: 'Flats',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'Square-toe ballet flats in soft leather with an elastic trim — refined and comfortable.',               tags: ['flats','ballet','black','square-toe','leather'] },
  { file: '83',  folder: 'bottoms',     name: 'Blue Denim Mini Skirt',          subcategory: 'Skirts',           colour: 'Blue',      colour_hex: '#4A6FA5', description: 'An A-line denim mini skirt in mid-wash blue — a timeless wardrobe classic.',                           tags: ['skirt','denim','blue','mini','a-line'] },
  { file: '84',  folder: 'accessories', name: 'Gold Flower Disc Earrings',      subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'Gold disc studs with a delicate triple-loop petal detail — understated everyday jewellery.',            tags: ['earrings','gold','studs','floral','everyday'] },
  { file: '85',  folder: 'bags',        name: 'Black Leather Clutch Bag',       subcategory: 'Clutch Bags',      colour: 'Black',     colour_hex: '#1A1A1A', description: 'A sleek wide-format leather clutch in black — the compact evening essential.',                          tags: ['clutch','leather','black','evening','compact'] },
  { file: '86',  folder: 'shoes',       name: 'Black Leather Ankle Boots',      subcategory: 'Boots',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'A polished ankle boot with cap-toe and back zip — a refined everyday boot.',                           tags: ['boots','ankle','black','leather','cap-toe'] },
  { file: '87',  folder: 'outerwear',   name: 'Black Puffer Vest',              subcategory: 'Gilets',           colour: 'Black',     colour_hex: '#1A1A1A', description: 'A lightweight puffer gilet in black that adds warmth without bulk.',                                   tags: ['vest','puffer','black','gilet','layer'] },
  { file: '88',  folder: 'tops',        name: 'White Muscle Tank',              subcategory: 'Tank Tops',        colour: 'White',     colour_hex: '#FAFAFA', description: 'A ribbed muscle tank with a crew neck in clean white — a versatile summer layering piece.',             tags: ['tank','muscle','white','ribbed','crew-neck'] },
  { file: '89',  folder: 'bottoms',     name: 'Stone Chino Shorts',             subcategory: 'Shorts',           colour: 'Stone',     colour_hex: '#D4C5A9', description: 'Clean-cut chino shorts in stone cotton — the smart casual summer staple.',                             tags: ['shorts','chino','stone','cotton','smart-casual'] },
  { file: '90',  folder: 'bags',        name: 'Natural Canvas Tote',            subcategory: 'Tote Bags',        colour: 'Natural',   colour_hex: '#E8DCC8', description: 'A raw canvas tote in natural cotton — simple, sustainable, and endlessly useful.',                     tags: ['tote','canvas','natural','cotton','everyday'] },
  { file: '91',  folder: 'shoes',       name: 'Black Stiletto Court Shoes',     subcategory: 'Heels',            colour: 'Black',     colour_hex: '#1A1A1A', description: 'Classic pointed-toe court shoes with a stiletto heel — an evening essential.',                         tags: ['heels','court','black','pointed-toe','stiletto'] },
  { file: '92',  folder: 'bags',        name: 'Tan Leather Bucket Bag',         subcategory: 'Shoulder Bags',    colour: 'Tan',       colour_hex: '#C9935A', description: 'A drawstring bucket bag in tan leather with gold hardware — relaxed and luxe.',                         tags: ['bag','bucket','tan','leather','drawstring'] },
  { file: '93',  folder: 'tops',        name: 'White Polo Shirt',               subcategory: 'Polo Shirts',      colour: 'White',     colour_hex: '#FAFAFA', description: 'A classic piqué polo shirt in white cotton — smart casual perfected.',                                 tags: ['polo','white','cotton','pique','smart-casual'] },
  { file: '94',  folder: 'bottoms',     name: 'Black Elastic Waist Shorts',     subcategory: 'Shorts',           colour: 'Black',     colour_hex: '#1A1A1A', description: 'Lightweight elastic-waist shorts in black — the versatile warm-weather bottom.',                        tags: ['shorts','elastic','black','casual','lightweight'] },
  { file: '95',  folder: 'tops',        name: 'White Pullover Hoodie',          subcategory: 'Hoodies',          colour: 'White',     colour_hex: '#FAFAFA', description: 'A heavyweight pullover hoodie in clean white — casual comfort at its best.',                           tags: ['hoodie','pullover','white','heavyweight','casual'] },
  { file: '96',  folder: 'accessories', name: 'Gold Coin Pendant Necklace',     subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'A delicate gold disc pendant on a fine chain — subtle jewellery that layers beautifully.',             tags: ['necklace','gold','pendant','coin','delicate'] },
  { file: '97',  folder: 'bottoms',     name: 'Charcoal Tailored Trousers',     subcategory: 'Trousers',         colour: 'Charcoal',  colour_hex: '#4A4A4A', description: 'Slim-cut tailored trousers in charcoal grey — the office-to-evening essential.',                       tags: ['trousers','charcoal','tailored','slim','formal'] },
  { file: '98',  folder: 'outerwear',   name: 'Black Peak Lapel Blazer',        subcategory: 'Blazers',          colour: 'Black',     colour_hex: '#1A1A1A', description: 'A sharp peak-lapel blazer in black — elevated tailoring for work and events.',                         tags: ['blazer','black','peak-lapel','formal','tailored'] },
  { file: '99',  folder: 'bottoms',     name: 'Blue High Rise Skinny Jeans',    subcategory: 'Jeans',            colour: 'Blue',      colour_hex: '#3A5F8A', description: 'High-rise skinny jeans in mid-wash denim — the slim silhouette that goes with everything.',            tags: ['jeans','skinny','blue','high-rise','denim'] },
  { file: '100', folder: 'dresses',     name: 'Natural Linen Flared Dress',     subcategory: 'Midi Dresses',     colour: 'Natural',   colour_hex: '#D4C5A9', description: 'A sleeveless fit-and-flare dress in natural linen — effortlessly polished for warm days.',            tags: ['dress','linen','natural','sleeveless','flared'] },
  { file: '101', folder: 'tops',        name: 'White Oversized Oxford Shirt',   subcategory: 'Shirts',           colour: 'White',     colour_hex: '#FAFAFA', description: 'A relaxed oversized Oxford shirt in crisp white — versatile worn tucked or open over a tee.',         tags: ['shirt','oxford','white','oversized','relaxed'] },
  { file: '102', folder: 'bottoms',     name: 'Blue Denim Mini Skirt',          subcategory: 'Skirts',           colour: 'Blue',      colour_hex: '#4A6FA5', description: 'An A-line denim mini skirt in mid-wash blue — a timeless wardrobe classic.',                           tags: ['skirt','denim','blue','mini','a-line'] },
  { file: '103', folder: 'accessories', name: 'Gold Curb Chain Necklace',       subcategory: 'Jewellery',        colour: 'Gold',      colour_hex: '#C9A227', description: 'A medium-weight curb chain in gold that works solo or stacked with finer pieces.',                    tags: ['necklace','gold','chain','curb','classic'] },
  { file: '104', folder: 'outerwear',   name: 'Camel Wool Field Coat',          subcategory: 'Coats',            colour: 'Camel',     colour_hex: '#C49A4A', description: 'A three-button camel wool field coat with flap pockets — warmly elegant and endlessly wearable.',     tags: ['coat','camel','wool','field-coat','classic'] },
  { file: '105', folder: 'dresses',     name: 'White Linen Shirt Dress',        subcategory: 'Shirt Dresses',    colour: 'White',     colour_hex: '#FAFAFA', description: 'A crisp linen shirt dress in white — a summer wardrobe staple that dresses up or down.',              tags: ['dress','shirt-dress','linen','white','summer'] },
  { file: '106', folder: 'tops',        name: 'White Long Sleeve T-Shirt',      subcategory: 'T-Shirts',         colour: 'White',     colour_hex: '#FAFAFA', description: 'A relaxed long-sleeve tee in clean white cotton — the seasonal layering essential.',                   tags: ['t-shirt','long-sleeve','white','cotton','layer'] },
  { file: '107', folder: 'bottoms',     name: 'Grey Sweatpant Joggers',         subcategory: 'Trousers',         colour: 'Grey',      colour_hex: '#A0A0A0', description: 'Tapered drawstring joggers in soft grey fleece — elevated loungewear for every day.',                  tags: ['joggers','grey','sweatpants','tapered','casual'] },
  { file: '108', folder: 'bags',        name: 'Black Belt Bag',                 subcategory: 'Belt Bags',        colour: 'Black',     colour_hex: '#1A1A1A', description: 'A nylon belt bag in black — worn across the body or around the waist for hands-free style.',           tags: ['bag','belt-bag','black','nylon','crossbody'] },
  { file: '109', folder: 'jumpers',     name: 'White Quarter Zip Sweatshirt',   subcategory: 'Sweatshirts',      colour: 'White',     colour_hex: '#FAFAFA', description: 'A clean quarter-zip sweatshirt in white — the everyday layer that transitions from gym to casual.',    tags: ['sweatshirt','quarter-zip','white','layering','casual'] },
  { file: '110', folder: 'outerwear',   name: 'Black Varsity Jacket',           subcategory: 'Bomber Jackets',   colour: 'Black',     colour_hex: '#1A1A1A', description: 'A varsity jacket with leather sleeves and wool body in all-black — modern and bold.',                  tags: ['varsity','jacket','black','leather-sleeves','athletic'] },
  { file: '111', folder: 'bags',        name: 'Black Nylon Laptop Bag',         subcategory: 'Briefcases',       colour: 'Black',     colour_hex: '#1A1A1A', description: 'A slim nylon laptop bag with webbing handles — compact, professional, and everyday ready.',             tags: ['bag','laptop','nylon','black','work','slim'] },
  { file: '112', folder: 'hats',        name: 'Grey Knit Beanie',               subcategory: 'Beanies',          colour: 'Grey',      colour_hex: '#A0A0A0', description: 'A ribbed cuff beanie in grey knit — the cold-weather accessory that goes with everything.',             tags: ['beanie','grey','knit','ribbed','winter'] },
  { file: '113', folder: 'tops',        name: 'White Classic T-Shirt',          subcategory: 'T-Shirts',         colour: 'White',     colour_hex: '#FAFAFA', description: 'A perfectly weighted classic crew neck tee in white — the foundation of any wardrobe.',                tags: ['t-shirt','crew-neck','white','classic','essential'] },
  { file: '114', folder: 'tops',        name: 'White Zip-Up Hoodie',            subcategory: 'Hoodies',          colour: 'White',     colour_hex: '#FAFAFA', description: 'A zip-through hoodie in soft white fleece — casual layering with a clean look.',                        tags: ['hoodie','zip-up','white','fleece','casual'] },
  { file: '115', folder: 'accessories', name: 'Cream Linen Belt',               subcategory: 'Belts',            colour: 'Cream',     colour_hex: '#EDE3CC', description: 'A woven linen belt in natural cream with a silver buckle — relaxed summer styling.',                   tags: ['belt','linen','cream','woven','casual'] },
  { file: '116', folder: 'bottoms',     name: 'Blue Barrel Wide Jeans',         subcategory: 'Jeans',            colour: 'Blue',      colour_hex: '#4A6FA5', description: 'Cropped wide-leg barrel jeans in a worn blue wash — the statement denim silhouette.',                  tags: ['jeans','barrel','wide-leg','blue','cropped'] },
  { file: '117', folder: 'dresses',     name: 'White Linen Sundress',           subcategory: 'Mini Dresses',     colour: 'White',     colour_hex: '#FAFAFA', description: 'A spaghetti-strap linen sundress in white — effortless warm-weather dressing.',                         tags: ['dress','sundress','linen','white','strappy','summer'] },
  { file: '118', folder: 'shoes',       name: 'Charcoal Running Shoes',         subcategory: 'Trainers',         colour: 'Charcoal',  colour_hex: '#4A4A4A', description: 'Lightweight running shoes in charcoal grey — performance footwear with a clean aesthetic.',             tags: ['shoes','trainers','charcoal','running','sport'] },
  { file: '119', folder: 'bottoms',     name: 'Black Mini Skirt',               subcategory: 'Skirts',           colour: 'Black',     colour_hex: '#1A1A1A', description: 'A structured mini skirt with pleated detail in black — versatile smart-casual dressing.',               tags: ['skirt','mini','black','structured','pleated'] },
];

// ── Main ─────────────────────────────────────────────────────────────────────

let ok = 0, skipped = 0, failed = 0;
console.log(`\nSeeding ${ITEMS.length} essentials...\n`);

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
